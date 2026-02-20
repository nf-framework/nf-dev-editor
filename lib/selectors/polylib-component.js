import {domSelector} from "../domselector.js";
import {PlElement, TemplateInstance} from "polylib";
import {findByXpath, findByXpathWithFallback, getModelByDom, getXPath} from "../common.js";
import {findByNPath, forEachTemplateRecursive, getNPath, setAttrValue} from "polylib/common.js";
import {
    getEditorComponentConfig,
    getEditorGroup,
    getEditorSelectionResolver,
    getEditorPropertyConfig,
    getPropertyOrder
} from "../config/component-editor-config.js";

function isInsideRoot(node, root) {
    let current = node;
    while (current) {
        if (current === root) return true;
        current = current._io || current.parentNode || current.host;
    }
    return false;
}

function normalizeSelectableTarget(target, root) {
    let node = target;
    if (!node) return null;

    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!(node instanceof Node)) return null;

    const rootNode = node.getRootNode?.();
    if (rootNode instanceof ShadowRoot && rootNode !== root) {
        node = rootNode.host || node;
    }

    if (!(node instanceof Element)) return null;
    if (!isInsideRoot(node, root)) return null;
    return node;
}

function resolveTemplateSelectionPath(target) {
    if (!(target instanceof Node)) return '';
    const runtimePath = getXPath(target);
    const ti = findSelectionTemplateInstance(target);
    if (!(ti instanceof TemplateInstance)) return runtimePath;

    const localPath = getPathInTemplateInstance(ti, target);
    if (!Array.isArray(localPath) || localPath.length === 0) return runtimePath;

    const tplContent = ti?.tpl?.tpl?.content;
    if (!tplContent?.childNodes) return runtimePath;

    const sourceNode = safeFindByNPath({ childNodes: tplContent.childNodes }, localPath);
    if (!(sourceNode instanceof Node)) return runtimePath;
    return getXPath(sourceNode) || runtimePath;
}

function findSelectionTemplateInstance(node) {
    let n = node;
    while (n) {
        const repeatTi = n?._item?._ti;
        if (repeatTi instanceof TemplateInstance) return repeatTi;
        n = n.parentNode instanceof DocumentFragment ? n.parentNode.host : n.parentNode;
    }
    return null;
}

export function findSelectable(path, root, checker) {
    for (const s of (path || [])) {
        const candidate = normalizeSelectableTarget(s, root);
        if (!candidate) continue;
        if (typeof checker === 'function') {
            const checked = checker(candidate);
            if (checked === false || checked == null) continue;
            if (checked instanceof Node) return checked;
        }
        return candidate;
    }
    return null;
}

domSelector.registerSelectorClass({
    type: 'polylib-component',
    checkSelectable: isComponent,
    findSelectable,
    viewOver: undefined,
    onSelect: (target) => {
        if (!target) return;

        let selected = normalizeSelectableTarget(target, domSelector.root) || target;
        const model = getModelByDom(target);
        if (model?.column?.node) {
            selected = model.column.node;
        }

        const runtimePath = getXPath(selected);
        const templatePath = resolveTemplateSelectionPath(selected);
        const path = runtimePath;
        dispatchEvent(new CustomEvent('select-component', {
            detail: {
                path,
                runtimePath,
                templatePath,
                target: selected
            }
        }));
    }
})

let formBinds = {};

