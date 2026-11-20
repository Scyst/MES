/**
 * accessoriesInspection.js
 *
 * Two communication channels:
 *   1. Uvicorn API  (CAMERA_HOST) — cross-origin, raw fetch
 *   2. PHP API      (same-origin) — sendRequest() with automatic CSRF
 */

'use strict';

// CAMERA_HOST is injected by PHP as a global constant
// Helper: routes requests through PHP proxy (avoids Mixed Content on HTTPS pages)
function _camUrl(path) { return CAMERA_HOST + '?p=' + path; }

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let _currentModelClassesStr = "";

let _prev       = {};
let _lastStatus = {};


const _modalCfg = {
    error:   { icon: 'fas fa-times-circle',         bg: '#7d1a1a', text: '#fff' },
    warning: { icon: 'fas fa-exclamation-triangle',  bg: '#7d5a00', text: '#fff' },
    alarm:   { icon: 'fas fa-bell',                  bg: '#7d1a1a', text: '#fff' },
    success: { icon: 'fas fa-check-circle',          bg: '#1a5c2e', text: '#fff' },
    info:    { icon: 'fas fa-info-circle',           bg: '#1a3a6b', text: '#fff' },
};

function showModal(title, message, type = 'error', staticBackdrop = false) {
    const cfg = _modalCfg[type] ?? _modalCfg.error;
    const el  = document.getElementById('alertModal');
    document.getElementById('alertModalIcon').className    = `${cfg.icon} me-2`;
    document.getElementById('alertModalTitle').textContent = title;
    document.getElementById('alertModalBody').innerHTML    = escHtml(message).replace(/\n/g, '<br>');
    document.getElementById('alertModalHeader').style.cssText = `background:${cfg.bg}; color:${cfg.text};`;
    el.setAttribute('data-bs-backdrop', staticBackdrop ? 'static' : 'true');
    bootstrap.Modal.getOrCreateInstance(el).show();
}


