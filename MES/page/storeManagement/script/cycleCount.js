let currentSessionId = 0;
let currentLocationId = 0;
let expectedItems = {};
let html5QrcodeScanner = null;
let currentTagNo = '';
let currentCameraDeviceId = null;
let currentSessionDetails = [];
let currentCountedCount = 0;

const scannerModal = new bootstrap.Modal(document.getElementById('scannerModal'));
const inputQtyModal = new bootstrap.Modal(document.getElementById('inputQtyModal'));

function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

function createFormData(action) {
    const fd = new FormData();
    fd.append('action', action);
    const token = getCsrfToken();
    if (token) fd.append('csrf_token', token);
    return fd;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function selectLocationUI(id, name, btnElement) {
    document.getElementById('locationSelect').value = id;
    document.getElementById('locationSelect').dataset.name = name;
    
    // Remove selected class from all buttons
    const btns = document.querySelectorAll('.location-btn');
    btns.forEach(b => b.classList.remove('selected', 'border-primary'));
    
    // Add selected class to clicked button
    btnElement.classList.add('selected', 'border-primary');
    
    // Enable start button
    document.getElementById('btnStartSession').disabled = false;
}

async function startSession() {
    const locInput = document.getElementById('locationSelect');
    if (!locInput.value) {
        Swal.fire('Error', 'กรุณาเลือกคลังสินค้า', 'error');
        return;
    }

    currentLocationId = locInput.value;
    const locName = locInput.dataset.name || currentLocationId;
    
    Swal.fire({ title: 'กำลังเริ่มเซสชั่น...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = createFormData('cc_start_session');
    formData.append('location_id', currentLocationId);

    try {
        const req = await fetch(API_STORE, { method: 'POST', body: formData });
        const res = await req.json();
        
        if (res.success) {
            Swal.close();
            currentSessionId = res.session_id;
            currentSessionDetails = res.details || [];
            
            document.getElementById('currentLocationName').innerText = locName;
            const subtitleEl = document.getElementById('sessionSubtitle');
            if (subtitleEl) subtitleEl.innerText = `โซน ${locName} (${currentSessionDetails.length} รายการ)`;

            document.getElementById('viewSelectLocation').classList.add('d-none');
            document.getElementById('viewCounting').classList.remove('d-none');
            document.getElementById('viewCounting').classList.add('d-flex');
            
            renderLists(res.details);
        } else {
            Swal.fire('Error', res.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    }
}

function maskTag(tag) {
    if(!tag) return '********';
    if (tag.length > 8) {
        return tag.substring(0, 3) + '*'.repeat(tag.length - 7) + tag.substring(tag.length - 4);
    }
    return tag.substring(0, 2) + '****';
}

function resetShelfMonitorUI() {
    const locText = document.getElementById('shelfLocationText');
    if (locText) locText.innerText = 'ยังไม่ได้เลือกคลัง';
    
    const summaryBadge = document.getElementById('shelfSummaryBadge');
    if (summaryBadge) summaryBadge.innerText = '0 พาเลท';
    
    const shelf = document.getElementById('shelfContainer');
    if (shelf) {
        shelf.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted py-5">
                <div class="d-flex align-items-center justify-content-center bg-white rounded-circle shadow-xs border mb-3" style="width: 72px; height: 72px;">
                    <i class="fas fa-boxes-stacked fa-2x text-primary opacity-50"></i>
                </div>
                <h6 class="fw-bold text-dark mb-1">พร้อมแสดงผลแผนผังชั้นวางสต็อก</h6>
                <span class="text-muted small text-center" style="max-width: 340px;">
                    กรุณาเลือกคลังสินค้าจากแถบด้านซ้ายและกด <b class="text-primary">'เริ่มตรวจนับคลังที่เลือก'</b> เพื่อแสดงข้อมูลพาเลทแบบเรียลไทม์
                </span>
            </div>
        `;
    }
}

function renderShelfMonitor(details) {
    const shelf = document.getElementById('shelfContainer');
    if (!shelf) return;

    const locName = document.getElementById('currentLocationName')?.innerText || '-';
    const locText = document.getElementById('shelfLocationText');
    if (locText) locText.innerText = `คลัง ${locName}`;

    const summaryBadge = document.getElementById('shelfSummaryBadge');
    if (summaryBadge) summaryBadge.innerText = `${details ? details.length : 0} พาเลท`;

    if (!details || details.length === 0) {
        shelf.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted py-5">
                <div class="d-flex align-items-center justify-content-center bg-white rounded-circle shadow-xs border mb-3" style="width: 64px; height: 64px;">
                    <i class="fas fa-inbox fa-2x text-secondary opacity-50"></i>
                </div>
                <h6 class="fw-bold text-dark mb-1">ไม่พบรายการสินค้าในคลังนี้</h6>
                <span class="text-muted small">คลังนี้อาจยังไม่มีการลงทะเบียนสต็อก หรือสินค้าถูกย้ายออกหมดแล้ว</span>
            </div>
        `;
        return;
    }

    // Group details by Item No
    const items = {};
    details.forEach(d => {
        const itemNo = d.item_no || 'Unknown';
        if (!items[itemNo]) items[itemNo] = [];
        items[itemNo].push(d);
    });

    let html = '';
    for (const [itemNo, tags] of Object.entries(items)) {
        html += `
            <div class="shelf-item-group">
                <div class="shelf-item-header d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <i class="fas fa-cube text-primary" style="font-size: 0.9rem;"></i>
                        <span class="fw-bold text-dark font-monospace" style="font-size: 0.95rem;">${escapeHTML(itemNo)}</span>
                    </div>
                    <span class="badge rounded-pill bg-light text-muted border px-2.5 py-1 small fw-semibold">
                        ${tags.length} พาเลท
                    </span>
                </div>
                <div class="p-3">
                    <div class="d-flex flex-wrap gap-2.5">
        `;

        tags.forEach(d => {
            let stateClass = 'pending';
            let badgeHtml = '<span class="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-1.5 py-0.5" style="font-size: 0.68rem;"><i class="fas fa-clock me-1"></i>รอนับ</span>';
            let qtyHtml = '<div class="text-muted" style="font-size: 0.72rem;">(Blind Count)</div>';

            if (d.actual_qty !== null) {
                if (d.is_wrong_location == 1) {
                    stateClass = 'wrong-loc';
                    badgeHtml = '<span class="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-1.5 py-0.5" style="font-size: 0.68rem;"><i class="fas fa-exclamation-triangle me-1"></i>หลงคลัง</span>';
                    qtyHtml = `<div class="fw-bold text-danger" style="font-size: 0.78rem;"><span class="text-secondary fw-normal">นับได้:</span> ${d.actual_qty} ชิ้น</div>`;
                } else {
                    stateClass = 'counted';
                    badgeHtml = '<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-1.5 py-0.5" style="font-size: 0.68rem;"><i class="fas fa-check me-1"></i>นับแล้ว</span>';
                    qtyHtml = `<div class="fw-bold text-success" style="font-size: 0.78rem;"><span class="text-secondary fw-normal">นับได้:</span> ${d.actual_qty} ชิ้น</div>`;
                }
            }

            // Mask tag if not counted yet to keep blind count on shelf monitor too
            const displayTag = d.actual_qty === null ? maskTag(d.tag_serial_no) : escapeHTML(d.tag_serial_no);

            html += `
                <div class="shelf-pallet-cell ${stateClass}" title="${escapeHTML(d.tag_serial_no)}">
                    <div class="d-flex align-items-center justify-content-between mb-1">
                        <i class="fas fa-qrcode text-muted" style="font-size: 0.8rem;"></i>
                        ${badgeHtml}
                    </div>
                    <div class="my-1.5">
                        <span class="font-monospace fw-bold text-dark" style="font-size: 0.85rem; letter-spacing: 0.2px;">${displayTag}</span>
                    </div>
                    <div class="mt-auto pt-1 border-top" style="border-color: rgba(0,0,0,0.06) !important;">
                        ${qtyHtml}
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;
    }

    shelf.innerHTML = html;
}

function renderLists(details) {
    const pendingList = document.getElementById('expectedItemsList');
    const countedList = document.getElementById('countedItemsList');
    
    pendingList.innerHTML = '';
    countedList.innerHTML = '';
    
    let pendingCount = 0;
    let countedCount = 0;

    details.forEach(d => {
        if (d.actual_qty === null) {
            pendingCount++;
            pendingList.innerHTML += `
                <div class="part-card pending shadow-xs">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="fw-bold text-dark fs-6">${escapeHTML(d.item_no)}</div>
                        <span class="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1" style="font-size: 0.75rem;">
                            <i class="fas fa-clock me-1"></i>รอนับ
                        </span>
                    </div>
                    <div class="d-flex align-items-center gap-1.5 text-muted small mt-1 font-monospace">
                        <i class="fas fa-qrcode text-secondary"></i>
                        <span>${maskTag(d.tag_serial_no)}</span>
                    </div>
                </div>
            `;
        } else {
            countedCount++;
            const isWrongLoc = d.is_wrong_location == 1;
            
            let cardClass = 'matched';
            let badgeHtml = `
                <span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-1" style="font-size: 0.75rem;">
                    <i class="fas fa-check me-1"></i>นับแล้ว
                </span>`;
            
            if (isWrongLoc) {
                cardClass = 'wrong-loc';
                badgeHtml = `
                    <span class="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1" style="font-size: 0.75rem;">
                        <i class="fas fa-exclamation-triangle me-1"></i>หลงคลัง
                    </span>`;
            }
            
            countedList.innerHTML += `
                <div class="part-card ${cardClass} shadow-xs">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="fw-bold text-dark fs-6">${escapeHTML(d.item_no || '-')}</div>
                        ${badgeHtml}
                    </div>
                    <div class="d-flex align-items-center gap-1.5 text-muted small mt-1 font-monospace">
                        <i class="fas fa-qrcode text-secondary"></i>
                        <span>${escapeHTML(d.tag_serial_no)}</span>
                    </div>
                    <div class="fw-bold text-success small mt-2 pt-1 border-top d-flex justify-content-between align-items-center">
                        <span class="text-secondary fw-normal">ยอดนับได้:</span>
                        <span class="fs-6">${d.actual_qty} ชิ้น</span>
                    </div>
                </div>
            `;
        }
    });

    if (pendingCount === 0) pendingList.innerHTML = '<div class="text-center text-muted p-4"><i class="fas fa-check-circle text-success fs-3 mb-2 d-block"></i>ไม่มีรายการค้างนับ ตรวจครบแล้ว</div>';
    if (countedCount === 0) countedList.innerHTML = '<div class="text-center text-muted p-4"><i class="fas fa-clipboard-list text-secondary opacity-50 fs-3 mb-2 d-block"></i>ยังไม่มีรายการที่ตรวจนับ</div>';

    document.getElementById('badgePending').innerText = pendingCount;
    document.getElementById('badgeCounted').innerText = countedCount;
    currentCountedCount = countedCount;
    currentSessionDetails = details;
    
    // Update Shelf Monitor
    renderShelfMonitor(details);
}

function openScanner() {
    scannerModal.show();
    setTimeout(() => {
        if (!html5QrcodeScanner) {
            html5QrcodeScanner = new Html5Qrcode("reader");
        }
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
        
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                let cameraId = devices[devices.length - 1].id; // Default to back camera
                currentCameraDeviceId = cameraId;
                html5QrcodeScanner.start(cameraId, config, onScanSuccess, onScanFailure)
                    .catch(err => console.error(err));
            }
        }).catch(err => {
            console.error(err);
            Swal.fire('Error', 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง', 'error');
        });
    }, 500);
}

function toggleCamera() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            Html5Qrcode.getCameras().then(devices => {
                if (devices && devices.length > 1) {
                    currentCameraDeviceId = devices.find(d => d.id !== currentCameraDeviceId)?.id || devices[0].id;
                    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
                    html5QrcodeScanner.start(currentCameraDeviceId, config, onScanSuccess, onScanFailure);
                }
            });
        });
    }
}

function openInputModalForTag(tag) {
    currentTagNo = tag.trim();
    document.getElementById('inputTagNo').innerText = currentTagNo;
    document.getElementById('inputActualQty').value = '';
    document.getElementById('inputReason').value = '';
    document.getElementById('inputReasonContainer').classList.add('d-none');
    document.getElementById('wrongLocationWarning').classList.add('d-none');
    
    inputQtyModal.show();
    setTimeout(() => document.getElementById('inputActualQty').focus(), 500);
}

// Audio & Vibration Feedback (Web Audio API)
let isContinuousScanEnabled = false; // Default OFF for safety (force 100% manual piece count)
let isAudioMuted = false;
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSuccessBeep() {
    if (isAudioMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1760, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    } catch (e) {
        console.warn('Audio feedback error:', e);
    }
}

function playErrorAlarm() {
    if (isAudioMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {
        console.warn('Audio feedback error:', e);
    }
}

function vibrateDevice(pattern) {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {}
    }
}

function toggleContinuousScan(enabled) {
    isContinuousScanEnabled = !!enabled;
    const indicator = document.getElementById('scannerStatusIndicator');
    if (indicator) {
        if (isContinuousScanEnabled) {
            indicator.className = 'badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1 small fw-medium';
            indicator.innerHTML = '<i class="fas fa-bolt me-1 text-warning"></i> โหมดต่อเนื่อง';
            playSuccessBeep();
        } else {
            indicator.className = 'badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-2.5 py-1 small fw-medium';
            indicator.innerHTML = '<i class="fas fa-hand-paper me-1 text-primary"></i> นับจริง 100%';
        }
    }
}

function toggleAudioMute() {
    isAudioMuted = !isAudioMuted;
    const icon = document.getElementById('iconSoundStatus');
    if (icon) {
        if (isAudioMuted) {
            icon.className = 'fas fa-volume-mute text-secondary';
        } else {
            icon.className = 'fas fa-volume-up text-primary';
            playSuccessBeep();
        }
    }
}

function showScanningToast(tag) {
    const indicator = document.getElementById('scannerStatusIndicator');
    if (indicator) {
        const oldHtml = indicator.innerHTML;
        const oldClass = indicator.className;
        indicator.innerHTML = `<i class="fas fa-spinner fa-spin text-primary me-1"></i> ตรวจ: ${escapeHTML(tag)}`;
        setTimeout(() => {
            if (indicator.innerHTML.includes(tag)) {
                indicator.innerHTML = oldHtml;
                indicator.className = oldClass;
            }
        }, 1200);
    }
}

async function handleScannedTag(tagCode) {
    if (!tagCode) return;
    const cleanTag = tagCode.trim();
    if (!cleanTag) return;

    // If Continuous Scan is OFF, prompt manual input modal
    if (!isContinuousScanEnabled) {
        openInputModalForTag(cleanTag);
        return;
    }

    // Continuous Scan: Attempt instant auto-confirmation
    showScanningToast(cleanTag);

    const formData = createFormData('cc_scan_tag');
    formData.append('session_id', currentSessionId);
    formData.append('tag_no', cleanTag);
    formData.append('auto_confirm', '1');

    try {
        const req = await fetch(API_STORE, { method: 'POST', body: formData });
        const res = await req.json();

        if (res.success && res.auto_confirmed) {
            // Normal matching item in session
            playSuccessBeep();
            vibrateDevice(80);
            
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `นับแล้ว: ${escapeHTML(cleanTag)}`,
                text: `ยอดตรงตามระบบ (${res.actual_qty})`,
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });

            refreshSessionDetails();
        } else {
            // Auto-pause continuous mode: Tag is either wrong location or requires manual reason/qty
            playErrorAlarm();
            vibrateDevice([200, 100, 200]);

            // Open modal to force manual verification
            openInputModalForTag(cleanTag);

            if (res.is_wrong_location) {
                document.getElementById('wrongLocationWarning').classList.remove('d-none');
                document.getElementById('inputReasonContainer').classList.remove('d-none');
                document.getElementById('inputReason').value = 'ของหลงคลัง';
            }

            Swal.fire({
                title: 'ต้องตรวจสอบ!',
                text: res.message || 'พบรายการผิดปกติ หรือของหลงคลัง กรุณาระบุยอดและสาเหตุ',
                icon: 'warning',
                confirmButtonText: 'รับทราบ'
            });
        }
    } catch (e) {
        playErrorAlarm();
        vibrateDevice([200, 100, 200]);
        openInputModalForTag(cleanTag);
        Swal.fire('Error', e.message || 'ไม่สามารถบันทึกยอดได้', 'error');
    }
}

function handleManualTag() {
    const input = document.getElementById('manualTagInput');
    const finalCode = input.value.trim();
    if (finalCode) {
        input.value = '';
        handleScannedTag(finalCode);
    }
}

function onScanSuccess(decodedText, decodedResult) {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop();
    }
    scannerModal.hide();
    
    // Cleanup QR string (MES specific logic, sometimes wrapped in specific formats)
    let finalCode = decodedText.trim();
    handleScannedTag(finalCode);
}

// Hardware Barcode Gun Keystroke Listener (chars < 50ms interval)
let barcodeBuffer = '';
let lastKeypressTimestamp = 0;
const BARCODE_BURST_MAX_GAP_MS = 50;

document.addEventListener('keydown', function (e) {
    if (!currentSessionId) return;
    const viewCounting = document.getElementById('viewCounting');
    if (!viewCounting || viewCounting.classList.contains('d-none')) return;

    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
    }

    const now = Date.now();
    const timeDiff = now - lastKeypressTimestamp;
    lastKeypressTimestamp = now;

    if (timeDiff > BARCODE_BURST_MAX_GAP_MS && barcodeBuffer.length > 0) {
        barcodeBuffer = '';
    }

    const activeEl = document.activeElement;

    if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
            e.preventDefault();
            const scannedCode = barcodeBuffer.trim();
            barcodeBuffer = '';
            
            if (activeEl && activeEl.id === 'manualTagInput') {
                activeEl.value = '';
            }
            
            handleScannedTag(scannedCode);
            return;
        }
        barcodeBuffer = '';
        return;
    }

    if (e.key.length === 1) {
        barcodeBuffer += e.key;
    }
});

function onScanFailure(error) {
    // ignore
}

function cancelInputQty() {
    inputQtyModal.hide();
}

async function submitActualQty() {
    const actualQty = document.getElementById('inputActualQty').value;
    const reason = document.getElementById('inputReason').value;

    if (actualQty === '' || parseFloat(actualQty) < 0) {
        Swal.fire('Warning', 'กรุณาระบุยอดที่นับได้อย่างถูกต้อง', 'warning');
        return;
    }

    // Attempt to submit
    const formData = createFormData('cc_scan_tag');
    formData.append('session_id', currentSessionId);
    formData.append('tag_no', currentTagNo);
    formData.append('actual_qty', actualQty);
    formData.append('remark', reason);

    const btn = document.getElementById('btnConfirmQty');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const req = await fetch(API_STORE, { method: 'POST', body: formData });
        const res = await req.json();
        
        if (res.success) {
            // Check variance logic
            if (res.variance !== 0 && reason === '') {
                // Force user to enter reason
                document.getElementById('inputReasonContainer').classList.remove('d-none');
                
                if (res.is_wrong_location) {
                    document.getElementById('wrongLocationWarning').classList.remove('d-none');
                }
                
                Swal.fire('ยอดไม่ตรง!', 'ยอดที่คุณนับไม่ตรงกับในระบบ กรุณาระบุสาเหตุ', 'warning');
            } else {
                // Success
                inputQtyModal.hide();
                Swal.fire({
                    title: 'บันทึกสำเร็จ',
                    icon: 'success',
                    timer: 1000,
                    showConfirmButton: false
                });
                refreshSessionDetails();
            }
        } else {
            Swal.fire('Error', res.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

async function refreshSessionDetails() {
    const formData = createFormData('cc_start_session');
    formData.append('location_id', currentLocationId);

    try {
        const req = await fetch(API_STORE, { method: 'POST', body: formData });
        const res = await req.json();
        if (res.success) {
            renderLists(res.details);
        }
    } catch (e) {}
}

async function finishSession() {
    const pendingCount = parseInt(document.getElementById('badgePending').innerText);
    
    if (pendingCount > 0) {
        const confirm = await Swal.fire({
            title: 'มีของที่ยังไม่ได้สแกน!',
            html: `ระบบพบว่ามีพาเลท <b>${pendingCount} รายการ</b> ที่คุณยังไม่ได้สแกน<br>ต้องการให้ระบบปรับยอดรายการเหล่านั้นเป็น <b>0 (สูญหาย)</b> หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ใช่, ปรับเป็น 0 และจบงาน',
            cancelButtonText: 'กลับไปหาต่อ'
        });

        if (!confirm.isConfirmed) return;
    } else {
        const confirm = await Swal.fire({
            title: 'ยืนยันจบการตรวจนับ?',
            text: 'ส่งสรุปผลการตรวจนับของคลังสินค้านี้ให้หัวหน้าอนุมัติ',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });
        
        if (!confirm.isConfirmed) return;
    }

    Swal.fire({ title: 'กำลังประมวลผล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = createFormData('cc_finish_session');
    formData.append('session_id', currentSessionId);
    // You could prompt for a generic missing reason here if needed, but default is fine.

    try {
        const req = await fetch(API_STORE, { method: 'POST', body: formData });
        const res = await req.json();
        
        if (res.success) {
            await Swal.fire('เสร็จสิ้น!', 'ส่งสรุปผลให้หัวหน้าตรวจสอบเรียบร้อย', 'success');
            window.location.reload();
        } else {
            Swal.fire('Error', res.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    }
}

// Cleanup scanner on modal close
document.getElementById('scannerModal').addEventListener('hidden.bs.modal', function () {
    if (html5QrcodeScanner) {
        try { html5QrcodeScanner.stop(); } catch(e) {}
    }
});

// ==========================================
// ZONE MANAGEMENT
// ==========================================
let zoneModalInstance = null;
let allZoneLocations = [];
let availableZones = [];

function openZoneSettingsModal() {
    const modalEl = document.getElementById('zoneSettingsModal');
    if (!modalEl) return;
    if (!zoneModalInstance) {
        zoneModalInstance = new bootstrap.Modal(modalEl);
    }
    zoneModalInstance.show();
    loadZoneSettingsData();
}

async function loadZoneSettingsData() {
    const tbody = document.getElementById('zoneTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin fa-2x mb-2 text-primary"></i><div class="small fw-semibold">กำลังโหลดข้อมูลโซน...</div></td></tr>';

    try {
        const req = await fetch(`${API_STORE}?action=get_location_zones`);
        const res = await req.json();
        if (res.success) {
            allZoneLocations = res.locations || [];
            availableZones = res.zones || [];
            
            // Populate zone filter & datalist
            const filterSel = document.getElementById('zoneFilterSelect');
            if (filterSel) {
                filterSel.innerHTML = '<option value="">-- กรองตามโซนทั้งหมด --</option>';
                availableZones.forEach(z => {
                    filterSel.innerHTML += `<option value="${escapeHTML(z)}">${escapeHTML(z)}</option>`;
                });
            }

            const dataList = document.getElementById('zoneListDatalist');
            if (dataList) {
                dataList.innerHTML = '';
                availableZones.forEach(z => {
                    dataList.innerHTML += `<option value="${escapeHTML(z)}">`;
                });
            }

            renderZoneSettingsTable(allZoneLocations);
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">${escapeHTML(res.message || 'ไม่สามารถโหลดข้อมูลโซนได้')}</td></tr>`;
        }
    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">${escapeHTML(e.message)}</td></tr>`;
    }
}

function renderZoneSettingsTable(list) {
    const tbody = document.getElementById('zoneTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-5"><i class="fas fa-inbox fa-2x mb-2 d-block text-secondary opacity-50"></i>ไม่พบข้อมูลคลังสินค้าตามเงื่อนไข</td></tr>';
        updateSelectedZoneBadge();
        return;
    }

    let html = '';
    list.forEach(loc => {
        html += `
            <tr data-loc-id="${loc.location_id}">
                <td style="width: 44px;">
                    <input class="form-check-input zone-loc-check custom-zone-chk m-0" type="checkbox" value="${loc.location_id}" onchange="updateSelectedZoneBadge()">
                </td>
                <td class="text-start">
                    <span class="fw-bold text-dark font-monospace" style="font-size: 0.92rem; letter-spacing: 0.3px;">${escapeHTML(loc.location_name)}</span>
                </td>
                <td class="text-start">
                    <input list="zoneListDatalist" class="form-control form-control-sm loc-zone-input w-100" 
                           data-loc-id="${loc.location_id}" 
                           value="${escapeHTML(loc.zone_name)}" 
                           placeholder="ระบุโซน..."
                           onchange="onIndividualZoneChange(${loc.location_id}, this.value)">
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    updateSelectedZoneBadge();
}

function filterZoneSettings() {
    const search = document.getElementById('zoneSearchInput')?.value.trim().toLowerCase() || '';
    const zoneFilter = document.getElementById('zoneFilterSelect')?.value || '';

    const filtered = allZoneLocations.filter(loc => {
        const matchName = loc.location_name.toLowerCase().includes(search);
        const matchZone = !zoneFilter || loc.zone_name === zoneFilter;
        return matchName && matchZone;
    });

    renderZoneSettingsTable(filtered);
}

function toggleSelectAllZones(checked) {
    const checks = document.querySelectorAll('.zone-loc-check');
    checks.forEach(c => c.checked = checked);
    updateSelectedZoneBadge();
}

function updateSelectedZoneBadge() {
    const allChecks = document.querySelectorAll('.zone-loc-check');
    const selected = document.querySelectorAll('.zone-loc-check:checked');
    const badge = document.getElementById('badgeSelectedZoneCount');
    if (badge) badge.innerText = `เลือก ${selected.length} รายการ`;

    const selectAll = document.getElementById('chkSelectAllZones');
    if (selectAll) {
        selectAll.checked = allChecks.length > 0 && selected.length === allChecks.length;
        selectAll.indeterminate = selected.length > 0 && selected.length < allChecks.length;
    }
}

function onIndividualZoneChange(locId, newZone) {
    const found = allZoneLocations.find(l => l.location_id == locId);
    if (found) {
        found.zone_name = newZone.trim();
    }
}

function applyBatchZone() {
    const newZone = document.getElementById('batchZoneInput')?.value.trim();
    if (!newZone) {
        Swal.fire('คำเตือน', 'กรุณาระบุชื่อโซนที่ต้องการปรับใช้', 'warning');
        return;
    }

    const selectedChecks = document.querySelectorAll('.zone-loc-check:checked');
    if (selectedChecks.length === 0) {
        Swal.fire('คำเตือน', 'กรุณาเลือกคลังสินค้าที่ต้องการเปลี่ยนโซนอย่างน้อย 1 รายการ', 'warning');
        return;
    }

    selectedChecks.forEach(chk => {
        const locId = chk.value;
        const input = document.querySelector(`.loc-zone-input[data-loc-id="${locId}"]`);
        if (input) input.value = newZone;
        onIndividualZoneChange(locId, newZone);
    });

    Swal.fire({
        icon: 'success',
        title: `ปรับใช้โซน "${newZone}" ให้ ${selectedChecks.length} รายการแล้ว`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
    });
}

async function saveZoneSettings() {
    const btn = document.getElementById('btnSaveZones');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> กำลังบันทึก...';
        btn.disabled = true;
    }

    const mappings = allZoneLocations.map(loc => ({
        location_id: loc.location_id,
        zone_name: loc.zone_name
    }));

    const fd = createFormData('update_location_zones');
    fd.append('mappings', JSON.stringify(mappings));

    try {
        const req = await fetch(API_STORE, { method: 'POST', body: fd });
        const res = await req.json();

        if (res.success) {
            await Swal.fire('สำเร็จ', 'บันทึกการจัดโซนเรียบร้อยแล้ว', 'success');
            if (zoneModalInstance) zoneModalInstance.hide();
            window.location.reload();
        } else {
            Swal.fire('ข้อผิดพลาด', res.message || 'บันทึกไม่สำเร็จ', 'error');
        }
    } catch (e) {
        Swal.fire('ข้อผิดพลาด', e.message, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    }
}

async function backToLocationSelect() {
    const viewCounting = document.getElementById('viewCounting');
    const viewSelect = document.getElementById('viewSelectLocation');

    // Case 1: If user hasn't counted anything yet (0 items counted)
    if (currentCountedCount === 0) {
        // Clean up empty session in the backend so it doesn't stay IN_PROGRESS
        if (currentSessionId) {
            try {
                const formData = createFormData('cc_cancel_empty_session');
                formData.append('session_id', currentSessionId);
                fetch(API_STORE, { method: 'POST', body: formData }).catch(e => console.warn(e));
            } catch (e) {
                console.warn(e);
            }
        }

        // Reset visual map button for this location back to unstarted / normal
        if (currentLocationId) {
            const btn = document.querySelector(`.location-btn[onclick*="selectLocationUI(${currentLocationId},"]`);
            if (btn && !btn.classList.contains('btn-loc-completed') && !btn.classList.contains('btn-success')) {
                btn.className = 'location-btn btn-loc-pending w-100 position-relative';
                btn.style.backgroundImage = '';
                const spinner = btn.querySelector('.fa-spinner');
                if (spinner) spinner.remove();
            }
        }

        // Reset selection in UI
        const locSelect = document.getElementById('locationSelect');
        if (locSelect) locSelect.value = '';
        const startBtn = document.getElementById('btnStartSession');
        if (startBtn) startBtn.disabled = true;

        // Clean up state
        currentSessionId = 0;
        currentLocationId = 0;
        currentSessionDetails = [];
        currentCountedCount = 0;

        resetShelfMonitorUI();

        if (viewCounting) {
            viewCounting.classList.add('d-none');
            viewCounting.classList.remove('d-flex');
        }
        if (viewSelect) {
            viewSelect.classList.remove('d-none');
        }
        return;
    }

    // Case 2: User has counted some items (> 0 items)
    const result = await Swal.fire({
        title: 'ออกจากหน้าตรวจนับ?',
        html: `คุณได้ทำการตรวจนับไปแล้ว <b>${currentCountedCount} รายการ</b><br><span class="text-muted small">ต้องการบันทึกสถานะ 'กำลังเช็ค (In Progress)' ไว้ก่อนเพื่อกลับมานับต่อภายหลังใช่หรือไม่?</span>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ใช่, บันทึกและออก',
        cancelButtonText: 'นับต่อ'
    });

    if (!result.isConfirmed) return;

    // User confirmed to leave in-progress
    if (currentLocationId) {
        const btn = document.querySelector(`.location-btn[onclick*="selectLocationUI(${currentLocationId},"]`);
        if (btn && !btn.classList.contains('btn-loc-completed') && !btn.classList.contains('btn-success')) {
            btn.className = 'location-btn btn-loc-progress w-100 position-relative';
            btn.style.backgroundImage = '';
            if (!btn.querySelector('.fa-spinner')) {
                btn.insertAdjacentHTML('afterbegin', '<i class="fas fa-spinner fa-spin position-absolute top-0 end-0 m-1.5" style="font-size: 10px;"></i>');
            }
        }
    }

    // Reset selection in UI
    const locSelect = document.getElementById('locationSelect');
    if (locSelect) locSelect.value = '';
    const startBtn = document.getElementById('btnStartSession');
    if (startBtn) startBtn.disabled = true;

    // Clean up state
    currentSessionId = 0;
    currentLocationId = 0;
    currentSessionDetails = [];
    currentCountedCount = 0;

    resetShelfMonitorUI();

    if (viewCounting) {
        viewCounting.classList.add('d-none');
        viewCounting.classList.remove('d-flex');
    }
    if (viewSelect) {
        viewSelect.classList.remove('d-none');
    }
}

// Initialize Bootstrap Tooltips
document.addEventListener('DOMContentLoaded', function () {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].forEach(el => {
        try {
            new bootstrap.Tooltip(el);
        } catch(e) {}
    });
});

