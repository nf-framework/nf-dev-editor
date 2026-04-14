import { css, html, PlElement, Template, TemplateInstance } from "polylib";
import { setAttrValue } from "polylib/common.js";
import { domSelector } from "../lib/domselector.js";
import * as polylibTools from "../lib/selectors/polylib-component.js";
import { getDesignedTpl, getFullTemplate, getStyles } from "../lib/selectors/polylib-component.js";
import {AddElementCommand, DelElementCommand, DuplicateElementCommand, MoveElementCommand, WrapElementCommand} from "../lib/commands.js";
import drndr from "../lib/drndr.js";
import "@plcmp/pl-flex-layout";
import "@plcmp/pl-button";
import "@plcmp/pl-icon-button";
import "@plcmp/pl-iconset-default";
import "/@editor/components/editor-iconset.js";
import "./component-list.js";
import "./tree-list.js";
import "./props-panel.js";
import "./scripts-editor.js";
import "./styles-editor.js";
import "./form-properties-editor.js?v=2";

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

const VOID_HTML_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

class EditorMain extends PlElement {
    static properties = {
            opened: { type: Boolean },
            editForm: { type: Object },
            selected: { type: Object, observer: '_selectedChanged' },
            domRoot: { type: Object },
            tplRoot: { type: Object },
            sourceTplRoot: { type: Object },
            treeRoot: { type: Object },
            formClassName: { type: String, value: '' },
            selectedPath: { type: String, observer: '_syncSelectionBreadcrumbs' },
            selectedSourcePath: { type: String, value: '', observer: '_syncSelectionBreadcrumbs' },
            scriptsDelta: { type: Array, value: () => ([]) },
            stylesText: { type: String, value: '' },
            propertiesText: { type: String, value: '{\n}' },
            sourceScripts: { type: String, value: '' },
            baseSignature: { type: String, value: '' },
            selectionBreadcrumbs: { type: Array, value: () => [] },
            hasParentForm: { type: Boolean, value: false },
            leftCollapsed: { type: Boolean, value: false, observer: '_syncEditorLayout' },
            rightCollapsed: { type: Boolean, value: false, observer: '_syncEditorLayout' },
            canUndo: { type: Boolean, value: false },
            canRedo: { type: Boolean, value: false }
    }

    static css = css`
            :host {
                position: fixed;
                inset: 0;
                z-index: 9999;
                top: 0;
                left: 0;
                box-sizing: border-box;
                pointer-events: none;
            }

            #top-toolbar,
            #left-panel,
            #right-panel {
                pointer-events: auto;
            }

            #top-toolbar {
                position: absolute;
                top: 0;
                left: var(--editor-left-width-current, var(--editor-left-width));
                right: var(--editor-right-width-current, var(--editor-right-width));
                height: var(--editor-toolbar-height);
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 12px;
                box-sizing: border-box;
                border-bottom: 1px solid var(--pl-grey-light);
                background: var(--pl-background-color);
                transition: left 140ms ease, right 140ms ease;
            }

            .top-toolbar-title {
                font: var(--pl-header-font);
                color: var(--pl-header-color);
                white-space: nowrap;
            }

            .top-toolbar-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 0;
                flex-wrap: wrap;
            }

            .top-toolbar-actions pl-button {
                --pl-base-size: 28px;
            }

            .top-toolbar-spacer {
                flex: 1 1 auto;
            }

            #left-panel {
                position: absolute;
                left: 0;
                top: var(--editor-toolbar-height);
                height: calc(100% - var(--editor-toolbar-height));
                width: var(--editor-left-width-current, var(--editor-left-width));
                box-sizing: border-box;
                overflow: auto;
                display: flex;
                flex-direction: column;
                background: var(--pl-background-color);
                border-right: 1px solid var(--pl-grey-light);
                transition: width 140ms ease, border-color 140ms ease;
            }

            #right-panel {
                position: absolute;
                right: 0;
                top: var(--editor-toolbar-height);
                height: calc(100% - var(--editor-toolbar-height));
                width: var(--editor-right-width-current, var(--editor-right-width));
                box-sizing: border-box;
                overflow: auto;
                padding: 8px;
                border-left: 1px solid var(--pl-grey-light);
                background: var(--white);
                transition: width 140ms ease, padding 140ms ease, border-color 140ms ease;
            }

            .panel-body {
                display: flex;
                flex-direction: column;
                min-width: 0;
                min-height: 0;
                width: 100%;
                height: 100%;
            }

            #left-panel.collapsed .panel-body,
            #right-panel.collapsed .panel-body {
                display: none;
            }

            .selection-breadcrumbs {
                position: sticky;
                top: 0;
                z-index: 2;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 0;
                min-width: 0;
                padding: 8px 10px;
                margin-bottom: 8px;
                border: 1px solid var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                background: var(--pl-background-color);
                box-sizing: border-box;
            }

            .selection-breadcrumb {
                position: relative;
                min-width: 0;
                flex: 0 0 auto;
                display: inline-flex;
                align-items: center;
                padding: 0;
                border: 0;
                background: transparent;
                color: var(--pl-grey-dark);
                font: var(--pl-caption-font, var(--pl-text-font));
                font-size: 12px;
                font-weight: 600;
                line-height: 1.25;
                white-space: nowrap;
                cursor: default;
            }

            .selection-breadcrumb.clickable {
                cursor: pointer;
                transition: color 140ms ease;
            }

            .selection-breadcrumb.clickable:hover {
                color: var(--pl-header-color);
            }

            .selection-breadcrumb:not(:first-child)::before {
                content: '›';
                margin: 0 8px;
                color: var(--pl-grey-dark);
                pointer-events: none;
            }

            .selection-breadcrumb.current {
                color: var(--pl-header-color);
                font-weight: 700;
            }

            .panel-toggle {
                position: absolute;
                top: 50%;
                z-index: 5;
                transform: translateY(-50%);
                --pl-icon-button-size: 28px;
                box-shadow: 0 0 0 1px var(--pl-grey-light);
                background: var(--pl-background-color);
            }

            .panel-toggle.left {
                right: 6px;
            }

            .panel-toggle.right {
                left: 6px;
            }

            pl-tree-list {
                display: block;
                height: 100%;
            }

            pl-component-list {
                flex: 0 0 280px;
                min-height: 180px;
                border-top: 1px solid var(--pl-grey-light);
            }
        `;

    static template = html`
        <div id="top-toolbar">
            <div class="top-toolbar-title">Конструктор формы</div>
            <div class="top-toolbar-actions">
                <pl-button variant="ghost" on-click="[[undo]]" disabled="[[!canUndo]]" label="Отменить"></pl-button>
                <pl-button variant="ghost" on-click="[[redo]]" disabled="[[!canRedo]]" label="Повторить"></pl-button>
                <pl-button variant="ghost" on-click="[[openParentForm]]" disabled="[[!hasParentForm]]" label="Родитель"></pl-button>
                <pl-button variant="ghost" on-click="[[select]]" label="Выбрать"></pl-button>
                <pl-button variant="ghost" on-click="[[formProperties]]" label="Форма"></pl-button>
                <pl-button variant="ghost" on-click="[[scripts]]" label="JS"></pl-button>
                <pl-button variant="ghost" on-click="[[styles]]" label="CSS"></pl-button>
            </div>
            <div class="top-toolbar-spacer"></div>
            <div class="top-toolbar-actions">
                <pl-button variant="primary" on-click="[[save]]" label="Сохранить"></pl-button>
            </div>
        </div>
        <div id="left-panel" class$="[[_panelClass(leftCollapsed)]]">
            <pl-icon-button
                class="panel-toggle left"
                variant="ghost"
                iconset="pl-default"
                icon="[[_leftPanelIcon(leftCollapsed)]]"
                title="[[_leftPanelTitle(leftCollapsed)]]"
                on-click="[[toggleLeftPanel]]"></pl-icon-button>
            <div class="panel-body">
                <pl-tree-list inspect="[[treeRoot]]" root-label="[[formClassName]]" selected="[[selectedSourcePath]]" fwt="[[fwt]]" on-highlight="[[onHighlight]]"></pl-tree-list>
                <pl-component-list></pl-component-list>
            </div>
        </div>
        <div id="right-panel" class$="[[_panelClass(rightCollapsed)]]">
            <pl-icon-button
                class="panel-toggle right"
                variant="ghost"
                iconset="pl-default"
                icon="[[_rightPanelIcon(rightCollapsed)]]"
                title="[[_rightPanelTitle(rightCollapsed)]]"
                on-click="[[toggleRightPanel]]"></pl-icon-button>
            <div class="panel-body">
                <div class="selection-breadcrumbs" hidden$="[[!hasSelectionBreadcrumbs(selectionBreadcrumbs)]]" aria-label="Навигация по вложенности элемента">
                    <template d:repeat="[[selectionBreadcrumbs]]" d:as="item">
                        <button type="button" class$="[[selectionBreadcrumbClass(item)]]" title$="[[item.title]]" on-click="[[onSelectionBreadcrumbClick]]">[[item.label]]</button>
                    </template>
                </div>
                <pl-props-panel tpl-root="[[tplRoot]]" source-tpl-root="[[sourceTplRoot]]" dom-root="[[domRoot]]" selected="[[selectedPath]]" selected-source-path="[[selectedSourcePath]]" fwt="[[fwt]]" on-open-css-rule="[[onOpenCssRule]]"></pl-props-panel>
            </div>
        </div>
        <pl-scripts-editor delta="{{scriptsDelta}}" source-script="[[sourceScripts]]" fwt="[[fwt]]" form="[[editForm]]" id="scriptsEditor"></pl-scripts-editor>
        <pl-styles-editor styles-text="{{stylesText}}" fwt="[[fwt]]" form="[[editForm]]" id="stylesEditor"></pl-styles-editor>
        <pl-form-properties-editor id="formPropertiesEditor" properties-text="{{propertiesText}}"></pl-form-properties-editor>
    `;

