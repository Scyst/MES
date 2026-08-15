const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'src/pages/MachineCockpit.jsx',
    'src/pages/GlobalHistory.jsx',
    'src/pages/Receipt.jsx',
    'src/pages/QRScanner.jsx'
];

filesToUpdate.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add imports if not present
    if (!content.includes('import Swal')) {
        const importStatement = `import Swal from 'sweetalert2';\nimport withReactContent from 'sweetalert2-react-content';\nconst MySwal = withReactContent(Swal);\n\n`;
        content = content.replace(/(import .*;\n)+/, match => match + importStatement);
    }

    // Convert confirm: if (!window.confirm("...")) return; -> handled manually below or with regex
    // Actually, confirm is harder to regex because of async/await. 
    // Let's just do it manually for the two confirms.
    
    // Convert alert(`รายชื่อ...`)
    content = content.replace(/alert\(`รายชื่อพนักงานในทีม:\\n\\n\$\{namesText\}`\)/g, "MySwal.fire({ title: 'รายชื่อพนักงานในทีม', text: namesText, icon: 'info' })");

    // Convert other alerts: alert("...")
    // Match alert("string") or alert('string')
    content = content.replace(/alert\((['"`])(.*?)\1\)/g, "MySwal.fire({ icon: 'error', title: 'แจ้งเตือน', text: $1$2$1 })");
    // Match alert("string" + var)
    content = content.replace(/alert\((['"`])(.*?)\1 \+ (.*?)\)/g, "MySwal.fire({ icon: 'error', title: 'แจ้งเตือน', text: $1$2$1 + $3 })");
    // Match alert(var + "string")
    content = content.replace(/alert\((.*?) \+ (['"`])(.*?)\2\)/g, "MySwal.fire({ icon: 'error', title: 'แจ้งเตือน', text: $1 + $2$3$2 })");

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
});
