const fs = require('fs');
const path = require('path');
const dir = 'e:/MES/MES/MES/mes-toolbox/public/api/v1';

fs.readdirSync(dir).filter(f => f.endsWith('.php')).forEach(f => {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  
  if (c.includes("require_once __DIR__ . '/../../../../page/db.php';")) {
      c = c.replace("require_once __DIR__ . '/../../../../page/db.php';", 
        "$local_db = __DIR__ . '/../../../../page/db.php';\n" +
        "$server_db = __DIR__ . '/../../MES/MES/page/db.php';\n" +
        "if (file_exists($local_db)) { require_once $local_db; } else { require_once $server_db; }");
        
      c = c.replace("require_once __DIR__ . '/../../../../page/components/init.php';", 
        "$local_init = __DIR__ . '/../../../../page/components/init.php';\n" +
        "$server_init = __DIR__ . '/../../MES/MES/page/components/init.php';\n" +
        "if (file_exists($local_init)) { require_once $local_init; } else { require_once $server_init; }");
        
      fs.writeFileSync(p, c);
      console.log('Fixed ' + f);
  }
});
