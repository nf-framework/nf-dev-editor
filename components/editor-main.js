import { css, html, PlElement } from "polylib";
import { domSelector } from "../lib/domselector";
import * as polylibTools from "../lib/selectors/polylib-component"
import { getDesignedTpl, getFullTemplate } from "../lib/selectors/polylib-component"
import {AddElementCommand, DelElementCommand, MoveElementCommand} from "../lib/commands";
import drndr from "../lib/drndr.js";
import "./component-list";
import "./tree-list";
import "./props-panel";
import "./scripts-editor";

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
            selectedPath: { type: String },
            scriptsDelta: { type: Array, value: () => ([]) }
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
                border-left: 1px solid var(--grey-light);
                background: var(--white);         
            }
        `;

    static template = html`
        <div id="left-panel">
            <pl-flex-layout>
                <pl-button on-click="[[select]]" label="select"></pl-button>
                <pl-button on-click="[[save]]" label="save"></pl-button>
                <pl-button on-click="[[scripts]]" label="scripts"></pl-button>
            </pl-flex-layout>
            <pl-tree-list inspect="[[tplRoot]]" selected="[[selectedPath]]" fwt="[[fwt]]" on-highlight="[[onHighlight]]"></pl-tree-list>
            <pl-component-list></pl-component-list>
        </div>
        <div id="right-panel">
            <pl-props-panel tpl-root="[[tplRoot]]" dom-root="[[domRoot]]" selected="[[selectedPath]]" selected="[[selectedPath]]" fwt="[[fwt]]"></pl-props-panel>
        </div>
        <pl-scripts-editor delta="{{scriptsDelta}}" fwt="[[fwt]]" form="[[editForm]]" id="scriptsEditor"></pl-scripts-editor>
    `;

    constructor() {
        super();
        this.domScope = document.querySelector('pl-app');
        this.fwt = polylibTools;
        this.changes = {};
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
        let root = this.editForm.root;
        return domSelector.select({ type: 'polylib-component', root });
    }
    _selectedChanged() {
        if (this.selected)
            domSelector.drawSelector(this.selected);
        else
            domSelector.hideSelector();
    }
    onSelectComponent(e) {
        this.selectedPath = e.detail.path;
        if (this.selected) this.selected.draggable = false;
        this.selected = findByXpath(this.editForm.root, this.selectedPath);
        if(this.selected) {
            this.selected.draggable = true;
        }
    }

    scripts() {
        this.$.scriptsEditor.open(this.editForm);
    }

    onCommand(e) {
        let command = {
            ...e.detail,
            tplRoot: this.tplRoot,
            domRoot: this.domRoot
        };

        let cmdResult = this.fwt.execCommand(command);
        let select = cmdResult?.select;
        if (select) {
            this.selectedPath = null;
            this.selectedPath = select;
            this.selected = findByXpath(this.editForm.root, this.selectedPath);
        }
        //TODO: get form name and mark changed
        this.changes[command.form] = true;
        domSelector.drawSelector(this.selected);
    }

    onFormUpdate(e) {
        // dispatchEvent(new CustomEvent('form-change', { detail: e.detail }));
    }

    onCurrentFormChange(e) {
        let current = e.detail;
        if (current) {
            let form = this.fwt.findRootElement(current.form);
            this.editForm = form;
            this.tplRoot = getDesignedTpl(form);
            this.domRoot = form.root;
        } else {
            this.editForm = null;
            this.tplRoot = null;
            this.domRoot = null;
        }
        //TODO: remove hack
        domSelector.root = this.domRoot;
    }

    onHighlight(e) {
        let { path, position } = e.detail;
        let node = path && findByXpath(this.editForm.root, path);
        if (node) {
            domSelector.drawSelector(node, { position });
        } else {
            domSelector.hideSelector();
        }
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
        let name = this.editForm.localName.replace(/^pl-form-/, '');
        let template = document.createElement('div');
        template.appendChild(getFullTemplate(this.editForm._ti.tpl));
        let tplText = template.innerHTML.replace(/(\w+)=""/gms, '$1');
        let body = JSON.stringify({ tpl: tplText, scriptsDelta: this.scriptsDelta });
        let res = await fetch(`/@editor/save-form/${name}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body
        });
        if (!res.ok) {
            throw 'Error save: ' + await res.text();
        }
        if (res.ok) {
            this.set('scriptsDelta', []);
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