const fs = require('fs');

const files = [
    'E:/MES/MES/MES/page/paintChem/api/approve_sheet.php',
    'E:/MES/MES/MES/page/paintChem/api/get_sheet.php',
    'E:/MES/MES/MES/page/paintChem/api/submit_sheet.php'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const parts = content.split('<?php');
    if (parts.length > 2) {
        // Find the last <?php (or second)
        const fixedContent = '<?php' + parts.slice(2).join('<?php');
        fs.writeFileSync(file, fixedContent, 'utf8');
        console.log(`Fixed ${file}`);
    }
});
