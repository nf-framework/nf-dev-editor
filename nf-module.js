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

const templateRegexp = /(template[(){\s=]+(?:return)?\s+?html`)(?<tpl>.*?)`/gms;
const frmBodyRegexp = /export\s+default\s+class\s+(\w+)\s+extends\s+PlForm\s+(?<body>{.*})/ms;

async function init() {
    registerLibDir('@editor/lib', __dirname + '/lib');
    registerLibDir('@editor/components', __dirname + '/components');

    web.on('POST', '/@editor/save-form/:form', { middleware: ['json'] }, async context => {
        let path = context.params.form.replace(/\./g, '/')
        let file = await extension.getFiles('forms/' + path + '.js');
        let content = await fs.readFile(file, 'utf-8');

        //replace template
        content = content.replace(templateRegexp, `$1${context.body.tpl}\``);

        // generate dynamic class from original file to proper method replacement
        const matches = content.match(frmBodyRegexp);
        const originalClass = new Function('class originalClass ' + matches.groups.body + '; return new originalClass')();

        context.body.scriptsDelta.forEach(el => {
            if (el.action == 'delete') {
                content = content.replace(originalClass[el.name]?.toString(), '');
                delete originalClass.constructor.prototype[el.name];
            }
            if (el.action == 'add') {
                let added = el.newFunc.replace(/\n/g, '\n\t');

                if (el.position == 'none') {
                    content = content.replace(/}[^}]*$/s, '\t' + added + '\n}');
                }

                if (el.position == 'before') {
                    content = content.replace(originalClass[el.oldFunc]?.toString(), added + '\n\n\t' + originalClass[el.oldFunc]?.toString());
                }

                if (el.position == 'after') {
                    content = content.replace(originalClass[el.oldFunc]?.toString(), originalClass[el.oldFunc]?.toString() + '\n\n\t' + added);
                }

                originalClass[el.name] = added;
            }

            if (el.action == 'update') {
                content = content.replace(originalClass[el.name]?.toString(), el.newFunc.replace(/\n/g, '\n\t'));
                originalClass[el.name] = el.newFunc.replace(/\n/g, '\n\t');
            }
        });
        await fs.writeFile(file, content, 'utf-8')
        context.end('ok');
    });
}

export {
    meta,
    init,
};

