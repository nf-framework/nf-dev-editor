import {domSelector} from "../domselector.js";
import {PlElement, Template, TemplateInstance} from "polylib";
import {findByXpath, getModelByDom, getXPath} from "../common.js";
import {findByNPath, forEachTemplateRecursive, getNPath, setAttrValue} from "polylib/common.js";
import {
    getEditorComponentConfig,
    getEditorGroup,
    getEditorSelectionResolver,
    getEditorPropertyConfig,
    getPropertyOrder
} from "../config/component-editor-config.js";

export function findSelectable(path, root, checker) {
    return path.find( s => {
        let n = s;
        while(n && n !== root) {
            n = n._io || n.parentNode;
        }
        if (n) {
            if( !checker || checker && typeof checker === 'function' && checker(s))
                return s;
        }
    });
}

domSelector.registerSelectorClass({
    type: 'polylib-component',
    checkSelectable: isComponent,
    findSelectable,
    viewOver: undefined,
    onSelect: (target) => {
        if (!target) return;

        let selected = target;
        const model = getModelByDom(target);
        if (model?.column?.node) {
            selected = model.column.node;
        } else if (!(selected instanceof PlElement)) {
            let node = selected;
            while (node && !(node instanceof PlElement)) {
                node = node._io || node.parentNode || node.host;
            }
            if (node) selected = node;
        }

        let path = getXPath(selected);
        dispatchEvent(new CustomEvent('select-component', { detail: { path, target: selected } }));
    }
})

let formBinds = {};



function isComponent(target, _type, root) {
    while (target !== root) {
        if (target instanceof PlElement && target !== root) {
            return target;
        }

        target = target.parentNode || target.host;
    }

    return false;
}

function resolveHighlightTarget(node) {
    if (!node) return node;
    const componentName = String(node?.localName || '').toLowerCase();
    const resolver = getEditorSelectionResolver(componentName);
    if (!resolver) return node;
    try {
        return resolver(node) || node;
    } catch (_err) {
        return node;
    }
}

function findRootElement(target) {
    let node = target;
    while (node) {
        if (node.host) node = node.host;
        if (node.localName.startsWith('pl-form-')) {
            return node
        }
        node = node.parentNode instanceof DocumentFragment ? node.parentNode.host : node.parentNode;
    }
    return false;
}

function getDisplayNodeName(node) {
    const fallback = node instanceof DocumentFragment
        ? String(node.host?.localName || node.host?.nodeName || 'template').toLowerCase()
        : String(node?.localName || node?.nodeName || 'node').toLowerCase();

    if (!(node instanceof Element)) return fallback;
    const tag = fallback;

    if (tag === 'pl-grid-column') {
        const header = node.getAttribute('header');
        const field = node.getAttribute('field');
        const suffix = header || field;
        return suffix ? `pl-grid-column · ${suffix}` : 'pl-grid-column';
    }

    if (tag === 'template') {
        const is = node.getAttribute('is');
        return is ? `template[is=${is}]` : 'template';
    }

    return tag;
}

function describeComponent(node, rootLabel, isRoot = false, path = '/') {
    const name = isRoot && rootLabel ? rootLabel : getDisplayNodeName(node);
    return {
        name,
        node: node, // instanceof DocumentFragment ? node.host : node,
        path,
        id: null,
        parent_id: null,
        _level: null,
        _leaf: null,
        _opened: false
    }
}

export function buildTree(node, rootLabel) {
    return buildRecursive([], node, null, rootLabel, '/');
}

export function getDesignedTpl(form) {
    return form?._ti?.tpl?.tpl ?? null;
}
function buildFormTplTree(form) {
    return buildRecursive([], getDesignedTpl(form), null, '', '/');
}

function getChildrenForTree(node) {
    if (!node) return [];
    if (node.localName === 'template') {
        let ownChildren = [...(node.content?.childNodes || [])].filter(x => x.localName);
        if (ownChildren.length > 0) return ownChildren;

        let nested = node.tpl?.origTpl?.content;
        if (nested) {
            return [...nested.childNodes].filter(x => x.localName);
        }
        return [];
    }
    return [...(node.childNodes || [])].filter(x => x.localName);
}