async function pollStatus() {
    try {
        const res = await fetch(_camUrl('/api/status'), {
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const s = await res.json();
        _lastStatus = s;
        updateStatus(s);
        setConnStatus(true);
    } catch (_) {
        setConnStatus(false);
    }
}

function setConnStatus(online) {
    const el = document.getElementById('connStatus');
    el.innerHTML = online
        ? '<i class="fas fa-circle text-success me-1" style="font-size:.6rem"></i>Online'
        : '<i class="fas fa-circle text-danger me-1" style="font-size:.6rem"></i>Offline';
}

function updateStatus(s) {
    document.getElementById('fpsBadge').textContent = `FPS: ${s.fps}`;
    updateRequiredClassesUI(s);

    // shared derived state used by both badge and status list
    const _required = s.required_classes ?? [];
    const _confirmed = s.confirmed_classes ?? [];
    const _labels   = s.labels ?? [];
    const _isManual = s.armed && !s.io_connected;
    const _effConf  = new Set([
        ..._confirmed,
        ...(_isManual && s.all_found ? _labels.filter(c => _required.includes(c)) : []),
    ]);

    const badge    = document.getElementById('statusBadge');
    const stateMap = {
        idle:      ['bg-secondary',         'IDLE'],
        waiting:   ['bg-warning text-dark', `WAITING ${(s.wait_sec ?? 3).toFixed(0)}s`],
        detecting: ['bg-primary',           'DETECTING'],
        alarm:     ['bg-danger',            'ALARM'],
    };
    let [cls, text] = stateMap[s.io_state] ?? ['bg-secondary', String(s.io_state ?? '').toUpperCase()];
    if (s.io_state === 'idle' && s.armed) { cls = 'bg-success'; text = 'RUNNING'; }
    badge.className   = `badge ${cls}`;
    badge.textContent = text;

    // หยุด detection สั่งได้เฉพาะที่เครื่อง Python หน้าไลน์ — เว็บมีแค่ START
    // ขณะ armed อยู่ให้หรี่/disable ปุ่ม START กันกดซ้ำ
    const btnStart = document.getElementById('btnStart');
    if (btnStart) {
        btnStart.disabled      = s.armed;
        btnStart.style.opacity = s.armed ? '0.45' : '1';
    }

    document.getElementById('camOffline').style.display =
        s.camera_connected ? 'none' : 'flex';

    {
        const lb         = document.getElementById('labelsBadge');
        const lastFound  = s.last_detected_classes ?? [];
        if (_required.length === 0 || !s.armed) {
            lb.textContent = '';
        } else if (lastFound.length > 0 && s.io_state !== 'detecting') {
            // persist ALL FOUND in header after job done (mirrors detectedStatus)
            lb.innerHTML = `<span style="color:#00e676;font-weight:bold">✓&nbsp;${lastFound.length}/${_required.length}</span>`;
        } else {
            const nFound = _required.filter(c => _effConf.has(c)).length;
            const allOk  = nFound === _required.length && _required.length > 0;
            if (allOk) {
                lb.innerHTML = `<span style="color:#00e676;font-weight:bold">✓&nbsp;${_required.length}/${_required.length}</span>`;
            } else {
                lb.innerHTML = _required.map(c =>
                    _effConf.has(c)
                        ? `<span style="color:#00e676">✓${escHtml(c)}</span>`
                        : _labels.includes(c)
                            ? `<span style="color:#f1c40f">●${escHtml(c)}</span>`
                            : `<span style="color:#555">○${escHtml(c)}</span>`
                ).join('&thinsp;');
            }
        }
    }

    setSensor('dot1', 'badge1', s.sensor1);
    setSensor('dot2', 'badge2', s.sensor2);

    const lightColors = {
        GREEN:  'var(--mes-color-success, #00e676)',
        RED:    'var(--mes-color-danger,  #e74c3c)',
        YELLOW: 'var(--mes-color-warning, #f1c40f)',
        OFF:    'var(--bs-secondary-color, #888)',
    };
    const lv = document.getElementById('lightVal');
    const displayLight = s.io_state === 'alarm' ? 'RED' : (s.light ?? '—');
    lv.textContent = displayLight;
    lv.style.color = lightColors[displayLight] ?? 'var(--bs-secondary-color)';

    const av = document.getElementById('alarmVal');
    av.textContent = s.alarm ? 'ON' : 'OFF';
    av.style.color = s.alarm
        ? 'var(--mes-color-danger, #e74c3c)'
        : 'var(--bs-secondary-color, #888)';

    const camBadge = document.getElementById('camConnBadge');
    camBadge.textContent = s.camera_connected ? 'Connected' : 'Not connected';
    camBadge.className   = s.camera_connected ? 'conn-badge conn-on' : 'conn-badge conn-off';

    const ioBadge = document.getElementById('ioConnBadge');
    ioBadge.textContent = s.io_connected ? 'Connected' : 'Not connected';
    ioBadge.className   = s.io_connected  ? 'conn-badge conn-on' : 'conn-badge conn-off';

    const dbBadge = document.getElementById('dbConnBadge');
    if (dbBadge) {
        dbBadge.textContent = s.db_connected ? 'Connected' : 'Not connected';
        dbBadge.className   = s.db_connected  ? 'conn-badge conn-on' : 'conn-badge conn-off';
    }

    const ioMod = document.getElementById('ioModuleBadge');
    ioMod.textContent = s.io_connected ? 'ON' : 'OFF';
    ioMod.className   = s.io_connected  ? 'conn-badge conn-on' : 'conn-badge conn-off';

    {
        const det       = document.getElementById('detectedStatus');
        const lastFound = s.last_detected_classes ?? [];
        if (_required.length === 0 || !s.armed) {
            det.textContent = 'Detection: ' + (s.detection_enabled ? 'ON' : 'OFF');
            det.className   = 'small text-secondary mb-1';
            det.style.color = '';
        } else if (lastFound.length > 0 && s.io_state !== 'detecting') {
            // persist ALL FOUND after job done until next job
            det.innerHTML = '<div class="cls-all-found">ALL FOUND</div>'
                + lastFound.map(c =>
                    `<div class="cls-item cls-ok">● ${escHtml(c)}</div>`
                ).join('');
            det.className   = 'cls-status-list mb-1';
            det.style.color = '';
        } else {
            const nFound = _required.filter(c => _effConf.has(c)).length;
            const allOk  = nFound === _required.length && _required.length > 0;
            const title  = allOk
                ? '<div class="cls-all-found">ALL FOUND</div>'
                : `<div class="cls-item cls-missing fw-bold">${nFound} / ${_required.length}</div>`;
            det.innerHTML = title + _required.map(c =>
                _effConf.has(c)
                    ? `<div class="cls-item cls-ok">● ${escHtml(c)}</div>`
                    : _labels.includes(c)
                        ? `<div class="cls-item cls-detecting">● ${escHtml(c)}</div>`
                        : `<div class="cls-item cls-missing">● ${escHtml(c)}</div>`
            ).join('');
            det.className   = 'cls-status-list mb-1';
            det.style.color = '';
        }
    }

    syncControls(s);
    updateConfirmBar(s);
    updateErrorBanner(s);
    detectStateChanges(s);
    _prev = s;
}

function updateConfirmBar(s) {
    const wrap      = document.getElementById('confirmBarWrap');
    const fill      = document.getElementById('confirmFill');
    const label     = document.getElementById('confirmLabel');
    const confirmed = s.confirmed_classes ?? [];
    const required  = s.required_classes  ?? [];
    const nConf     = confirmed.length;
    const nReq      = required.length;
    const active    = s.io_state === 'detecting' && nReq > 0 && (nConf > 0 || s.confirm_elapsed > 0);
    if (active) {
        const pct = s.confirm_sec > 0
            ? Math.min(s.confirm_elapsed / s.confirm_sec * 100, 100)
            : 0;
        fill.style.width = pct + '%';
        const tracking = required.filter(
            c => (s.labels ?? []).includes(c) && !confirmed.includes(c));
        const trackTxt = tracking.length
            ? ` ● ${tracking.join(', ')} (${s.confirm_elapsed.toFixed(1)}s)`
            : '';
        label.textContent = nConf > 0
            ? `✓ ${nConf}/${nReq}${trackTxt}`
            : `กำลังยืนยัน… ${s.confirm_elapsed.toFixed(1)}s / ${s.confirm_sec.toFixed(0)}s`;
        wrap.style.display = 'flex';
    } else {
        wrap.style.display = 'none';
    }
}

function updateErrorBanner(s) {
    const banner = document.getElementById('errorBanner');
    const text   = document.getElementById('errorBannerText');
    const icon   = document.getElementById('errorBannerIcon');

    if (s.io_state === 'alarm') {
        banner.className     = 'error-banner banner-alarm';
        icon.className       = 'fas fa-bell me-2';
        text.textContent     = 'ALARM — ชิ้นงานหลุดออกก่อนตรวจจับสำเร็จ กรุณาตรวจสอบ';
        banner.style.display = 'flex';
    } else if (!s.camera_connected) {
        banner.className     = 'error-banner banner-warn';
        icon.className       = 'fas fa-video-slash me-2';
        text.textContent     = 'กล้องไม่ได้เชื่อมต่อ — ตรวจสอบสาย LAN และ main.py';
        banner.style.display = 'flex';
    } else if (s.armed && !s.io_connected) {
        banner.className     = 'error-banner banner-info';
        icon.className       = 'fas fa-plug me-2';
        text.textContent     = 'IO ไม่ได้เชื่อมต่อ — ระบบทำงาน Manual (ไม่มี sensor trigger)';
        banner.style.display = 'flex';
    } else if (s.last_error) {
        banner.className     = 'error-banner banner-warn';
        icon.className       = 'fas fa-exclamation-triangle me-2';
        text.textContent     = s.last_error;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

function detectStateChanges(s) {
    if (!_prev.io_state) return;

    // ALARM toast popup removed per request — แถบ banner สีแดงด้านบนยังบอกสถานะ alarm อยู่
    // OK-completion popup removed per request — ไฟเขียว + panel "ALL FOUND" บอกผลอยู่แล้ว
    if (!s.camera_connected && _prev.camera_connected && s.armed) {
        showModal('กล้องหลุดการเชื่อมต่อ', 'กล้องขาดการเชื่อมต่อขณะระบบทำงานอยู่\nกรุณาตรวจสอบสาย LAN', 'error');
    }
    if (!s.io_connected && _prev.io_connected && s.armed) {
        showModal('IO หลุดการเชื่อมต่อ', 'IO Module ขาดการเชื่อมต่อขณะระบบทำงานอยู่\nระบบจะทำงานแบบ Manual จนกว่า IO จะกลับมา', 'warning');
    }
}

function setSensor(dotId, badgeId, state) {
    const dot   = document.getElementById(dotId);
    const badge = document.getElementById(badgeId);
    dot.className     = `dot ${state ? 'dot-on' : 'dot-off'}`;
    badge.className   = `io-badge ${state ? 'badge-on' : 'badge-off'}`;
    badge.textContent = state ? 'ON' : 'OFF';
}

function syncControls(s) {
    const sel = document.getElementById('productSelect');
    if (s.product && sel.value !== s.product && document.activeElement !== sel) {
        for (const opt of sel.options)
            if (opt.value === s.product) { sel.value = s.product; break; }
    }

    const slider = document.getElementById('confSlider');
    const newVal = Math.round(s.conf_threshold * 100);
    if (document.activeElement !== slider && Math.abs(parseInt(slider.value) - newVal) > 1) {
        slider.value = newVal;
        const confInp = document.getElementById('confInput');
        if (confInp && document.activeElement !== confInp) confInp.value = s.conf_threshold.toFixed(2);
    }

    // Sync exposure controls
    const chkExpAuto = document.getElementById('chkExpAuto');
    if (chkExpAuto && document.activeElement !== chkExpAuto) {
        const expAuto = s.exposure_auto ?? true;
        chkExpAuto.checked = expAuto;
        const expSlider = document.getElementById('expSlider');
        const expRow    = document.getElementById('expTimeRow');
        const expInp  = document.getElementById('expInput');
        const expBtnM = document.getElementById('expMinus');
        const expBtnP = document.getElementById('expPlus');
        if (expSlider) expSlider.disabled = expAuto;
        if (expRow)    expRow.style.opacity = expAuto ? '0.45' : '1';
        if (expInp)  expInp.disabled  = expAuto;
        if (expBtnM) expBtnM.disabled = expAuto;
        if (expBtnP) expBtnP.disabled = expAuto;
        if (expSlider && !expAuto && document.activeElement !== expSlider) {
            const expVal = s.exposure_time ?? 43000;
            expSlider.value = expVal;
            if (expInp && document.activeElement !== expInp) expInp.value = expVal;
        }
    }
    const chkGainAuto = document.getElementById('chkGainAuto');
    if (chkGainAuto && document.activeElement !== chkGainAuto) {
        const gainAuto = s.gain_auto ?? true;
        chkGainAuto.checked = gainAuto;
        const gainSlider = document.getElementById('gainSlider');
        const gainRow    = document.getElementById('gainRow');
        const gainInp  = document.getElementById('gainInput');
        const gainBtnM = document.getElementById('gainMinus');
        const gainBtnP = document.getElementById('gainPlus');
        if (gainSlider) gainSlider.disabled = gainAuto;
        if (gainRow)    gainRow.style.opacity = gainAuto ? '0.45' : '1';
        if (gainInp)  gainInp.disabled  = gainAuto;
        if (gainBtnM) gainBtnM.disabled = gainAuto;
        if (gainBtnP) gainBtnP.disabled = gainAuto;
        if (gainSlider && !gainAuto && document.activeElement !== gainSlider) {
            const gv = Math.round((s.gain_value ?? 1.0) * 10);
            gainSlider.value = gv;
            if (gainInp && document.activeElement !== gainInp) gainInp.value = (gv / 10).toFixed(1);
        }
    }

    // Sync SETTINGS section
    const inpAlarm = document.getElementById('inpAlarmTimeout');
    if (inpAlarm && document.activeElement !== inpAlarm)
        inpAlarm.value = s.alarm_timeout_sec ?? 30;
    const inpOkClear = document.getElementById('inpOkClear');
    if (inpOkClear && document.activeElement !== inpOkClear)
        inpOkClear.value = s.ok_clear_sec ?? 30;

    const ms   = document.getElementById('modelLoadStatus');
    const msel = document.getElementById('modelSelect');
    if (s.model_name) {
        ms.textContent = `✓ ${s.model_name}`;
        ms.className   = 'model-status model-ok mb-1';
        if (document.activeElement !== msel) {
            for (const opt of msel.options)
                if (opt.value === s.model_name) { msel.value = s.model_name; break; }
        }
    } else if (!ms.classList.contains('model-loading')) {
        ms.textContent = '● ยังไม่ได้โหลด';
        ms.className   = 'model-status model-idle mb-1';
    }
}


// ── Production date — ก่อน 08:00 ถือเป็นของเมื่อวาน (กะดึกยังไม่จบ) ───────────
// (เงื่อนไขเดียวกับหน้า scanBarcode)
function _productionDateStr() {
    const now = new Date();
    if (now.getHours() < 8) {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return d.toLocaleDateString('en-CA');
    }
    return now.toLocaleDateString('en-CA');
}

function _addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString('en-CA');
}

let _s1Warned = false;

async function _fetchHistoryByDate(date) {
    // ประวัติดึงจาก SQL Server ผ่าน PHP (same-origin) — ไม่ผ่าน Python/proxy
    // คืน { ok, rows:[{model, timestamp, result, elapsed_s, image}, ...] }
    const url = 'api/inspectionAPI.php?action=get_logs&limit=5000&date='
              + encodeURIComponent(date);
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // เช็คว่า API บน server เป็นตัวใหม่ + อ่านคอลัมน์ S1 ได้ (ดูใน F12 → Console)
    if (json.ok && json.s1 !== true && !_s1Warned) {
        _s1Warned = true;
        console.warn(json.api_ver
            ? '[History] API อ่านคอลัมน์ S1_IN_TIME/S1_OUT_TIME ไม่ได้ (ดู PHP error log)'
            : '[History] api/inspectionAPI.php บน server ยังเป็นเวอร์ชันเก่า — ไม่มีข้อมูล S1');
    }
    return (json.ok && Array.isArray(json.rows)) ? json.rows : [];
}

// ช่วงเวลาแต่ละกะ — ตรงกับ scanManage.php เป๊ะ:
//   กะเช้า  = D 08:00 → D 20:00
//   กะดึก   = D 20:00 → D+1 08:00   (ข้ามเที่ยงคืน)
//   ทุกกะ   = D 08:00 → D+1 08:00
async function pollLogs() {
    const date  = document.getElementById('logDateFilter')?.value || _productionDateStr();
    const shift = document.getElementById('logShiftFilter')?.value || 'all';

    const nextDate   = _addDays(date, 1);
    const rangeStart = (shift === 'night') ? `${date} 20:00:00` : `${date} 08:00:00`;
    const rangeEnd   = (shift === 'day')   ? `${date} 20:00:00` : `${nextDate} 08:00:00`;

    try {
        // ดึง calendar date D เสมอ + D+1 เมื่อช่วงข้ามเที่ยงคืน (กะดึก / ทุกกะ)
        const tasks = [ _fetchHistoryByDate(date) ];
        if (shift !== 'day') tasks.push(_fetchHistoryByDate(nextDate));
        const all = (await Promise.all(tasks)).flat();

        // กรองให้อยู่ในช่วง [rangeStart, rangeEnd) แล้วเรียงใหม่→เก่า
        const rows = all
            .filter(r => r.timestamp && r.timestamp >= rangeStart && r.timestamp < rangeEnd)
            .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

        _chartData = { rows, start: rangeStart, end: rangeEnd, shift, date };
        renderLogs(rows);
        if (_chartModalOpen()) renderCharts();
    } catch (_) {
        document.getElementById('logBody').innerHTML =
            '<tr><td colspan="10" class="empty-state">ไม่สามารถติดต่อ API ได้</td></tr>';
        const summary = document.getElementById('logSummary');
        if (summary) summary.style.display = 'none';
    }
}

let _chartData = null;   // { rows, start, end, shift, date } — ชุดเดียวกับตารางประวัติ

function renderLogs(rows) {
    const tbody   = document.getElementById('logBody');
    const summary = document.getElementById('logSummary');

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">ไม่มีข้อมูล</td></tr>';
        if (summary) summary.style.display = 'none';
        return;
    }

    // ── Pre-compute per-hour OK/ALARM counts ────────────────────────────────
    const hourOK    = {};
    const hourAlarm = {};
    rows.forEach(r => {
        if (!r.timestamp) return;
        const hKey = r.timestamp.slice(0, 13);
        if (r.result === 'ok') hourOK[hKey]    = (hourOK[hKey]    || 0) + 1;
        else                   hourAlarm[hKey] = (hourAlarm[hKey] || 0) + 1;
    });

    // ── Total summary bar ───────────────────────────────────────────────────
    if (summary) {
        const totalOK    = rows.filter(r => r.result === 'ok').length;
        const totalAlarm = rows.length - totalOK;
        document.getElementById('sumTotal').textContent = rows.length;
        document.getElementById('sumOK').textContent    = totalOK;
        document.getElementById('sumAlarm').textContent = totalAlarm;
        summary.style.display = 'flex';
    }

    // ── Render rows with hour dividers (กรองกะแล้วจาก dropdown) ──────────────
    let prevHourKey = null;
    let hourIndex   = -1;

    // ── Diff = เวลาห่างจากชิ้นก่อนหน้า (แถวถัดไป เพราะเรียงใหม่→เก่า)
    //    คิดเฉพาะในชั่วโมงเดียวกัน — ชิ้นแรกของชั่วโมงแสดง '-'
    const _tsSec = ts => Date.parse(ts.replace(' ', 'T')) / 1000;
    const _fmtDiff = sec => {
        if (sec < 60) return `${sec}s`;
        const m = Math.floor(sec / 60), s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    // ── S1 เข้า/ออก = เวลาที่งานมาถึง / พ้น Sensor1 (Python UPDATE หลังงานพ้น S1)
    //    'YYYY-MM-DD HH:MM:SS.mmm' → แสดง HH:MM:SS (ms อยู่ใน tooltip)
    const _fmtClock = v => (v && v.length >= 19)
        ? `<span title="${escHtml(v)}">${v.slice(11, 19)}</span>`
        : '<span class="diff-none">–</span>';
    const _msOf = v => Date.parse(v.replace(' ', 'T'));

    tbody.innerHTML = rows.map((r, i) => {
        const prev = rows[i + 1];
        // Idle = S1 เข้า ของงานชิ้นถัดไป − S1 ออก ของงานชิ้นนี้
        // (list เรียงใหม่→เก่า → ชิ้นถัดไป = rows[i - 1])
        const newer = rows[i - 1];
        // Detect = S1 ออก − S1 เข้า ของชิ้นนี้ (Sensor 1 จับงานอยู่นานเท่าไหร่)
        let busyTxt = '<span class="diff-none">–</span>';
        if (r.s1_in && r.s1_out) {
            const b = (_msOf(r.s1_out) - _msOf(r.s1_in)) / 1000;
            if (isFinite(b) && b >= 0) busyTxt = `${b.toFixed(1)}s`;
        }
        let nextTxt = '<span class="diff-none">–</span>';
        if (r.s1_out && newer && newer.s1_in) {
            const g = _msOf(newer.s1_in) - _msOf(r.s1_out);
            if (isFinite(g) && g >= 0) {
                const sec = g / 1000;
                const txt = `${sec.toFixed(1)}s`;
                // ห่างเกิน 5 นาที = ไลน์หยุด/รอนาน → ไฮไลต์สีส้มแบบเดียวกับ Diff
                nextTxt = `<span class="diff-pill${sec >= 300 ? ' diff-long' : ''}">${txt}</span>`;
            }
        }
        let diffTxt = '<span class="diff-none">–</span>';
        if (r.timestamp && prev && prev.timestamp
            && r.timestamp.slice(0, 13) === prev.timestamp.slice(0, 13)) {
            const d = Math.round(_tsSec(r.timestamp) - _tsSec(prev.timestamp));
            // ห่างเกิน 5 นาที = ไลน์หยุด/รอนาน → ไฮไลต์สีส้ม
            if (d >= 0) diffTxt = `<span class="diff-pill${d >= 300 ? ' diff-long' : ''}">${_fmtDiff(d)}</span>`;
        }
        const badgeCls = r.result === 'ok' ? 'result-ok' : 'result-alarm';
        const text     = r.result === 'ok' ? 'OK' : 'ALARM';
        const ts       = r.timestamp || '';
        const timeFmt  = ts
            ? `<span class="ts-time">${ts.slice(11,19)}</span>`
              + `<span class="ts-date">${ts.slice(8,10)}/${ts.slice(5,7)}/${ts.slice(0,4)}</span>`
            : '-';
        const imgCell  = r.image
            ? `<td class="col-img"><button type="button" class="log-img-link"
                 onclick="showImgModal('${escHtml(r.image)}')" title="ดูรูป">
                 <i class="fas fa-image"></i></button></td>`
            : '<td class="col-img"></td>';

        let hourDiv = '';
        if (ts) {
            const hourKey = ts.slice(0, 13);
            if (hourKey !== prevHourKey) {
                prevHourKey = hourKey;
                hourIndex++;
                const hh     = ts.slice(11, 13);
                const nextHH = String((Number(hh) + 1) % 24).padStart(2, '0');
                const ok     = hourOK[hourKey]    || 0;
                const alarm  = hourAlarm[hourKey] || 0;
                hourDiv = `<tr class="hour-divider">
                    <td colspan="10">
                        <div class="hour-divider-inner">
                            <span>${hh}.00 - ${nextHH}.00</span>
                            <div class="hour-badges">
                                <span class="hour-type-badge ok-badge">OK = ${ok}</span>
                                <span class="hour-type-badge alarm-badge">ALARM = ${alarm}</span>
                            </div>
                        </div>
                    </td>
                </tr>`;
            }
        }

        return hourDiv + `<tr class="hour-band-${hourIndex % 4}">
            <td class="col-ts">${timeFmt}</td>
            <td class="col-diff">${diffTxt}</td>
            <td class="col-model log-model">${escHtml(r.model)}</td>
            <td class="col-result"><span class="result-badge ${badgeCls}">${text}</span></td>
            <td class="col-elapsed">${(parseFloat(r.elapsed_s) || 0).toFixed(2)}s</td>
            <td class="col-cycle">${_fmtClock(r.s1_in)}</td>
            <td class="col-cycle">${_fmtClock(r.s1_out)}</td>
            <td class="col-cycle">${busyTxt}</td>
            <td class="col-cycle">${nextTxt}</td>
            ${imgCell}
        </tr>`;
    }).join('');
}

function showImgModal(imgName) {
    // มาตรฐานกลาง: โหลดจาก ../../uploads/accessories_inspection/ ก่อน
    // Fallback ชั้นที่ 1: โฟลเดอร์เก่า img/ (สำหรับภาพเก่าก่อนย้ายโฟลเดอร์)
    // Fallback ชั้นที่ 2: ดึงผ่าน Python proxy โดยตรง
    const encoded   = encodeURIComponent(imgName);
    const uploadUrl = '../../uploads/accessories_inspection/' + encoded;
    const legacyUrl = 'img/' + encoded;
    const proxied   = _camUrl('/images/' + encoded);
    const img = document.getElementById('imgModalImg');
    img.onerror = function () {
        img.onerror = function () { img.onerror = null; img.src = proxied; };
        img.src = legacyUrl;
    };
    img.src = uploadUrl;
    document.getElementById('imgModalTitle').textContent = imgName;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('imgModal')).show();
}


async function loadModels() {
    try {
        const res  = await fetch(_camUrl('/api/models'), { signal: AbortSignal.timeout(5000) });
        const json = await res.json();
        if (!json.ok) return;
        const sel     = document.getElementById('modelSelect');
        const current = sel.value;
        sel.innerHTML = '<option value="">-- เลือก Model --</option>';
        json.models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = m;
            sel.appendChild(opt);
        });
        if (current) sel.value = current;
    } catch (_) {}
}

