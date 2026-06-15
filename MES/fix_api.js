const fs = require('fs');
const path = require('path');
const dir = 'e:/MES/MES/MES/mes-toolbox/public/api/v1';

fs.readdirSync(dir).filter(f => f.endsWith('.php')).forEach(f => {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  
  // Remove the old smart includes
  const regex = /\$local_db = .*?require_once \$server_init; \}/gs;
  c = c.replace(regex, '');
  
  // Also remove any remaining static includes if they somehow survived
  c = c.replace(/require_once __DIR__ \. '\/.*db\.php';\n?/g, '');
  c = c.replace(/require_once __DIR__ \. '\/.*init\.php';\n?/g, '');

  // Add the new clean include
  const newInclude = `require_once __DIR__ . '/../core/init.php';\n`;
  
  // Only add if it's not auth.php (which didn't need db before)
  // Wait, the previous logic only added it if db.php was there.
  // Actually, wait, auth.php was one of the API files! Did auth.php need db.php?
  // Let's just check if it's NOT auth.php, or better yet: 
  // All endpoints (except auth.php usually) need it. Let's just add it where the regex matched.
  // Wait, if I just replaced the regex with empty string, I know it HAD it.
  
  // Since we want to insert it correctly:
  if (f !== 'auth.php') {
      if (c.includes("header('Content-Type")) {
          c = c.replace(/(header\('Content-Type.*?\);\n?)/, "$1" + newInclude);
      } else {
          c = c.replace(/(<\?php\n?)/, "$1" + newInclude);
      }
  }

  // Clean up any double empty lines
  c = c.replace(/\n\s*\n\s*\n/g, '\n\n');

  fs.writeFileSync(p, c);
  console.log('Fixed ' + f);
});
