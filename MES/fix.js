const fs = require('fs');
const path = require('path');
const dir = 'e:/MES/MES/MES/mes-toolbox/public/api/v1';

fs.readdirSync(dir).filter(f => f.endsWith('.php')).forEach(f => {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/'\/\.\.\/\.\.\/db\.php'/g, "'/../../../../db.php'");
  c = c.replace(/'\/\.\.\/\.\.\/components\/init\.php'/g, "'/../../../../page/components/init.php'");
  fs.writeFileSync(p, c);
});
console.log('Fixed paths');
