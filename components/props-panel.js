import { PlElement, html, css } from "polylib";
import "@plcmp/pl-repeat";
import "@plcmp/pl-input";

import { ChangePropertyCommand } from "../lib/commands";
import {findByXpath} from "../lib/common.js";

class PropsPanel extends PlElement {
    static get properties() {
        return {
            data: { type: Array, value: () => [],  observer: '_dataObserver' },
            selected: { type: String, observer: '_selectedChange' },
            fwt: { type: Object },
            domRoot: { type: Object },
            tplRoot: { type: Object }
        }
    }

    static get css() {
        return css`
            :host {
                display: block;
                width: 100%;
                overflow: auto;
            }

            .prop {
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 50px;
                padding: 8px;
                box-sizing: border-box;
            }

            pl-input {
                --content-width: 100%;
            }
        `;
    }

    static get template() {
        return html`
            <pl-repeat items="{{data}}">
                <template>
                    <pl-input label="[[item.name]]" value="{{item.value}}" title="[[_getTitle(item.currentValue)]]"></pl-input>
                </template>
            </pl-repeat>
        `;
    }

    _getTitle(title) {
        return JSON.stringify(title);
    }

    _selectedChange(path) {
        if (path) {
            let tplNode = findByXpath(this.tplRoot, path, true);
            let domNode = findByXpath(this.domRoot, path);
            this.data = this.fwt.getProperties(domNode, tplNode);
        } else {
            this.data = [];
        }
    }
    _dataObserver(newVal, oldVal, mut) {
        if(mut && !mut.init && mut.path !== 'data') {
            const m = mut.path.match(/^data\.(\d*)\.value/);
            if(m) {
                const data = newVal[m[1]];
                this.changeProp(data.cmp, data.name, data.value)
            }
        }
    }

    changeProp(instance, name, value, commit) {
        let cmd = {
            path: this.selected,
            property: name,
            value,
            commit
        }
        window.dispatchEvent(new CustomEvent('command', { detail: new ChangePropertyCommand(cmd) }));
    }
}

customElements.define('pl-props-panel', PropsPanel);