function isComponent(target, _type, root) {
    let node = target;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!(node instanceof Element)) return false;
    if (!isInsideRoot(node, root)) return false;
    return node;
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
        const drepeat = node.getAttribute('d:repeat');
        const dif = node.getAttribute('d:if');
        if (drepeat !== null) return 'template[d:repeat]';
        if (dif !== null) return 'template[d:if]';
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
    const node = tplTarget instanceof Element ? tplTarget : target;
    if (!node || !(node instanceof Element)) return props;

    const componentName = String(node.localName || '').toLowerCase();
    const componentConfig = getEditorComponentConfig(componentName);
    const componentTitle = componentConfig?.title || componentName;
    const componentDescription = componentConfig?.description || '';
    const runtimeProps = (target && target?.localName === componentName) ? (target._props || {}) : {};
    const hasRuntimeProps = Object.keys(runtimeProps).length > 0;
    const ctor = target?.constructor || customElements.get(componentName) || tplTarget?.constructor;
    const ctorProps = ctor?.properties || {};
    const propertyNames = new Set();
    const configuredNames = new Set();

    const isBindExpression = (input) => typeof input === 'string' && /({{.*}}|\[\[.*]])/.test(input);

    const normalizeBoolean = (value) => {
        if (value === true || value === false) return value;
        const normalized = String(value ?? '').trim().toLowerCase();
        return ['true', '1', 'yes', 'y', 'on', 'да'].includes(normalized);
    };

    const resolveEditorType = (propType, propConfig, value, boundExpression) => {
        if (boundExpression) return 'text';
        if (propConfig?.editor) return propConfig.editor;
        if (propType === Boolean) return 'boolean';
        if (propType === Number) return 'number';
        if (typeof value === 'string' && value.length > 80) return 'textarea';
        return 'text';
    };

    const normalizeEditorValue = (value, propType, editor, boundExpression) => {
        if (boundExpression) return value ?? '';
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
            if (isBindExpression(designValue)) {
                return { hasAttr: true, value: designValue };
            }
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

        const boundExpression = isBindExpression(rawValue);
        const editor = resolveEditorType(propType, propConfig, rawValue, boundExpression);
        const group = getEditorGroup(componentConfig, propConfig?.group);

        props.push({
            name: key,
            value: normalizeEditorValue(rawValue, propType, editor, boundExpression),
            cmp: target || tplTarget,
            currentValue: value,
            editor,
            boundExpression,
            visibleWhen: propConfig?.visibleWhen || null,
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

function getCustomElementCtorByNode(node) {
    const name = String(node?.localName || '').toLowerCase();
    if (!name || !name.includes('-')) return null;
    try {
        return customElements.get(name) || null;
    } catch (_err) {
        return null;
    }
}


function createElementForTemplate(name){
    const tag = String(name || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9._-]*-[a-z0-9._-]+$/.test(tag)) return null;
    let tpl = document.createElement('template');
    tpl.insertAdjacentHTML('afterbegin', `<${tag}></${tag}>`);
    return tpl.content?.firstElementChild || tpl.firstElementChild || null;
}

function applySlotValue(node, slot) {
    if (!(node instanceof Element) || slot === undefined) return;
    const normalized = String(slot || '').trim();
    if (!normalized) {
        node.removeAttribute('slot');
        return;
    }
    setAttrValue(node, 'slot', normalized);
}

function domAppend(node, target, pos, slot) {
    if (node === target) return;
    applySlotValue(node, slot);
    if (pos === 'in') {
        const inTarget = target instanceof HTMLTemplateElement ? target.content : target;
        inTarget?.appendChild?.(node);
    }
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
            if (!cmp) return;
            let tplTarget = (cmd.sourcePath
                    ? (findByXpath(cmd.tplRoot, cmd.sourcePath, true) || findByXpathWithFallback(cmd.tplRoot, cmd.sourcePath, true).node)
                    : null)
                || findByXpath(cmd.tplRoot, cmd.path, true)
                || findByXpathWithFallback(cmd.tplRoot, cmd.path, true).node;
            if (!tplTarget) return;
            let subTpl = tplTarget;
            while (subTpl && subTpl !== cmd.tplRoot && subTpl.nodeType !== document.DOCUMENT_FRAGMENT_NODE) subTpl = subTpl.parentNode;
            let path = getNPath(subTpl ?? cmd.tplRoot, tplTarget);
            domAppend(cmp,tplTarget,cmd.position,cmd.slot);
            const templateContext = String(cmd.sourcePath || '').includes('/template')
                || String(cmd.sourceElement || '').includes('/template');
            if (templateContext) {
                const rootTi = cmd.domRoot?.host?._ti || cmd.domRoot?._ti;
                try {
                    rootTi?.tpl?.refresh?.();
                } catch (_err) {
                    // ignore editor-only runtime refresh errors
                }
                dispatchEvent(new CustomEvent('form-update', {detail: {}}));
                const lastSegment = String(cmd.element || '').split('/').filter(Boolean).pop() || '';
                const select = cmd.position === 'in' && lastSegment
                    ? `${String(cmd.path || '').replace(/\/+$/, '')}/${lastSegment}`
                    : (cmd.element || cmd.path || '');
                return {select};
            }
            let domTarget = cmd.path === '/'
                ? cmd.domRoot
                : (findByXpath(cmd.domRoot, cmd.path)
                    || findByXpathWithFallback(cmd.domRoot, cmd.path).node
                    || (cmd.sourcePath ? (findByXpath(cmd.domRoot, cmd.sourcePath) || findByXpathWithFallback(cmd.domRoot, cmd.sourcePath).node) : null));

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
                    if (!cmp || !target) {
                        ti?.tpl?.refresh?.();
                        continue;
                    }
                    if (ti.tpl.tplPH) cmp.io = ti.tpl.tplPH;
                    domAppend(cmp,target,cmd.position,cmd.slot);

                    if (domTarget === target) result = cmp;
                }
            }

            if(!result) {
                result = findByXpath(cmd.domRoot, cmd.path + '/' + cmd.element)
                    || findByXpathWithFallback(cmd.domRoot, cmd.path + '/' + cmd.element).node
                    || (cmd.sourcePath ? (findByXpath(cmd.domRoot, cmd.sourcePath + '/' + cmd.element) || findByXpathWithFallback(cmd.domRoot, cmd.sourcePath + '/' + cmd.element).node) : null);
            }
            dispatchEvent(new CustomEvent('form-update', {detail: {}}))
            return {select: getXPath(result)};
    }
}