function buildRecursive(array, node, parent, rootLabel, path) {
    let info = describeComponent(node, rootLabel, !parent, path);
    info.id = array.length;
    info.parent_id = parent && parent.id;;
    info._level = parent?._level + 1 || 0;
    info._pitem = parent;
    array.push(info)
    let filteredNodes = getChildrenForTree(node);
    info._leaf = filteredNodes.length === 0;

    const indexMap = new Map();
    filteredNodes.forEach((child) => {
        const key = child.localName;
        const idx = indexMap.get(key) || 0;
        indexMap.set(key, idx + 1);
        const segment = idx > 0 ? `${key}[${idx + 1}]` : key;
        const childPath = path === '/' ? `/${segment}` : `${path}/${segment}`;
        buildRecursive(array, child, info, rootLabel, childPath);
    })
    return array;
}

function getProperties(target, tplTarget) {
    let props = [];
    const node = target || tplTarget;
    if (!node || !(node instanceof Element)) return props;

    const componentName = String(node.localName || '').toLowerCase();
    const componentConfig = getEditorComponentConfig(componentName);
    const componentTitle = componentConfig?.title || componentName;
    const componentDescription = componentConfig?.description || '';
    const runtimeProps = target?._props || {};
    const hasRuntimeProps = Object.keys(runtimeProps).length > 0;
    const ctor = target?.constructor || customElements.get(componentName) || tplTarget?.constructor;
    const ctorProps = ctor?.properties || {};
    const propertyNames = new Set();
    const configuredNames = new Set();

    const normalizeBoolean = (value) => {
        if (value === true || value === false) return value;
        const normalized = String(value ?? '').trim().toLowerCase();
        return ['true', '1', 'yes', 'y', 'on', 'да'].includes(normalized);
    };

    const resolveEditorType = (propType, propConfig, value) => {
        if (propConfig?.editor) return propConfig.editor;
        if (propType === Boolean) return 'boolean';
        if (propType === Number) return 'number';
        if (typeof value === 'string' && value.length > 80) return 'textarea';
        return 'text';
    };

    const normalizeEditorValue = (value, propType, editor) => {
        if (editor === 'boolean' || propType === Boolean) {
            return normalizeBoolean(value);
        }

        if (editor === 'number' || propType === Number) {
            if (value === '' || value === null || value === undefined) return '';
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : value;
        }

        if (typeof value === 'object' && value !== null) {
            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return String(value);
            }
        }

        return value ?? '';
    };

    const toCamelCase = (name) => String(name || '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    if (Array.isArray(componentConfig?.order)) {
        componentConfig.order.forEach((name) => configuredNames.add(name));
    }

    if (componentConfig?.properties) {
        Object.keys(componentConfig.properties).forEach((name) => configuredNames.add(name));
    }

    const useConfiguredOnly = configuredNames.size > 0;
    if (useConfiguredOnly) {
        configuredNames.forEach((name) => propertyNames.add(name));
    } else {
        if (hasRuntimeProps) {
            Object.keys(runtimeProps).forEach((name) => propertyNames.add(name));
        }
        Object.keys(ctorProps).forEach((name) => propertyNames.add(name));
    }

    if (tplTarget instanceof Element) {
        [...tplTarget.attributes].forEach((attr) => {
            const attrName = String(attr.name || '');
            if (!attrName || attrName.startsWith('on-') || attrName.includes(':') || attrName.endsWith('$')) return;
            if (['class', 'style', 'id', 'slot', 'part'].includes(attrName)) return;
            const candidate = toCamelCase(attrName);
            if (!useConfiguredOnly || configuredNames.has(candidate)) {
                propertyNames.add(candidate);
            }
        });
    }

    const getDesignValueState = (key, propType) => {
        if (!(tplTarget instanceof Element)) return { hasAttr: false, value: undefined };
        let attrName = key;
        let designValue = tplTarget.getAttribute(attrName);
        if (designValue === null && /[A-Z]/.test(key)) {
            const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
            designValue = tplTarget.getAttribute(kebab);
            attrName = kebab;
        }
        const hasAttr = tplTarget.hasAttribute(attrName);
        if (!hasAttr) return { hasAttr: false, value: undefined };
        if (propType === Boolean) {
            return { hasAttr: true, value: designValue !== 'false' };
        }
        return { hasAttr: true, value: designValue };
    };

    for (const key of propertyNames) {
        if (key.startsWith('_')) continue;

        const value = runtimeProps[key];
        const propType = target?._dp?.[key]?.type ?? ctorProps?.[key]?.type;
        const propConfig = getEditorPropertyConfig(componentConfig, key);
        if (propConfig?.hidden) continue;

        const design = getDesignValueState(key, propType);
        const rawValue = design.hasAttr ? design.value : value;
        if (rawValue === undefined && !propConfig && !ctorProps?.[key]) continue;

        const editor = resolveEditorType(propType, propConfig, rawValue);
        const group = getEditorGroup(componentConfig, propConfig?.group);

        props.push({
            name: key,
            value: normalizeEditorValue(rawValue, propType, editor),
            cmp: target || tplTarget,
            currentValue: value,
            editor,
            options: Array.isArray(propConfig?.options) ? propConfig.options : [],
            label: propConfig?.label || key,
            description: propConfig?.description || '',
            placeholder: propConfig?.placeholder || '',
            readonly: Boolean(propConfig?.readonly),
            groupId: group.id,
            group: group.title,
            groupDescription: group.description,
            groupOrder: group.order,
            order: Number.isFinite(propConfig?.order) ? propConfig.order : getPropertyOrder(componentConfig, key),
            propType: propType?.name || '',
            component: componentName,
            componentTitle,
            componentDescription
        });
    }

    props.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
    });

    return props;
}


