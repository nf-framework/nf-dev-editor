const VARIANT_OPTIONS = [
  { value: 'primary', text: 'Primary' },
  { value: 'secondary', text: 'Secondary' },
  { value: 'ghost', text: 'Ghost' },
  { value: 'link', text: 'Link' }
];

const SIZE_OPTIONS = [
  { value: '', text: 'Базовый (theme)' },
  { value: 'small', text: 'Small' },
  { value: 'medium', text: 'Medium' },
  { value: 'large', text: 'Large' }
];

export default {
  component: 'pl-button',
  title: 'pl-button',
  description: 'Кнопка действий с вариантами отображения и состояниями disabled/loading.',
  order: [
    'label',
    'variant',
    'size',
    'negative',
    'disabled',
    'loading',
    'hidden'
  ],
  groups: {
    content: {
      title: 'Контент',
      description: 'Текст кнопки и базовый смысловой контент.',
      order: 10
    },
    appearance: {
      title: 'Внешний вид',
      description: 'Вариант отображения, размер и негативный тон.',
      order: 20
    },
    state: {
      title: 'Состояние',
      description: 'Управление доступностью и видимостью кнопки.',
      order: 30
    }
  },
  properties: {
    label: {
      label: 'Текст кнопки',
      editor: 'text',
      group: 'content',
      placeholder: 'Например: Сохранить'
    },
    variant: {
      label: 'Вариант',
      editor: 'select',
      group: 'appearance',
      options: VARIANT_OPTIONS
    },
    size: {
      label: 'Размер',
      editor: 'select',
      group: 'appearance',
      options: SIZE_OPTIONS
    },
    negative: {
      label: 'Негативный тон',
      editor: 'boolean',
      group: 'appearance',
      description: 'Переключает палитру кнопки на negative tokens.'
    },
    disabled: {
      label: 'Disabled',
      editor: 'boolean',
      group: 'state'
    },
    loading: {
      label: 'Loading',
      editor: 'boolean',
      group: 'state'
    },
    hidden: {
      label: 'Скрыть',
      editor: 'boolean',
      group: 'state'
    }
  }
};

