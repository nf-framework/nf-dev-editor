import { PlElement, html, css } from "polylib";
import "@plcmp/pl-icon-button";
import "@plcmp/pl-iconset-default";

class PlButtonGroup extends PlElement {
    static properties = {
        items: { type: Array, value: () => [] },
        value: { type: String, value: '' },
        disabled: { type: Boolean, reflectToAttribute: true },
        hidden: { type: Boolean, reflectToAttribute: true },

        iconset: { type: String, value: 'pl-default' }
    };

    static css = css`
        :host {
            display: inline-flex;
            min-height: var(--pl-base-size);
            border: 1px solid var(--pl-grey-light);
            border-radius: var(--pl-border-radius);
            padding: 2px;
            gap: 2px;
            background: var(--pl-background-color);
            box-sizing: border-box;
            max-width: 100%;
        }

        :host([disabled]) {
            opacity: .6;
            pointer-events: none;
        }

        :host[hidden] {
            display: none;
        }

        pl-icon-button {
            --pl-base-size: 28px;
        }
    `;

    static template = html`
        <template d:repeat="{{items}}">
            <pl-icon-button
                iconset="[[iconset]]"
                icon="[[item.icon]]"
                variant="[[_resolveVariant(item.value, value)]]"
                title="[[item.title]]"
                data-value="[[item.value]]"
                disabled$="[[disabled]]"
                on-click="[[_onItemClick]]"></pl-icon-button>
        </template>
    `;

    _resolveVariant(itemValue, selectedValue) {
        return String(itemValue) === String(selectedValue) ? 'secondary' : 'ghost';
    }

    _onItemClick(event) {
        if (this.disabled) return;
        const target = event.currentTarget || event.target?.closest?.('pl-icon-button');
        const nextValue = target?.dataset?.value;
        if (nextValue === undefined) return;
        this.value = nextValue;
        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: { value: nextValue }
        }));
    }
}

if (!customElements.get('pl-button-group')) {
    customElements.define('pl-button-group', PlButtonGroup);
}

