let currentSessionId = 0;
let currentLocationId = 0;
let expectedItems = {};
let html5QrcodeScanner = null;
let currentTagNo = '';
let currentCameraDeviceId = null;

const scannerModal = new bootstrap.Modal(document.getElementById('scannerModal'));
const inputQtyModal = new bootstrap.Modal(document.getElementById('inputQtyModal'));

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

    const formData = new FormData();
    formData.append('action', 'cc_start_session');
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

function handleManualTag() {
    const input = document.getElementById('manualTagInput');
    const finalCode = input.value.trim();
    if (finalCode) {
        currentTagNo = finalCode;
        checkTagMatch(finalCode);
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
    // Example: P002888-002, or RM-260316-0131
    
    currentTagNo = finalCode;
    document.getElementById('inputTagNo').innerText = currentTagNo;
    document.getElementById('inputActualQty').value = '';
    document.getElementById('inputReason').value = '';
    document.getElementById('inputReasonContainer').classList.add('d-none');
    document.getElementById('wrongLocationWarning').classList.add('d-none');
    
    inputQtyModal.show();
    setTimeout(() => document.getElementById('inputActualQty').focus(), 500);
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
    const formData = new FormData();
    formData.append('action', 'cc_scan_tag');
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
    const formData = new FormData();
    formData.append('action', 'cc_start_session');
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

    const formData = new FormData();
    formData.append('action', 'cc_finish_session');
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
