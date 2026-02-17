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
    if (!root || !xpath) return null;
    let path = xpath.split('/');
    let node = root;
    for (let step of path) {
        if (!node) return null;
        if (step === '') continue;
        let match = step.match(/^(?<name>.*?)(?:\[(?<index>\d+)\])?(?:{(?<domindex>\d+)})?$/);
        let m = match?.groups;
        if (m) {
            let {name,index,domindex} = m;
            index = index ? index-1 : 0;
            const lname = String(name || '').toLowerCase();
            if (node instanceof HTMLTemplateElement) {
                node = node.content;
            }
            const childNodes = node?.childNodes ? [...node.childNodes] : [];
            const lightCandidates = childNodes.filter(i => i?.localName === lname);
            const shadowCandidates = node?._nodes ? [...node._nodes].filter(i => i?.localName === lname) : [];
            const candidates = lightCandidates.length > 0 ? lightCandidates : shadowCandidates;
            if (!candidates || candidates.length === 0) return null;
            node = candidates[index];
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
    if (!node?._item?._ti?.ctx) return null;
    let model = node._item._ti.ctx.reduce( (a,c) => {
        if (c.model) a[c.as] = c.model;
        return a;
    }, {});
    return model;
}
