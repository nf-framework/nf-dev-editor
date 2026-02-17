import { findDocumentRoot } from './util.js';

class Css {
    /**
     * Find all css style rule applied to Node
     * @param node
     * @return {CSSStyleRule[]}
     */
    getRules(node) {
        if (!node || typeof node.matches !== 'function') return [];
        let root = findDocumentRoot(node);
        const styleSheets = [...(root?.styleSheets || [])];
        /** @type {CSSStyleRule[]}*/
        let rules = [];

        styleSheets.forEach((sheet) => {
            try {
                const cssRules = [...(sheet?.cssRules || [])];
                cssRules.forEach((rule) => {
                    if (rule?.selectorText) rules.push(rule);
                });
            } catch (_e) {
                // Ignore inaccessible stylesheet (cross-origin, etc.)
            }
        });

        return rules.filter((rule) => {
            try {
                return node.matches(rule.selectorText);
            } catch (_e) {
                return false;
            }
        });
    }


}

export default Css;
