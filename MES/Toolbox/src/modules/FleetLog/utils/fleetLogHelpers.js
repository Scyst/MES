export const DEFAULT_FLEET_COST = 1100;

export const TRANS_TYPE_OPTIONS = [
  { value: 'INBOUND', label: 'เข้า (IN)', shortLabel: 'IN' },
  { value: 'OUTBOUND', label: 'ออก (OUT)', shortLabel: 'OUT' },
  { value: 'OTHER', label: 'อื่นๆ', shortLabel: 'OTHER' }
];

export const PROVIDER_OPTIONS = [
  { value: 'VENDOR', label: 'VENDOR (จ้างนอก)' },
  { value: 'SNC', label: 'SNC (รถภายใน)' }
];

export const CONTAINER_VEHICLE_PRESETS = ['20GP', '40GP', '40HQ', '45HQ'];
export const TRUCK_VEHICLE_PRESETS = ['4W', '6W', '10W'];
export const ALL_VEHICLE_PRESETS = [...CONTAINER_VEHICLE_PRESETS, ...TRUCK_VEHICLE_PRESETS];

export const VEHICLE_LABELS = {
  '20GP': "20' GP (Container)",
  '40GP': "40' GP (Container)",
  '40HQ': "40' HQ (Container)",
  '45HQ': "45' HQ (Container)",
  '4W': 'รถ 4 ล้อ (กระบะ)',
  '6W': 'รถ 6 ล้อ',
  '10W': 'รถ 10 ล้อ'
};

export function getDefaultMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${lastDay}`
  };
}

export function getCurrentLocalDatetime() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function toDatetimeLocal(value) {
  if (!value) return getCurrentLocalDatetime();
  const normalized = String(value).trim().replace(' ', 'T');
  return normalized.slice(0, 16);
}

export function formatTimestampDisplay(value) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 16);
}

export function formatCurrency(amount) {
  const num = Number.parseFloat(amount || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function validateCostInput(rawValue) {
  const str = String(rawValue ?? '').trim();
  if (str === '') return { valid: true, value: 0 };
  const num = Number(str);
  if (!Number.isFinite(num) || num < 0) {
    return { valid: false, error: 'ค่าขนส่งต้องเป็นตัวเลขที่ไม่ติดลบ' };
  }
  if (num > 9999999.999) {
    return { valid: false, error: 'ค่าขนส่งต้องไม่เกิน 9,999,999.999 บาท' };
  }
  const dotIdx = str.indexOf('.');
  if (dotIdx !== -1 && str.length - dotIdx - 1 > 3) {
    return { valid: false, error: 'ค่าขนส่งรองรับทศนิยมไม่เกิน 3 ตำแหน่ง' };
  }
  return { valid: true, value: Math.round(num * 1000) / 1000 };
}

export async function exportFleetLogsToExcel(logs, startDate, endDate) {
  const XLSX = await import('xlsx');
  const headers = [
    'วัน/เวลา',
    'ประเภทรายการ',
    'ผู้ให้บริการ',
    'ประเภทรถ/ตู้',
    'ทะเบียนรถ',
    'เอกสารอ้างอิง',
    'หมายเลขตู้',
    'หมายเลขซีล',
    'ค่าขนส่ง (THB)',
    'หมายเหตุ',
    'ผู้บันทึก'
  ];

  const rows = logs.map((row) => [
    formatTimestampDisplay(row.log_timestamp),
    row.trans_type || '-',
    row.provider_type || '-',
    row.vehicle_type || '-',
    row.car_license || '-',
    row.ref_document || '',
    row.container_no || '',
    row.seal_no || '',
    Number.parseFloat(row.transport_cost || 0) || 0,
    row.remark || '',
    row.admin_name || ''
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 28 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fleet_Log');
  const suffix = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
  XLSX.writeFile(workbook, `Logistics_Fleet_Log_${suffix}.xlsx`);
}