async function loadModel() {
    const name = document.getElementById('modelSelect').value;
    if (!name) { showToast('เลือก Model ก่อน', 'var(--bs-warning)'); return; }

    const ms = document.getElementById('modelLoadStatus');
    ms.textContent = `⏳ กำลังโหลด ${name}…`;
    ms.className   = 'model-status model-loading mb-1';

    // show error if Python hasn't confirmed load within 60 s
    const loadTimer = setTimeout(() => {
        if (ms.classList.contains('model-loading')) {
            ms.textContent = `✗ โหลดไม่สำเร็จ (timeout): ${name}`;
            ms.className   = 'model-status model-err mb-1';
        }
    }, 60000);

    try {
        const res  = await fetch(_camUrl('/api/load_model'), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ model: name }),
            signal:  AbortSignal.timeout(5000),
        });
        const json = await res.json();
        if (!json.ok) {
            clearTimeout(loadTimer);
            ms.textContent = '✗ โหลดไม่ได้';
            ms.className   = 'model-status model-err mb-1';
        }
        // ok=true: command queued — pollStatus will update model_name on success
    } catch (_) {
        clearTimeout(loadTimer);
        ms.textContent = '✗ ติดต่อ Python ไม่ได้';
        ms.className   = 'model-status model-err mb-1';
    }
}


