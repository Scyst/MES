const fs = require('fs');

let header = fs.readFileSync('E:/MES/MES/MES/mes-v2/src/modules/PaintChem/components/SheetHeader.jsx', 'utf8');

if (!header.includes('onCondBlur')) {
    header = header.replace(
        "onCondChange = () => {}", 
        "onCondChange = () => {}, onCondBlur = () => {}"
    );
    // Add onCondBlur to props destructing
    header = header.replace(
        "onShiftChange,", 
        "onShiftChange, onCondBlur,"
    );
    
    // Add onBlur to the 4 inputs
    header = header.replace(
        /onChange=\{\(e\) => onCondChange\('conveyorSpeed', e\.target\.value\)\}/g,
        "onChange={(e) => onCondChange('conveyorSpeed', e.target.value)} onBlur={onCondBlur}"
    );
    header = header.replace(
        /onChange=\{\(e\) => onCondChange\('bakeOvenTemp', e\.target\.value\)\}/g,
        "onChange={(e) => onCondChange('bakeOvenTemp', e.target.value)} onBlur={onCondBlur}"
    );
    header = header.replace(
        /onChange=\{\(e\) => onCondChange\('dryOvenTemp', e\.target\.value\)\}/g,
        "onChange={(e) => onCondChange('dryOvenTemp', e.target.value)} onBlur={onCondBlur}"
    );
    header = header.replace(
        /onChange=\{\(e\) => onCondChange\('note', e\.target\.value\)\}/g,
        "onChange={(e) => onCondChange('note', e.target.value)} onBlur={onCondBlur}"
    );
}

fs.writeFileSync('E:/MES/MES/MES/mes-v2/src/modules/PaintChem/components/SheetHeader.jsx', header, 'utf8');
console.log('SheetHeader updated with onCondBlur');
