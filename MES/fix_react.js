const fs = require('fs');
const path = require('path');

const dir = 'e:/MES/MES/MES/mes-toolbox/src/pages/production';

// Home.jsx
let home = fs.readFileSync(path.join(dir, 'Home.jsx'), 'utf8');
home = home.replace("navigate('/machines')", "navigate('/production/machines')");
fs.writeFileSync(path.join(dir, 'Home.jsx'), home);

// MachineList.jsx
let ml = fs.readFileSync(path.join(dir, 'MachineList.jsx'), 'utf8');
ml = ml.replace("navigate(`/machine/${machine.id}`)", "navigate(`/production/machine/${machine.id}`)");
ml = ml.replace("navigate(`/location/${loc.id}`)", "navigate(`/production/location/${loc.id}`)");
ml = ml.replace("'http://localhost/MES/MES/MES/api/v1'", "'./api/v1'");
fs.writeFileSync(path.join(dir, 'MachineList.jsx'), ml);

// QRScanner.jsx
let qr = fs.readFileSync(path.join(dir, 'QRScanner.jsx'), 'utf8');
qr = qr.replace("navigate(`/machine/${decodedText}`)", "navigate(`/production/machine/${decodedText}`)");
fs.writeFileSync(path.join(dir, 'QRScanner.jsx'), qr);

console.log('Fixed React paths');
