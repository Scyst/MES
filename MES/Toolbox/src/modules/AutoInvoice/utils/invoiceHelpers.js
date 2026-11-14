/**
 * Utilities for Toolbox Auto Invoice & Packing List SPA:
 * - Date parsing / doc date formatting (`FEBRUARY 20, 2026`)
 * - Address `*bold*` segment parser
 * - USD number-to-words converter
 * - SheetJS 30-col Excel Template generator
 * - SheetJS multi-invoice Excel/CSV batch parser
 */

export const formatUniversalDateDmy = (val) => {
  if (val === null || val === undefined || val === '' || val === '-') return '';
  if (typeof val === 'number' && val > 40000) {
    const dt = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!Number.isNaN(dt.getTime())) {
      const d = String(dt.getUTCDate()).padStart(2, '0');
      const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${dt.getUTCFullYear()}`;
    }
  }
  const clean = String(val).trim();
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(clean);
  if (iso) {
    return `${String(iso[3]).padStart(2, '0')}/${String(iso[2]).padStart(2, '0')}/${iso[1]}`;
  }
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(clean);
  if (dmy) {
    let yr = Number(dmy[3]);
    if (yr < 100) yr += yr < 50 ? 2000 : 1900;
    return `${String(dmy[1]).padStart(2, '0')}/${String(dmy[2]).padStart(2, '0')}/${yr}`;
  }
  return clean;
};

export const dmyToIsoDate = (dmyStr) => {
  if (!dmyStr || dmyStr === '-') return '';
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(dmyStr).trim());
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(dmyStr)) return String(dmyStr).slice(0, 10);
  return '';
};

const MONTHS_EN = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

export const formatEnglishDocDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(dateStr).trim());
  if (dmy) {
    const mIdx = Number(dmy[2]) - 1;
    return `${MONTHS_EN[mIdx] || dmy[2]} ${String(Number(dmy[1])).padStart(2, '0')}, ${dmy[3]}`;
  }
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(dateStr).trim());
  if (iso) {
    const mIdx = Number(iso[2]) - 1;
    return `${MONTHS_EN[mIdx] || iso[2]} ${String(Number(iso[3])).padStart(2, '0')}, ${iso[1]}`;
  }
  return String(dateStr);
};

export const formatDecimal = (val, decimals = 2) => {
  const d = Math.max(0, Math.min(6, Number(decimals) || 0));
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(Number(val || 0));
};

export const ceilCbm = (val, cbmDecimals = 2) => {
  const d = Math.max(0, Math.min(6, Number(cbmDecimals) || 2));
  const factor = 10 ** d;
  return Math.ceil(Math.round(Number(val || 0) * factor * 10000) / 10000) / factor;
};

const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
const SCALES = ['', 'THOUSAND', 'MILLION', 'BILLION'];

const threeDigitsToWords = (num) => {
  let out = [];
  const hundreds = Math.floor(num / 100);
  const rem = num % 100;
  if (hundreds > 0) out.push(`${ONES[hundreds]} HUNDRED`);
  if (rem > 0) {
    if (rem < 20) out.push(ONES[rem]);
    else {
      const t = TENS[Math.floor(rem / 10)];
      const o = ONES[rem % 10];
      out.push(o ? `${t} ${o}` : t);
    }
  }
  return out.join(' ');
};

export const numberToWordsUsd = (amount) => {
  const rounded = Math.round(Number(amount || 0) * 100) / 100;
  const dollars = Math.floor(rounded);
  const cents = Math.round((rounded - dollars) * 100);

  if (dollars === 0 && cents === 0) return 'ZERO USD';

  const parts = [];
  let n = dollars;
  let scaleIdx = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const words = threeDigitsToWords(chunk);
      parts.unshift(SCALES[scaleIdx] ? `${words} ${SCALES[scaleIdx]}` : words);
    }
    n = Math.floor(n / 1000);
    scaleIdx += 1;
  }

  let res = `${parts.length ? parts.join(' ') : 'ZERO'} USD`;
  if (cents > 0) {
    res += ` AND ${threeDigitsToWords(cents)} CENTS`;
  }
  return res;
};

/** Splits text with `*bold*` markers safely into renderable tokens (XSS-safe). */
export const parseStarBoldSegments = (text) => {
  if (!text || text === '-') return [[{ text: '-', bold: false }]];
  return String(text)
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const segments = [];
      const regex = /\*(.*?)\*/g;
      let lastIdx = 0;
      let m;
      while ((m = regex.exec(line)) !== null) {
        if (m.index > lastIdx) segments.push({ text: line.slice(lastIdx, m.index), bold: false });
        segments.push({ text: m[1], bold: true });
        lastIdx = m.index + m[0].length;
      }
      if (lastIdx < line.length) segments.push({ text: line.slice(lastIdx), bold: false });
      return segments.length ? segments : [{ text: '', bold: false }];
    });
};

export const downloadInvoiceTemplateXlsx = async () => {
  const XLSX = await import('xlsx');
  const headers = [
    'Invoice_No', 'Booking_No', 'Team', 'Invoice_Date', 'Customer_Name',
    'Customer_Address', 'Consignee', 'Notify_Party', 'Incoterms', 'Payment',
    'Port_of_Loading', 'Port_of_Discharge', 'Feeder_Vessel', 'Mother_Vessel',
    'ETD', 'ETA', 'Container_Qty', 'SKU', 'Product_Type (Auto)',
    'Description (Auto)', 'Carton_No', 'Container_No', 'Seal_No',
    'Quantity (Auto)', 'Unit_Price (Auto)', 'N.W (Auto)', 'G.W (Auto)',
    'CBM (Auto)', 'Purchase_Order', 'Shipping Marks',
  ];
  const sampleRow = [
    'SNC-GP26-0001', 'BKG-12345678', 'Team 1', '20/02/2026', 'DUMMY CUSTOMER CO., LTD',
    '123 DUMMY STREET, CITY, COUNTRY', 'SAME AS CONSIGNEE', 'SAME AS CONSIGNEE',
    'FOB LAEM CHABANG,THAILAND', 'O/A 30 DAYS AFTER B/L DATE.', 'LAEM CHABANG, THAILAND',
    'YOKOHAMA, JAPAN', 'DUMMY VESSEL V.123', 'MOTHER VESSEL V.456', '25/02/2026',
    '05/03/2026', '1x20FT', '70344', '-', '-', '1-10', 'TLLU1234567', 'SEAL123',
    '-', '-', '-', '-', '-', 'PO-2026-001', 'N/M',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'Invoice_Upload_Template.xlsx');
};

/** Parses multi-invoice Excel/CSV upload files into `sp_Finance_ImportInvoice` payloads. */
export const parseInvoiceExcelFile = async (file) => {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const invoices = {};
  let idx = {};
  let headerFound = false;
  let currentInvNo = null;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i].map((c) => String(c ?? '').trim());
    if (row.filter((c) => c !== '').length === 0) continue;

    if (!headerFound) {
      const upper = row.map((c) => c.toUpperCase().replace(/_/g, ' '));
      if (upper.some((c) => c.includes('INVOICE NO')) && upper.some((c) => c.includes('CUSTOMER'))) {
        headerFound = true;
        const findIdx = (kw) => upper.findIndex((c) => c === kw || c.includes(kw));
        idx = {
          invoice_no: findIdx('INVOICE NO'),
          booking: findIdx('BOOKING NO') !== -1 ? findIdx('BOOKING NO') : findIdx('BOOKING'),
          team: findIdx('TEAM'),
          customer: findIdx('CUSTOMER NAME') !== -1 ? findIdx('CUSTOMER NAME') : findIdx('CUSTOMER'),
          address: findIdx('CUSTOMER ADDRESS') !== -1 ? findIdx('CUSTOMER ADDRESS') : findIdx('ADDRESS'),
          incoterms: findIdx('INCOTERMS'),
          consignee: findIdx('CONSIGNEE'),
          notify: findIdx('NOTIFY PARTY'),
          payment: findIdx('PAYMENT'),
          port_loading: findIdx('PORT OF LOADING'),
          port_discharge: findIdx('PORT OF DISCHARGE'),
          vessel: findIdx('FEEDER VESSEL'),
          mother: findIdx('MOTHER VESSEL'),
          container: findIdx('CONTAINER NO') !== -1 ? findIdx('CONTAINER NO') : findIdx('CONTAINER NAME'),
          seal: findIdx('SEAL'),
          invoice_date: findIdx('INVOICE DATE'),
          etd: findIdx('ETD'),
          eta: findIdx('ETA'),
          container_qty: findIdx('CONTAINER QTY'),
          qty: findIdx('QUANTITY'),
          price: findIdx('UNIT PRICE'),
          nw: findIdx('N.W'),
          gw: findIdx('G.W'),
          cbm: findIdx('CBM') !== -1 ? findIdx('CBM') : findIdx('MEASUREMENT'),
          po: findIdx('PURCHASE ORDER') !== -1 ? findIdx('PURCHASE ORDER') : findIdx('PO NO'),
          carton: findIdx('CARTON NO'),
          product_type: findIdx('PRODUCT TYPE'),
          marks: findIdx('SHIPPING MARKS') !== -1 ? findIdx('SHIPPING MARKS') : findIdx('MARKS'),
          desc: findIdx('DESCRIPTION'),
          sku: findIdx('SKU'),
        };
        continue;
      }
    }

    if (headerFound && idx.invoice_no !== undefined && idx.invoice_no !== -1) {
      const rowInvNo = row[idx.invoice_no];
      if (rowInvNo && rowInvNo.toUpperCase().includes('INVOICE NO')) continue;
      if (rowInvNo !== '') currentInvNo = rowInvNo;
      if (!currentInvNo) continue;

      const rawRow = rows[i];
      const getVal = (colIdx, fallback = '') => (colIdx !== undefined && colIdx !== -1 && row[colIdx] !== '' ? row[colIdx] : fallback);
      const getRaw = (colIdx) => (colIdx !== undefined && colIdx !== -1 ? rawRow[colIdx] : '');

      const qty = parseFloat(String(getVal(idx.qty, '0')).replace(/,/g, '')) || 0;
      const price = parseFloat(String(getVal(idx.price, '0')).replace(/,/g, '')) || 0;
      let rawDesc = getVal(idx.desc);
      let pType = getVal(idx.product_type);
      let sku = getVal(idx.sku);

      if (rawDesc === '-' || rawDesc.toUpperCase() === '(AUTO)') rawDesc = '';
      if (pType === '-' || pType.toUpperCase() === '(AUTO)') pType = '';
      if (rawDesc === '' && qty === 0 && sku === '') continue;

      if (!invoices[currentInvNo]) {
        invoices[currentInvNo] = {
          invoice_no: currentInvNo,
          customer: {
            name: getVal(idx.customer),
            address: getVal(idx.address),
            incoterms: getVal(idx.incoterms),
            consignee: getVal(idx.consignee),
            notify_party: getVal(idx.notify),
            payment_terms: getVal(idx.payment, 'O/A 30 DAYS AFTER B/L DATE.'),
          },
          shipping: {
            team_name: getVal(idx.team),
            booking_no: getVal(idx.booking),
            port_loading: getVal(idx.port_loading, 'LAEM CHABANG, THAILAND'),
            port_discharge: getVal(idx.port_discharge),
            feeder_vessel: getVal(idx.vessel),
            mother_vessel: getVal(idx.mother),
            container_no: '',
            seal_no: '',
            invoice_date: formatUniversalDateDmy(getRaw(idx.invoice_date)),
            etd_date: formatUniversalDateDmy(getRaw(idx.etd)),
            eta_date: formatUniversalDateDmy(getRaw(idx.eta)),
            container_qty: getVal(idx.container_qty),
          },
          details: [],
          _containers: [],
          _seals: [],
        };
      }

      if (!sku && rawDesc) {
        sku = rawDesc.split(' ')[0].replace(/^#/, '');
      }

      invoices[currentInvNo].details.push({
        sku,
        product_type: pType,
        description: rawDesc,
        qty,
        price,
        nw: parseFloat(String(getVal(idx.nw, '0')).replace(/,/g, '')) || 0,
        gw: parseFloat(String(getVal(idx.gw, '0')).replace(/,/g, '')) || 0,
        cbm: parseFloat(String(getVal(idx.cbm, '0')).replace(/,/g, '')) || 0,
        po: getVal(idx.po),
        carton: getVal(idx.carton),
        marks: getVal(idx.marks),
      });
      invoices[currentInvNo]._containers.push(getVal(idx.container));
      invoices[currentInvNo]._seals.push(getVal(idx.seal));
    }
  }

  const list = Object.values(invoices).map((inv) => ({
    invoice_no: inv.invoice_no,
    customer: inv.customer,
    shipping: {
      ...inv.shipping,
      container_no: inv._containers.join(','),
      seal_no: inv._seals.join(','),
    },
    details: inv.details,
  }));

  if (list.length === 0) {
    throw new Error('ไม่พบข้อมูล Invoice ในไฟล์ กรุณาตรวจสอบหัวตาราง (Invoice No / Customer Name)');
  }
  return list;
};
