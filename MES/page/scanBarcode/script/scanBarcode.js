// ============================================
// Barcode Scanner - Main Script
// ============================================

// ===== State =====
let barcodeFound          = false;
let currentSap            = '';
let currentProductionType = 'FG';
let currentPartNo         = '';
let isProcessing          = false;
let saveOkTimer           = null;
let statusTimers          = new WeakMap();
let cachedLotRef          = '';  // สำรองค่า lot เผื่อ Android IME ทำให้ .value อ่านไม่ได้
let _suppressInput        = false; // ป้องกัน input event loop จาก programmatic value set
let logsAbortController   = null;

const CTRL_CHAR_RE   = /[\x00-\x1F\x7F​-‍﻿]/g;
const sanitizeBarcode = v => v.replace(CTRL_CHAR_RE, '').trim();

// ===== โหลดเริ่มต้น =====
document.addEventListener('DOMContentLoaded', () => {
    loadLocations();
    setupBarcodeInput();
    setupAutoClearInvalid();
    setupFieldNavigation();

    const picker = document.getElementById('logDatePicker');
    picker.value = productionDateStr();
    loadLogs(picker.value);

    document.getElementById('barcodeInput').focus();
});

// ===== นำทาง Lot → Location → Barcode =====
function setupFieldNavigation() {
    const lotEl = document.getElementById('lotRefInput');

    // input / compositionend: skip เมื่อว่าง (Android IME อาจ return '' ชั่วคราวระหว่าง compose)
    ['input', 'compositionend'].forEach(evt => {
        lotEl.addEventListener(evt, () => {
            const v = lotEl.value.trim();
            if (v) cachedLotRef = v;
        });
    });
    // blur / change: อัปเดต cache เสมอ รวมถึงค่าว่าง — ป้องกัน cache เก่าค้างหลัง user ลบ lot
    ['blur', 'change'].forEach(evt => {
        lotEl.addEventListener(evt, () => {
            cachedLotRef = lotEl.value.trim();
        });
    });

    lotEl.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            cachedLotRef = lotEl.value.trim();
            document.getElementById('locationSelect').focus();
        }
    });

    document.getElementById('locationSelect').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('barcodeInput').focus();
        }
    });
}

// ===== ลบ invalid state อัตโนมัติเมื่อผู้ใช้เริ่มกรอก =====
function setupAutoClearInvalid() {
    ['barcodeInput', 'lotRefInput', 'locationSelect'].forEach(id => {
        const el = document.getElementById(id);
        const evt = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(evt, () => {
            if (el.value.trim()) el.classList.remove('invalid');
        });
    });
}


// ===== เลือก Production Type =====
function selectProductionType(type) {
    currentProductionType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active-fg', 'active-hold', 'active-scrap');
        if (btn.dataset.type === type) {
            btn.classList.add(`active-${type.toLowerCase()}`);
        }
    });
}


// ===== โหลด Location จาก API =====
async function loadLocations() {
    try {
        const res = await fetch('api/scanManage.php?action=get_locations', { headers: { 'Accept': 'application/json' } });
        const json = await res.json();
        const select = document.getElementById('locationSelect');

        if (json.success && json.data.length > 0) {
            const filterSelect = document.getElementById('logLocationFilter');
            json.data.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc.location_id;
                opt.dataset.name = loc.location_name;
                opt.textContent = loc.location_name;
                select.appendChild(opt);

                const fopt = document.createElement('option');
                fopt.value = loc.location_name;
                fopt.textContent = loc.location_name;
                filterSelect.appendChild(fopt);
            });
        }
    } catch (err) {
        console.error('Load locations failed:', err);
    }
}

// ===== โหลดประวัติการสแกน =====
// production date: ถ้าเวลา < 08:00 → เมื่อวาน (กะดึกยังไม่จบ)
function productionDateStr() {
    const now = new Date();
    if (now.getHours() < 8) {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return d.toLocaleDateString('en-CA');
    }
    return now.toLocaleDateString('en-CA');
}