    constructor() {
        super();
        this.domScope = document.querySelector('pl-app');
        this._dndRoots = new WeakSet();
        this._dndRootRefs = [];
        this.fwt = polylibTools;
        this._sourceTemplateHost = null;
        this._sourceRequestId = 0;
        this._sourceCommandLog = [];
        this._undoStack = [];
        this._redoStack = [];
        this._shortcutSubscriptions = [];
        this._formStack = [];
        this._selectionRoot = null;

        this._onSelectComponentBound = this.onSelectComponent.bind(this);
        this._onCommandBound = this.onCommand.bind(this);
        this._onOpenCssRuleBound = this.onOpenCssRule.bind(this);
        this._onCurrentFormChangeBound = this.onCurrentFormChange.bind(this);
        this._onResizeBound = debounce(() => domSelector.drawSelector(this.selected), 100);
        this._onRootDragStartBound = this._onRootDragStart.bind(this);

        this._notifyFormUpdate = debounce(() => {
            window.dispatchEvent(new CustomEvent('form-update', { detail: { source: 'command' } }));
        }, 100);
        this._ensurePlComponentsLoaded();
        window.addEventListener('select-component', this._onSelectComponentBound);
        window.addEventListener('command', this._onCommandBound);
        window.addEventListener('nf-dev-editor-open-css-rule', this._onOpenCssRuleBound);
        window.addEventListener('form-change', this._onCurrentFormChangeBound);
        window.addEventListener('resize', this._onResizeBound);
        this._attachDnDRoot(window);
        this._attachDnDRoot(this.domScope);

        document.body.classList.add('editor-opened');
        this._syncEditorLayout();
        window.plCurrentForm && this.onCurrentFormChange({ detail: window.plCurrentForm });
        this._shortcutSubscriptions.push(
            shortcut.listen(['ControlLeft+KeyS'], this.save.bind(this)),
            shortcut.listen(['MetaLeft+KeyS'], this.save.bind(this)),
            shortcut.listen(['ControlLeft+KeyZ'], this.undo.bind(this)),
            shortcut.listen(['MetaLeft+KeyZ'], this.undo.bind(this)),
            shortcut.listen(['ControlLeft+ShiftLeft+KeyZ'], this.redo.bind(this)),
            shortcut.listen(['MetaLeft+ShiftLeft+KeyZ'], this.redo.bind(this)),
            shortcut.listen(['^AltLeft'], this.select.bind(this)),
            shortcut.listen(['Delete'], this.delete.bind(this)),
            shortcut.listen(['MetaLeft+Backspace'], this.delete.bind(this))
        );
    }

    disconnectedCallback() {
        window.removeEventListener('select-component', this._onSelectComponentBound);
        window.removeEventListener('command', this._onCommandBound);
        window.removeEventListener('nf-dev-editor-open-css-rule', this._onOpenCssRuleBound);
        window.removeEventListener('form-change', this._onCurrentFormChangeBound);
        window.removeEventListener('resize', this._onResizeBound);
        (this._dndRootRefs || []).forEach((root) => root?.removeEventListener?.('dragstart', this._onRootDragStartBound, true));
        this._dndRootRefs = [];
        document.body.classList.remove('editor-opened');
        document.body.style.removeProperty('--editor-left-width-current');
        document.body.style.removeProperty('--editor-right-width-current');
        this.style.removeProperty('--editor-left-width-current');
        this.style.removeProperty('--editor-right-width-current');
        (this._shortcutSubscriptions || []).forEach((sub) => shortcut.forget?.(sub));
        this._shortcutSubscriptions = [];
        super.disconnectedCallback?.();
    }

    select() {
        const root = this._selectionRoot || this.editForm?.root;
        if (!root) return;
        return domSelector.select({ type: 'polylib-component', root });
    }
    _selectedChanged() {
        this._syncSelectionBreadcrumbs();
        if (this.selected) {
            domSelector.drawSelector(this._getDrawTarget(this.selected));
        } else {
            domSelector.hideSelector();
        }
    }

    _extractFormNameFromTag(tagName) {
        const name = String(tagName || '').trim().toLowerCase();
        if (!name.startsWith('pl-form-')) return '';
        return name.replace(/^pl-form-/, '');
    }

    _extractFormName(form) {
        return this._extractFormNameFromTag(form?.localName || '');
    }

    _isNestedFormTag(tagName) {
        const name = String(tagName || '').trim().toLowerCase();
        if (!name.startsWith('pl-form-')) return false;
        const formName = this._extractFormNameFromTag(name);
        return formName.includes('.');
    }

    _findNestedFormHost(node) {
        let current = node;
        while (current) {
            if (current instanceof Element && this._isNestedFormTag(current.localName)) {
                return current;
            }
            const parent = current.parentNode instanceof DocumentFragment
                ? current.parentNode.host
                : current.parentNode;
            current = parent || current.host || null;
        }
        return null;
    }

    _switchToFormIfNeeded(node) {
        const nestedFormHost = this._findNestedFormHost(node);
        if (!nestedFormHost || nestedFormHost === this.editForm) return false;
        if (!nestedFormHost?.root) return false;
        this._pushCurrentFormToStack();
        this._setActiveForm(nestedFormHost, { resetStack: false });
        return true;
    }

    _extractNestedFormTagFromPath(path) {
        const parts = String(path || '').split('/').filter(Boolean);
        for (let i = parts.length - 1; i >= 0; i--) {
            const parsed = this._parseXPathSegment(parts[i]);
            const name = String(parsed?.name || '').toLowerCase();
            if (this._isNestedFormTag(name)) return name;
        }
        return '';
    }

    _findElementByLocalName(root, localName) {
        if (!root || !localName) return null;
        const expected = String(localName).toLowerCase();
        const visited = new Set();
        const queue = [root];

        while (queue.length > 0) {
            const node = queue.shift();
            if (!node || visited.has(node)) continue;
            visited.add(node);

            if (node instanceof Element && String(node.localName || '').toLowerCase() === expected) {
                return node;
            }

            if (node instanceof Element || node instanceof ShadowRoot || node instanceof DocumentFragment) {
                const children = node.children ? [...node.children] : [...(node.childNodes || [])];
                children.forEach((child) => queue.push(child));
            }

            if (node instanceof Element && node.shadowRoot) {
                queue.push(node.shadowRoot);
            }
        }

        return null;
    }

    _switchToFormByPath(runtimePath, templatePath) {
        const tag = this._extractNestedFormTagFromPath(templatePath)
            || this._extractNestedFormTagFromPath(runtimePath);
        if (!tag) return false;
        if (String(this.editForm?.localName || '').toLowerCase() === tag) return false;

        const root = this._selectionRoot || this.editForm?.root || this.domScope;
        const host = this._findElementByLocalName(root, tag)
            || this._findElementByLocalName(this.domScope, tag);
        if (!host?.root) return false;

        this._pushCurrentFormToStack();
        this._setActiveForm(host, { resetStack: false });
        return true;
    }

