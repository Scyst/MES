const fs = require('fs');
let page = fs.readFileSync('E:/MES/MES/MES/mes-v2/src/modules/PaintChem/pages/PaintChemEntryPage.jsx', 'utf8');

const handleCondBlurFunc = `  const handleCondBlur = async () => {
    if (!header?.header_id || !isOnline || header.status !== 'DRAFT') return;
    try {
      const formData = new FormData();
      formData.append('csrf_token', csrfToken);
      formData.append('header_id', header.header_id);
      formData.append('conveyor_speed', paintingCond.conveyorSpeed);
      formData.append('bake_oven_temp', paintingCond.bakeOvenTemp);
      formData.append('dry_oven_temp', paintingCond.dryOvenTemp);
      formData.append('note', paintingCond.note ?? '');
      await axios.post(\`\${API_BASE}/save_header.php\`, formData);
    } catch (err) {
      console.error('Failed to auto-save header conditions', err);
    }
  };

  const handleShiftChange`;

if (!page.includes('handleCondBlur')) {
    page = page.replace('  const handleShiftChange', handleCondBlurFunc);
    
    // Inject onCondBlur into <SheetHeader />
    page = page.replace(
        "onCondChange={(k, v) => setPCond((p) => ({ ...p, [k]: v }))}",
        "onCondChange={(k, v) => setPCond((p) => ({ ...p, [k]: v }))}\n          onCondBlur={handleCondBlur}"
    );
}

fs.writeFileSync('E:/MES/MES/MES/mes-v2/src/modules/PaintChem/pages/PaintChemEntryPage.jsx', page, 'utf8');
console.log('PaintChemEntryPage updated');
