import { PlElement, html, css } from "polylib";
import "@plcmp/pl-button";
import "@plcmp/pl-icon-button";
import "@plcmp/pl-iconset-default";
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
                <pl-codeeditor
                    id="codeeditor"
                    value="{{stylesText}}"
                    mode="ace/mode/css"
                    theme="ace/theme/textmate"
                    wrap
                    tab-size="2"
                    show-print-margin
                    print-margin-column="100"
                    enable-basic-autocompletion
                    enable-live-autocompletion
                    enable-snippets></pl-codeeditor>
                <pl-flex-layout slot="footer" class="footer-bar">
                    <pl-button variant="ghost" label="Поиск" on-click="[[findInCode]]"></pl-button>
                    <pl-button variant="ghost" label="Заменить" on-click="[[replaceInCode]]"></pl-button>
                    <pl-button variant="ghost" label="Строка" on-click="[[gotoLine]]"></pl-button>
                    <pl-button variant="ghost" label="[[_wrapLabel(wrap)]]" on-click="[[toggleWrap]]"></pl-button>
                    <span class="footer-error">[[errorMessage]]</span>
                </pl-flex-layout>
            </pl-drawer>
        `;
    }

    static get css() {
        return css`
            :host {
                position: fixed;
                inset: 0;
                z-index: 12;
                pointer-events: none;
            }

            pl-drawer {
                pointer-events: auto;
            }

            .footer-bar {
                width: 100%;
                align-items: center;
                gap: 8px;
            }

            .footer-error {
                margin-left: auto;
                color: var(--pl-danger-color, #c84b31);
                font: var(--pl-caption-font, var(--pl-text-font));
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `;
    }

    constructor() {
        super();
        this._previewStyle = null;
        this._skipObserver = false;
        this._searchMarkerId = null;
        this._searchMarkerTimer = 0;
        this._searchMarkerStyleReady = false;
        this.wrap = true;
    }

    disconnectedCallback() {
        this._clearSearchMarker();
        this._removePreviewStyle();
        super.disconnectedCallback();
    }

    open() {
        this.$.drawer.opened = !this.$.drawer.opened;
    }

    findInCode() {
        this.$.codeeditor?.find();
    }

    replaceInCode() {
        this.$.codeeditor?.replace();
    }

    gotoLine() {
        this.$.codeeditor?.gotoLineDialog();
    }

    toggleWrap() {
        this.wrap = !this.wrap;
        if (this.$.codeeditor) this.$.codeeditor.wrap = this.wrap;
    }

    _wrapLabel(wrap) {
        return wrap ? 'Без переноса' : 'Перенос';
    }

    openForClassToken(classToken, form) {
        const token = String(classToken || '').trim();
        if (!token) return;
        this.openForSelector(`.${token}`, form);
    }

    openForSelector(selector, form) {
        if (form) this.form = form;
        this.$.drawer.opened = true;
        this._scrollToSelector(selector);
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

    _scrollToSelector(selectorInput) {
        const selector = String(selectorInput || '').trim();
        if (!selector) return;
        const text = String(this.stylesText || '');
        if (!text) return;

        const index = text.indexOf(selector);
        if (index < 0) return;
        const matchLength = selector.length;
        const before = text.slice(0, index);
        const row = before.split('\n').length;
        const col = index - (before.lastIndexOf('\n') + 1) + 1;

        const reveal = () => {
            const editor = this.$.codeeditor?.editor;
            if (!editor?.gotoLine) return false;
            editor.gotoLine(row, col, true);
            editor.scrollToLine(row, true, true, () => {});
            this._highlightFoundSelector(editor, row - 1, col - 1, matchLength);
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

    _highlightFoundSelector(editor, row, col, length) {
        if (!editor?.session) return;
        this._clearSearchMarker();
        this._ensureSearchMarkerStyle();

        const aceApi = globalThis.ace;
        const RangeCtor = aceApi?.require?.("ace/range")?.Range;
        if (typeof RangeCtor !== "function") return;

        const startCol = Math.max(0, Number(col) || 0);
        const endCol = Math.max(startCol + 1, startCol + (Number(length) || 1));
        const range = new RangeCtor(Math.max(0, Number(row) || 0), startCol, Math.max(0, Number(row) || 0), endCol);
        this._searchMarkerId = editor.session.addMarker(range, "nf-dev-editor-css-target-marker", "text", false);

        this._searchMarkerTimer = setTimeout(() => {
            this._clearSearchMarker(editor);
        }, 2000);
    }

    _clearSearchMarker(editorRef) {
        if (this._searchMarkerTimer) {
            clearTimeout(this._searchMarkerTimer);
            this._searchMarkerTimer = 0;
        }
        const editor = editorRef || this.$.codeeditor?.editor;
        if (!editor?.session) {
            this._searchMarkerId = null;
            return;
        }
        if (this._searchMarkerId !== null && this._searchMarkerId !== undefined) {
            try {
                editor.session.removeMarker(this._searchMarkerId);
            } catch (_err) {
                // ignore marker remove errors
            }
            this._searchMarkerId = null;
        }
    }

    _ensureSearchMarkerStyle() {
        if (this._searchMarkerStyleReady) return;
        const hostRoot = this.$.codeeditor?.shadowRoot;
        if (!hostRoot) return;
        if (hostRoot.querySelector("style[data-dev-editor-css-marker]")) {
            this._searchMarkerStyleReady = true;
            return;
        }
        const style = document.createElement("style");
        style.setAttribute("data-dev-editor-css-marker", "1");
        style.textContent = `
            .ace_marker-layer .nf-dev-editor-css-target-marker {
                position: absolute;
                background: rgba(33, 140, 130, 0.22);
                border-bottom: 2px solid var(--pl-primary-color);
                border-radius: 2px;
            }
        `;
        hostRoot.appendChild(style);
        this._searchMarkerStyleReady = true;
    }
}

customElements.define("pl-styles-editor", PlStylesEditor);
