import * as XLSX from 'xlsx';

export const WO_STATUS_META = {
  Open: { label: 'แจ้งใหม่ (Open)', cls: 'bg-red-50 text-red-700 border-red-200' },
  Pending: { label: 'รอดำเนินการ (Pending)', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  Assigned: { label: 'มอบหมายแล้ว (Assigned)', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  'In Progress': { label: 'กำลังซ่อม (In Progress)', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Completed: { label: 'เสร็จสิ้น (Completed)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Cancelled: { label: 'ยกเลิก (Cancelled)', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const PRIORITY_META = {
  Critical: { label: 'Critical (ฉุกเฉิน)', cls: 'bg-red-600 text-white border-red-700', dot: 'bg-red-600' },
  High: { label: 'High (ด่วน)', cls: 'bg-orange-500 text-white border-orange-600', dot: 'bg-orange-500' },
  Normal: { label: 'Normal (ปกติ)', cls: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  Low: { label: 'Low (รอได้)', cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
};

export const MACHINE_STATUS_META = {
  Active: { label: 'ใช้งานปกติ (Active)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Under Repair': { label: 'อยู่ระหว่างซ่อม (Under Repair)', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  Inactive: { label: 'หยุดใช้งาน (Inactive)', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const WO_TYPES = [
  { value: 'Corrective', label: 'ซ่อมแซมแก้ไข (Corrective)' },
  { value: 'Preventive', label: 'บำรุงรักษาเชิงป้องกัน (Preventive)' },
  { value: 'Improvement', label: 'ปรับปรุงเครื่องจักร (Improvement)' },
  { value: 'Inspection', label: 'ตรวจสอบสภาพ (Inspection)' },
  { value: 'Setup', label: 'ตั้งเครื่อง/เปลี่ยนรุ่น (Setup)' },
  { value: 'Safety/Hazard', label: 'ความปลอดภัย/จุดเสี่ยง (Safety/Hazard)' },
];

export const DOWNTIME_CATEGORIES = [
  { value: 'Mechanical', label: 'เครื่องกล (Mechanical)' },
  { value: 'Electrical', label: 'ไฟฟ้า/คอนโทรล (Electrical)' },
  { value: 'Tooling', label: 'แม่พิมพ์/อุปกรณ์ (Tooling)' },
  { value: 'Setup', label: 'ตั้งเครื่อง/เปลี่ยนรุ่น (Setup)' },
  { value: 'Material', label: 'รอวัตถุดิบ (Material Shortage)' },
  { value: 'Quality', label: 'ปัญหาคุณภาพ (Quality Issue)' },
  { value: 'Operator', label: 'พนักงาน (Operator)' },
  { value: 'Planned', label: 'หยุดตามแผน (Planned)' },
  { value: 'Other', label: 'อื่นๆ (Other)' },
];

export function getLocalIsoDate(daysOffset = 0) {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysOffset);
  const offsetMs = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function formatPeDateTime(raw) {
  if (!raw) return '-';
  const normalized = String(raw).replace(' ', 'T').replace(/\.\d+$/, '');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPeDate(raw) {
  if (!raw) return '-';
  const normalized = String(raw).slice(0, 10);
  const d = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatBaht(val) {
  const num = Number(val || 0);
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0);
}

export function formatNumber(val, decimals = 0) {
  const num = Number(val || 0);
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(num) ? num : 0);
}

export function calcElapsedText(requestedAt) {
  if (!requestedAt) return '-';
  const dt = new Date(String(requestedAt).replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return '-';
  const diffMin = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 60000));
  if (diffMin < 60) return `${diffMin} นาที`;
  const hrs = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (hrs < 24) return `${hrs} ชม. ${remMin} น.`;
  const days = Math.floor(hrs / 24);
  return `${days} วัน ${hrs % 24} ชม.`;
}

function escapePrintHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printWorkOrderSheet(wo, partsUsed = []) {
  const win = window.open('', '_blank', 'width=900,height=720');
  if (!win) return;

  const partsRows = partsUsed.length
    ? partsUsed
        .map(
          (p, idx) => `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;font-family:monospace;">${escapePrintHtml(p.item_code)}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;">${escapePrintHtml(p.item_name)}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;">${escapePrintHtml(p.quantity)} ${escapePrintHtml(p.uom)}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;">${escapePrintHtml(formatBaht(p.total_cost))}</td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="5" style="border:1px solid #cbd5e1;padding:10px;text-align:center;color:#64748b;">ไม่มีรายการเบิกอะไหล่</td></tr>';

  win.document.write(`
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <title>Work Order ${escapePrintHtml(wo.wo_number)}</title>
        <style>
          body { font-family: 'Sarabun', 'Segoe UI', sans-serif; margin: 24px; color: #0f172a; }
          .header { display:flex; justify-content:space-between; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:16px; }
          .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; font-size:13px; }
          .box { border:1px solid #cbd5e1; border-radius:6px; padding:10px; }
          .label { font-size:11px; color:#475569; font-weight:bold; text-transform:uppercase; }
          table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }
          th { background:#f1f5f9; border:1px solid #cbd5e1; padding:6px; text-align:left; }
          @media print { .no-print { display:none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0;">ใบสั่งงานซ่อมบำรุง (PE Work Order)</h2>
            <div style="font-size:13px;color:#475569;">SNC MES Enterprise Maintenance</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px;font-weight:bold;font-family:monospace;">${escapePrintHtml(wo.wo_number)}</div>
            <div style="font-size:12px;">สถานะ: ${escapePrintHtml(wo.status)} | ความสำคัญ: ${escapePrintHtml(wo.priority)}</div>
          </div>
        </div>
        <div class="grid">
          <div class="box"><div class="label">เครื่องจักร / ไลน์</div><div>${escapePrintHtml(wo.machine_code ? `${wo.machine_code} — ` : '')}${escapePrintHtml(wo.machine_display_name || wo.machine_name || '-')} (${escapePrintHtml(wo.line || '-')})</div></div>
          <div class="box"><div class="label">ประเภทงาน</div><div>${escapePrintHtml(wo.wo_type || '-')}</div></div>
          <div class="box"><div class="label">ผู้แจ้ง / เวลาแจ้ง</div><div>${escapePrintHtml(wo.requested_by || '-')} (${escapePrintHtml(formatPeDateTime(wo.requested_at))})</div></div>
          <div class="box"><div class="label">ช่างผู้รับผิดชอบ / เวลาซ่อม</div><div>${escapePrintHtml(wo.assigned_to || 'ยังไม่มอบหมาย')} | ${wo.repair_minutes ?? '-'} นาที</div></div>
        </div>
        <div class="box" style="margin-bottom:12px;">
          <div class="label">อาการเสีย / หัวข้อปัญหา</div>
          <div style="font-weight:bold;margin:4px 0;">${escapePrintHtml(wo.issue_title)}</div>
          <div style="white-space:pre-wrap;font-size:13px;">${escapePrintHtml(wo.issue_detail || '-')}</div>
        </div>
        <div class="grid">
          <div class="box"><div class="label">สาเหตุรากเหง้า (Root Cause)</div><div style="white-space:pre-wrap;">${escapePrintHtml(wo.root_cause || '-')}</div></div>
          <div class="box"><div class="label">การดำเนินการแก้ไข (Action Taken)</div><div style="white-space:pre-wrap;">${escapePrintHtml(wo.action_taken || '-')}</div></div>
        </div>
        <h4 style="margin:12px 0 4px;">รายการอะไหล่ที่เบิกใช้งาน (รวมมูลค่า ${escapePrintHtml(formatBaht(wo.total_cost))})</h4>
        <table>
          <thead>
            <tr>
              <th style="width:45px;text-align:center;">#</th>
              <th style="width:130px;">รหัสอะไหล่</th>
              <th>ชื่ออะไหล่</th>
              <th style="width:120px;text-align:right;">จำนวน</th>
              <th style="width:120px;text-align:right;">มูลค่า</th>
            </tr>
          </thead>
          <tbody>${partsRows}</tbody>
        </table>
        <div class="no-print" style="margin-top:20px;text-align:right;">
          <button onclick="window.print()" style="padding:8px 16px;font-weight:bold;cursor:pointer;">พิมพ์ใบงาน</button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
}

export function exportWorkOrdersExcel(rows = []) {
  const sheetData = rows.map((w) => ({
    'WO Number': w.wo_number || '',
    Type: w.wo_type || '',
    Priority: w.priority || '',
    Status: w.status || '',
    Line: w.line || '',
    'Machine Code': w.machine_code || '',
    'Machine Name': w.machine_display_name || w.machine_name || '',
    'Issue Title': w.issue_title || '',
    'Issue Detail': w.issue_detail || '',
    'Requested By': w.requested_by || '',
    'Requested At': formatPeDateTime(w.requested_at),
    'Assigned To': w.assigned_to || '',
    'Completed At': formatPeDateTime(w.completed_at),
    'Repair Minutes': w.repair_minutes ?? '',
    'Parts Cost (THB)': Number(w.total_cost || 0),
    'Root Cause': w.root_cause || '',
    'Action Taken': w.action_taken || '',
  }));
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'WorkOrders');
  XLSX.writeFile(wb, `PE_WorkOrders_${getLocalIsoDate()}.xlsx`);
}

export function exportOnhandExcel(rows = []) {
  const sheetData = rows.map((r) => ({
    'Item Code': r.item_code || '',
    'Item Name': r.item_name || '',
    Supplier: r.supplier || '',
    Location: r.location_name || 'ไม่ระบุคลัง',
    'On-Hand Qty': Number(r.onhand_qty || 0),
    UoM: r.uom || 'PCS',
    Min: Number(r.min_stock || 0),
    Max: Number(r.max_stock || 0),
    'Unit Price': Number(r.unit_price || 0),
    'Total Value': Number(r.onhand_qty || 0) * Number(r.unit_price || 0),
  }));
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SpareParts_Onhand');
  XLSX.writeFile(wb, `PE_SpareParts_${getLocalIsoDate()}.xlsx`);
}
