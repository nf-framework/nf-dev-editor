import { PlElement, html, css } from "polylib";
import "@plcmp/pl-input";
import "@plcmp/pl-combobox";
import "@plcmp/pl-checkbox";
import "@plcmp/pl-textarea";
import "@plcmp/pl-button";
import "@plcmp/pl-radio-group";
import "@plcmp/pl-radio-button";
import "/@editor/components/editor-iconset.js";

import { ChangePropertyCommand, ChangeAttributeCommand, ChangeTextNodeCommand } from "../lib/commands.js";
import { buildXPathCandidates, findByXpath, findByXpathWithFallback } from "../lib/common.js";
import Css from "../lib/css.js";

class PropsPanel extends PlElement {
    static get properties() {
        return {
            data: { type: Array, value: () => [],  observer: '_dataObserver' },
            groups: { type: Array, value: () => [], observer: '_groupsObserver' },
            bindItems: { type: Array, value: () => [], observer: '_bindItemsObserver' },
            selectedTag: { type: String, value: '' },
            selected: { type: String, observer: '_selectedChange' },
            selectedSourcePath: { type: String, value: '', observer: '_selectedSourcePathChange' },
            fwt: { type: Object },
            domRoot: { type: Object, observer: '_rootsChanged' },
            tplRoot: { type: Object, observer: '_rootsChanged' },
            sourceTplRoot: { type: Object, observer: '_rootsChanged' },
            panelTitle: { type: String, value: 'Свойства компонента' },
            panelDescription: { type: String, value: 'Выберите элемент на форме для редактирования свойств.' },
            activeTab: { type: String, value: 'properties' },
            hasSelectedElement: { type: Boolean, value: false },
            classDraft: { type: String, value: '' },
            classTokens: { type: Array, value: () => [] },
            classBindingValue: { type: String, value: '' },
            cssRuleItems: { type: Array, value: () => [] },
            eventItems: { type: Array, value: () => [], observer: '_eventItemsObserver' }
        }
    }

    static get css() {
        return css`
            :host {
                display: block;
                width: 100%;
                overflow: auto;
                box-sizing: border-box;
                padding: 8px;
                background: var(--pl-grey-lightest);
            }

            :host [hidden] {
                display: none !important;
            }

            .panel-head {
                position: sticky;
                top: 0;
                z-index: 2;
                background: var(--pl-grey-lightest);
                border: 1px solid var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                padding: 10px 12px;
                margin-bottom: 8px;
            }

            .panel-title {
                font: var(--pl-header-font);
                color: var(--pl-header-color);
                margin: 0;
            }

            .panel-description {
                margin-top: 4px;
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
            }

            .panel-tabs {
                margin-top: 8px;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 6px;
                align-items: stretch;
            }

            .tab-wrap {
                min-width: 0;
                display: block;
            }

            .tab-wrap pl-button {
                width: 100%;
                --pl-base-size: 28px;
            }

            .group {
                display: flex;
                flex-direction: column;
                width: 100%;
                border: 1px solid var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                background: var(--pl-background-color);
                box-sizing: border-box;
                margin-bottom: 8px;
                overflow: hidden;
            }

            .group-head {
                padding: 8px 12px;
                border-bottom: 1px solid var(--pl-grey-light);
                background: var(--pl-grey-lightest);
            }

            .group-title {
                font: var(--pl-header-font);
                color: var(--pl-header-color);
            }

            .group-description {
                margin-top: 4px;
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
            }

            .group-body {
                padding: 8px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .prop-item {
                border: 1px solid var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                padding: 8px;
                box-sizing: border-box;
                background: var(--pl-background-color);
            }

            .prop-meta {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 4px;
            }

            .prop-label {
                font: var(--pl-header-font);
                color: var(--pl-header-color);
            }

            .prop-name {
                font: var(--pl-text-font);
                color: var(--pl-grey-dark);
                font-size: 11px;
            }

            .prop-help {
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
                margin-bottom: 6px;
            }

            .boolean-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }

            .boolean-meta {
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 1 1 auto;
            }

            .prop-item.boolean {
                padding: 10px 12px;
            }

            .prop-item.boolean .prop-help {
                margin: 6px 0 0;
            }

            pl-input {
                --content-width: 100%;
            }

            pl-combobox {
                width: 100%;
                min-width: 0;
            }

            pl-textarea {
                --pl-content-width: 100%;
                --pl-textarea-content-height: 72px;
            }

            pl-radio-group {
                width: 100%;
                --pl-content-width: 100%;
            }

            .meta-row {
                border: 1px solid var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                padding: 8px;
                box-sizing: border-box;
                background: var(--pl-background-color);
            }

            .meta-row-head {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 4px;
            }

            .meta-row-name {
                font: var(--pl-header-font);
                color: var(--pl-header-color);
                word-break: break-word;
            }

            .meta-row-kind {
                font: var(--pl-text-font);
                color: var(--pl-grey-dark);
                font-size: 11px;
                flex-shrink: 0;
            }

            .meta-row-value {
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
                white-space: pre-wrap;
                word-break: break-word;
                line-height: 1.3;
            }

            .class-token-list {
                margin-top: 8px;
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .class-token {
                display: inline-flex;
                align-items: center;
                min-height: 24px;
                padding: 0 4px 0 8px;
                border: 1px solid var(--pl-grey-light);
                border-radius: 11px;
                background: var(--pl-grey-lightest);
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
                line-height: 1;
                gap: 4px;
            }

            .class-editor-row {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .class-editor-row pl-input {
                flex: 1;
            }

            .class-token-remove {
                min-width: 20px;
                --pl-base-size: 20px;
            }

            .event-row-head {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: 8px;
                margin-bottom: 6px;
            }

            .event-row-controls {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .event-link,
            .bind-link,
            .prop-link {
                --pl-base-size: 24px;
            }
        `;
    }

