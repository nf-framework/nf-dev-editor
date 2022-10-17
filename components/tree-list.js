import { PlElement, html, css } from "polylib";
import '@plcmp/pl-grid';
import '@plcmp/pl-grid/pl-grid-column';

import { findByXpath, getModelByDom, getXPath } from "../lib/common.js";
import drndr from "../lib/drndr.js";
import { AddElementCommand, MoveElementCommand } from "../lib/commands.js";

class TreeList extends PlElement {
	static properties = {
		inspect: { type: Object, observer: '_inspectedChange' },
		data: { type: Array },
		selected: { type: String, observer: '_selectedObserver' },
		_selectedNode: { type: Object }
	}

	static css = css`
			:host {
				display: block;
				width: 100%;
				overflow: auto;
				height: 100%;
			}

			pl-grid {
				--pl-grid-cell-min-height: 24px;
			}
    	`;

	static template = html`
		<pl-grid tree data="{{data}}" selected="{{_selectedNode}}" on-row-click="[[onSelect]]" key-field="id"
			pkey-field="parent_id">
			<pl-grid-column resizable sortable width="300" field="name" header="Структура">
				<template>
					<div draggable="true"><span>[[row.name]]</span></div>
				</template>
			</pl-grid-column>
		</pl-grid>
	`;

	constructor() {
		super();
		drndr.listen(this, 'dev/element', this.over, this.leave, this.drop);
		addEventListener('form-update', e => this.onFormUpdate(e));
		if (this.inspect) this._inspectedChange(this.inspect)
	}

	connectedCallback() {
		super.connectedCallback();
		this.ondragstart = e => {
			let node = e.composedPath()[0].closest('.cell');
			let model = getModelByDom(node);
			if (model) {
				let path = getXPath(model.row.node)
				//TODO: create image for drug preview
				let img = document.createElement('img');
				e.dataTransfer.setDragImage(img, 0, 0)
				e.dataTransfer.dropEffect = 'move';
				e.dataTransfer.setData('dev/move', path);
			}
		}
	}

	over(e) {
		let node = e.composedPath()[0].closest('.cell');
		if (node) {
			let model = getModelByDom(node);
			if (model) {
				//domSelector.drawSelector(model.row.target);
				let path = getXPath(model.row.node)
				this.dispatchEvent(new CustomEvent('highlight', { detail: { path, position: e.ctrlKey ? 'after' : (e.shiftKey ? 'before' : 'in') } }));
				e.preventDefault();
			};
		}
	}
	leave(e) {
		this.dispatchEvent(new CustomEvent('highlight', { detail: { path: null } }));
	}
	drop(e) {
		let node = e.composedPath()[0].closest('.cell');
		if (node) {
			let model = getModelByDom(node);
			let move = e.dataTransfer.getData('dev/move');
			let element = e.dataTransfer.getData('dev/element');
			if (model) {
				//domSelector.drawSelector(model.row.target);
				let path = getXPath(model.row.node)
				let cmd = {
					position: e.ctrlKey ? 'after' : (e.shiftKey ? 'before' : 'in'),
					path,
					element
				}
				if (move) {
					cmd.element = move;
					dispatchEvent(new CustomEvent('command', { detail: new MoveElementCommand(cmd) }));
				} else {
					dispatchEvent(new CustomEvent('command', { detail: new AddElementCommand(cmd) }));
				}
			}
		}
	}
	_inspectedChange(inspect) {
		setTimeout(() => {
			let data = this.fwt.buildTree(inspect);
			this.data = data;
		}, 300)
	}
	onFormUpdate() {
		this._inspectedChange(this.inspect);
	}
	_selectedObserver(val) {
		if (!val) return;
		let node = findByXpath(this.inspect, val, true);
		this._selectedNode = null;
		this._selectedNode = this.data.find(x => x.node === node);
	}

	onSelect(item) {
		let node = item.detail.model.node;
		let path = getXPath(node)
		window.dispatchEvent(new CustomEvent('select-component', {
			detail: {
				path
			}
		}))
	}
}



customElements.define('pl-tree-list', TreeList);