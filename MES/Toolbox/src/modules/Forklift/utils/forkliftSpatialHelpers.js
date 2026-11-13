/**
 * Spatial math & visual status helpers for Forklift Tracking (Grid, GPS <-> Indoor, Heatmap, QR).
 * Perimeter & 40x30 Grid geometry calibrated to legacy page/forklift/script/forkliftTracking.js.
 */

export const FACTORY_BOUNDS = {
  latTop: 12.889578,
  latBottom: 12.883121,
  lngLeft: 101.088351,
  lngRight: 101.096783
};

export const GRID_COLS = 40;
export const GRID_ROWS = 30;
export const NORMALIZED_SIZE = 1000;

/**
 * Convert 0-based column index (0..39) into spreadsheet letter code (A..AN).
 */
export function columnIndexToLetters(colIndex) {
  let index = Math.max(0, Math.floor(colIndex));
  let letters = '';
  while (index >= 0) {
    letters = String.fromCharCode((index % 26) + 65) + letters;
    index = Math.floor(index / 26) - 1;
  }
  return letters;
}

/**
 * Resolve human-readable Grid Zone metadata for a 40x30 cell.
 */
export function getGridCellMeta(col, row) {
  const safeCol = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(col)));
  const safeRow = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(row)));
  const cellWidth = NORMALIZED_SIZE / GRID_COLS;
  const cellHeight = NORMALIZED_SIZE / GRID_ROWS;
  const colLetters = columnIndexToLetters(safeCol);

  return {
    col: safeCol,
    row: safeRow,
    gridCode: `${colLetters}${safeRow + 1}`,
    zoneName: `Zone ${colLetters}${safeRow + 1}`,
    centerX: Math.round((safeCol + 0.5) * cellWidth),
    centerY: Math.round((safeRow + 0.5) * cellHeight)
  };
}

/**
 * Project WGS84 lat/lng coordinates into unified 0..1000 factory floor space.
 */
export function latLngToNormalized(lat, lng) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng) || (numLat === 0 && numLng === 0)) {
    return null;
  }
  const latSpan = FACTORY_BOUNDS.latTop - FACTORY_BOUNDS.latBottom;
  const lngSpan = FACTORY_BOUNDS.lngRight - FACTORY_BOUNDS.lngLeft;
  const y = ((FACTORY_BOUNDS.latTop - numLat) / latSpan) * NORMALIZED_SIZE;
  const x = ((numLng - FACTORY_BOUNDS.lngLeft) / lngSpan) * NORMALIZED_SIZE;
  return { x, y };
}

/**
 * Project normalized 0..1000 floor coordinates back into WGS84 lat/lng.
 */
export function normalizedToLatLng(x, y) {
  const latSpan = FACTORY_BOUNDS.latTop - FACTORY_BOUNDS.latBottom;
  const lngSpan = FACTORY_BOUNDS.lngRight - FACTORY_BOUNDS.lngLeft;
  return {
    lat: Number((FACTORY_BOUNDS.latTop - (Number(y) / NORMALIZED_SIZE) * latSpan).toFixed(7)),
    lng: Number((FACTORY_BOUNDS.lngLeft + (Number(x) / NORMALIZED_SIZE) * lngSpan).toFixed(7))
  };
}

/**
 * Resolve normalized floor coordinates from either OUTDOOR GPS or INDOOR Wi-Fi telemetry.
 */
export function resolveNormalizedPosition(record) {
  if (!record) return null;
  const locType = String(record.location_type || '').toUpperCase();
  const hasGps = record.lat != null && record.lng != null && Number(record.lat) !== 0;

  if (locType === 'OUTDOOR' && hasGps) {
    const projected = latLngToNormalized(record.lat, record.lng);
    if (projected) {
      const clampedX = Math.max(12, Math.min(NORMALIZED_SIZE - 12, projected.x));
      const clampedY = Math.max(12, Math.min(NORMALIZED_SIZE - 12, projected.y));
      return {
        x: clampedX,
        y: clampedY,
        rawX: projected.x,
        rawY: projected.y,
        lat: Number(record.lat),
        lng: Number(record.lng),
        mode: 'OUTDOOR',
        inBounds: projected.x >= 0 && projected.x <= NORMALIZED_SIZE && projected.y >= 0 && projected.y <= NORMALIZED_SIZE
      };
    }
  }

  if (record.indoor_x != null && record.indoor_y != null) {
    const ix = Number(record.indoor_x);
    const iy = Number(record.indoor_y);
    if (Number.isFinite(ix) && Number.isFinite(iy)) {
      const clampedX = Math.max(12, Math.min(NORMALIZED_SIZE - 12, ix));
      const clampedY = Math.max(12, Math.min(NORMALIZED_SIZE - 12, iy));
      const approxGps = normalizedToLatLng(clampedX, clampedY);
      return {
        x: clampedX,
        y: clampedY,
        rawX: ix,
        rawY: iy,
        lat: approxGps.lat,
        lng: approxGps.lng,
        mode: 'INDOOR',
        inBounds: true
      };
    }
  }

  return null;
}

/**
 * Visual color tokens per forklift state & connectivity.
 */
export function getVehicleVisualMeta(forklift) {
  const status = String(forklift?.status || 'AVAILABLE').toUpperCase();
  const isOffline = Boolean(forklift?.is_offline);
  const battery = Number(forklift?.current_battery ?? 100);

  if (status === 'MAINTENANCE') {
    return { label: 'ซ่อมบำรุง', hex: '#64748b', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
  if (battery < 20) {
    return { label: 'แบตเตอรี่ต่ำ', hex: '#ef4444', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (status === 'IN_USE') {
    return { label: 'กำลังใช้งาน', hex: '#f59e0b', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (status === 'CHARGING') {
    return { label: 'กำลังชาร์จ', hex: '#3b82f6', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (isOffline) {
    return { label: 'ออฟไลน์', hex: '#475569', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
  return { label: 'พร้อมใช้งาน', hex: '#10b981', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

/**
 * Extract vehicle code cleanly from scanned QR URLs (both Legacy scan.php and Toolbox SPA URLs) or plain text.
 */
export function parseScannedForkliftCode(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return '';

  const matchQuery = trimmed.match(/[?&#]code=([^&#]+)/i);
  if (matchQuery?.[1]) {
    try {
      return decodeURIComponent(matchQuery[1].replace(/\+/g, ' ')).trim();
    } catch {
      return matchQuery[1].trim();
    }
  }
  return trimmed;
}

/**
 * Color ramp matching legacy leaflet.heat gradient: blue -> cyan -> lime -> yellow -> red.
 */
export function getHeatmapRgba(ratio) {
  const clamped = Math.max(0.05, Math.min(1, ratio));
  if (clamped < 0.35) {
    return `rgba(37, 99, 235, ${(0.25 + clamped * 0.9).toFixed(2)})`;
  }
  if (clamped < 0.55) {
    return `rgba(6, 182, 212, ${(0.45 + clamped * 0.5).toFixed(2)})`;
  }
  if (clamped < 0.75) {
    return `rgba(132, 204, 22, ${(0.6 + clamped * 0.3).toFixed(2)})`;
  }
  if (clamped < 0.9) {
    return `rgba(250, 204, 21, ${(0.72 + clamped * 0.25).toFixed(2)})`;
  }
  return 'rgba(239, 68, 68, 0.92)';
}
