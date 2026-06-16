const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('e:/MES/MES/MES/mes-toolbox/src/pages');
let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const regex = /new URL\(`\$\{API_BASE_URL\}\/([^`]+)`,\s*window\.location\.origin\)/g;
  if (regex.test(content)) {
      const newContent = content.replace(regex, "new URL(`${API_BASE_URL}/$1`, window.location.href)");
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated ${file}`);
      count++;
  }
});
console.log(`Finished updating ${count} files.`);
