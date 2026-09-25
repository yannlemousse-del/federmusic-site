// Génère apps-script/Code.gs = Code.template.gs + welcome-email.html intégré.
// Usage : node apps-script/build-code.js
const fs = require('fs'), path = require('path');
const dir = __dirname;
const SHEET_ID = process.env.SHEET_ID || '1C3I5ttV_CF9n6BE_9oOEAF48eA4UBbRnOOuf__PbBd0';

let html = fs.readFileSync(path.join(dir, 'welcome-email.html'), 'utf8').replace(/\r\n/g, '\n');
// le HTML va dans un template literal JS : on neutralise \, ` et ${
html = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

let tpl = fs.readFileSync(path.join(dir, 'Code.template.gs'), 'utf8').replace(/\r\n/g, '\n');
const out = tpl.replace('__SHEET_ID__', SHEET_ID).replace('__WELCOME_HTML__', () => html);
fs.writeFileSync(path.join(dir, 'Code.gs'), out);
console.log('Code.gs généré :', out.length, 'caractères,', out.split('\n').length, 'lignes');
