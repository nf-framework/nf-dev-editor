import { findDocumentRoot } from './util.js';

class Css {
    /**
     * Find all css style rule applied to Node
     * @param node
     * @return {CSSStyleRule[]}
     */
    getRules(node) {
        let root = findDocumentRoot(node);
        /** @type {CSSStyleRule[]}*/
        let rules = [].concat(...[...root.styleSheets].map(s => [...s.cssRules||[]]));
        return rules.filter( r=>node.matches(r.selectorText));
    }


}

export default Css;