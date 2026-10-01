// rebuild_pdf.js - Rebuild export_pdf.php from clean git state with all fixes applied
const { execSync } = require('child_process');
const fs = require('fs');

function thai(str) {
    return Array.from(str).map(c => '&#' + c.codePointAt(0) + ';').join('');
}

// Step 1: Read clean base from git (before any corruption)
console.log('Reading clean base from git 9db2719b...');
const cleanBuf = execSync('git show "9db2719b:MES/page/paintChem/api/export_pdf.php"', {
    cwd: 'E:/MES/MES/MES',
    encoding: 'buffer',
    maxBuffer: 5 * 1024 * 1024
});

let content = cleanBuf.toString('utf8');

// Strip BOM if any
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

console.log('Base size:', content.length);
console.log('Has correct Thai:', content.includes('กลางวัน'));

// Step 2: Add PHP UTF-8 Content-Type header (right after <?php)
if (!content.includes("header('Content-Type: text/html; charset=utf-8');")) {
    content = content.replace(/^<\?php\r?\n/, "<?php\nheader('Content-Type: text/html; charset=utf-8');\n");
}

// Step 3: Replace all Thai strings in PHP source with HTML entities
// (so they're immune to any encoding issues)
content = content.replace(
    "'กลางวัน (DAY)'",
    "'" + thai('กลางวัน') + " (DAY)'"
);
content = content.replace(
    "'กลางคืน (NIGHT)'",
    "'" + thai('กลางคืน') + " (NIGHT)'"
);

// Step 4: Apply zoom fix - screen only
content = content.replace(
    '<script>document.documentElement.style.zoom = "122%";</script>',
    ''
);
if (!content.includes('@media screen')) {
    content = content.replace(
        '/* ===== PAGE SETUP ===== */',
        `@media screen { html { zoom: 122%; } }\n  @media print { html { zoom: 100%; } .no-print { display: none !important; } }\n\n  /* ===== PAGE SETUP ===== */`
    );
}

// Step 5: Apply logo fix - replace SCAN text with logo image
content = content.replace(
    /<td width="16%">\s*<div class="company-name">SCAN<\/div>\s*<div style="[^"]*">บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด<\/div>\s*<\/td>/s,
    `<td width="25%">
          <img alt="SNC Logo" src="/iot-toolbox/sandbox-b9/Toolbox2/assets/logo.webp" style="height: 28px; object-fit: contain; margin-bottom: 2px;">
          <div style="font-size:6.5pt;color:#555;margin-top:1px;">${thai('บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด')}</div>
        </td>`
);

// Step 6: Fix doc header widths to center the title
content = content.replace('width="60%"', 'width="50%"');

// Also fix ว/ด/ป and กะทำงาน HTML labels
content = content.replace('>ว/ด/ป: <', '>' + thai('ว/ด/ป:') + ' <');
content = content.replace('>กะทำงาน: <', '>' + thai('กะทำงาน:') + ' <');

// Fix table headers
content = content.replace(/>ชื่อ</g, '>' + thai('ชื่อ') + '<');
content = content.replace(/>บ่อ</g, '>' + thai('ชื่อ') + '<'); // alt spelling in source
content = content.replace(/>เคมี</g, '>' + thai('เคมี') + '<');
content = content.replace(/>กระบวนการ</g, '>' + thai('กระบวนการ') + '<');
content = content.replace(/>สารเคมีที่ใช้</g, '>' + thai('สารเคมีที่ใช้') + '<');
content = content.replace(/>หัวข้อควบคุม</g, '>' + thai('หัวข้อควบคุม') + '<');
content = content.replace(/>ค่ามาตรฐาน</g, '>' + thai('ค่ามาตรฐาน') + '<');
content = content.replace(/>ค่าควบคุม</g, '>' + thai('ค่าควบคุม') + '<');
content = content.replace(/>ต่ำสุด</g, '>' + thai('ต่ำสุด') + '<');
content = content.replace(/>สูงสุด</g, '>' + thai('สูงสุด') + '<');
content = content.replace(/>ก่อนปรับ</g, '>' + thai('ก่อนปรับ') + '<');
content = content.replace(/>หลังปรับ</g, '>' + thai('หลังปรับ') + '<');
content = content.replace(/>กก\.</g, '>' + thai('กก.') + '<');

