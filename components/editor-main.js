import { css, html, PlElement } from "polylib";
import { setAttrValue } from "polylib/common.js";
import { domSelector } from "../lib/domselector.js";
import * as polylibTools from "../lib/selectors/polylib-component.js";
import { getDesignedTpl, getFullTemplate, getStyles } from "../lib/selectors/polylib-component.js";
import {AddElementCommand, DelElementCommand, MoveElementCommand} from "../lib/commands.js";
import drndr from "../lib/drndr.js";
import "./component-list.js";
import "./tree-list.js";
import "./props-panel.js";
import "./scripts-editor.js";
import "./styles-editor.js";

import { findByXpath, getXPath } from "../lib/common.js";
import {debounce} from "@plcmp/utils";

class EditorMain extends PlElement {
    static properties = {
            opened: { type: Boolean },
            editForm: { type: Object },
            tree: { type: Array, value: () => [] },
            props: { type: Array, value: () => [] },
            selected: { type: Object, observer: '_selectedChanged' },
            domRoot: { type: Object },
            tplRoot: { type: Object },
            sourceTplRoot: { type: Object },
            formClassName: { type: String, value: '' },
            selectedPath: { type: String },
            scriptsDelta: { type: Array, value: () => ([]) },
            stylesText: { type: String, value: '' },
            sourceScripts: { type: String, value: '' },
            baseSignature: { type: String, value: '' }
    }

    static css = css`
            :host {
                top: 0;
                left: 0;
                box-sizing: border-box;
            }
            #left-panel {
                position: absolute;
                left: 0;
                top: 0;
                height: 100%;
                width: var(--editor-left-width);
                box-sizing: border-box;
                overflow: auto;
                display: flex;
                flex-direction: column;            
            }

            #right-panel {
                position: absolute;
                right: 0;
                top: 0;
                height: 100%;
                width: var(--editor-right-width);
                box-sizing: border-box;
                overflow: auto;
                padding: 8px;
                border-left: 1px solid var(--pl-grey-light);
                background: var(--white);         
            }
        `;

    static template = html`
        <div id="left-panel">
            <pl-flex-layout>
                <pl-button on-click="[[select]]" label="select"></pl-button>
                <pl-button on-click="[[save]]" label="save"></pl-button>
                <pl-button on-click="[[scripts]]" label="scripts"></pl-button>
                <pl-button on-click="[[styles]]" label="styles"></pl-button>
            </pl-flex-layout>
            <pl-tree-list inspect="[[tplRoot]]" root-label="[[formClassName]]" selected="[[selectedPath]]" fwt="[[fwt]]" on-highlight="[[onHighlight]]"></pl-tree-list>
            <pl-component-list></pl-component-list>
        </div>
        <div id="right-panel">
            <pl-props-panel tpl-root="[[tplRoot]]" source-tpl-root="[[sourceTplRoot]]" dom-root="[[domRoot]]" selected="[[selectedPath]]" fwt="[[fwt]]"></pl-props-panel>
        </div>
        <pl-scripts-editor delta="{{scriptsDelta}}" source-script="[[sourceScripts]]" fwt="[[fwt]]" form="[[editForm]]" id="scriptsEditor"></pl-scripts-editor>
        <pl-styles-editor styles-text="{{stylesText}}" fwt="[[fwt]]" form="[[editForm]]" id="stylesEditor"></pl-styles-editor>
    `;

