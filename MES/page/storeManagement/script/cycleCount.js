let currentSessionId = 0;
let currentLocationId = 0;
let expectedItems = {};
let html5QrcodeScanner = null;
let currentTagNo = '';
let currentCameraDeviceId = null;

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
            
            document.getElementById('currentLocationName').innerText = locName;
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

function renderShelfMonitor(details) {
    const shelf = document.getElementById('shelfContainer');
    if (!shelf) return;
    
    // Group details by Item No
    const items = {};
    details.forEach(d => {
        const itemNo = d.item_no || 'Unknown';
        if (!items[itemNo]) items[itemNo] = [];
        items[itemNo].push(d);
    });

    let html = '<div class="row g-3">';
    for (const [itemNo, tags] of Object.entries(items)) {
        html += `<div class="col-12"><h6 class="fw-bold text-dark border-bottom pb-2 mb-3"><i class="fas fa-box text-secondary me-2"></i> Item: ${itemNo} (${tags.length} Tags)</h6><div class="d-flex flex-wrap gap-2 mb-4">`;
        
        tags.forEach(d => {
            let colorClass = 'bg-secondary bg-opacity-25 text-secondary'; // Pending
            let icon = 'fa-clock';
            let title = 'รอนับ';
            
            if (d.actual_qty !== null) {
                if (d.is_wrong_location == 1) {
                    colorClass = 'bg-warning text-dark border-warning';
                    icon = 'fa-exclamation-triangle';
                    title = 'หลงคลัง';
                } else {
                    colorClass = 'bg-success text-white border-success';
                    icon = 'fa-check';
                    title = 'นับแล้ว';
                }
            }
            
            // Mask tag if not counted yet to keep blind count on shelf monitor too
            const displayTag = d.actual_qty === null ? maskTag(d.tag_serial_no) : escapeHTML(d.tag_serial_no);

            html += `
                <div class="p-2 rounded border ${colorClass} text-center shadow-sm" style="width: 140px; font-size: 0.85rem;" title="${title}">
                    <i class="fas ${icon} mb-2 fs-4"></i><br>
                    <span class="fw-bold">${displayTag}</span>
                </div>
            `;
        });
        html += `</div></div>`;
    }
    html += '</div>';
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
                <div class="part-card pending shadow-sm">
                    <div class="d-flex justify-content-between">
                        <div class="fw-bold">${escapeHTML(d.item_no)}</div>
                        <div class="badge bg-warning text-dark"><i class="fas fa-clock"></i> รอนับ</div>
                    </div>
                    <div class="small text-muted mt-1"><i class="fas fa-qrcode"></i> ${maskTag(d.tag_serial_no)}</div>
                </div>
            `;
        } else {
            countedCount++;
            const isWrongLoc = d.is_wrong_location == 1;
            
            let cardClass = 'matched';
            let badgeHtml = '<div class="badge bg-success"><i class="fas fa-check"></i> นับแล้ว</div>';
            
            if (isWrongLoc) {
                cardClass = 'wrong-loc';
                badgeHtml = '<div class="badge bg-warning text-dark"><i class="fas fa-exclamation-triangle"></i> หลงคลัง</div>';
            }
            
            countedList.innerHTML += `
                <div class="part-card ${cardClass} shadow-sm">
                    <div class="d-flex justify-content-between">
                        <div class="fw-bold">${escapeHTML(d.item_no || '-')}</div>
                        ${badgeHtml}
                    </div>
                    <div class="small text-muted mt-1"><i class="fas fa-qrcode"></i> ${escapeHTML(d.tag_serial_no)}</div>
                    <div class="fw-bold text-primary mt-1">ยอดนับได้: ${d.actual_qty}</div>
                </div>
            `;
        }
    });

    if (pendingCount === 0) pendingList.innerHTML = '<div class="text-center text-muted p-3">ไม่มีรายการค้างนับ</div>';
    if (countedCount === 0) countedList.innerHTML = '<div class="text-center text-muted p-3">ยังไม่มีรายการที่นับแล้ว</div>';

    document.getElementById('badgePending').innerText = pendingCount;
    document.getElementById('badgeCounted').innerText = countedCount;
    
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

function handleManualTag() {
    const input = document.getElementById('manualTagInput');
    const finalCode = input.value.trim();
    if (finalCode) {
        openInputModalForTag(finalCode);
        input.value = '';
    }
}

function onScanSuccess(decodedText, decodedResult) {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop();
    }
    scannerModal.hide();
    
    // Cleanup QR string (MES specific logic, sometimes wrapped in specific formats)
    let finalCode = decodedText.trim();
    openInputModalForTag(finalCode);
}

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
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin fa-2x"></i></td></tr>';

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
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">ไม่พบข้อมูลคลังสินค้า</td></tr>';
        updateSelectedZoneBadge();
        return;
    }

    let html = '';
    list.forEach(loc => {
        html += `
            <tr data-loc-id="${loc.location_id}">
                <td>
                    <input class="form-check-input zone-loc-check" type="checkbox" value="${loc.location_id}" onchange="updateSelectedZoneBadge()">
                </td>
                <td class="text-start fw-bold text-dark">${escapeHTML(loc.location_name)}</td>
                <td class="text-start">
                    <input list="zoneListDatalist" class="form-control form-control-sm loc-zone-input" 
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
    const selected = document.querySelectorAll('.zone-loc-check:checked');
    const badge = document.getElementById('badgeSelectedZoneCount');
    if (badge) badge.innerText = `เลือก ${selected.length} รายการ`;
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