    _isInsideSelectionTree(node, root) {
        if (!(node instanceof Node) || !root) return false;
        let current = node;
        while (current) {
            if (current === root) return true;
            if (current instanceof ShadowRoot) {
                current = current.host || null;
                continue;
            }
            current = current.parentNode || current.host || current._io || null;
        }
        return false;
    }

    _resolveSelectionNodeByExactPath(path) {
        const root = this._selectionRoot || this.domRoot;
        if (!path || !root) return null;
        return findByXpath(root, String(path)) || null;
    }

    _handleTreeSelection(detail = {}) {
        const sourcePath = String(detail.templatePath || detail.path || '').trim();
        const runtimePathHint = String(detail.runtimePath || detail.path || '').trim();
        if (!sourcePath && !runtimePathHint) return;

        let selectedNode = null;
        const root = this._selectionRoot || this.editForm?.root;
        if (detail.target instanceof Node && this._isInsideSelectionTree(detail.target, root)) {
            selectedNode = detail.target;
        }

        if (!selectedNode && runtimePathHint) {
            selectedNode = this._resolveSelectionNodeByExactPath(runtimePathHint);
        }
        if (!selectedNode && sourcePath) {
            selectedNode = this._resolveSelectionNodeByExactPath(sourcePath);
        }
        if (!selectedNode && sourcePath.includes('/template')) {
            selectedNode = this._resolveRuntimeNodeFromTemplatePath(sourcePath);
        }

        let switchedToNestedForm = this._switchToFormIfNeeded(selectedNode);
        if (!switchedToNestedForm) {
            switchedToNestedForm = this._switchToFormByPath(runtimePathHint, sourcePath);
        }
        if (switchedToNestedForm && !selectedNode) {
            if (runtimePathHint) selectedNode = this._resolveSelectionNodeByExactPath(runtimePathHint);
            if (!selectedNode && sourcePath) selectedNode = this._resolveSelectionNodeByExactPath(sourcePath);
        }

        const selectedPath = selectedNode
            ? getXPath(selectedNode)
            : (runtimePathHint || sourcePath);

        this.selected = null;
        this.selectedPath = '';
        this.selectedSourcePath = '';
        this.selectedPath = selectedPath;
        this.selectedSourcePath = sourcePath || selectedPath;
        this.selected = selectedNode;
        if (this.selected) {
            this.selected.draggable = true;
        }
    }

    _pushCurrentFormToStack() {
        const current = this.editForm;
        if (!current?.root) return;
        const last = this._formStack[this._formStack.length - 1];
        if (last === current) return;
        this._formStack.push(current);
        this._syncParentFormState();
    }

    _popParentFormFromStack() {
        while (this._formStack.length > 0) {
            const candidate = this._formStack.pop();
            if (candidate?.root) {
                this._syncParentFormState();
                return candidate;
            }
        }
        this._syncParentFormState();
        return null;
    }

    _syncParentFormState() {
        this.hasParentForm = this._formStack.length > 0;
    }

    openParentForm() {
        const parentForm = this._popParentFormFromStack();
        if (!parentForm) return;
        this._setActiveForm(parentForm, { resetStack: false });
    }

    toggleLeftPanel() {
        this.leftCollapsed = !this.leftCollapsed;
    }

    toggleRightPanel() {
        this.rightCollapsed = !this.rightCollapsed;
    }

    _panelClass(collapsed) {
        return collapsed ? 'collapsed' : '';
    }

    _leftPanelIcon(collapsed) {
        return collapsed ? 'chevron-right' : 'chevron-left';
    }

    _rightPanelIcon(collapsed) {
        return collapsed ? 'chevron-left' : 'chevron-right';
    }

    _leftPanelTitle(collapsed) {
        return collapsed ? 'Показать структуру' : 'Скрыть структуру';
    }

    _rightPanelTitle(collapsed) {
        return collapsed ? 'Показать свойства' : 'Скрыть свойства';
    }

    hasSelectionBreadcrumbs(items) {
        return Array.isArray(items) && items.length > 0;
    }

    selectionBreadcrumbClass(item) {
        const classes = ['selection-breadcrumb'];
        if (item?.clickable) classes.push('clickable');
        if (item?.current) classes.push('current');
        return classes.join(' ');
    }

    onSelectionBreadcrumbClick(event) {
        const crumb = event?.model?.item;
        if (!crumb?.clickable) return;

        if (crumb.root) {
            const root = this.editForm?.root || null;
            const runtimePath = root ? getXPath(root) : '';
            this.selected = root;
            this.selectedPath = runtimePath;
            this.selectedSourcePath = '';
            if (root) {
                domSelector.drawSelector(this._getDrawTarget(root));
            } else {
                domSelector.hideSelector();
            }
            return;
        }

        const sourcePath = String(crumb?.sourcePath || '').trim();
        if (!sourcePath) return;
        const runtimeNode = this._resolveRuntimeNodeFromTemplatePath(sourcePath)
            || this._resolveSelectionNodeByPath(sourcePath);
        this._handleTreeSelection({
            path: sourcePath,
            templatePath: sourcePath,
            runtimePath: runtimeNode ? getXPath(runtimeNode) : sourcePath,
            target: runtimeNode instanceof Node ? runtimeNode : undefined,
            source: 'tree'
        });
    }

    _syncSelectionBreadcrumbs() {
        this.selectionBreadcrumbs = this._buildSelectionBreadcrumbs();
    }

    _buildSelectionBreadcrumbs() {
        const items = [];
        const rootLabel = this._getSelectionRootLabel();
        items.push({
            label: rootLabel,
            title: rootLabel,
            root: true,
            clickable: Boolean(this.selectedSourcePath),
            current: !this.selectedSourcePath
        });

        const sourcePath = String(this.selectedSourcePath || '').trim();
        if (!sourcePath) {
            return items;
        }

        const parts = sourcePath.split('/').filter(Boolean);
        const acc = [];
        parts.forEach((part, index) => {
            acc.push(part);
            const parsed = this._parseXPathSegment(part);
            const label = this._formatBreadcrumbSegmentLabel(parsed);
            items.push({
                label,
                title: '/' + acc.join('/'),
                sourcePath: '/' + acc.join('/'),
                clickable: index < parts.length - 1,
                current: index === parts.length - 1
            });
        });

        return items;
    }

    _getSelectionRootLabel() {
        const raw = String(this.formClassName || '').trim();
        if (!raw) return 'Форма';
        return raw.replace(/^Generated/, '') || raw;
    }

    _formatBreadcrumbSegmentLabel(parsed) {
        if (!parsed?.name) return '';
        return parsed.index > 0 ? `${parsed.name}[${parsed.index + 1}]` : parsed.name;
    }

    _syncEditorLayout() {
        const leftWidth = this.leftCollapsed ? 'var(--editor-panel-rail-width)' : 'var(--editor-left-width)';
        const rightWidth = this.rightCollapsed ? 'var(--editor-panel-rail-width)' : 'var(--editor-right-width)';
        document.body?.style?.setProperty('--editor-left-width-current', leftWidth);
        document.body?.style?.setProperty('--editor-right-width-current', rightWidth);
        this.style.setProperty('--editor-left-width-current', leftWidth);
        this.style.setProperty('--editor-right-width-current', rightWidth);
    }

