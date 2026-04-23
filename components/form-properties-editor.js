import { PlElement, html, css } from "polylib";
import "@plcmp/pl-button";
import "@plcmp/pl-icon-button";
import "@plcmp/pl-iconset-default";
import "@plcmp/pl-table";

const PROPERTY_TYPES = ['String', 'Number', 'Boolean', 'Object', 'Array', 'Date', 'Function'];

function findMatchingBrace(source, startIndex, openChar = '{', closeChar = '}') {
    let depth = 0;
    let quote = '';
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = startIndex; i < source.length; i++) {
        const char = source[i];
        const next = source[i + 1];

        if (lineComment) {
            if (char === '\n') lineComment = false;
            continue;
        }
        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (quote) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === quote) {
                quote = '';
            }
            continue;
        }
        if (char === '/' && next === '/') {
            lineComment = true;
            i++;
            continue;
        }
        if (char === '/' && next === '*') {
            blockComment = true;
            i++;
            continue;
        }
        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === openChar) {
            depth++;
            continue;
        }
        if (char === closeChar) {
            depth--;
            if (depth === 0) return i;
        }
    }

    return -1;
}

function stripOuterObject(source) {
    const text = String(source || '').trim();
    if (!text.startsWith('{')) return '';
    const endIndex = findMatchingBrace(text, 0);
    if (endIndex !== text.length - 1) return '';
    return text.slice(1, -1);
}

function splitTopLevelEntries(source) {
    const text = String(source || '');
    const out = [];
    let start = 0;
    let braces = 0;
    let brackets = 0;
    let parens = 0;
    let quote = '';
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (lineComment) {
            if (char === '\n') lineComment = false;
            continue;
        }
        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (quote) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === quote) {
                quote = '';
            }
            continue;
        }
        if (char === '/' && next === '/') {
            lineComment = true;
            i++;
            continue;
        }
        if (char === '/' && next === '*') {
            blockComment = true;
            i++;
            continue;
        }
        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') braces++;
        else if (char === '}') braces--;
        else if (char === '[') brackets++;
        else if (char === ']') brackets--;
        else if (char === '(') parens++;
        else if (char === ')') parens--;
        else if (char === ',' && braces === 0 && brackets === 0 && parens === 0) {
            const part = text.slice(start, i).trim();
            if (part) out.push(part);
            start = i + 1;
        }
    }

    const tail = text.slice(start).trim();
    if (tail) out.push(tail);
    return out;
}

function splitTopLevelPair(source) {
    const text = String(source || '').trim();
    let braces = 0;
    let brackets = 0;
    let parens = 0;
    let quote = '';
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (lineComment) {
            if (char === '\n') lineComment = false;
            continue;
        }
        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (quote) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === quote) {
                quote = '';
            }
            continue;
        }
        if (char === '/' && next === '/') {
            lineComment = true;
            i++;
            continue;
        }
        if (char === '/' && next === '*') {
            blockComment = true;
            i++;
            continue;
        }
        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') braces++;
        else if (char === '}') braces--;
        else if (char === '[') brackets++;
        else if (char === ']') brackets--;
        else if (char === '(') parens++;
        else if (char === ')') parens--;
        else if (char === ':' && braces === 0 && brackets === 0 && parens === 0) {
            return {
                key: text.slice(0, i).trim(),
                value: text.slice(i + 1).trim()
            };
        }
    }

    return null;
}

function stripQuotes(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"')) || (text.startsWith('`') && text.endsWith('`'))) {
        return text.slice(1, -1);
    }
    return text;
}

function normalizePropertyName(name) {
    return stripQuotes(name).trim();
}

function parseBoolean(value) {
    const text = String(value || '').trim().toLowerCase();
    if (text === 'true') return true;
    if (text === 'false') return false;
    return false;
}

function normalizeExtrasSource(value) {
    return String(value || '').trim().replace(/(^,+|,+$)/g, '').trim();
}