function createElementForTemplate(name){
    let tpl = document.createElement('template');
    tpl.insertAdjacentHTML('afterbegin', `<${name}></${name}>`);
    return tpl.childNodes[0];
}

function domAppend(node, target, pos) {
    if (node === target) return;
    if (pos === 'in') target.appendChild(node);
    if (pos === 'before') {
        target.parentNode.insertBefore(node, target);
    }
    if (pos === 'after') {
        target.parentNode.insertBefore(node, target.nextSibling);
    }
}

/**
 *
 * @param {AddElementCommand} cmd
 */
function execAddElementCommand(cmd) {
    switch (cmd.position) {
        case 'in':
        case 'before':
        case 'after':
            let cmp = createElementForTemplate(cmd.element);
            let tplTarget = findByXpath(cmd.tplRoot,cmd.path, true);
            let subTpl = tplTarget;
            while (subTpl && subTpl !== cmd.tplRoot && subTpl.nodeType !== document.DOCUMENT_FRAGMENT_NODE) subTpl = subTpl.parentNode;
            let path = getNPath(subTpl ?? cmd.tplRoot, tplTarget);
            domAppend(cmp,tplTarget,cmd.position);
            let domTarget = cmd.path === '/' ? cmd.domRoot : findByXpath(cmd.domRoot,cmd.path);

            let result;
            if (domTarget instanceof TemplateInstance) {
                domTarget.tpl.refresh();
            } else {
                let tis;
                let n = domTarget;
                while (n && !n._io && n !== cmd.domRoot) n = n.parentNode;
                if (n?._io) {
                    tis = [...n._io.tpl._tis].map(i => i[0]);
                } else {
                    tis = [cmd.domRoot.host._ti];
                }
                for (let ti of tis ) {
                    let target = path.length > 0 ? findByNPath({childNodes:ti._nodes}, path) : (ti.ctx?.root ?? ti);
                    cmp = createElementForTemplate(cmd.element);
                    if (ti.tpl.tplPH) cmp.io = ti.tpl.tplPH;
                    domAppend(cmp,target,cmd.position);

                    if (domTarget === target) result = cmp;
                }
            }

            /*
            }*/
            //domTarget.tpl?._dirtyRefresh?.();
            if(!result) result = findByXpath(cmd.domRoot,cmd.path + '/' + cmd.element);
            dispatchEvent(new CustomEvent('form-update', {detail: {}}))
            return {select: getXPath(result)};
    }
}

