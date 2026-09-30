const fs = require('fs');
const files = [
    'E:/MES/MES/MES/page/paintChem/api/approve_sheet.php',
    'E:/MES/MES/MES/page/paintChem/api/get_sheet.php',
    'E:/MES/MES/MES/page/paintChem/api/submit_sheet.php',
    'E:/MES/MES/MES/page/paintChem/api/get_history.php'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const parts = content.split('<?php');
    if (parts.length > 2) {
        const lastPart = parts[parts.length - 1];
        const fixedContent = '<?php\n' + lastPart.trimStart();
        fs.writeFileSync(file, fixedContent, 'utf8');
        console.log(`Fixed ${file}`);
    }
});
