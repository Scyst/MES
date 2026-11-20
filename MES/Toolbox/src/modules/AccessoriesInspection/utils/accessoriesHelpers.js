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
  'C-2053WMBTHA',
];

export const GAP_LIMIT_SEC = 300;

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

/** Parses SQL timestamp ('YYYY-MM-DD HH:MM:SS[.mmm]') into epoch milliseconds. */
export function parseSqlTimestampMs(ts) {
  if (!ts) return NaN;
  return Date.parse(String(ts).trim().replace(' ', 'T'));
}

/** Formats duration in seconds cleanly as `42s` or `5:07`. */
export function formatDiffDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '–';
  const rounded = Math.round(sec);
  if (rounded < 60) return `${rounded}s`;
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Formats SQL timestamp into `HH:MM:SS` for high-density cycle columns. */
export function formatClockOnly(ts) {
  if (!ts || ts.length < 19) return '';
  return ts.slice(11, 19);
}

/**
 * Computes Diff (same-hour gap), Detect (S1 exit - S1 enter), and Idle (next S1 enter - S1 exit)
 * for rows ordered newest -> oldest.
 */
export function computeRowCycleMetrics(rows, newerBoundaryS1In = null) {
  return rows.map((row, idx) => {
    const prevOlder = rows[idx + 1];
    const newerRowS1In = idx === 0 ? newerBoundaryS1In : rows[idx - 1]?.s1_in;

    let diffSec = null;
    if (
      row.timestamp &&
      prevOlder?.timestamp &&
      row.timestamp.slice(0, 13) === prevOlder.timestamp.slice(0, 13)
    ) {
      const diff = (parseSqlTimestampMs(row.timestamp) - parseSqlTimestampMs(prevOlder.timestamp)) / 1000;
      if (Number.isFinite(diff) && diff >= 0) {
        diffSec = Math.round(diff);
      }
    }

    let detectSec = null;
    if (row.s1_in && row.s1_out) {
      const detect = (parseSqlTimestampMs(row.s1_out) - parseSqlTimestampMs(row.s1_in)) / 1000;
      if (Number.isFinite(detect) && detect >= 0) {
        detectSec = detect;
      }
    }

    let idleSec = null;
    if (row.s1_out && newerRowS1In) {
      const idle = (parseSqlTimestampMs(newerRowS1In) - parseSqlTimestampMs(row.s1_out)) / 1000;
      if (Number.isFinite(idle) && idle >= 0) {
        idleSec = idle;
      }
    }

    return { diffSec, detectSec, idleSec };
  });
}

function summarizeSeries(values) {
  if (!values.length) return { avg: null, med: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    avg: sorted.reduce((acc, v) => acc + v, 0) / sorted.length,
    med: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
  };
}

/** Computes KPI tiles and series datasets for the Accessories SVG Chart Modal. */
export function buildInspectionChartAnalytics(rows, rangeStart, rangeEnd, gapLimitSec = GAP_LIMIT_SEC) {
  const t0 = parseSqlTimestampMs(rangeStart);
  const t1 = parseSqlTimestampMs(rangeEnd);
  const chronological = [...rows].filter((r) => r.timestamp).reverse();

  const okCount = chronological.filter((r) => r.result === 'ok').length;
  const alarmCount = chronological.length - okCount;

  const gaps = [];
  for (let i = 0; i < chronological.length - 1; i += 1) {
    const a = chronological[i];
    const b = chronological[i + 1];
    if (!a.s1_out || !b.s1_in) continue;
    const g = (parseSqlTimestampMs(b.s1_in) - parseSqlTimestampMs(a.s1_out)) / 1000;
    if (Number.isFinite(g) && g >= 0) {
      gaps.push({ t: parseSqlTimestampMs(a.s1_out), g, model: a.model || '' });
    }
  }

  const detectPoints = [];
  const timelineSegments = [];
  chronological.forEach((r) => {
    if (!r.s1_in || !r.s1_out) return;
    const a = parseSqlTimestampMs(r.s1_in);
    const b = parseSqlTimestampMs(r.s1_out);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return;
    const sec = (b - a) / 1000;
    detectPoints.push({ t: a, v: sec, model: r.model || '', isOk: r.result === 'ok' });
    timelineSegments.push({ a, b, model: r.model || '', isOk: r.result === 'ok' });
  });

  const idleStats = summarizeSeries(gaps.map((x) => x.g));
  const detectStats = summarizeSeries(detectPoints.map((x) => x.v));
  const idleOverLimit = gaps.filter((x) => x.g >= gapLimitSec).length;

  const nH = Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0
    ? Math.max(1, Math.round((t1 - t0) / 3600000))
    : 24;
  const hourlyBuckets = Array.from({ length: nH }, (_, idx) => ({
    index: idx,
    startMs: Number.isFinite(t0) ? t0 + idx * 3600000 : idx * 3600000,
    ok: 0,
    alarm: 0,
  }));

  if (Number.isFinite(t0)) {
    chronological.forEach((r) => {
      const idx = Math.floor((parseSqlTimestampMs(r.timestamp) - t0) / 3600000);
      if (idx < 0 || idx >= nH) return;
      if (r.result === 'ok') hourlyBuckets[idx].ok += 1;
      else hourlyBuckets[idx].alarm += 1;
    });
  }

  return {
    t0,
    t1,
    stats: {
      total: chronological.length,
      ok: okCount,
      alarm: alarmCount,
      idleAvg: idleStats.avg,
      idleMed: idleStats.med,
      idleMax: idleStats.max,
      idleOverLimit,
      detectAvg: detectStats.avg,
      detectMed: detectStats.med,
      detectMax: detectStats.max,
    },
    hourlyBuckets,
    gaps,
    detectPoints,
    timelineSegments,
  };
}

/** Computes clean rounded Y-axis ceiling. */
export function niceChartMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const mult of [1, 2, 2.5, 5, 10]) {
    if (mult * power >= value) return mult * power;
  }
  return 10 * power;
}
