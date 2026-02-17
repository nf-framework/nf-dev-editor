# @nfjs/dev-editor

Visual form editor

## Component Property Configs

Property panel schemas are stored in:

- `/Users/untrue/Repo/nfjs-demo/packages/nf-dev-editor/lib/config/components/pl-flex-layout.js`
- `/Users/untrue/Repo/nfjs-demo/packages/nf-dev-editor/lib/config/components/pl-action.js`

Registry:

- `/Users/untrue/Repo/nfjs-demo/packages/nf-dev-editor/lib/config/component-editor-config.js`

To add support for a new component:

1. Create a config file in `lib/config/components/`.
2. Export `component`, `title`, `description`, `groups`, `order`, `properties`.
3. Register it in `lib/config/component-editor-config.js`.
