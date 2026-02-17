const METHOD_OPTIONS = [
  { value: 'POST', text: 'POST' },
  { value: 'GET', text: 'GET' },
  { value: 'PUT', text: 'PUT' },
  { value: 'PATCH', text: 'PATCH' },
  { value: 'DELETE', text: 'DELETE' }
];

export default {
  component: 'pl-action',
  title: 'pl-action',
  description: 'Компонент вызова backend endpoint с передачей args и получением data.',
  order: [
    'endpoint',
    'method',
    'args',
    'requiredArgs',
    'executeOnArgsChange',
    'paths',
    'data',
    'unauthorized',
    'success',
    'executing'
  ],
  groups: {
    request: {
      title: 'Запрос',
      description: 'URL и HTTP-метод выполнения действия.',
      order: 10
    },
    payload: {
      title: 'Параметры',
      description: 'Передаваемые аргументы и правила обязательности.',
      order: 20
    },
    result: {
      title: 'Результат',
      description: 'Привязка ответа и обработка статуса.',
      order: 30
    },
    state: {
      title: 'Состояние',
      description: 'Служебные флаги выполнения.',
      order: 40
    }
  },
  properties: {
    endpoint: {
      label: 'Endpoint',
      editor: 'text',
      group: 'request',
      placeholder: '/front/action/...',
      description: 'Если не указан, используется fse endpoint по id компонента.'
    },
    method: {
      label: 'HTTP-метод',
      editor: 'select',
      group: 'request',
      options: METHOD_OPTIONS
    },
    args: {
      label: 'Args',
      editor: 'textarea',
      group: 'payload',
      placeholder: '[[...]] или {{...}}',
      description: 'Выражение с аргументами вызова.'
    },
    requiredArgs: {
      label: 'Обязательные args',
      editor: 'text',
      group: 'payload',
      placeholder: 'id;status',
      description: 'Список обязательных полей через ;'
    },
    executeOnArgsChange: {
      label: 'Автовыполнение при изменении args',
      editor: 'boolean',
      group: 'payload'
    },
    paths: {
      label: 'Paths (mutations)',
      editor: 'text',
      group: 'payload',
      placeholder: 'items,items.rows',
      description: 'Пути для отправки мутаций массивов.'
    },
    data: {
      label: 'Data binding',
      editor: 'text',
      group: 'result',
      placeholder: '{{result}}'
    },
    unauthorized: {
      label: 'Разрешить без авторизации',
      editor: 'boolean',
      group: 'result'
    },
    success: {
      label: 'Сообщение об успехе',
      editor: 'text',
      group: 'result'
    },
    executing: {
      label: 'Executing',
      editor: 'boolean',
      group: 'state',
      readonly: true,
      description: 'Текущее runtime-состояние выполнения.'
    }
  }
};

