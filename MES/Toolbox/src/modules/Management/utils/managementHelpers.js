/**
 * Helpers for Management Module: formatting, hybrid AI trend projection,
 * flexible Excel plan matrix parser, and CSV/Excel exports.
 */
import * as XLSX from 'xlsx';

export function formatMoney(amount, compact = false) {
  let num = Number(amount);
  if (!Number.isFinite(num)) return '-';
  if (Math.abs(num) < 0.005) num = 0;
  if (compact) {
    if (Math.abs(num) >= 1_000_000_000) return `฿${(num / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(num) >= 1_000_000) return `฿${(num / 1_000_000).toFixed(2)}M`;
  }
  return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMoneyCompact(amount) {
  return formatMoney(amount, true);
}

/**
 * Hybrid long-term / 7-day weighted linear regression matching legacy executiveDashboard.js.
 */
export function buildTrendWithAiForecast(dailyData = [], isAiEnabled = false) {
  const baseRows = (dailyData || []).map((d) => {
    const dt = new Date(`${d.date}T00:00:00`);
    const label = Number.isNaN(dt.getTime())
      ? d.date
      : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return {
      date: d.date,
      label,
      sale: Number(d.sale || 0),
      cost: Number(d.cost || 0),
      profit: Number(d.profit || 0),
      aiForecast: null,
    };
  });

  if (!isAiEnabled || baseRows.length < 2) {
    return baseRows;
  }

  const validPoints = [];
  baseRows.forEach((row, idx) => {
    if (row.sale > 0) validPoints.push({ x: idx, y: row.sale });
  });

  if (validPoints.length < 2) {
    return baseRows;
  }

  const computeSlope = (pts) => {
    const m = pts.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (const p of pts) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }
    const den = m * sumXX - sumX * sumX;
    return den === 0 ? 0 : (m * sumXY - sumX * sumY) / den;
  };

  const slopeLong = computeSlope(validPoints);
  const shortSubset = validPoints.length > 7 ? validPoints.slice(validPoints.length - 7) : validPoints;
  const slopeShort = computeSlope(shortSubset);
  const finalSlope = slopeLong * 0.6 + slopeShort * 0.4;

  let avgX = 0;
  let avgY = 0;
  for (const p of validPoints) {
    avgX += p.x;
    avgY += p.y;
  }
  avgX /= validPoints.length;
  avgY /= validPoints.length;
  const intercept = avgY - finalSlope * avgX;

  const lastIdx = baseRows.length - 1;
  baseRows[lastIdx].aiForecast = baseRows[lastIdx].sale;
  const lastDate = new Date(`${baseRows[lastIdx].date}T00:00:00`);

  for (let i = 1; i <= 7; i += 1) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + i);
    const predVal = Math.max(0, finalSlope * (lastIdx + i) + intercept);
    const dateKey = nextDate.toISOString().split('T')[0];
    baseRows.push({
      date: dateKey,
      label: `${nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (Pred)`,
      sale: null,
      cost: null,
      profit: null,
      aiForecast: predVal,
    });
  }

  return baseRows;
}

const UNIVERSAL_MONTHS = {
  'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5,
  'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11,
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function parseFlexibleDateHeader(input, baseYear) {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number' && input > 20000) {
    const dt = new Date((input - 25569) * 86400 * 1000);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const cleanStr = String(input).trim();
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(cleanStr)) {
    const dt = new Date(cleanStr);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const parts = cleanStr.toLowerCase().split(/[-/.\s]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10);
  const monthToken = parts[1];
  let monthIndex = UNIVERSAL_MONTHS[monthToken] ?? UNIVERSAL_MONTHS[monthToken.replace(/\.$/, '')];
  if (monthIndex === undefined && !Number.isNaN(Number(monthToken))) {
    monthIndex = parseInt(monthToken, 10) - 1;
  }
  if (Number.isNaN(day) || monthIndex === undefined || monthIndex < 0 || monthIndex > 11) {
    return null;
  }
  const dt = new Date(baseYear, monthIndex, day);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Parses uploaded production plan workbook (.xlsx / .xls / .csv) into bulk import rows. */
export async function parsePlanWorkbookFile(file, fallbackLine = '') {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const baseYear = new Date().getFullYear();
  const allMappedPlans = [];
  const processedLines = new Set();

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!rows || rows.length === 0) return;

    let currentLine = sheetName.trim();
    if (currentLine.toUpperCase() === 'SHEET1' || currentLine.length < 2) {
      const cleanName = file.name.replace(/\.(csv|xlsx|xls)$/i, '');
      const parenMatch = cleanName.match(/\(([^)]+)\)$/);
      const candidate = parenMatch && Number.isNaN(Number(parenMatch[1]))
        ? parenMatch[1].trim()
        : (cleanName.split('-').pop() || '').trim();
      if (candidate.length > 2 && !/^\d+$/.test(candidate)) {
        currentLine = candidate;
      } else if (fallbackLine) {
        currentLine = fallbackLine;
      }
    }

    let dateHeaderRowIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 10); r += 1) {
      const matched = (rows[r] || []).filter((c) => parseFlexibleDateHeader(c, baseYear) !== null);
      if (matched.length >= 2) {
        dateHeaderRowIdx = r;
        break;
      }
    }
    if (dateHeaderRowIdx === -1) return;

    const validDateMap = {};
    let currentYear = baseYear;
    let lastMonthIdx = -1;
    rows[dateHeaderRowIdx].forEach((cell, colIdx) => {
      const parsed = parseFlexibleDateHeader(cell, currentYear);
      if (!parsed) return;
      const mIdx = parseInt(parsed.split('-')[1], 10) - 1;
      if (lastMonthIdx === 11 && mIdx === 0) {
        currentYear += 1;
        validDateMap[colIdx] = parseFlexibleDateHeader(cell, currentYear) || parsed;
      } else {
        validDateMap[colIdx] = parsed;
      }
      lastMonthIdx = mIdx;
    });

    for (let i = dateHeaderRowIdx + 1; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row || row.length === 0 || row[0] === undefined || row[0] === null) continue;
      const itemCode = String(row[0]).trim();
      if (!itemCode || itemCode === 'Date' || itemCode.toLowerCase().includes('plan') || itemCode === 'Item Code') {
        continue;
      }
      Object.keys(validDateMap).forEach((colKey) => {
        const rawQty = Number(row[colKey]);
        if (Number.isFinite(rawQty) && rawQty > 0) {
          allMappedPlans.push({
            date: validDateMap[colKey],
            line: currentLine,
            shift: 'DAY',
            item_code: itemCode,
            qty: rawQty,
          });
          processedLines.add(currentLine);
        }
      });
    }
  });

  return {
    plans: allMappedPlans,
    lines: Array.from(processedLines),
  };
}

export function exportPlansToExcel(rows = [], exchangeRate = 32.0, filename = 'Production_Plans.xlsx') {
  const sheetRows = rows.map((r) => {
    const unitPrice = Number(r.price_usd || 0) > 0
      ? Number(r.price_usd) * exchangeRate
      : Number(r.standard_price || 0);
    const targetQty = Number(r.adjusted_planned_quantity || 0);
    const actualQty = Number(r.actual_quantity || 0);
    return {
      Date: r.plan_date,
      Line: r.line,
      Shift: r.shift,
      'SAP No': r.sap_no || '-',
      'Part No': r.part_no || '-',
      Description: r.part_description || '-',
      Plan: Number(r.original_planned_quantity || 0),
      'C/O': Number(r.carry_over_quantity || 0),
      Target: targetQty,
      Actual: actualQty,
      'OT Hrs': Number(r.ot_hours || 0),
      'Est Sales (THB)': Number((targetQty * unitPrice).toFixed(2)),
      'Actual Sales (THB)': Number((actualQty * unitPrice).toFixed(2)),
      'Sales Diff (THB)': Number(((actualQty - targetQty) * unitPrice).toFixed(2)),
      Note: r.note || '',
    };
  });
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plans');
  XLSX.writeFile(wb, filename);
}