async function loadLogs(date) {
    if (logsAbortController) logsAbortController.abort();
    logsAbortController = new AbortController();

    date = date || productionDateStr();
    const location = document.getElementById('logLocationFilter')?.value || '';
    const shift    = document.getElementById('logShiftFilter')?.value    || 'all';
    const tbody    = document.getElementById('logTableBody');
    const summary  = document.getElementById('logSummary');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">กำลังโหลด...</td></tr>';
    summary.style.display = 'none';

    try {
        const res = await fetch(`api/scanManage.php?action=get_logs&date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}&location=${encodeURIComponent(location)}&_=${Date.now()}`, {
            signal: logsAbortController.signal,
            headers: { 'Accept': 'application/json' }
        });
        const json = await res.json();

        if (!json.success) {
            const msg = json.is_expired ? 'Session หมดอายุ — กรุณา Login ใหม่' : (json.message || 'เกิดข้อผิดพลาด');
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">${escapeHtml(msg)}</td></tr>`;
            return;
        }

        if (json.count === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ไม่มีข้อมูลในวันที่เลือก</td></tr>';
            summary.style.display = 'none';
            return;
        }

        // นับตาม type
        const counts = { FG: 0, HOLD: 0, SCRAP: 0 };
        json.data.forEach(r => {
            const t = (r.production_type || '').toUpperCase();
            if (counts[t] !== undefined) counts[t]++;
        });
        document.getElementById('sumTotal').textContent = json.count;
        document.getElementById('sumFG').textContent    = counts.FG;
        document.getElementById('sumHold').textContent  = counts.HOLD;
        document.getElementById('sumScrap').textContent = counts.SCRAP;
        summary.style.display = 'flex';

        const hourCounts = {};
        const hourHold  = {};
        const hourScrap = {};
        json.data.forEach(row => {
            if (row.logdate) {
                const key = row.logdate.slice(0, 13);
                hourCounts[key] = (hourCounts[key] || 0) + 1;
                const t = (row.production_type || '').toUpperCase();
                if (t === 'HOLD')  hourHold[key]  = (hourHold[key]  || 0) + 1;
                if (t === 'SCRAP') hourScrap[key] = (hourScrap[key] || 0) + 1;
            }
        });

        const typeCls = { FG: 'fg', HOLD: 'hold', SCRAP: 'scrap' };
        let prevHourKey = null;
        let hourIndex   = -1;
        tbody.innerHTML = json.data.map((row, i) => {
            const typeVal = (row.production_type || '').toUpperCase();
            const time    = row.logdate ? row.logdate.slice(8,10) + '/' + row.logdate.slice(5,7) + '/' + row.logdate.slice(0,4) + ' ' + row.logdate.slice(11,19) : '-';

            let divider = '';
            if (row.logdate) {
                const hourKey = row.logdate.slice(0, 13); // YYYY-MM-DD HH
                if (hourKey !== prevHourKey) {
                    hourIndex++;
                    const hh     = row.logdate.slice(11, 13);
                    const nextHH = String((Number(hh) + 1) % 24).padStart(2, '0');
                    const fg    = hourCounts[hourKey] - (hourHold[hourKey] || 0) - (hourScrap[hourKey] || 0);
                    const hold  = hourHold[hourKey]  || 0;
                    const scrap = hourScrap[hourKey] || 0;
                    divider = `<tr class="hour-divider"><td colspan="8"><div class="hour-divider-inner"><span>${hh}.00-${nextHH}.00</span><div class="hour-badges"><span class="hour-type-badge fg-badge">FG = ${fg}</span><span class="hour-type-badge hold-badge">HOLD = ${hold}</span><span class="hour-type-badge scrap-badge">SCRAP = ${scrap}</span></div></div></td></tr>`;
                    prevHourKey = hourKey;
                }
            }

            return divider + `<tr class="hour-band-${hourIndex % 4}">
                <td style="color:var(--bs-secondary-color);font-size:0.75rem">${json.count - i}</td>
                <td><code>${escapeHtml(row.barcode)}</code></td>
                <td style="font-size:0.78rem;color:var(--bs-secondary-color)">${escapeHtml(row.model || '')}</td>
                <td><span class="type-badge ${typeCls[typeVal] || ''}">${escapeHtml(typeVal)}</span></td>
                <td>${escapeHtml(row.lot_ref)}</td>
                <td class="hide-mobile">${escapeHtml(row.location_name)}</td>
                <td class="hide-mobile">${escapeHtml(row.notes || '')}</td>
                <td style="white-space:nowrap">${time}</td>
            </tr>`;
        }).join('');
    } catch (err) {
        if (err.name === 'AbortError') return;
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">เชื่อมต่อ Server ไม่ได้</td></tr>';
        console.error('Load logs failed:', err);
    }
}

