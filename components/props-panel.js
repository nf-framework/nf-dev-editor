import { PlElement, html, css } from "polylib";
import "@plcmp/pl-input";
import "@plcmp/pl-combobox";
import "@plcmp/pl-checkbox";
import "@plcmp/pl-textarea";
import "@plcmp/pl-button";
import "./pl-button-group.js";

import { ChangePropertyCommand, ChangeAttributeCommand, ChangeTextNodeCommand } from "../lib/commands.js";
import {findByXpath} from "../lib/common.js";
import Css from "../lib/css.js";

class PropsPanel extends PlElement {
    static get properties() {
        return {
            data: { type: Array, value: () => [],  observer: '_dataObserver' },
            groups: { type: Array, value: () => [], observer: '_groupsObserver' },
            bindItems: { type: Array, value: () => [], observer: '_bindItemsObserver' },
            styleItems: { type: Array, value: () => [], observer: '_styleItemsObserver' },
            styleRules: { type: Array, value: () => [] },
            columnItems: { type: Array, value: () => [] },
            selectedTag: { type: String, value: '' },
            selected: { type: String, observer: '_selectedChange' },
            fwt: { type: Object },
            domRoot: { type: Object, observer: '_rootsChanged' },
            tplRoot: { type: Object, observer: '_rootsChanged' },
            sourceTplRoot: { type: Object, observer: '_rootsChanged' },
            panelTitle: { type: String, value: 'Свойства компонента' },
            panelDescription: { type: String, value: 'Выберите элемент на форме для редактирования свойств.' }
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

            pl-input {
                --content-width: 100%;
            }

            pl-combobox {
                --pl-content-width: 100%;
            }

            pl-textarea {
                --pl-content-width: 100%;
                --pl-textarea-content-height: 72px;
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
        `;
    }

    static get template() {
        return html`
            <div class="panel-head">
                <div class="panel-title">[[panelTitle]]</div>
                <div class="panel-description">[[panelDescription]]</div>
            </div>

            <template d:repeat="{{groups}}">
                <section class="group">
                    <div class="group-head">
                        <div class="group-title">[[item.title]]</div>
                        <div class="group-description" hidden$="[[!item.description]]">[[item.description]]</div>
                    </div>

                    <div class="group-body">
                        <template d:repeat="{{item.items}}">
                            <div class="prop-item">
                                <div class="prop-meta">
                                    <div class="prop-label">[[item.label]]</div>
                                    <div class="prop-name">[[item.name]]</div>
                                </div>
                                <div class="prop-help" hidden$="[[!item.description]]">[[item.description]]</div>

                                <pl-input
                                    hidden$="[[!_isEditor(item,'text')]]"
                                    value="{{item.value}}"
                                    placeholder="[[item.placeholder]]"
                                    title="[[_getTitle(item.currentValue)]]"
                                    disabled$="[[item.readonly]]"
                                    stretch></pl-input>

                                <pl-input
                                    hidden$="[[!_isEditor(item,'number')]]"
                                    value="{{item.value}}"
                                    type="number"
                                    placeholder="[[item.placeholder]]"
                                    title="[[_getTitle(item.currentValue)]]"
                                    disabled$="[[item.readonly]]"
                                    stretch></pl-input>

                                <pl-textarea
                                    hidden$="[[!_isEditor(item,'textarea')]]"
                                    value="{{item.value}}"
                                    placeholder="[[item.placeholder]]"
                                    title="[[_getTitle(item.currentValue)]]"
                                    disabled$="[[item.readonly]]"
                                    hide-resizer
                                    stretch></pl-textarea>

                                <pl-combobox
                                    hidden$="[[!_isEditor(item,'select')]]"
                                    data="[[item.options]]"
                                    text-property="text"
                                    value-property="value"
                                    value="{{item.value}}"
                                    disabled$="[[item.readonly]]"
                                    stretch></pl-combobox>

                                <pl-button-group
                                    hidden$="[[!_isEditor(item,'icon-group')]]"
                                    items="[[item.options]]"
                                    value="{{item.value}}"
                                    disabled$="[[item.readonly]]"></pl-button-group>

                                <pl-checkbox
                                    hidden$="[[!_isEditor(item,'boolean')]]"
                                    checked="{{item.value}}"
                                    caption="Включено"
                                    disabled$="[[item.readonly]]"></pl-checkbox>
                            </div>
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
                                <div class="meta-row-name">[[item.name]]</div>
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

            <section class="group" hidden$="[[_isEmpty(columnItems)]]">
                <div class="group-head">
                    <div class="group-title">Колонки грида</div>
                    <div class="group-description">Выберите колонку для детальной настройки свойств.</div>
                </div>
                <div class="group-body">
                    <template d:repeat="{{columnItems}}">
                        <div class="meta-row">
                            <pl-button variant="link" label="[[item.label]]" data-path$="[[item.path]]" on-click="[[onColumnSelect]]"></pl-button>
                        </div>
                    </template>
                </div>
            </section>

            <section class="group" hidden$="[[_isEmpty(styleItems)]]">
                <div class="group-head">
                    <div class="group-title">Стили элемента</div>
                    <div class="group-description">Редактирование inline-стилей выбранного элемента (style="...").</div>
                </div>
                <div class="group-body">
                    <template d:repeat="{{styleItems}}">
                        <div class="meta-row">
                            <div class="meta-row-head">
                                <div class="meta-row-name">[[item.name]]</div>
                            </div>
                            <pl-input value="{{item.value}}" stretch></pl-input>
                        </div>
                    </template>
                </div>
            </section>

            <section class="group" hidden$="[[_isEmpty(styleRules)]]">
                <div class="group-head">
                    <div class="group-title">CSS правила</div>
                    <div class="group-description">Селекторы, которые совпали с элементом.</div>
                </div>
                <div class="group-body">
                    <template d:repeat="{{styleRules}}">
                        <div class="meta-row">
                            <div class="meta-row-head">
                                <div class="meta-row-name">[[item.selector]]</div>
                            </div>
                            <div class="meta-row-value">[[item.declarations]]</div>
                        </div>
                    </template>
                </div>
            </section>
        `;
    }

    constructor() {
        super();
        this._cssInspector = new Css();
        this._inlineStyleMap = {};
    }

    _getTitle(title) {
        try {
            return JSON.stringify(title);
        } catch {
            return String(title ?? '');
        }
    }

    _selectedChange(path) {
        if (path) {
            const { tplNode, domNode, sourceNode } = this._resolveSelectedNodes(path);
            this.selectedTag = domNode?.localName || tplNode?.localName || '';
            this.data = this.fwt.getProperties(domNode, tplNode);
            this.bindItems = this._collectBindItems(sourceNode || tplNode || domNode);
            this.columnItems = this._collectGridColumns(sourceNode || tplNode || domNode, path);
            const styles = this._collectStyleInfo(domNode, sourceNode || tplNode);
            this.styleItems = styles.items;
            this.styleRules = styles.rules;
            this._inlineStyleMap = styles.inlineMap;
        } else {
            this.data = [];
            this.bindItems = [];
            this.columnItems = [];
            this.styleItems = [];
            this.styleRules = [];
            this.selectedTag = '';
            this._inlineStyleMap = {};
        }
        this._syncPanelMeta();
        this._buildGroups(this.data);
    }

    _rootsChanged() {
        if (this.selected) this._selectedChange(this.selected);
    }

    _resolveSelectedNodes(path) {
        const domNode = findByXpath(this.domRoot, path);
        const sourceNode = findByXpath(this.sourceTplRoot, path, true);
        const runtimeTplNode = findByXpath(this.tplRoot, path, true);
        return {
            domNode,
            sourceNode,
            tplNode: sourceNode || runtimeTplNode
        };
    }

    _dataObserver(newVal, oldVal, mut) {
        if (!mut || mut.init || mut.path === 'data') {
            this._syncPanelMeta();
            this._buildGroups(newVal);
            return;
        }

        if(mut && !mut.init && mut.path !== 'data') {
            const m = mut.path.match(/^data\.(\d*)\.value/);
            if(m) {
                const data = newVal[m[1]];
                if (!data) return;
                const normalized = this._normalizeOutgoingValue(data, data.value);
                this.changeProp(data.cmp, data.name, normalized);
            }
        }
    }

    _groupsObserver(newVal, oldVal, mut) {
        if (!mut || mut.init || mut.path === 'groups') return;
        const m = mut.path.match(/^groups\.(\d+)\.items\.(\d+)\.value/);
        if (!m) return;

        const groupIndex = Number(m[1]);
        const itemIndex = Number(m[2]);
        const data = newVal?.[groupIndex]?.items?.[itemIndex];
        if (!data) return;
        const normalized = this._normalizeOutgoingValue(data, data.value);
        this.changeProp(data.cmp, data.name, normalized);
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
            return;
        }
        if (item.kind === 'text') {
            this.changeTextNode(item.textPath, item.value ?? '');
        }
    }

    _styleItemsObserver(newVal, oldVal, mut) {
        if (!mut || mut.init || mut.path === 'styleItems') return;
        const m = mut.path.match(/^styleItems\.(\d+)\.value/);
        if (!m) return;

        const itemIndex = Number(m[1]);
        const item = newVal?.[itemIndex];
        if (!item?.name) return;

        const nextValue = String(item.value ?? '').trim();
        if (nextValue) {
            this._inlineStyleMap[item.name] = nextValue;
        } else {
            delete this._inlineStyleMap[item.name];
        }
        this.changeAttribute('style', this._stringifyStyleMap(this._inlineStyleMap));
    }

    _isEditor(item, editor) {
        return (item?.editor || 'text') === editor;
    }

    _isLongText(value) {
        const text = String(value ?? '');
        return text.length > 80 || text.includes('\n');
    }

    _isEmpty(list) {
        return !Array.isArray(list) || list.length === 0;
    }

    _collectBindItems(tplNode) {
        if (!(tplNode instanceof Element)) return [];
        const result = [];
        const nodeLabel = this._getNodeBindLabel(tplNode);

        [...tplNode.attributes].forEach((attr) => {
            const value = attr.value ?? '';
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

    _collectGridColumns(node, basePath = this.selected) {
        if (!(node instanceof Element) || node.localName !== 'pl-grid') return [];
        const result = [];
        const walk = (parent, parentPath, level = 0) => {
            const columns = [...(parent.children || [])].filter((child) => child?.localName === 'pl-grid-column');
            const counters = new Map();
            columns.forEach((column, index) => {
                const header = column.getAttribute('header');
                const field = column.getAttribute('field');
                const title = header || field || `Колонка ${index + 1}`;
                const indent = level > 0 ? `${'· '.repeat(level)}` : '';
                const count = counters.get(column.localName) || 0;
                counters.set(column.localName, count + 1);
                const segment = count > 0 ? `${column.localName}[${count + 1}]` : column.localName;
                const path = parentPath === '/' ? `/${segment}` : `${parentPath}/${segment}`;
                result.push({
                    label: `${indent}${title}`,
                    path
                });
                walk(column, path, level + 1);
            });
        };
        walk(node, basePath || '/', 0);
        return result;
    }

    onColumnSelect(e) {
        const path = e?.currentTarget?.dataset?.path || e?.model?.item?.path;
        if (!path) return;
        window.dispatchEvent(new CustomEvent('select-component', { detail: { path } }));
    }

    _getNodeBindLabel(node) {
        if (!(node instanceof Element)) return 'element';
        const tag = String(node.localName || node.nodeName || 'element').toLowerCase();
        const className = String(node.getAttribute?.('class') || '').trim().split(/\s+/).filter(Boolean)[0];
        return className ? `${tag}.${className}` : tag;
    }

    _parseStyleMap(styleText) {
        const map = {};
        const text = String(styleText || '');
        text.split(';').forEach((chunk) => {
            const [rawName, ...rest] = chunk.split(':');
            const name = String(rawName || '').trim();
            if (!name) return;
            const value = rest.join(':').trim();
            if (!value) return;
            map[name] = value;
        });
        return map;
    }

    _stringifyStyleMap(styleMap) {
        const entries = Object.entries(styleMap || {}).filter(([, value]) => String(value || '').trim() !== '');
        return entries.map(([name, value]) => `${name}: ${value};`).join(' ');
    }

    _collectStyleInfo(domNode, tplNode) {
        if (!(domNode instanceof Element)) return { items: [], rules: [], inlineMap: {} };

        const styleProps = [
            'display', 'position', 'box-sizing',
            'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
            'margin', 'padding', 'gap', 'align-items', 'justify-content',
            'color', 'background-color', 'border', 'border-radius',
            'font-size', 'font-weight', 'line-height', 'text-align',
            'overflow', 'overflow-x', 'overflow-y',
            'opacity', 'z-index'
        ];

        const inlineMap = this._parseStyleMap(tplNode?.getAttribute?.('style') || '');
        const computed = getComputedStyle(domNode);
        const items = styleProps.map((name) => ({
            name,
            value: inlineMap[name] ?? (computed.getPropertyValue(name)?.trim() || '')
        })).filter((item) => item.value !== '');

        const rules = this._cssInspector.getRules(domNode).map((rule) => ({
            selector: rule.selectorText,
            declarations: this._stringifyRule(rule)
        })).filter((rule) => rule.declarations);

        return { items, rules, inlineMap };
    }

    _stringifyRule(rule) {
        const style = rule?.style;
        if (!style) return '';
        if (style.cssText?.trim()) return style.cssText.trim();

        const values = [];
        for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            const val = style.getPropertyValue(prop);
            const priority = style.getPropertyPriority(prop);
            values.push(`${prop}: ${val}${priority ? ` !${priority}` : ''};`);
        }
        return values.join(' ');
    }

    _normalizeOutgoingValue(item, value) {
        if (!item) return value;
        if (item.editor === 'boolean' || item.propType === 'Boolean') return Boolean(value);
        if (item.editor === 'number' || item.propType === 'Number') {
            if (value === '' || value === null || value === undefined) return '';
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : value;
        }
        return value;
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

        list.forEach((prop) => {
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

    changeProp(instance, name, value, commit) {
        let cmd = {
            path: this.selected,
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
            attribute: name,
            value
        };
        window.dispatchEvent(new CustomEvent('command', { detail: new ChangeAttributeCommand(cmd) }));
    }

    changeTextNode(textPath, value) {
        if (!this.selected || !Array.isArray(textPath)) return;
        let cmd = {
            path: this.selected,
            textPath,
            value
        };
        window.dispatchEvent(new CustomEvent('command', { detail: new ChangeTextNodeCommand(cmd) }));
    }
}

customElements.define('pl-props-panel', PropsPanel);