function execMoveElementCommand(cmd) {
    switch (cmd.position) {
        case 'in':
        case 'before':
        case 'after':
            let cmp = findByXpath(cmd.tplRoot,cmd.element, true);
            let tplTarget = findByXpath(cmd.tplRoot,cmd.path, true);
            let subTpl = tplTarget;
            while (subTpl && subTpl !== cmd.tplRoot && subTpl.nodeType !== document.DOCUMENT_FRAGMENT_NODE) subTpl = subTpl.parentNode;
            let path = getNPath(subTpl ?? cmd.tplRoot, tplTarget);
            domAppend(cmp,tplTarget,cmd.position);
            let domTarget = cmd.path === '/' ? cmd.domRoot : findByXpath(cmd.domRoot,cmd.path);

            let result;
            if (domTarget instanceof TemplateInstance) {
                domTarget.tpl.refresh();
            } else {
                let tis;
                let n = domTarget;
                while (n && !n._io && n !== cmd.domRoot) n = n.parentNode;
                if (n?._io) {
                    tis = [...n._io.tpl._tis].map(i => i[0]);
                } else {
                    tis = [cmd.domRoot.host._ti];
                }
                for (let ti of tis ) {
                    let target = path.length > 0 ? findByNPath({childNodes:ti._nodes}, path) : (ti.ctx?.root ?? ti);
                    cmp = findByXpath(ti.ctx?.root ?? ti,cmd.element);
                    if (ti.tpl.tplPH) cmp.io = ti.tpl.tplPH;
                    domAppend(cmp,target,cmd.position);
                    result = cmp;
                    if (domTarget === target) result = cmp;
                }
            }

            /*
            }*/
            //domTarget.tpl?._dirtyRefresh?.();
            if(!result) result = findByXpath(cmd.domRoot,cmd.path + '/' + cmd.element);
            dispatchEvent(new CustomEvent('form-update', {detail: {}}))
            return {select: getXPath(result)};
    }
}
/**
 *
 * @param {AddElementCommand} cmd
 */
function execDelElementCommand(cmd) {
    if (cmd.path === '/') return;
    let tplTarget = findByXpath(cmd.tplRoot,cmd.path, true);


    let subTpl = tplTarget;
    while (subTpl && subTpl !== cmd.tplRoot && subTpl.nodeType !== document.DOCUMENT_FRAGMENT_NODE) subTpl = subTpl.parentNode;
    let path = getNPath(subTpl ?? cmd.tplRoot, tplTarget);
    tplTarget.remove();
    let domTarget = findByXpath(cmd.domRoot,cmd.path);
    let result;
    if (domTarget.parentNode instanceof TemplateInstance) {
        domTarget.parentNode.tpl.refresh();
    } else {
        let tis;
        let n = domTarget;
        while (n && !n._io && n !== cmd.domRoot) n = n.parentNode;
        if (n?._io) {
            tis = [...n._io.tpl._tis].map(i => i[0]);
        } else {
            tis = [cmd.domRoot.host._ti];
        }
        for (let ti of tis ) {
            let target = path.length > 0 ? findByNPath({childNodes:ti._nodes}, path) : (ti.ctx?.root ?? ti);

            target.remove();


        }
    }
    dispatchEvent(new CustomEvent('form-update', {detail: {}}));
    return result;
}

function isBindExpression(value) {
    return typeof value === 'string' && /({{.*}}|\[\[.*]])/.test(value);
}

function isEditorMode() {
    return typeof document !== 'undefined'
        && Boolean(document.body?.classList?.contains('editor-opened'));
}

function scheduleGridRefresh(grid, fullReinit = false) {
    if (!grid || !isEditorMode()) return;
    if (!grid.__devEditorRefreshState) {
        grid.__devEditorRefreshState = { raf: 0, full: false };
    }
    const state = grid.__devEditorRefreshState;
    state.full = state.full || fullReinit;
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => {
        state.raf = 0;
        try {
            if (state.full && typeof grid._init === 'function') {
                grid._init();
            } else if (typeof grid.reactToResize === 'function') {
                grid.reactToResize();
            }
        } catch (_err) {
            // ignore editor-only runtime refresh errors
        }
        state.full = false;
    });
}

