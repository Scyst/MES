const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            processDir(p);
        } else if (f.endsWith('.php')) {
            let c = fs.readFileSync(p, 'utf8');
            
            // Remove leading whitespace/newlines before <?php
            c = c.replace(/^\s+<\?php/, '<?php');
            
            // Just to be absolutely certain, replace multiple <?php (if any duplicate)
            // But let's assume it's fine.
            
            fs.writeFileSync(p, c, 'utf8');
        }
    }
}

processDir('e:/MES/MES/MES/mes-toolbox/public/api');
console.log('Stripped leading whitespace from all PHP files');