function execMoveElementCommand(cmd) {
    switch (cmd.position) {
        case 'in':
        case 'before':
        case 'after':
            let cmp = (cmd.sourceElement
                    ? (findByXpath(cmd.tplRoot, cmd.sourceElement, true) || findByXpathWithFallback(cmd.tplRoot, cmd.sourceElement, true).node)
                    : null)
                || findByXpath(cmd.tplRoot, cmd.element, true)
                || findByXpathWithFallback(cmd.tplRoot, cmd.element, true).node;
            if (!cmp) return;
            let tplTarget = (cmd.sourcePath
                    ? (findByXpath(cmd.tplRoot, cmd.sourcePath, true) || findByXpathWithFallback(cmd.tplRoot, cmd.sourcePath, true).node)
                    : null)
                || findByXpath(cmd.tplRoot, cmd.path, true)
                || findByXpathWithFallback(cmd.tplRoot, cmd.path, true).node;
            if (!tplTarget) return;
            let subTpl = tplTarget;
            while (subTpl && subTpl !== cmd.tplRoot && subTpl.nodeType !== document.DOCUMENT_FRAGMENT_NODE) subTpl = subTpl.parentNode;
            let path = getNPath(subTpl ?? cmd.tplRoot, tplTarget);
            domAppend(cmp,tplTarget,cmd.position,cmd.slot);
            let domTarget = cmd.path === '/'
                ? cmd.domRoot
                : (findByXpath(cmd.domRoot, cmd.path)
                    || findByXpathWithFallback(cmd.domRoot, cmd.path).node
                    || (cmd.sourcePath ? (findByXpath(cmd.domRoot, cmd.sourcePath) || findByXpathWithFallback(cmd.domRoot, cmd.sourcePath).node) : null));

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
                    let runtimeCmp = findByXpath(ti.ctx?.root ?? ti, cmd.element)
                        || findByXpathWithFallback(ti.ctx?.root ?? ti, cmd.element).node
                        || (cmd.sourceElement ? (findByXpath(ti.ctx?.root ?? ti, cmd.sourceElement) || findByXpathWithFallback(ti.ctx?.root ?? ti, cmd.sourceElement).node) : null);
                    if (!runtimeCmp || !target) {
                        ti?.tpl?.refresh?.();
                        continue;
                    }
                    if (ti.tpl.tplPH) runtimeCmp.io = ti.tpl.tplPH;
                    domAppend(runtimeCmp, target, cmd.position, cmd.slot);
                    result = runtimeCmp;
                    if (domTarget === target) result = runtimeCmp;
                }
            }

            if(!result) {
                result = findByXpath(cmd.domRoot, cmd.path + '/' + cmd.element)
                    || findByXpathWithFallback(cmd.domRoot, cmd.path + '/' + cmd.element).node
                    || (cmd.sourcePath && cmd.sourceElement
                        ? (findByXpath(cmd.domRoot, cmd.sourcePath + '/' + cmd.sourceElement) || findByXpathWithFallback(cmd.domRoot, cmd.sourcePath + '/' + cmd.sourceElement).node)
                        : null);
            }
            if (!result) {
                cmd.domRoot?.host?._ti?.tpl?.refresh?.();
            }
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

function normalizeClassValue(value) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    if (isBindExpression(text)) return text;
    return Array.from(new Set(text.split(/\s+/).filter(Boolean))).join(' ');
}

