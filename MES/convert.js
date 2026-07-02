const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'architecture_explanation.html');
const outPath = path.join(__dirname, 'mes-learning-hub/src/pages/KnowledgeHubRaw.jsx');
let html = fs.readFileSync(filePath, 'utf-8');

// Extract just the part we need
const startIndex = html.indexOf('<div class="hub-wrap">');
const endIndex = html.indexOf('<script>');
if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find boundaries');
  process.exit(1);
}

let content = html.substring(startIndex, endIndex);

// 1. Remove comments
content = content.replace(/<!--[\s\S]*?-->/g, '');

// 2. class -> className
content = content.replace(/class=/g, 'className=');

// 3. Self close tags
content = content.replace(/<br>/g, '<br/>');
content = content.replace(/<hr>/g, '<hr/>');
content = content.replace(/<img([^>]+)>/g, (match, p1) => {
  if(p1.endsWith('/')) return match;
  return `<img${p1}/>`;
});
content = content.replace(/<input([^>]+)>/g, (match, p1) => {
  if(p1.endsWith('/')) return match;
  return `<input${p1}/>`;
});

// 4. style="color:var(--text); width: 100%" -> style={{ color: 'var(--text)', width: '100%' }}
content = content.replace(/style="([^"]*)"/g, (match, styles) => {
  const parts = styles.split(';').filter(s => s.trim());
  const objStr = parts.map(p => {
    const [k, v] = p.split(':').map(s => s.trim());
    if(!k) return '';
    let validK = k;
    if (k.startsWith('--')) {
      // Keep as string literal for CSS custom properties
      return `'${k}': '${v}'`;
    } else {
      validK = k.replace(/-([a-z])/g, g => g[1].toUpperCase());
      return `${validK}: '${v}'`;
    }
  }).filter(Boolean).join(', ');
  return `style={{ ${objStr} }}`;
});

// 5. onclick="togglePanel('hs1')" -> onClick={() => togglePanel('hs1')}
content = content.replace(/onclick="([^"]*)"/g, (match, fn) => {
  // if fn has arguments, e.g. genShowView('sqli','atk')
  return `onClick={() => { ${fn} }}`;
});

// 6. fix html entities
content = content.replace(/&nbsp;/g, "{'\\u00A0'}");

const componentStr = `
import React, { useState } from 'react';

export default function KnowledgeHubRaw({ activeHub, togglePanel, genShowView, toggleAutoPlay, genStep, genReset, csrfShowView, csrfStep, csrfReset }) {
  return (
    <>
      ${content}
    </>
  );
}
`;

fs.writeFileSync(outPath, componentStr);
console.log('Conversion successful!');