async function applySettings() {
    const data = {
        product: document.getElementById('productSelect').value,
        conf:    parseFloat(document.getElementById('confSlider').value) / 100,
    };
    try {
        await fetch(_camUrl('/api/settings'), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data),
            signal:  AbortSignal.timeout(5000),
        });
    } catch (_) {}
}


// ── Slider sync helpers ──────────────────────────────────────────────────────
function onConfSlider(v) {
    const inp = document.getElementById('confInput');
    if (inp) inp.value = (parseInt(v) / 100).toFixed(2);
    applySettings();
}
function onConfInput(v) {
    const val = Math.max(0.05, Math.min(0.95, parseFloat(v) || 0.25));
    document.getElementById('confInput').value = val.toFixed(2);
    document.getElementById('confSlider').value = Math.round(val * 100);
    applySettings();
}
function stepConf(dir) {
    const inp = document.getElementById('confInput');
    onConfInput(parseFloat(inp.value) + dir * 0.01);
}

function onExpSlider(v) {
    const inp = document.getElementById('expInput');
    if (inp) inp.value = v;
}
function onExpInput(v) {
    const val = Math.max(100, Math.min(200000, parseInt(v) || 43000));
    document.getElementById('expInput').value = val;
    document.getElementById('expSlider').value = val;
}
function stepExp(dir) {
    const inp = document.getElementById('expInput');
    onExpInput(parseInt(inp.value) + dir * 1000);
}

