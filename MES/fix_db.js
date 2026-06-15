const fs = require('fs');
const path = require('path');
const dir = 'e:/MES/MES/MES/mes-toolbox/public/api/v1';

fs.readdirSync(dir).filter(f => f.endsWith('.php')).forEach(f => {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  // Handle both possible previous replacements
  c = c.replace(/'\/\.\.\/\.\.\/\.\.\/\.\.\/db\.php'/g, "'/../../../../page/db.php'");
  c = c.replace(/'\/\.\.\/\.\.\/db\.php'/g, "'/../../../../page/db.php'");
  fs.writeFileSync(p, c);
});
console.log('Fixed db.php paths');
