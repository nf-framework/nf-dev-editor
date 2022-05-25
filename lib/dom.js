let counter = 0;

class DomObserver {
    constructor(node) {
        this.node = node;
        let tree = this.buildTree(this.node, true);
        let flat = this.flattenTree(tree);
        this.tree = tree;
        this.flatten = flat;
    }

    /**
     *
     * @param {HTMLElement|SVGElement|ChildNode} node
     * @param {Boolean} [getShadow]
     */
    buildTree(node, getShadow) {
        let info = {
            name: node.localName,
            nodeId: node.id,
            type: node.nodeType,
            value: node.nodeValue,
            shadow: !!node.shadowRoot,
            node,//: new WeakRef(node),
            children: null
        }
        node = getShadow ? node.shadowRoot || node : node;
        info.children = Array.from(node.childNodes)
            .filter( i => i.nodeType === 1 )
            .map( i => this.buildTree(i) )
        return info;
    }

    flattenTree(tree, ppid) {
        let {children,...node} = tree;
        let pid = ppid || null;
        let nodes = [{
                id: ++counter,
                pid,
                ...node
            }];
        let c = counter;
        if (children) nodes = nodes.concat(...children.map( i => this.flattenTree(i,c) ))
        return nodes;
    }
}

export default DomObserver;