/**
 * Shared formatting, 4D GPA calculation, status badges, and XLSX export utilities
 * for the Manpower & Daily Planning modules.
 */
import * as XLSX from 'xlsx';

export const STATUS_BADGES = {
  PRESENT: { label: 'มาทำงาน', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  LATE: { label: 'สาย', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  ABSENT: { label: 'ขาดงาน', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  SICK: { label: 'ลาป่วย', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
  BUSINESS: { label: 'ลากิจ', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  VACATION: { label: 'พักร้อน', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800' },
  LEAVE: { label: 'ลางาน', cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  HOLIDAY: { label: 'วันหยุด', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  WAITING: { label: 'รอสแกน', cls: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 border-gray-200 dark:border-slate-700' },
};

export const GRADE_POINTS = { A: 4.0, B: 3.0, C: 2.0, D: 1.0 };

export const GRADE_BADGE_MAP = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300',
  C: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300',
  D: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300',
};

export function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthIso() {
  return getTodayIso().slice(0, 7);
}

export function offsetIsoDate(isoDate, deltaDays) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatMoney(val, digits = 0) {
  const num = Number(val || 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatNumber(val, digits = 0) {
  const num = Number(val || 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Computes weighted 4D overall GPA and letter grade from active dimensions & team weightages.
 */
export function calculateOverallGrade(row) {
  const dims = [
    { key: 'grade_iph', weight: Number(row.weight_iph ?? 25) },
    { key: 'grade_5s', weight: Number(row.weight_5s ?? 25) },
    { key: 'grade_attendance', weight: Number(row.weight_attendance ?? 25) },
    { key: 'grade_learning', weight: Number(row.weight_learning ?? 25) },
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  for (const d of dims) {
    const g = String(row[d.key] || '').toUpperCase();
    if (GRADE_POINTS[g] !== undefined && d.weight > 0) {
      weightedSum += GRADE_POINTS[g] * d.weight;
      totalWeight += d.weight;
    }
  }

  if (totalWeight <= 0) {
    return { gpa: 0, grade: '' };
  }
  const gpa = weightedSum / totalWeight;
  let grade = 'D';
  if (gpa >= 3.5) grade = 'A';
  else if (gpa >= 2.5) grade = 'B';
  else if (gpa >= 1.5) grade = 'C';
  return { gpa: Number(gpa.toFixed(2)), grade };
}

export function exportRowsToExcel(rows, sheetName, fileName) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
  return true;
}