// ===== ตั้งค่าช่องสแกน Barcode =====
function setupBarcodeInput() {
    const input = document.getElementById('barcodeInput');

    input.addEventListener('input', () => {
        if (_suppressInput) return;

        // IME scanner: inject barcode + \n/\r/\t โดยตรง ไม่ผ่าน keydown
        if (!isProcessing && /[\n\r\t]/.test(input.value)) {
            const val = sanitizeBarcode(input.value);
            _suppressInput = true;
            input.value = val;
            _suppressInput = false;
            if (val.length > 0) processBarcodeInput(val);
            return;
        }

        barcodeFound  = false;
        currentSap    = '';
        currentPartNo = '';
        document.getElementById('barcodeStatus').className = 'status-msg';
        document.getElementById('saveStatus').className    = 'status-msg';
    });

    // capture:true = run before browser default (blocks Android auto-advance to next field)
    // รับทั้ง Enter และ Tab — handheld scanner บางรุ่นส่ง Tab เป็น suffix แทน Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (isProcessing) return;
            const val = sanitizeBarcode(input.value);
            input.value = val;
            if (val.length > 0) processBarcodeInput(val);
        }
    }, true);

    // keyup fallback: some Android IME versions skip keydown entirely
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (isProcessing) return;
            const val = sanitizeBarcode(input.value);
            input.value = val;
            if (val.length > 0) processBarcodeInput(val);
        }
    }, true);

    // document-level capture: บล็อก Ctrl+T (เปิด tab ใหม่) และ Tab suffix ระดับ browser
    // Kaicom K901 บางครั้งส่ง Tab suffix ที่ Android Chrome ตีความเป็น Ctrl+T หรือเปลี่ยน focus
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            return;
        }
        if (e.key === 'Tab' && document.activeElement === input) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (isProcessing) return;
            const val = sanitizeBarcode(input.value);
            input.value = val;
            if (val.length > 0) processBarcodeInput(val);
        }
    }, true);
}

function processBarcodeInput(val) {
    if (isProcessing) return;

    // ป้องกัน double-scan: scanner บางตัวส่ง barcode ซ้ำกัน 2 รอบใน stream เดียว
    const half = Math.floor(val.length / 2);
    if (val.length > 4 && val.length % 2 === 0 && val.slice(0, half) === val.slice(half)) {
        val = val.slice(0, half);
        document.getElementById('barcodeInput').value = val;
    }

    const lotDom   = document.getElementById('lotRefInput').value.trim();
    const lotRef   = lotDom || cachedLotRef;
    const location = document.getElementById('locationSelect').value;

    if (!lotRef || !location) {
        if (!lotRef)   document.getElementById('lotRefInput').classList.add('invalid');
        if (!location) document.getElementById('locationSelect').classList.add('invalid');
        const missingFields = [!lotRef && 'Lot/Ref', !location && 'Location'].filter(Boolean);
        showStatus(document.getElementById('barcodeStatus'), 'error',
            `กรุณาใส่ ${missingFields.join(' และ ')} ก่อนสแกน`);
        document.getElementById('barcodeInput').value = '';
        barcodeFound = false; currentSap = ''; currentPartNo = '';
        return;
    }

    if (!lotDom && lotRef) {
        document.getElementById('lotRefInput').value = lotRef;
    }

    isProcessing = true;
    lookupProduct(val).then(found => {
        const lotRef2   = document.getElementById('lotRefInput').value.trim();
        const location2 = document.getElementById('locationSelect').value;

        if (!found) {
            isProcessing = false;
        } else if (lotRef2 && location2) {
            saveScan().finally(() => { isProcessing = false; });
        } else {
            isProcessing  = false;
            barcodeFound  = false;
            currentSap    = '';
            currentPartNo = '';
            document.getElementById('barcodeInput').value = '';
            if (!lotRef2)   document.getElementById('lotRefInput').classList.add('invalid');
            if (!location2) document.getElementById('locationSelect').classList.add('invalid');
        }
    }).catch(() => { isProcessing = false; });
}

