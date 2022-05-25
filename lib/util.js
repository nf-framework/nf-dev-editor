/**
 * Find nearest DocumentFragment or Document
 * @param {Node} node
 * @return {Document|DocumentFragment}
 */
function findDocumentRoot(node) {
    let root = node;
    while(!(root instanceof Document || root instanceof DocumentFragment || !root)){
        root = root.parentNode
    }
    return  /** @type {Document|DocumentFragment} */ root;
}

/**
 * Get offset top/left from body to node
 * @param {Node} node
 * @return {{ offsetTop, offsetLeft }}
 */
function getFullOffset(node) {
    let { offsetTop, offsetLeft } = node;
    let t = node;
    while (t.offsetParent) {
        t = t.offsetParent;
        let { offsetTop: top, offsetLeft: left } = t;
        offsetLeft += left;
        offsetTop += top;
    }
    return { offsetTop, offsetLeft };
}

export { findDocumentRoot, getFullOffset }