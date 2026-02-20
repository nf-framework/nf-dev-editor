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
    	`;

	static template = html`
		<div class="tree-toolbar">
			<div class="tree-toolbar-title">Структура</div>
			<pl-icon-button variant="ghost" size="14" iconset="pl-editor" icon="path-copy" title="Вывести путь выбранного элемента в консоль" on-click="[[onCopySelectedPathClick]]"></pl-icon-button>
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
		drndr.listen(this, this.over, this.leave, this.drop, this);
		this._onFormUpdateBound = this.onFormUpdate.bind(this);
		window.addEventListener('form-update', this._onFormUpdateBound);
		if (this.inspect) this._inspectedChange(this.inspect)
	}

	connectedCallback() {
		super.connectedCallback();
		if (!this._onTreeDragStartBound) this._onTreeDragStartBound = this._onTreeDragStart.bind(this);
		this.addEventListener('dragstart', this._onTreeDragStartBound, true);
	}

	disconnectedCallback() {
		window.removeEventListener('form-update', this._onFormUpdateBound);
		this.removeEventListener('dragstart', this._onTreeDragStartBound, true);
		super.disconnectedCallback();
	}

	_onTreeDragStart(e) {
		let node = e?.composedPath?.()?.[0]?.closest?.('.cell');
		let model = this._extractRowModel(getModelByDom(node));
		if (!model || !e?.dataTransfer) return;
		let path = model.path || getXPath(model.node);
		let sourcePath = model.sourcePath || model.templatePath || path;
		this._dragSourcePath = sourcePath;
		let img = document.createElement('img');
		e.dataTransfer.setDragImage(img, 0, 0)
		e.dataTransfer.dropEffect = 'move';
		e.dataTransfer.setData('dev/move', path);
		e.dataTransfer.setData('dev/move-source', sourcePath);
		e.dataTransfer.setData('text/plain', `dev:move:${path}`);
	}

	over(e) {
		if (!this._hasDragPayload(e)) return;
		let path = this._resolveDropTargetPath(e);
		if (!path) return;
		this._lastDropPath = path;
		this.dispatchEvent(new CustomEvent('highlight', { detail: { path, position: this._getDropPosition(e) } }));
		e.preventDefault();
		return true;
	}
	leave(e) {
		this.dispatchEvent(new CustomEvent('highlight', { detail: { path: null } }));
	}
	drop(e) {
		const payload = this._extractDragPayload(e);
		if (!payload) return;
		let path = this._resolveDropTargetPath(e) || this._lastDropPath || '';
		if (!path) return;
		const position = this._getDropPosition(e);
		let cmd = {
			position,
			path,
			sourcePath: path,
			element: payload.value
		}
		if (payload.kind === 'move') {
			const sourceElement = payload.source || this._dragSourcePath || this.selected || payload.value;
			cmd.sourceElement = sourceElement;
			dispatchEvent(new CustomEvent('command', { detail: new MoveElementCommand(cmd) }));
		} else {
			dispatchEvent(new CustomEvent('command', { detail: new AddElementCommand(cmd) }));
		}
		this._dragSourcePath = '';
		e.preventDefault();
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
		let model = this._extractRowModel(item?.detail?.model) || item?.detail?.model;
		let node = model?.node;
		let path = model?.path || (node ? getXPath(node) : '');
		if (!path) return;
		console.log('[nf-dev-editor][tree-list][select]', {
			path,
			nodeTag: String(node?.localName || ''),
			modelKeys: Object.keys(model || {})
		});
		window.dispatchEvent(new CustomEvent('select-component', {
			detail: {
				path,
				templatePath: path,
				source: 'tree'
			}
		}))
	}

	onCopySelectedPathClick(e) {
		e?.stopPropagation?.();
		e?.preventDefault?.();
		const path = this._resolveSelectedPath();
		if (!path) return;
		if (navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(path).catch(() => {});
		}
	}

	_resolveSelectedPath() {
		if (this.selected) return this.selected;
		if (this._selectedNode?.path) return this._selectedNode.path;
		const activeRow = this.renderRoot?.querySelector?.('.row[active]');
		const activeModel = getModelByDom(activeRow);
		if (activeModel?.path) return activeModel.path;
		if (activeModel?.row?.path) return activeModel.row.path;
		return '';
	}

	_resolveModelFromEvent(e) {
		const path = e?.composedPath?.() || [];
		for (const node of path) {
			if (!node || typeof node !== 'object') continue;
			const model = this._extractRowModel(getModelByDom(node));
			if (model) return { row: model };
		}
		const firstElement = path.find((node) => node?.closest);
		if (firstElement?.closest) {
			const rowEl = firstElement.closest('.row');
			const rowModel = this._extractRowModel(getModelByDom(rowEl));
			if (rowModel) return { row: rowModel };
			const cell = firstElement.closest('.cell');
			const model = this._extractRowModel(getModelByDom(cell));
			if (model) return { row: model };
		}
		if (this._selectedNode?.path) {
			return { row: this._selectedNode };
		}
		return null;
	}

	_extractRowModel(model) {
		if (!model || typeof model !== 'object') return null;
		if (model.row && typeof model.row === 'object') return model.row;
		for (const value of Object.values(model)) {
			if (!value || typeof value !== 'object') continue;
			if ('path' in value || 'node' in value) return value;
		}
		return null;
	}

	_resolveDropTargetPath(e) {
		const model = this._resolveModelFromEvent(e);
		if (model?.row?.path) return model.row.path;
		if (model?.row?.node) return getXPath(model.row.node);
		if (this._selectedNode?.path) return this._selectedNode.path;
		if (Array.isArray(this.data) && this.data.length > 0) return this.data[0]?.path || '';
		return '';
	}

	_getDropPosition(e) {
		if (e?.ctrlKey) return 'after';
		if (e?.shiftKey) return 'before';
		const model = this._resolveModelFromEvent(e);
		if (String(model?.row?.node?.localName || '').toLowerCase() === 'template') {
			return 'in';
		}

		const rowEl = (e?.composedPath?.() || []).find((node) => node?.classList?.contains?.('row'));
		const rect = rowEl?.getBoundingClientRect?.();
		if (!rect) return 'in';

		const y = Number(e?.clientY);
		if (!Number.isFinite(y)) return 'in';

		const beforeZone = Math.min(12, Math.max(4, rect.height * 0.3));
		return y <= rect.top + beforeZone ? 'before' : 'in';
	}

	_extractDragPayload(e) {
		let move = String(e?.dataTransfer?.getData?.('dev/move') || '').trim();
		let moveSource = String(e?.dataTransfer?.getData?.('dev/move-source') || '').trim();
		let element = String(e?.dataTransfer?.getData?.('dev/element') || '').trim();
		const plain = String(e?.dataTransfer?.getData?.('text/plain') || '').trim();

		if (!move && plain.startsWith('dev:move:')) {
			move = plain.replace('dev:move:', '').trim();
		}
		if (!element && plain.startsWith('dev:element:')) {
			element = plain.replace('dev:element:', '').trim();
		}
		if (!move && !element && this._isValidElementName(plain)) {
			element = plain;
		}

		if (move) return { kind: 'move', value: move, source: moveSource || '' };
		if (this._isValidElementName(element)) return { kind: 'add', value: element };
		return null;
	}

	_hasDragPayload(e) {
		const types = [...(e?.dataTransfer?.types || [])].map((t) => String(t).toLowerCase());
		if (types.includes('dev/element') || types.includes('dev/move') || types.includes('text/plain')) {
			return true;
		}
		const payload = this._extractDragPayload(e);
		return Boolean(payload);
	}

	_isValidElementName(name) {
		const value = String(name || '').trim().toLowerCase();
		return /^[a-z][a-z0-9._-]*-[a-z0-9._-]+$/.test(value);
	}
}



customElements.define('pl-tree-list', TreeList);
