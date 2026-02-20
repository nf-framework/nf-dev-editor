/** @typedef editorObjectSelector
 *  @property {!String} type
 *  @property {!Function<Node>} checkSelectable
 */

const selectorClasses = [];

class DomSelector {
    constructor() {
        const style = document.createElement('style');
        document.head.appendChild(style);
        style.textContent = `
            .selection-drawer {
                display: none;
                position: fixed;
                box-sizing: border-box;
                top: var(--shape-top, 0);
                left: var(--shape-left, 0);
                height: var(--shape-height, 0);
                width: var(--shape-width, 0);
                border: 2px dashed rgba(26, 159, 106, 0.96);
                background-color: rgba(26, 159, 106, 0.12);
                pointer-events: none;
                z-index: 199999;
            }

            .selection-drawer::after {
                content: attr(data-drop-label);
                position: absolute;
                top: -18px;
                left: 0;
                display: none;
                padding: 2px 6px;
                border-radius: 10px;
                background: rgba(26, 159, 106, 0.96);
                color: #fff;
                font: 11px/1.2 sans-serif;
                white-space: nowrap;
            }

            .selection-drawer[hpos]::after {
                display: block;
            }

            .selection-drawer[hpos=in] {
                border: 2px dashed rgba(26, 159, 106, 0.96);
                background: rgba(26, 159, 106, 0.14);
                box-shadow: inset 0 0 0 1px rgba(26, 159, 106, 0.2);
            }

            .selection-drawer[hpos=before] {
                border: 0;
                border-top: 2px solid #1a9f6a;
                background: rgba(26, 159, 106, 0.16);
                box-shadow: 0 0 0 1px rgba(26, 159, 106, 0.2);
            }

            .selection-drawer[hpos=after] {
                border: 0;
                border-bottom: 2px solid #1a9f6a;
                background: rgba(26, 159, 106, 0.16);
                box-shadow: 0 0 0 1px rgba(26, 159, 106, 0.2);
            }
        `;
        this.drawer = document.createElement('div');
        this.drawer.classList.add('selection-drawer');
        this.drawer.style.display = 'none';
        document.body.appendChild(this.drawer);
    }

    /**
     *
     * @param {editorObjectSelector} obj
     */
    registerSelectorClass(obj) {
        selectorClasses.push(obj);
    }
    findEditableNode(path, checker) {
        this.type = this.type ?? selectorClasses[0].type;
        let selector = selectorClasses.find(s => (this.type === s.type));
        let node = selector.findSelectable(path, this.root, checker);
        return node;

    }
    onMouseMove(e) {
        let selector = selectorClasses.find(s => (this.type === s.type));
        let node = selector.findSelectable(e.composedPath(), this.root);
        if (node) {
            this.drawSelector(node);
            selector.viewOver?.activate(node);
            return true;
        } else {
            this.hideSelector();
        }
    }
    select(opts) {
        let {type,root} = Object.assign( {root: window}, opts );
        this.type = type;
        this.root = root;
        let mousemove = this.onMouseMove.bind(this);
        root.addEventListener('mousemove', mousemove);
        root.addEventListener('scroll', mousemove);
        return new Promise( r => {
            root.addEventListener('click', (e) => {
                let selector = selectorClasses.find(s => (this.type === s.type));
                let node = selector.findSelectable(e.composedPath(), this.root);
                this.drawer.style.display = 'none';
                root.removeEventListener("mousemove", mousemove)
                root.removeEventListener("scroll", mousemove)
                selector.onSelect(node);
                e.stopImmediatePropagation();
                r(node);
                return true;
            }, {capture: true, once: true})
        });
    }

    checkSelectable(target,type, root) {
        return selectorClasses.filter( s => (!type || type === s.type)).find( s => s.checkSelectable(target, type, root) )?.checkSelectable(target, type, root);
    }

    drawSelector(target, opts) {
        let { position } = opts ?? {};
        let x, y, height, width;
        if (Array.isArray(target)) {
            let rect = target[0].getBoundingClientRect();
            let {top,bottom,left,right} = rect;
            ({top,bottom,left,right} = target.map( n => n.getBoundingClientRect?.()).filter(i=>i).reduce( (a,c) => (
                {
                    top: Math.min(a.top,c.top),
                    bottom: Math.max(a.bottom,c.bottom),
                    left: Math.min(a.left,c.left),
                    right: Math.max(a.right,c.right)
                })
                , {top,bottom,left,right}));
            ({x, y, height, width} = { x: left, y: top, width: right - left, height: bottom - top });
        } else {
            if (target?.nodeType === document.TEXT_NODE) {
                let range = document.createRange();
                range.selectNode(target);
                ({x, y, height, width} = range.getBoundingClientRect());
                range.detach();
            } else {
                ({x, y, height, width} = target.getBoundingClientRect?.() ?? {});
            }
        }
        if (height === 0 && width === 0) ( {x,y,height,width} = target?.childNodes[0]?.getBoundingClientRect && target.childNodes[0]?.getBoundingClientRect() || {} )
        if (position === 'before') {
            y = (y || 0) - 2;
            height = 4;
        } else if (position === 'after') {
            y = (y || 0) + (height || 0) - 2;
            height = 4;
        }
        this.drawer.style.setProperty('--shape-top', y + "px");
        this.drawer.style.setProperty('--shape-left', x + "px");
        this.drawer.style.setProperty('--shape-width', width + "px");
        this.drawer.style.setProperty('--shape-height', height + "px");
        if (position === 'before' || position === 'after' || position === 'in') {
            this.drawer.setAttribute('hpos', position);
            const label = position === 'before' ? 'Вставка: до' : (position === 'after' ? 'Вставка: после' : 'Вставка: внутрь');
            this.drawer.setAttribute('data-drop-label', label);
        } else {
            this.drawer.removeAttribute('hpos');
            this.drawer.removeAttribute('data-drop-label');
        }
        this.drawer.style.display = 'block';
    }

    hideSelector() {
        this.drawer.style.display = 'none';
    }
}

const domSelector = new DomSelector();

export {domSelector};