    constructor() {
        super();
        this.domScope = document.querySelector('pl-app');
        this.fwt = polylibTools;
        this.changes = {};
        this._sourceTemplateHost = null;
        this._sourceRequestId = 0;
        this._sourceCommandLog = [];
        window.addEventListener('select-component', e => this.onSelectComponent(e));
        window.addEventListener('command', e => this.onCommand(e));
        window.addEventListener('form-update', e => this.onFormUpdate(e));
        window.addEventListener('form-change', e => this.onCurrentFormChange(e));
        let onResize = debounce( ()=>domSelector.drawSelector(this.selected), 100 );
        addEventListener('resize', onResize);
        drndr.listen(this, 'dev/element', this.drawReceiver, this.hideReceiver, this.drop, this.domScope)

        document.body.classList.add('editor-opened')
        window.plCurrentForm && this.onCurrentFormChange({ detail: window.plCurrentForm })
        shortcut.listen(['ControlLeft+KeyS'], this.save.bind(this));
        shortcut.listen(['MetaLeft+KeyS'], this.save.bind(this));
        shortcut.listen(['^AltLeft'], this.select.bind(this));
        shortcut.listen(['Delete'], this.delete.bind(this));
        shortcut.listen(['MetaLeft+Backspace'], this.delete.bind(this));

        this.domScope.ondragstart = e => {
            let cp = e.composedPath();
            let el = cp[0];
            //TODO: create image for drug preview
            let img = document.createElement('img');
            e.dataTransfer.setDragImage(img,0,0)
            e.dataTransfer.dropEffect = 'move';
            e.dataTransfer.setData('dev/move', getXPath(el));
        }
    }

    select() {
        if (!this.editForm?.root) return;
        let root = this.editForm.root;
        return domSelector.select({ type: 'polylib-component', root });
    }
    _selectedChanged() {
        if (this.selected) {
            domSelector.drawSelector(this._getDrawTarget(this.selected));
        } else {
            domSelector.hideSelector();
        }
    }
    onSelectComponent(e) {
        this.selectedPath = e.detail.path;
        if (this.selected) this.selected.draggable = false;
        const root = this.editForm?.root;
        this.selected = root ? findByXpath(root, this.selectedPath) : null;
        if(this.selected) {
            this.selected.draggable = true;
        }
    }

    scripts() {
        this.$.scriptsEditor.open(this.editForm);
    }

    styles() {
        this.$.stylesEditor.open(this.editForm);
    }

    onCommand(e) {
        let command = {
            ...e.detail,
            tplRoot: this.tplRoot,
            domRoot: this.domRoot
        };
        const sourceCommand = this._normalizeSourceCommand(command);
        if (sourceCommand) {
            this._sourceCommandLog.push(sourceCommand);
            this._applyCommandToSourceTemplate(sourceCommand);
        }

        let cmdResult = this.fwt.execCommand(command);
        let select = cmdResult?.select;
        if (select) {
            this.selectedPath = null;
            this.selectedPath = select;
            this.selected = this.editForm?.root ? findByXpath(this.editForm.root, this.selectedPath) : null;
        }
        //TODO: get form name and mark changed
        this.changes[command.form] = true;
        domSelector.drawSelector(this._getDrawTarget(this.selected));
    }

    onFormUpdate(e) {
        // dispatchEvent(new CustomEvent('form-change', { detail: e.detail }));
    }

    onCurrentFormChange(e) {
        let current = e.detail;
        if (current) {
            let form = this.fwt.findRootElement(current.form);
            if (!form?.root) {
                this.editForm = null;
                this.tplRoot = null;
                this.domRoot = null;
                this.formClassName = '';
                this.stylesText = '';
                this.sourceScripts = '';
                this.baseSignature = '';
                this.sourceTplRoot = null;
                this._sourceTemplateHost = null;
                domSelector.root = null;
                return;
            }
            this.editForm = form;
            this.tplRoot = getDesignedTpl(form);
            this.domRoot = form.root;
            this.formClassName = form.constructor?.name || form.localName;
            this.stylesText = getStyles(form);
            this.sourceScripts = this.fwt.getFunctions(form).map(x => x.text).join('\n');
            this.baseSignature = '';
            this.sourceTplRoot = null;
            this._sourceCommandLog = [];
            this._setSourceTemplate(this.tplRoot?.cloneNode(true));
            this._loadBackendSource(form);
        } else {
            this.editForm = null;
            this.tplRoot = null;
            this.domRoot = null;
            this.formClassName = '';
            this.stylesText = '';
            this.sourceScripts = '';
            this.baseSignature = '';
            this.sourceTplRoot = null;
            this._sourceTemplateHost = null;
            this._sourceCommandLog = [];
        }
        //TODO: remove hack
        domSelector.root = this.domRoot;
    }

