const ORIENTATION_OPTIONS = [
  { value: 'vertical', text: 'Вертикально' },
  { value: 'horizontal', text: 'Горизонтально' }
];

const DIRECTION_OPTIONS = [
  { value: 'down', text: 'Вниз' },
  { value: 'down-left', text: 'Вниз-слева' },
  { value: 'up', text: 'Вверх' },
  { value: 'up-left', text: 'Вверх-слева' },
  { value: 'right', text: 'Вправо' },
  { value: 'right-up', text: 'Вправо-вверх' },
  { value: 'left', text: 'Влево' },
  { value: 'left-up', text: 'Влево-вверх' }
];

const VARIANT_OPTIONS = [
  { value: 'primary', text: 'Primary' },
  { value: 'secondary', text: 'Secondary' },
  { value: 'ghost', text: 'Ghost' },
  { value: 'link', text: 'Link' }
];

const INPUT_TYPE_OPTIONS = [
  { value: 'text', text: 'text' },
  { value: 'number', text: 'number' },
  { value: 'password', text: 'password' },
  { value: 'email', text: 'email' },
  { value: 'tel', text: 'tel' },
  { value: 'date', text: 'date' },
  { value: 'datetime-local', text: 'datetime-local' },
  { value: 'time', text: 'time' },
  { value: 'color', text: 'color' },
  { value: 'range', text: 'range' }
];

const DATE_TIME_TYPE_OPTIONS = [
  { value: 'date', text: 'Дата' },
  { value: 'datetime', text: 'Дата и время' }
];

const DRAWER_SIZE_OPTIONS = [
  { value: 'small', text: 'Small' },
  { value: 'medium', text: 'Medium' },
  { value: 'large', text: 'Large' }
];

const DRAWER_POSITION_OPTIONS = [
  { value: 'left', text: 'Слева' },
  { value: 'right', text: 'Справа' }
];

const MASK_TYPE_OPTIONS = [
  { value: 'pattern', text: 'Pattern' },
  { value: 'regexp', text: 'Regexp' },
  { value: 'date', text: 'Date' },
  { value: 'number', text: 'Number' }
];

const COMBOBOX_VARIANT_OPTIONS = [
  { value: 'text', text: 'Text' },
  { value: 'tags', text: 'Tags' }
];

const ALIGN_OPTIONS = [
  { value: 'left', text: 'Слева' },
  { value: 'center', text: 'По центру' },
  { value: 'right', text: 'Справа' }
];

const KIND_OPTIONS = [
  { value: '', text: 'Текст' },
  { value: 'date', text: 'Дата' }
];

const SORT_OPTIONS = [
  { value: '', text: 'Нет' },
  { value: 'asc', text: 'По возрастанию' },
  { value: 'desc', text: 'По убыванию' }
];

const METHOD_OPTIONS = [
  { value: 'POST', text: 'POST' },
  { value: 'GET', text: 'GET' },
  { value: 'PUT', text: 'PUT' },
  { value: 'PATCH', text: 'PATCH' },
  { value: 'DELETE', text: 'DELETE' }
];

