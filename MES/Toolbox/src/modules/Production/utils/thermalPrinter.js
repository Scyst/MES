/**
 * Thermal 4"x2" (203 DPI) Label ZPL-II Builder & Web Serial USB Printer Client
 * Includes air-gapped browser fallback printing and QR/Lot parsing utilities.
 */

let serialPort = null;

export function buildLotCode(productKey, mfgDateStr, totalLotQty) {
  const cleanKey = String(productKey || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cleanKey) return '';
  const dateObj = mfgDateStr ? new Date(`${mfgDateStr}T00:00:00`) : new Date();
  const validDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');
  const yy = String(validDate.getFullYear()).slice(-2);
  const qtyInt = Math.max(1, Math.floor(Number(totalLotQty) || 1));
  const paddedQty = String(qtyInt).padStart(3, '0');
  return `${cleanKey}-${mm}${yy}-${paddedQty}`;
}

export function parseUuidParts(uuid) {
  const str = String(uuid || '').trim();
  const parts = str.split('-');
  if (parts.length < 2) {
    return { parentLot: str, serial: '001', displayLot: str };
  }
  const serial = parts.pop();
  const parentLot = parts.join('-');
  return {
    parentLot,
    serial,
    displayLot: `${parentLot}/${serial}`,
  };
}

export function parseTransferScanCode(rawInput) {
  const raw = String(rawInput || '').trim();
  if (!raw) return '';
  const match = raw.match(/transfer_id=([^&\s#]+)/i);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return match[1].trim();
    }
  }
  return raw;
}

export function buildTransferQrUrl(uuid) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = `${origin}/iot-toolbox/sandbox-b9/Toolbox/#/production`;
  return `${base}?tab=printer&mode=transfer&transfer_id=${encodeURIComponent(uuid)}`;
}

function escapeZplText(value) {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\^/g, '')
    .replace(/~/g, '');
}

/**
 * Generates ZPL-II for a 4" x 2" label (812 x 406 dots @ 203 DPI).
 */
export function buildZplLabel(label) {
  const sapNo = escapeZplText(label.sap_no);
  const partNo = escapeZplText(label.part_no);
  const desc = escapeZplText(label.part_description).slice(0, 44);
  const qty = Math.floor(Number(label.quantity) || 0);
  const lotDisplay = escapeZplText(label.scan_id_display || parseUuidParts(label.transfer_uuid).displayLot);
  const loc = escapeZplText(label.from_location_name || label.location_name || '-');
  const prodDate = escapeZplText(String(label.prod_date || '-').slice(0, 10));
  const remark = escapeZplText(label.notes || label.remark || '').slice(0, 38);
  const qrPayload = escapeZplText(label.qr_url || buildTransferQrUrl(label.transfer_uuid));

  return [
    '^XA',
    '^CI28',
    '^PW812',
    '^LL406',
    '^FO20,18^GB772,370,2^FS',
    '^FO28,28^A0N,26,26^FDSNC FORMER (WIP/FG TAG)^FS',
    `^FO540,28^A0N,24,24^FDLOT: ${lotDisplay}^FS`,
    '^FO20,62^GB772,2,2^FS',
    `^FO32,76^A0N,38,38^FDPART: ${partNo}^FS`,
    `^FO32,122^A0N,26,26^FDSAP: ${sapNo} | LOC: ${loc}^FS`,
    `^FO32,158^A0N,22,22^FD${desc}^FS`,
    '^FO20,192^GB520,2,2^FS',
    `^FO32,208^A0N,44,44^FDQTY: ${qty} PCS^FS`,
    `^FO32,268^A0N,24,24^FDMFG DATE: ${prodDate}^FS`,
    `^FO32,304^A0N,22,22^FDUUID: ${escapeZplText(label.transfer_uuid)}^FS`,
    `^FO32,340^A0N,20,20^FDNOTE: ${remark || '-'}^FS`,
    `^FO575,92^BQN,2,5^FDQA,${qrPayload}^FS`,
    '^XZ',
  ].join('\n');
}

export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function isUsbPrinterConnected() {
  return Boolean(serialPort && serialPort.writable);
}

export async function connectUsbPrinter() {
  if (!isWebSerialSupported()) {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับ Web Serial API (กรุณาใช้ Chrome/Edge บน Desktop หรือใช้โหมดพิมพ์ผ่านเบราว์เซอร์)');
  }
  serialPort = await navigator.serial.requestPort();
  if (!serialPort.readable && !serialPort.writable) {
    await serialPort.open({ baudRate: 9600 });
  }
  return true;
}

export async function disconnectUsbPrinter() {
  if (serialPort) {
    try {
      await serialPort.close();
    } catch {
      // ignore close errors
    }
    serialPort = null;
  }
}

export async function sendZplBatchToUsb(labels) {
  if (!isUsbPrinterConnected()) {
    throw new Error('ยังไม่ได้เชื่อมต่อเครื่องพิมพ์ USB Thermal');
  }
  const encoder = new TextEncoder();
  const writer = serialPort.writable.getWriter();
  try {
    const zplPayload = labels.map((label) => buildZplLabel(label)).join('\n');
    await writer.write(encoder.encode(zplPayload));
  } finally {
    writer.releaseLock();
  }
}

export function printSheetElementHtml(containerHtml, title = 'WIP/FG Tag 4x2') {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { size: 4in 2in; margin: 0; }
  * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
  body { margin: 0; padding: 0; background: #fff; color: #000; }
  .tag-page {
    width: 4in;
    height: 2in;
    padding: 0.1in;
    border: 1px solid #000;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }
  .tag-page:last-child { page-break-after: auto; }
  .tag-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1.5px solid #000;
    padding-bottom: 3px;
    font-size: 9.5pt;
    font-weight: 800;
  }
  .tag-body {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    gap: 8px;
    flex: 1;
    padding-top: 4px;
  }
  .tag-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .tag-part { font-size: 13pt; font-weight: 900; line-height: 1.1; word-break: break-all; }
  .tag-sub { font-size: 8.5pt; font-weight: 600; color: #222; }
  .tag-desc { font-size: 7.5pt; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tag-qty-row { display: flex; align-items: baseline; gap: 10px; border-top: 1px solid #888; padding-top: 3px; }
  .tag-qty { font-size: 16pt; font-weight: 900; }
  .tag-meta { font-size: 7.5pt; color: #333; line-height: 1.25; }
  .tag-qr { width: 1.15in; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .tag-uuid { font-size: 6.5pt; font-family: monospace; text-align: center; word-break: break-all; margin-top: 2px; }
</style>
</head>
<body>${containerHtml}</body>
</html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    }
  }, 250);
}

export function playScanTone(type = 'success') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1040, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // Ignore audio context errors on restricted devices
  }
}