    onHighlight(e) {
        let { path, position } = e.detail;
        let node = path && this.editForm?.root ? findByXpath(this.editForm.root, path) : null;
        if (node) {
            domSelector.drawSelector(this._getDrawTarget(node), { position });
        } else {
            domSelector.hideSelector();
        }
    }

    _getDrawTarget(node) {
        if (!node) return node;
        if (typeof this.fwt?.resolveHighlightTarget === 'function') {
            return this.fwt.resolveHighlightTarget(node);
        }
        return node;
    }

    drawReceiver(e) {
        let node = domSelector.findEditableNode(e.composedPath(), this.checkCanDrop);
        let position = e.ctrlKey ? 'after' : (e.shiftKey ? 'before' : 'in');
        if (node) {
            domSelector.drawSelector(node, { position });
            return true;
        }
    }


    checkCanDrop(node) {
        return true
    }


    hideReceiver() {
        domSelector.hideSelector();
    }

    drop(e) {
        const paths = e.composedPath();
        let node = domSelector.findEditableNode(paths);
        let path = getXPath(node);
        let move = e.dataTransfer.getData('dev/move');
        let element = e.dataTransfer.getData('dev/element');
        let cmd = {
            position: e.ctrlKey ? 'after' : (e.shiftKey ? 'before' : 'in'),
            path,
            element
        }
        if (move) {
            cmd.element = move;
            dispatchEvent(new CustomEvent('command', { detail: new MoveElementCommand(cmd) }));
        } else {
            dispatchEvent(new CustomEvent('command', { detail: new AddElementCommand(cmd) }));
        }
        e.preventDefault();
    }
    delete() {
        if (this.selected) {
            let cmd = {
                path: this.selectedPath
            }
            dispatchEvent(new CustomEvent('command', { detail: new DelElementCommand(cmd) }));
        }
    }
    async save() {
        if (!this.editForm) {
            throw new Error('No active form to save');
        }
        let name = this.editForm.localName.replace(/^pl-form-/, '');
        let tplText = this._getSaveTemplateText();
        let body = JSON.stringify({
            tpl: tplText,
            scriptsDelta: this.scriptsDelta,
            styles: this.stylesText,
            baseSignature: this.baseSignature
        });
        let res = await fetch(`/@editor/save-form/${name}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body
        });
        if (!res.ok) {
            let errText = await res.text();
            let message = errText;
            try {
                const errJson = JSON.parse(errText);
                message = errJson?.message || errText;
            } catch (_e) {
                // keep raw text
            }
            throw 'Error save: ' + message;
        }
        if (res.ok) {
            try {
                const data = await res.json();
                if (data?.signature) this.baseSignature = data.signature;
            } catch (_e) {
                // ignore non-json fallback
            }
            this.set('scriptsDelta', []);
        }
    }

    _setSourceTemplate(node) {
        if (!node) {
            this._sourceTemplateHost = null;
            this.sourceTplRoot = null;
            return;
        }
        const host = document.createElement('template');
        host.content.appendChild(node);
        this._sourceTemplateHost = host;
        this.sourceTplRoot = host;
    }

    _getSaveTemplateText() {
        if (this._sourceTemplateHost?.innerHTML?.trim()) {
            return this._sourceTemplateHost.innerHTML.replace(/(\w+)=""/gms, '$1');
        }
        let template = document.createElement('div');
        const fullTemplate = getFullTemplate(this.editForm?._ti?.tpl);
        if (fullTemplate) {
            template.appendChild(fullTemplate);
            return template.innerHTML.replace(/(\w+)=""/gms, '$1');
        }
        if (this.tplRoot) {
            template.appendChild(this.tplRoot.cloneNode(true));
            return template.innerHTML.replace(/(\w+)=""/gms, '$1');
        }
        throw new Error('Unable to build save template');
    }

    _createElementForTemplate(name) {
        const tpl = document.createElement('template');
        tpl.insertAdjacentHTML('afterbegin', `<${name}></${name}>`);
        return tpl.content.firstElementChild || tpl.firstElementChild;
    }

    _appendWithPosition(node, target, position) {
        if (!node || !target || node === target) return;
        if (position === 'in') {
            const inTarget = target instanceof HTMLTemplateElement ? target.content : target;
            inTarget.appendChild(node);
        } else if (position === 'before') {
            target.parentNode?.insertBefore(node, target);
        } else if (position === 'after') {
            target.parentNode?.insertBefore(node, target.nextSibling);
        }
    }

    _normalizeSourceCommand(command) {
        if (command?.type !== 'dom') return null;
        return {
            type: 'dom',
            command: command.command,
            path: command.path,
            position: command.position,
            element: command.element,
            property: command.property,
            value: command.value,
            attribute: command.attribute,
            textPath: Array.isArray(command.textPath) ? [...command.textPath] : undefined
        };
    }

    _applyCommandToSourceTemplate(command, host = this._sourceTemplateHost) {
        if (!host?.content || command?.type !== 'dom') return;

        const root = host.content;
        try {
            if (command.command === 'change-property') {
                const target = findByXpath(root, command.path, true);
                if (!target) return;
                setAttrValue(target, command.property, command.value);
                return;
            }

            if (command.command === 'change-attribute') {
                const target = findByXpath(root, command.path, true);
                if (!target || !command.attribute) return;
                if (command.value === '' || command.value === null || command.value === undefined) {
                    target.removeAttribute(command.attribute);
                } else {
                    setAttrValue(target, command.attribute, command.value);
                }
                return;
            }

            if (command.command === 'change-text-node') {
                const target = findByXpath(root, command.path, true);
                if (!target) return;
                let node = target;
                for (const idx of (command.textPath || [])) {
                    node = node?.childNodes?.[idx];
                    if (!node) return;
                }
                node.textContent = String(command.value ?? '');
                return;
            }

            if (command.command === 'add-element') {
                const target = findByXpath(root, command.path, true);
                const node = this._createElementForTemplate(command.element);
                this._appendWithPosition(node, target, command.position);
                return;
            }

            if (command.command === 'move-element') {
                const node = findByXpath(root, command.element, true);
                const target = findByXpath(root, command.path, true);
                this._appendWithPosition(node, target, command.position);
                return;
            }

            if (command.command === 'del-element') {
                const target = findByXpath(root, command.path, true);
                target?.remove?.();
            }
        } catch (err) {
            console.warn('[nf-dev-editor] unable to mirror command to source template:', err);
        }
    }

    async _loadBackendSource(form) {
        const formName = form?.localName?.replace(/^pl-form-/, '');
        if (!formName) return;

        const requestId = ++this._sourceRequestId;
        try {
            const res = await fetch(`/@editor/form-source/${formName}`);
            if (!res.ok) {
                throw new Error(await res.text());
            }
            const data = await res.json();
            if (requestId !== this._sourceRequestId) return;

            this.baseSignature = data?.signature || '';
            if (typeof data?.styles === 'string') {
                this.stylesText = data.styles;
            }
            if (typeof data?.scripts === 'string' && (!Array.isArray(this.scriptsDelta) || this.scriptsDelta.length === 0)) {
                this.sourceScripts = data.scripts;
            }

            const host = document.createElement('template');
            host.innerHTML = data?.template || '';
            this._sourceTemplateHost = host;
            this.sourceTplRoot = host;
            this._sourceCommandLog.forEach(cmd => this._applyCommandToSourceTemplate(cmd, host));
        } catch (err) {
            console.warn('[nf-dev-editor] unable to load backend source:', err);
        }
    }

    close() {
        this.opened = false;
    }

}

document.head.insertAdjacentHTML("beforeend",
    `<!--suppress CssUnresolvedCustomProperty -->
        <style component="editor">
            body {
                --editor-right-width: 300px;
                --editor-left-width: 300px;
            }
            body.editor-opened {                        
                padding-right: var(--editor-right-width);
                padding-left: var(--editor-left-width);
                box-sizing: border-box;
            }
        </style>
    `);
customElements.define('pl-editor-main', EditorMain);
