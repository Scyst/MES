/**
 * Helpers for OEE Dashboard & Shopfloor Live Monitor (#/oee).
 */

/** Matches MES 08:00 production shift working date logic. */
export function getWorkingShiftDate() {
  const now = new Date();
  if (now.getHours() < 8) {
    now.setDate(now.getDate() - 1);
  }
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatOeeNumber(value, decimals = 2, suffix = '') {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted}${suffix}`;
}

export function formatCurrencyThb(value, decimals = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return `฿${num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