// ===== ค้นหาสินค้าจาก Barcode =====
async function lookupProduct(barcode) {
    const statusEl = document.getElementById('barcodeStatus');

    showStatus(statusEl, 'info', 'กำลังค้นหา…');

    try {
        const res = await fetch(`api/scanManage.php?action=get_product&barcode=${encodeURIComponent(barcode)}`, { headers: { 'Accept': 'application/json' } });
        const json = await res.json();

        if (json.success) {
            barcodeFound  = true;
            currentSap    = json.data.sap_no  || '';
            currentPartNo = json.data.part_no || '';
            showStatus(statusEl, 'success',
                `✅ ${json.data.part_no || ''} — ${json.data.part_description || ''}`);
            return true;
        } else {
            barcodeFound  = false;
            currentSap    = '';
            currentPartNo = '';
            document.getElementById('barcodeInput').value = '';
            document.getElementById('barcodeInput').classList.add('invalid');
            showStatus(statusEl, 'error', `❌ ไม่พบ "${barcode}" ในระบบ`);
            return false;
        }
    } catch (err) {
        barcodeFound = false;
        showStatus(statusEl, 'error', '❌ เชื่อมต่อ Server ไม่ได้');
        return false;
    }
}

// ===== บันทึกข้อมูล =====
async function saveScan() {
    const fields = [
        { id: 'barcodeInput',   label: 'Barcode' },
        { id: 'lotRefInput',    label: 'Lot/Ref.' },
        { id: 'locationSelect', label: 'Location' },
    ];

    if (!barcodeFound) {
        const raw = sanitizeBarcode(document.getElementById('barcodeInput').value);
        if (raw.length > 0) {
            // มีค่าในช่องแต่ยังไม่ได้ lookup — trigger เหมือนกด Enter
            processBarcodeInput(raw);
        } else {
            showStatus(document.getElementById('barcodeStatus'), 'error', '❌ กรุณาระบุ Barcode');
            document.getElementById('barcodeInput').focus();
        }
        return;
    }

    // ล้าง state error เก่าก่อน
    fields.forEach(f => document.getElementById(f.id).classList.remove('invalid'));

    // Android IME อาจยังไม่ commit ค่า lot — ใช้ cachedLotRef เป็น fallback
    const lotEl = document.getElementById('lotRefInput');
    if (!lotEl.value.trim() && cachedLotRef) {
        lotEl.value = cachedLotRef;
    }

    const missing = [];
    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el.value.trim()) {
            missing.push({ ...f, el });
            el.classList.add('invalid');
        }
    });

    if (missing.length > 0) {
        showStatus(document.getElementById('saveStatus'), 'error',
            `❌ กรุณาใส่ ${missing.map(f => f.label).join(', ')}`);
        document.getElementById('barcodeInput').value = '';
        barcodeFound = false; currentSap = ''; currentPartNo = '';
        return;
    }

    // เก็บค่าหลัง validate ผ่าน
    const barcode      = document.getElementById('barcodeInput').value.trim();
    const lotRef       = document.getElementById('lotRefInput').value.trim();
    const sel          = document.getElementById('locationSelect');
    const locationId   = sel.value;
    const locationName = sel.options[sel.selectedIndex]?.dataset.name || sel.options[sel.selectedIndex]?.text || '';
    const notes        = document.getElementById('notesInput').value.trim();
    const statusEl     = document.getElementById('saveStatus');
    const saveBtn      = document.getElementById('saveBtn');

    saveBtn.disabled = true;
    saveBtn.innerHTML = 'กำลังบันทึก...';

    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
        const res = await fetch('api/scanManage.php?action=save_scan', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify({
                barcode, sap: currentSap,
                lot_ref: lotRef,
                location_id:   locationId,
                location_name: locationName,
                type:  currentProductionType,
                notes
            })
        });
        const json = await res.json();

        if (json.success) {
            showStatus(statusEl, 'success', '✅ ' + (json.message || 'บันทึกสำเร็จ'));
            showLastSaved(json.data);

            const picker = document.getElementById('logDatePicker');
            loadLogs(picker.value);

            // Clear Barcode + SAP + Notes (เก็บ Lot/Ref + Location ไว้)
            barcodeFound = false;
            currentSap   = '';
            document.getElementById('barcodeInput').value = '';
            document.getElementById('barcodeStatus').classList.remove('show');

            const saveOk = document.getElementById('barcodeSaveOk');
            saveOk.textContent = json.message || 'บันทึกสำเร็จ';
            saveOk.classList.add('show');
            if (saveOkTimer) clearTimeout(saveOkTimer);
            saveOkTimer = setTimeout(() => saveOk.classList.remove('show'), 3000);
            ['barcodeInput', 'lotRefInput', 'locationSelect']
                .forEach(id => document.getElementById(id).classList.remove('invalid'));

            // เด้งกลับช่อง Barcode
            document.getElementById('barcodeInput').focus();
        } else {
            showStatus(statusEl, 'error', `❌ ${json.message}`);
        }
    } catch (err) {
        showStatus(statusEl, 'error', '❌ เชื่อมต่อ Server ไม่ได้');
        document.getElementById('barcodeInput').value = '';
        barcodeFound = false; currentSap = ''; currentPartNo = '';
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 บันทึกข้อมูล';
    }
}


