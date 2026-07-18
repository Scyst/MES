const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'architecture_explanation.html');
let html = fs.readFileSync(filePath, 'utf-8');

// Extract Tab 1 Architecture HTML
const tab1Start = html.indexOf('<div class="tab-panel active" id="tab1">');
const tab1End = html.indexOf('<!-- END TAB 1 -->');
if (tab1Start === -1 || tab1End === -1) {
  console.error('Could not find Tab 1 boundaries');
  process.exit(1);
}

// Get the inner content of tab1 to inject inside the React component's outer div
let rawTab1 = html.substring(tab1Start, tab1End);
// Remove the outer <div class="tab-panel active" id="tab1"> and its closing </div>
rawTab1 = rawTab1.replace(/^<div class="tab-panel[^>]*>/, '').replace(/<\/div>\s*$/g, '');

fs.writeFileSync(path.join(__dirname, 'mes-learning-hub/src/data/legacyArchHtml.js'), `export const legacyArchHtml = \`${rawTab1.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;`);

console.log('Arch Extraction successful!');
