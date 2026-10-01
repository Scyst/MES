const fs = require('fs');
let pdf = fs.readFileSync('E:/MES/MES/MES/page/paintChem/api/export_pdf.php', 'utf8');

const footerRegex = /<table class="footer-tbl">[\s\S]*?<\/table>/;
const newFooter = `<table class="footer-tbl">
    <tr>
      <!-- NOTE: 35% -->
      <td rowspan="5" colspan="4" width="35%" style="vertical-align:top; text-align:left; padding:4px;">
        <div style="font-weight:bold; margin-bottom:4px; color:#1e3a5f;">Note.</div>
        <div style="font-weight:normal; font-size:6.5pt; height:35px;"><?php echo nl2br(htmlspecialchars((string)$note)); ?></div>
      </td>
      
      <!-- REMARK: 20% -->
      <td rowspan="5" colspan="3" width="20%" style="vertical-align:top; text-align:center; padding:4px;" class="bg-remark">
        <div style="font-weight:bold; color:#1e3a5f;">Remark</div>
      </td>
      
      <!-- PAINTING CONDITION: 45% -->
      <td colspan="6" width="45%" class="bg-remark" style="text-align:center;">
        Painting Condition: 1) Speed Conveyor (m/min)
      </td>
    </tr>
    <tr>
      <td colspan="3" class="bg-std" style="text-align:center; font-weight:bold;">Standard</td>
      <td colspan="3" style="text-align:center; font-weight:bold;">Actual</td>
    </tr>
    <tr>
      <td colspan="3" class="bg-std" style="text-align:center;">2.5 – 5.0</td>
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

pdf = pdf.replace(footerRegex, newFooter);

fs.writeFileSync('E:/MES/MES/MES/page/paintChem/api/export_pdf.php', pdf, 'utf8');
console.log('Footer updated again.');