function syncGridColumnInRuntime(columnNode, attribute, value) {
    if (!isEditorMode()) return;
    if (!(columnNode instanceof Element) || columnNode.localName !== 'pl-grid-column') return;
    const grid = columnNode.closest('pl-grid');
    if (!grid) return;

    // width/sort/hidden имеют специализированный путь обновления в pl-grid
    if (['width', 'sort', 'hidden'].includes(attribute)) {
        columnNode.dispatchEvent(new CustomEvent('column-attribute-change', {
            detail: {
                attribute,
                index: columnNode._index,
                value,
                init: false
            },
            bubbles: true,
            composed: true
        }));
        scheduleGridRefresh(grid, attribute !== 'sort');
        return;
    }

    // Для остальных атрибутов нужна пересборка model колонок
    scheduleGridRefresh(grid, true);
}

function getCommandScope(cmd) {
    const tplTarget = findByXpath(cmd.tplRoot, cmd.path, true);
    const domTarget = findByXpath(cmd.domRoot, cmd.path);
    if (!tplTarget) return { tplTarget: null, domTarget: null, path: [], tis: [] };

    let subTpl = tplTarget;
    while (subTpl && subTpl.nodeType !== document.DOCUMENT_FRAGMENT_NODE) subTpl = subTpl.parentNode;
    const path = getNPath(subTpl ?? cmd.tplRoot, tplTarget);

    let n = domTarget;
    while (n && !n._io && n !== cmd.domRoot) n = n.parentNode;
    let tis;
    if (n?._io) {
        tis = [...n._io.tpl._tis].map(i => i[0]);
    } else {
        tis = [cmd.domRoot.host._ti];
    }

    return { tplTarget, domTarget, path, tis };
}

function findNodeByIndexes(root, indexes) {
    let node = root;
    for (const idx of indexes || []) {
        if (!node?.childNodes) return null;
        node = node.childNodes[idx];
        if (!node) return null;
    }
    return node;
}

/**
 *
 * @param {ChangePropertyCommand} cmd
 */
function execChangePropertyCommand(cmd) {
    const { tplTarget, domTarget, path, tis } = getCommandScope(cmd);
    if (!tplTarget) return;
    let { property, value } = cmd;
    const propType = domTarget?.constructor?.properties?.[property]?.type;
    let runtimeTarget = domTarget;

    setAttrValue(tplTarget, property, propType === Boolean ? !!value : value);

    for (let ti of tis ) {
        if (isBindExpression(value)) {
            ti.replaceBind(path, property, value);
        } else {
            ti.removeBind(path, property);
            let targetNode = findByNPath({childNodes:ti._nodes}, path);
            if (targetNode?.nodeType === Node.ELEMENT_NODE) {
                runtimeTarget = runtimeTarget || targetNode;
                setAttrValue(targetNode, property, value);
                if (property in targetNode) {
                    try {
                        targetNode[property] = value;
                    } catch (_e) {
                        // ignore readonly/native assignment failures
                    }
                }
            }
        }
    }
    syncGridColumnInRuntime(runtimeTarget, property, value);
    return;
    // try to replace template
    let template = document.createElement('div');
    template.appendChild(cmd.tplRoot.cloneNode(true));
    let tpl = new Template(template.innerHTML);
    let inst = new TemplateInstance(tpl);
    cmd.domRoot.host._ti = inst;
    cmd.domRoot.replaceChildren();
    inst.attach(cmd.domRoot.host);
    return;

}

function execChangeAttributeCommand(cmd) {
    const { tplTarget, path, tis } = getCommandScope(cmd);
    if (!tplTarget) return;
    const attribute = cmd.attribute;
    const value = cmd.value ?? '';
    if (!attribute) return;
    let runtimeTarget = null;

    if (value === '') {
        tplTarget.removeAttribute(attribute);
    } else {
        setAttrValue(tplTarget, attribute, value);
    }

    for (let ti of tis) {
        if (isBindExpression(value)) {
            ti.replaceBind(path, attribute, value);
        } else {
            ti.removeBind(path, attribute);
            const targetNode = findByNPath({ childNodes: ti._nodes }, path);
            if (targetNode?.nodeType === Node.ELEMENT_NODE) {
                runtimeTarget = runtimeTarget || targetNode;
                if (value === '') {
                    targetNode.removeAttribute(attribute);
                } else {
                    setAttrValue(targetNode, attribute, value);
                }
            }
        }
    }
    syncGridColumnInRuntime(runtimeTarget, attribute, value);
}