// Fix button text
content = content.replace(
    /🖨&nbsp; พิมพ์ \/ บันทึก PDF/,
    '&#128424;&nbsp; ' + thai('พิมพ์') + ' / ' + thai('บันทึก') + ' PDF'
);

// Step 7: Apply oven colspan fix
// Replace old single-td pattern with 6 colspan-3 cells
content = content.replace(
    /<td><\?php echo htmlspecialchars\(\(string\)\$bake\); \?><\/td>\s*<\?php for\(\$i=1; \$i<18; \$i\+\+\) echo '<td><\/td>'; \?>/g,
    `<td colspan="3"><?php echo htmlspecialchars((string)$bake); ?></td>\n        <?php for($i=1; $i<6; $i++) echo '<td colspan="3"></td>'; ?>`
);
content = content.replace(
    /<td><\?php echo htmlspecialchars\(\(string\)\$dry\); \?><\/td>\s*<\?php for\(\$i=1; \$i<18; \$i\+\+\) echo '<td><\/td>'; \?>/g,
    `<td colspan="3"><?php echo htmlspecialchars((string)$dry); ?></td>\n        <?php for($i=1; $i<6; $i++) echo '<td colspan="3"></td>'; ?>`
);

// Step 8: Apply footer fix (new Painting Condition layout)
const footerRegex = /<table class="footer-tbl">[\s\S]*?<\/table>/;
const newFooter = `<table class="footer-tbl">
    <tr>
      <td rowspan="5" colspan="4" width="35%" style="vertical-align:top; text-align:left; padding:4px;">
        <div style="font-weight:bold; margin-bottom:4px; color:#1e3a5f;">Note.</div>
        <div style="font-weight:normal; font-size:6.5pt; height:35px;"><?php echo nl2br(htmlspecialchars((string)$note)); ?></div>
      </td>
      <td rowspan="5" colspan="3" width="20%" style="vertical-align:top; text-align:center; padding:4px;" class="bg-remark">
        <div style="font-weight:bold; color:#1e3a5f;">Remark</div>
      </td>
      <td colspan="6" width="45%" class="bg-remark" style="text-align:center; font-weight:bold;">
        Painting Condition: 1) Speed Conveyor (m/min)
      </td>
    </tr>
    <tr>
      <td colspan="3" class="bg-std" style="text-align:center; font-weight:bold;">Standard</td>
      <td colspan="3" style="text-align:center; font-weight:bold;">Actual</td>
    </tr>
    <tr>
      <td colspan="3" class="bg-std" style="text-align:center;">2.5 &#8211; 5.0</td>
      <td colspan="3" style="text-align:center; font-weight:bold;"><?php echo htmlspecialchars((string)$speed); ?></td>
    </tr>
    <tr>
      <td colspan="2" style="text-align:center; font-weight:bold; height: 20px; border-top:1.5px solid #374151;">Prepared by</td>
      <td colspan="2" style="text-align:center; font-weight:bold; border-top:1.5px solid #374151;">Checked by</td>
      <td colspan="2" style="text-align:center; font-weight:bold; border-top:1.5px solid #374151;">Approved by</td>
    </tr>
    <tr>
      <td colspan="2" style="height: 40px; text-align:center; vertical-align:bottom; padding-bottom:5px;">
        ...................................<br>
        <span style="font-size:6.5pt;"><?php echo htmlspecialchars($preparedBy); ?></span>
      </td>
      <td colspan="2" style="text-align:center; vertical-align:bottom; padding-bottom:5px;">
        ...................................<br>
        <span style="font-size:6.5pt;"><?php echo htmlspecialchars($checkedBy); ?></span>
      </td>
      <td colspan="2" style="text-align:center; vertical-align:bottom; padding-bottom:5px;">
        ...................................<br>
        <span style="font-size:6.5pt;"><?php echo htmlspecialchars($approvedBy); ?></span>
      </td>
    </tr>
  </table>`;

content = content.replace(footerRegex, newFooter);

// Verify no more raw Thai in source
const remainingThai = content.split('\n').filter(l => /[\u0E01-\u0E7F]/.test(l) && !l.trim().startsWith('//'));
console.log('Remaining raw Thai lines:', remainingThai.length);
remainingThai.forEach(l => console.log('  >', l.trim().substring(0, 100)));

// Write output
fs.writeFileSync('E:/MES/MES/MES/page/paintChem/api/export_pdf.php', content, 'utf8');
console.log('DONE. File written:', content.length, 'chars');
