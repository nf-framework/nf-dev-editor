import { PlElement, html, css } from "polylib";
import "@plcmp/pl-button";
import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";
import "@plcmp/pl-input";
import "/@editor/components/editor-iconset.js";

import { getComponentLibraryGroups } from "../lib/component-meta.js";

class InsertComponentDialog extends PlElement {
    static get properties() {
        return {
            opened: { type: Boolean, value: false },
            search: { type: String, value: '', observer: '_applyFilter' },
            items: { type: Array, value: () => [] },
            activeIndex: { type: Number, value: 0 },
            dialogStyle: { type: String, value: '' }
        };
    }

    static get css() {
        return css`
            :host {
                position: fixed;
                inset: 0;
                z-index: 20;
                pointer-events: none;
            }

            :host([hidden]) {
                display: none !important;
            }

            .backdrop {
                position: absolute;
                inset: 0;
                background: rgba(18, 31, 35, 0.18);
                backdrop-filter: blur(2px);
                pointer-events: auto;
            }

            .dialog {
                position: absolute;
                top: 112px;
                left: 50%;
                transform: translateX(-50%);
                width: min(620px, calc(100vw - 48px));
                max-height: min(680px, calc(100vh - 160px));
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                background: var(--pl-background-color);
                box-shadow: 0 18px 54px rgba(17, 24, 39, 0.18);
                pointer-events: auto;
            }

            .head {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                padding: 16px 18px 12px;
                border-bottom: 1px solid var(--pl-grey-light);
            }

            .title {
                font: var(--pl-header-font);
                color: var(--pl-header-color);
            }

            .subtitle {
                margin-top: 4px;
                font: var(--pl-caption-font, var(--pl-text-font));
                color: var(--pl-grey-darkest);
            }

            .search {
                padding: 12px 18px;
                border-bottom: 1px solid var(--pl-grey-light);
            }

            .list {
                min-height: 220px;
                overflow: auto;
                padding: 8px;
            }

            .item {
                width: 100%;
                min-height: 40px;
                display: grid;
                grid-template-columns: 24px minmax(0, 1fr) auto;
                align-items: center;
                gap: 10px;
                padding: 8px 10px;
                border: 1px solid transparent;
                border-radius: var(--pl-border-radius);
                background: transparent;
                color: var(--pl-header-color);
                text-align: left;
                cursor: pointer;
                box-sizing: border-box;
            }

            .item:hover,
            .item.active {
                border-color: var(--pl-primary-light);
                background: var(--pl-primary-lightest);
            }

            .icon {
                color: var(--pl-primary-base);
            }

            .name {
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font: var(--pl-text-font);
                font-weight: 600;
            }

            .meta {
                font: var(--pl-caption-font, var(--pl-text-font));
                color: var(--pl-grey-darkest);
            }

            .empty {
                padding: 18px;
                border: 1px dashed var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                background: var(--pl-surface-color, var(--pl-background-color));
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
            }

            .footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 18px;
                border-top: 1px solid var(--pl-grey-light);
                font: var(--pl-caption-font, var(--pl-text-font));
                color: var(--pl-grey-darkest);
            }
        `;
    }

    static get template() {
        return html`
            <div class="backdrop" on-click="[[close]]"></div>
            <div class="dialog" style$="[[dialogStyle]]" role="dialog" aria-modal="true" aria-label="Вставить компонент">
                <div class="head">
                    <div>
                        <div class="title">Вставить компонент</div>
                        <div class="subtitle">Введите название и нажмите Enter. Компонент добавится внутрь выбранного узла.</div>
                    </div>
                    <pl-button variant="ghost" label="Закрыть" on-click="[[close]]"></pl-button>
                </div>
                <div class="search">
                    <pl-input id="searchInput" value="{{search}}" placeholder="Например card, input, table" stretch></pl-input>
                </div>
                <div class="list">
                    <div class="empty" hidden$="[[!_isEmpty(items)]]">Компоненты не найдены.</div>
                    <template d:repeat="[[items]]" d:as="item">
                        <button type="button" class$="[[_itemClass(item, activeIndex)]]" data-cmp$="[[item.cmp]]" on-click="[[_onItemClick]]">
                            <pl-icon class="icon" iconset="[[item.iconset]]" icon="[[item.icon]]" size="16"></pl-icon>
                            <span class="name">[[item.label]]</span>
                            <span class="meta">[[item.cmp]]</span>
                        </button>
                    </template>
                </div>
                <div class="footer">
                    <span>↑/↓ — выбор, Enter — вставить, Esc — закрыть</span>
                    <span>[[items.length]] найдено</span>
                </div>
            </div>
        `;
    }