    onSelectComponent(e) {
        const detail = e?.detail || {};
        const rawPath = String(detail.path || '');
        const detailRuntimePath = String(detail.runtimePath || '');
        const detailTemplatePath = String(detail.templatePath || '');
        const isTemplatePath = rawPath.includes('/template');
        const fromTree = String(detail.source || '').toLowerCase() === 'tree';
        console.log('[nf-dev-editor][editor-main][select][input]', {
            rawPath,
            detailRuntimePath,
            detailTemplatePath,
            isTemplatePath,
            fromTree,
            detailTargetTag: String(detail?.target?.localName || '')
        });
        if (fromTree) {
            this._handleTreeSelection(detail);
            return;
        }
        if (this.selected) this.selected.draggable = false;
        const root = this._selectionRoot || this.editForm?.root;
        const runtimeNodeByTemplatePath = isTemplatePath
            ? this._resolveRuntimeNodeFromTemplatePath(rawPath)
            : null;
        const runtimeNodeByPath = runtimeNodeByTemplatePath
            || (fromTree
                ? this._resolveSelectionNodeByPathStrict(detailRuntimePath || rawPath)
                : this._resolveSelectionNodeByPath(detailRuntimePath || rawPath));
        let selectedNode = detail.target || runtimeNodeByPath || null;
        console.log('[nf-dev-editor][editor-main][select][resolved-pre]', {
            runtimeNodeByTemplatePathTag: String(runtimeNodeByTemplatePath?.localName || ''),
            runtimeNodeByPathTag: String(runtimeNodeByPath?.localName || ''),
            selectedNodeTag: String(selectedNode?.localName || '')
        });
        if (root && selectedNode?.getRootNode?.() instanceof ShadowRoot && selectedNode.getRootNode() !== root) {
            const host = selectedNode.getRootNode().host || selectedNode;
            const insideSelected = this._isInsideSelectionTree(selectedNode, root);
            if (!insideSelected && this._isInsideSelectionTree(host, root)) {
                selectedNode = host;
            }
        }
        if (!(selectedNode instanceof Node) || (root && selectedNode !== root && !this._isInsideSelectionTree(selectedNode, root))) {
            const fallbackRuntimePath = detailRuntimePath
                || (runtimeNodeByTemplatePath ? getXPath(runtimeNodeByTemplatePath) : '')
                || (runtimeNodeByPath ? getXPath(runtimeNodeByPath) : '')
                || (isTemplatePath ? (this._withNoTemplateVariant(rawPath)[0] || '') : rawPath);
            if (fromTree) {
                selectedNode = this._resolveSelectionNodeByPathStrict(fallbackRuntimePath)
                    || (isTemplatePath ? this._resolveRuntimeNodeFromTemplatePath(rawPath) : null);
            } else {
                selectedNode = this._resolveSelectionNodeByPath(fallbackRuntimePath);
            }
            console.log('[nf-dev-editor][editor-main][select][fallback]', {
                fallbackRuntimePath,
                selectedNodeTag: String(selectedNode?.localName || '')
            });
        }
        let switchedToNestedForm = this._switchToFormIfNeeded(selectedNode);
        if (!switchedToNestedForm) {
            switchedToNestedForm = this._switchToFormByPath(detailRuntimePath || rawPath, detailTemplatePath || rawPath);
        }
        if (switchedToNestedForm && selectedNode === this.editForm) {
            selectedNode = this.editForm?.root || selectedNode;
        }
        if (switchedToNestedForm && selectedNode && this.editForm?.root) {
            const selectedRoot = selectedNode.getRootNode?.();
            if (selectedRoot instanceof ShadowRoot && selectedRoot.host === this.editForm) {
                // keep selected inner node
            } else if (selectedNode === this.editForm) {
                selectedNode = this.editForm.root;
            }
        }
        const runtimePath = selectedNode
            ? getXPath(selectedNode)
            : (detailRuntimePath
                || (runtimeNodeByPath ? getXPath(runtimeNodeByPath) : '')
                || (isTemplatePath ? (this._withNoTemplateVariant(rawPath)[0] || rawPath) : rawPath));
        const templatePath = detailTemplatePath || (isTemplatePath ? rawPath : '');
        const resolvedSourcePath = this._resolveSourceSelectionPath(runtimePath, templatePath)
            || templatePath
            || (isTemplatePath ? rawPath : runtimePath);

        this.selectedPath = runtimePath;
        this.selectedSourcePath = resolvedSourcePath;
        this.selected = selectedNode;
        console.log('[nf-dev-editor][editor-main][select][result]', {
            selectedPath: this.selectedPath || '',
            selectedSourcePath: this.selectedSourcePath || '',
            selectedTag: String(this.selected?.localName || '')
        });
        if(this.selected) {
            this.selected.draggable = true;
        }
    }

    _resolveRuntimeNodeFromTemplatePath(sourcePath) {
        const raw = String(sourcePath || '').trim();
        if (!raw.includes('/template')) return null;
        const parts = raw.split('/').filter(Boolean);
        const templateIndex = parts.map((segment) => String(segment).toLowerCase()).lastIndexOf('template');
        if (templateIndex < 0) return null;

        const containerPath = '/' + parts.slice(0, templateIndex).join('/');
        const innerParts = parts.slice(templateIndex + 1)
            .map((segment) => this._parseXPathSegment(segment))
            .filter((segment) => segment?.name);
        console.log('[nf-dev-editor][editor-main][resolve-template][start]', {
            sourcePath: raw,
            containerPath,
            innerParts: innerParts.map((part) => `${part.name}[${part.index}]`)
        });

        const containerNode = this._resolveSelectionNodeByPath(containerPath) || this._resolveDomNodeByPath(containerPath);
        if (!(containerNode instanceof Node)) {
            console.log('[nf-dev-editor][editor-main][resolve-template][container-miss]', {
                sourcePath: raw,
                containerPath
            });
            return null;
        }
        if (!innerParts.length) {
            console.log('[nf-dev-editor][editor-main][resolve-template][container-hit]', {
                sourcePath: raw,
                containerPath,
                containerTag: String(containerNode?.localName || '')
            });
            return containerNode;
        }

        let current = containerNode;
        for (const segment of innerParts) {
            const childNodes = [...(current?.childNodes || [])];
            const children = childNodes.filter((child) => String(child?.localName || '').toLowerCase() === segment.name);
            if (children.length > 0) {
                const index = Math.min(segment.index, children.length - 1);
                current = children[index];
                continue;
            }
            const deepMatch = current?.querySelector?.(segment.name);
            if (!deepMatch) {
                console.log('[nf-dev-editor][editor-main][resolve-template][miss]', {
                    sourcePath: raw,
                    segment: `${segment.name}[${segment.index}]`,
                    currentTag: String(current?.localName || '')
                });
                return null;
            }
            current = deepMatch;
        }
        console.log('[nf-dev-editor][editor-main][resolve-template][result]', {
            sourcePath: raw,
            runtimePath: String(getXPath(current) || ''),
            runtimeTag: String(current?.localName || '')
        });
        return current instanceof Node ? current : null;
    }

    scripts() {
        this.$.scriptsEditor.open(this.editForm);
    }

    _getFormPropertiesEditor() {
        return this.shadowRoot?.querySelector?.('#formPropertiesEditor') || null;
    }

    formProperties() {
        this._getFormPropertiesEditor()?.open?.();
    }

    styles() {
        this.$.stylesEditor.open(this.editForm);
    }

    onOpenCssRule(event) {
        const selector = String(event?.detail?.selector || '').trim();
        if (!selector) return;
        this.$.stylesEditor.openForSelector(selector, this.editForm);
    }

    onCommand(e) {
        let command = {
            ...e.detail,
            tplRoot: this.tplRoot,
            domRoot: this.domRoot,
            sourceTplRoot: this.sourceTplRoot
        };
        command = this._prepareDropCommand(command);
        if (!command) return;
        if (this._isUndoableCommand(command)) {
            this._clearRedoStack();
            this._pushUndoSnapshot();
        }

        const sourceCommand = this._normalizeSourceCommand(command);
        if (sourceCommand) {
            this._sourceCommandLog.push(sourceCommand);
            const sourceResult = this._applyCommandToSourceTemplate(sourceCommand);
            if (sourceResult?.selectSourcePath) {
                command._selectSourcePath = sourceResult.selectSourcePath;
            }
        }

        const isDomMutation = ['add-element', 'move-element', 'del-element', 'wrap-element', 'duplicate-element'].includes(command?.command);
        const templateContext = String(command?.sourcePath || command?.path || '').includes('/template');
        const requiresSourceRebuild = templateContext || command?.command === 'duplicate-element';
        let cmdResult;
        if (isDomMutation && requiresSourceRebuild) {
            cmdResult = {
                select: command.command === 'move-element'
                    ? (command.element || command.path || '')
                    : (command._selectSourcePath || command.path || '')
            };
            const rebuilt = this._rebuildRuntimeFromTemplate(true);
            if (!rebuilt) {
                requestAnimationFrame(() => {
                    this._rebuildRuntimeFromTemplate(true);
                });
            }
        } else {
            cmdResult = this.fwt.execCommand(command);
        }
        let select = cmdResult?.select;
        if (select) {
            const runtimeNode = command?._selectSourcePath
                ? this._resolveRuntimeNodeFromTemplatePath(command._selectSourcePath)
                : null;
            const runtimePath = runtimeNode ? getXPath(runtimeNode) : select;
            this.selectedPath = null;
            this.selectedPath = runtimePath;
            this.selectedSourcePath = command?._selectSourcePath || this._resolveSourceSelectionPath(runtimePath, '');
            this.selected = runtimeNode || (this.editForm?.root
                ? (findByXpath(this.editForm.root, this.selectedPath) || findByXpathWithFallback(this.editForm.root, this.selectedPath).node)
                : null);
        }
        this._notifyFormUpdate();
        domSelector.drawSelector(this._getDrawTarget(this.selected));
    }

