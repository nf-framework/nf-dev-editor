import { PlElement, html, css } from "polylib";

class ComponentList extends PlElement {
    static get css() {
		return css`
			:host {
				display: block;
				width: 100%;
				overflow: auto;
                position: relative;
			}

            .header {
                color: var(--black-darkest);
                font-size: 18px;
                font-weight: 500;
                position: sticky;
                top: 0;
                left:0;
                height: 24px;
                width: 100%;
                background: white;
                user-select: none;
                padding: 0 8px;
            }
    	`;
	}
    static get template() {
        return html`
            <div id="elements">
                <div class="header">Inputs</div>
                <div cmp="pl-input">pl-input</div>
                <div cmp="pl-input-mask">pl-input-mask</div>
                <div cmp="pl-combobox">pl-combobox</div>
                <div cmp="pl-datetime">pl-datetime</div>
                <div cmp="pl-checkbox">pl-checkbox</div>
                <div cmp="pl-radio-group">pl-radio-group</div>
                <div cmp="pl-radio-button">pl-radio-button</div>
                <div cmp="pl-input">pl-textarea</div>
                <div class="header">Buttons</div>
                <div cmp="pl-button">pl-button</div>
                <div cmp="pl-icon-button">pl-icon-button</div>
                <div class="header">Layout</div>
                <div cmp="pl-flex-layout">pl-flex-layout</div>
                <div cmp="pl-grid">pl-grid</div>
                <div cmp="pl-grid-column">pl-grid-column</div>
                <div cmp="pl-tabpanel">pl-tabpanel</div>
                <div cmp="pl-tab">pl-tab</div>
                <div class="header">Data manipulation</div>
                <div cmp="pl-dataset">pl-dataset</div>
                <div cmp="pl-action">pl-action</div>
                <div cmp="pl-data-observer">pl-data-observer</div>
                <div cmp="pl-valid-observer">pl-valid-observer</div>
                <div class="header">Misc</div>
                <div cmp="pl-icon">pl-icon</div>
                <div cmp="pl-icon">pl-badge</div>
            </div>
        `;
    }
    connectedCallback(){
        super.connectedCallback();
        let els = this.shadowRoot.querySelectorAll('#elements *');
        [...els].forEach(el => {
            el.draggable = true;
            el.ondragstart = (e) => {

                let cmp = e.target.getAttribute('cmp');
                e.dataTransfer.setData('dev/element', cmp);
                if (!customElements.get(cmp)) {
                    customLoader(cmp);
                }
            }
        });
    }
}

customElements.define('pl-component-list', ComponentList);