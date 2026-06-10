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

    const btnStart = document.getElementById('btnStart');
    const btnStop  = document.getElementById('btnStop');
    if (btnStart && btnStop) {
        btnStart.disabled      = s.armed;
        btnStop.disabled       = !s.armed;
        btnStart.style.opacity = s.armed  ? '0.45' : '1';
        btnStop.style.opacity  = !s.armed ? '0.45' : '1';
    }

    document.getElementById('camOffline').style.display =
        s.camera_connected ? 'none' : 'flex';

    {
        const lb = document.getElementById('labelsBadge');
        if (_required.length === 0) {
            lb.textContent = '';
        } else if (s.all_found) {
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
        const det = document.getElementById('detectedStatus');
        if (_required.length === 0) {
            det.textContent = 'Detection: ' + (s.detection_enabled ? 'ON' : 'OFF');
            det.className   = 'small text-secondary mb-1';
            det.style.color = '';
        } else {
            det.innerHTML = _required.map(c =>
                _effConf.has(c)
                    ? `<div class="cls-item cls-ok">✓ ${escHtml(c)}</div>`
                    : _labels.includes(c)
                        ? `<div class="cls-item cls-detecting">● ${escHtml(c)}</div>`
                        : `<div class="cls-item cls-missing">○ ${escHtml(c)}</div>`
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

    if (s.io_state === 'alarm' && _prev.io_state !== 'alarm') {
        showToast('⚠ ALARM — ชิ้นงานหลุดออกก่อนตรวจจับสำเร็จ', 'var(--bs-danger)');
    }
    if (s.io_state === 'idle' && _prev.io_state === 'detecting' && s.armed) {
        showToast('✓ ตรวจจับสำเร็จ', 'var(--mes-color-success, #198754)');
    }
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
        document.getElementById('confVal').textContent = s.conf_threshold.toFixed(2);
    }

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


async function pollLogs() {
    const date   = document.getElementById('logDateFilter')?.value ?? '';
    const params = { limit: 50 };
    if (date) params.date = date;

    try {
        const result = await sendRequest('api/inspectionAPI.php', 'get_logs', 'GET', null, params);
        if (result.success && Array.isArray(result.data)) {
            renderLogs(result.data);
        } else {
            document.getElementById('logBody').innerHTML =
                `<tr><td colspan="4" class="text-center text-danger py-2">
                    โหลด log ไม่สำเร็จ: ${escHtml(result?.message ?? 'unknown error')}
                </td></tr>`;
        }
    } catch (_) {
        document.getElementById('logBody').innerHTML =
            '<tr><td colspan="4" class="text-center text-danger py-2">ไม่สามารถติดต่อ API ได้</td></tr>';
    }
}

function clearDateFilter() {
    const date   = document.getElementById('logDateFilter').value;
    const params = { limit: 9999 };
    if (date) params.date = date;
    sendRequest('api/inspectionAPI.php', 'get_logs', 'GET', null, params)
        .then(result => {
            if (result.success && Array.isArray(result.data)) renderLogs(result.data);
        });
}

function renderLogs(rows) {
    const tbody = document.getElementById('logBody');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-2">ไม่มีข้อมูล</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(r => {
        const badgeCls = r.RESULT === 'ok' ? 'result-ok' : 'result-alarm';
        const text     = r.RESULT === 'ok' ? 'OK' : 'ALARM';
        return `<tr>
            <td>${escHtml(r.TIMESTAMP)}</td>
            <td class="log-model">${escHtml(r.MODEL)}</td>
            <td><span class="result-badge ${badgeCls}">${text}</span></td>
            <td>${(parseFloat(r.ELAPSED_S) || 0).toFixed(2)}s</td>
        </tr>`;
    }).join('');
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

async function cmdStop() {
    try {
        const res  = await fetch(_camUrl('/api/stop'), {
            method: 'POST', signal: AbortSignal.timeout(5000),
        });
        const json = await res.json();
        if (json.ok) showToast('Detection หยุดทำงานแล้ว', 'var(--mes-color-warning, #ffc107)');
        else         showToast('ไม่สามารถสั่ง STOP ได้', 'var(--bs-danger)');
    } catch (_) {
        showToast('ไม่สามารถติดต่อกล้องได้', 'var(--bs-danger)');
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


// default date filter to today — en-CA locale produces YYYY-MM-DD format
document.getElementById('logDateFilter').value =
    new Date().toLocaleDateString('en-CA');

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
setInterval(pollLogs, 5000);
