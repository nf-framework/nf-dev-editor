import { PlElement, html } from "polylib";
import "@plcmp/pl-repeat";
import "@plcmp/pl-input";
import "@plcmp/pl-drawer";
import "@nfjs/front-pl/components/pl-codeeditor.js";

class PlScriptsEditor extends PlElement {
    static get properties() {
        return {
            fwt: { type: Object },
            form: { type: Object, observer: '_formObserver' },
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

    open() {
        this.$.drawer.opened = !this.$.drawer.opened;
    }

    _formObserver(val) {
        if (val) {
            this.script = this.fwt.getFunctions(this.form).map(x => x.text).join('\n');
            this.$.codeeditor.value = this.script;
        }
    }

    _scriptObserver(val) {
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