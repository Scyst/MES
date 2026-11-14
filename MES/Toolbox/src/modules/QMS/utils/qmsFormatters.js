/**
 * Shared status metadata, option catalogs, date/numeric formatters,
 * and A4 printable form generator for Toolbox QMS Module.
 */

export const CASE_STATUS_META = {
  NCR_CREATED: { label: 'New NCR', thLabel: 'เปิดใบแจ้งปัญหา (NCR)', badgeClass: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' },
  SENT_TO_CUSTOMER: { label: 'Wait CAR 8D', thLabel: 'รอดำเนินการ CAR 8D', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  CUSTOMER_REPLIED: { label: '8D Ready / Verify', thLabel: 'บันทึก 8D แล้ว (รอตรวจปิดเคลม)', badgeClass: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800' },
  CLOSED: { label: 'Closed', thLabel: 'ปิดงานเคลมแล้ว', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  CANCELLED: { label: 'Cancelled', thLabel: 'ยกเลิกเอกสาร', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

export const CONCESSION_STATUS_META = {
  PENDING_APPROVAL: { label: 'รออนุมัติ', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  APPROVED: { label: 'อนุมัติครบถ้วน', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  REJECTED: { label: 'ไม่อนุมัติ', badgeClass: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' },
};

export const DEFECT_TYPES = [
  { value: 'Scratch', label: 'รอยขีดข่วน (Scratch)' },
  { value: 'Dent', label: 'รอยบุบ (Dent)' },
  { value: 'Dimension', label: 'ขนาดไม่ได้มาตรฐาน (Dimension)' },
  { value: 'Rust', label: 'สนิม (Rust)' },
  { value: 'Contamination', label: 'สิ่งปนเปื้อน (Contamination)' },
  { value: 'Qty_Mismatch', label: 'จำนวนไม่ตรงป้ายบ่งชี้ (Qty Mismatch)' },
  { value: 'Others', label: 'อื่นๆ (Others)' },
];

export const PRELIM_DISPOSITIONS = [
  { value: 'Rework', label: 'Rework (ซ่อม/แก้ไข)' },
  { value: 'Scrap', label: 'Scrap (ทำลายทิ้ง)' },
  { value: 'Sort', label: 'Sort (คัดแยก)' },
  { value: 'Hold', label: 'Hold (ระงับใช้งานชั่วคราว)' },
];

export const FOUND_BY_TYPES = [
  { value: 'Customer', label: 'Customer (ลูกค้า)' },
  { value: 'QC', label: 'QC (ฝ่ายตรวจสอบคุณภาพ)' },
  { value: 'Maintenance', label: 'Maintenance (ซ่อมบำรุง)' },
  { value: 'Other', label: 'Other (อื่นๆ)' },
];

export const ROOT_CAUSE_CATEGORIES = [
  { value: 'Man', label: 'Man (บุคลากร / การปฏิบัติงาน)' },
  { value: 'Machine', label: 'Machine (เครื่องจักร / แม่พิมพ์)' },
  { value: 'Material', label: 'Material (วัตถุดิบ / ชิ้นส่วน)' },
  { value: 'Method', label: 'Method (วิธีการ / มาตรฐาน WI)' },
  { value: 'Environment', label: 'Environment (สภาพแวดล้อม)' },
];

export const CLAIM_DISPOSITIONS = [
  { value: 'RETURN', label: 'รับของคืนเพื่อแก้ไข (Return & Rework)' },
  { value: 'SCRAP', label: 'ทำลายทิ้งที่ลูกค้า (Scrap at Site)' },
  { value: 'ACCEPT', label: 'ยอมรับสภาพการใช้งาน (Accept As-Is)' },
];

export const CONCESSION_APPROVER_STAGES = [
  { level: 1, title: '1. Engineering / Production' },
  { level: 2, title: '2. QA/QC Section Review' },
  { level: 3, title: '3. Department Manager' },
  { level: 4, title: '4. Final Plant Approval' },
];

export function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatQmsDate(val, fallback = '-') {
  if (!val) return fallback;
  const s = String(val).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export function formatQmsDateInput(val) {
  if (!val) return '';
  return String(val).slice(0, 10);
}

export function formatQmsDateTime(val, fallback = '-') {
  if (!val) return fallback;
  const dt = new Date(val);
  if (Number.isNaN(dt.getTime())) return String(val).slice(0, 16);
  return dt.toLocaleString('th-TH', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatQmsQty(val, fallback = '-') {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

export function formatQmsCurrency(val) {
  const n = Number(val || 0);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
}

export function normalizeQaStatus(row) {
  const st = String(row?.inspection_status || '').trim().toUpperCase();
  const res = String(row?.inspection_result || '').trim().toUpperCase();
  // Always evaluate explicit FAIL before PASS/DONE so corrupted legacy status ('Pass' + FAIL) never shows as green PASS.
  const isFailed = res === 'FAIL';
  const isPassed = !isFailed && (res === 'PASS' || st === 'PASS');
  const isDone = isFailed || isPassed || st === 'DONE';
  const isInProgress = !isDone && st === 'IN_PROGRESS';
  const isWaiting = !isDone && !isInProgress;
  return { isPassed, isFailed, isDone, isInProgress, isWaiting };
}

export function getLoadingUrgency(row) {
  const { isDone } = normalizeQaStatus(row);
  if (isDone || !row?.loading_date) return 'normal';
  const load = new Date(String(row.loading_date).slice(0, 10));
  if (Number.isNaN(load.getTime())) return 'normal';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);
  load.setHours(0, 0, 0, 0);
  if (load <= today) return 'overdue';
  if (load <= in7Days) return 'approaching';
  return 'normal';
}

export function formatLocalYmd(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Opens an isolated A4 printable window for QMS forms (NCR, CAR 8D, Claim, Concession, Blank).
 */
export function openQmsPrintWindow({ title, bodyHtml, orientation = 'portrait' }) {
  const win = window.open('', '_blank', 'width=960,height=800');
  if (!win) return false;
  win.document.write(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 ${orientation}; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Sarabun', 'Segoe UI', sans-serif; font-size: 12px; color: #111827; margin: 0; padding: 0; }
    .toolbar { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; margin-bottom: 14px; }
    .btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-weight: 700; cursor: pointer; font-size: 12px; }
    .btn-primary { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
    .sheet { page-break-after: always; padding: 4px 12px 16px; }
    .sheet:last-child { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 12px; }
    .doc-title { font-size: 17px; font-weight: 800; color: #0f172a; }
    .doc-sub { font-size: 11px; color: #475569; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1px solid #94a3b8; padding: 6px 8px; vertical-align: top; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; width: 22%; }
    .section-hd { background: #e2e8f0; font-weight: 800; font-size: 11px; text-transform: uppercase; padding: 5px 8px; border: 1px solid #94a3b8; border-bottom: 0; }
    .sig-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px; }
    .sig-box { border: 1px solid #94a3b8; padding: 8px; text-align: center; min-height: 82px; }
    .sig-title { font-size: 10px; font-weight: 700; color: #475569; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 18px; }
    @media print { .toolbar { display: none !important; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn" onclick="window.close()">ปิดหน้าต่าง</button>
    <button class="btn btn-primary" onclick="window.print()">พิมพ์เอกสาร (Print / PDF)</button>
  </div>
  ${bodyHtml}
</body>
</html>`);
  win.document.close();
  return true;
}

export function buildCasePrintHtml(docType, detail) {
  const d = detail || {};
  const isBlank = !d.case_id;
  const vRow = (n) => {
    const dt = formatQmsDate(d[`verify_date_${n}`], '....../....../......');
    const resVal = d[`verify_result_${n}`];
    const txt = resVal === 1 || resVal === '1' || resVal === true ? '[✓] Accept  [ ] Reject'
      : (resVal === 0 || resVal === '0' || resVal === false ? '[ ] Accept  [✓] Reject' : '[ ] Accept  [ ] Reject');
    return `<tr><th>Verification #${n}</th><td>Date: ${escapeHtml(dt)}</td><th>Result</th><td>${txt}</td></tr>`;
  };

  if (docType === 'ncr') {
    return `<div class="sheet">
      <div class="header">
        <div><div class="doc-title">NON-CONFORMANCE REPORT (NCR)</div><div class="doc-sub">SNC Former Public Co., Ltd. — QA/QC Quality Control</div></div>
        <div style="text-align:right"><div><b>CAR / NCR No.:</b> ${escapeHtml(d.car_no || '....................')}</div><div><b>Date:</b> ${escapeHtml(isBlank ? '....../....../......' : formatQmsDate(d.case_date))}</div></div>
      </div>
      <table>
        <tr><th>Customer</th><td>${escapeHtml(d.customer_name || '')}</td><th>Line</th><td>${escapeHtml(d.production_line || '')}</td></tr>
        <tr><th>Product Name</th><td>${escapeHtml(d.product_name || '')}</td><th>Model</th><td>${escapeHtml(d.product_model || '')}</td></tr>
        <tr><th>Prod Date</th><td>${escapeHtml(isBlank ? '' : formatQmsDate(d.production_date, ''))}</td><th>Shift / Lot No.</th><td>${escapeHtml([d.found_shift, d.lot_no].filter(Boolean).join(' / '))}</td></tr>
        <tr><th>Invoice No.</th><td>${escapeHtml(d.invoice_no || '')}</td><th>Found By</th><td>${escapeHtml(d.found_by_type || '')}</td></tr>
        <tr><th>Defect Type</th><td>${escapeHtml(d.defect_type || '')}</td><th>Defect Qty</th><td><b>${escapeHtml(isBlank ? '' : formatQmsQty(d.defect_qty, ''))}</b></td></tr>
        <tr><th>Defect Description</th><td colspan="3" style="min-height:60px; white-space:pre-wrap;">${escapeHtml(d.defect_description || '')}</td></tr>
        <tr><th>Preliminary Disposition</th><td>${escapeHtml(d.prelim_disposition || '')}</td><th>Remark</th><td>${escapeHtml(d.prelim_remark || '')}</td></tr>
        <tr><th>Issued By</th><td>${escapeHtml(d.issue_by_name || '')}</td><th>Position</th><td>${escapeHtml(d.issuer_position || '')}</td></tr>
      </table>
    </div>`;
  }

  if (docType === 'car') {
    return `<div class="sheet">
      <div class="header">
        <div><div class="doc-title">CORRECTIVE ACTION REQUEST (CAR 8D REPORT)</div><div class="doc-sub">FM-QCS-064 — Quality Management System</div></div>
        <div style="text-align:right"><div><b>CAR No.:</b> ${escapeHtml(d.car_no || '....................')}</div><div><b>Date:</b> ${escapeHtml(isBlank ? '....../....../......' : formatQmsDate(d.case_date))}</div></div>
      </div>
      <table>
        <tr><th>Customer</th><td>${escapeHtml(d.customer_name || '')}</td><th>Product</th><td>${escapeHtml(d.product_name || '')}</td></tr>
        <tr><th>Defect Type / Qty</th><td>${escapeHtml(d.defect_type || '')} (${escapeHtml(isBlank ? '....' : formatQmsQty(d.defect_qty))})</td><th>Lot / Line</th><td>${escapeHtml([d.lot_no, d.production_line].filter(Boolean).join(' / '))}</td></tr>
        <tr><th>QA Problem Statement</th><td colspan="3" style="white-space:pre-wrap;">${escapeHtml(d.qa_issue_description || d.defect_description || '')}</td></tr>
        <tr><th>D3: Containment Action</th><td colspan="3" style="min-height:48px; white-space:pre-wrap;">${escapeHtml(d.containment_action || '')}</td></tr>
        <tr><th>D4: Root Cause Category</th><td colspan="3">${escapeHtml(d.root_cause_category || '')}</td></tr>
        <tr><th>D4: Occurrence Root Cause</th><td colspan="3" style="min-height:56px; white-space:pre-wrap;">${escapeHtml(d.customer_root_cause || '')}</td></tr>
        <tr><th>D4: Escape / Leak Cause</th><td colspan="3" style="min-height:40px; white-space:pre-wrap;">${escapeHtml(d.leak_cause || '')}</td></tr>
        <tr><th>D5-D6: Corrective Action Plan</th><td colspan="3" style="min-height:56px; white-space:pre-wrap;">${escapeHtml(d.customer_action_plan || '')}</td></tr>
        ${vRow(1)}${vRow(2)}${vRow(3)}
        <tr><th>D8: Standardization</th><td colspan="3">
          [${d.std_fmea ? '✓' : ' '}] FMEA &nbsp;&nbsp;
          [${d.std_control_plan ? '✓' : ' '}] Control Plan &nbsp;&nbsp;
          [${d.std_wi ? '✓' : ' '}] WI &nbsp;&nbsp;
          Other: ${escapeHtml(d.std_others || '....................')}
        </td></tr>
      </table>
    </div>`;
  }

  return `<div class="sheet">
    <div class="header">
      <div><div class="doc-title">CUSTOMER CLAIM &amp; VERIFICATION RECORD</div><div class="doc-sub">SNC Former Public Co., Ltd. — Claim Resolution Summary</div></div>
      <div style="text-align:right"><div><b>CAR No.:</b> ${escapeHtml(d.car_no || '....................')}</div><div><b>Closed Date:</b> ${escapeHtml(isBlank ? '....../....../......' : formatQmsDate(d.closed_at))}</div></div>
    </div>
    <table>
      <tr><th>Customer</th><td>${escapeHtml(d.customer_name || '')}</td><th>Product</th><td>${escapeHtml(d.product_name || '')}</td></tr>
      <tr><th>Return Container No.</th><td>${escapeHtml(d.return_container_no || '')}</td><th>Expected Return Qty</th><td>${escapeHtml(isBlank ? '' : formatQmsQty(d.expected_return_qty, ''))}</td></tr>
      <tr><th>Final Disposition</th><td><b>${escapeHtml(d.disposition || '')}</b></td><th>Actual Received Qty</th><td><b>${escapeHtml(isBlank ? '' : formatQmsQty(d.actual_received_qty, ''))}</b></td></tr>
      <tr><th>Cost Estimation (THB)</th><td>${escapeHtml(isBlank ? '' : formatQmsCurrency(d.cost_estimation))}</td><th>Approved By</th><td>${escapeHtml(d.approved_by_name || '')}</td></tr>
      ${vRow(1)}${vRow(2)}${vRow(3)}
      <tr><th>Standardization</th><td colspan="3">
        [${d.std_fmea ? '✓' : ' '}] FMEA &nbsp;&nbsp;
        [${d.std_control_plan ? '✓' : ' '}] Control Plan &nbsp;&nbsp;
        [${d.std_wi ? '✓' : ' '}] WI &nbsp;&nbsp;
        Other: ${escapeHtml(d.std_others || '')}
      </td></tr>
    </table>
  </div>`;
}

export function buildConcessionPrintHtml(records = []) {
  const list = records.length > 0 ? records : [{ request_no: '....................' }];
  return list.map((r) => {
    const approverBox = (idx) => {
      const name = r[`approver_${idx}_name`] || '...................................';
      const status = r[`approver_${idx}_status`] || '';
      const dt = formatQmsDate(r[`approver_${idx}_date`], '....../....../......');
      return `<div class="sig-box">
        <div class="sig-title">${CONCESSION_APPROVER_STAGES[idx - 1].title}</div>
        <div style="font-weight:700; margin-bottom:4px;">${escapeHtml(name)}</div>
        <div style="font-size:10px; color:#475569; margin-bottom:4px;">Date: ${escapeHtml(dt)}</div>
        <div style="font-size:11px;">[${status === 'Approve' ? '✓' : ' '}] Approve &nbsp; [${status === 'Not Approve' ? '✓' : ' '}] Not Approve</div>
      </div>`;
    };
    return `<div class="sheet">
      <div class="header">
        <div><div class="doc-title">CONCESSION REQUEST (SPECIAL ADOPT)</div><div class="doc-sub">QA/QC Engineering Deviation &amp; Special Acceptance</div></div>
        <div style="text-align:right"><div><b>Request No.:</b> ${escapeHtml(r.request_no || '....................')}</div><div><b>Date:</b> ${escapeHtml(formatQmsDate(r.request_date, '....../....../......'))}</div></div>
      </div>
      <table>
        <tr><th>Issued By (Dept)</th><td>${escapeHtml(r.issued_by_dept || '')}</td><th>Request To</th><td>${escapeHtml(r.request_to || '')}</td></tr>
        <tr><th>Requester Name</th><td>${escapeHtml(r.person_name || '')}</td><th>Support Report</th><td>${r.is_report_needed ? 'Need' : 'Not Need'}</td></tr>
        <tr><th>Subject</th><td colspan="3"><b>${escapeHtml(r.subject || '')}</b></td></tr>
        <tr><th>Part Name</th><td>${escapeHtml(r.part_name || '')}</td><th>Part No.</th><td>${escapeHtml(r.part_no || '')}</td></tr>
        <tr><th>Order No. / Lot No.</th><td>${escapeHtml([r.order_no, r.lot_no].filter(Boolean).join(' / '))}</td><th>Quantity</th><td><b>${escapeHtml(r.qty ? formatQmsQty(r.qty) : '')}</b></td></tr>
        <tr><th>Model / Serial No.</th><td>${escapeHtml([r.model_name, r.serial_no].filter(Boolean).join(' / '))}</td><th>Mfg Date</th><td>${escapeHtml(formatQmsDate(r.mfg_date, ''))}</td></tr>
        <tr><th>Difference vs Standard</th><td colspan="3" style="white-space:pre-wrap;">${escapeHtml(r.difference_detail || '')}</td></tr>
        <tr><th>Reason for Special Adopt</th><td colspan="3" style="white-space:pre-wrap;">${escapeHtml(r.reason_for_adopt || '')}</td></tr>
        <tr><th>Fundamental Root Cause</th><td colspan="3" style="white-space:pre-wrap;">${escapeHtml(r.root_cause || '')}</td></tr>
        <tr><th>Tentative Measure</th><td colspan="3" style="white-space:pre-wrap;">${escapeHtml(r.measure_tentative || '')}</td></tr>
        <tr><th>Permanent Measure</th><td colspan="3" style="white-space:pre-wrap;">${escapeHtml(r.measure_permanent || '')}</td></tr>
      </table>
      <div class="sig-grid">${[1, 2, 3, 4].map(approverBox).join('')}</div>
    </div>`;
  }).join('');
}
