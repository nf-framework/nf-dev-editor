export function getXPath(node) {
    let path = []
    while ( node ) {
        let children = node.parentNode && [...node.parentNode?.children];
        let position = children && children.filter(i=>i.localName === node.localName && (!node._io || node._ti === i._ti)).indexOf(node);
        node.localName && path.push( node.localName + (position ? '[' + (position + 1) + ']' : ''));
        // for document-fragment select template tag that memorized while parse root template
        if (node._io) {
            let tplIndex = [...node._io.tpl._tis].findIndex( t => t[0]._nodes.includes(node));
            node = node._io;
            path.push( node.localName + (tplIndex ? '{' + (tplIndex + 1) + '}' : ''));
        }
        node = node.parentNode?._parentTemplate?.tplPH ?? node.parentNode;
    }
    return '/' + path.reverse().join('/');
}

export function findByXpath(root,xpath,origTpl) {
    let path = xpath.split('/');
    let node = root;
    for (let step of path) {
        if (step === '') continue;
        let m = step.match(/^(?<name>.*?)(?:\[(?<index>\d+)\])?(?:{(?<domindex>\d+)})?$/).groups;
        if (m) {
            let {name,index,domindex} = m;
            index = index ? index-1 : 0;
            if (node instanceof HTMLTemplateElement) {
                node = node.content;
            }
            node = [...(node._nodes ?? node.childNodes)].filter(i=> i.localName === name.toLowerCase())[index];
            if (node instanceof HTMLTemplateElement && node.tpl) {
                if(origTpl)
                    node = node.tpl.origTpl;
                else
                    node = [...node.tpl._tis][domindex ? domindex - 1 : 0][0];
            }
           /* if (node instanceof HTMLTemplateElement) {
                node = node.content;
            }*/
        }
    }
    return node?.host ?? node;
}

export function getModelByDom(node) {
    let ctxModel = node._ctx;
    let model = {};
    let found = false;
    // поднимаемся наверх по всем вложенным контекстам, собираем полную модель
    while (ctxModel) {
        if (ctxModel.model) {
            model[ctxModel.as] = ctxModel.model;
            found = true;
        }
        ctxModel = ctxModel._ti._pti?.ctx;
    }

    if (found) {
        return model;
    }
}
