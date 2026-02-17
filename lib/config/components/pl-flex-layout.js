const ALIGN_OPTIONS = [
  { value: 'flex-start', text: 'По началу', icon: 'arrow-up', title: 'Прижать к началу поперечной оси (flex-start)' },
  { value: 'center', text: 'По центру', icon: 'minus', title: 'Выровнять по центру поперечной оси (center)' },
  { value: 'flex-end', text: 'По концу', icon: 'arrow-down', title: 'Прижать к концу поперечной оси (flex-end)' },
  { value: 'baseline', text: 'Базовая линия', icon: 'code', title: 'Выровнять по базовой линии текста (baseline)' }
];

const JUSTIFY_OPTIONS = [
  { value: 'flex-start', text: 'По началу', icon: 'arrow-left', title: 'Прижать к началу основной оси (flex-start)' },
  { value: 'center', text: 'По центру', icon: 'minus', title: 'Выровнять по центру основной оси (center)' },
  { value: 'flex-end', text: 'По концу', icon: 'arrow-right', title: 'Прижать к концу основной оси (flex-end)' },
  { value: 'space-between', text: 'С интервалом', icon: 'more-horizontal', title: 'Распределить с интервалами (space-between)' }
];

export default {
  component: 'pl-flex-layout',
  title: 'pl-flex-layout',
  description: 'Гибкий контейнер для раскладки дочерних элементов.',
  order: [
    'vertical',
    'wrap',
    'align',
    'justify',
    'gap',
    'stretch',
    'fit',
    'scrollable',
    'labelWidth',
    'hidden'
  ],
  groups: {
    flow: {
      title: 'Поток',
      description: 'Направление и распределение элементов внутри контейнера.',
      order: 10
    },
    sizing: {
      title: 'Размеры',
      description: 'Управление растяжением и отступами.',
      order: 20
    },
    state: {
      title: 'Состояние',
      description: 'Служебные флаги отображения.',
      order: 30
    }
  },
  properties: {
    vertical: {
      label: 'Вертикальная ось',
      editor: 'boolean',
      group: 'flow',
      description: 'Включает направление column вместо row.'
    },
    wrap: {
      label: 'Перенос строк',
      editor: 'boolean',
      group: 'flow',
      description: 'Разрешает перенос элементов на следующую строку.'
    },
    align: {
      label: 'Выравнивание по поперечной оси',
      editor: 'icon-group',
      group: 'flow',
      options: ALIGN_OPTIONS
    },
    justify: {
      label: 'Выравнивание по основной оси',
      editor: 'icon-group',
      group: 'flow',
      options: JUSTIFY_OPTIONS
    },
    gap: {
      label: 'Отступ между элементами (px)',
      editor: 'number',
      group: 'sizing',
      placeholder: 'Например 8'
    },
    stretch: {
      label: 'Растянуть по ширине',
      editor: 'boolean',
      group: 'sizing'
    },
    fit: {
      label: 'Занимать доступное место',
      editor: 'boolean',
      group: 'sizing'
    },
    scrollable: {
      label: 'Прокрутка',
      editor: 'boolean',
      group: 'sizing',
      description: 'Добавляет overflow:auto.'
    },
    labelWidth: {
      label: 'Ширина labels (px)',
      editor: 'number',
      group: 'sizing',
      placeholder: 'Например 180'
    },
    hidden: {
      label: 'Скрыть элемент',
      editor: 'boolean',
      group: 'state'
    }
  }
};