export default [
  {
    component: 'pl-badge',
    title: 'pl-badge',
    description: 'Бейдж/индикатор состояния.',
    order: ['pulse', 'hidden'],
    groups: {
      appearance: { title: 'Внешний вид', description: 'Анимация бейджа.', order: 10 },
      state: { title: 'Состояние', description: 'Управление видимостью.', order: 20 }
    },
    properties: {
      pulse: { label: 'Пульсация', editor: 'boolean', group: 'appearance' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' }
    }
  },
  {
    component: 'pl-checkbox',
    title: 'pl-checkbox',
    description: 'Чекбокс с подписью и состояниями readonly/disabled.',
    order: ['label', 'caption', 'checked', 'orientation', 'readonly', 'disabled', 'hidden'],
    groups: {
      content: { title: 'Контент', description: 'Текст и выбранное состояние.', order: 10 },
      layout: { title: 'Расположение', description: 'Ориентация и вид размещения.', order: 20 },
      state: { title: 'Состояние', description: 'Доступность и видимость.', order: 30 }
    },
    properties: {
      label: { label: 'Label', editor: 'text', group: 'content' },
      caption: { label: 'Подпись', editor: 'text', group: 'content' },
      checked: { label: 'Выбран', editor: 'boolean', group: 'content' },
      orientation: { label: 'Ориентация', editor: 'select', group: 'layout', options: ORIENTATION_OPTIONS },
      readonly: { label: 'Readonly', editor: 'boolean', group: 'state' },
      disabled: { label: 'Disabled', editor: 'boolean', group: 'state' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' }
    }
  },
  {
    component: 'pl-combobox',
    title: 'pl-combobox',
    description: 'Селект/поиск со списком, мультивыбором и tree-режимом.',
    order: [
      'label', 'placeholder', 'data', 'value', 'textProperty', 'valueProperty', 'titleProperty',
      'multiSelect', 'variant', 'allowCustomValue', 'tree', 'keyProperty', 'pkeyProperty',
      'hasChildProperty', 'selectOnlyLeaf', 'direction', 'required', 'readonly', 'disabled',
      'autocomplete', 'stretch', 'hidden'
    ],
    groups: {
      bindings: { title: 'Биндинги', description: 'Источник данных и поля значения.', order: 10 },
      selection: { title: 'Выбор', description: 'Режим выбора и поведение.', order: 20 },
      tree: { title: 'Дерево', description: 'Поля id/pid для иерархии.', order: 30 },
      state: { title: 'Состояние', description: 'Доступность и отображение.', order: 40 }
    },
    properties: {
      label: { label: 'Label', editor: 'text', group: 'bindings' },
      placeholder: { label: 'Placeholder', editor: 'text', group: 'bindings' },
      data: { label: 'Data', editor: 'text', group: 'bindings', placeholder: '{{rows}}' },
      value: { label: 'Value', editor: 'text', group: 'bindings' },
      textProperty: { label: 'Text property', editor: 'text', group: 'bindings', placeholder: 'text' },
      valueProperty: { label: 'Value property', editor: 'text', group: 'bindings', placeholder: 'value' },
      titleProperty: { label: 'Title property', editor: 'text', group: 'bindings' },
      multiSelect: { label: 'Мультивыбор', editor: 'boolean', group: 'selection' },
      variant: {
        label: 'Вариант мультивыбора',
        editor: 'select',
        group: 'selection',
        options: COMBOBOX_VARIANT_OPTIONS,
        visibleWhen: { prop: 'multiSelect', equals: true }
      },
      allowCustomValue: { label: 'Разрешить custom value', editor: 'boolean', group: 'selection' },
      direction: { label: 'Направление dropdown', editor: 'select', group: 'selection', options: DIRECTION_OPTIONS },
      tree: { label: 'Tree режим', editor: 'boolean', group: 'tree' },
      keyProperty: {
        label: 'ID поле (keyProperty)',
        editor: 'text',
        group: 'tree',
        placeholder: 'id',
        visibleWhen: { prop: 'tree', equals: true }
      },
      pkeyProperty: {
        label: 'Parent поле (pkeyProperty)',
        editor: 'text',
        group: 'tree',
        placeholder: 'pid',
        visibleWhen: { prop: 'tree', equals: true }
      },
      hasChildProperty: {
        label: 'Признак детей',
        editor: 'text',
        group: 'tree',
        placeholder: '_haschildren',
        visibleWhen: { prop: 'tree', equals: true }
      },
      selectOnlyLeaf: {
        label: 'Выбирать только листья',
        editor: 'boolean',
        group: 'tree',
        visibleWhen: { prop: 'tree', equals: true }
      },
      required: { label: 'Required', editor: 'boolean', group: 'state' },
      readonly: { label: 'Readonly', editor: 'boolean', group: 'state' },
      disabled: { label: 'Disabled', editor: 'boolean', group: 'state' },
      autocomplete: { label: 'Autocomplete', editor: 'boolean', group: 'state' },
      stretch: { label: 'Stretch', editor: 'boolean', group: 'state' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' }
    }
  },
  {
    component: 'pl-data-observer',
    title: 'pl-data-observer',
    description: 'Трекинг изменений массива/объектов.',
    order: ['data', 'isChanged'],
    groups: {
      bindings: { title: 'Биндинги', description: 'Подключение наблюдаемой модели.', order: 10 },
      state: { title: 'Состояние', description: 'Признак изменений.', order: 20 }
    },
    properties: {
      data: { label: 'Data', editor: 'text', group: 'bindings', placeholder: '{{data}}' },
      isChanged: { label: 'Есть изменения', editor: 'boolean', group: 'state', readonly: true }
    }
  },
  {
    component: 'pl-data-tree',
    title: 'pl-data-tree',
    description: 'Преобразование массива id/pid в плоское дерево.',
    order: ['in', 'out', 'bypass', 'keyField', 'pkeyField', 'hasChildField'],
    groups: {
      bindings: { title: 'Биндинги', description: 'Входной и выходной массив.', order: 10 },
      tree: { title: 'Дерево', description: 'Параметры иерархии.', order: 20 }
    },
    properties: {
      in: { label: 'In', editor: 'text', group: 'bindings', placeholder: '{{rows}}' },
      out: { label: 'Out', editor: 'text', group: 'bindings', placeholder: '{{treeRows}}' },
      bypass: { label: 'Bypass преобразование', editor: 'boolean', group: 'tree' },
      keyField: {
        label: 'ID поле',
        editor: 'text',
        group: 'tree',
        placeholder: 'id',
        visibleWhen: { prop: 'bypass', equals: false }
      },
      pkeyField: {
        label: 'Parent поле',
        editor: 'text',
        group: 'tree',
        placeholder: 'pid',
        visibleWhen: { prop: 'bypass', equals: false }
      },
      hasChildField: {
        label: 'Признак детей',
        editor: 'text',
        group: 'tree',
        placeholder: '_haschildren',
        visibleWhen: { prop: 'bypass', equals: false }
      }
    }
  },
  {
    component: 'pl-dataset',
    title: 'pl-dataset',
    description: 'Источник данных с вызовом backend endpoint.',
    order: ['endpoint', 'method', 'args', 'requiredArgs', 'executeOnArgsChange', 'paths', 'partialData', 'data', 'unauthorized'],
    groups: {
      request: { title: 'Запрос', description: 'Endpoint и метод запроса.', order: 10 },
      payload: { title: 'Параметры', description: 'Аргументы и правила вызова.', order: 20 },
      result: { title: 'Результат', description: 'Куда биндим полученные данные.', order: 30 }
    },
    properties: {
      endpoint: { label: 'Endpoint', editor: 'text', group: 'request', placeholder: '/module/entity/list' },
      method: { label: 'HTTP-метод', editor: 'select', group: 'request', options: METHOD_OPTIONS },
      args: { label: 'Args', editor: 'textarea', group: 'payload', placeholder: '[[...]] или {{...}}' },
      requiredArgs: { label: 'Обязательные args', editor: 'text', group: 'payload', placeholder: 'id;status' },
      executeOnArgsChange: { label: 'Автовыполнение по args', editor: 'boolean', group: 'payload' },
      paths: { label: 'Paths (mutations)', editor: 'text', group: 'payload', placeholder: 'items,items.rows' },
      partialData: { label: 'Partial-data режим', editor: 'boolean', group: 'payload' },
      data: { label: 'Data binding', editor: 'text', group: 'result', placeholder: '{{rows}}' },
      unauthorized: { label: 'Разрешить без авторизации', editor: 'boolean', group: 'result' }
    }
  },
  {
    component: 'pl-datetime',
    title: 'pl-datetime',
    description: 'Компонент выбора даты/времени.',
    order: ['label', 'type', 'value', 'min', 'max', 'required', 'readonly', 'disabled', 'stretch', 'orientation', 'contentWidth', 'labelWidth', 'hidden'],
    groups: {
      content: { title: 'Контент', description: 'Основные поля даты и времени.', order: 10 },
      limits: { title: 'Ограничения', description: 'Границы допустимых значений.', order: 20 },
      state: { title: 'Состояние', description: 'Доступность и отображение.', order: 30 },
      layout: { title: 'Расположение', description: 'Ширина и ориентация.', order: 40 }
    },
    properties: {
      label: { label: 'Label', editor: 'text', group: 'content' },
      type: { label: 'Тип', editor: 'select', group: 'content', options: DATE_TIME_TYPE_OPTIONS },
      value: { label: 'Value', editor: 'text', group: 'content' },
      min: { label: 'Min', editor: 'text', group: 'limits', placeholder: '2026-01-01' },
      max: { label: 'Max', editor: 'text', group: 'limits', placeholder: '2026-12-31' },
      required: { label: 'Required', editor: 'boolean', group: 'state' },
      readonly: { label: 'Readonly', editor: 'boolean', group: 'state' },
      disabled: { label: 'Disabled', editor: 'boolean', group: 'state' },
      stretch: { label: 'Stretch', editor: 'boolean', group: 'layout' },
      orientation: { label: 'Ориентация', editor: 'select', group: 'layout', options: ORIENTATION_OPTIONS },
      contentWidth: { label: 'Ширина контента (px)', editor: 'number', group: 'layout' },
      labelWidth: { label: 'Ширина label (px)', editor: 'number', group: 'layout' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' }
    }
  },
  {
    component: 'pl-dom-if',
    title: 'pl-dom-if',
    description: 'Условный рендер блока template.',
    order: ['if', 'restamp'],
    groups: {
      behavior: { title: 'Поведение', description: 'Условие и поведение перестампа.', order: 10 }
    },
    properties: {
      if: { label: 'Условие (if)', editor: 'boolean', group: 'behavior' },
      restamp: { label: 'Restamp', editor: 'boolean', group: 'behavior' }
    }
  },
  {
    component: 'pl-drawer',
    title: 'pl-drawer',
    description: 'Выезжающая панель.',
    order: ['header', 'opened', 'position', 'size', 'contained'],
    groups: {
      content: { title: 'Контент', description: 'Заголовок и содержание панели.', order: 10 },
      behavior: { title: 'Поведение', description: 'Открытие и положение.', order: 20 }
    },
    properties: {
      header: { label: 'Заголовок', editor: 'text', group: 'content' },
      opened: { label: 'Открыт', editor: 'boolean', group: 'behavior' },
      position: { label: 'Позиция', editor: 'select', group: 'behavior', options: DRAWER_POSITION_OPTIONS },
      size: { label: 'Размер', editor: 'select', group: 'behavior', options: DRAWER_SIZE_OPTIONS },
      contained: { label: 'Contained', editor: 'boolean', group: 'behavior' }
    }
  },
  {
    component: 'pl-dropdown',
    title: 'pl-dropdown',
    description: 'Плавающий dropdown-контейнер.',
    order: ['opened', 'direction', 'allowDirections', 'ignoreOutsideClick', 'fitInto'],
    groups: {
      behavior: { title: 'Поведение', description: 'Открытие и позиционирование.', order: 10 }
    },
    properties: {
      opened: { label: 'Открыт', editor: 'boolean', group: 'behavior' },
      direction: { label: 'Направление', editor: 'select', group: 'behavior', options: DIRECTION_OPTIONS },
      allowDirections: { label: 'Разрешенные направления', editor: 'text', group: 'behavior', placeholder: "['down','up']" },
      ignoreOutsideClick: { label: 'Игнорировать внешний клик', editor: 'boolean', group: 'behavior' },
      fitInto: { label: 'Fit into', editor: 'text', group: 'behavior' }
    }
  },
  {
    component: 'pl-icon',
    title: 'pl-icon',
    description: 'Иконка из iconset.',
    order: ['iconset', 'icon', 'size', 'title', 'animated', 'hidden'],
    groups: {
      content: { title: 'Контент', description: 'Источник и имя иконки.', order: 10 },
      state: { title: 'Состояние', description: 'Анимация и видимость.', order: 20 }
    },
    properties: {
      iconset: { label: 'Iconset', editor: 'text', group: 'content', placeholder: 'pl-default' },
      icon: { label: 'Icon', editor: 'text', group: 'content', placeholder: 'settings' },
      size: { label: 'Размер (px)', editor: 'number', group: 'content' },
      title: { label: 'Title', editor: 'text', group: 'content' },
      animated: { label: 'Animated', editor: 'boolean', group: 'state' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' }
    }
  },
  {
    component: 'pl-icon-button',
    title: 'pl-icon-button',
    description: 'Кнопка-иконка.',
    order: ['iconset', 'icon', 'variant', 'size', 'negative', 'disabled', 'loading', 'animated', 'hidden'],
    groups: {
      content: { title: 'Контент', description: 'Иконка и ее источник.', order: 10 },
      appearance: { title: 'Внешний вид', description: 'Вариант и размер.', order: 20 },
      state: { title: 'Состояние', description: 'Доступность и индикация загрузки.', order: 30 }
    },
    properties: {
      iconset: { label: 'Iconset', editor: 'text', group: 'content', placeholder: 'pl-default' },
      icon: { label: 'Icon', editor: 'text', group: 'content', placeholder: 'settings' },
      variant: { label: 'Вариант', editor: 'select', group: 'appearance', options: VARIANT_OPTIONS },
      size: { label: 'Размер (px)', editor: 'number', group: 'appearance' },
      negative: { label: 'Негативный тон', editor: 'boolean', group: 'appearance' },
      disabled: { label: 'Disabled', editor: 'boolean', group: 'state' },
      loading: { label: 'Loading', editor: 'boolean', group: 'state' },
      animated: { label: 'Animated', editor: 'boolean', group: 'state' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' }
    }
  },
  {
    component: 'pl-input',
    title: 'pl-input',
    description: 'Текстовый input с валидацией и слотами prefix/suffix.',
    order: [
      'label', 'type', 'value', 'placeholder', 'pattern', 'min', 'max', 'step',
      'required', 'readonly', 'disabled', 'autocomplete', 'stretch', 'orientation',
      'contentWidth', 'labelWidth', 'hidden'
    ],
    groups: {
      content: { title: 'Контент', description: 'Текст, тип и placeholder.', order: 10 },
      limits: { title: 'Ограничения', description: 'Паттерн, min/max/step.', order: 20 },
      state: { title: 'Состояние', description: 'Валидация и доступность.', order: 30 },
      layout: { title: 'Расположение', description: 'Ориентация и ширина.', order: 40 }
    },
    properties: {
      label: { label: 'Label', editor: 'text', group: 'content' },
      type: { label: 'Type', editor: 'select', group: 'content', options: INPUT_TYPE_OPTIONS },
      value: { label: 'Value', editor: 'text', group: 'content' },
      placeholder: { label: 'Placeholder', editor: 'text', group: 'content' },
      pattern: { label: 'Pattern', editor: 'text', group: 'limits' },
      min: {
        label: 'Min',
        editor: 'number',
        group: 'limits',
        visibleWhen: { prop: 'type', in: ['number', 'range', 'date', 'datetime-local', 'time'] }
      },
      max: {
        label: 'Max',
        editor: 'number',
        group: 'limits',
        visibleWhen: { prop: 'type', in: ['number', 'range', 'date', 'datetime-local', 'time'] }
      },
      step: {
        label: 'Step',
        editor: 'text',
        group: 'limits',
        visibleWhen: { prop: 'type', in: ['number', 'range', 'date', 'datetime-local', 'time'] }
      },
      required: { label: 'Required', editor: 'boolean', group: 'state' },
      readonly: { label: 'Readonly', editor: 'boolean', group: 'state' },
      disabled: { label: 'Disabled', editor: 'boolean', group: 'state' },
      autocomplete: { label: 'Autocomplete', editor: 'boolean', group: 'state' },
      stretch: { label: 'Stretch', editor: 'boolean', group: 'layout' },
      orientation: { label: 'Ориентация', editor: 'select', group: 'layout', options: ORIENTATION_OPTIONS },
      contentWidth: { label: 'Ширина контента (px)', editor: 'number', group: 'layout' },
      labelWidth: { label: 'Ширина label (px)', editor: 'number', group: 'layout' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' }
    }
  },
  {
    component: 'pl-input-mask',
    title: 'pl-input-mask',
    description: 'Маска ввода для pl-input.',
    order: ['type', 'mask', 'unmasked', 'scale', 'thousandsSeparator', 'radix', 'mapToRadix', 'min', 'max'],
    groups: {
      common: { title: 'Основное', description: 'Тип маски и шаблон.', order: 10 },
      number: { title: 'Числовая маска', description: 'Параметры форматирования чисел.', order: 20 },
      limits: { title: 'Ограничения', description: 'Диапазон значений.', order: 30 }
    },
    properties: {
      type: { label: 'Type', editor: 'select', group: 'common', options: MASK_TYPE_OPTIONS },
      mask: { label: 'Mask', editor: 'text', group: 'common', placeholder: 'DD.MM.YYYY' },
      unmasked: { label: 'Unmasked', editor: 'text', group: 'common', readonly: true },
      scale: { label: 'Scale', editor: 'number', group: 'number', visibleWhen: { prop: 'type', equals: 'number' } },
      thousandsSeparator: {
        label: 'Thousands separator',
        editor: 'text',
        group: 'number',
        visibleWhen: { prop: 'type', equals: 'number' }
      },
      radix: { label: 'Radix', editor: 'text', group: 'number', visibleWhen: { prop: 'type', equals: 'number' } },
      mapToRadix: {
        label: 'Map to radix',
        editor: 'text',
        group: 'number',
        visibleWhen: { prop: 'type', equals: 'number' },
        placeholder: "['.', ',']"
      },
      min: { label: 'Min', editor: 'number', group: 'limits', visibleWhen: { prop: 'type', in: ['number', 'date'] } },
      max: { label: 'Max', editor: 'number', group: 'limits', visibleWhen: { prop: 'type', in: ['number', 'date'] } }
    }
  },
  {
    component: 'pl-labeled-container',
    title: 'pl-labeled-container',
    description: 'Контейнер label + content.',
    order: ['label', 'orientation', 'contentWidth', 'labelWidth'],
    groups: {
      content: { title: 'Контент', description: 'Текст label и ориентация.', order: 10 },
      layout: { title: 'Расположение', description: 'Ширина label и content.', order: 20 }
    },
    properties: {
      label: { label: 'Label', editor: 'text', group: 'content' },
      orientation: { label: 'Ориентация', editor: 'select', group: 'content', options: ORIENTATION_OPTIONS },
      contentWidth: { label: 'Ширина контента (px)', editor: 'number', group: 'layout' },
      labelWidth: { label: 'Ширина label (px)', editor: 'number', group: 'layout' }
    }
  },
  {
    component: 'pl-popover',
    title: 'pl-popover',
    description: 'Позиционируемый popover.',
    order: ['visible', 'direction', 'allowDirections', 'topLayer'],
    groups: {
      behavior: { title: 'Поведение', description: 'Позиционирование и видимость.', order: 10 }
    },
    properties: {
      visible: { label: 'Виден', editor: 'boolean', group: 'behavior' },
      direction: { label: 'Направление', editor: 'select', group: 'behavior', options: DIRECTION_OPTIONS },
      allowDirections: { label: 'Разрешенные направления', editor: 'text', group: 'behavior', placeholder: "['down','up']" },
      topLayer: { label: 'Top layer', editor: 'boolean', group: 'behavior' }
    }
  },
  {
    component: 'pl-radio-button',
    title: 'pl-radio-button',
    description: 'Кнопка выбора в составе radio-group.',
    order: ['label', 'name', 'selected'],
    groups: {
      content: { title: 'Контент', description: 'Label и значение.', order: 10 }
    },
    properties: {
      label: { label: 'Label', editor: 'text', group: 'content' },
      name: { label: 'Name', editor: 'text', group: 'content' },
      selected: { label: 'Selected', editor: 'boolean', group: 'content' }
    }
  },
  {
    component: 'pl-radio-group',
    title: 'pl-radio-group',
    description: 'Группа radio-button.',
    order: ['label', 'selected', 'required', 'readonly', 'disabled', 'hidden', 'orientation'],
    groups: {
      content: { title: 'Контент', description: 'Текущее выбранное значение.', order: 10 },
      state: { title: 'Состояние', description: 'Валидация и доступность.', order: 20 },
      layout: { title: 'Расположение', description: 'Ориентация с label.', order: 30 }
    },
    properties: {
      label: { label: 'Label', editor: 'text', group: 'content' },
      selected: { label: 'Selected', editor: 'text', group: 'content' },
      required: { label: 'Required', editor: 'boolean', group: 'state' },
      readonly: { label: 'Readonly', editor: 'boolean', group: 'state' },
      disabled: { label: 'Disabled', editor: 'boolean', group: 'state' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' },
      orientation: { label: 'Ориентация', editor: 'select', group: 'layout', options: ORIENTATION_OPTIONS }
    }
  },
  {
    component: 'pl-repeat',
    title: 'pl-repeat',
    description: 'Устаревший repeat-адаптер для template.',
    order: ['as', 'sTpl'],
    groups: {
      behavior: { title: 'Поведение', description: 'Настройки повторителя.', order: 10 }
    },
    properties: {
      as: { label: 'Псевдоним элемента', editor: 'text', group: 'behavior' },
      sTpl: { label: 'Template ссылка', editor: 'text', group: 'behavior', readonly: true }
    }
  },
  {
    component: 'pl-tab',
    title: 'pl-tab',
    description: 'Вкладка внутри pl-tabpanel.',
    order: ['header', 'name', 'selected', 'disabled', 'hidden'],
    groups: {
      content: { title: 'Контент', description: 'Заголовок и имя вкладки.', order: 10 },
      state: { title: 'Состояние', description: 'Выбрана/скрыта/disabled.', order: 20 }
    },
    properties: {
      header: { label: 'Header', editor: 'text', group: 'content' },
      name: { label: 'Name', editor: 'text', group: 'content' },
      selected: { label: 'Selected', editor: 'boolean', group: 'state' },
      disabled: { label: 'Disabled', editor: 'boolean', group: 'state' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' }
    }
  },
  {
    component: 'pl-tabpanel',
    title: 'pl-tabpanel',
    description: 'Панель вкладок.',
    order: ['selected', 'arrowsVisible'],
    groups: {
      behavior: { title: 'Поведение', description: 'Выбор вкладки и стрелки прокрутки.', order: 10 }
    },
    properties: {
      selected: { label: 'Selected tab', editor: 'text', group: 'behavior' },
      arrowsVisible: { label: 'Показывать стрелки', editor: 'boolean', group: 'behavior' }
    }
  },
  {
    component: 'pl-table',
    title: 'pl-table',
    description: 'Таблица с колонками, деревом и growing-режимом.',
    panels: {
      columns: {
        enabled: true,
        title: 'Колонки таблицы',
        description: 'Выберите колонку для настройки.'
      }
    },
    order: [
      'data', 'selected', 'tree', 'keyField', 'pkeyField', 'hasChildField',
      'multiSelect', 'variableRowHeight', 'growing', 'refreshing', 'skeletonHeight', 'customRowTemplate'
    ],
    groups: {
      bindings: { title: 'Биндинги', description: 'Модель данных и выбранной строки.', order: 10 },
      tree: { title: 'Дерево', description: 'Поля id/pid.', order: 20 },
      behavior: { title: 'Поведение', description: 'Режимы таблицы.', order: 30 },
      state: { title: 'Состояние', description: 'Служебные runtime-флаги.', order: 40 }
    },
    properties: {
      data: { label: 'Data', editor: 'text', group: 'bindings', placeholder: '{{rows}}' },
      selected: { label: 'Selected', editor: 'text', group: 'bindings', placeholder: '{{selected}}' },
      tree: { label: 'Tree режим', editor: 'boolean', group: 'tree' },
      keyField: {
        label: 'ID поле',
        editor: 'text',
        group: 'tree',
        placeholder: 'id',
        visibleWhen: { prop: 'tree', equals: true }
      },
      pkeyField: {
        label: 'Parent поле',
        editor: 'text',
        group: 'tree',
        placeholder: 'pid',
        visibleWhen: { prop: 'tree', equals: true }
      },
      hasChildField: {
        label: 'Признак детей',
        editor: 'text',
        group: 'tree',
        placeholder: '_haschildren',
        visibleWhen: { prop: 'tree', equals: true }
      },
      multiSelect: { label: 'Мультивыбор', editor: 'boolean', group: 'behavior' },
      variableRowHeight: { label: 'Переменная высота строк', editor: 'boolean', group: 'behavior' },
      growing: { label: 'Growing режим', editor: 'boolean', group: 'behavior' },
      refreshing: { label: 'Refreshing', editor: 'boolean', group: 'state' },
      skeletonHeight: { label: 'Высота skeleton', editor: 'text', group: 'state', placeholder: '44px' },
      customRowTemplate: { label: 'Custom row template', editor: 'text', group: 'state' }
    }
  },
  {
    component: 'pl-table-column',
    title: 'pl-table-column',
    description: 'Колонка pl-table: заголовок, поле, сортировка, формат.',
    order: [
      'header', 'field', 'tooltipField', 'kind', 'format', 'width', 'minWidth',
      'headerAlign', 'align', 'sortable', 'sort', 'resizable', 'hidden', 'fixed', 'action'
    ],
    groups: {
      content: { title: 'Содержимое', description: 'Поля и формат данных.', order: 10 },
      sizing: { title: 'Размеры', description: 'Ширина колонки.', order: 20 },
      behavior: { title: 'Поведение', description: 'Сортировка и фиксация.', order: 30 }
    },
    properties: {
      header: { label: 'Заголовок', editor: 'text', group: 'content' },
      field: { label: 'Поле', editor: 'text', group: 'content' },
      tooltipField: { label: 'Tooltip поле', editor: 'text', group: 'content' },
      kind: { label: 'Тип', editor: 'select', group: 'content', options: KIND_OPTIONS },
      format: {
        label: 'Формат даты',
        editor: 'text',
        group: 'content',
        placeholder: 'DD.MM.YYYY',
        visibleWhen: { prop: 'kind', equals: 'date' }
      },
      width: { label: 'Ширина (px)', editor: 'number', group: 'sizing' },
      minWidth: { label: 'Мин. ширина (px)', editor: 'number', group: 'sizing' },
      headerAlign: { label: 'Выравнивание header', editor: 'select', group: 'behavior', options: ALIGN_OPTIONS },
      align: { label: 'Выравнивание ячеек', editor: 'select', group: 'behavior', options: ALIGN_OPTIONS },
      sortable: { label: 'Разрешить сортировку', editor: 'boolean', group: 'behavior' },
      sort: {
        label: 'Сортировка',
        editor: 'select',
        group: 'behavior',
        options: SORT_OPTIONS,
        visibleWhen: { prop: 'sortable', equals: true }
      },
      resizable: { label: 'Разрешить resize', editor: 'boolean', group: 'behavior' },
      hidden: { label: 'Скрыть колонку', editor: 'boolean', group: 'behavior' },
      fixed: { label: 'Фиксировать слева', editor: 'boolean', group: 'behavior' },
      action: { label: 'Action колонка', editor: 'boolean', group: 'behavior' }
    }
  },
  {
    component: 'pl-textarea',
    title: 'pl-textarea',
    description: 'Многострочное текстовое поле.',
    order: [
      'label', 'value', 'placeholder', 'required', 'readonly', 'disabled',
      'fit', 'stretch', 'grow', 'hideResizer', 'orientation', 'hidden'
    ],
    groups: {
      content: { title: 'Контент', description: 'Текст и placeholder.', order: 10 },
      state: { title: 'Состояние', description: 'Валидация и доступность.', order: 20 },
      layout: { title: 'Расположение', description: 'Размер и ориентация.', order: 30 }
    },
    properties: {
      label: { label: 'Label', editor: 'text', group: 'content' },
      value: { label: 'Value', editor: 'textarea', group: 'content' },
      placeholder: { label: 'Placeholder', editor: 'text', group: 'content' },
      required: { label: 'Required', editor: 'boolean', group: 'state' },
      readonly: { label: 'Readonly', editor: 'boolean', group: 'state' },
      disabled: { label: 'Disabled', editor: 'boolean', group: 'state' },
      hidden: { label: 'Скрыть', editor: 'boolean', group: 'state' },
      fit: { label: 'Fit по контейнеру', editor: 'boolean', group: 'layout' },
      stretch: { label: 'Stretch', editor: 'boolean', group: 'layout' },
      grow: { label: 'Grow', editor: 'boolean', group: 'layout' },
      hideResizer: { label: 'Скрыть resizer', editor: 'boolean', group: 'layout' },
      orientation: { label: 'Ориентация', editor: 'select', group: 'layout', options: ORIENTATION_OPTIONS }
    }
  },
  {
    component: 'pl-tooltip',
    title: 'pl-tooltip',
    description: 'Tooltip поверх компонента/элемента.',
    order: ['text', 'followCursor', 'keepHover', 'target', 'contentTemplate'],
    groups: {
      content: { title: 'Контент', description: 'Текст и шаблон тултипа.', order: 10 },
      behavior: { title: 'Поведение', description: 'Позиционирование и hover.', order: 20 }
    },
    properties: {
      text: { label: 'Text', editor: 'textarea', group: 'content' },
      contentTemplate: { label: 'Content template', editor: 'text', group: 'content' },
      followCursor: { label: 'Следовать за курсором', editor: 'boolean', group: 'behavior' },
      keepHover: { label: 'Сохранять hover', editor: 'boolean', group: 'behavior' },
      target: { label: 'Target', editor: 'text', group: 'behavior' }
    }
  },
  {
    component: 'pl-valid-observer',
    title: 'pl-valid-observer',
    description: 'Наблюдатель валидности дочерних компонентов.',
    order: ['targetContainer', 'invalid'],
    groups: {
      bindings: { title: 'Биндинги', description: 'Контейнер валидации.', order: 10 },
      state: { title: 'Состояние', description: 'Результат проверки.', order: 20 }
    },
    properties: {
      targetContainer: { label: 'Target container', editor: 'text', group: 'bindings' },
      invalid: { label: 'Invalid', editor: 'boolean', group: 'state', readonly: true }
    }
  },
  {
    component: 'pl-virtual-scroll',
    title: 'pl-virtual-scroll',
    description: 'Виртуализированный список для больших наборов данных.',
    order: ['items', 'as', 'variableRowHeight', 'rowHeight', 'canvas', 'phyItems'],
    groups: {
      bindings: { title: 'Биндинги', description: 'Массив данных и alias элемента.', order: 10 },
      rendering: { title: 'Рендер', description: 'Параметры виртуализации.', order: 20 },
      runtime: { title: 'Runtime', description: 'Служебные внутренние поля.', order: 30 }
    },
    properties: {
      items: { label: 'Items', editor: 'text', group: 'bindings', placeholder: '{{rows}}' },
      as: { label: 'Alias (as)', editor: 'text', group: 'bindings', placeholder: 'item' },
      variableRowHeight: { label: 'Переменная высота строк', editor: 'boolean', group: 'rendering' },
      rowHeight: {
        label: 'Высота строки (px)',
        editor: 'number',
        group: 'rendering',
        visibleWhen: { prop: 'variableRowHeight', equals: false }
      },
      canvas: { label: 'Canvas', editor: 'text', group: 'runtime' },
      phyItems: { label: 'Physical items', editor: 'text', group: 'runtime', readonly: true }
    }
  }
];
