/** @typedef editorObjectSelector
 *  @property {!String} type
 *  @property {!Function<Node>} checkSelectable
 */

const selectorClasses = [];

class DomSelector {
    constructor() {
        let style = document.createElement('style');
        document.head.appendChild(style);
        let sheet = style.sheet;
        let styles = `.selection-drawer {
                    display: none;
                    position: fixed;
                    box-sizing: border-box;
                    top: var(--shape-top, 0);
                    left: var(--shape-left, 0);
                    height: var(--shape-height, 0);
                    width: var(--shape-width, 0);
                    border: 1px solid blue;
                    background-color: rgba(0, 0, 255, .3);
                    pointer-events: none;
                    z-index: 99999;
                }
                `
        sheet.insertRule(styles, 0);
        sheet.insertRule('.selection-drawer[hpos=before] { border-left: 8px solid lightgreen; }', 0);
        sheet.insertRule('.selection-drawer[hpos=after] { border-right: 8px solid lightgreen; }', 0);
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
        /*let node = this.checkSelectable(e.target, this.type, this.root);
        if (node === true)  node = this.findEditableNode(e.target);*/
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
                //let typeInfo = selectorClasses.find( s => (!type || type === s.type) && s.checkSelectable(e.target, type, root) );
                //parent.postMessage({node},'*');
                /*window.dispatchEvent(new CustomEvent('select-component',{
                    detail: {
                        root,
                        node,
                        typeInfo
                    }
                }))*/
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
        //let { offsetTop, offsetLeft } = getFullOffset(target);
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
            if (target.nodeType === document.TEXT_NODE) {
                let range = document.createRange();
                range.selectNode(target);
                ({x, y, height, width} = range.getBoundingClientRect());
                range.detach();
            } else {
                //TODO: template haven`t client rect, replace with children rect
                ({x, y, height, width} = target.getBoundingClientRect?.() ?? {});
            }
        }
        if (height === 0 && width === 0) ( {x,y,height,width} = target.childNodes[0]?.getBoundingClientRect && target.childNodes[0]?.getBoundingClientRect() || {} )
        this.drawer.style.setProperty('--shape-top', y + "px");
        this.drawer.style.setProperty('--shape-left', x + "px");
        this.drawer.style.setProperty('--shape-width', width + "px");
        this.drawer.style.setProperty('--shape-height', height + "px");
        this.drawer.setAttribute('hpos', position);
        this.drawer.style.display = 'block';
    }

    hideSelector() {
        this.drawer.style.display = 'none';
    }
}

const domSelector = new DomSelector();

export {domSelector};