import { registerLibDir } from "@nfjs/front-server";
import path from 'path';
import { web } from "@nfjs/back";
import { extension } from "@nfjs/core";
import fs from "fs/promises";
const __dirname = path.join(path.dirname(decodeURI(new URL(import.meta.url).pathname))).replace(/^\\([A-Z]:\\)/, "$1");
const meta = {
    require: {
        after: '@nfjs/back',
    },
};

const frmBodyRegexp = /export\s+default\s+class\s+\w+\s+extends\s+[^{]+\s+(?<body>{[\s\S]*})/m;

async function resolveFormFile(formName) {
    const formPath = String(formName || '').replace(/\./g, '/');
    let file = await extension.getFiles(`forms/${formPath}.js`);
    if (Array.isArray(file)) file = file[0];
    if (!file) {
        throw new Error(`Форма не найдена: ${formName}`);
    }
    return file;
}

async function getFileSignature(file) {
    const stat = await fs.stat(file);
    return `${stat.size}:${Math.floor(stat.mtimeMs)}`;
}

function escapeTemplateLiteral(source = '') {
    return String(source)
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');
}

function findMatchingBrace(source, startIndex, openChar = '{', closeChar = '}') {
    let depth = 0;
    let quote = '';
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = startIndex; i < source.length; i++) {
        const char = source[i];
        const next = source[i + 1];

        if (lineComment) {
            if (char === '\n') lineComment = false;
            continue;
        }
        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (quote) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === quote) {
                quote = '';
            }
            continue;
        }
        if (char === '/' && next === '/') {
            lineComment = true;
            i++;
            continue;
        }
        if (char === '/' && next === '*') {
            blockComment = true;
            i++;
            continue;
        }
        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === openChar) {
            depth++;
            continue;
        }
        if (char === closeChar) {
            depth--;
            if (depth === 0) return i;
        }
    }

    return -1;
}

function getLineIndent(content, index) {
    const lineStart = content.lastIndexOf('\n', index) + 1;
    const prefix = content.slice(lineStart, index);
    const match = prefix.match(/^\s*/);
    return match?.[0] || '';
}

function normalizePropertiesSource(value) {
    const text = String(value || '').trim();
    if (!text) return '{\n}';
    return text.startsWith('{') ? text : '{\n}';
}

