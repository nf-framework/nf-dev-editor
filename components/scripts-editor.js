import { PlElement, html, css } from "polylib";
import "@plcmp/pl-button";
import "@plcmp/pl-icon-button";
import "@plcmp/pl-iconset-default";
import "@plcmp/pl-drawer";
import "@nfjs/front-pl/components/pl-codeeditor.js";

class PlScriptsEditor extends PlElement {
    static get properties() {
        return {
            fwt: { type: Object },
            form: { type: Object, observer: '_formObserver' },
            sourceScript: { type: String, observer: '_sourceScriptObserver' },
            sourceScriptContext: { type: String, value: '' },
            script: { type: String, observer: '_scriptObserver' },
            delta: { type: Array, value: () => ([]) },
            errorMessage: { type: String },
            useWorker: { type: Boolean, value: false }
        }
    }

    static get template() {
        return html`
             <pl-drawer header="Scripts" contained size="medium" id="drawer" position="right">
                <pl-codeeditor
                    id="codeeditor"
                    value="{{script}}"
                    mode="ace/mode/javascript"
                    theme="ace/theme/textmate"
                    wrap
                    use-worker="[[useWorker]]"
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
        this._syncingScript = false;
        this._searchMarkerId = null;
        this._searchMarkerTimer = 0;
        this._searchMarkerStyleReady = false;
        this.wrap = true;
    }

    disconnectedCallback() {
        this._clearSearchMarker();
        super.disconnectedCallback?.();
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

    openForMethod(methodName, form) {
        const method = String(methodName || '').trim();
        if (!method) return;
        if (form) this.form = form;
        this.$.drawer.opened = true;
        this._scrollToMethod(method);
    }

    _setScriptValue(value) {
        this._syncingScript = true;
        this.script = value || '';
        if (this.$.codeeditor) this.$.codeeditor.value = this.script;
        this._syncingScript = false;
    }

    _formObserver(val) {
        if (val) {
            const source = this.sourceScript || this.fwt.getFunctions(this.form).map(x => x.text).join('\n');
            this._setScriptValue(source);
            this.delta = [];
        }
    }

    _sourceScriptObserver(val) {
        if (this.form && typeof val === 'string') {
            this._setScriptValue(val);
            this.delta = [];
        }
    }

    _scriptObserver(val) {
        if (this._syncingScript || !this.form) return;
        try {
            this.errorMessage = '';

            const context = String(this.sourceScriptContext || '').trim();
            const source = `${context ? `${context}\n\n` : ''}class newClass {${val}\n}; return new newClass`;
            const newClass = new Function(source)();
            const newClassMethods = Object.getOwnPropertyNames(newClass.constructor.prototype).filter(x => x != 'constructor');
            const originalMethods = Object.getOwnPropertyNames(this.form.constructor.prototype).filter(x => x != 'constructor');
            const differences = originalMethods.filter(x => !newClassMethods.includes(x));
            differences.forEach(key => {
                this.delta.push({ name: key, action: 'delete' });
                delete this.form.constructor.prototype[key];
                this.form.notifyChange({ path: key });
            });

            newClassMethods.forEach((key, idx) => {
                if (!this.form.constructor.prototype[key]) {
                    const added = this.delta.find(x => x.name === key && x.action === 'add');
                    let position = 'none';
                    let nearestFuncName = newClassMethods[idx - 1];;
                    if (nearestFuncName) {
                        position = 'after';
                    }
                    if (!nearestFuncName) {
                        nearestFuncName = newClassMethods[idx + 1];
                        if (nearestFuncName) {
                            position = 'before';
                        }
                    }
                    if (added) {
                        added.position = position;
                        added.nearestFunc = nearestFuncName;
                        added.newFunc = newClass.constructor.prototype[key].toString();
                    } else {
                        this.delta.push({ name: key, action: 'add', oldFunc: nearestFuncName, position: position, newFunc: newClass.constructor.prototype[key].toString() });
                    }
                }
                if ((this.form.constructor.prototype[key]?.toString() != newClass.constructor.prototype[key].toString())) {
                    const updated = this.delta.find(x => x.name === key && x.action === 'update');
                    if (updated) {
                        updated.newFunc = newClass.constructor.prototype[key].toString();
                    } else {
                        this.delta.push({ name: key, action: 'update', newFunc: newClass.constructor.prototype[key].toString() });
                    }
                }

                this.form.constructor.prototype[key] = newClass.constructor.prototype[key];
                this.form.notifyChange({ path: key });
            });
        }
        catch (err) {
            this.errorMessage = err;
        }
    }

    _scrollToMethod(methodNameInput) {
        const methodName = String(methodNameInput || '').trim();
        if (!methodName) return;
        const text = String(this.script || this.sourceScript || '');
        if (!text) return;

        const escaped = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
            new RegExp(`(?:^|\\n)\\s*(?:async\\s+)?${escaped}\\s*\\(`, 'm'),
            new RegExp(`(?:^|\\n)\\s*${escaped}\\s*:\\s*(?:async\\s*)?function\\s*\\(`, 'm'),
            new RegExp(`(?:^|\\n)\\s*${escaped}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>`, 'm')
        ];

        let matchIndex = -1;
        for (const pattern of patterns) {
            const match = pattern.exec(text);
            if (match?.index >= 0) {
                matchIndex = match.index + match[0].lastIndexOf(methodName);
                break;
            }
        }
        if (matchIndex < 0) return;

        const before = text.slice(0, matchIndex);
        const row = before.split('\n').length;
        const col = matchIndex - (before.lastIndexOf('\n') + 1) + 1;

        const reveal = () => {
            const editor = this.$.codeeditor?.editor;
            if (!editor?.gotoLine) return false;
            editor.gotoLine(row, col, true);
            editor.scrollToLine(row, true, true, () => {});
            this._highlightFoundMethod(editor, row - 1, col - 1, methodName.length);
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

    _highlightFoundMethod(editor, row, col, length) {
        if (!editor?.session) return;
        this._clearSearchMarker();
        this._ensureSearchMarkerStyle();

        const aceApi = globalThis.ace;
        const RangeCtor = aceApi?.require?.("ace/range")?.Range;
        if (typeof RangeCtor !== "function") return;

        const startCol = Math.max(0, Number(col) || 0);
        const endCol = Math.max(startCol + 1, startCol + (Number(length) || 1));
        const range = new RangeCtor(Math.max(0, Number(row) || 0), startCol, Math.max(0, Number(row) || 0), endCol);
        this._searchMarkerId = editor.session.addMarker(range, "nf-dev-editor-js-target-marker", "text", false);

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
        if (hostRoot.querySelector("style[data-dev-editor-js-marker]")) {
            this._searchMarkerStyleReady = true;
            return;
        }
        const style = document.createElement("style");
        style.setAttribute("data-dev-editor-js-marker", "1");
        style.textContent = `
            .ace_marker-layer .nf-dev-editor-js-target-marker {
                position: absolute;
                background: rgba(33, 140, 130, 0.18);
                border-bottom: 2px solid var(--pl-primary-color);
                border-radius: 2px;
            }
        `;
        hostRoot.appendChild(style);
        this._searchMarkerStyleReady = true;
    }
}

customElements.define('pl-scripts-editor', PlScriptsEditor);