function onGainSlider(v) {
    const inp = document.getElementById('gainInput');
    if (inp) inp.value = (parseInt(v) / 10).toFixed(1);
}
function onGainInput(v) {
    const r = Math.round(Math.max(1.0, Math.min(16.0, parseFloat(v) || 1.0)) * 10) / 10;
    document.getElementById('gainInput').value = r.toFixed(1);
    document.getElementById('gainSlider').value = Math.round(r * 10);
}
function stepGain(dir) {
    const inp = document.getElementById('gainInput');
    onGainInput(parseFloat(inp.value) + dir * 0.1);
}

function onExpAutoChange(el) {
    const dis  = el.checked;
    const row  = document.getElementById('expTimeRow');
    const s    = document.getElementById('expSlider');
    const inp  = document.getElementById('expInput');
    const btnM = document.getElementById('expMinus');
    const btnP = document.getElementById('expPlus');
    if (row)  row.style.opacity = dis ? '0.45' : '1';
    if (s)    s.disabled        = dis;
    if (inp)  inp.disabled      = dis;
    if (btnM) btnM.disabled     = dis;
    if (btnP) btnP.disabled     = dis;
}

function onGainAutoChange(el) {
    const dis  = el.checked;
    const row  = document.getElementById('gainRow');
    const s    = document.getElementById('gainSlider');
    const inp  = document.getElementById('gainInput');
    const btnM = document.getElementById('gainMinus');
    const btnP = document.getElementById('gainPlus');
    if (row)  row.style.opacity = dis ? '0.45' : '1';
    if (s)    s.disabled        = dis;
    if (inp)  inp.disabled      = dis;
    if (btnM) btnM.disabled     = dis;
    if (btnP) btnP.disabled     = dis;
}

async function applyExposure() {
    const data = {
        exposure_auto: document.getElementById('chkExpAuto').checked,
        exposure_time: parseInt(document.getElementById('expSlider').value),
        gain_auto:     document.getElementById('chkGainAuto').checked,
        gain_value:    parseInt(document.getElementById('gainSlider').value) / 10,
    };
    try {
        await fetch(_camUrl('/api/settings'), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data),
            signal:  AbortSignal.timeout(5000),
        });
        showToast('ตั้งค่าแสงแล้ว', 'var(--mes-color-success, #198754)');
    } catch (_) {
        showToast('ไม่สามารถตั้งค่าได้', 'var(--bs-danger)');
    }
}


// ── Settings section handlers ─────────────────────────────────────────────────
async function applyRawSettings(data) {
    try {
        await fetch(_camUrl('/api/settings'), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data),
            signal:  AbortSignal.timeout(5000),
        });
    } catch (_) {}
}

function onAlarmTimeoutChanged(v) {
    const val = Math.max(0, Math.min(300, parseInt(v) || 0));
    document.getElementById('inpAlarmTimeout').value = val;
    applyRawSettings({ alarm_timeout_sec: val });
}

function onOkClearChanged(v) {
    const val = Math.max(0, Math.min(300, parseInt(v) || 0));
    document.getElementById('inpOkClear').value = val;
    applyRawSettings({ ok_clear_sec: val });
}


