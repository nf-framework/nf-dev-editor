export default {
  component: 'pl-grid',
  title: 'pl-grid',
  description: 'Табличный компонент с поддержкой tree, выбора строк, resize и сортировки колонок.',
  order: [
    'data',
    'selected',
    'tree',
    'keyField',
    'pkeyField',
    'hasChildField',
    'multiSelect',
    'variableRowHeight',
    'growing'
  ],
  groups: {
    bindings: {
      title: 'Биндинги',
      description: 'Привязка данных и выбранной строки.',
      order: 10
    },
    tree: {
      title: 'Дерево',
      description: 'Настройки иерархической модели id/pid.',
      order: 20
    },
    behavior: {
      title: 'Поведение',
      description: 'Режим выбора и особенности отрисовки строк.',
      order: 30
    }
  },
  properties: {
    data: {
      label: 'Data',
      editor: 'text',
      group: 'bindings',
      placeholder: '{{rows}}',
      description: 'Массив строк для отображения.'
    },
    selected: {
      label: 'Selected',
      editor: 'text',
      group: 'bindings',
      placeholder: '{{selected}}',
      description: 'Текущая выбранная строка.'
    },
    tree: {
      label: 'Древовидный режим',
      editor: 'boolean',
      group: 'tree'
    },
    keyField: {
      label: 'ID поле (keyField)',
      editor: 'text',
      group: 'tree',
      placeholder: 'id'
    },
    pkeyField: {
      label: 'Parent поле (pkeyField)',
      editor: 'text',
      group: 'tree',
      placeholder: 'pid'
    },
    hasChildField: {
      label: 'Признак детей (hasChildField)',
      editor: 'text',
      group: 'tree',
      placeholder: '_haschildren'
    },
    multiSelect: {
      label: 'Множественный выбор',
      editor: 'boolean',
      group: 'behavior'
    },
    variableRowHeight: {
      label: 'Переменная высота строк',
      editor: 'boolean',
      group: 'behavior'
    },
    growing: {
      label: 'Growing режим',
      editor: 'boolean',
      group: 'behavior',
      description: 'Дозагрузка данных при прокрутке.'
    }
  }
};

