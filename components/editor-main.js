import { css, html, PlElement } from "polylib";
import { setAttrValue } from "polylib/common.js";
import { domSelector } from "../lib/domselector.js";
import * as polylibTools from "../lib/selectors/polylib-component.js";
import { getDesignedTpl, getFullTemplate, getStyles } from "../lib/selectors/polylib-component.js";
import {AddElementCommand, DelElementCommand, MoveElementCommand} from "../lib/commands.js";
import drndr from "../lib/drndr.js";
import "@plcmp/pl-flex-layout";
import "@plcmp/pl-button";
import "./component-list.js";
import "./tree-list.js";
import "./props-panel.js";
import "./scripts-editor.js";
import "./styles-editor.js";

import { buildXPathCandidates, findByXpath, findByXpathWithFallback, getXPath } from "../lib/common.js";
import {debounce} from "@plcmp/utils";

const PL_COMPONENT_MODULES = {
    "pl-action": "@plcmp/pl-action",
    "pl-badge": "@plcmp/pl-badge",
    "pl-button": "@plcmp/pl-button",
    "pl-checkbox": "@plcmp/pl-checkbox",
    "pl-combobox": "@plcmp/pl-combobox",
    "pl-data-observer": "@plcmp/pl-data-observer",
    "pl-data-tree": "@plcmp/pl-data-tree",
    "pl-dataset": "@plcmp/pl-dataset",
    "pl-datetime": "@plcmp/pl-datetime",
    "pl-dom-if": "@plcmp/pl-dom-if",
    "pl-drawer": "@plcmp/pl-drawer",
    "pl-dropdown": "@plcmp/pl-dropdown",
    "pl-flex-layout": "@plcmp/pl-flex-layout",
    "pl-grid": "@plcmp/pl-grid",
    "pl-grid-column": "@plcmp/pl-grid/pl-grid-column",
    "pl-icon": "@plcmp/pl-icon",
    "pl-icon-button": "@plcmp/pl-icon-button",
    "pl-input": "@plcmp/pl-input",
    "pl-input-mask": "@plcmp/pl-input-mask",
    "pl-labeled-container": "@plcmp/pl-labeled-container",
    "pl-popover": "@plcmp/pl-popover",
    "pl-radio-button": "@plcmp/pl-radio-button",
    "pl-radio-group": "@plcmp/pl-radio-group",
    "pl-repeat": "@plcmp/pl-repeat",
    "pl-tab": "@plcmp/pl-tabpanel",
    "pl-tabpanel": "@plcmp/pl-tabpanel",
    "pl-table": "@plcmp/pl-table",
    "pl-textarea": "@plcmp/pl-textarea",
    "pl-tooltip": "@plcmp/pl-tooltip",
    "pl-valid-observer": "@plcmp/pl-valid-observer",
    "pl-virtual-scroll": "@plcmp/pl-virtual-scroll"
};

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
            treeRoot: { type: Object },
            formClassName: { type: String, value: '' },
            selectedPath: { type: String },
            selectedSourcePath: { type: String, value: '' },
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
                background: var(--pl-background-color);
                border-right: 1px solid var(--pl-grey-light);
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

            .left-toolbar {
                position: sticky;
                top: 0;
                z-index: 3;
                padding: 8px;
                border-bottom: 1px solid var(--pl-grey-light);
                background: var(--pl-background-color);
            }

            .left-toolbar-title {
                font: var(--pl-header-font);
                color: var(--pl-header-color);
                margin-bottom: 8px;
            }

            .left-toolbar-actions {
                gap: 6px;
                flex-wrap: wrap;
            }

            .left-toolbar-actions pl-button {
                --pl-base-size: 28px;
            }

            pl-tree-list {
                flex: 1 1 auto;
                min-height: 0;
            }

            pl-component-list {
                flex: 0 0 280px;
                min-height: 180px;
                border-top: 1px solid var(--pl-grey-light);
            }
        `;

    static template = html`
        <div id="left-panel">
            <div class="left-toolbar">
                <div class="left-toolbar-title">Конструктор формы</div>
                <pl-flex-layout class="left-toolbar-actions">
                    <pl-button variant="ghost" on-click="[[select]]" label="Выбрать"></pl-button>
                    <pl-button variant="primary" on-click="[[save]]" label="Сохранить"></pl-button>
                    <pl-button variant="ghost" on-click="[[scripts]]" label="JS"></pl-button>
                    <pl-button variant="ghost" on-click="[[styles]]" label="CSS"></pl-button>
                    <pl-button variant="ghost" on-click="[[copySelectedPath]]" disabled$="[[!selectedPath]]" label="Путь"></pl-button>
                </pl-flex-layout>
            </div>
            <pl-tree-list inspect="[[treeRoot]]" root-label="[[formClassName]]" selected="[[selectedSourcePath]]" fwt="[[fwt]]" on-highlight="[[onHighlight]]"></pl-tree-list>
            <pl-component-list></pl-component-list>
        </div>
        <div id="right-panel">
            <pl-props-panel tpl-root="[[tplRoot]]" source-tpl-root="[[sourceTplRoot]]" dom-root="[[domRoot]]" selected="[[selectedPath]]" selected-source-path="[[selectedSourcePath]]" fwt="[[fwt]]" on-open-css-rule="[[onOpenCssRule]]"></pl-props-panel>
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
        this._notifyFormUpdate = debounce(() => {
            window.dispatchEvent(new CustomEvent('form-update', { detail: { source: 'command' } }));
        }, 100);
        this._ensurePlComponentsLoaded();
        window.addEventListener('select-component', e => this.onSelectComponent(e));
        window.addEventListener('command', e => this.onCommand(e));
        window.addEventListener('nf-dev-editor-open-css-rule', e => this.onOpenCssRule(e));
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
        const detail = e?.detail || {};
        const runtimePath = detail.runtimePath || detail.path || '';
        const templatePath = detail.templatePath || '';
        this.selectedPath = runtimePath;
        this.selectedSourcePath = this._resolveSourceSelectionPath(runtimePath, templatePath);
        if (this.selected) this.selected.draggable = false;
        const root = this.editForm?.root;
        let selectedNode = detail.target || null;
        if (root && selectedNode?.getRootNode?.() instanceof ShadowRoot && selectedNode.getRootNode() !== root) {
            selectedNode = selectedNode.getRootNode().host || selectedNode;
        }
        if (!(selectedNode instanceof Node) || (root && selectedNode !== root && !root.contains?.(selectedNode))) {
            selectedNode = root
                ? (findByXpath(root, this.selectedPath) || findByXpathWithFallback(root, this.selectedPath).node)
                : null;
        }
        try {
            console.log('[nf-dev-editor][editor-main][onSelectComponent]', {
                detailPath: detail.path || null,
                runtimePath: runtimePath || null,
                templatePath: templatePath || null,
                selectedSourcePath: this.selectedSourcePath || null,
                detailTarget: detail.target?.localName || detail.target?.nodeName || null,
                resolvedNode: selectedNode?.localName || selectedNode?.nodeName || null,
                resolvedByFallback: detail.target !== selectedNode
            });
        } catch (_err) {
            // ignore logging errors
        }
        this.selected = selectedNode;
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

    onOpenCssRule(event) {
        const selector = String(event?.detail?.selector || '').trim();
        if (!selector) return;
        this.$.stylesEditor.openForSelector(selector, this.editForm);
    }

    copySelectedPath() {
        if (!this.selectedPath) return;
        this._copyText(this.selectedPath);
    }

    onCommand(e) {
        let command = {
            ...e.detail,
            tplRoot: this.tplRoot,
            domRoot: this.domRoot,
            sourceTplRoot: this.sourceTplRoot
        };
        const sourceCommand = this._normalizeSourceCommand(command);
        if (sourceCommand) {
            this._sourceCommandLog.push(sourceCommand);
            this._applyCommandToSourceTemplate(sourceCommand);
        }

        let cmdResult = this.fwt.execCommand(command);
        let select = cmdResult?.select;
        if (select) {
            const runtimePath = select;
            this.selectedPath = null;
            this.selectedPath = runtimePath;
            this.selectedSourcePath = this._resolveSourceSelectionPath(runtimePath, '');
            this.selected = this.editForm?.root
                ? (findByXpath(this.editForm.root, this.selectedPath) || findByXpathWithFallback(this.editForm.root, this.selectedPath).node)
                : null;
        }
        //TODO: get form name and mark changed
        this.changes[command.form] = true;
        this._notifyFormUpdate();
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
                this.treeRoot = null;
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
            this.treeRoot = this.tplRoot;
            this.selectedSourcePath = '';
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
            this.treeRoot = null;
            this.selectedSourcePath = '';
            this._sourceTemplateHost = null;
            this._sourceCommandLog = [];
        }
        //TODO: remove hack
        domSelector.root = this.domRoot;
    }

    onHighlight(e) {
        let { path, position } = e.detail;
        let node = path && this.editForm?.root
            ? (findByXpath(this.editForm.root, path) || findByXpathWithFallback(this.editForm.root, path).node)
            : null;
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
            this.treeRoot = this.tplRoot || null;
            return;
        }
        const host = document.createElement('template');
        host.content.appendChild(node);
        this._sourceTemplateHost = host;
        this.sourceTplRoot = host;
        this.treeRoot = host;
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
            sourcePath: command.sourcePath,
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
        const findSourceNode = (path) => {
            const primaryPath = command.sourcePath || path;
            let node = findByXpath(root, primaryPath, true) || findByXpathWithFallback(root, primaryPath, true).node;
            if (!node && command.sourcePath && command.path && command.sourcePath !== command.path) {
                node = findByXpath(root, command.path, true) || findByXpathWithFallback(root, command.path, true).node;
            }
            return node;
        };
        try {
            if (command.command === 'change-property') {
                const target = findSourceNode(command.path);
                if (!target) return;
                setAttrValue(target, command.property, command.value);
                return;
            }

            if (command.command === 'change-attribute') {
                const target = findSourceNode(command.path);
                if (!target || !command.attribute) return;
                if (command.value === '' || command.value === null || command.value === undefined) {
                    target.removeAttribute(command.attribute);
                } else {
                    setAttrValue(target, command.attribute, command.value);
                }
                return;
            }

            if (command.command === 'change-text-node') {
                const target = findSourceNode(command.path);
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
                const target = findSourceNode(command.path);
                const node = this._createElementForTemplate(command.element);
                this._appendWithPosition(node, target, command.position);
                return;
            }

            if (command.command === 'move-element') {
                const node = findSourceNode(command.element);
                const target = findSourceNode(command.path);
                this._appendWithPosition(node, target, command.position);
                return;
            }

            if (command.command === 'del-element') {
                const target = findSourceNode(command.path);
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
            this.treeRoot = host;
            this._sourceCommandLog.forEach(cmd => this._applyCommandToSourceTemplate(cmd, host));
        } catch (err) {
            console.warn('[nf-dev-editor] unable to load backend source:', err);
        }
    }

    close() {
        this.opened = false;
    }

    _ensurePlComponentsLoaded() {
        const loader = globalThis?.customLoader;
        const modules = Object.entries(PL_COMPONENT_MODULES);
        const tasks = [];

        modules.forEach(([tagName, modulePath]) => {
            if (customElements.get(tagName)) return;

            if (typeof loader === 'function') {
                try {
                    const result = loader(tagName);
                    if (result?.then) {
                        tasks.push(result.catch(() => this._safeImportModule(modulePath)));
                        return;
                    }
                } catch (_err) {
                    // fallback to import below
                }
            }

            tasks.push(this._safeImportModule(modulePath));
        });

        if (tasks.length > 0) {
            Promise.allSettled(tasks).catch(() => {
                // ignore preload failures in editor bootstrap
            });
        }
    }

    _resolveSourceSelectionPath(runtimePath, templatePath) {
        const sourceRoot = this.sourceTplRoot;
        const fallback = runtimePath || templatePath || '';
        if (!sourceRoot || !fallback) return fallback;

        const resolveExactPath = (path) => {
            const candidates = buildXPathCandidates(path);
            for (const candidate of candidates) {
                const node = findByXpath(sourceRoot, candidate, true);
                if (node) return { node, path: candidate };
            }
            return { node: null, path: null };
        };
        const resolvePath = (path) => findByXpathWithFallback(sourceRoot, path, true);
        const normalize = (segment) => String(segment || '')
            .replace(/\[\d+]/g, '')
            .replace(/\{\d+}/g, '')
            .toLowerCase();
        const split = (path) => String(path || '').split('/').filter(Boolean);

        const runtimeSegs = split(runtimePath);
        const tplSegs = split(templatePath);

        if (runtimeSegs.length && tplSegs.length && runtimeSegs.length >= tplSegs.length) {
            const runtimeTail = runtimeSegs.slice(runtimeSegs.length - tplSegs.length).map(normalize);
            const tplTail = tplSegs.map(normalize);
            const sameTail = runtimeTail.length === tplTail.length
                && runtimeTail.every((seg, idx) => seg === tplTail[idx]);
            if (sameTail) {
                const start = runtimeSegs.length - tplSegs.length;
                for (let cut = start; cut >= 0; cut--) {
                    const prefix = runtimeSegs.slice(0, cut);
                    const candidate = '/' + [...prefix, 'template', ...tplSegs].join('/');
                    const resolved = resolveExactPath(candidate);
                    try {
                        console.log('[nf-dev-editor][editor-main][resolveSourceSelectionPath]', {
                            runtimePath,
                            templatePath,
                            candidate,
                            resolvedPath: resolved?.path || null,
                            resolvedNode: resolved?.node?.localName || resolved?.node?.nodeName || null
                        });
                    } catch (_err) {
                        // ignore logging errors
                    }
                    if (resolved.node && resolved.path) return resolved.path;
                }
            }
        }

        const direct = resolveExactPath(runtimePath);
        try {
            console.log('[nf-dev-editor][editor-main][resolveSourceSelectionPath][direct]', {
                runtimePath,
                templatePath,
                resolvedPath: direct?.path || null,
                resolvedNode: direct?.node?.localName || direct?.node?.nodeName || null
            });
        } catch (_err) {
            // ignore logging errors
        }
        if (direct.node && direct.path) return direct.path;

        const fallbackResolved = resolvePath(runtimePath);
        if (fallbackResolved?.node && fallbackResolved?.path) return fallbackResolved.path;

        return fallback;
    }

    _safeImportModule(modulePath) {
        if (!modulePath) return Promise.resolve();
        return import(modulePath).catch(() => {
            // ignore missing module and continue
        });
    }

    _copyText(text) {
        const value = String(text || '');
        if (!value) return;
        const clipboard = globalThis?.navigator?.clipboard;
        if (clipboard?.writeText) {
            clipboard.writeText(value).catch(() => this._legacyCopy(value));
            return;
        }
        this._legacyCopy(value);
    }

    _legacyCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
        } catch (_err) {
            // ignore
        }
        ta.remove();
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
