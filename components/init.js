import { Template } from 'polylib/template.js';
Template.devMode = true;

import "@editor/components/editor-launcher.js"
const cont = document.createElement('pl-editor-launcher');
document.body.appendChild(cont);