async function cmdStart() {
    const product = document.getElementById('productSelect').value;
    if (!product) {
        showModal('ยังไม่ได้เลือกรุ่นงาน', 'กรุณาเลือกรุ่นงานจาก dropdown ก่อนกด START', 'warning');
        document.getElementById('productSelect').focus();
        return;
    }
    if (!_lastStatus.camera_connected) {
        showModal('กล้องไม่ได้เชื่อมต่อ', 'ไม่สามารถสั่ง START ได้\nกรุณาตรวจสอบสาย LAN และ main.py', 'error');
        return;
    }
    if (!_lastStatus.model_name) {
        showModal('ยังไม่ได้โหลด Model', 'กรุณาเลือก Model จาก dropdown แล้วกด "โหลด Model" ก่อน', 'warning');
        return;
    }

    await applySettings();

    try {
        const res  = await fetch(_camUrl('/api/start'), {
            method: 'POST', signal: AbortSignal.timeout(5000),
        });
        const json = await res.json();
        if (json.ok) {
            showToast('▶ เริ่ม Detection แล้ว', 'var(--mes-color-success, #198754)');
        } else {
            const errMsg = {
                camera_not_connected: { t: 'กล้องไม่ได้เชื่อมต่อ',   m: 'ตรวจสอบสาย LAN และ main.py' },
                model_not_loaded:     { t: 'ยังไม่ได้โหลด Model',    m: 'กรุณาโหลด Model ก่อนกด START' },
                product_not_selected: { t: 'ยังไม่ได้เลือกรุ่นงาน', m: 'กรุณาเลือกรุ่นงานก่อนกด START' },
            }[json.reason] ?? { t: 'ไม่สามารถสั่ง START ได้', m: json.reason ?? '' };
            showModal(errMsg.t, errMsg.m, 'error');
        }
    } catch (_) {
        showModal('ติดต่อกล้องไม่ได้', 'ไม่สามารถเชื่อมต่อ Python กรุณาตรวจสอบว่า main.py รันอยู่', 'error');
    }
}

async function capture() {
    try {
        const res  = await fetch(_camUrl('/api/capture'), {
            method: 'POST', signal: AbortSignal.timeout(5000),
        });
        const json = await res.json();
        if (json.ok) showToast('บันทึกภาพแล้ว', 'var(--mes-color-success, #198754)');
        else         showToast('ไม่สามารถ Capture ได้', 'var(--bs-danger)');
    } catch (_) {
        showToast('ไม่สามารถติดต่อกล้องได้', 'var(--bs-danger)');
    }
}

function reconnectCamera() {
    const img  = document.getElementById('camStream');
    const icon = document.querySelector('.btn-recon i');
    icon?.classList.add('fa-spin');
    setTimeout(() => icon?.classList.remove('fa-spin'), 2000);
    img.src = _camUrl('/stream') + '&t=' + Date.now();
}


// ── Required Classes Checkboxes UI & Sync ────────────────────────────────────
function updateRequiredClassesUI(s) {
    const container = document.getElementById('requiredClassesContainer');
    if (!container) return;

    const modelClasses = s.model_classes || [];
    const required     = s.required_classes || [];
    const classesKey   = JSON.stringify(modelClasses);

    if (modelClasses.length === 0) {
        if (_currentModelClassesStr !== "empty") {
            container.innerHTML = '<span class="small text-secondary">(โหลด Model ก่อน)</span>';
            _currentModelClassesStr = "empty";
        }
        return;
    }

    if (_currentModelClassesStr !== classesKey) {
        _currentModelClassesStr = classesKey;
        container.innerHTML = '';
        modelClasses.forEach(cls => {
            const lbl = document.createElement('label');
            lbl.className = 'req-chk-item d-flex align-items-center gap-1';

            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'form-check-input my-0';
            chk.value = cls;
            chk.checked = required.includes(cls);
            chk.onchange = sendRequiredClassesToServer;

            const span = document.createElement('span');
            span.className = 'text-truncate';
            span.textContent = cls;

            lbl.appendChild(chk);
            lbl.appendChild(span);
            container.appendChild(lbl);
        });
        return;
    }

    const inputs = container.querySelectorAll('input[type="checkbox"]');
    inputs.forEach(chk => {
        if (document.activeElement !== chk) {
            chk.checked = required.includes(chk.value);
        }
    });
}

function webSelectAllClasses() {
    const inputs = document.querySelectorAll('#requiredClassesContainer input[type="checkbox"]');
    inputs.forEach(chk => chk.checked = true);
    sendRequiredClassesToServer();
}

function webSelectNoClasses() {
    const inputs = document.querySelectorAll('#requiredClassesContainer input[type="checkbox"]');
    inputs.forEach(chk => chk.checked = false);
    sendRequiredClassesToServer();
}

async function sendRequiredClassesToServer() {
    const inputs = document.querySelectorAll('#requiredClassesContainer input[type="checkbox"]:checked');
    const selectedClasses = Array.from(inputs).map(chk => chk.value);

    try {
        await fetch(_camUrl('/api/settings'), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ required_classes: selectedClasses }),
            signal:  AbortSignal.timeout(5000),
        });
    } catch (_) {}
}


// default date filter to production date (ก่อน 08:00 = เมื่อวาน) — เหมือน scanBarcode
document.getElementById('logDateFilter').value = _productionDateStr();

// Adaptive polling — fast when active, slow when idle to reduce proxy load
let _pollTimer = null;
function _schedulePoll() {
    clearTimeout(_pollTimer);
    const active = _lastStatus.armed || _lastStatus.io_state === 'alarm';
    _pollTimer = setTimeout(async () => {
        await pollStatus();
        _schedulePoll();
    }, active ? 500 : 2000);
}

pollStatus().then(_schedulePoll);
pollLogs();
loadModels();
// log refresh ทุก 20 วิ (เดิม 5 วิ) — ลดภาระ SQL + การ re-render ตารางทั้งวัน
setInterval(pollLogs, 20000);


// ══════════════════════════════════════════════════════════════════════════════
// กราฟ (เปิดจากปุ่ม "กราฟ" — ใช้ข้อมูลชุดเดียวกับตารางประวัติ, วาดเป็น SVG ล้วน)
// ══════════════════════════════════════════════════════════════════════════════
const _GAP_LIMIT_S = 300;   // เกณฑ์ "Idle" นานผิดปกติ (ตรงกับสีส้มในตาราง)

function _chartModalOpen() {
    return document.getElementById('chartModal')?.classList.contains('show');
}

function openChartModal() {
    const el = document.getElementById('chartModal');
    if (!el) return;
    // วาดหลัง modal แสดงเสร็จ เพื่อให้ได้ความกว้างจริงของกล่อง
    el.addEventListener('shown.bs.modal', renderCharts, { once: true });
    bootstrap.Modal.getOrCreateInstance(el).show();
}

const _cMs  = v => Date.parse(String(v).replace(' ', 'T'));
const _hhmm = ms => { const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const _hhmmss = ms => { const d = new Date(ms);
    return _hhmm(ms) + ':' + String(d.getSeconds()).padStart(2, '0'); };

function _niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
    return 10 * p;
}

function _svgOpen(w, h, label) {
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img"
                 aria-label="${escHtml(label)}" preserveAspectRatio="none">`;
}

function _yGrid(L, R, T, B, H, ymax, ticks, fmt) {
    let g = '';
    for (let i = 0; i <= ticks; i++) {
        const v = ymax * i / ticks;
        const y = H - B - (H - T - B) * i / ticks;
        g += `<line class="c-grid" x1="${L}" x2="${R}" y1="${y}" y2="${y}"/>`
           + `<text class="c-tick" x="${L - 6}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`;
    }
    return g;
}

