/**
 * Product catalog and MES shift-date helpers for Accessories Inspection.
 */

export const ACCESSORY_PRODUCTS = [
  'Minibox CH1002 BLACK', 'Minibox CH1002 BLUE', 'Minibox CH1002 RED',
  'CH-2607HGBLK', 'CH-2607HGBLU', 'CH-2607HGR', 'CH-2607HGGRY', 'CH-2607HGGRE', 'CH-2607HGPR',
  'TC-2707TSBLK', 'TC-2707TSBLU', 'TC-2707TSR', 'TC-2707TSGRY', 'TC-2707TSGRE', 'TC-2707TSPR',
  'CH-4208HGBLK', 'CH-4208HGBLU', 'CH-4208HGR', 'CH-4208HGGRY', 'CH-4208HGGRE', 'CH-4208HGPR',
  'TC-4210TBLK', 'TC-4210TBLU', 'TC-4210TSR', 'TC-4210TGRY', 'TC-4210TSGRE', 'TC-4210TSPR',
  'CH-5608HGBLK', 'CH-5608HGBLU', 'CH-5608HGR', 'CH-5608HGGRY', 'CH-5608HGGRE', 'CH-5608HGPR',
  'TC-5608TSBLK', 'TC-5608TSBLU', 'TC-5608TSR', 'TC-5608TSGRY', 'TC-5608TSGRE', 'TC-5608TSPR',
];

const SUFFIX_COLORS = [
  ['BLACK', 'Black'],
  ['BLUE', 'Blue'],
  ['RED', 'Red'],
  ['BLK', 'Black'],
  ['BLU', 'Blue'],
  ['GRY', 'Gray'],
  ['GRE', 'Green'],
  ['PR', 'Purple'],
  ['R', 'Red'],
];

/** Appends human-readable color suffix when not already written out in product code. */
export function formatAccessoryProductLabel(code) {
  const up = String(code || '').toUpperCase();
  for (const [suffix, label] of SUFFIX_COLORS) {
    if (up.endsWith(suffix)) {
      if (` ${up}`.includes(` ${label.toUpperCase()}`)) {
        return code;
      }
      return `${code} (${label})`;
    }
  }
  return code;
}

/** Returns current MES production date (before 08:00 counts as yesterday's night shift). */
export function getProductionDateStr() {
  const now = new Date();
  if (now.getHours() < 8) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA');
  }
  return now.toLocaleDateString('en-CA');
}

/** Formats SQL timestamp string `YYYY-MM-DD HH:MM:SS` into `DD/MM/YYYY HH:MM:SS`. */
export function formatInspectionTime(ts) {
  if (!ts || ts.length < 19) return ts || '-';
  return `${ts.slice(8, 10)}/${ts.slice(5, 7)}/${ts.slice(0, 4)} ${ts.slice(11, 19)}`;
}
