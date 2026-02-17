import plFlexLayoutConfig from './components/pl-flex-layout.js';
import plActionConfig from './components/pl-action.js';
import plGridConfig from './components/pl-grid.js';
import plGridColumnConfig from './components/pl-grid-column.js';

const configs = new Map(
  [plFlexLayoutConfig, plActionConfig, plGridConfig, plGridColumnConfig].map((config) => [String(config.component || '').toLowerCase(), config])
);

const defaultGroup = Object.freeze({
  id: 'common',
  title: 'Свойства',
  description: '',
  order: 1000
});

export function getEditorComponentConfig(componentName) {
  return configs.get(String(componentName || '').toLowerCase()) || null;
}

export function getEditorPropertyConfig(componentConfig, propertyName) {
  if (!componentConfig?.properties) return null;
  return componentConfig.properties[propertyName] || null;
}

export function getEditorGroup(componentConfig, groupId) {
  if (!groupId || !componentConfig?.groups) return defaultGroup;
  const group = componentConfig.groups[groupId];
  if (!group) return defaultGroup;
  return {
    id: groupId,
    title: group.title || groupId,
    description: group.description || '',
    order: Number.isFinite(group.order) ? group.order : defaultGroup.order
  };
}

export function getPropertyOrder(componentConfig, propertyName) {
  if (!componentConfig?.order || !Array.isArray(componentConfig.order)) return Number.MAX_SAFE_INTEGER;
  const index = componentConfig.order.indexOf(propertyName);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function getEditorSelectionResolver(componentName) {
  const config = getEditorComponentConfig(componentName);
  const resolver = config?.selection?.resolveHighlightTarget;
  return typeof resolver === 'function' ? resolver : null;
}