function findStaticPropertiesBlock(content) {
    const assignmentMatch = /static\s+properties\s*=\s*/m.exec(content);
    if (assignmentMatch) {
        const start = assignmentMatch.index;
        const valueStart = content.indexOf('{', start + assignmentMatch[0].length);
        if (valueStart >= 0) {
            const valueEnd = findMatchingBrace(content, valueStart);
            if (valueEnd >= 0) {
                let end = valueEnd + 1;
                while (/\s/.test(content[end] || '')) end++;
                if (content[end] === ';') end++;
                return {
                    type: 'assignment',
                    start,
                    end,
                    valueStart,
                    valueEnd,
                    indent: getLineIndent(content, start)
                };
            }
        }
    }

    const getterMatch = /static\s+get\s+properties\s*\(\)\s*\{/m.exec(content);
    if (getterMatch) {
        const start = getterMatch.index;
        const bodyStart = content.indexOf('{', start + getterMatch[0].length - 1);
        if (bodyStart >= 0) {
            const bodyEnd = findMatchingBrace(content, bodyStart);
            if (bodyEnd >= 0) {
                const bodySource = content.slice(bodyStart + 1, bodyEnd);
                const returnMatch = /return\b/m.exec(bodySource);
                if (returnMatch) {
                    const returnIndex = bodyStart + 1 + returnMatch.index + returnMatch[0].length;
                    const valueStart = content.indexOf('{', returnIndex);
                    if (valueStart >= 0 && valueStart < bodyEnd) {
                        const valueEnd = findMatchingBrace(content, valueStart);
                        if (valueEnd >= 0 && valueEnd <= bodyEnd) {
                            return {
                                type: 'getter',
                                start,
                                end: bodyEnd + 1,
                                valueStart,
                                valueEnd,
                                indent: getLineIndent(content, start)
                            };
                        }
                    }
                }
            }
        }
    }

    return null;
}

function extractStaticPropertiesBlock(content) {
    const block = findStaticPropertiesBlock(content);
    if (!block) return '{\n}';
    return content.slice(block.valueStart, block.valueEnd + 1);
}

function replaceStaticPropertiesBlock(content, value) {
    if (typeof value !== 'string') return content;

    const normalized = normalizePropertiesSource(value);
    const block = findStaticPropertiesBlock(content);
    if (block?.type === 'assignment') {
        return `${content.slice(0, block.start)}static properties = ${normalized};${content.slice(block.end)}`;
    }
    if (block?.type === 'getter') {
        const innerIndent = `${block.indent}    `;
        const replacement = `static get properties() {\n${innerIndent}return ${normalized};\n${block.indent}}`;
        return `${content.slice(0, block.start)}${replacement}${content.slice(block.end)}`;
    }

    const matches = content.match(frmBodyRegexp);
    if (!matches?.groups?.body) return content;
    const updatedBody = matches.groups.body.replace(/^\{/, `{\n    static properties = ${normalized};\n`);
    return content.replace(matches.groups.body, updatedBody);
}

function extractStaticTaggedBlock(content, { property, tag }) {
    const staticPropPattern = new RegExp(`static\\s+${property}\\s*=\\s*${tag}\\s*\`([\\s\\S]*?)\``, 'm');
    let match = content.match(staticPropPattern);
    if (match?.[1]) return match[1];

    const staticGetterPattern = new RegExp(`static\\s+get\\s+${property}\\s*\\(\\)\\s*\\{[\\s\\S]*?return\\s+${tag}\\s*\`([\\s\\S]*?)\``, 'm');
    match = content.match(staticGetterPattern);
    if (match?.[1]) return match[1];

    return '';
}

function replaceStaticTaggedBlock(content, { property, tag, value }) {
    if (typeof value !== 'string') return content;
    const body = escapeTemplateLiteral(value);

    const staticPropPattern = new RegExp(`(static\\s+${property}\\s*=\\s*${tag}\\s*\`)([\\s\\S]*?)(\`)`, 'm');
    if (staticPropPattern.test(content)) {
        return content.replace(staticPropPattern, (_full, prefix, _current, suffix) => `${prefix}${body}${suffix}`);
    }

    const staticGetterPattern = new RegExp(`(static\\s+get\\s+${property}\\s*\\(\\)\\s*\\{[\\s\\S]*?return\\s+${tag}\\s*\`)([\\s\\S]*?)(\`\\s*;?[\\s\\S]*?\\})`, 'm');
    if (staticGetterPattern.test(content)) {
        return content.replace(staticGetterPattern, (_full, prefix, _current, suffix) => `${prefix}${body}${suffix}`);
    }

    return content;
}

function appendMethodToClass(content, methodText) {
    const matches = content.match(frmBodyRegexp);
    if (!matches?.groups?.body) return content;
    const updatedBody = matches.groups.body.replace(/\}\s*$/, `\n\t${methodText}\n}`);
    return content.replace(matches.groups.body, updatedBody);
}

function templateTagStub(strings, ...values) {
    if (!Array.isArray(strings)) return '';
    let out = '';
    for (let i = 0; i < strings.length; i++) {
        out += strings[i] ?? '';
        if (i < values.length) out += values[i] ?? '';
    }
    return out;
}

function buildClassFromBody(body, label = 'form') {
    try {
        return new Function(
            'html',
            'css',
            'unsafeCSS',
            `return class sourceClass ${body}`
        )(templateTagStub, templateTagStub, value => value);
    } catch (err) {
        throw new Error(`Не удалось разобрать класс формы ${label}: ${err?.message || err}`);
    }
}

function extractScripts(content) {
    const matches = content.match(frmBodyRegexp);
    if (!matches?.groups?.body) return '';
    try {
        const sourceClass = buildClassFromBody(matches.groups.body, 'extractScripts');
        return Object
            .getOwnPropertyNames(sourceClass.prototype)
            .filter(name => name !== 'constructor' && typeof sourceClass.prototype[name] === 'function')
            .map(name => sourceClass.prototype[name].toString())
            .join('\n');
    } catch (_err) {
        return '';
    }
}

function applyScriptsDelta(content, scriptsDelta, formName) {
    const matches = content.match(frmBodyRegexp);
    if (!matches?.groups?.body) {
        throw new Error(`Не удалось разобрать класс формы для scriptsDelta: ${formName}`);
    }

    const originalClass = buildClassFromBody(matches.groups.body, formName);
    const methodSources = new Map();
    Object
        .getOwnPropertyNames(originalClass.prototype)
        .filter(name => name !== 'constructor')
        .forEach(name => {
            const fn = originalClass.prototype[name];
            if (typeof fn === 'function') methodSources.set(name, fn.toString());
        });

    const normalizeMethod = source => String(source ?? '').trim().replace(/\n/g, '\n\t');
    const getMethod = name => (name ? methodSources.get(name) : null);
    const hasMethod = source => typeof source === 'string' && source.length > 0 && content.includes(source);

    for (const delta of scriptsDelta) {
        if (!delta?.action) continue;

        if (delta.action === 'delete') {
            const source = getMethod(delta.name);
            if (hasMethod(source)) content = content.replace(source, '');
            methodSources.delete(delta.name);
            continue;
        }

        if (delta.action === 'add') {
            const source = normalizeMethod(delta.newFunc);
            if (!source) continue;

            const nearName = delta.oldFunc || delta.nearestFunc;
            const nearSource = getMethod(nearName);

            if (delta.position === 'before' && hasMethod(nearSource)) {
                content = content.replace(nearSource, `${source}\n\n\t${nearSource}`);
            } else if (delta.position === 'after' && hasMethod(nearSource)) {
                content = content.replace(nearSource, `${nearSource}\n\n\t${source}`);
            } else {
                content = appendMethodToClass(content, source);
            }
            methodSources.set(delta.name, source);
            continue;
        }

        if (delta.action === 'update') {
            const source = normalizeMethod(delta.newFunc);
            if (!source) continue;

            const current = getMethod(delta.name);
            if (hasMethod(current)) {
                content = content.replace(current, source);
            } else {
                content = appendMethodToClass(content, source);
            }
            methodSources.set(delta.name, source);
        }
    }

    return content;
}

async function init() {
    const editorIconsetPath = path.join(__dirname, 'components', 'editor-iconset.js');
    registerLibDir('@editor/lib', __dirname + '/lib');
    registerLibDir('@editor/components', __dirname + '/components');
    registerLibDir('lib/editor-iconset.js', editorIconsetPath, { singleFile: true });
    registerLibDir('editor-iconset.js', editorIconsetPath, { singleFile: true });

    web.on('GET', '/@editor/form-source/:form', async context => {
        const file = await resolveFormFile(context.params.form);
        const content = await fs.readFile(file, 'utf-8');
        const signature = await getFileSignature(file);

        context.code(200);
        context.type('application/json');
        context.send({
            ok: true,
            form: context.params.form,
            file,
            signature,
            source: content,
            template: extractStaticTaggedBlock(content, { property: 'template', tag: 'html' }),
            styles: extractStaticTaggedBlock(content, { property: 'css', tag: 'css' }),
            properties: extractStaticPropertiesBlock(content),
            scripts: extractScripts(content)
        });
        context.end();
    });

    web.on('POST', '/@editor/save-form/:form', { middleware: ['json'] }, async context => {
        const file = await resolveFormFile(context.params.form);
        const currentSignature = await getFileSignature(file);

        if (context.body.baseSignature && context.body.baseSignature !== currentSignature) {
            context.code(409);
            context.type('application/json');
            context.send({
                ok: false,
                error: 'SOURCE_CHANGED',
                message: 'Исходный код формы изменился на сервере. Обновите форму и повторите сохранение.',
                signature: currentSignature
            });
            context.end();
            return;
        }

        let content = await fs.readFile(file, 'utf-8');

        // replace template + css blocks first so visual changes always persist
        content = replaceStaticTaggedBlock(content, { property: 'template', tag: 'html', value: context.body.tpl });
        content = replaceStaticTaggedBlock(content, { property: 'css', tag: 'css', value: context.body.styles });
        content = replaceStaticPropertiesBlock(content, context.body.properties);

        const scriptsDelta = Array.isArray(context.body.scriptsDelta) ? context.body.scriptsDelta : [];
        let scriptsWarning = '';
        if (scriptsDelta.length > 0) {
            try {
                content = applyScriptsDelta(content, scriptsDelta, context.params.form);
            } catch (err) {
                scriptsWarning = err?.message || String(err);
                console.error(`[nf-dev-editor] save-form warning for ${context.params.form}:`, err);
            }
        }

        await fs.writeFile(file, content, 'utf-8');
        const nextSignature = await getFileSignature(file);

        context.code(200);
        context.type('application/json');
        context.send({
            ok: true,
            signature: nextSignature,
            warning: scriptsWarning || null
        });
        context.end();
    });
}

export {
    meta,
    init,
};