    _isUndoableCommand(command) {
        return ['add-element', 'move-element', 'del-element', 'wrap-element', 'duplicate-element', 'change-property', 'change-attribute', 'change-text-node'].includes(String(command?.command || ''));
    }

    _cloneSourceCommandLog() {
        return (this._sourceCommandLog || []).map((item) => ({ ...item }));
    }

    _captureUndoSnapshot() {
        return {
            template: this._getSaveTemplateText(),
            selectedPath: this.selectedPath || '',
            selectedSourcePath: this.selectedSourcePath || '',
            sourceCommandLog: this._cloneSourceCommandLog()
        };
    }

    _pushUndoSnapshot() {
        try {
            this._undoStack.push(this._captureUndoSnapshot());
            if (this._undoStack.length > 100) {
                this._undoStack.shift();
            }
            this.canUndo = this._undoStack.length > 0;
        } catch (_err) {
            // ignore snapshot issues
        }
    }

    _pushRedoSnapshot() {
        try {
            this._redoStack.push(this._captureUndoSnapshot());
            if (this._redoStack.length > 100) {
                this._redoStack.shift();
            }
            this.canRedo = this._redoStack.length > 0;
        } catch (_err) {
            // ignore snapshot issues
        }
    }

    _clearRedoStack() {
        this._redoStack = [];
        this.canRedo = false;
    }

    undo() {
        if (!this._undoStack.length) return;
        const snapshot = this._undoStack.pop();
        this._pushRedoSnapshot();
        this.canUndo = this._undoStack.length > 0;
        this._restoreUndoSnapshot(snapshot);
    }

    redo() {
        if (!this._redoStack.length) return;
        const snapshot = this._redoStack.pop();
        this._pushUndoSnapshot();
        this.canRedo = this._redoStack.length > 0;
        this._restoreUndoSnapshot(snapshot);
    }

    _restoreUndoSnapshot(snapshot) {
        const html = String(snapshot?.template || '');
        if (!html || !this.editForm) return;

        const host = document.createElement('template');
        host.innerHTML = html;
        this._sourceTemplateHost = host;
        this.sourceTplRoot = host;
        this.treeRoot = host;
        this._sourceCommandLog = Array.isArray(snapshot?.sourceCommandLog)
            ? snapshot.sourceCommandLog.map((item) => ({ ...item }))
            : [];

        const rebuilt = this._rebuildRuntimeFromTemplate(true);
        if (!rebuilt) return;

        this.tplRoot = this.editForm?.root?.host?._ti?.tpl?.tpl || this.tplRoot;
        this.domRoot = this.editForm?.root || this.domRoot;
        this.treeRoot = this.sourceTplRoot;

        const restoredSourcePath = String(snapshot?.selectedSourcePath || '');
        const restoredRuntimeNode = this._resolveRuntimeNodeFromTemplatePath(restoredSourcePath)
            || this._resolveSelectionNodeByPath(String(snapshot?.selectedPath || ''));
        const restoredRuntimePath = restoredRuntimeNode
            ? getXPath(restoredRuntimeNode)
            : (String(snapshot?.selectedPath || '') || '');

        this.selected = restoredRuntimeNode || null;
        this.selectedPath = restoredRuntimePath;
        this.selectedSourcePath = restoredSourcePath || restoredRuntimePath;
        this._notifyFormUpdate();
        domSelector.drawSelector(this._getDrawTarget(this.selected));
    }

    onCurrentFormChange(e) {
        const current = e?.detail || null;
        this._setActiveForm(current?.form || null, { resetStack: true });
    }

    _setActiveForm(rawForm, { resetStack = false } = {}) {
        const form = rawForm ? this.fwt.findRootElement(rawForm) : null;

        if (resetStack) {
            this._formStack = [];
            this._syncParentFormState();
            this._undoStack = [];
            this._redoStack = [];
            this.canUndo = false;
            this.canRedo = false;
        }

        if (!form?.root) {
            this.editForm = null;
            this.tplRoot = null;
            this.domRoot = null;
            this.formClassName = '';
            this.stylesText = '';
            this.propertiesText = '{\n}';
            this.sourceScripts = '';
            this.baseSignature = '';
            this.sourceTplRoot = null;
            this.treeRoot = null;
            this._sourceTemplateHost = null;
            this.selectedSourcePath = '';
            this._sourceCommandLog = [];
            this._undoStack = [];
            this._redoStack = [];
            this.canUndo = false;
            this.canRedo = false;
            if (resetStack) this._selectionRoot = null;
            if (resetStack) {
                this._formStack = [];
                this._syncParentFormState();
            }
            this._getFormPropertiesEditor()?.close?.();
            domSelector.root = null;
            return;
        }

        this.editForm = form;
        this.tplRoot = getDesignedTpl(form);
        this.domRoot = form.root;
        this.formClassName = form.constructor?.name || form.localName;
        this.stylesText = getStyles(form);
        this.propertiesText = '{\n}';
        this.sourceScripts = this.fwt.getFunctions(form).map(x => x.text).join('\n');
        this.baseSignature = '';
        this.sourceTplRoot = null;
        this.treeRoot = this.tplRoot;
        this.selectedSourcePath = '';
        this._sourceCommandLog = [];
        if (resetStack) {
            this._undoStack = [];
            this._redoStack = [];
            this.canUndo = false;
            this.canRedo = false;
        }
        this._attachDnDRoot(this.domRoot);
        this._setSourceTemplate(this.tplRoot?.cloneNode(true));
        this._loadBackendSource(form);
        if (resetStack || !this._selectionRoot || !this._selectionRoot.isConnected) {
            this._selectionRoot = form.root;
        }
        this._getFormPropertiesEditor()?.close?.();
        this._syncParentFormState();
        domSelector.root = this._selectionRoot || this.domRoot;
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
        if (!this._hasDragPayload(e)) return false;
        let node = this._resolveDropNode(e);
        let position = this._getDropPosition(e, node);
        if (node) {
            domSelector.drawSelector(node, { position });
            return true;
        }
    }
    hideReceiver() {
        domSelector.hideSelector();
    }

