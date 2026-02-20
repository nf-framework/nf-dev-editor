import { PlElement, html, css } from "polylib";

const COMPONENT_GROUPS = Object.freeze([
    {
        title: 'Поля ввода',
        items: [
            { cmp: 'pl-input', label: 'pl-input' },
            { cmp: 'pl-input-mask', label: 'pl-input-mask' },
            { cmp: 'pl-combobox', label: 'pl-combobox' },
            { cmp: 'pl-datetime', label: 'pl-datetime' },
            { cmp: 'pl-checkbox', label: 'pl-checkbox' },
            { cmp: 'pl-radio-group', label: 'pl-radio-group' },
            { cmp: 'pl-radio-button', label: 'pl-radio-button' },
            { cmp: 'pl-textarea', label: 'pl-textarea' }
        ]
    },
    {
        title: 'Кнопки',
        items: [
            { cmp: 'pl-button', label: 'pl-button' },
            { cmp: 'pl-icon-button', label: 'pl-icon-button' }
        ]
    },
    {
        title: 'Лэйаут',
        items: [
            { cmp: 'pl-flex-layout', label: 'pl-flex-layout' },
            { cmp: 'pl-grid', label: 'pl-grid' },
            { cmp: 'pl-grid-column', label: 'pl-grid-column' },
            { cmp: 'pl-tabpanel', label: 'pl-tabpanel' },
            { cmp: 'pl-tab', label: 'pl-tab' }
        ]
    },
    {
        title: 'Данные',
        items: [
            { cmp: 'pl-dataset', label: 'pl-dataset' },
            { cmp: 'pl-action', label: 'pl-action' },
            { cmp: 'pl-data-observer', label: 'pl-data-observer' },
            { cmp: 'pl-valid-observer', label: 'pl-valid-observer' }
        ]
    },
    {
        title: 'Прочее',
        items: [
            { cmp: 'pl-icon', label: 'pl-icon' },
            { cmp: 'pl-badge', label: 'pl-badge' }
        ]
    }
]);

class ComponentList extends PlElement {
    static get properties() {
        return {
            groups: {
                type: Array,
                value: () => COMPONENT_GROUPS.map((group) => ({
                    ...group,
                    items: group.items.map((item) => ({ ...item }))
                }))
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
                min-height: 26px;
                padding: 4px 8px;
                border: 1px solid var(--pl-grey-light);
                border-radius: var(--pl-border-radius);
                background: var(--pl-grey-lightest);
                font: var(--pl-text-font);
                color: var(--pl-grey-darkest);
                cursor: grab;
                user-select: none;
            }

            .item:hover {
                border-color: var(--pl-primary-base);
                color: var(--pl-primary-base);
                background: var(--pl-background-color);
            }

            .item:active {
                cursor: grabbing;
            }
    	`;
	}
    static get template() {
        return html`
            <div class="head">
                <div class="title">Компоненты</div>
                <div class="subtitle">Перетащите компонент на форму</div>
            </div>
            <div class="content">
                <template d:repeat="{{groups}}" d:as="group">
                    <div class="group">
                        <div class="group-title">[[group.title]]</div>
                        <div class="items">
                            <template d:repeat="{{group.items}}" d:as="cmpItem">
                                <div class="item" draggable="true" cmp="[[cmpItem.cmp]]" title="Перетащить [[cmpItem.label]]" on-dragstart="[[onItemDragStart]]">[[cmpItem.label]]</div>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
        `;
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
