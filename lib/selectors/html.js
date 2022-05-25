import { domSelector } from "../domselector.js";
import { PlElement, html, css } from "polylib";

class HTMLInfoView extends PlElement {
    static get properties() {
        return {
            active: { type: Object, observer: '_activeObserver' },
            classList: { type: Array, value: () => [] }
        };
    }

    connectedCallback() {
        super.connectedCallback();
        this.active = document.body;
        this.classList = this.active.classList;
    }

    static get css() {
        return css`
            :host {
                position: fixed;
                left: var(--x-pos);
                top: var(--y-pos);
                z-index: 9999;
            }

            div.container {
                background-color: white;
                border: 1px solid grey;
                min-width: 100px;
                height: 20px;
                padding: 4px;
            }

            span.name {
                text-transform: lowercase;
                font-weight: bold;
                color: #902727;
            }`
            ;
    }

    static get template() {
        return html`
            <div class="container">
                <span class="name">[[active.tagName]]</span>
                <!-- <span>${[...this.active.classList].map(i => '.' + i)}</span> -->
            </div>`;
    }

    _activeObserver(newVal) {
        let br = newVal.getBoundingClientRect();
        this.style.setProperty('--x-pos', br.left + 'px');
        this.style.setProperty('--y-pos', br.bottom + 'px');
    }
    /**
     *
     * @param {HTMLElement} target
     */
    activate(target) {
        this.active = target;
    }
}

let l = document.createElement('ed-html-view');

const obj = {
    type: 'html-dom',
    checkSelectable: target => true,
    viewOver: l,
    onSelect: (target) => {
        dispatchEvent(new CustomEvent('select', { detail: target }))
    }
}

//customElements.define('ed-html', HTMLDomEditor);
customElements.define('ed-html-view', HTMLInfoView);
document.body.appendChild(l);
domSelector.registerSelectorClass(obj)