function applyClassValue(node, value) {
    if (!(node instanceof Element)) return;
    const normalized = normalizeClassValue(value);
    if (!normalized) {
        node.removeAttribute('class');
        try {
            node.className = '';
        } catch (_err) {
            // ignore readonly className assignment errors
        }
        return;
    }
    setAttrValue(node, 'class', normalized);
    if (isBindExpression(normalized)) return;
    try {
        node.className = normalized;
    } catch (_err) {
        // ignore readonly className assignment errors
    }
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
    const sourcePath = cmd.sourcePath || cmd.path;
    const tplResolved = findByXpathWithFallback(cmd.tplRoot, cmd.path, true);
    const sourceTplResolved = findByXpathWithFallback(cmd.sourceTplRoot, sourcePath, true);
    const domResolved = findByXpathWithFallback(cmd.domRoot, cmd.path);
    const runtimeExact = tplResolved.path === cmd.path;
    const tplTarget = runtimeExact ? tplResolved.node : (sourceTplResolved.node || tplResolved.node);
    let domTarget = domResolved.node;
    if (!tplTarget) return { tplTarget: null, domTarget: null, path: [], tis: [], templateTailSegments: null };

    if (domTarget?.localName && tplTarget?.localName && domTarget.localName !== tplTarget.localName) {
        const inner = domTarget.querySelector?.(tplTarget.localName);
        if (inner) domTarget = inner;
    }

    let subTpl = tplTarget;
    while (subTpl && subTpl.nodeType !== document.DOCUMENT_FRAGMENT_NODE) subTpl = subTpl.parentNode;
    const pathRoot = subTpl ?? cmd.tplRoot ?? cmd.sourceTplRoot;
    const path = getNPath(pathRoot, tplTarget);
    const templateTailSegments = getTemplateTailSegments(sourcePath);

    const tis = resolveTemplateInstances(domTarget, cmd.domRoot);

    return { tplTarget, domTarget, path, tis, templateTailSegments };
}