function _hourTicks(t0, t1, L, R, H, B, xOf) {
    let g = '';
    const span = (t1 - t0) / 3600000;
    const step = span > 13 ? 2 : 1;                 // 24 ชม. → ทุก 2 ชม.
    for (let t = t0, i = 0; t <= t1; t += 3600000, i++) {
        if (i % step) continue;
        const x = xOf(t);
        g += `<line class="c-axis" x1="${x}" x2="${x}" y1="${H - B}" y2="${H - B + 4}"/>`
           + `<text class="c-tick" x="${x}" y="${H - B + 16}" text-anchor="middle">${_hhmm(t)}</text>`;
    }
    return g;
}

function renderCharts() {
    const d = _chartData;
    const ids = ['chartHourly', 'chartGap', 'chartDetect', 'chartTimeline'];
    const lbl = document.getElementById('chartRangeLabel');
    if (!d) {
        ids.forEach(id => document.getElementById(id).innerHTML =
            '<div class="chart-empty">ยังไม่มีข้อมูล</div>');
        return;
    }
    const shiftTxt = { all: 'ทุกกะ', day: 'กะเช้า', night: 'กะดึก' }[d.shift] || '';
    if (lbl) lbl.textContent = `${shiftTxt} · ${d.start.slice(0, 16)} → ${d.end.slice(0, 16)}`;

    const t0 = _cMs(d.start), t1 = _cMs(d.end);
    // เก่า→ใหม่ สำหรับกราฟ
    const rows = d.rows.slice().filter(r => r.timestamp).reverse();

    // Idle ของแต่ละชิ้น (เหมือนคอลัมน์ในตาราง)
    const gaps = [];
    for (let i = 0; i < rows.length - 1; i++) {
        const a = rows[i], b = rows[i + 1];
        if (!a.s1_out || !b.s1_in) continue;
        const g = (_cMs(b.s1_in) - _cMs(a.s1_out)) / 1000;
        if (isFinite(g) && g >= 0) gaps.push({ t: _cMs(a.s1_out), g, model: a.model });
    }

    _renderChartStats(rows, gaps);
    _renderHourly(rows, t0, t1);
    _renderGap(gaps, t0, t1);
    _renderDetect(rows, t0, t1);
    _renderTimeline(rows, t0, t1);
}

function _renderChartStats(rows, gaps) {
    const ok = rows.filter(r => r.result === 'ok').length;
    const alarm = rows.length - ok;
    const sorted = gaps.map(x => x.g).sort((a, b) => a - b);
    const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null;
    const max = sorted.length ? sorted[sorted.length - 1] : null;
    const over = sorted.filter(g => g >= _GAP_LIMIT_S).length;
    // Detect = S1 ออก − S1 เข้า ของแต่ละชิ้น
    const busy = rows.filter(r => r.s1_in && r.s1_out)
        .map(r => (_cMs(r.s1_out) - _cMs(r.s1_in)) / 1000)
        .filter(b => isFinite(b) && b >= 0).sort((a, b) => a - b);
    const bMed = busy.length ? busy[Math.floor(busy.length / 2)] : null;
    const bAvg = busy.length ? busy.reduce((a, b) => a + b, 0) / busy.length : null;
    const bMax = busy.length ? busy[busy.length - 1] : null;
    const f = v => v === null ? '–' : `${v.toFixed(1)}s`;
    const tile = (label, val, cls = '') =>
        `<div class="cs-tile ${cls}"><span class="cs-label">${label}</span><span class="cs-val">${val}</span></div>`;
    document.getElementById('chartStats').innerHTML =
        tile('ทั้งหมด', rows.length)
      + tile('OK', ok, 'cs-ok')
      + tile('ALARM', alarm, 'cs-alarm')
      + tile('Idle เฉลี่ย', f(avg))
      + tile('Idle ค่ากลาง', f(med))
      + tile('Idle สูงสุด', f(max))
      + tile(`เกิน ${_GAP_LIMIT_S}s`, `${over} ครั้ง`, over ? 'cs-warn' : '')
      + tile('Detect เฉลี่ย', f(bAvg))
      + tile('Detect ค่ากลาง', f(bMed))
      + tile('Detect สูงสุด', f(bMax));
}

function _renderHourly(rows, t0, t1) {
    const box = document.getElementById('chartHourly');
    const nH = Math.max(1, Math.round((t1 - t0) / 3600000));
    const ok = new Array(nH).fill(0), al = new Array(nH).fill(0);
    rows.forEach(r => {
        const i = Math.floor((_cMs(r.timestamp) - t0) / 3600000);
        if (i < 0 || i >= nH) return;
        if (r.result === 'ok') ok[i]++; else al[i]++;
    });
    const W = Math.max(box.clientWidth, 320), H = 220, L = 40, R = W - 10, T = 14, B = 26;
    const ymax = _niceMax(Math.max(1, ...ok.map((v, i) => v + al[i])));
    const slot = (R - L) / nH, bw = Math.max(4, Math.min(36, slot * 0.6));
    const yOf = v => H - B - (H - T - B) * v / ymax;
    let g = _svgOpen(W, H, 'จำนวนงาน OK/ALARM รายชั่วโมง')
          + _yGrid(L, R, T, B, H, ymax, 4, v => Math.round(v));
    for (let i = 0; i < nH; i++) {
        const x = L + slot * i + (slot - bw) / 2;
        const hTxt = _hhmm(t0 + i * 3600000) + '–' + _hhmm(t0 + (i + 1) * 3600000);
        const tip = `${hTxt}\nOK ${ok[i]} · ALARM ${al[i]} · รวม ${ok[i] + al[i]}`;
        const yOk = yOf(ok[i]), yTot = yOf(ok[i] + al[i]);
        g += `<g class="c-hit"><title>${tip}</title>`
           + `<rect x="${L + slot * i}" y="${T}" width="${slot}" height="${H - T - B}" fill="transparent"/>`;
        if (ok[i]) g += `<rect class="m-ok" x="${x}" y="${yOk}" width="${bw}" height="${H - B - yOk}" rx="2"/>`;
        if (al[i]) g += `<rect class="m-alarm" x="${x}" y="${yTot}" width="${bw}"
                              height="${Math.max(0, yOk - yTot - (ok[i] ? 2 : 0))}" rx="2"/>`;
        if (ok[i] + al[i]) g += `<text class="c-val" x="${x + bw / 2}" y="${yTot - 4}" text-anchor="middle">${ok[i] + al[i]}</text>`;
        g += `</g>`;
        const lx = L + slot * i + slot / 2;
        if (nH <= 13 || i % 2 === 0)
            g += `<text class="c-tick" x="${lx}" y="${H - B + 16}" text-anchor="middle">${_hhmm(t0 + i * 3600000).slice(0, 2)}</text>`;
    }
    g += `<line class="c-axis" x1="${L}" x2="${R}" y1="${H - B}" y2="${H - B}"/></svg>`;
    box.innerHTML = g;
}

