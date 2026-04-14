import { PlElement, html, css } from "polylib";
import "@plcmp/pl-button";
import "@plcmp/pl-icon-button";
import "@plcmp/pl-iconset-default";

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
        items: { type: Array, value: () => [] },
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
            min-height: 0;
            overflow: auto;
            padding: 16px;
            box-sizing: border-box;
            background: color-mix(in oklch, var(--pl-background-color) 92%, var(--pl-grey-lightest) 8%);
        }

        .items {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .item {
            border: 1px solid var(--pl-grey-light);
            border-radius: var(--pl-border-radius);
            background: var(--pl-background-color);
            padding: 14px;
            box-sizing: border-box;
        }

        .item-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
        }

        .item-title {
            font: var(--pl-header-font);
            color: var(--pl-header-color);
        }

        .item-grid {
            display: grid;
            grid-template-columns: 1.1fr 180px 1fr;
            gap: 10px 12px;
        }

        .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
        }

        .field.span-2 {
            grid-column: span 2;
        }

        .field.span-3 {
            grid-column: 1 / -1;
        }

        .field-label {
            font: var(--pl-caption-font);
            color: var(--pl-grey-dark);
        }

        .field-control,
        .field-control-textarea,
        .field-select {
            width: 100%;
            min-height: 32px;
            padding: 8px 10px;
            border: 1px solid var(--pl-grey-base);
            border-radius: var(--pl-border-radius);
            background: var(--pl-background-color);
            box-sizing: border-box;
            font: var(--pl-text-font);
            color: var(--pl-text-color);
        }

        .field-control-textarea {
            min-height: 74px;
            resize: vertical;
        }

        .flags {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            padding-top: 4px;
        }

        .flag {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font: var(--pl-text-font);
            color: var(--pl-text-color);
        }

        .flag input {
            margin: 0;
        }

        .empty {
            padding: 18px;
            border: 1px dashed var(--pl-grey-base);
            border-radius: var(--pl-border-radius);
            background: var(--pl-background-color);
            font: var(--pl-text-font);
            color: var(--pl-grey-darkest);
            text-align: center;
        }

        @media (max-width: 980px) {
            .modal {
                width: calc(100% - 24px);
                max-height: calc(100% - 24px);
            }

            .item-grid {
                grid-template-columns: 1fr;
            }

            .field.span-2,
            .field.span-3 {
                grid-column: auto;
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
                <pl-icon-button variant="ghost" iconset="pl-default" icon="close" title="Закрыть" on-click="[[close]]"></pl-icon-button>
            </div>
            <div class="modal-body">
                <div class="items" hidden$="[[!hasItems(items)]]">
                    <template d:repeat="[[items]]" d:as="item">
                        <div class="item" data-item-id$="[[item._id]]">
                            <div class="item-head">
                                <div class="item-title">[[item.name]]</div>
                                <pl-icon-button variant="ghost" iconset="pl-default" icon="delete" title="Удалить свойство" data-item-id$="[[item._id]]" on-click="[[onDeleteItemClick]]"></pl-icon-button>
                            </div>
                            <div class="item-grid">
                                <label class="field">
                                    <span class="field-label">Имя</span>
                                    <input class="field-control" value$="[[item.name]]" data-item-id$="[[item._id]]" data-field="name" on-input="[[onFieldInput]]">
                                </label>
                                <label class="field">
                                    <span class="field-label">Тип</span>
                                    <select class="field-select" value$="[[item.typeSource]]" data-item-id$="[[item._id]]" data-field="typeSource" on-change="[[onFieldInput]]">
                                        <option value=""></option>
                                        <template d:repeat="[[propertyTypes]]" d:as="typeName">
                                            <option value$="[[typeName]]">[[typeName]]</option>
                                        </template>
                                    </select>
                                </label>
                                <label class="field">
                                    <span class="field-label">Observer</span>
                                    <input class="field-control" value$="[[item.observer]]" data-item-id$="[[item._id]]" data-field="observer" on-input="[[onFieldInput]]">
                                </label>
                                <label class="field span-3">
                                    <span class="field-label">Value</span>
                                    <textarea class="field-control-textarea" data-item-id$="[[item._id]]" data-field="valueSource" on-input="[[onFieldInput]]">[[item.valueSource]]</textarea>
                                </label>
                                <label class="field">
                                    <span class="field-label">Computed</span>
                                    <input class="field-control" value$="[[item.computed]]" data-item-id$="[[item._id]]" data-field="computed" on-input="[[onFieldInput]]">
                                </label>
                                <label class="field">
                                    <span class="field-label">Attribute</span>
                                    <input class="field-control" value$="[[item.attribute]]" data-item-id$="[[item._id]]" data-field="attribute" on-input="[[onFieldInput]]">
                                </label>
                                <label class="field span-3">
                                    <span class="field-label">Доп. поля</span>
                                    <textarea class="field-control-textarea" data-item-id$="[[item._id]]" data-field="extrasSource" on-input="[[onFieldInput]]">[[item.extrasSource]]</textarea>
                                </label>
                                <div class="field span-3">
                                    <span class="field-label">Флаги</span>
                                    <div class="flags">
                                        <label class="flag">
                                            <input type="checkbox" checked$="[[item.notify]]" data-item-id$="[[item._id]]" data-field="notify" on-change="[[onCheckboxChange]]">
                                            <span>notify</span>
                                        </label>
                                        <label class="flag">
                                            <input type="checkbox" checked$="[[item.reflectToAttribute]]" data-item-id$="[[item._id]]" data-field="reflectToAttribute" on-change="[[onCheckboxChange]]">
                                            <span>reflectToAttribute</span>
                                        </label>
                                        <label class="flag">
                                            <input type="checkbox" checked$="[[item.readOnly]]" data-item-id$="[[item._id]]" data-field="readOnly" on-change="[[onCheckboxChange]]">
                                            <span>readOnly</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
                <div class="empty" hidden$="[[hasItems(items)]]">Список свойств пуст. Добавьте первое свойство формы.</div>
            </div>
            <div class="modal-footer">
                <div>
                    <div class="status-text" hidden$="[[parseError]]">Изменения в списке сразу попадают в исходник формы и сохраняются общей кнопкой.</div>
                    <div class="error-text" hidden$="[[!parseError]]">[[parseError]]</div>
                </div>
                <pl-button variant="ghost" label="Добавить свойство" on-click="[[onAddItemClick]]"></pl-button>
            </div>
        </div>
    `;

    constructor() {
        super();
        this._idSeq = 0;
        this._syncingText = false;
    }

    _nextId() {
        this._idSeq += 1;
        return `form-prop-${this._idSeq}`;
    }

    open() {
        this.opened = true;
    }

    close() {
        this.opened = false;
    }

    hasItems(items) {
        return Array.isArray(items) && items.length > 0;
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
        return String(event?.currentTarget?.dataset?.itemId || event?.target?.dataset?.itemId || '').trim();
    }

    _fieldFromEvent(event) {
        return String(event?.currentTarget?.dataset?.field || event?.target?.dataset?.field || '').trim();
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
