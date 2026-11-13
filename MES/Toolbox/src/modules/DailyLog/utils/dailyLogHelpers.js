import * as XLSX from 'xlsx';

/**
 * Compute production date using factory cutoff rule (< 08:00 AM belongs to yesterday's night shift)
 */
export function getProductionDate() {
  const now = new Date();
  if (now.getHours() < 8) {
    now.setDate(now.getDate() - 1);
  }
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthStartStr(dateStr = null) {
  const base = dateStr || getProductionDate();
  return `${base.slice(0, 7)}-01`;
}

export function getCurrentMonthKey() {
  return getProductionDate().slice(0, 7);
}

export function formatDateTH(dateStr) {
  if (!dateStr) return '-';
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatMonthTH(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || '-';
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

export const MOOD_META = {
  1: { score: 1, emoji: '😤', label: 'เครียด / แย่มาก', short: 'แย่มาก', color: '#ef4444', badgeClass: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800' },
  2: { score: 2, emoji: '😓', label: 'เหนื่อย / แย่', short: 'แย่', color: '#f97316', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800' },
  3: { score: 3, emoji: '😐', label: 'ปกติ / เฉยๆ', short: 'เฉยๆ', color: '#eab308', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800' },
  4: { score: 4, emoji: '🙂', label: 'ดี', short: 'ดี', color: '#0ea5e9', badgeClass: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800' },
  5: { score: 5, emoji: '🤩', label: 'ดีมาก / ยอดเยี่ยม', short: 'ดีมาก', color: '#10b981', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800' }
};

export const PERIOD_META = {
  1: { id: 1, label: 'เริ่มกะ (Start)', short: 'เริ่มกะ' },
  2: { id: 2, label: 'พักเบรค (Break)', short: 'พักเบรค' },
  3: { id: 3, label: 'เลิกกะ (End)', short: 'เลิกกะ' }
};

export function getMoodMeta(score) {
  const num = Math.round(Number(score) || 0);
  return MOOD_META[num] || { score: 0, emoji: '➖', label: 'ไม่ระบุ', short: '-', color: '#94a3b8', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' };
}

export function maskIdentity(fullname, empId, username, isPrivacyMode) {
  const cleanName = fullname || username || 'Unknown';
  const cleanId = empId || username || '-';
  if (!isPrivacyMode) {
    return {
      displayName: cleanName,
      displayId: cleanId,
      avatarText: cleanName.slice(0, 2).toUpperCase()
    };
  }
  const suffix = String(cleanId).slice(-2).padStart(2, '*');
  return {
    displayName: `พนักงาน (PDPA ****${suffix})`,
    displayId: `EMP-****${suffix}`,
    avatarText: '🔒'
  };
}

/**
 * Group flat period log rows by (log_date + user_id) preserving SQL ordering
 */
export function groupLogsByUserDay(rows = []) {
  const groups = [];
  const indexMap = new Map();

  rows.forEach((row) => {
    const key = `${row.log_date}__${row.user_id}`;
    if (!indexMap.has(key)) {
      indexMap.set(key, groups.length);
      groups.push({
        key,
        log_date: row.log_date,
        user_id: Number(row.user_id),
        username: row.username,
        emp_id: row.emp_id,
        fullname: row.fullname || row.username,
        line: row.line || 'N/A',
        periods: {},
        total_qty: 0,
        mood_sum: 0,
        mood_count: 0,
        has_negative: false,
        reply_count: 0
      });
    }

    const group = groups[indexMap.get(key)];
    const pid = Number(row.period_id);
    const score = Number(row.mood_score) || 0;
    const qty = Number(row.production_qty) || 0;

    group.periods[pid] = {
      ...row,
      period_id: pid,
      mood_score: score,
      production_qty: qty
    };

    group.total_qty += qty;
    if (score > 0) {
      group.mood_sum += score;
      group.mood_count += 1;
      if (score <= 2) group.has_negative = true;
    }
    if (row.reply_message && String(row.reply_message).trim() !== '') {
      group.reply_count += 1;
    }
  });

  return groups.map((g) => ({
    ...g,
    avg_mood: g.mood_count > 0 ? Number((g.mood_sum / g.mood_count).toFixed(2)) : 0
  }));
}

export function exportLogsToExcel(rows = [], fileName = 'DailyLog_Mood_Report.xlsx', isPrivacyMode = true) {
  const sheetRows = rows.map((r) => {
    const idInfo = maskIdentity(r.fullname, r.emp_id, r.username, isPrivacyMode);
    const periodLabel = PERIOD_META[Number(r.period_id)]?.label || `P${r.period_id}`;
    return {
      'วันที่ (Date)': formatDateTH(r.log_date),
      'สายผลิต (Line)': r.line || 'N/A',
      'รหัสพนักงาน': idInfo.displayId,
      'ชื่อ-สกุล': idInfo.displayName,
      'ช่วงเวลา': periodLabel,
      'คะแนนความรู้สึก (1-5)': Number(r.mood_score) || 0,
      'ยอดผลิต (ชิ้น)': Number(r.production_qty) || 0,
      'บันทึก / ปัญหา (Note)': r.note || '',
      'คำตอบหัวหน้างาน (Reply)': r.reply_message || '',
      'ผู้ตอบกลับ': r.reply_by || '',
      'เวลาตอบกลับ': r.replied_at_fmt || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ShiftLogs_Mood');
  XLSX.writeFile(wb, fileName);
}

export function exportMissingToExcel(rows = [], fileName = 'Missing_DailyLog_Staff.xlsx', isPrivacyMode = true) {
  const sheetRows = rows.map((r, idx) => {
    const idInfo = maskIdentity(r.fullname, r.emp_id, r.username, isPrivacyMode);
    return {
      'ลำดับ': idx + 1,
      'สายผลิต (Line)': r.line || 'N/A',
      'รหัสพนักงาน': idInfo.displayId,
      'ชื่อ-สกุล': idInfo.displayName,
      'สถานะ': 'ยังไม่พบการบันทึกในระบบ'
    };
  });

  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Missing_Submission');
  XLSX.writeFile(wb, fileName);
}
