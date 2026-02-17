import { PlElement, html } from "polylib";
import "@plcmp/pl-icon-button";
import "@plcmp/pl-drawer";
import "@nfjs/front-pl/components/pl-codeeditor.js";

class PlScriptsEditor extends PlElement {
    static get properties() {
        return {
            fwt: { type: Object },
            form: { type: Object, observer: '_formObserver' },
            sourceScript: { type: String, observer: '_sourceScriptObserver' },
            script: { type: String, observer: '_scriptObserver' },
            delta: { type: Array, value: () => ([]) },
            errorMessage: { type: String }
        }
    }

    static get template() {
        return html`
             <pl-drawer header="Scripts" contained size="medium" id="drawer" position="right">
                <pl-codeeditor id="codeeditor" value="{{script}}"></pl-codeeditor>
                <pl-flex-layout slot="footer">
                    [[errorMessage]]
                </pl-flex-layout>
            </pl-drawer>
        `;
    }

    constructor() {
        super();
        this._syncingScript = false;
    }

    open() {
        this.$.drawer.opened = !this.$.drawer.opened;
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

            const newClass = new Function('class newClass {' + val + '}; return new newClass')();
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
}

customElements.define('pl-scripts-editor', PlScriptsEditor);
