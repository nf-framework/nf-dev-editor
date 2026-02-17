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

function uniq(list) {
    return [...new Set(list.filter(Boolean))];
}

export function buildXPathCandidates(path) {
    const raw = String(path || '').trim();
    if (!raw) return [];
    const stripTplIndexes = raw.replace(/\{\d+\}/g, '');
    const stripNodeIndexes = raw.replace(/\[\d+\]/g, '');
    const stripBoth = stripTplIndexes.replace(/\[\d+\]/g, '');
    const compact = raw
        .split('/')
        .map(step => step.replace(/\{\d+\}/g, '').replace(/\[\d+\]/g, ''))
        .join('/');
    return uniq([raw, stripTplIndexes, stripNodeIndexes, stripBoth, compact]);
}

function buildAncestorPaths(path) {
    const parts = String(path || '').split('/').filter(Boolean);
    const out = [];
    for (let i = parts.length - 1; i > 0; i--) {
        out.push('/' + parts.slice(0, i).join('/'));
    }
    return out;
}

export function findByXpathWithFallback(root, xpath, origTpl) {
    if (!root || !xpath) return { node: null, path: null };
    const candidates = buildXPathCandidates(xpath);
    for (const candidate of candidates) {
        const node = findByXpath(root, candidate, origTpl);
        if (node) return { node, path: candidate };
    }

    const ancestorCandidates = uniq(candidates.flatMap(buildAncestorPaths));
    for (const candidate of ancestorCandidates) {
        const node = findByXpath(root, candidate, origTpl);
        if (node) return { node, path: candidate };
    }

    return { node: null, path: null };
}

export function getModelByDom(node) {
    if (!node?._item?._ti?.ctx) return null;
    let model = node._item._ti.ctx.reduce( (a,c) => {
        if (c.model) a[c.as] = c.model;
        return a;
    }, {});
    return model;
}
