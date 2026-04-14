import { getEditorComponentConfig } from "./config/component-editor-config.js";

const COMPONENT_GROUPS = Object.freeze([
  {
    id: "inputs",
    title: "Поля ввода",
    items: [
      "pl-input",
      "pl-input-mask",
      "pl-combobox",
      "pl-datetime",
      "pl-checkbox",
      "pl-radio-group",
      "pl-radio-button",
      "pl-textarea"
    ]
  },
  {
    id: "buttons",
    title: "Кнопки",
    items: [
      "pl-button",
      "pl-icon-button"
    ]
  },
  {
    id: "layout",
    title: "Лэйаут",
    items: [
      "pl-flex-layout",
      "pl-grid",
      "pl-grid-column",
      "pl-tabpanel",
      "pl-tab"
    ]
  },
  {
    id: "data",
    title: "Данные",
    items: [
      "pl-dataset",
      "pl-action",
      "pl-data-observer",
      "pl-valid-observer"
    ]
  },
  {
    id: "other",
    title: "Прочее",
    items: [
      "pl-icon",
      "pl-badge"
    ]
  }
]);

const COMPONENT_ICONS = Object.freeze({
  "pl-action": { iconset: "pl-default", icon: "trigger" },
  "pl-badge": { iconset: "pl-default", icon: "star" },
  "pl-button": { iconset: "pl-default", icon: "plus-s" },
  "pl-checkbox": { iconset: "pl-default", icon: "check" },
  "pl-combobox": { iconset: "pl-default", icon: "catalog" },
  "pl-data-observer": { iconset: "pl-default", icon: "view" },
  "pl-data-tree": { iconset: "pl-default", icon: "sequence" },
  "pl-dataset": { iconset: "pl-default", icon: "database" },
  "pl-datetime": { iconset: "pl-default", icon: "datetime" },
  "pl-dom-if": { iconset: "pl-default", icon: "function" },
  "pl-drawer": { iconset: "pl-default", icon: "catalog-3" },
  "pl-dropdown": { iconset: "pl-default", icon: "chevron-down" },
  "pl-flex-layout": { iconset: "pl-default", icon: "layers" },
  "pl-form": { iconset: "pl-editor", icon: "form-editor" },
  "pl-grid": { iconset: "pl-default", icon: "table" },
  "pl-grid-column": { iconset: "pl-default", icon: "table" },
  "pl-icon": { iconset: "pl-default", icon: "star" },
  "pl-icon-button": { iconset: "pl-default", icon: "star" },
  "pl-input": { iconset: "pl-default", icon: "pencil" },
  "pl-input-mask": { iconset: "pl-default", icon: "function" },
  "pl-labeled-container": { iconset: "pl-default", icon: "catalog-2" },
  "pl-popover": { iconset: "pl-default", icon: "info-circle" },
  "pl-radio-button": { iconset: "pl-default", icon: "check-circle" },
  "pl-radio-group": { iconset: "pl-default", icon: "sequence" },
  "pl-repeat": { iconset: "pl-default", icon: "repeat" },
  "pl-tab": { iconset: "pl-default", icon: "book" },
  "pl-tabpanel": { iconset: "pl-default", icon: "layers" },
  "pl-table": { iconset: "pl-default", icon: "table" },
  "pl-table-column": { iconset: "pl-default", icon: "table" },
  "pl-textarea": { iconset: "pl-default", icon: "file" },
  "pl-tooltip": { iconset: "pl-default", icon: "info-circle" },
  "pl-valid-observer": { iconset: "pl-default", icon: "check-circle" },
  "pl-virtual-scroll": { iconset: "pl-default", icon: "view" },
  "template": { iconset: "pl-default", icon: "code" },
  "unknown": { iconset: "pl-default", icon: "file" }
});

export function getComponentIconMeta(componentName) {
  const name = String(componentName || "").trim().toLowerCase();
  if (!name) return COMPONENT_ICONS.unknown;
  if (name.startsWith("pl-form-")) return COMPONENT_ICONS["pl-form"];
  return COMPONENT_ICONS[name] || COMPONENT_ICONS.unknown;
}

export function getComponentDisplayLabel(componentName) {
  const normalized = String(componentName || "").trim().toLowerCase();
  const config = getEditorComponentConfig(normalized);
  return config?.title || normalized || "component";
}

export function getComponentLibraryGroups() {
  return COMPONENT_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    items: group.items.map((cmp) => {
      const config = getEditorComponentConfig(cmp);
      const iconMeta = getComponentIconMeta(cmp);
      return {
        cmp,
        label: config?.title || cmp,
        description: config?.description || "",
        icon: iconMeta.icon,
        iconset: iconMeta.iconset,
        searchText: [cmp, config?.title, config?.description, group.title].filter(Boolean).join(" ").toLowerCase()
      };
    })
  }));
}

export function getTreeNodeIconMeta(node, fallbackName = "") {
  const localName = String(node?.localName || fallbackName || "").trim().toLowerCase();
  if (!localName) return COMPONENT_ICONS.unknown;
  if (localName === "template") return COMPONENT_ICONS.template;
  return getComponentIconMeta(localName);
}
