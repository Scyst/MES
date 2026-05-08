// ============================================
// Barcode Scanner - Main Script
// ============================================

// ===== State =====
let currentMode           = 'pc';
let barcodeFound          = false;
let currentSap            = '';
let currentProductionType = 'FG';
let currentPartNo         = '';
let scanCount             = 0;
let isProcessing          = false;  // ป้องกัน double-submit
let saveOkTimer           = null;   // timer สำหรับ barcodeSaveOk badge

// ===== โหลดเริ่มต้น =====
document.addEventListener('DOMContentLoaded', () => {
    loadLocations();
    // loadLogs(); // ปิดไว้ — ตารางประวัติถูกซ่อนแล้ว
    loadTodayCount();
    setupBarcodeInput();
    setupAutoClearInvalid();

    // โฟกัสที่ช่อง barcode เสมอ
    document.getElementById('barcodeInput').focus();
});

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

// ===== สลับโหมด PC / Mobile =====
function switchMode(mode) {
    currentMode = mode;
    const container = document.getElementById('appContainer');

    if (mode === 'mobile') {
        container.classList.add('mode-mobile');
    } else {
        container.classList.remove('mode-mobile');
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    document.getElementById('barcodeInput').focus();
}

// ===== โหลดจำนวนสแกนวันนี้จาก DB =====
async function loadTodayCount() {
    try {
        const res  = await fetch(`get_today_count.php?_=${Date.now()}`);
        const json = await res.json();
        if (json.success) scanCount = parseInt(json.count) || 0;
    } catch (err) {
        console.error('Load today count failed:', err);
    }
}

// ===== โหลด Location จาก API =====
async function loadLocations() {
    try {
        const res = await fetch('get_locations.php');
        const json = await res.json();
        const select = document.getElementById('locationSelect');

        if (json.success && json.data.length > 0) {
            json.data.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc.location_id;
                opt.dataset.name = loc.location_name;
                opt.textContent = loc.location_name;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Load locations failed:', err);
    }
}

// ===== โหลดประวัติการสแกน =====
async function loadLogs() {
    try {
        const res = await fetch(`get_logs.php?_=${Date.now()}`);
        const json = await res.json();
        const tbody = document.getElementById('logTableBody');

        if (!json.success || json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ยังไม่มีข้อมูล...</td></tr>';
            return;
        }

        let lastDay = null;
        const rows = [];
        for (const row of json.data) {
            const day = row.log_date ? row.log_date.slice(0, 10) : '';
            if (day !== lastDay) {
                const d = new Date(day);
                const label = isNaN(d) ? day : d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                rows.push(`<tr class="day-separator"><td colspan="8">📅 ${label}</td></tr>`);
                lastDay = day;
            }
            rows.push(`
            <tr>
                <td>${row.id}</td>
                <td><code>${escapeHtml(row.barcode)}</code></td>
                <td class="hide-mobile">${escapeHtml(row.sku)}</td>
                <td class="hide-mobile">${escapeHtml(row.model)}</td>
                <td>${escapeHtml(row.lot_ref)}</td>
                <td>${escapeHtml(row.location)}</td>
                <td>${escapeHtml(row.log_date)}</td>
                <td><span class="badge badge-${row.device_type.toLowerCase()}">${row.device_type}</span></td>
            </tr>`);
        }
        tbody.innerHTML = rows.join('');
    } catch (err) {
        console.error('Load logs failed:', err);
    }
}

// ===== ตั้งค่าช่องสแกน Barcode =====
function setupBarcodeInput() {
    const input = document.getElementById('barcodeInput');

    // เครื่องสแกน Barcode มักจะส่งข้อมูลรวดเร็ว + กด Enter ท้าย
    input.addEventListener('input', () => {
        barcodeFound  = false;
        currentSap    = '';
        currentPartNo = '';
        document.getElementById('saveStatus').className = 'status-msg';
    });

    // Enter = ค้นหาแล้วบันทึกทันที (ถ้า Lot/Ref + Location พร้อมแล้ว)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isProcessing) return;
            const val = e.target.value.trim();
            if (val.length === 0) return;

            const lotRef   = document.getElementById('lotRefInput').value.trim();
            const location = document.getElementById('locationSelect').value;

            if (!lotRef || !location) {
                if (!lotRef)     document.getElementById('lotRefInput').classList.add('invalid');
                if (!location)   document.getElementById('locationSelect').classList.add('invalid');
                (!lotRef ? document.getElementById('lotRefInput') : document.getElementById('locationSelect')).focus();
                return;
            }

            if (val.length !== 12) {
                const inp = document.getElementById('barcodeInput');
                inp.value = '';
                inp.classList.add('invalid');
                showStatus(document.getElementById('barcodeStatus'), 'error', '❌ บาร์โค้ดไม่ถูกต้อง');
                return;
            }

            if (val.length === 12) {
                isProcessing = true;
                lookupProduct(val).then(found => {
                    const lotRef   = document.getElementById('lotRefInput').value.trim();
                    const location = document.getElementById('locationSelect').value;

                    if (!found) {
                        isProcessing = false;
                    } else if (found && lotRef && location) {
                        saveScan().finally(() => { isProcessing = false; });
                    } else {
                        isProcessing  = false;
                        barcodeFound  = false;
                        currentSap    = '';
                        currentPartNo = '';
                        document.getElementById('barcodeInput').value = '';
                        if (!lotRef)   document.getElementById('lotRefInput').classList.add('invalid');
                        if (!location) document.getElementById('locationSelect').classList.add('invalid');
                        document.getElementById('barcodeInput').focus();
                    }
                });
            }
        }
    });
}

