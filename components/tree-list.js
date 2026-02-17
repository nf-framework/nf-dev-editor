import { PlElement, html, css } from "polylib";
import '@plcmp/pl-grid';
import '@plcmp/pl-grid/pl-grid-column';
import '@plcmp/pl-icon-button';

import { buildXPathCandidates, findByXpathWithFallback, getModelByDom, getXPath } from "../lib/common.js";
import drndr from "../lib/drndr.js";
import { AddElementCommand, MoveElementCommand } from "../lib/commands.js";

class TreeList extends PlElement {
	static properties = {
			inspect: { type: Object, observer: '_inspectedChange' },
			rootLabel: { type: String, observer: '_rootLabelChanged' },
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
				background: var(--pl-background-color);
			}

			.tree-toolbar {
				position: sticky;
				top: 0;
				z-index: 2;
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 6px 8px;
				border-bottom: 1px solid var(--pl-grey-light);
				background: var(--pl-background-color);
			}

			.tree-toolbar-title {
				font: var(--pl-header-font);
				color: var(--pl-header-color);
			}

			pl-grid {
				--pl-grid-cell-min-height: 24px;
			}

			.tree-cell {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 6px;
				min-width: 0;
				width: 100%;
			}

			.tree-name {
				flex: 1;
				min-width: 0;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.copy-btn {
				opacity: .45;
				transition: opacity .12s ease;
			}

			.cell:hover .copy-btn,
			.row[active] .copy-btn {
				opacity: 1;
			}
    	`;

	static template = html`
		<div class="tree-toolbar">
			<div class="tree-toolbar-title">Структура</div>
			<pl-icon-button variant="ghost" size="14" iconset="pl-default" icon="copy" title="Скопировать путь выбранного элемента" disabled$="[[!selected]]" on-click="[[onCopySelectedPathClick]]"></pl-icon-button>
		</div>
		<pl-grid tree data="{{data}}" selected="{{_selectedNode}}" on-row-click="[[onSelect]]" key-field="id"
			pkey-field="parent_id">
			<pl-grid-column resizable sortable width="360" field="name" header="Узел">
				<template>
					<div class="tree-cell" draggable="true">
						<span class="tree-name" title="[[row.path]]">[[row.name]]</span>
					</div>
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
				let path = model.row.path || getXPath(model.row.node);
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
				let path = model.row.path || getXPath(model.row.node);
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
					let path = model.row.path || getXPath(model.row.node);
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
			if (!inspect) {
				this.data = [];
				return;
			}
			let data = this.fwt.buildTree(inspect, this.rootLabel);
			this.data = data;
			if (this.selected) {
				this._selectedObserver(this.selected);
			}
		}, 80)
	}
	_rootLabelChanged() {
		this._inspectedChange(this.inspect);
	}
	onFormUpdate() {
		this._inspectedChange(this.inspect);
	}
	_selectedObserver(val) {
		if (!val || !this.inspect || !Array.isArray(this.data) || this.data.length === 0) return;
		const selectedNode = this._findNodeByPath(val);
		if (!selectedNode) return;
		this._expandPath(selectedNode);
		this.data = [...this.data];
		this._selectedNode = null;
		this._selectedNode = selectedNode;
		requestAnimationFrame(() => this._scrollSelectedIntoView());
	}

	_findNodeByPath(path) {
		if (!path) return null;
		const candidates = buildXPathCandidates(path);
		for (const candidate of candidates) {
			const hit = this.data.find(x => x.path === candidate);
			if (hit) return hit;
		}

		for (const candidate of candidates) {
			const parts = String(candidate).split('/').filter(Boolean);
			while (parts.length > 1) {
				parts.pop();
				const ancestor = '/' + parts.join('/');
				const hit = this.data.find(x => x.path === ancestor);
				if (hit) return hit;
			}
		}

		const resolved = findByXpathWithFallback(this.inspect, path, true);
		if (resolved.node) {
			return this.data.find(x => x.node === resolved.node || x.path === resolved.path) || null;
		}

		return null;
	}

	_expandPath(node) {
		let current = node?._pitem;
		while (current) {
			current._opened = true;
			current = current._pitem;
		}
	}

	_scrollSelectedIntoView() {
		const grid = this.renderRoot?.querySelector?.('pl-grid');
		const gridRoot = grid?.root || grid?.renderRoot || grid?.shadowRoot || null;
		const activeRow = gridRoot?.querySelector?.('.row[active]');
		if (activeRow?.scrollIntoView) {
			activeRow.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		}
	}

	onSelect(item) {
		let model = item.detail.model;
		let node = model.node;
		let path = model.path || getXPath(node)
		window.dispatchEvent(new CustomEvent('select-component', {
			detail: {
				path
			}
		}))
	}

	onCopyPathClick(e) {
		e?.stopPropagation?.();
		e?.preventDefault?.();
		const row = e?.model?.row;
		const path = row?.path || (row?.node ? getXPath(row.node) : '');
		if (!path) return;
		this._copyText(path);
	}

	onCopySelectedPathClick(e) {
		e?.stopPropagation?.();
		e?.preventDefault?.();
		const path = this.selected || this._selectedNode?.path || '';
		if (!path) return;
		this._copyText(path);
	}

	_copyText(text) {
		const value = String(text || '');
		if (!value) return;
		const clipboard = globalThis?.navigator?.clipboard;
		if (clipboard?.writeText) {
			clipboard.writeText(value).catch(() => this._legacyCopy(value));
			return;
		}
		this._legacyCopy(value);
	}

	_legacyCopy(text) {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.setAttribute('readonly', '');
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.select();
		try {
			document.execCommand('copy');
		} catch (_err) {
			// ignore
		}
		ta.remove();
	}
}



customElements.define('pl-tree-list', TreeList);
