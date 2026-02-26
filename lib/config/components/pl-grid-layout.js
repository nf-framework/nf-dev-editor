const ALIGN_OPTIONS = [
  { value: 'start', text: '', title: 'По началу (start)' },
  { value: 'end', text: '', title: 'По концу (end)' },
  { value: 'center', text: '', title: 'По центру (center)' },
  { value: 'stretch', text: '', title: 'Растянуть (stretch)' }
];

const JUSTIFY_OPTIONS = [
  { value: 'start', text: '', title: 'По началу (start)' },
  { value: 'end', text: '', title: 'По концу (end)' },
  { value: 'center', text: '', title: 'По центру (center)' },
  { value: 'stretch', text: '', title: 'Растянуть (stretch)' }
];

const CONTENT_SPACE_OPTIONS = [
  { value: '', text: 'По умолчанию', title: 'Не задавать' },
  { value: 'normal', text: 'normal', title: 'Normal' },
  { value: 'start', text: 'start', title: 'Start' },
  { value: 'end', text: 'end', title: 'End' },
  { value: 'center', text: 'center', title: 'Center' },
  { value: 'space-between', text: 'space-between', title: 'Space Between' },
  { value: 'space-around', text: 'space-around', title: 'Space Around' },
  { value: 'space-evenly', text: 'space-evenly', title: 'Space Evenly' },
  { value: 'stretch', text: 'stretch', title: 'Stretch' }
];

const AUTO_FLOW_OPTIONS = [
  { value: 'row', text: 'row', title: 'Заполнять строки (row)' },
  { value: 'column', text: 'column', title: 'Заполнять колонки (column)' },
  { value: 'row dense', text: 'row dense', title: 'row dense' },
  { value: 'column dense', text: 'column dense', title: 'column dense' }
];

export default {
  component: 'pl-grid-layout',
  title: 'pl-grid-layout',
  description: 'CSS Grid контейнер с параметрами раскладки и размеров.',
  order: [
    'columns', 'rows', 'areas', 'gap', 'rowGap', 'columnGap', 'autoFlow', 'autoColumns', 'autoRows',
    'alignItems', 'justifyItems', 'placeItems', 'alignContent', 'justifyContent', 'placeContent',
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'padding', 'margin',
    'stretch', 'fit', 'scrollable', 'hidden'
  ],
  groups: {
    template: {
      title: 'Шаблон грида',
      description: 'Определение строк, колонок и зон.',
      order: 10
    },
    alignment: {
      title: 'Выравнивание',
      description: 'Выравнивание grid-элементов и контейнера.',
      order: 20
    },
    sizing: {
      title: 'Размеры',
      description: 'Размеры и отступы контейнера.',
      order: 30
    },
    state: {
      title: 'Состояние',
      description: 'Режим отображения контейнера.',
      order: 40
    }
  },
  properties: {
    columns: {
      label: 'Колонки',
      editor: 'text',
      group: 'template',
      description: 'Значение для grid-template-columns.'
    },
    rows: {
      label: 'Строки',
      editor: 'text',
      group: 'template',
      description: 'Значение для grid-template-rows.'
    },
    areas: {
      label: 'Области (areas)',
      editor: 'textarea',
      group: 'template',
      description: 'Значение для grid-template-areas.'
    },
    gap: {
      label: 'Отступ между ячейками',
      editor: 'text',
      group: 'template',
      placeholder: '8px',
      description: 'Применяется как gap.'
    },
    rowGap: {
      label: 'Вертикальный gap',
      editor: 'text',
      group: 'template',
      placeholder: '8px',
      description: 'Верх-Низ между строками.'
    },
    columnGap: {
      label: 'Горизонтальный gap',
      editor: 'text',
      group: 'template',
      placeholder: '8px',
      description: 'Лево-право между колонками.'
    },
    autoFlow: {
      label: 'Auto flow',
      editor: 'select',
      group: 'template',
      options: AUTO_FLOW_OPTIONS
    },
    autoColumns: {
      label: 'auto columns',
      editor: 'text',
      group: 'template',
      description: 'Значение для grid-auto-columns.'
    },
    autoRows: {
      label: 'auto rows',
      editor: 'text',
      group: 'template',
      description: 'Значение для grid-auto-rows.'
    },
    alignItems: {
      label: 'Align items',
      editor: 'select',
      group: 'alignment',
      options: ALIGN_OPTIONS
    },
    justifyItems: {
      label: 'Justify items',
      editor: 'select',
      group: 'alignment',
      options: JUSTIFY_OPTIONS
    },
    placeItems: {
      label: 'Place items',
      editor: 'text',
      group: 'alignment',
      description: 'Короткая запись align-items / justify-items.'
    },
    alignContent: {
      label: 'Align content',
      editor: 'select',
      group: 'alignment',
      options: CONTENT_SPACE_OPTIONS
    },
    justifyContent: {
      label: 'Justify content',
      editor: 'select',
      group: 'alignment',
      options: CONTENT_SPACE_OPTIONS
    },
    placeContent: {
      label: 'Place content',
      editor: 'text',
      group: 'alignment',
      description: 'Короткая запись align-content / justify-content.'
    },
    width: {
      label: 'Width',
      editor: 'text',
      group: 'sizing',
      placeholder: '100px или 100%'
    },
    height: {
      label: 'Height',
      editor: 'text',
      group: 'sizing',
      placeholder: '200px или 100%'
    },
    minWidth: {
      label: 'Min width',
      editor: 'text',
      group: 'sizing',
      placeholder: '0px'
    },
    minHeight: {
      label: 'Min height',
      editor: 'text',
      group: 'sizing',
      placeholder: '0px'
    },
    maxWidth: {
      label: 'Max width',
      editor: 'text',
      group: 'sizing',
      placeholder: '100%'
    },
    maxHeight: {
      label: 'Max height',
      editor: 'text',
      group: 'sizing',
      placeholder: '100%'
    },
    padding: {
      label: 'Padding',
      editor: 'text',
      group: 'sizing',
      placeholder: '12px'
    },
    margin: {
      label: 'Margin',
      editor: 'text',
      group: 'sizing',
      placeholder: '0'
    },
    stretch: {
      label: 'Растянуть по ширине',
      editor: 'boolean',
      group: 'state'
    },
    fit: {
      label: 'Заполнить контейнер',
      editor: 'boolean',
      group: 'state',
      description: 'Высота + ширина 100%.'
    },
    scrollable: {
      label: 'Overflow auto',
      editor: 'boolean',
      group: 'state',
      description: 'Добавляет прокрутку если содержимое больше области.'
    },
    hidden: {
      label: 'Скрыть',
      editor: 'boolean',
      group: 'state'
    }
  }
};
