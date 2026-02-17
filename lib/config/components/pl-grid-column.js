const JUSTIFY_OPTIONS = [
  { value: 'left', text: 'Слева' },
  { value: 'center', text: 'По центру' },
  { value: 'right', text: 'Справа' }
];

const KIND_OPTIONS = [
  { value: '', text: 'Обычный текст' },
  { value: 'date', text: 'Дата' }
];

const SORT_OPTIONS = [
  { value: '', text: 'Нет' },
  { value: 'asc', text: 'По возрастанию' },
  { value: 'desc', text: 'По убыванию' }
];

function resolveGridColumnHighlightTarget(node) {
  if (!(node instanceof Element) || node.localName !== 'pl-grid-column') return node;
  const grid = node.closest('pl-grid');
  const gridRoot = grid?.shadowRoot || grid?.root || null;
  if (!grid || !gridRoot) return grid || node;

  const col = grid?._columns?.find?.((item) => item?.node === node);
  const columnClass = col?.class || (Number.isInteger(node._index) ? `column-${node._index}` : null);
  if (!columnClass) return grid;

  const queryInsideGrid = (selector) => {
    let items = [...gridRoot.querySelectorAll(selector)];
    if (gridRoot !== grid.shadowRoot) {
      items = items.filter((el) => el?.closest?.('pl-grid') === grid);
    }
    return items.filter(Boolean);
  };

  // Приоритет: подсветка заголовка колонки.
  const header = queryInsideGrid(`.headerEl.${columnClass}`);
  if (header.length > 0) return header;

  // Fallback: вертикальная полоса тела.
  const body = queryInsideGrid(`.row .cell.${columnClass}`);
  if (body.length > 0) return body;

  return grid;
}

export default {
  component: 'pl-grid-column',
  title: 'pl-grid-column',
  description: 'Колонка pl-grid: заголовок, ширина, сортировка и шаблоны ячейки.',
  selection: {
    resolveHighlightTarget: resolveGridColumnHighlightTarget
  },
  order: [
    'header',
    'field',
    'titleField',
    'kind',
    'format',
    'width',
    'minWidth',
    'justify',
    'sortable',
    'sort',
    'resizable',
    'hidden',
    'fixed',
    'action'
  ],
  groups: {
    content: {
      title: 'Содержимое',
      description: 'Текст заголовка, поле данных и формат.',
      order: 10
    },
    sizing: {
      title: 'Размеры',
      description: 'Ширина и ограничения колонки.',
      order: 20
    },
    behavior: {
      title: 'Поведение',
      description: 'Сортировка, resize и режимы фиксации.',
      order: 30
    }
  },
  properties: {
    header: {
      label: 'Заголовок',
      editor: 'text',
      group: 'content',
      placeholder: 'Наименование'
    },
    field: {
      label: 'Поле',
      editor: 'text',
      group: 'content',
      placeholder: 'name'
    },
    titleField: {
      label: 'Поле tooltip',
      editor: 'text',
      group: 'content',
      placeholder: 'description'
    },
    kind: {
      label: 'Тип данных',
      editor: 'select',
      group: 'content',
      options: KIND_OPTIONS
    },
    format: {
      label: 'Формат',
      editor: 'text',
      group: 'content',
      placeholder: 'DD.MM.YYYY'
    },
    width: {
      label: 'Ширина (px)',
      editor: 'number',
      group: 'sizing'
    },
    minWidth: {
      label: 'Минимальная ширина (px)',
      editor: 'number',
      group: 'sizing'
    },
    justify: {
      label: 'Выравнивание',
      editor: 'select',
      group: 'behavior',
      options: JUSTIFY_OPTIONS
    },
    sortable: {
      label: 'Разрешить сортировку',
      editor: 'boolean',
      group: 'behavior'
    },
    sort: {
      label: 'Сортировка',
      editor: 'select',
      group: 'behavior',
      options: SORT_OPTIONS
    },
    resizable: {
      label: 'Разрешить resize',
      editor: 'boolean',
      group: 'behavior'
    },
    hidden: {
      label: 'Скрыть колонку',
      editor: 'boolean',
      group: 'behavior'
    },
    fixed: {
      label: 'Фиксировать слева',
      editor: 'boolean',
      group: 'behavior'
    },
    action: {
      label: 'Action колонка',
      editor: 'boolean',
      group: 'behavior'
    }
  }
};