function parsePropertyConfig(configSource) {
    const text = String(configSource || '').trim();
    const item = {
        typeSource: '',
        valueSource: '',
        observer: '',
        computed: '',
        attribute: '',
        notify: false,
        reflectToAttribute: false,
        readOnly: false,
        extrasSource: ''
    };

    if (!text.startsWith('{')) {
        item.typeSource = text;
        return item;
    }

    const body = stripOuterObject(text);
    const extras = [];
    splitTopLevelEntries(body).forEach((entry) => {
        const pair = splitTopLevelPair(entry);
        if (!pair?.key) {
            extras.push(entry);
            return;
        }
        const key = normalizePropertyName(pair.key);
        const value = pair.value;
        if (key === 'type') item.typeSource = value;
        else if (key === 'value') item.valueSource = value;
        else if (key === 'observer') item.observer = stripQuotes(value);
        else if (key === 'computed') item.computed = stripQuotes(value);
        else if (key === 'attribute') item.attribute = stripQuotes(value);
        else if (key === 'notify') item.notify = parseBoolean(value);
        else if (key === 'reflectToAttribute') item.reflectToAttribute = parseBoolean(value);
        else if (key === 'readOnly') item.readOnly = parseBoolean(value);
        else extras.push(entry);
    });
    item.extrasSource = normalizeExtrasSource(extras.join(',\n'));
    return item;
}