function execChangeTextNodeCommand(cmd) {
    const { tplTarget, path, tis } = getCommandScope(cmd);
    if (!tplTarget) return;

    const textPath = Array.isArray(cmd.textPath) ? cmd.textPath.map(i => Number(i)).filter(Number.isInteger) : [];
    const value = String(cmd.value ?? '');

    const tplTextNode = findNodeByIndexes(tplTarget, textPath);
    if (tplTextNode) tplTextNode.textContent = value;

    const fullPath = [...path, ...textPath];
    for (let ti of tis) {
        const runtimeTextNode = findByNPath({ childNodes: ti._nodes }, fullPath);
        if (runtimeTextNode) runtimeTextNode.textContent = value;
    }
}
/**
 *
 * @param {DomCommand} cmd
 */
function execDOMCommand(cmd) {
    switch (cmd.command) {
        case 'add-element':
            return execAddElementCommand(/** @type {AddElementCommand} */cmd);
        case 'move-element':
            return execMoveElementCommand(/** @type {MoveElementCommand} */cmd);
        case 'del-element':
            return execDelElementCommand(/** @type {DelElementCommand} */cmd);
        case 'change-property':
            return execChangePropertyCommand(/** @type {ChangePropertyCommand} */cmd)
        case 'change-attribute':
            return execChangeAttributeCommand(/** @type {ChangeAttributeCommand} */cmd)
        case 'change-text-node':
            return execChangeTextNodeCommand(/** @type {ChangeTextNodeCommand} */cmd)
    }
}

/**
 *
 * @param {Command} cmd
 */
function execCommand(cmd) {
    switch (cmd.type) {
        case 'dom':
            return execDOMCommand(/** @type {DomCommand} */cmd)
    }
}

export { findRootElement, getProperties, execCommand, buildFormTplTree, resolveHighlightTarget };

export function getFormTpl(tplRoot) {
    return tplRoot.innerHTML;
}


// Scripts

const funcBlackList = ['constructor']

export function getFunctions(form) {
    let fList = Object.getOwnPropertyNames(form.constructor.prototype).filter( f => !funcBlackList.includes(f) && typeof form[f] === 'function' );
    return fList.map( f => ({
        name: f,
        text: form[f].toString()
    }))
}

function normalizeStyleSource(source) {
    if (!source) return '';
    if (typeof source === 'string') return source;
    if (typeof source.cssText === 'string') return source.cssText;
    if (Array.isArray(source)) return source.map(normalizeStyleSource).filter(Boolean).join('\n\n');
    if (Array.isArray(source.strings)) return source.strings.join('${}');
    if (typeof source.toString === 'function') {
        const text = source.toString();
        if (text && text !== '[object Object]') return text;
    }
    return '';
}

export function getStyles(form) {
    return normalizeStyleSource(form?.constructor?.css);
}

export function replaceFunction(form, name, text) {
    form.constructor.prototype[name] = new Function('return ' + text)();
}

export function deleteFunction(form, name) {
    delete form.constructor.prototype[name];
}

export function getFullTemplate(tpl) {
    const runtimeTpl = tpl?.origTpl ? tpl : tpl?.tpl?.origTpl ? tpl.tpl : null;
    if (!runtimeTpl?.origTpl) return null;

    let result = runtimeTpl.origTpl.cloneNode(true);
    forEachTemplateRecursive(result, t => {
        let nested = runtimeTpl.nestedTemplate?.get?.(t.id);
        if (!nested?.origTpl) return;
        let st = nested.origTpl.cloneNode(true);
        let te = document.createElement('div');
        te.append(st);
        t.innerHTML = te.innerHTML;
        t.removeAttribute('id');
    });
    return result;
}
