const fs = require('fs');
let pdf = fs.readFileSync('E:/MES/MES/MES/page/paintChem/api/export_pdf.php', 'utf8');

// --- 1. Fix Oven Temp Rows ---
const oldOven = `      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;background:#f8fafc;">Bake Oven Temp. (°C)</td>
        <td style="font-weight:bold;background:#f8fafc;">Standard</td>
        <td colspan="2" class="bg-std">175 – 220 °C</td>
        <td colspan="18"><?php echo htmlspecialchars((string)$bake); ?></td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;background:#f8fafc;">Dry Oven Temp. (°C)</td>
        <td style="font-weight:bold;background:#f8fafc;">Standard</td>
        <td colspan="2" class="bg-std">140 – 160 °C</td>
        <td colspan="18"><?php echo htmlspecialchars((string)$dry); ?></td>
      </tr>`;

const newOven = `      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;background:#f8fafc;">Bake Oven Temp. (°C)</td>
        <td style="font-weight:bold;background:#f8fafc;">Standard</td>
        <td class="bg-std">175 – 220 °C</td>
        <td colspan="2" style="background-color: #4b5563;"></td>
        <td><?php echo htmlspecialchars((string)$bake); ?></td>
        <?php for($i=1; $i<18; $i++) echo '<td></td>'; ?>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;background:#f8fafc;">Dry Oven Temp. (°C)</td>
        <td style="font-weight:bold;background:#f8fafc;">Standard</td>
        <td class="bg-std">140 – 160 °C</td>
        <td colspan="2" style="background-color: #4b5563;"></td>
        <td><?php echo htmlspecialchars((string)$dry); ?></td>
        <?php for($i=1; $i<18; $i++) echo '<td></td>'; ?>
      </tr>`;

if (pdf.includes('Bake Oven Temp.')) {
    // Replace using regex to handle spacing differences
    pdf = pdf.replace(/<tr>\s*<td colspan="3"[^>]*>Bake Oven Temp[\s\S]*?<\/tr>\s*<tr>\s*<td colspan="3"[^>]*>Dry Oven Temp[\s\S]*?<\/tr>/, newOven);
}

// --- 2. Fix Footer Table ---
const footerRegex = /<table class="footer-tbl">[\s\S]*?<\/table>/;
const newFooter = `<table class="footer-tbl">
    <tr>
      <td rowspan="3" width="35%" style="vertical-align:top; text-align:left; padding:4px;">
        <div style="font-weight:bold; margin-bottom:4px; color:#1e3a5f;">Note.</div>
        <div style="font-weight:normal; font-size:6.5pt; height:35px;"><?php echo nl2br(htmlspecialchars((string)$note)); ?></div>
      </td>
      <td rowspan="3" width="20%" style="vertical-align:top; text-align:center; padding:4px;" class="bg-remark">
        <div style="font-weight:bold; color:#1e3a5f;">Remark</div>
      </td>
      <td width="20%" class="bg-remark" style="text-align:center;">
        Painting Condition:<br>1) Speed Conveyor (m/min)
      </td>
      <td width="12.5%" class="bg-std" style="text-align:center;">
        <strong>Standard</strong><br>2.5 – 5.0
      </td>
      <td width="12.5%" style="text-align:center;">
        <strong>Actual</strong><br>
        <span style="font-weight:bold;"><?php echo htmlspecialchars((string)$speed); ?></span>
      </td>
    </tr>
    <tr>
      <td style="text-align:center; font-weight:bold; height: 20px; border-top:1.5px solid #374151;">Prepared by</td>
      <td style="text-align:center; font-weight:bold; border-top:1.5px solid #374151;">Checked by</td>
      <td style="text-align:center; font-weight:bold; border-top:1.5px solid #374151;">Approved by</td>
    </tr>
    <tr>
      <td style="height: 45px; text-align:center; vertical-align:bottom; padding-bottom:5px;">
        .......................................<br>
        <span style="font-size:6.5pt;"><?php echo htmlspecialchars($preparedBy); ?></span>
      </td>
      <td style="text-align:center; vertical-align:bottom; padding-bottom:5px;">
        ...............................<br>
        <span style="font-size:6.5pt;"><?php echo htmlspecialchars($checkedBy); ?></span>
      </td>
      <td style="text-align:center; vertical-align:bottom; padding-bottom:5px;">
        ...............................<br>
        <span style="font-size:6.5pt;"><?php echo htmlspecialchars($approvedBy); ?></span>
      </td>
    </tr>
  </table>`;

pdf = pdf.replace(footerRegex, newFooter);

fs.writeFileSync('E:/MES/MES/MES/page/paintChem/api/export_pdf.php', pdf, 'utf8');
console.log('PDF layouts fixed.');
