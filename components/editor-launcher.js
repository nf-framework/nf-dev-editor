import { html, css, PlElement } from "polylib";
import "@plcmp/pl-icon";

import '@editor/lib/shortcut.js';

class EditorLauncher extends PlElement {
    static template = html`<pl-icon iconset="pl-default" icon="pencil" size="16"></pl-icon>`;
    static css = css`
        :host {
          position: fixed;
          top: 0;
          right: 16px;
          padding: 4px;
          cursor: pointer;
          border: 1px solid var(--grey-light);
          background-color: white;
        }
    `;
    opened = false;
    connectedCallback() {
        super.connectedCallback();
        this.addEventListener('click', this.open);
        this.x = shortcut.listen(['AltLeft', 'AltLeft'], this.open);
    }

    open() {
        shortcut.forget(this.x)
        if (this.opened) return;
        this.opened = true;
        import("./editor-main.js");
        const cont = document.createElement('pl-editor-main');
        document.body.appendChild(cont);
    }
}

customElements.define('pl-editor-launcher', EditorLauncher);