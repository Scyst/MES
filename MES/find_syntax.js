const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const pattern = /(?:^|[{};]|<script>)\s*function\s*\(/g;
const exts = ['.js', '.jsx', '.php', '.html'];
const ignoredDirs = ['node_modules', '.git', 'vendor', 'dist'];

function search(dir) {
    const files = fs.readdirSync(dir);
    for (let f of files) {
        if (ignoredDirs.includes(f)) continue;
        const p = path.join(dir, f);
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
            search(p);
        } else if (exts.includes(path.extname(f))) {
            const content = fs.readFileSync(p, 'utf8');
            let lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (/(?:^|[{};])\s*function\s*\(/.test(lines[i]) || /<script>\s*function\s*\(/.test(lines[i])) {
                    console.log(p + ':' + (i+1) + ': ' + lines[i].trim());
                }
            }
        }
    }
}
search('.');
