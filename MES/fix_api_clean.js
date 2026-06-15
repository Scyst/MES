const fs = require('fs');
const path = require('path');
const dir = 'e:/MES/MES/MES/mes-toolbox/public/api/v1';

fs.readdirSync(dir).filter(f => f.endsWith('.php')).forEach(f => {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  
  // Strip all variations of old includes
  c = c.replace(/\$local_db = .*?require_once \$server_db; \}/gs, '');
  c = c.replace(/\$local_init = .*?require_once \$server_init; \}/gs, '');
  c = c.replace(/require_once __DIR__ \. '\/\.\.\/\.\.\/config\/config\.php';/g, '');
  c = c.replace(/require_once __DIR__ \. '\/\.\.\/\.\.\/\.\.\/\.\.\/db\.php';/g, '');
  c = c.replace(/require_once __DIR__ \. '\/\.\.\/\.\.\/\.\.\/\.\.\/page\/db\.php';/g, '');
  c = c.replace(/require_once __DIR__ \. '\/\.\.\/\.\.\/\.\.\/\.\.\/page\/components\/init\.php';/g, '');
  c = c.replace(/if \(\!defined\('LOCATIONS_TABLE'\)\) \{\s*\}/g, '');
  
  // Fix the newline issue
  c = c.replace(/header\('Content-Type: application\/json; charset=utf-8'\);require_once/g, "header('Content-Type: application/json; charset=utf-8');\nrequire_once");
  
  // Clean up empty lines
  c = c.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  fs.writeFileSync(p, c);
});
console.log('Cleaned up API files completely');