// ===== ค้นหาสินค้าจาก Barcode =====
async function lookupProduct(barcode) {
    const statusEl = document.getElementById('barcodeStatus');

    showStatus(statusEl, 'info', 'กำลังค้นหา...');

    try {
        const res = await fetch(`get_product.php?barcode=${encodeURIComponent(barcode)}`);
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
            showStatus(statusEl, 'error', '❌ บาร์โค้ดไม่ถูกต้อง');
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
        showStatus(document.getElementById('barcodeStatus'), 'error', '❌ Barcode ไม่ถูกต้อง');
        document.getElementById('barcodeInput').focus();
        return;
    }

    // ล้าง state error เก่าก่อน
    fields.forEach(f => document.getElementById(f.id).classList.remove('invalid'));

    // เช็คทุกช่องพร้อมกัน
    const missing = [];
    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el.value.trim()) {
            missing.push({ ...f, el });
            el.classList.add('invalid');
        }
    });

    if (missing.length > 0) {
        missing[0].el.focus();
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
        const res = await fetch('save_scan.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            await loadTodayCount();
            showStatus(statusEl, 'success', '✅ บันทึกสำเร็จ');

            // แสดงข้อมูลที่บันทึกไปล่าสุด
            showLastSaved(json.data);

            // Clear Barcode + SAP + Notes (เก็บ Lot/Ref + Location ไว้)
            barcodeFound = false;
            currentSap   = '';
            document.getElementById('barcodeInput').value = '';
            document.getElementById('barcodeStatus').classList.remove('show');

            const saveOk = document.getElementById('barcodeSaveOk');
            saveOk.textContent = 'บันทึกสำเร็จ';
            saveOk.classList.add('show');
            if (saveOkTimer) clearTimeout(saveOkTimer);
            saveOkTimer = setTimeout(() => saveOk.classList.remove('show'), 3000);
            ['barcodeInput', 'lotRefInput', 'locationSelect']
                .forEach(id => document.getElementById(id).classList.remove('invalid'));

            // await loadLogs(); // disabled - log table hidden
            // const firstRow = document.querySelector('#logTableBody tr');
            // if (firstRow) firstRow.classList.add('new-row');

            // เด้งกลับช่อง Barcode
            document.getElementById('barcodeInput').focus();
        } else {
            showStatus(statusEl, 'error', `❌ ${json.message}`);
        }
    } catch (err) {
        showStatus(statusEl, 'error', '❌ เชื่อมต่อ Server ไม่ได้');
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
    document.getElementById('lsBarcode').textContent  = data.barcode        || '-';
    document.getElementById('lsModel').textContent    = currentPartNo       || '-';
    document.getElementById('lsLotRef').textContent   = data.lot_ref        || '-';
    document.getElementById('lsLocation').textContent = data.location_name  || '-';
    document.getElementById('lsNotes').textContent    = data.notes          || '-';
    document.getElementById('lsDate').textContent     = data.logdate        || '-';

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
    el.className = `status-msg show ${type}`;
    el.textContent = msg;
    if (type === 'success') {
        setTimeout(() => el.classList.remove('show'), 3000);
    }
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}
