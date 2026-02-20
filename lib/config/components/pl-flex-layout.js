const ALIGN_OPTIONS = [
  { value: 'flex-start', text: '', title: 'По началу поперечной оси (flex-start)', icon: 'align-start', iconset: 'pl-editor' },
  { value: 'center', text: '', title: 'По центру поперечной оси (center)', icon: 'align-center', iconset: 'pl-editor' },
  { value: 'flex-end', text: '', title: 'По концу поперечной оси (flex-end)', icon: 'align-end', iconset: 'pl-editor' },
  { value: 'baseline', text: '', title: 'По базовой линии текста (baseline)', icon: 'align-baseline', iconset: 'pl-editor' }
];

const JUSTIFY_OPTIONS = [
  { value: 'flex-start', text: '', title: 'По началу основной оси (flex-start)', icon: 'justify-start', iconset: 'pl-editor' },
  { value: 'center', text: '', title: 'По центру основной оси (center)', icon: 'justify-center', iconset: 'pl-editor' },
  { value: 'flex-end', text: '', title: 'По концу основной оси (flex-end)', icon: 'justify-end', iconset: 'pl-editor' },
  { value: 'space-between', text: '', title: 'Распределить с интервалом (space-between)', icon: 'justify-space-between', iconset: 'pl-editor' }
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
