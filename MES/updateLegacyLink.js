const fs = require('fs');
let file = 'E:/MES/MES/MES/page/dailyLog/dailyLogUI.php';
let content = fs.readFileSync(file, 'utf8');

const anchor = `renderServiceLink('Production Entry', 'บันทึกผลผลิตประจำวัน', '<i class="fas fa-boxes"></i>', '../production/productionUI.php', 'view_production', $themeProd);`;
const insert = `renderServiceLink('Paint Chem Entry', 'บันทึกเคมีสี — PAINT Line', '<i class="fas fa-fill-drip"></i>', '/iot-toolbox/sandbox-b9/Toolbox2/index.html#/paint-chem', 'view_production', $themeProd);`;

content = content.replace(anchor, anchor + "\n                          " + insert);

fs.writeFileSync(file, content, 'utf8');