    drop(e) {
        if (!this._hasDragPayload(e)) return;
        const paths = e.composedPath();
        let node = domSelector.findEditableNode(paths) || this._resolveDropNode(e);
        if (!node) return;
        const path = getXPath(node);
        const payload = this._extractDragPayload(e);
        if (!payload) return;
        const sourcePath = this._resolveTemplatePathForRuntimeNode(node, path)
            || this._resolveTplPath(path, '')
            || path;
        const moveSource = payload.kind === 'move' ? (payload.source || payload.value) : '';
        const sourceElement = payload.kind === 'move'
            ? (String(moveSource).includes('/template')
                ? moveSource
                : (this._resolveTemplatePathForRuntimePath(moveSource)
                    || this._resolveTplPath(moveSource, '')
                    || moveSource))
            : '';
        let cmd = {
            position: this._getDropPosition(e, node),
            path,
            sourcePath,
            element: payload.value
        }
        if (payload.kind === 'move') {
            cmd.sourceElement = sourceElement;
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
        let name = this._extractFormName(this.editForm);
        let tplText = this._getSaveTemplateText();
        let body = JSON.stringify({
            tpl: tplText,
            scriptsDelta: this.scriptsDelta,
            styles: this.stylesText,
            properties: this.propertiesText,
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
        const normalized = String(name || '').trim().toLowerCase();
        if (!normalized) return null;
        if (!/^[a-z][a-z0-9._-]*$/.test(normalized)) return null;
        const tpl = document.createElement('template');
        tpl.insertAdjacentHTML('afterbegin', `<${normalized}></${normalized}>`);
        return tpl.content.firstElementChild || tpl.firstElementChild;
    }

    _appendWithPosition(node, target, position, slot) {
        if (!node || !target || node === target) return;
        this._applySlotToNode(node, slot);
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
        const sourcePath = command.sourcePath || command.path;
        const sourceElement = command.command === 'move-element'
            ? (command.sourceElement || command.element)
            : command.sourceElement;
        return {
            type: 'dom',
            command: command.command,
            path: sourcePath,
            sourcePath,
            position: command.position,
            slot: command.slot,
            element: command.command === 'move-element' ? sourceElement : command.element,
            sourceElement,
            property: command.property,
            value: command.value,
            attribute: command.attribute,
            textPath: Array.isArray(command.textPath) ? [...command.textPath] : undefined
        };
    }

    _applyCommandToSourceTemplate(command, host = this._sourceTemplateHost) {
        if (!host?.content || command?.type !== 'dom') return;

        const root = host.content;
        const findSourceNode = (path, preferredSourcePath) => {
            const candidates = [];
            if (preferredSourcePath) candidates.push(preferredSourcePath);
            if (path && path !== preferredSourcePath) candidates.push(path);

            for (const rawPath of candidates) {
                for (const candidate of buildXPathCandidates(rawPath)) {
                    const exact = findByXpath(root, candidate, true);
                    if (exact) return exact;
                    const structural = this._findTplNodeByStructure(root, candidate);
                    if (structural) return structural;
                }
            }
            return null;
        };
        try {
            if (command.command === 'change-property') {
                const target = findSourceNode(command.path, command.sourcePath);
                if (!target) return;
                setAttrValue(target, command.property, command.value);
                return;
            }

            if (command.command === 'change-attribute') {
                const target = findSourceNode(command.path, command.sourcePath);
                if (!target || !command.attribute) return;
                if (command.value === '' || command.value === null || command.value === undefined) {
                    target.removeAttribute(command.attribute);
                } else {
                    setAttrValue(target, command.attribute, command.value);
                }
                return;
            }

            if (command.command === 'change-text-node') {
                const target = findSourceNode(command.path, command.sourcePath);
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
                const target = findSourceNode(command.path, command.sourcePath);
                const node = this._createElementForTemplate(command.element);
                if (!target || !node) return;
                this._appendWithPosition(node, target, command.position, command.slot);
                return;
            }

            if (command.command === 'move-element') {
                const node = findSourceNode(command.element, command.sourceElement);
                const target = findSourceNode(command.path, command.sourcePath);
                if (!node || !target) return;
                this._appendWithPosition(node, target, command.position, command.slot);
                return;
            }

            if (command.command === 'duplicate-element') {
                const target = findSourceNode(command.path, command.sourcePath);
                if (!(target instanceof Node) || !target.parentNode?.insertBefore) return;
                const clone = target.cloneNode(true);
                target.parentNode.insertBefore(clone, target.nextSibling);
                return {
                    selectSourcePath: this._getRelativeTplPath(clone)
                };
            }

            if (command.command === 'wrap-element') {
                const target = findSourceNode(command.path, command.sourcePath);
                const wrapper = this._createElementForTemplate(command.element);
                if (!(target instanceof Node) || !(wrapper instanceof Node)) return;

                let parent = target.parentNode;
                if (parent instanceof DocumentFragment && parent.host instanceof HTMLTemplateElement) {
                    parent = parent.host.content;
                }
                if (!parent?.insertBefore) return;

                parent.insertBefore(wrapper, target);
                this._appendWithPosition(target, wrapper, 'in');
                return {
                    selectSourcePath: this._getRelativeTplPath(wrapper)
                };
            }

            if (command.command === 'del-element') {
                const target = findSourceNode(command.path, command.sourcePath);
                target?.remove?.();
            }
        } catch (_err) {}
    }

    async _loadBackendSource(form) {
        const formName = this._extractFormName(form);
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
            this.propertiesText = typeof data?.properties === 'string' ? data.properties : '{\n}';
            if (typeof data?.scripts === 'string' && (!Array.isArray(this.scriptsDelta) || this.scriptsDelta.length === 0)) {
                this.sourceScripts = data.scripts;
            }

            const host = document.createElement('template');
            host.innerHTML = data?.template || '';
            this._sourceTemplateHost = host;
            this.sourceTplRoot = host;
            this.treeRoot = host;
            this._sourceCommandLog.forEach(cmd => this._applyCommandToSourceTemplate(cmd, host));
        } catch (_err) {}
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
                    if (resolved.node && resolved.path) return resolved.path;
                }
            }
        }

        const direct = resolveExactPath(runtimePath);
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

    _attachDnDRoot(root) {
        if (!root || typeof root.addEventListener !== 'function') return;
        if (this._dndRoots?.has(root)) return;
        drndr.listen(this, this.drawReceiver, this.hideReceiver, this.drop, root);
        root.addEventListener('dragstart', this._onRootDragStartBound, true);
        this._dndRoots?.add(root);
        this._dndRootRefs?.push(root);
    }

    _onRootDragStart(e) {
        const dt = e?.dataTransfer;
        if (!dt) return;

        const existingTypes = [...(dt.types || [])].map((type) => String(type).toLowerCase());
        if (existingTypes.includes('dev/element')) return;

        const path = e?.composedPath?.() || [];
        const rawNode = path.find((part) => part instanceof Node) || null;
        const node = (rawNode instanceof Node && this.domRoot && (rawNode === this.domRoot || this.domRoot.contains?.(rawNode)))
            ? rawNode
            : domSelector.findEditableNode(path);
        if (!(node instanceof Node)) return;

        const root = this.domRoot;
        if (root) {
            const isInRoot = node === root || root.contains?.(node) || node.getRootNode?.() === root;
            if (!isInRoot) return;
        }

        let runtimePath = getXPath(node);
        if (!runtimePath) return;

        const selected = this.selected;
        const fromSelected = selected instanceof Node
            && (node === selected || selected.contains?.(node));
        if (fromSelected && this.selectedPath) {
            runtimePath = this.selectedPath;
        }

        const sourcePath = (fromSelected && this.selectedSourcePath)
            || this._resolveTemplatePathForRuntimeNode(fromSelected ? selected : node, runtimePath)
            || this._resolveTplPath(runtimePath, '')
            || runtimePath;

        dt.effectAllowed = 'move';
        dt.setData('dev/move', runtimePath);
        dt.setData('dev/move-source', sourcePath);
        if (!String(dt.getData('text/plain') || '').trim()) {
            dt.setData('text/plain', `dev:move:${runtimePath}`);
        }
    }

    _getDropPosition(event, node) {
        if (event?.ctrlKey) return 'after';
        if (event?.shiftKey) return 'before';
        if (String(node?.localName || '').toLowerCase() === 'template') return 'in';
        if (!this._canDropInside(node)) return 'before';

        const rect = node?.getBoundingClientRect?.();
        if (!rect) return 'in';
        const y = Number(event?.clientY);
        if (!Number.isFinite(y)) return 'in';

        const beforeZone = Math.min(14, Math.max(6, rect.height * 0.22));
        if (y <= rect.top + beforeZone) return 'before';
        return 'in';
    }

    _canDropInside(node) {
        if (!(node instanceof Element)) return false;
        const tag = String(node.localName || '').toLowerCase();
        if (!tag) return false;
        if (tag === 'template') return true;
        return !VOID_HTML_TAGS.has(tag);
    }

