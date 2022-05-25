import {domSelector} from "../domselector";
import {PlElement} from "polylib";
import {findByXpath, getXPath} from "../common.js";
import {forEachTemplateRecursive, setAttrValue} from "polylib/common.js";
import {
    getNPath,
    Template,
    TemplateInstance
} from "polylib/template.js";

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
        let path = getXPath(target)
        dispatchEvent(new CustomEvent('select-component', { detail: {path,target} }))
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

function findRootElement(target) {
    let node = target;
    while (node) {
        if (node.host) node = node.host;
        if (node.localName.startsWith('pl-form')) {
            return node
        }   ;
        node = node.parentNode instanceof DocumentFragment ? node.parentNode.host : node.parentNode;
    }
    return false;
}

function describeComponent(node) {
    return {
        name: node instanceof DocumentFragment ? node.host?.nodeName || 'template' : node.nodeName,
        node: node, // instanceof DocumentFragment ? node.host : node,
        id: null,
        parent_id: null,
        _level: null,
        _leaf: null,
        _opened: false
    }
}

export function buildTree(node) {
    return buildRecursive([], node, null, 0);
}

export function getDesignedTpl(form) {
    return form._ti.tpl.origTpl;
}
function buildFormTplTree(form) {
    return buildRecursive([],getDesignedTpl(form),null,0)
}

function buildRecursive(array, node, parent) {
    let info = describeComponent(node);
    info.id = array.length;
    info.parent_id = parent && parent.id;;
    info._level = parent?._level + 1 || 0;
    info.parent = parent;
    array.push(info)
    let childNodes = node.localName == 'template' ? node.tpl.origTpl.childNodes : node.childNodes;
    let filteredNodes = [...childNodes].filter(x => x.localName)
    info._leaf = filteredNodes.length == 0;

    filteredNodes.forEach((child) => {
        buildRecursive(array, child, info);
    })
    return array;
}

function getProperties(target, tplTarget) {
    let props = [];

    if (!target || !target._props) {
        return props;
    }
    //let cmpBinds = formBinds.filter(x => x.node === target);
    for (const [key, value] of Object.entries(target._props)) {
        if (!key.startsWith('_')) {
            //const bind = cmpBinds.find(x => x.name == key);
            let designVal = tplTarget.getAttribute?.(key);
            if (target._dp[key].type == Boolean) designVal = designVal !== null && designVal !== 'false';
            props.push({
                name: key,
                value: designVal ?? value,
                cmp: target,
                currentValue: value
            });
        }
    }

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
                    let target = path.length > 0 ? ti.findByNPath(path) : (ti.ctx?.root ?? ti);
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
                    let target = path.length > 0 ? ti.findByNPath(path) : (ti.ctx?.root ?? ti);
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
            let target = path.length > 0 ? ti.findByNPath(path) : (ti.ctx?.root ?? ti);

            target.remove();


        }
    }
    dispatchEvent(new CustomEvent('form-update', {detail: {}}));
    return result;
}

/**
 *
 * @param {ChangePropertyCommand} cmd
 */
function execChangePropertyCommand(cmd) {
    // change in template
    let tplTarget = findByXpath(cmd.tplRoot,cmd.path, true);
    let subTpl = tplTarget;
    while (subTpl && subTpl.nodeType !== document.DOCUMENT_FRAGMENT_NODE) subTpl = subTpl.parentNode;
    let path = getNPath(subTpl ?? cmd.tplRoot, tplTarget);
    let {property, value} = cmd;
    let domTarget = findByXpath(cmd.domRoot,cmd.path);

    setAttrValue(tplTarget,property, domTarget.constructor.properties[property].type === Boolean ? !!value : value);
    //patch stamped template
    // find node ti
    let n = domTarget;
    while (n && !n._io && n !== cmd.domRoot ) n = n.parentNode;
    let tis;
    if (n._io) {
        tis = [...n._io.tpl._tis].map( i => i[0] );
    } else {
        tis = [cmd.domRoot.host._ti];
    }
    for (let ti of tis ) {
        if (value.match?.(/({{.*}}|\[\[.*]])/) ){
            ti.replaceBind(path, property, value);
        } else {
            // change current visible
            ti.removeBind(path, property);
            let domTarget = ti.findByNPath(path);
            if (domTarget) domTarget[property] = value;
        }
    }
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

export { findRootElement, getProperties, execCommand, buildFormTplTree };

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

export function replaceFunction(form, name, text) {
    form.constructor.prototype[name] = new Function('return ' + text)();
}

export function deleteFunction(form, name) {
    delete form.constructor.prototype[name];
}

export function getFullTemplate(tpl) {
    let result = tpl.origTpl.cloneNode(true);
    forEachTemplateRecursive(result, t => {
        let st = tpl.nestedTemplate.get(t.id).origTpl.cloneNode(true);
        let te = document.createElement('div');
        te.append(st);
        t.innerHTML = te.innerHTML;
        t.removeAttribute('id');
    });
    return result;
}