function _renderGap(gaps, t0, t1) {
    const box = document.getElementById('chartGap');
    if (!gaps.length) {
        box.innerHTML = '<div class="chart-empty">ยังไม่มีข้อมูล S1 เข้า/ออก ในช่วงนี้</div>';
        return;
    }
    const W = Math.max(box.clientWidth, 320), H = 220, L = 48, R = W - 10, T = 14, B = 26;
    const ymax = _niceMax(Math.max(_GAP_LIMIT_S * 1.1, ...gaps.map(x => x.g)));
    const xOf = t => L + (R - L) * (t - t0) / (t1 - t0);
    const yOf = v => H - B - (H - T - B) * v / ymax;
    let g = _svgOpen(W, H, 'Idle (วินาที) ตามเวลา')
          + _yGrid(L, R, T, B, H, ymax, 4, v => `${Math.round(v)}s`)
          + _hourTicks(t0, t1, L, R, H, B, xOf);
    const yLim = yOf(_GAP_LIMIT_S);
    g += `<line class="c-limit" x1="${L}" x2="${R}" y1="${yLim}" y2="${yLim}"/>`
       + `<text class="c-tick" x="${R}" y="${yLim - 4}" text-anchor="end">${_GAP_LIMIT_S}s</text>`;
    g += `<polyline class="m-line" points="${gaps.map(p => `${xOf(p.t)},${yOf(p.g)}`).join(' ')}"/>`;
    gaps.forEach(p => {
        const x = xOf(p.t), y = yOf(p.g);
        const over = p.g >= _GAP_LIMIT_S;
        g += `<g class="c-hit"><title>${_hhmmss(p.t)} · ${escHtml(p.model || '')}\nIdle ${p.g.toFixed(1)}s</title>`
           + `<circle cx="${x}" cy="${y}" r="10" fill="transparent"/>`
           + `<circle class="${over ? 'm-dot-warn' : 'm-dot'}" cx="${x}" cy="${y}" r="${over ? 4.5 : 3.5}"/></g>`;
    });
    g += `<line class="c-axis" x1="${L}" x2="${R}" y1="${H - B}" y2="${H - B}"/></svg>`;
    box.innerHTML = g;
}

function _renderDetect(rows, t0, t1) {
    const box = document.getElementById('chartDetect');
    // Detect = S1 ออก − S1 เข้า ของแต่ละชิ้น (จุดวางที่เวลา S1 เข้า)
    const pts = rows.filter(r => r.s1_in && r.s1_out)
        .map(r => ({ t: _cMs(r.s1_in), v: (_cMs(r.s1_out) - _cMs(r.s1_in)) / 1000, r }))
        .filter(p => isFinite(p.t) && isFinite(p.v) && p.v >= 0);
    if (!pts.length) {
        box.innerHTML = '<div class="chart-empty">ยังไม่มีข้อมูล S1 เข้า/ออก ในช่วงนี้</div>';
        return;
    }
    const W = Math.max(box.clientWidth, 320), H = 220, L = 48, R = W - 10, T = 14, B = 26;
    const ymax = _niceMax(Math.max(...pts.map(p => p.v)) * 1.1);
    const xOf = t => L + (R - L) * (t - t0) / (t1 - t0);
    const yOf = v => H - B - (H - T - B) * v / ymax;
    const sorted = pts.map(p => p.v).sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    let g = _svgOpen(W, H, 'Detect (วินาที) ตามเวลา')
          + _yGrid(L, R, T, B, H, ymax, 4, v => `${Math.round(v)}s`)
          + _hourTicks(t0, t1, L, R, H, B, xOf);
    const yMed = yOf(med);
    g += `<line class="c-median" x1="${L}" x2="${R}" y1="${yMed}" y2="${yMed}"/>`
       + `<text class="c-tick" x="${R}" y="${yMed - 4}" text-anchor="end">ค่ากลาง ${med.toFixed(1)}s</text>`;
    g += `<polyline class="m-line" points="${pts.map(p => `${xOf(p.t)},${yOf(p.v)}`).join(' ')}"/>`;
    pts.forEach(p => {
        const x = xOf(p.t), y = yOf(p.v);
        const ok = p.r.result === 'ok';
        g += `<g class="c-hit"><title>${_hhmmss(p.t)} · ${escHtml(p.r.model || '')} · ${ok ? 'OK' : 'ALARM'}\n`
           + `Detect ${p.v.toFixed(1)}s</title>`
           + `<circle cx="${x}" cy="${y}" r="10" fill="transparent"/>`
           + `<circle class="${ok ? 'm-dot-ok' : 'm-dot-alarm'}" cx="${x}" cy="${y}" r="${ok ? 3.5 : 4.5}"/></g>`;
    });
    g += `<line class="c-axis" x1="${L}" x2="${R}" y1="${H - B}" y2="${H - B}"/></svg>`;
    box.innerHTML = g;
}

function _renderTimeline(rows, t0, t1) {
    const box = document.getElementById('chartTimeline');
    const segs = rows.filter(r => r.s1_in && r.s1_out)
        .map(r => ({ a: _cMs(r.s1_in), b: _cMs(r.s1_out), r }))
        .filter(s => isFinite(s.a) && isFinite(s.b) && s.b >= s.a);
    if (!segs.length) {
        box.innerHTML = '<div class="chart-empty">ยังไม่มีข้อมูล S1 เข้า/ออก ในช่วงนี้</div>';
        return;
    }
    const W = Math.max(box.clientWidth, 320), H = 90, L = 10, R = W - 10, T = 10, B = 26;
    const xOf = t => L + (R - L) * (Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0);
    let g = _svgOpen(W, H, 'Timeline ช่วงที่มีงานอยู่ที่ S1')
          + `<rect class="m-idle" x="${L}" y="${T}" width="${R - L}" height="${H - T - B}" rx="3"/>`
          + _hourTicks(t0, t1, L, R, H, B, xOf);
    segs.forEach(s => {
        const x = xOf(s.a), w = Math.max(1.5, xOf(s.b) - x);
        const cls = s.r.result === 'ok' ? 'm-ok' : 'm-alarm';
        g += `<g class="c-hit"><title>${escHtml(s.r.model || '')} · ${s.r.result === 'ok' ? 'OK' : 'ALARM'}\n`
           + `S1 เข้า ${_hhmmss(s.a)} → ออก ${_hhmmss(s.b)} (${((s.b - s.a) / 1000).toFixed(1)}s)</title>`
           + `<rect class="${cls}" x="${x}" y="${T}" width="${w}" height="${H - T - B}"/></g>`;
    });
    g += `</svg>`;
    box.innerHTML = g;
}

// วาดใหม่เมื่อขนาดจอเปลี่ยน (ถ้า modal เปิดอยู่)
window.addEventListener('resize', () => { if (_chartModalOpen()) renderCharts(); });
