import { PlElement, html, css } from "polylib";
import "@plcmp/pl-input";
import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";
import "/@editor/components/editor-iconset.js";

import { getComponentLibraryGroups } from "../lib/component-meta.js";

class ComponentList extends PlElement {
    static get properties() {
        return {
            search: { type: String, value: '', observer: '_applyFilter' },
            _allGroups: {
                type: Array,
                value: () => getComponentLibraryGroups()
            },
            groups: {
                type: Array,
                value: () => getComponentLibraryGroups()
            }
        };
    }

    static get css() {
		return css`
			:host {
				display: flex;
                flex-direction: column;
				width: 100%;
				overflow: hidden;
                position: relative;
                background: var(--pl-background-color);
			}

            .head {
                position: sticky;
                top: 0;
                z-index: 2;
                padding: 8px;
                border-bottom: 1px solid var(--pl-grey-light);
                background: var(--pl-background-color);
            }

            .title {
                font: var(--pl-header-font);
                color: var(--pl-header-color);
            }

            .subtitle {
                margin-top: 4px;
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
            }

            .search {
                margin-top: 8px;
            }

            .content {
                overflow: auto;
                padding: 8px;
            }

            .group + .group {
                margin-top: 10px;
            }

            .group-title {
                font: var(--pl-header-font);
                color: var(--pl-header-color);
                margin-bottom: 6px;
            }

            .items {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .item {
                display: inline-flex;
                align-items: center;
                min-height: 28px;
                padding: 4px 8px;
                border: 1px solid var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                background: var(--pl-grey-lightest);
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
                cursor: grab;
                user-select: none;
                gap: 6px;
            }

            .item:hover {
                border-color: var(--pl-primary-base);
                color: var(--pl-primary-base);
                background: var(--pl-background-color);
            }

            .item:active {
                cursor: grabbing;
            }

            .item-icon {
                flex: 0 0 auto;
                color: currentColor;
            }

            .item-label {
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .empty {
                padding: 12px 8px;
                border: 1px dashed var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                background: var(--pl-background-color);
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
            }
    	`;
	}
    static get template() {
        return html`
            <div class="head">
                <div class="title">Компоненты</div>
                <div class="subtitle">Перетащите компонент на форму</div>
                <div class="search">
                    <pl-input value="{{search}}" placeholder="Поиск по компонентам" stretch></pl-input>
                </div>
            </div>
            <div class="content">
                <div class="empty" hidden$="[[!_isEmpty(groups)]]">Компоненты не найдены.</div>
                <template d:repeat="{{groups}}" d:as="group">
                    <div class="group">
                        <div class="group-title">[[group.title]]</div>
                        <div class="items">
                            <template d:repeat="{{group.items}}" d:as="cmpItem">
                                <div class="item" draggable="true" cmp="[[cmpItem.cmp]]" title="Перетащить [[cmpItem.label]]" on-dragstart="[[onItemDragStart]]">
                                    <pl-icon class="item-icon" iconset="[[cmpItem.iconset]]" icon="[[cmpItem.icon]]" size="14"></pl-icon>
                                    <span class="item-label">[[cmpItem.label]]</span>
                                </div>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback?.();
        this._applyFilter();
    }

    _applyFilter() {
        const source = Array.isArray(this._allGroups) ? this._allGroups : [];
        const query = String(this.search || '').trim().toLowerCase();
        if (!query) {
            this.groups = source.map((group) => ({
                ...group,
                items: group.items.map((item) => ({ ...item }))
            }));
            return;
        }

        this.groups = source
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => item.searchText.includes(query))
            }))
            .filter((group) => group.items.length > 0);
    }

    _isEmpty(groups) {
        return !Array.isArray(groups) || groups.length === 0;
    }

    _resolveDragCmp(e) {
        const modelCmp = e?.model?.cmpItem?.cmp || e?.model?.item?.cmp;
        if (modelCmp) return modelCmp;
        const path = e?.composedPath?.() || [];
        const item = path.find((node) => node?.classList?.contains?.('item')) || e?.target?.closest?.('.item');
        return item?.getAttribute?.('cmp') || '';
    }

    onItemDragStart(e) {
        const cmp = this._resolveDragCmp(e);
        if (!cmp || !e?.dataTransfer) {
            return;
        }

        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.dropEffect = 'copy';
        e.dataTransfer.setData('dev/element', cmp);
        e.dataTransfer.setData('text/plain', `dev:element:${cmp}`);
        if (!customElements.get(cmp) && typeof customLoader === 'function') {
            customLoader(cmp);
        }
    }
}

customElements.define('pl-component-list', ComponentList);