    static get template() {
        return html`
            <div class="panel-head">
                <div class="panel-title">[[panelTitle]]</div>
                <div class="panel-description">[[panelDescription]]</div>
                <div class="panel-tabs">
                    <div class="tab-wrap">
                        <pl-button label="Свойства" data-tab="properties" variant="[[_tabVariant(activeTab,'properties')]]" on-click="[[onTabClick]]"></pl-button>
                    </div>
                    <div class="tab-wrap">
                        <pl-button label="Классы" data-tab="classes" variant="[[_tabVariant(activeTab,'classes')]]" on-click="[[onTabClick]]"></pl-button>
                    </div>
                    <div class="tab-wrap">
                        <pl-button label="События" data-tab="events" variant="[[_tabVariant(activeTab,'events')]]" on-click="[[onTabClick]]"></pl-button>
                    </div>
                </div>
            </div>

            <div hidden$="[[!_isTab(activeTab,'properties')]]">
                <template d:repeat="{{groups}}">
                    <section class="group">
                        <div class="group-head">
                            <div class="group-title">[[item.title]]</div>
                            <div class="group-description" hidden$="[[!item.description]]">[[item.description]]</div>
                        </div>

                        <div class="group-body">
                            <template d:repeat="{{item.items}}">
                                <template d:if="[[_isEditor(item,'boolean')]]" d:restamp>
                                    <div class="prop-item boolean">
                                        <div class="boolean-row">
                                            <div class="boolean-meta">
                                                <template d:if="[[item.boundExpression]]" d:restamp>
                                                    <pl-button
                                                        class="prop-link"
                                                        variant="link"
                                                        label="[[item.label]]"
                                                        data-value="[[item.value]]"
                                                        on-click="[[onBindingClick]]"></pl-button>
                                                </template>
                                                <template d:if="[[!item.boundExpression]]" d:restamp>
                                                    <div class="prop-label">[[item.label]]</div>
                                                </template>
                                                <div class="prop-name">[[item.name]]</div>
                                            </div>
                                            <pl-checkbox
                                                checked="{{item.value}}"
                                                disabled$="[[item.readonly]]"></pl-checkbox>
                                        </div>
                                        <div class="prop-help" hidden$="[[!item.description]]">[[item.description]]</div>
                                    </div>
                                </template>

                                <template d:if="[[!_isEditor(item,'boolean')]]" d:restamp>
                                    <div class="prop-item">
                                        <div class="prop-meta">
                                            <template d:if="[[item.boundExpression]]" d:restamp>
                                                <pl-button
                                                    class="prop-link"
                                                    variant="link"
                                                    label="[[item.label]]"
                                                    data-value="[[item.value]]"
                                                    on-click="[[onBindingClick]]"></pl-button>
                                            </template>
                                            <template d:if="[[!item.boundExpression]]" d:restamp>
                                                <div class="prop-label">[[item.label]]</div>
                                            </template>
                                            <div class="prop-name">[[item.name]]</div>
                                        </div>
                                        <div class="prop-help" hidden$="[[!item.description]]">[[item.description]]</div>

                                        <template d:if="[[_isEditor(item,'text')]]" d:restamp>
                                            <pl-input
                                                value="{{item.value}}"
                                                placeholder="[[item.placeholder]]"
                                                title="[[_getTitle(item.currentValue)]]"
                                                disabled$="[[item.readonly]]"
                                                stretch></pl-input>
                                        </template>

                                        <template d:if="[[_isEditor(item,'number')]]" d:restamp>
                                            <pl-input
                                                value="{{item.value}}"
                                                type="number"
                                                placeholder="[[item.placeholder]]"
                                                title="[[_getTitle(item.currentValue)]]"
                                                disabled$="[[item.readonly]]"
                                                stretch></pl-input>
                                        </template>

                                        <template d:if="[[_isEditor(item,'textarea')]]" d:restamp>
                                            <pl-textarea
                                                value="{{item.value}}"
                                                placeholder="[[item.placeholder]]"
                                                title="[[_getTitle(item.currentValue)]]"
                                                disabled$="[[item.readonly]]"
                                                hide-resizer
                                                stretch></pl-textarea>
                                        </template>

                                        <template d:if="[[_isEditor(item,'select')]]" d:restamp>
                                            <pl-combobox
                                                data="[[item.options]]"
                                                text-property="text"
                                                value-property="value"
                                                value="{{item.value}}"
                                                disabled$="[[item.readonly]]"
                                                stretch></pl-combobox>
                                        </template>

                                        <template d:if="[[_isEditor(item,'icon-group')]]" d:restamp>
                                            <pl-radio-group
                                                selected="{{item.value}}"
                                                disabled$="[[item.readonly]]">
                                                <template d:repeat="{{item.iconOptions}}" d:as="opt">
                                                    <pl-radio-button
                                                        name="[[opt.value]]"
                                                        label="[[opt.text]]"
                                                        title="[[opt.title]]"
                                                        icon="[[opt.icon]]"
                                                        iconset="[[opt.iconset]]"
                                                        icon-size="14">
                                                    </pl-radio-button>
                                                </template>
                                            </pl-radio-group>
                                        </template>
                                    </div>
                                </template>
                            </template>
                        </div>
                    </section>
                </template>

                <section class="group" hidden$="[[_isEmpty(bindItems)]]">
                    <div class="group-head">
                        <div class="group-title">Бинды</div>
                        <div class="group-description">Атрибуты и текст выбранного элемента. Можно редактировать bind-выражения и обычный текст.</div>
                    </div>
                    <div class="group-body">
                        <template d:repeat="{{bindItems}}">
                            <div class="meta-row">
                                <div class="meta-row-head">
                                    <template d:if="[[_isBindExpression(item.value)]]" d:restamp>
                                        <pl-button
                                            class="bind-link"
                                            variant="link"
                                            label="[[item.name]]"
                                            data-value="[[item.value]]"
                                            on-click="[[onBindingClick]]"></pl-button>
                                    </template>
                                    <template d:if="[[!_isBindExpression(item.value)]]" d:restamp>
                                        <div class="meta-row-name">[[item.name]]</div>
                                    </template>
                                    <div class="meta-row-kind">[[item.kind]]</div>
                                </div>
                                <pl-input
                                    hidden$="[[_isLongText(item.value)]]"
                                    value="{{item.value}}"
                                    stretch></pl-input>
                                <pl-textarea
                                    hidden$="[[!_isLongText(item.value)]]"
                                    value="{{item.value}}"
                                    hide-resizer
                                    stretch></pl-textarea>
                            </div>
                        </template>
                    </div>
                </section>
            </div>

            <div hidden$="[[!_isTab(activeTab,'classes')]]">
                <section class="group" hidden$="[[!hasSelectedElement]]">
                    <div class="group-head">
                        <div class="group-title">Применённые CSS-правила</div>
                        <div class="group-description">Селекторы, которые реально матчятся для выбранного элемента. Здесь же можно добавить класс.</div>
                    </div>
                    <div class="group-body">
                        <div class="meta-row" hidden$="[[!classBindingValue]]">
                            <div class="meta-row-head">
                                <div class="meta-row-name">class</div>
                                <div class="meta-row-kind">binding</div>
                            </div>
                            <div class="meta-row-value">[[classBindingValue]]</div>
                        </div>

                        <div class="prop-item" hidden$="[[classBindingValue]]">
                            <div class="class-editor-row">
                                <pl-input value="{{classDraft}}" placeholder="Добавить класс" stretch></pl-input>
                                <pl-button variant="ghost" label="Добавить класс" on-click="[[onAddClassTokenClick]]"></pl-button>
                            </div>
                            <div class="class-token-list" hidden$="[[_isEmpty(classTokens)]]">
                                <template d:repeat="{{classTokens}}">
                                    <span class="class-token">
                                        <span>[[item]]</span>
                                        <pl-button class="class-token-remove" variant="link" label="×" data-token="[[item]]" on-click="[[onRemoveClassTokenClick]]"></pl-button>
                                    </span>
                                </template>
                            </div>
                        </div>

                        <template d:repeat="{{cssRuleItems}}">
                            <div class="meta-row">
                                <div class="meta-row-head">
                                    <pl-button class="meta-row-name" variant="link" label="[[item.selector]]" data-selector="[[item.selector]]" on-click="[[onCssRuleClick]]"></pl-button>
                                    <div class="meta-row-kind">[[item.origin]]</div>
                                </div>
                                <div class="meta-row-value">[[item.declarations]]</div>
                            </div>
                        </template>

                        <div class="meta-row" hidden$="[[!_isEmpty(cssRuleItems)]]">
                            <div class="meta-row-value">Для этого элемента пока нет совпавших CSS-правил.</div>
                        </div>
                    </div>
                </section>
            </div>

            <div hidden$="[[!_isTab(activeTab,'events')]]">
                <section class="group" hidden$="[[!hasSelectedElement]]">
                    <div class="group-head">
                        <div class="group-title">События</div>
                        <div class="group-description">Обработчики событий вида <code>on-*</code> у выбранного элемента.</div>
                    </div>
                    <div class="group-body">
                        <template d:repeat="{{eventItems}}">
                            <div class="prop-item">
                                <div class="event-row-head">
                                    <pl-button
                                        class="event-link"
                                        variant="link"
                                        label="[[item.label]]"
                                        data-method="[[item.methodName]]"
                                        disabled$="[[!item.methodName]]"
                                        on-click="[[onEventLabelClick]]"></pl-button>
                                    <div class="event-row-controls">
                                        <div class="prop-name">[[item.name]]</div>
                                        <pl-button class="class-token-remove" variant="link" label="×" data-event="[[item.name]]" on-click="[[onRemoveEventClick]]"></pl-button>
                                    </div>
                                </div>
                                <pl-input value="{{item.value}}" placeholder="Например onClick" stretch></pl-input>
                            </div>
                        </template>
                        <div class="meta-row" hidden$="[[!_isEmpty(eventItems)]]">
                            <div class="meta-row-value">У выбранного элемента нет атрибутов событий on-*.</div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    constructor() {
        super();
        this._css = new Css();
        this._cssRulesFrame = 0;
        this._selectionSyncInProgress = false;
        this._updatingSelectedSourcePath = false;
    }

    _getTitle(title) {
        try {
            return JSON.stringify(title);
        } catch {
            return String(title ?? '');
        }
    }

    _selectedChange(path) {
        if (this._selectionSyncInProgress) return;
        this._selectionSyncInProgress = true;
        try {
            if (path) {
                const { tplNode, domNode, sourceNode, sourcePath, sourceExactPath } = this._resolveSelectedNodes(path);
                const activeNode = sourceNode || tplNode || domNode;
                this.selectedTag = domNode?.localName || tplNode?.localName || '';
                let nextSourcePath = sourcePath || path;
                const currentSourcePath = String(this.selectedSourcePath || '').trim();
                if (currentSourcePath && !sourceExactPath) {
                    // Не переписываем путь точного выбора из дерева на fallback-предка.
                    nextSourcePath = currentSourcePath;
                }
                if (this.selectedSourcePath !== nextSourcePath) {
                    this._updatingSelectedSourcePath = true;
                    this.selectedSourcePath = nextSourcePath;
                    this._updatingSelectedSourcePath = false;
                }
                this.data = this.fwt.getProperties(domNode, tplNode);
                this.bindItems = this._collectBindItems(activeNode, this.data);
                this.eventItems = this._collectEventItems(activeNode);
                this.hasSelectedElement = activeNode instanceof Element;
                this._setClassTokensFromNode(activeNode);
                this._setCssRulesFromNode(domNode || activeNode);
                this.classDraft = '';
            } else {
                this.data = [];
                this.bindItems = [];
                this.eventItems = [];
                this.selectedTag = '';
                if (this.selectedSourcePath) {
                    this._updatingSelectedSourcePath = true;
                    this.selectedSourcePath = '';
                    this._updatingSelectedSourcePath = false;
                }
                this.hasSelectedElement = false;
                this.classDraft = '';
                this.classTokens = [];
                this.classBindingValue = '';
                this.cssRuleItems = [];
            }
            this._syncPanelMeta();
            this._buildGroups(this.data);
        } finally {
            this._selectionSyncInProgress = false;
        }
    }

    _rootsChanged() {
        if (this.selected) this._selectedChange(this.selected);
    }

    _selectedSourcePathChange(newPath, oldPath) {
        if (this._updatingSelectedSourcePath) return;
        if (this._selectionSyncInProgress) return;
        if (!this.selected) return;
        const next = String(newPath || '').trim();
        const prev = String(oldPath || '').trim();
        if (!next || next === prev) return;
        this._selectedChange(this.selected);
    }

    _resolveSelectedNodes(path) {
        const resolveExact = (root, xpath, origTpl) => {
            if (!root || !xpath) return { node: null, path: null };
            const candidates = buildXPathCandidates(xpath);
            for (const candidate of candidates) {
                const node = findByXpath(root, candidate, origTpl);
                if (node) return { node, path: candidate };
            }
            return { node: null, path: null };
        };

        const sourceLookupPath = this.selectedSourcePath || path;
        const strictSelection = Boolean(this.selectedSourcePath);
        const sourceExact = resolveExact(this.sourceTplRoot, sourceLookupPath, true);
        const sourceResolved = sourceExact.node
            ? sourceExact
            : (strictSelection ? { node: null, path: sourceLookupPath } : findByXpathWithFallback(this.sourceTplRoot, sourceLookupPath, true));
        const domExact = resolveExact(this.domRoot, path, false);
        const domResolved = domExact.node
            ? domExact
            : ((strictSelection || sourceResolved.node) ? { node: null, path: null } : findByXpathWithFallback(this.domRoot, path));
        let domNode = domResolved.node;
        const runtimeTplExact = resolveExact(this.tplRoot, path, true);
        const runtimeTplResolved = runtimeTplExact.node
            ? runtimeTplExact
            : (strictSelection ? { node: null, path } : findByXpathWithFallback(this.tplRoot, path, true));
        const sourceNode = sourceResolved.node;
        const runtimeTplNode = runtimeTplResolved.node;
        let tplNode = sourceNode || runtimeTplNode;

        if (!strictSelection && domNode?.localName && tplNode?.localName && domNode.localName !== tplNode.localName) {
            const sourceByRuntime = resolveExact(this.sourceTplRoot, path, true).node;
            const runtimeBySource = resolveExact(this.tplRoot, sourceLookupPath, true).node;
            const compatible = [sourceByRuntime, runtimeBySource, runtimeTplNode, sourceNode]
                .find((n) => n?.localName === domNode.localName);
            if (compatible) tplNode = compatible;
        }

        if (!strictSelection && domNode?.localName && tplNode?.localName && domNode.localName !== tplNode.localName) {
            const nested = domNode.querySelector?.(tplNode.localName);
            if (nested) domNode = nested;
        }

        return {
            domNode,
            sourceNode,
            tplNode,
            sourcePath: sourceExact.path || sourceResolved.path || runtimeTplResolved.path || domResolved.path || path,
            sourceExactPath: sourceExact.path || ''
        };
    }

    _dataObserver(newVal, oldVal, mut) {
        if (!mut || mut.init || mut.path === 'data') {
            this._syncPanelMeta();
            this._buildGroups(newVal);
        }
    }

    _groupsObserver(newVal, oldVal, mut) {
        if (!mut || mut.init || mut.path === 'groups') return;
        const ref = this._resolveGroupItemByMutationPath(mut.path, newVal) || this._resolveGroupItemFallback(mut.path, newVal, mut.value);
        if (!ref) return;
        const { data } = ref;
        if (!data) return;
        const normalized = this._normalizeOutgoingValue(data, data.value);
        this.changeProp(data.cmp, data.name, normalized);
        this._buildGroups(this.data);
    }

    _resolveGroupItemByMutationPath(path, groups) {
        const parts = String(path || '').split('.').filter(Boolean);
        if (parts.length < 4) return null;

        const groupsPos = parts.indexOf('groups');
        if (groupsPos < 0) return null;
        const groupIndex = Number(parts[groupsPos + 1]);
        if (!Number.isFinite(groupIndex)) return null;

        const itemsPos = parts.indexOf('items', groupsPos + 2);
        if (itemsPos < 0) return null;
        const itemIndex = Number(parts[itemsPos + 1]);
        if (!Number.isFinite(itemIndex)) return null;

        const tail = parts.slice(itemsPos + 2);
        if (!tail.includes('value')) return null;

        const data = groups?.[groupIndex]?.items?.[itemIndex];
        if (!data) return null;
        return { groupIndex, itemIndex, data };
    }

    _resolveGroupItemFallback(path, groups, mutationValue) {
        const parts = String(path || '').split('.').filter(Boolean);
        const groupsPos = parts.indexOf('groups');
        if (groupsPos < 0) return null;
        const groupIndex = Number(parts[groupsPos + 1]);
        if (!Number.isFinite(groupIndex)) return null;
        const itemsPos = parts.indexOf('items', groupsPos + 2);
        if (itemsPos < 0) return null;
        const itemIndex = Number(parts[itemsPos + 1]);
        if (!Number.isFinite(itemIndex)) return null;

        let data = groups?.[groupIndex]?.items?.[itemIndex];
        if (!data && mutationValue && typeof mutationValue === 'object') {
            data = mutationValue;
        }
        if (!data || !('name' in data) || !('cmp' in data)) return null;
        return { groupIndex, itemIndex, data };
    }

    _bindItemsObserver(newVal, oldVal, mut) {
        if (!mut || mut.init || mut.path === 'bindItems') return;
        const m = mut.path.match(/^bindItems\.(\d+)\.value/);
        if (!m) return;

        const itemIndex = Number(m[1]);
        const item = newVal?.[itemIndex];
        if (!item) return;

        if (item.kind === 'attribute') {
            this.changeAttribute(item.name, item.value ?? '');
            if (item.name === 'class') {
                const nextClassValue = String(item.value ?? '').trim();
                const hasBinding = this._isBindExpression(nextClassValue);
                this.classBindingValue = hasBinding ? nextClassValue : '';
                this.classTokens = hasBinding ? [] : this._classTokens(nextClassValue);
                this._scheduleCssRulesRefresh();
            }
            return;
        }
        if (item.kind === 'text') {
            this.changeTextNode(item.textPath, item.value ?? '');
        }
    }

    _eventItemsObserver(newVal, oldVal, mut) {
        if (!mut || mut.init || mut.path === 'eventItems') return;
        const m = mut.path.match(/^eventItems\.(\d+)\.value/);
        if (!m) return;
        const itemIndex = Number(m[1]);
        const item = newVal?.[itemIndex];
        if (!item?.name) return;
        this.changeAttribute(item.name, item.value ?? '');
    }

    _isEditor(item, editor) {
        return (item?.editor || 'text') === editor;
    }

    _isTab(current, expected) {
        return String(current || 'properties') === String(expected || '');
    }

    _tabVariant(current, expected) {
        return this._isTab(current, expected) ? 'secondary' : 'link';
    }

    onTabClick(event) {
        const tab = String(event?.currentTarget?.dataset?.tab || '').trim();
        if (!tab) return;
        this.activeTab = tab;
    }

    _toIconOptions(options) {
        if (!Array.isArray(options)) return [];
        return options.map((opt) => ({
            value: String(opt?.value ?? ''),
            text: String(opt?.text ?? opt?.value ?? ''),
            icon: String(opt?.icon ?? ''),
            iconset: String(opt?.iconset ?? 'pl-editor'),
            title: String(opt?.title ?? opt?.text ?? opt?.value ?? '')
        }));
    }

    _isLongText(value) {
        const text = String(value ?? '');
        return text.length > 80 || text.includes('\n');
    }

    _isEmpty(list) {
        return !Array.isArray(list) || list.length === 0;
    }

    onAddClassTokenClick() {
        if (this.classBindingValue) return;
        const draft = String(this.classDraft || '').trim();
        if (!draft) return;
        const additions = draft.split(/\s+/).filter(Boolean);
        if (!additions.length) return;
        const next = Array.from(new Set([...(this.classTokens || []), ...additions]));
        this._applyClassTokens(next);
        this.classDraft = '';
    }

    onRemoveClassTokenClick(event) {
        if (this.classBindingValue) return;
        event?.stopPropagation?.();
        const token = String(
            event?.currentTarget?.dataset?.token
            || event?.currentTarget?.getAttribute?.('data-token')
            || event?.model?.item
            || event?.detail?.item
            || ''
        ).trim();
        if (!token) return;
        const next = (this.classTokens || []).filter((item) => item !== token);
        this._applyClassTokens(next);
    }

    onCssRuleClick(event) {
        const selector = String(
            event?.currentTarget?.dataset?.selector
            || event?.currentTarget?.getAttribute?.('data-selector')
            || event?.model?.item?.selector
            || event?.detail?.item?.selector
            || event?.currentTarget?.label
            || event?.currentTarget?.textContent
            || ''
        ).trim();
        if (!selector) return;
        const detail = { selector };
        this.dispatchEvent(new CustomEvent('open-css-rule', {
            detail,
            bubbles: true,
            composed: true
        }));
        window.dispatchEvent(new CustomEvent('nf-dev-editor-open-css-rule', { detail }));
    }

    onBindingClick(event) {
        const value = String(
            event?.currentTarget?.dataset?.value
            || event?.currentTarget?.getAttribute?.('data-value')
            || event?.model?.item?.value
            || event?.detail?.item?.value
            || ''
        ).trim();
        const target = this._extractBindingTarget(value);
        if (!target?.type || !target?.name) return;

        if (target.type === 'method') {
            const detail = { methodName: target.name };
            this.dispatchEvent(new CustomEvent('open-script-method', {
                detail,
                bubbles: true,
                composed: true
            }));
            window.dispatchEvent(new CustomEvent('nf-dev-editor-open-script-method', { detail }));
            return;
        }

        const detail = { propertyName: target.name };
        this.dispatchEvent(new CustomEvent('open-form-properties', {
            detail,
            bubbles: true,
            composed: true
        }));
        window.dispatchEvent(new CustomEvent('nf-dev-editor-open-form-properties', { detail }));
    }

    onEventLabelClick(event) {
        const methodName = String(
            event?.currentTarget?.dataset?.method
            || event?.currentTarget?.getAttribute?.('data-method')
            || event?.model?.item?.methodName
            || event?.detail?.item?.methodName
            || this._extractEventMethodName(event?.model?.item?.value || event?.detail?.item?.value || '')
            || ''
        ).trim();
        if (!methodName) return;
        const detail = { methodName };
        this.dispatchEvent(new CustomEvent('open-script-method', {
            detail,
            bubbles: true,
            composed: true
        }));
        window.dispatchEvent(new CustomEvent('nf-dev-editor-open-script-method', { detail }));
    }

    onRemoveEventClick(event) {
        const attrName = String(
            event?.currentTarget?.dataset?.event
            || event?.currentTarget?.getAttribute?.('data-event')
            || event?.model?.item?.name
            || event?.detail?.item?.name
            || ''
        ).trim();
        if (!attrName) return;
        const next = (this.eventItems || []).filter((item) => item?.name !== attrName);
        this.eventItems = next;
        this.changeAttribute(attrName, '');
    }

    _classTokens(value) {
        const text = String(value ?? '').trim();
        if (!text) return [];
        return text.split(/\s+/).filter(Boolean);
    }

    _setClassTokensFromNode(node) {
        if (!(node instanceof Element)) {
            this.classTokens = [];
            this.classBindingValue = '';
            return;
        }
        const classValue = String(node.getAttribute('class') ?? '').trim();
        const hasBinding = this._isBindExpression(classValue);
        this.classBindingValue = hasBinding ? classValue : '';
        this.classTokens = hasBinding ? [] : this._classTokens(classValue);
    }

    _applyClassTokens(tokens) {
        if (this.classBindingValue) return;
        const next = Array.from(new Set((Array.isArray(tokens) ? tokens : [])
            .map((item) => String(item || '').trim())
            .filter(Boolean)));
        this.classTokens = next;
        this.changeAttribute('class', next.join(' '));
        this._scheduleCssRulesRefresh();
    }

    _isBindExpression(value) {
        return typeof value === 'string' && /({{.*}}|\[\[.*]])/.test(value);
    }

    _setCssRulesFromNode(node) {
        if (!(node instanceof Element)) {
            this.cssRuleItems = [];
            return;
        }
        const rules = this._css?.getRules?.(node) || [];
        this.cssRuleItems = rules.map((rule, idx) => ({
            id: `${idx}`,
            selector: String(rule?.selectorText || ''),
            origin: this._resolveRuleOrigin(rule),
            declarations: this._formatRuleDeclarations(rule)
        }));
    }

    _resolveRuleOrigin(rule) {
        const href = rule?.parentStyleSheet?.href;
        if (href) {
            try {
                const url = new URL(href, window.location.origin);
                const file = url.pathname.split('/').filter(Boolean).pop();
                return file || url.pathname || href;
            } catch (_err) {
                return href;
            }
        }
        const ownerNode = rule?.parentStyleSheet?.ownerNode;
        if (ownerNode instanceof Element) {
            const marker = ownerNode.getAttribute('component') || ownerNode.getAttribute('data-dev-editor-preview-style');
            if (marker) return `style[${marker}]`;
        }
        return 'inline stylesheet';
    }

    _formatRuleDeclarations(rule) {
        const selector = String(rule?.selectorText || '').trim();
        let cssText = String(rule?.cssText || '').trim();
        if (!cssText) return '';
        if (selector && cssText.startsWith(selector)) {
            cssText = cssText.slice(selector.length).trim();
        }
        return cssText.replace(/\s+/g, ' ');
    }

    _scheduleCssRulesRefresh() {
        if (this._cssRulesFrame) cancelAnimationFrame(this._cssRulesFrame);
        this._cssRulesFrame = requestAnimationFrame(() => {
            this._cssRulesFrame = 0;
            if (!this.selected) return;
            const { domNode, tplNode, sourceNode } = this._resolveSelectedNodes(this.selected);
            this._setCssRulesFromNode(domNode || sourceNode || tplNode);
        });
    }

    _collectBindItems(tplNode, properties) {
        if (!(tplNode instanceof Element)) return [];
        const result = [];
        const nodeLabel = this._getNodeBindLabel(tplNode);
        const configuredProps = new Set((Array.isArray(properties) ? properties : [])
            .map((item) => String(item?.name || '').trim())
            .filter(Boolean));
        const toCamel = (name) => String(name || '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        const normalizeAttrToProp = (name) => toCamel(String(name || '').replace(/\$$/, ''));

        [...tplNode.attributes].forEach((attr) => {
            const attrName = String(attr?.name || '');
            if (attrName.startsWith('on-')) return;
            const value = attr.value ?? '';
            if (attrName === 'class') {
                if (this._isBindExpression(value)) {
                    result.push({
                        kind: 'attribute',
                        name: attrName,
                        value
                    });
                }
                return;
            }
            const propLikeName = normalizeAttrToProp(attr.name);
            if (configuredProps.has(propLikeName)) return;
            result.push({
                kind: 'attribute',
                name: attr.name,
                value
            });
        });

        let textIndex = 0;
        [...(tplNode.childNodes || [])].forEach((child, childIndex) => {
            if (child.nodeType !== Node.TEXT_NODE) return;
            const text = String(child.textContent || '');
            if (!text.trim()) return;
            textIndex += 1;
            result.push({
                kind: 'text',
                name: `${nodeLabel} · текст ${textIndex}`,
                value: text,
                textPath: [childIndex]
            });
        });

        return result;
    }

    _collectEventItems(tplNode) {
        if (!(tplNode instanceof Element)) return [];
        const attrs = [...tplNode.attributes]
            .filter((attr) => String(attr?.name || '').startsWith('on-'));
        return attrs.map((attr) => ({
            name: String(attr.name || ''),
            label: String(attr.name || '').replace(/^on-/, ''),
            value: String(attr.value ?? ''),
            methodName: this._extractEventMethodName(attr.value)
        }));
    }

    _extractEventMethodName(rawValue) {
        const text = String(rawValue ?? '').trim();
        if (!text) return '';
        const unwrapped = text
            .replace(/^\[\[\s*/, '')
            .replace(/\s*\]\]$/, '')
            .replace(/^\{\{\s*/, '')
            .replace(/\s*\}\}$/, '')
            .trim();
        const match = unwrapped.match(/^([A-Za-z_$][\w$]*)/);
        return match?.[1] || '';
    }

    _extractBindingTarget(rawValue) {
        const text = String(rawValue ?? '').trim();
        if (!text) return null;
        const unwrapped = text
            .replace(/^\[\[\s*/, '')
            .replace(/\s*\]\]$/, '')
            .replace(/^\{\{\s*/, '')
            .replace(/\s*\}\}$/, '')
            .trim();
        if (!unwrapped) return null;

        const methodMatch = unwrapped.match(/^([A-Za-z_$][\w$]*)\s*\(/);
        if (methodMatch?.[1]) return { type: 'method', name: methodMatch[1] };

        const propMatch = unwrapped.match(/^([A-Za-z_$][\w$]*)/);
        if (propMatch?.[1]) return { type: 'property', name: propMatch[1] };

        return null;
    }

    _getNodeBindLabel(node) {
        if (!(node instanceof Element)) return 'element';
        const tag = String(node.localName || node.nodeName || 'element').toLowerCase();
        const className = String(node.getAttribute?.('class') || '').trim().split(/\s+/).filter(Boolean)[0];
        return className ? `${tag}.${className}` : tag;
    }


    _normalizeOutgoingValue(item, value) {
        if (!item) return value;
        if (item.editor === 'boolean' || item.propType === 'Boolean') return this._normalizeBooleanValue(value);
        if (item.editor === 'icon-group') return value === undefined || value === null ? '' : String(value);
        if (item.editor === 'number' || item.propType === 'Number') {
            if (value === '' || value === null || value === undefined) return '';
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : value;
        }
        return value;
    }

    _normalizeBooleanValue(value) {
        if (value === true || value === false) return value;
        if (typeof value === 'number') return value !== 0;
        const normalized = String(value ?? '').trim().toLowerCase();
        if (['1', 'true', 't', 'yes', 'y', 'on', 'да'].includes(normalized)) return true;
        if (['0', 'false', 'f', 'no', 'n', 'off', 'нет', ''].includes(normalized)) return false;
        return Boolean(value);
    }

    _syncPanelMeta() {
        const first = Array.isArray(this.data) && this.data.length > 0 ? this.data[0] : null;
        const tag = this.selectedTag ? `<${this.selectedTag}>` : '';
        this.panelTitle = first?.componentTitle || (tag ? `Элемент ${tag}` : 'Свойства компонента');
        this.panelDescription = first?.componentDescription || (tag
            ? 'Свойства, бинды и стили выбранного элемента.'
            : 'Выберите элемент на форме для редактирования свойств.');
    }

    _buildGroups(data) {
        const list = Array.isArray(data) ? data : [];
        const map = new Map();
        const valuesMap = new Map();

        list.forEach((prop) => valuesMap.set(prop?.name, prop?.value));

        list.forEach((prop) => {
            if (this._isClassProp(prop)) return;
            if (!this._isPropertyVisible(prop, valuesMap)) return;
            const groupId = prop.groupId || 'common';
            if (!map.has(groupId)) {
                map.set(groupId, {
                    id: groupId,
                    title: prop.group || 'Свойства',
                    description: prop.groupDescription || '',
                    order: Number.isFinite(prop.groupOrder) ? prop.groupOrder : 1000,
                    items: []
                });
            }
            map.get(groupId).items.push(prop);
        });

        const groups = Array.from(map.values());
        groups.forEach((group) => {
            group.items.forEach((prop) => {
                prop.iconOptions = prop.editor === 'icon-group'
                    ? this._toIconOptions(prop.options)
                    : [];
            });
            group.items.sort((a, b) => {
                const ao = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
                const bo = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
                if (ao !== bo) return ao - bo;
                return String(a.label || a.name).localeCompare(String(b.label || b.name));
            });
        });

        groups.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return String(a.title).localeCompare(String(b.title));
        });

        this.groups = groups;
    }

    _isClassProp(prop) {
        return String(prop?.name || '').trim() === 'class';
    }

    _isPropertyVisible(prop, valuesMap) {
        const condition = prop?.visibleWhen;
        if (!condition) return true;
        if (Array.isArray(condition)) {
            return condition.every((item) => this._checkVisibleCondition(item, valuesMap));
        }
        if (Array.isArray(condition?.allOf)) {
            return condition.allOf.every((item) => this._checkVisibleCondition(item, valuesMap));
        }
        if (Array.isArray(condition?.anyOf)) {
            return condition.anyOf.some((item) => this._checkVisibleCondition(item, valuesMap));
        }
        return this._checkVisibleCondition(condition, valuesMap);
    }

    _checkVisibleCondition(condition, valuesMap) {
        if (!condition || typeof condition !== 'object') return true;
        const propName = String(condition.prop || condition.property || condition.name || '');
        if (!propName) return true;
        const sourceValue = valuesMap.get(propName);
        if (typeof sourceValue === 'string' && /({{.*}}|\[\[.*]])/.test(sourceValue)) {
            return true;
        }
        const value = this._normalizeConditionValue(sourceValue);

        if ('equals' in condition) {
            return value === this._normalizeConditionValue(condition.equals);
        }

        if ('notEquals' in condition) {
            return value !== this._normalizeConditionValue(condition.notEquals);
        }

        if (Array.isArray(condition.in)) {
            return condition.in.map((item) => this._normalizeConditionValue(item)).includes(value);
        }

        if (Array.isArray(condition.notIn)) {
            return !condition.notIn.map((item) => this._normalizeConditionValue(item)).includes(value);
        }

        if ('truthy' in condition) {
            return Boolean(value) === Boolean(condition.truthy);
        }

        if ('exists' in condition) {
            const exists = value !== undefined && value !== null && value !== '';
            return Boolean(condition.exists) ? exists : !exists;
        }

        return true;
    }

    _normalizeConditionValue(value) {
        if (typeof value !== 'string') return value;
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
        return value;
    }

    changeProp(instance, name, value, commit) {
        let cmd = {
            path: this.selected,
            sourcePath: this.selectedSourcePath || this.selected,
            property: name,
            value,
            commit
        }
        window.dispatchEvent(new CustomEvent('command', { detail: new ChangePropertyCommand(cmd) }));
    }

    changeAttribute(name, value) {
        if (!this.selected || !name) return;
        let cmd = {
            path: this.selected,
            sourcePath: this.selectedSourcePath || this.selected,
            attribute: name,
            value
        };
        window.dispatchEvent(new CustomEvent('command', { detail: new ChangeAttributeCommand(cmd) }));
    }

    changeTextNode(textPath, value) {
        if (!this.selected || !Array.isArray(textPath)) return;
        let cmd = {
            path: this.selected,
            sourcePath: this.selectedSourcePath || this.selected,
            textPath,
            value
        };
        window.dispatchEvent(new CustomEvent('command', { detail: new ChangeTextNodeCommand(cmd) }));
    }
}

customElements.define('pl-props-panel', PropsPanel);
