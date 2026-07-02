const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'architecture_explanation.html');
let html = fs.readFileSync(filePath, 'utf-8');

// 1. Extract HTML
const htmlStart = html.indexOf('<div class="hub-wrap">');
const scriptIndex = html.indexOf('<script>');
if (htmlStart === -1 || scriptIndex === -1) {
  console.error('Could not find HTML boundaries');
  process.exit(1);
}
// We want to extract up to the closing </div> of the tab-panel which is just before <script>
let rawHtml = html.substring(htmlStart, scriptIndex);
// The rawHtml might end with </div></div></div>. It's fine to just grab everything up to script.
// Wait, the hub-wrap div ends somewhere. Let's just use rawHtml as is, but we don't need the outer wrappers because KnowledgeHub.jsx already has some wrappers.
// Actually, I can just grab the children of hub-container.
const containerStart = html.indexOf('<div class="hub-container">');
let innerHtml = html.substring(containerStart, scriptIndex);
// Strip out closing tags that belong to the outer wrappers (tab-panel, etc.)
innerHtml = innerHtml.replace(/<\/div>\s*<\/div>\s*<\/div>\s*$/g, '');

fs.writeFileSync(path.join(__dirname, 'mes-learning-hub/src/data/legacyHtml.js'), `export const legacyHtml = \`${innerHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;`);

// 2. Extract JS
const jsStart = html.indexOf('<script>') + 8;
const jsEnd = html.indexOf('</script>');
let rawJs = html.substring(jsStart, jsEnd);

// Assign all functions to window by appending window.func = func;
const funcRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
let match;
let exportsArr = [];
while ((match = funcRegex.exec(rawJs)) !== null) {
  exportsArr.push(`window.${match[1]} = ${match[1]};`);
}

rawJs = rawJs + '\n' + exportsArr.join('\n');

fs.writeFileSync(path.join(__dirname, 'mes-learning-hub/src/legacy-logic.js'), rawJs);
console.log('Extraction successful!');