function alignRuntimeNodeToTemplate(targetNode, tplTarget) {
    if (!targetNode || !tplTarget?.localName) return targetNode;
    if (targetNode.localName === tplTarget.localName) return targetNode;
    const nested = targetNode.querySelector?.(tplTarget.localName);
    return nested || targetNode;
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

function safeFindByNPath(root, path) {
    try {
        return findByNPath(root, path);
    } catch (_err) {
        return null;
    }
}

function parsePathSegment(segment) {
    const match = String(segment || '').match(/^(?<name>.*?)(?:\[(?<index>\d+)\])?(?:\{(?<domindex>\d+)\})?$/);
    if (!match?.groups?.name) return null;
    return {
        name: String(match.groups.name).toLowerCase(),
        index: match.groups.index ? Math.max(0, Number(match.groups.index) - 1) : 0
    };
}

function getTemplateTailSegments(path) {
    const parts = String(path || '').split('/').filter(Boolean).map(parsePathSegment).filter(Boolean);
    if (!parts.length) return null;
    const lastTemplateIndex = parts.map((s) => s.name).lastIndexOf('template');
    if (lastTemplateIndex < 0) return null;
    return parts.slice(lastTemplateIndex + 1);
}

function findByLocalSegments(root, segments) {
    if (!root || !Array.isArray(segments) || segments.length === 0) return null;
    let node = root;
    for (const seg of segments) {
        if (!seg?.name) return null;
        if (node instanceof HTMLTemplateElement) node = node.content;
        const candidates = [...(node?.childNodes || [])].filter((child) => child?.localName === seg.name);
        node = candidates[seg.index || 0];
        if (!node) return null;
    }
    return node;
}

function getPathInTemplateInstance(ti, node) {
    if (!ti || !node) return null;
    const roots = Array.isArray(ti._nodes) ? ti._nodes : [];
    if (!roots.length) return null;
    const rootSet = new Set(roots);
    const path = [];
    let current = node;
    while (current) {
        if (rootSet.has(current)) {
            path.unshift(roots.indexOf(current));
            return path;
        }
        const parent = current.parentNode;
        if (!parent?.childNodes) return null;
        const index = [...parent.childNodes].indexOf(current);
        if (index < 0) return null;
        path.unshift(index);
        current = parent;
    }
    return null;
}

function resolveTargetInTemplateInstance(ti, path, templateTailSegments) {
    const root = { childNodes: ti?._nodes || [] };
    let target = safeFindByNPath(root, path);
    let targetPath = Array.isArray(path) ? path.slice() : [];

    if (!target && templateTailSegments?.length) {
        target = findByLocalSegments(root, templateTailSegments);
        if (!target && templateTailSegments.length > 1) {
            target = findByLocalSegments(root, [templateTailSegments[templateTailSegments.length - 1]]);
        }
        if (target) {
            targetPath = getPathInTemplateInstance(ti, target) || targetPath;
        }
    }

    if (!target) return { target: null, targetPath: null };
    return { target, targetPath };
}

function findNearestTemplateInstance(node) {
    let n = node;
    while (n) {
        // В редакторе нужен TemplateInstance формы (или repeat-клона формы),
        // а не внутренний _ti кастомного компонента (shadow template самого pl-*).
        const ti = n?._item?._ti || null;
        if (ti) return ti;
        n = n.parentNode instanceof DocumentFragment ? n.parentNode.host : n.parentNode;
    }
    return null;
}

function collectTemplateInstances(container, out = []) {
    if (!container) return out;

    if (container instanceof TemplateInstance) {
        out.push(container);
        (container.nti || []).forEach((nested) => collectTemplateInstances(nested, out));
        return out;
    }

    if (Array.isArray(container?.clones)) {
        container.clones.forEach((clone) => collectTemplateInstances(clone?._ti, out));
    }

    (container?.nti || []).forEach((nested) => collectTemplateInstances(nested, out));
    return out;
}

function resolveTemplateInstances(domTarget, domRoot) {
    const rootTi = domRoot?.host?._ti;
    const ti = findNearestTemplateInstance(domTarget);
    if (!ti) {
        if (!rootTi) return [];
        const all = collectTemplateInstances(rootTi, []);
        return all.length ? [...new Set(all)] : [rootTi];
    }

    const repeater = Array.isArray(ti?.ctx)
        ? ti.ctx.find((ctx) => Array.isArray(ctx?.clones))
        : null;

    if (repeater?.clones?.length) {
        const cloneInstances = repeater.clones
            .map((clone) => clone?._ti)
            .filter((instance) => instance instanceof TemplateInstance);
        if (cloneInstances.length) return cloneInstances;
    }

    return [ti];
}

/**
 *
 * @param {ChangePropertyCommand} cmd
 */
function execChangePropertyCommand(cmd) {
    const { tplTarget, domTarget, path, tis, templateTailSegments } = getCommandScope(cmd);
    if (!tplTarget) return;
    let { property, value } = cmd;
    if (property === 'className') property = 'class';
    const isClassProperty = property === 'class';
    const tplCtor = getCustomElementCtorByNode(tplTarget);
    const bindExpression = isBindExpression(value);
    const propType = domTarget?.constructor?.properties?.[property]?.type
        ?? tplCtor?.properties?.[property]?.type;
    let runtimeTarget = domTarget;

    if (isClassProperty) {
        applyClassValue(tplTarget, value);
    } else {
        setAttrValue(tplTarget, property, bindExpression ? value : (propType === Boolean ? !!value : value));
    }
    let appliedCount = 0;
    for (let ti of tis ) {
        const { target: rawTarget, targetPath } = resolveTargetInTemplateInstance(ti, path, templateTailSegments);
        if (!rawTarget || !targetPath) continue;

        if (bindExpression) {
            ti.replaceBind(targetPath, property, value);
            if (isClassProperty) ti.tpl?.refresh?.();
            appliedCount += 1;
        } else {
            ti.removeBind(targetPath, property);
            let targetNode = alignRuntimeNodeToTemplate(rawTarget, tplTarget);
            if (targetNode?.nodeType === Node.ELEMENT_NODE) {
                runtimeTarget = runtimeTarget || targetNode;
                if (isClassProperty) {
                    applyClassValue(targetNode, value);
                } else {
                    setAttrValue(targetNode, property, value);
                }
                if (!isClassProperty && property in targetNode) {
                    try {
                        targetNode[property] = value;
                    } catch (_e) {
                        // ignore readonly/native assignment failures
                    }
                }
                appliedCount += 1;
            } else {
                ti.tpl?.refresh?.();
            }
        }
    }

    if (appliedCount === 0 && domTarget?.nodeType === Node.ELEMENT_NODE) {
        if (isClassProperty) {
            applyClassValue(domTarget, value);
        } else {
            setAttrValue(domTarget, property, bindExpression ? value : value);
        }
        if (!isClassProperty && !bindExpression && property in domTarget) {
            try {
                domTarget[property] = propType === Boolean ? !!value : value;
            } catch (_err) {
                // ignore readonly/native assignment failures
            }
        }
    }

    syncGridColumnInRuntime(runtimeTarget, property, value);
    return;

}

function execChangeAttributeCommand(cmd) {
    const { tplTarget, domTarget, path, tis, templateTailSegments } = getCommandScope(cmd);
    if (!tplTarget) return;
    const attribute = cmd.attribute === 'className' ? 'class' : cmd.attribute;
    const isClassAttribute = attribute === 'class';
    const value = cmd.value ?? '';
    if (!attribute) return;
    let runtimeTarget = null;

    if (value === '') {
        if (isClassAttribute) {
            applyClassValue(tplTarget, '');
        } else {
            tplTarget.removeAttribute(attribute);
        }
    } else {
        if (isClassAttribute) {
            applyClassValue(tplTarget, value);
        } else {
            setAttrValue(tplTarget, attribute, value);
        }
    }

    for (let ti of tis) {
        const { target: rawTarget, targetPath } = resolveTargetInTemplateInstance(ti, path, templateTailSegments);
        if (!rawTarget || !targetPath) continue;

        if (isBindExpression(value)) {
            ti.replaceBind(targetPath, attribute, value);
            if (isClassAttribute) ti.tpl?.refresh?.();
        } else {
            ti.removeBind(targetPath, attribute);
            const targetNode = alignRuntimeNodeToTemplate(rawTarget, tplTarget);
            if (targetNode?.nodeType === Node.ELEMENT_NODE) {
                runtimeTarget = runtimeTarget || targetNode;
                if (value === '') {
                    if (isClassAttribute) {
                        applyClassValue(targetNode, '');
                    } else {
                        targetNode.removeAttribute(attribute);
                    }
                } else {
                    if (isClassAttribute) {
                        applyClassValue(targetNode, value);
                    } else {
                        setAttrValue(targetNode, attribute, value);
                    }
                }
            } else {
                ti.tpl?.refresh?.();
            }
        }
    }

    if (!runtimeTarget && domTarget?.nodeType === Node.ELEMENT_NODE) {
        if (value === '') {
            if (isClassAttribute) {
                applyClassValue(domTarget, '');
            } else {
                domTarget.removeAttribute(attribute);
            }
        } else {
            if (isClassAttribute) {
                applyClassValue(domTarget, value);
            } else {
                setAttrValue(domTarget, attribute, value);
            }
        }
    }

    syncGridColumnInRuntime(runtimeTarget, attribute, value);
}

function execChangeTextNodeCommand(cmd) {
    const { tplTarget, domTarget, path, tis, templateTailSegments } = getCommandScope(cmd);
    if (!tplTarget) return;

    const textPath = Array.isArray(cmd.textPath) ? cmd.textPath.map(i => Number(i)).filter(Number.isInteger) : [];
    const value = String(cmd.value ?? '');
    const bindValue = isBindExpression(value);

    const tplTextNode = findNodeByIndexes(tplTarget, textPath);
    if (tplTextNode) tplTextNode.textContent = value;

    for (let ti of tis) {
        const { target: runtimeElement, targetPath } = resolveTargetInTemplateInstance(ti, path, templateTailSegments);
        if (!runtimeElement || !targetPath) continue;

        const fullPath = [...targetPath, ...textPath];
        let runtimeTextNode = safeFindByNPath({ childNodes: ti?._nodes || [] }, fullPath);
        if (!runtimeTextNode) {
            const alignedElement = alignRuntimeNodeToTemplate(runtimeElement, tplTarget);
            let candidate = alignedElement;
            for (const idx of textPath) {
                candidate = candidate?.childNodes?.[idx];
                if (!candidate) break;
            }
            runtimeTextNode = candidate || null;
        }

        // Сбрасываем старые текстовые бинды для этого text-node пути
        // (исторически текстовые бинды имеют name === undefined).
        try {
            ti.removeBind(fullPath, undefined);
            ti.removeBind(fullPath, 'textContent');
        } catch (_err) {
            // ignore editor-only runtime bind cleanup errors
        }

        if (bindValue) {
            // Перестраиваем биндинг текстового узла в рантайме.
            try {
                ti.replaceBind(fullPath, 'textContent', value);
            } catch (_err) {
                if (runtimeTextNode) runtimeTextNode.textContent = value;
            }
            continue;
        }

        if (runtimeTextNode) runtimeTextNode.textContent = value;
        else ti.tpl?.refresh?.();
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
