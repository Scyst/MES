/**
 * Helper utilities for Toolbox Sales Orders, Shipping Schedule, and RM Shortage Forecast.
 */

export const normalizeFlexibleDate = (rawVal) => {
  if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === 'null') return '';
  if (typeof rawVal === 'number' && rawVal > 40000) {
    const dt = new Date(Math.round((rawVal - 25569) * 86400 * 1000));
    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
  }
  const clean = String(rawVal).trim().split(' ')[0];
  if (!clean || clean === '0000-00-00') return '';

  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(clean);
  if (isoMatch) {
    let year = Number(isoMatch[1]);
    if (year >= 1900 && year < 1990) year += 100;
    return `${String(year).padStart(4, '0')}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
  }

  const dmyMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(clean);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    if (year >= 1900 && year < 1990) year += 100;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return '';
};

export const formatDisplayDate = (isoOrDate) => {
  if (!isoOrDate) return '-';
  const s = String(isoOrDate).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

export const formatCurrencyThb = (amount) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount || 0));

export const formatInt = (num) => new Intl.NumberFormat('en-US').format(Math.round(Number(num || 0)));

/**
 * Evaluates QA inspection status strictly checking FAIL before PASS
 * so historical FAIL rows are never masked by legacy status strings.
 */
export const evaluateQaBadge = (row) => {
  const res = String(row?.inspection_result || '').trim().toUpperCase();
  const st = String(row?.inspection_status || '').trim().toUpperCase();
  if (res === 'FAIL') {
    return { label: 'FAIL', badgeClass: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300', isFail: true, isPass: false };
  }
  if (res === 'PASS' || st === 'DONE') {
    return { label: 'PASS', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300', isFail: false, isPass: true };
  }
  if (st === 'IN_PROGRESS') {
    return { label: 'IN PROGRESS', badgeClass: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300', isFail: false, isPass: false };
  }
  if (row?.inspection_date || st === 'WAITING') {
    return { label: 'WAITING', badgeClass: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300', isFail: false, isPass: false };
  }
  return { label: 'UNSCHEDULED', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400', isFail: false, isPass: false };
};

const isTruthyText = (v) => ['yes', 'done', 'shipped', 'ok', '1', 'true', 'y', 'pass'].includes(String(v || '').trim().toLowerCase());

/** Parses Sales Orders CSV/XLSX into normalized preview records with pre-2023 date warnings. */
export const parseSalesImportFile = async (file) => {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rows || rows.length < 2) {
    throw new Error('ไฟล์ไม่มีข้อมูลหรือรูปแบบหัวตารางไม่ถูกต้อง');
  }

  const headers = rows[0].map((h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' '));
  const findIdx = (aliases) => {
    for (const a of aliases) {
      const idx = headers.indexOf(a);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const mapIdx = {
    po: findIdx(['po', 'po number', 'po_number', 'p.o.']),
    sku: findIdx(['sku', 'item code', 'material']),
    team: findIdx(['team', 'team group', 'group']),
    orderDate: findIdx(['order date', 'date', 'odate']),
    desc: findIdx(['description', 'desc']),
    color: findIdx(['color', 'colour']),
    qty: findIdx(['qty', 'quantity', 'amount']),
    dc: findIdx(['dc', 'dc location']),
    lweek: findIdx(['original loading week', 'loading week']),
    sweek: findIdx(['original shipping week', 'shipping week']),
    pdate: findIdx(['prd start date', 'prd completed date', 'production date', 'pdate']),
    pend: findIdx(['prd end date', 'production end date']),
    pstat: findIdx(['production status', 'prd status']),
    ldate: findIdx(['load', 'loading date', 'ldate']),
    lstat: findIdx(['loading status', 'load status']),
    ticket: findIdx(['ticket number', 'ticket']),
    idate: findIdx(['inspection date', 'insp date']),
    istat: findIdx(['inspection status', 'inspection result']),
    remark: findIdx(['remark', 'comment']),
    confirm: findIdx(['confirmed', 'is_confirmed']),
  };

  const previewRows = [];
  let skippedCount = 0;
  const errors = [];

  const valAt = (row, idx) => (idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '');
  const rawAt = (row, idx) => (idx !== -1 && row[idx] !== undefined ? row[idx] : '');

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((c) => String(c || '').trim() === '')) continue;

    const po = valAt(row, mapIdx.po);
    const sku = valAt(row, mapIdx.sku);
    if (!po) {
      skippedCount += 1;
      continue;
    }
    if (!sku) {
      skippedCount += 1;
      errors.push(`แถวที่ ${i + 1} (PO: ${po}): ไม่มีรหัส SKU`);
      continue;
    }

    const orderDate = normalizeFlexibleDate(rawAt(row, mapIdx.orderDate));
    const prodDate = normalizeFlexibleDate(rawAt(row, mapIdx.pdate));
    const prodEnd = normalizeFlexibleDate(rawAt(row, mapIdx.pend));
    const loadDate = normalizeFlexibleDate(rawAt(row, mapIdx.ldate));
    const inspDate = normalizeFlexibleDate(rawAt(row, mapIdx.idate));

    const warnings = {};
    [['order_date', orderDate], ['production_date', prodDate], ['production_end_date', prodEnd], ['loading_date', loadDate], ['inspection_date', inspDate]].forEach(([k, d]) => {
      if (d && Number(d.slice(0, 4)) < 2023) warnings[k] = true;
    });

    const rawQty = valAt(row, mapIdx.qty).replace(/,/g, '');
    const qty = rawQty !== '' && !Number.isNaN(Number(rawQty)) ? Number(rawQty) : 0;
    const rawInspSt = valAt(row, mapIdx.istat);

    previewRows.push({
      row_index: i + 1,
      po_number: po,
      sku,
      team: valAt(row, mapIdx.team),
      order_date: orderDate,
      description: valAt(row, mapIdx.desc),
      color: valAt(row, mapIdx.color),
      quantity: qty,
      dc_location: valAt(row, mapIdx.dc),
      loading_week: valAt(row, mapIdx.lweek),
      shipping_week: valAt(row, mapIdx.sweek),
      production_date: prodDate,
      production_end_date: prodEnd,
      is_production_done: isTruthyText(valAt(row, mapIdx.pstat)) || isTruthyText(valAt(row, mapIdx.pdate)) ? 1 : 0,
      loading_date: loadDate,
      is_loading_done: isTruthyText(valAt(row, mapIdx.lstat)) || isTruthyText(valAt(row, mapIdx.ldate)) ? 1 : 0,
      ticket_number: valAt(row, mapIdx.ticket),
      inspection_date: inspDate,
      inspection_status: isTruthyText(rawInspSt) ? 'Pass' : rawInspSt,
      remark: valAt(row, mapIdx.remark),
      is_confirmed: isTruthyText(valAt(row, mapIdx.confirm)) ? 1 : 0,
      warnings,
    });
  }

  return { rows: previewRows, skippedCount, errors: errors.slice(0, 15) };
};

/** Parses Shipping CSV/XLSX worksheet into object rows accepted by shippingApi.importJson. */
export const parseShippingImportFile = async (file) => {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (!jsonRows || jsonRows.length === 0) {
    throw new Error('ไม่พบข้อมูลในไฟล์ Shipping ที่นำเข้า');
  }
  return jsonRows;
};

/** Exports array of plain objects into an XLSX file download via SheetJS. */
export const downloadXlsxSheet = async (rows, sheetName, filename) => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};
