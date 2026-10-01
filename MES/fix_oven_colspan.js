const fs = require('fs');
let pdf = fs.readFileSync('E:/MES/MES/MES/page/paintChem/api/export_pdf.php', 'utf8');

// Replace the 1+17 td pattern with the 6 * colspan=3 pattern
pdf = pdf.replace(
    /<td><\?php echo htmlspecialchars\(\(string\)\$bake\); \?><\/td>\s*<\?php for\(\$i=1; \$i<18; \$i\+\+\) echo '<td><\/td>'; \?>/g,
    `<td colspan="3"><?php echo htmlspecialchars((string)$bake); ?></td>\n        <?php for($i=1; $i<6; $i++) echo '<td colspan="3"></td>'; ?>`
);

pdf = pdf.replace(
    /<td><\?php echo htmlspecialchars\(\(string\)\$dry\); \?><\/td>\s*<\?php for\(\$i=1; \$i<18; \$i\+\+\) echo '<td><\/td>'; \?>/g,
    `<td colspan="3"><?php echo htmlspecialchars((string)$dry); ?></td>\n        <?php for($i=1; $i<6; $i++) echo '<td colspan="3"></td>'; ?>`
);

fs.writeFileSync('E:/MES/MES/MES/page/paintChem/api/export_pdf.php', pdf, 'utf8');
console.log('Oven Temp rows updated.');