    _prepareDropCommand(command) {
        if (!command || command.type !== 'dom') return command;
        if (command.command !== 'add-element' && command.command !== 'move-element') return command;
        if (command.command === 'add-element' && !this._isValidElementName(command.element)) return null;

        command.sourcePath = command.sourcePath || command.path;
        if (command.command === 'move-element') {
            command.sourceElement = command.sourceElement || command.element;
            const targetIsTemplate = String(command.sourcePath || '').includes('/template');
            const selectedIsSource = this.selectedPath && command.element && this.selectedPath === command.element;
            const selectedTemplatePath = String(this.selectedSourcePath || '');
            if (targetIsTemplate
                && !String(command.sourceElement || '').includes('/template')
                && selectedIsSource
                && selectedTemplatePath.includes('/template')) {
                command.sourceElement = selectedTemplatePath;
            }
        }

        const toRuntimePath = (path, sourcePath = '') => {
            const source = String(path || '');
            if (!source) return source;

            const resolved = this._resolveTplPath(source, sourcePath);
            if (resolved && resolved !== source) {
                return resolved;
            }

            if (source.includes('/template')) {
                const stripped = '/' + source
                    .split('/')
                    .filter(Boolean)
                    .filter((segment) => !/^template(?:\[\d+])?$/i.test(String(segment)))
                    .join('/');
                if (stripped && stripped !== '/' && this._resolveDomNodeByPath(stripped)) {
                    return stripped;
                }
            }

            return resolved || source;
        };

        const runtimePath = toRuntimePath(command.path, command.sourcePath || '');
        if (runtimePath && runtimePath !== command.path) {
            command.path = runtimePath;
        }
        if (command.command === 'move-element' && command.element) {
            const runtimeElement = toRuntimePath(command.element, command.sourceElement || '');
            if (runtimeElement && runtimeElement !== command.element) {
                command.element = runtimeElement;
            }
        }

        // Validate move constraints in template tree to avoid false positives from runtime DOM fallback.
        const targetTplNode = this._resolveTplNodeByPath(command.path, command.sourcePath || '');
        const moveTplNode = command.command === 'move-element'
            ? this._resolveTplNodeByPath(command.element, command.sourceElement || '')
            : null;

        if (moveTplNode instanceof Node && targetTplNode instanceof Node
            && (targetTplNode === moveTplNode || moveTplNode.contains?.(targetTplNode))) {
            return null;
        }

        const targetNode = this._resolveDomNodeByPath(command.path);
        if (!(targetNode instanceof Node)) return command;
        const moveNode = command.command === 'move-element'
            ? this._resolveDomNodeByPath(command.element)
            : null;

        if (command.slot !== undefined) return command;
        const decision = this._resolveDropSlotDecision({
            position: command.position || 'in',
            targetNode,
            moveNode
        });
        if (decision.cancelled) return null;
        if (decision.slot !== undefined) {
            command.slot = decision.slot;
        }
        return command;
    }

    _resolveDropSlotDecision({ position, targetNode, moveNode }) {
        const container = position === 'in'
            ? targetNode
            : (targetNode?.parentElement || targetNode?.parentNode || null);
        if (!(container instanceof Element)) return { slot: undefined };

        const options = this._collectContainerSlotOptions(container);
        if (!options.length) return { slot: undefined };

        const siblingSlot = position !== 'in' && targetNode instanceof Element
            ? (targetNode.getAttribute('slot') || '')
            : '';
        const movingSlot = moveNode instanceof Element
            ? (moveNode.getAttribute('slot') || '')
            : '';
        const preferred = options.includes(siblingSlot)
            ? siblingSlot
            : (options.includes(movingSlot) ? movingSlot : options[0]);

        if (options.length === 1) {
            return { slot: options[0] };
        }

        const printable = options
            .map((slot, idx) => `${idx + 1}. ${slot || '(default)'}`)
            .join('\n');
        const hostName = container.localName || 'component';
        const initial = preferred || '';
        const answer = window.prompt(
            `Выберите slot для вставки в ${hostName}:\n${printable}\n\n` +
            `Введите имя slot или номер (пусто = default).`,
            initial
        );
        if (answer === null) return { cancelled: true };

        const normalized = String(answer).trim();
        if (!normalized || normalized.toLowerCase() === 'default' || normalized === '(default)') {
            return { slot: '' };
        }
        const index = Number(normalized);
        if (Number.isFinite(index) && index >= 1 && index <= options.length) {
            return { slot: options[index - 1] };
        }
        if (options.includes(normalized)) {
            return { slot: normalized };
        }
        return { slot: preferred };
    }

    _collectContainerSlotOptions(container) {
        if (!(container instanceof Element)) return [];
        const names = new Set();

        const appendSlot = (name) => {
            if (name === undefined || name === null) return;
            names.add(String(name).trim());
        };

        try {
            const slots = [...(container.shadowRoot?.querySelectorAll?.('slot') || [])];
            slots.forEach((slotEl) => appendSlot(slotEl.getAttribute('name') || ''));
        } catch (_err) {
            // ignore shadow access errors
        }

        const declared = container?.constructor?.slots;
        if (Array.isArray(declared)) {
            declared.forEach((slotName) => appendSlot(slotName));
        } else if (declared && typeof declared === 'object') {
            Object.keys(declared).forEach((slotName) => appendSlot(slotName));
        }

        return [...names];
    }

    _resolveDomNodeByPath(path) {
        if (!path || !this.domRoot) return null;
        const variants = new Set();
        variants.add(String(path));
        this._withNoTemplateVariant(path).forEach((v) => variants.add(v));
        this._withTrimmedRootVariant(path).forEach((v) => variants.add(v));

        for (const variant of variants) {
            if (!variant) continue;
            for (const candidate of buildXPathCandidates(variant)) {
                const exact = findByXpath(this.domRoot, candidate);
                if (exact) return exact;
                const fallback = findByXpathWithFallback(this.domRoot, candidate).node;
                if (fallback) return fallback;
            }
        }
        return null;
    }

    _resolveSelectionNodeByPath(path) {
        const root = this._selectionRoot || this.domRoot;
        if (!path || !root) return null;
        const variants = new Set();
        variants.add(String(path));
        this._withNoTemplateVariant(path).forEach((v) => variants.add(v));
        this._withTrimmedRootVariant(path).forEach((v) => variants.add(v));

        for (const variant of variants) {
            if (!variant) continue;
            for (const candidate of buildXPathCandidates(variant)) {
                const exact = findByXpath(root, candidate);
                if (exact) return exact;
                const fallback = findByXpathWithFallback(root, candidate).node;
                if (fallback) return fallback;
            }
        }
        return null;
    }

    _resolveDomNodeByPathStrict(path) {
        if (!path || !this.domRoot) return null;
        const variants = new Set();
        variants.add(String(path));
        this._withNoTemplateVariant(path).forEach((v) => variants.add(v));
        this._withTrimmedRootVariant(path).forEach((v) => variants.add(v));

        for (const variant of variants) {
            if (!variant) continue;
            for (const candidate of buildXPathCandidates(variant)) {
                const exact = findByXpath(this.domRoot, candidate);
                if (exact) return exact;
            }
        }
        return null;
    }

    _resolveSelectionNodeByPathStrict(path) {
        const root = this._selectionRoot || this.domRoot;
        if (!path || !root) return null;
        const variants = new Set();
        variants.add(String(path));
        this._withNoTemplateVariant(path).forEach((v) => variants.add(v));
        this._withTrimmedRootVariant(path).forEach((v) => variants.add(v));

        for (const variant of variants) {
            if (!variant) continue;
            for (const candidate of buildXPathCandidates(variant)) {
                const exact = findByXpath(root, candidate);
                if (exact) return exact;
            }
        }
        return null;
    }

    _resolveTplPath(path, sourcePath = '') {
        if (!this.tplRoot) return null;
        const node = this._resolveTplNodeByPath(path, sourcePath);
        if (!(node instanceof Node)) return null;
        return this._getRelativeTplPath(node);
    }

    _resolveTplNodeByPath(path, sourcePath = '') {
        if (!this.tplRoot) return null;
        const variants = new Set();
        const appendVariants = (value) => {
            const raw = String(value || '').trim();
            if (!raw) return;
            variants.add(raw);
            this._withNoTemplateVariant(raw).forEach((v) => variants.add(v));
            this._withTrimmedRootVariant(raw).forEach((v) => variants.add(v));
        };

        appendVariants(path);
        appendVariants(sourcePath);

        for (const variant of variants) {
            if (!variant) continue;
            for (const candidate of buildXPathCandidates(variant)) {
                const exact = findByXpath(this.tplRoot, candidate, true);
                if (exact) return exact;
                const structural = this._findTplNodeByStructure(this.tplRoot, candidate);
                if (structural) return structural;
            }
        }
        return null;
    }

    _findTplNodeByStructure(root, path) {
        if (!root || !path) return null;
        const parts = String(path).split('/').filter(Boolean);
        if (!parts.length) return root;
        let node = root;
        for (const part of parts) {
            const parsed = this._parseXPathSegment(part);
            if (!parsed?.name) return null;

            if (node instanceof HTMLTemplateElement) node = node.content;
            const children = [...(node?.childNodes || [])].filter((child) => String(child?.localName || '').toLowerCase() === parsed.name);
            if (children.length === 0) return null;
            const idx = parsed.index < children.length ? parsed.index : -1;
            if (idx < 0) return null;
            node = children[idx];
        }
        return node || null;
    }