    constructor() {
        super();
        this._allItems = this._flattenGroups();
        this.items = this._allItems;
        this._onKeyDownBound = this._onKeyDown.bind(this);
    }

    connectedCallback() {
        super.connectedCallback?.();
        this.addEventListener('keydown', this._onKeyDownBound);
        this._applyFilter();
    }

    disconnectedCallback() {
        this.removeEventListener('keydown', this._onKeyDownBound);
        super.disconnectedCallback?.();
    }

    open(anchor = null) {
        this.opened = true;
        this.removeAttribute('hidden');
        this.dialogStyle = this._dialogStyle(anchor);
        this.search = '';
        this.activeIndex = 0;
        this._applyFilter();
        requestAnimationFrame(() => {
            this.$.searchInput?.focus?.();
        });
    }

    close() {
        this.opened = false;
        this.dialogStyle = '';
        this.setAttribute('hidden', '');
    }

    _dialogStyle(anchor) {
        const x = Number(anchor?.x);
        const y = Number(anchor?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0) return '';

        const gap = 12;
        const width = Math.min(440, Math.max(320, window.innerWidth - gap * 2));
        const maxHeight = Math.min(560, Math.max(280, window.innerHeight - gap * 2));
        const left = Math.min(Math.max(gap, x + gap), Math.max(gap, window.innerWidth - width - gap));
        const top = Math.min(Math.max(gap, y - 24), Math.max(gap, window.innerHeight - maxHeight - gap));

        return [
            `top:${top}px`,
            `left:${left}px`,
            'transform:none',
            `width:${width}px`,
            `max-height:${maxHeight}px`
        ].join(';');
    }

    _flattenGroups() {
        return getComponentLibraryGroups().flatMap((group) => (
            (group.items || []).map((item) => ({
                ...item,
                groupTitle: group.title,
                searchText: [item.searchText, item.cmp, item.label, item.description, group.title]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
            }))
        ));
    }

    _applyFilter() {
        const query = String(this.search || '').trim().toLowerCase();
        const source = Array.isArray(this._allItems) ? this._allItems : [];
        this.items = query
            ? source.filter((item) => String(item.searchText || '').includes(query))
            : source;
        this.activeIndex = Math.max(0, Math.min(Number(this.activeIndex) || 0, Math.max(0, this.items.length - 1)));
    }

    _isEmpty(items) {
        return !Array.isArray(items) || items.length === 0;
    }

    _itemClass(item, activeIndex) {
        const index = Array.isArray(this.items) ? this.items.indexOf(item) : -1;
        return index === activeIndex ? 'item active' : 'item';
    }

    _onItemClick(event) {
        const item = event?.model?.item || this._findItemByCmp(event?.currentTarget?.dataset?.cmp);
        this._commitItem(item);
    }

    _findItemByCmp(cmp) {
        const value = String(cmp || '').trim();
        return (this.items || []).find((item) => item.cmp === value) || null;
    }

    _commitActive() {
        this._commitItem((this.items || [])[this.activeIndex]);
    }

    _commitItem(item) {
        const cmp = String(item?.cmp || '').trim();
        if (!cmp) return;
        this.dispatchEvent(new CustomEvent('insertComponent', {
            detail: { component: cmp },
            bubbles: true,
            composed: true
        }));
        this.close();
    }

    _onKeyDown(event) {
        if (!this.opened) return;
        const key = event?.key;
        if (key === 'Escape') {
            event.preventDefault();
            this.close();
            return;
        }
        if (key === 'ArrowDown') {
            event.preventDefault();
            this.activeIndex = Math.min((this.items || []).length - 1, this.activeIndex + 1);
            return;
        }
        if (key === 'ArrowUp') {
            event.preventDefault();
            this.activeIndex = Math.max(0, this.activeIndex - 1);
            return;
        }
        if (key === 'Enter') {
            event.preventDefault();
            this._commitActive();
        }
    }
}

customElements.define('pl-insert-component-dialog', InsertComponentDialog);
