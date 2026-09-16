// paintChemConfig.js — Central configuration for PAINT Chem Check Sheet
// Station definitions, parameter specs, and shift/time-slot rules.

export const SHIFT_SLOTS = {
  DAY:   ['08:00-09:00', '10:00-11:00', '13:00-14:00', '15:00-16:00', '17:30-18:30', '19:30-20:30'],
  NIGHT: ['20:00-22:00', '22:00-00:00', '01:00-03:00', '03:00-05:00', '05:30-07:00', '07:00-08:00'],
};

// Determine current shift from local time
export function detectCurrentShift() {
  const hour = new Date().getHours();
  // DAY: 07:00 - 19:59, NIGHT: 20:00 - 06:59
  return hour >= 7 && hour < 20 ? 'DAY' : 'NIGHT';
}

// Detect most recent time slot for a given shift
export function detectCurrentSlot(shift) {
  const slots = SHIFT_SLOTS[shift] ?? [];
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  // Return last slot whose start time <= now, else first slot
  const matched = [...slots].reverse().find((slot) => {
    const start = slot.split('-')[0];
    return start <= hhmm;
  });
  return matched ?? slots[0];
}

// Parameter standards for OOR highlighting (mirrors server-side PARAM_STANDARDS)
export const PARAM_STANDARDS = {
  F_Al:        { min: 10.0, max: 12.0, unit: 'pt' },
  Temperature: { min: 25.0, max: 35.0, unit: '°C' },
  Pressure:    { min: 0.4,  max: 0.8,  unit: 'Bar' },
  Conta_WR1:   { min: null, max: 8.0,  unit: 'pt' },
  Conta_WR2:   { min: null, max: 1.0,  unit: 'pt' },
  pH:          { min: 9.0,  max: 11.0, unit: '' },
  TC:          { min: 2.0,  max: 4.0,  unit: 'pt' },
  FA:          { min: 0.3,  max: 0.5,  unit: 'pt' },
  TA:          { min: 23.0, max: 25.0, unit: 'pt' },
  AC:          { min: 2.0,  max: 4.0,  unit: 'pt' },
  Conta_WR3:   { min: null, max: 5.0,  unit: 'pt' },
  Conta_WR4:   { min: null, max: 0.5,  unit: 'pt' },
  EC:          { min: null, max: 10.0, unit: 'μS/cm' },
  FlowRate:    { min: 1.5,  max: null, unit: 'm³/hr' },
};

export function isOutOfRange(paramKey, value) {
  if (value === null || value === undefined || value === '') return false;
  const std = PARAM_STANDARDS[paramKey];
  if (!std) return false;
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (std.min !== null && num < std.min) return true;
  if (std.max !== null && num > std.max) return true;
  return false;
}

export function rangeLabel(paramKey) {
  const std = PARAM_STANDARDS[paramKey];
  if (!std) return '';
  const parts = [];
  if (std.min !== null) parts.push(`≥ ${std.min}`);
  if (std.max !== null) parts.push(`≤ ${std.max}`);
  return parts.join(', ') + (std.unit ? ` ${std.unit}` : '');
}

// Station definitions — matches the paper form exactly
export const STATIONS = [
  {
    no: 1,
    name: 'Degreasing 1',
    chemical: 'FC-TS008 (6.3 Kg/pt-up)',
    params: [
      { key: 'F_Al',       label: 'F.Al',        hasKg: true },
      { key: 'Temperature',label: 'Temperature', hasKg: false },
      { key: 'Pressure',   label: 'Pressure',    hasKg: false },
    ],
  },
  {
    no: 2,
    name: 'Degreasing 2',
    chemical: 'FC-TS008 (12.4 Kg/pt-up)',
    params: [
      { key: 'F_Al',       label: 'F.Al',        hasKg: true },
      { key: 'Temperature',label: 'Temperature', hasKg: false },
      { key: 'Pressure',   label: 'Pressure',    hasKg: false },
    ],
  },
  {
    no: 3,
    name: 'Water Rinse 1',
    chemical: 'Water Rinse 1',
    params: [
      { key: 'Conta_WR1', label: 'Conta', hasKg: false },
      { key: 'Pressure',  label: 'Pressure', hasKg: false },
    ],
  },
  {
    no: 4,
    name: 'Water Rinse 2',
    chemical: 'Water Rinse 2',
    params: [
      { key: 'WaterLevel_WR2', label: 'Water level', isOverflow: true, hasKg: false },
      { key: 'Conta_WR2',     label: 'Conta',        hasKg: false },
      { key: 'Pressure',      label: 'Pressure',     hasKg: false },
    ],
  },
  {
    no: 5,
    name: 'Surface Cond.',
    chemical: 'NT-4055 / PL-XG / AD-4977 (0.2 Kg/day)',
    params: [
      { key: 'pH',      label: 'pH',       hasKg: false },
      { key: 'TC',      label: 'T.C',      hasKg: false },
      { key: 'Pressure',label: 'Pressure', hasKg: false },
    ],
  },
  {
    no: 6,
    name: 'Zinc Phosphase',
    chemical: 'NT-4055 / PB-LTS103 RF-1 / AC-131 / AJ-TB',
    params: [
      { key: 'Temperature', label: 'Temperature', hasKg: false },
      { key: 'FA',          label: 'F.A (Free Acid)',    hasKg: true },
      { key: 'TA',          label: 'T.A (Total Acidity)',hasKg: true },
      { key: 'AC',          label: 'A.C',          hasKg: true },
      { key: 'Pressure',    label: 'Pressure',     hasKg: false },
    ],
  },
  {
    no: 7,
    name: 'Water Rinse 3',
    chemical: 'DI Water Rinse',
    params: [
      { key: 'Conta_WR3',     label: 'Conta',       hasKg: false },
      { key: 'Pressure',      label: 'Pressure',    hasKg: false },
      { key: 'WaterLevel_WR3',label: 'Water level', isOverflow: true, hasKg: false },
    ],
  },
  {
    no: 8,
    name: 'Water Rinse 4',
    chemical: 'DI Water Rinse',
    params: [
      { key: 'Conta_WR4', label: 'Conta',    hasKg: false },
      { key: 'Pressure',  label: 'Pressure', hasKg: false },
    ],
  },
  {
    no: 9,
    name: 'Deionized Water Rinse',
    chemical: 'DI Water Rinse',
    params: [
      { key: 'EC',       label: 'EC',        hasKg: false },
      { key: 'FlowRate', label: 'Flow rate', hasKg: false },
    ],
  },
];