    _parseXPathSegment(segment) {
        const match = String(segment || '').trim().match(/^(?<name>.*?)(?:\[(?<index>\d+)\])?(?:\{(?<domindex>\d+)\})?$/);
        if (!match?.groups?.name) return null;
        return {
            name: String(match.groups.name).toLowerCase(),
            index: match.groups.index ? Math.max(0, Number(match.groups.index) - 1) : 0
        };
    }

    _getRelativeTplPath(node) {
        if (!this.tplRoot || !(node instanceof Node)) return null;
        if (node === this.tplRoot) return '/';

        const segments = [];
        let current = node;

        while (current && current !== this.tplRoot) {
            let parent = current.parentNode;
            if (parent instanceof DocumentFragment && parent.host instanceof HTMLTemplateElement) {
                parent = parent.host;
            }
            if (!parent || !(current instanceof Element)) return null;

            const siblings = parent instanceof HTMLTemplateElement
                ? [...(parent.content?.childNodes || [])].filter((child) => child?.localName === current.localName)
                : [...(parent.childNodes || [])].filter((child) => child?.localName === current.localName);
            const index = siblings.indexOf(current);
            if (index < 0) return null;
            const segment = index > 0 ? `${current.localName}[${index + 1}]` : current.localName;
            segments.unshift(segment);
            current = parent;
        }

        if (current !== this.tplRoot) return null;
        return '/' + segments.join('/');
    }

    _withNoTemplateVariant(path) {
        const source = String(path || '');
        if (!source) return [];
        const compact = '/' + source
            .split('/')
            .filter(Boolean)
            .filter((segment) => !String(segment).toLowerCase().startsWith('template'))
            .join('/');
        return compact && compact !== '/' ? [compact] : [];
    }

    _withTrimmedRootVariant(path) {
        const source = String(path || '');
        const parts = source.split('/').filter(Boolean);
        if (parts.length <= 1) return [];
        const variants = [];
        const dropFirst = '/' + parts.slice(1).join('/');
        if (dropFirst && dropFirst !== '/') variants.push(dropFirst);
        const withoutTemplate = this._withNoTemplateVariant(dropFirst);
        withoutTemplate.forEach((v) => variants.push(v));
        return variants;
    }

    _applySlotToNode(node, slot) {
        if (!(node instanceof Element) || slot === undefined) return;
        const normalized = String(slot || '').trim();
        if (!normalized) {
            node.removeAttribute('slot');
            return;
        }
        setAttrValue(node, 'slot', normalized);
    }

    _isValidElementName(name) {
        const value = String(name || '').trim().toLowerCase();
        return /^[a-z][a-z0-9._-]*-[a-z0-9._-]+$/.test(value);
    }

    _extractDragPayload(e) {
        let move = String(e?.dataTransfer?.getData?.('dev/move') || '').trim();
        let moveSource = String(e?.dataTransfer?.getData?.('dev/move-source') || '').trim();
        let element = String(e?.dataTransfer?.getData?.('dev/element') || '').trim();
        const plain = String(e?.dataTransfer?.getData?.('text/plain') || '').trim();

        if (!move && plain.startsWith('dev:move:')) {
            move = plain.replace('dev:move:', '').trim();
        }
        if (!element && plain.startsWith('dev:element:')) {
            element = plain.replace('dev:element:', '').trim();
        }
        if (!move && !element && this._isValidElementName(plain)) {
            element = plain;
        }

        if (move) return { kind: 'move', value: move, source: moveSource || '' };
        if (this._isValidElementName(element)) return { kind: 'add', value: element };
        return null;
    }

    _hasDragPayload(e) {
        const types = [...(e?.dataTransfer?.types || [])].map((t) => String(t).toLowerCase());
        if (types.includes('dev/element') || types.includes('dev/move') || types.includes('text/plain')) {
            return true;
        }
        return Boolean(this._extractDragPayload(e));
    }

    _resolveDropNode(e) {
        let node = domSelector.findEditableNode(e?.composedPath?.() || []);
        if (node) return node;

        const x = Number(e?.clientX);
        const y = Number(e?.clientY);
        const hasPoint = Number.isFinite(x) && Number.isFinite(y);
        if (!hasPoint) return null;

        let target = null;
        if (typeof this.domRoot?.elementFromPoint === 'function') {
            target = this.domRoot.elementFromPoint(x, y);
        }
        if (!target && typeof document.elementFromPoint === 'function') {
            target = document.elementFromPoint(x, y);
        }
        if (!target) return null;

        const path = [];
        let current = target;
        while (current) {
            path.push(current);
            current = current.parentNode || current.host;
        }
        node = domSelector.findEditableNode(path);
        return node || target;
    }

    _resolveTemplatePathForRuntimePath(path) {
        const node = this._resolveDomNodeByPath(path);
        if (node) {
            return this._resolveTemplatePathForRuntimeNode(node, path);
        }
        return this._resolveSourceSelectionPath(path, '');
    }

    _resolveTemplatePathForRuntimeNode(node, fallbackPath = '') {
        const runtimePath = fallbackPath || getXPath(node);
        if (!(node instanceof Node)) return this._resolveSourceSelectionPath(runtimePath, '');
        const ti = this._findSelectionTemplateInstance(node);
        if (!ti) return this._resolveSourceSelectionPath(runtimePath, '');
        const localPath = this._getPathInTemplateInstance(ti, node);
        const tplContent = ti?.tpl?.tpl?.content;
        if (!Array.isArray(localPath) || !tplContent?.childNodes) {
            return this._resolveSourceSelectionPath(runtimePath, '');
        }
        const sourceNode = this._findNodeByIndexes({ childNodes: tplContent.childNodes }, localPath);
        const templatePath = sourceNode ? getXPath(sourceNode) : '';
        return this._resolveSourceSelectionPath(runtimePath, templatePath);
    }

    _findSelectionTemplateInstance(node) {
        let n = node;
        while (n) {
            const ti = n?._item?._ti || null;
            if (ti) return ti;
            n = n.parentNode instanceof DocumentFragment ? n.parentNode.host : n.parentNode;
        }
        return null;
    }

    _getPathInTemplateInstance(ti, node) {
        if (!ti || !node) return null;
        const roots = Array.isArray(ti._nodes) ? ti._nodes : [];
        if (!roots.length) return null;
        const rootSet = new Set(roots);
        const path = [];
        let current = node;
        while (current) {
            if (rootSet.has(current)) {
                path.unshift(roots.indexOf(current));
                return path;
            }
            const parent = current.parentNode;
            if (!parent?.childNodes) return null;
            const index = [...parent.childNodes].indexOf(current);
            if (index < 0) return null;
            path.unshift(index);
            current = parent;
        }
        return null;
    }

    _findNodeByIndexes(root, indexes) {
        let node = root;
        for (const idx of indexes || []) {
            if (!node?.childNodes) return null;
            node = node.childNodes[idx];
            if (!node) return null;
        }
        return node;
    }

    _rebuildRuntimeFromTemplate(preferSource = false) {
        const form = this.editForm;
        const root = form?.root;
        const host = root?.host || form;
        const currentTi = host?._ti;
        let template = currentTi?.tpl;
        if (preferSource && this.sourceTplRoot instanceof HTMLTemplateElement) {
            try {
                template = new Template(this.sourceTplRoot.cloneNode(true));
            } catch (_err) {
                // fallback to current runtime template
            }
        }
        if (!root || !host || !template) return false;
        try {
            currentTi.detach?.();
            const nextTi = new TemplateInstance(template);
            host._ti = nextTi;
            nextTi.attach(root, undefined, host);
            this.domRoot = root;
            this.tplRoot = host?._ti?.tpl?.tpl || this.tplRoot;
            return true;
        } catch (_err) {
            return false;
        }
    }

}

document.head.insertAdjacentHTML("beforeend",
    `<!--suppress CssUnresolvedCustomProperty -->
        <style component="editor">
            body {
                --editor-right-width: 300px;
                --editor-left-width: 300px;
                --editor-panel-rail-width: 40px;
                --editor-toolbar-height: 56px;
            }
            body.editor-opened {                        
                padding-top: var(--editor-toolbar-height);
                padding-right: var(--editor-right-width-current, var(--editor-right-width));
                padding-left: var(--editor-left-width-current, var(--editor-left-width));
                box-sizing: border-box;
            }
        </style>
    `);
customElements.define('pl-editor-main', EditorMain);