function serializeStringValue(value) {
    const text = String(value || '');
    return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function serializePropertyName(name) {
    const text = String(name || '').trim();
    if (!text) return '';
    return /^[A-Za-z_$][\w$]*$/.test(text) ? text : serializeStringValue(text);
}

function serializeExtras(source) {
    return splitTopLevelEntries(normalizeExtrasSource(source));
}

function parsePropertiesSource(source, createId) {
    const body = stripOuterObject(source);
    if (!body && String(source || '').trim() !== '{}') {
        return [];
    }
    return splitTopLevelEntries(body).map((entry) => {
        const pair = splitTopLevelPair(entry);
        const name = normalizePropertyName(pair?.key || '');
        const config = parsePropertyConfig(pair?.value || '');
        return {
            _id: createId(),
            name,
            ...config
        };
    });
}

function serializePropertiesSource(items) {
    const blocks = (Array.isArray(items) ? items : [])
        .filter((item) => String(item?.name || '').trim())
        .map((item) => {
            const lines = [];
            if (String(item.typeSource || '').trim()) lines.push(`type: ${String(item.typeSource).trim()}`);
            if (String(item.valueSource || '').trim()) lines.push(`value: ${String(item.valueSource).trim()}`);
            if (String(item.observer || '').trim()) lines.push(`observer: ${serializeStringValue(item.observer)}`);
            if (String(item.computed || '').trim()) lines.push(`computed: ${serializeStringValue(item.computed)}`);
            if (String(item.attribute || '').trim()) lines.push(`attribute: ${serializeStringValue(item.attribute)}`);
            if (item.notify) lines.push('notify: true');
            if (item.reflectToAttribute) lines.push('reflectToAttribute: true');
            if (item.readOnly) lines.push('readOnly: true');
            lines.push(...serializeExtras(item.extrasSource));
            const body = lines.map((line) => `    ${line}`).join(',\n');
            return `  ${serializePropertyName(item.name)}: {\n${body}\n  }`;
        });

    if (!blocks.length) return '{\n}';
    return `{\n${blocks.join(',\n\n')}\n}`;
}

class PlFormPropertiesEditor extends PlElement {
    static properties = {
        opened: { type: Boolean, value: false, reflectToAttribute: true },
        propertiesText: { type: String, value: '{\n}', observer: '_propertiesTextChanged' },
        propertyTypes: { type: Array, value: () => [...PROPERTY_TYPES] },
        items: { type: Array, value: () => [], observer: '_itemsChanged' },
        parseError: { type: String, value: '' }
    };

    static css = css`
        :host {
            position: absolute;
            inset: 0;
            z-index: 10020;
            pointer-events: none;
        }

        :host(:not([opened])) {
            display: none;
        }

        .backdrop {
            position: absolute;
            inset: 0;
            background: color-mix(in oklch, var(--pl-grey-darkest) 28%, transparent);
            backdrop-filter: blur(2px);
            pointer-events: auto;
        }

        .modal {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: min(1120px, calc(100% - 48px));
            height: min(720px, calc(100% - 48px));
            max-height: calc(100% - 48px);
            display: grid;
            grid-template-rows: auto minmax(0, 1fr) auto;
            border: 1px solid var(--pl-grey-light);
            border-radius: calc(var(--pl-border-radius) + 2px);
            background: var(--pl-background-color);
            box-shadow: 0 18px 48px rgba(16, 24, 40, 0.18);
            pointer-events: auto;
            overflow: hidden;
        }

        .modal-header,
        .modal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid var(--pl-grey-light);
            background: var(--pl-background-color);
            box-sizing: border-box;
        }

        .modal-footer {
            border-top: 1px solid var(--pl-grey-light);
            border-bottom: 0;
        }

        .modal-title {
            font: var(--pl-header-font);
            color: var(--pl-header-color);
        }

        .modal-subtitle,
        .status-text,
        .error-text {
            font: var(--pl-text-font);
            color: var(--pl-grey-darkest);
        }

        .error-text {
            color: var(--pl-negative-base);
        }

        .modal-body {
            height: 100%;
            min-height: 320px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 0;
            box-sizing: border-box;
            background: color-mix(in oklch, var(--pl-background-color) 92%, var(--pl-grey-lightest) 8%);
        }

        .table-wrap {
            width: 100%;
            height: 100%;
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            flex: 1 1 auto;
        }

        pl-table.props-table {
            width: 100%;
            height: 100%;
            flex: 1 1 auto;
            min-height: 320px;
            border: 0;
            border-radius: 0;
            --pl-table-cell-height: calc(var(--pl-base-size) + 8px);
        }

        .empty {
            width: 100%;
            height: 100%;
            min-height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px 16px;
            box-sizing: border-box;
            font: var(--pl-text-font);
            color: var(--pl-grey-darkest);
            text-align: center;
        }

        .table-wrap[hidden],
        .empty[hidden] {
            display: none !important;
        }

        @media (max-width: 980px) {
            .modal {
                width: calc(100% - 24px);
                max-height: calc(100% - 24px);
            }
        }
    `;

    static template = html`
        <div class="backdrop" hidden$="[[!opened]]" on-click="[[close]]"></div>
        <div class="modal" hidden$="[[!opened]]">
            <div class="modal-header">
                <div>
                    <div class="modal-title">Свойства формы</div>
                    <div class="modal-subtitle">Редактирование свойств формы. Изменения сохраняются общей кнопкой редактора.</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <pl-button variant="ghost" label="Добавить свойство" on-click="[[onAddItemClick]]"></pl-button>
                    <pl-icon-button variant="ghost" iconset="pl-default" icon="close" title="Закрыть" on-click="[[close]]"></pl-icon-button>
                </div>
            </div>
            <div class="modal-body">
                <div class="table-wrap" hidden$="[[!hasItems(items)]]">
                    <pl-table id="propsTable" class="props-table" on-input="[[onTableInput]]" on-change="[[onTableChange]]" on-click="[[onTableClick]]">
                        <template is="extra styles">
                            <style>
                                .prop-editor {
                                    width: 100%;
                                    min-width: 0;
                                    min-height: 28px;
                                    padding: 5px 8px;
                                    border: 1px solid var(--pl-control-border, var(--pl-grey-base));
                                    border-radius: calc(var(--pl-border-radius) - 2px);
                                    background: var(--pl-surface-color, var(--pl-background-color));
                                    box-sizing: border-box;
                                    font: var(--pl-text-font);
                                    color: var(--pl-text-color);
                                }

                                .prop-editor.flags {
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                    min-height: 28px;
                                    padding: 0;
                                    border: 0;
                                    background: transparent;
                                }

                                .prop-flag {
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 4px;
                                    font: var(--pl-caption-font);
                                    color: var(--pl-text-color);
                                    white-space: nowrap;
                                }

                                .prop-flag input {
                                    margin: 0;
                                }

                                .prop-action {
                                    display: inline-flex;
                                    align-items: center;
                                    justify-content: center;
                                    width: 28px;
                                    height: 28px;
                                    padding: 0;
                                    border: 1px solid var(--pl-control-border, var(--pl-grey-base));
                                    border-radius: calc(var(--pl-border-radius) - 2px);
                                    background: var(--pl-surface-color, var(--pl-background-color));
                                    color: var(--pl-negative-base, var(--pl-text-color));
                                    cursor: pointer;
                                }

                                .prop-action:hover {
                                    border-color: var(--pl-negative-base, var(--pl-primary-base));
                                }
                            </style>
                        </template>
                        <pl-table-column field="name" header="Имя" width="180" resizable>
                            <template>
                                <input class="prop-editor" value$="[[row.name]]" data-item-id$="[[row._id]]" data-field="name">
                            </template>
                        </pl-table-column>
                        <pl-table-column field="typeSource" header="Тип" width="132" resizable>
                            <template>
                                <select class="prop-editor" value$="[[row.typeSource]]" data-item-id$="[[row._id]]" data-field="typeSource">
                                    <option value=""></option>
                                    <option value="String">String</option>
                                    <option value="Number">Number</option>
                                    <option value="Boolean">Boolean</option>
                                    <option value="Object">Object</option>
                                    <option value="Array">Array</option>
                                    <option value="Date">Date</option>
                                    <option value="Function">Function</option>
                                </select>
                            </template>
                        </pl-table-column>
                        <pl-table-column field="valueSource" header="Значение" width="230" resizable>
                            <template>
                                <input class="prop-editor" value$="[[row.valueSource]]" data-item-id$="[[row._id]]" data-field="valueSource">
                            </template>
                        </pl-table-column>
                        <pl-table-column field="observer" header="Observer" width="170" resizable>
                            <template>
                                <input class="prop-editor" value$="[[row.observer]]" data-item-id$="[[row._id]]" data-field="observer">
                            </template>
                        </pl-table-column>
                        <pl-table-column field="computed" header="Computed" width="170" resizable>
                            <template>
                                <input class="prop-editor" value$="[[row.computed]]" data-item-id$="[[row._id]]" data-field="computed">
                            </template>
                        </pl-table-column>
                        <pl-table-column field="attribute" header="Attribute" width="150" resizable>
                            <template>
                                <input class="prop-editor" value$="[[row.attribute]]" data-item-id$="[[row._id]]" data-field="attribute">
                            </template>
                        </pl-table-column>
                        <pl-table-column header="Флаги" width="210">
                            <template>
                                <div class="prop-editor flags">
                                    <label class="prop-flag">
                                        <input type="checkbox" checked$="[[row.notify]]" data-item-id$="[[row._id]]" data-field="notify">
                                        <span>notify</span>
                                    </label>
                                    <label class="prop-flag">
                                        <input type="checkbox" checked$="[[row.reflectToAttribute]]" data-item-id$="[[row._id]]" data-field="reflectToAttribute">
                                        <span>reflect</span>
                                    </label>
                                    <label class="prop-flag">
                                        <input type="checkbox" checked$="[[row.readOnly]]" data-item-id$="[[row._id]]" data-field="readOnly">
                                        <span>readonly</span>
                                    </label>
                                </div>
                            </template>
                        </pl-table-column>
                        <pl-table-column field="extrasSource" header="Доп. поля" width="240" resizable>
                            <template>
                                <input class="prop-editor" value$="[[row.extrasSource]]" data-item-id$="[[row._id]]" data-field="extrasSource">
                            </template>
                        </pl-table-column>
                        <pl-table-column header="" width="52">
                            <template>
                                <button type="button" class="prop-action" title="Удалить свойство" data-item-id$="[[row._id]]" data-action="delete">×</button>
                            </template>
                        </pl-table-column>
                    </pl-table>
                </div>
                <div class="empty" hidden$="[[hasItems(items)]]">Список свойств пуст. Добавьте первое свойство формы.</div>
            </div>
            <div class="modal-footer">
                <div>
                    <div class="status-text" hidden$="[[parseError]]">Изменения в списке сразу попадают в исходник формы и сохраняются общей кнопкой.</div>
                    <div class="error-text" hidden$="[[!parseError]]">[[parseError]]</div>
                </div>
                <pl-button variant="ghost" label="Закрыть" on-click="[[close]]"></pl-button>
            </div>
        </div>
    `;

    constructor() {
        super();
        this._idSeq = 0;
        this._syncingText = false;
        this._pendingFocusProperty = '';
    }

    connectedCallback() {
        super.connectedCallback?.();
        requestAnimationFrame(() => this._syncTableData());
    }

    _nextId() {
        this._idSeq += 1;
        return `form-prop-${this._idSeq}`;
    }

    open(propertyName = '') {
        this._propertiesTextChanged(this.propertiesText || '{\n}');
        this._pendingFocusProperty = String(propertyName || '').trim();
        this.opened = true;
        requestAnimationFrame(() => {
            this._syncTableData();
            this._focusPendingProperty();
        });
    }

    close() {
        this.opened = false;
    }

    hasItems(items) {
        return Array.isArray(items) && items.length > 0;
    }

    setSourceText(value) {
        this.propertiesText = typeof value === 'string' ? value : '{\n}';
        this._propertiesTextChanged(this.propertiesText);
        this._syncTableData();
        this._focusPendingProperty();
    }

    _getTable() {
        return this.shadowRoot?.querySelector?.('#propsTable') || null;
    }

    _syncTableData() {
        const table = this._getTable();
        if (!table) return;
        table.data = Array.isArray(this.items) ? [...this.items] : [];
    }

    _itemsChanged() {
        requestAnimationFrame(() => {
            this._syncTableData();
            this._focusPendingProperty();
        });
    }

    _focusPendingProperty() {
        const propertyName = String(this._pendingFocusProperty || '').trim();
        if (!propertyName) return;

        const match = (this.items || []).find((item) => String(item?.name || '').trim() === propertyName);
        if (!match?._id) return;

        const table = this._getTable();
        const shadowRoot = table?.shadowRoot;
        if (!shadowRoot) return;

        const controls = [...shadowRoot.querySelectorAll('[data-item-id][data-field="name"]')];
        const target = controls.find((node) => String(node?.dataset?.itemId || '').trim() === match._id);
        if (!target) return;

        this._pendingFocusProperty = '';
        target.focus?.();
        target.select?.();
    }

    _propertiesTextChanged(value) {
        if (this._syncingText) return;
        try {
            this.items = parsePropertiesSource(value || '{\n}', this._nextId.bind(this));
            this.parseError = '';
        } catch (err) {
            this.parseError = err?.message || String(err);
        }
    }

    _commitItems(nextItems) {
        this.items = nextItems;
        this._syncingText = true;
        this.propertiesText = serializePropertiesSource(nextItems);
        this._syncingText = false;
        this.parseError = '';
    }

    _itemIdFromEvent(event) {
        return String(this._eventDataset(event)?.itemId || '').trim();
    }

    _fieldFromEvent(event) {
        return String(this._eventDataset(event)?.field || '').trim();
    }

    _eventDataset(event) {
        const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
        for (const node of path) {
            if (node?.dataset?.itemId || node?.dataset?.field || node?.dataset?.action) {
                return node.dataset;
            }
        }
        return event?.target?.dataset || event?.currentTarget?.dataset || {};
    }

    onTableInput(event) {
        const field = this._fieldFromEvent(event);
        if (!field) return;
        this.onFieldInput(event);
    }

    onTableChange(event) {
        const field = this._fieldFromEvent(event);
        if (!field) return;
        if (event?.target?.type === 'checkbox') {
            this.onCheckboxChange(event);
            return;
        }
        this.onFieldInput(event);
    }

    onTableClick(event) {
        const dataset = this._eventDataset(event);
        if (dataset?.action === 'delete') {
            this.onDeleteItemClick(event);
        }
    }

    onFieldInput(event) {
        const itemId = this._itemIdFromEvent(event);
        const field = this._fieldFromEvent(event);
        if (!itemId || !field) return;
        const value = String(event?.target?.value ?? '');
        const nextItems = this.items.map((item) => item._id === itemId ? { ...item, [field]: value } : item);
        this._commitItems(nextItems);
    }

    onCheckboxChange(event) {
        const itemId = this._itemIdFromEvent(event);
        const field = this._fieldFromEvent(event);
        if (!itemId || !field) return;
        const value = Boolean(event?.target?.checked);
        const nextItems = this.items.map((item) => item._id === itemId ? { ...item, [field]: value } : item);
        this._commitItems(nextItems);
    }

    onDeleteItemClick(event) {
        const itemId = this._itemIdFromEvent(event);
        if (!itemId) return;
        const nextItems = this.items.filter((item) => item._id !== itemId);
        this._commitItems(nextItems);
    }

    onAddItemClick() {
        const nextItems = [
            ...(Array.isArray(this.items) ? this.items : []),
            {
                _id: this._nextId(),
                name: `property_${this._idSeq}`,
                typeSource: 'String',
                valueSource: "''",
                observer: '',
                computed: '',
                attribute: '',
                notify: false,
                reflectToAttribute: false,
                readOnly: false,
                extrasSource: ''
            }
        ];
        this._commitItems(nextItems);
    }
}

customElements.define('pl-form-properties-editor', PlFormPropertiesEditor);
