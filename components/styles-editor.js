import { PlElement, html } from "polylib";
import "@plcmp/pl-drawer";
import "@nfjs/front-pl/components/pl-codeeditor.js";

class PlStylesEditor extends PlElement {
    static get properties() {
        return {
            fwt: { type: Object },
            form: { type: Object, observer: "_formObserver" },
            stylesText: { type: String, observer: "_stylesTextObserver" },
            errorMessage: { type: String }
        };
    }

    static get template() {
        return html`
             <pl-drawer header="Styles" contained size="medium" id="drawer" position="right">
                <pl-codeeditor id="codeeditor" value="{{stylesText}}"></pl-codeeditor>
                <pl-flex-layout slot="footer">
                    [[errorMessage]]
                </pl-flex-layout>
            </pl-drawer>
        `;
    }

    constructor() {
        super();
        this._previewStyle = null;
        this._skipObserver = false;
    }

    disconnectedCallback() {
        this._removePreviewStyle();
        super.disconnectedCallback();
    }

    open() {
        this.$.drawer.opened = !this.$.drawer.opened;
    }

    openForClassToken(classToken, form) {
        if (form) this.form = form;
        this.$.drawer.opened = true;
        this._scrollToClassToken(classToken);
    }

    _setStylesText(value) {
        this._skipObserver = true;
        this.stylesText = value;
        if (this.$.codeeditor) this.$.codeeditor.value = value;
        this._skipObserver = false;
    }

    _formObserver(form) {
        this._removePreviewStyle();
        if (!form) {
            this._setStylesText("");
            this.errorMessage = "";
            return;
        }
        const styles = this.fwt?.getStyles?.(form) ?? "";
        this._setStylesText(styles);
        this.errorMessage = "";
        this._applyPreviewStyle(styles);
    }

    _validateStyles(styles) {
        if (typeof CSSStyleSheet !== "function") return;
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(styles);
    }

    _stylesTextObserver(value) {
        if (this._skipObserver || !this.form) return;
        const styles = value ?? "";
        try {
            this._validateStyles(styles);
            this.errorMessage = "";
            this._applyPreviewStyle(styles);
        } catch (err) {
            this.errorMessage = err?.message || String(err);
        }
    }

    _applyPreviewStyle(styles) {
        const root = this.form?.shadowRoot;
        if (!root) return;

        let style = this._previewStyle;
        if (!style || !style.isConnected) {
            style = root.querySelector("style[data-dev-editor-preview-style]");
        }
        if (!style) {
            style = document.createElement("style");
            style.setAttribute("data-dev-editor-preview-style", "1");
            root.appendChild(style);
        }
        style.textContent = styles;
        this._previewStyle = style;
    }

    _removePreviewStyle() {
        if (this._previewStyle?.isConnected) this._previewStyle.remove();
        this._previewStyle = null;
    }

    _scrollToClassToken(classToken) {
        const token = String(classToken || '').trim();
        if (!token) return;
        const text = String(this.stylesText || '');
        if (!text) return;

        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\.${escaped}(?![\\w-])`);
        const match = regex.exec(text);
        if (!match) return;
        const index = match.index;
        const before = text.slice(0, index);
        const row = before.split('\n').length;
        const col = index - (before.lastIndexOf('\n') + 1) + 1;

        const reveal = () => {
            const editor = this.$.codeeditor?.editor;
            if (!editor?.gotoLine) return false;
            editor.gotoLine(row, col, true);
            editor.scrollToLine(row, true, true, () => {});
            editor.focus();
            return true;
        };

        let attempts = 0;
        const tryReveal = () => {
            attempts += 1;
            if (reveal()) return;
            if (attempts < 12) requestAnimationFrame(tryReveal);
        };
        requestAnimationFrame(tryReveal);
    }
}

customElements.define("pl-styles-editor", PlStylesEditor);