// ===== เคลียร์ฟอร์ม =====
function clearForm(full = true) {
    barcodeFound  = false;
    currentSap    = '';
    currentPartNo = '';
    cachedLotRef  = '';
    document.getElementById('barcodeInput').value = '';
    document.getElementById('lotRefInput').value  = '';
    document.getElementById('notesInput').value   = '';
    if (full) {
        document.getElementById('locationSelect').value = '';
    }
    ['barcodeInput', 'lotRefInput', 'locationSelect']
        .forEach(id => document.getElementById(id).classList.remove('invalid'));
    document.getElementById('barcodeStatus').classList.remove('show');
    document.getElementById('saveStatus').className = 'status-msg';
    document.getElementById('barcodeInput').focus();
}

// ===== แสดงข้อมูลที่บันทึกล่าสุด =====
function showLastSaved(data) {
    // ปรับให้โชว์ข้อมูลที่ผูกกับ Job อัตโนมัติจาก Backend ใหม่
    document.getElementById('lsBarcode').textContent    = data.sap || data.barcode || '-';
    document.getElementById('lsModel').textContent      = currentPartNo      || '-';
    
    // ตรง Lot/Ref ให้โชว์ Job No. ที่ระบบหาเจอแทน (ถ้ามี) จะมีประโยชน์กว่า
    document.getElementById('lsLotRef').innerHTML       = data.job_no ? `<span class="badge bg-primary">${data.job_no}</span>` : (data.lot_ref || '-');
    
    document.getElementById('lsLocation').textContent   = data.location_name || '-';
    
    // แสดงจำนวนรวมในรอบชั่วโมง
    const qtyStr = data.quantity_added ? ` (รวมรอบชั่วโมง: ${data.quantity_added} PCS)` : '';
    document.getElementById('lsNotes').textContent      = (data.notes || '-') + qtyStr;
    
    // เวลา
    const now = new Date();
    document.getElementById('lsDate').textContent       = now.toLocaleTimeString('th-TH');

    const typeVal   = (data.production_type || currentProductionType || '').toUpperCase();
    const typeBadge = document.querySelector('#lsType .type-badge');
    typeBadge.textContent = typeVal || '-';
    typeBadge.className   = 'type-badge' +
        (typeVal === 'FG' ? ' fg' : typeVal === 'HOLD' ? ' hold' : typeVal === 'SCRAP' ? ' scrap' : '');

    const panel = document.getElementById('lastSavedPanel');
    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = '';
}

// ===== Helper =====
function showStatus(el, type, msg) {
    clearTimeout(statusTimers.get(el));
    el.className = `status-msg show ${type}`;
    el.innerHTML = msg; // เปลี่ยนจาก textContent เป็น innerHTML เพื่อรองรับ tag <br> และ <b>
    if (type === 'success') {
        // ให้เวลาแจ้งเตือนนานขึ้นนิดนึง (5 วิ) เพราะข้อความมีรายละเอียด Job No
        statusTimers.set(el, setTimeout(() => el.classList.remove('show'), 5000));
    }
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}
