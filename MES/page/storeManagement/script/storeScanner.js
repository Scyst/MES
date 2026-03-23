// MES/page/storeManagement/script/storeScanner.js
"use strict";

let traceModalInstance;
let html5QrCodeTrace = null;
let currentScannedBarcode = '';
let cropper = null;
let cropModalInstance;

document.addEventListener('DOMContentLoaded', () => {
    // 1. จัดการ Modal Scanner
    const traceModalEl = document.getElementById('traceModal');
    if (traceModalEl) {
        traceModalInstance = new bootstrap.Modal(traceModalEl);
        
        // เมื่อเปิด Modal ให้เปิดกล้องและโฟกัสช่องพิมพ์
        traceModalEl.addEventListener('shown.bs.modal', () => {
            startTraceScanning();
            document.getElementById('scanInput').focus();
        });

        // เมื่อปิด Modal ให้ปิดกล้องและล้างข้อมูล
        traceModalEl.addEventListener('hidden.bs.modal', () => {
            stopTraceScanning();
            resetTraceUI();
        });

        // กด Enter ในช่องค้นหา
        document.getElementById('scanInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeTraceScan();
        });
    }

    // 2. จัดการ Modal ครอปรูปภาพ (Crop Modal)
    const cropModalEl = document.getElementById('cropModal');
    if (cropModalEl) {
        cropModalInstance = new bootstrap.Modal(cropModalEl);
        const imageToCrop = document.getElementById('imageToCrop');
        const fileInput = document.getElementById('trace-image-file');

        fileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    imageToCrop.src = event.target.result;
                    cropModalInstance.show();
                };
                reader.readAsDataURL(file);
                e.target.value = null; // รีเซ็ต input ให้กดอัปโหลดซ้ำได้
            }
        });

        cropModalEl.addEventListener('shown.bs.modal', function () {
            if (cropper) cropper.destroy();
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 1, viewMode: 1, autoCropArea: 0.8,
            });
        });

        document.getElementById('btnConfirmCrop')?.addEventListener('click', function() {
            if (!cropper) return;
            const btn = document.getElementById('btnConfirmCrop');
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> กำลังครอป...';

            cropper.getCroppedCanvas({ fillColor: '#fff' }).toBlob(async (blob) => {
                const croppedFile = new File([blob], "cropped_qr.png", { type: "image/png" });
                cropModalInstance.hide();
                await handleTraceFileScan(croppedFile); 
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            });
        });
    }
});

async function handleTraceFileScan(file) {
    if (!file) return;
    stopTraceScanning(); 
    document.getElementById('traceLoading').classList.remove('d-none');
    document.getElementById('traceResult').classList.add('d-none');
    document.getElementById('traceActionArea').classList.add('d-none');

    try {
        if (!html5QrCodeTrace) html5QrCodeTrace = new Html5Qrcode("qr-reader-trace");
        const decodedText = await html5QrCodeTrace.scanFile(file, false);
        currentScannedBarcode = decodedText.trim();
        document.getElementById('scanInput').value = currentScannedBarcode;
        executeTraceScan();
    } catch (err) {
        Swal.fire('ข้อผิดพลาด', 'ไม่พบ QR Code แจ้งเตือนจากรูปภาพ', 'error');
        document.getElementById('traceLoading').classList.add('d-none');
        startTraceScanning();
    }
}

window.openTraceModal = function() {
    resetTraceUI();
    traceModalInstance.show();
};

function resetTraceUI() {
    document.getElementById('scanInput').value = '';
    document.getElementById('traceResult').classList.add('d-none');
    document.getElementById('traceActionArea').classList.add('d-none');
    document.getElementById('traceLoading').classList.add('d-none');
    currentScannedBarcode = '';
}

function stopTraceScanning() {
    if (html5QrCodeTrace && html5QrCodeTrace.isScanning) {
        html5QrCodeTrace.stop().catch(err => console.log("Stop camera error:", err));
    }
}

async function startTraceScanning() {
    const qrContainer = document.getElementById("qr-reader-trace");
    if (!qrContainer) return;

    const tryStartCamera = async (attempts = 0) => {
        const currentWidth = qrContainer.clientWidth || qrContainer.offsetWidth;
        
        // รอให้ Modal กางเสร็จ
        if (currentWidth === 0 && attempts < 20) {
            setTimeout(() => tryStartCamera(attempts + 1), 100);
            return;
        }

        // ล้าง Instance เดิม
        if (html5QrCodeTrace) {
            if (html5QrCodeTrace.isScanning) {
                try { await html5QrCodeTrace.stop(); } catch(e) {}
            }
            html5QrCodeTrace.clear();
            html5QrCodeTrace = null;
        }

        html5QrCodeTrace = new Html5Qrcode("qr-reader-trace");

        try {
            await html5QrCodeTrace.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (decodedText) => {
                    stopTraceScanning(); 
                    document.getElementById('scanInput').value = decodedText.trim();
                    executeTraceScan();
                }
            );
        } catch (err) { 
            console.warn("Camera start failed:", err); 
        }
    };

    setTimeout(() => tryStartCamera(0), 200);
}

window.executeTraceScan = async function() {
    const serialNo = document.getElementById('scanInput').value.trim();
    if (!serialNo) return;

    document.getElementById('traceLoading').classList.remove('d-none');
    document.getElementById('traceResult').classList.add('d-none');
    document.getElementById('traceActionArea').classList.add('d-none');

    try {
        const json = await fetchAPI(`trace_tag&serial_no=${encodeURIComponent(serialNo)}`, 'GET');
        document.getElementById('traceLoading').classList.add('d-none');

        if (json.data) {
            renderTraceData(json.data);
            document.getElementById('traceResult').classList.remove('d-none');
            document.getElementById('scanInput').value = ''; 
        }
    } catch (err) {
        document.getElementById('traceLoading').classList.add('d-none');
        Swal.fire('ไม่พบข้อมูล', `ไม่มีประวัติของแท็ก: ${serialNo}`, 'warning').then(() => {
            setTimeout(() => document.getElementById('scanInput').focus(), 300);
        });
    }
}

function renderTraceData(data) {
    const tag = data.tag_info;
    const history = data.history;

    currentScannedBarcode = tag.master_pallet_no || tag.serial_no;

    // เปลี่ยนสี Badge ให้สวยขึ้น (ใช้ bg-warning ธรรมดา แต่ตัวหนังสือเข้ม)
    let badgeClass = tag.status === 'AVAILABLE' ? 'bg-success' : (tag.status === 'EMPTY' ? 'bg-secondary' : (tag.status === 'PENDING' ? 'bg-warning text-dark' : 'bg-info text-dark'));
    
    document.getElementById('traceSerial').innerText = currentScannedBarcode;
    document.getElementById('traceStatus').className = `badge ${badgeClass} rounded-pill fs-6 px-3 py-2 shadow-sm`;
    document.getElementById('traceStatus').innerText = tag.status;
    document.getElementById('traceItem').innerText = tag.item_no;
    document.getElementById('traceDesc').innerText = tag.part_description || tag.description_ref || '-';
    document.getElementById('tracePO').innerText = tag.po_number || '-';
    document.getElementById('traceInv').innerText = tag.warehouse_no || '-';  
    document.getElementById('traceQty').innerText = tag.total_tags 
        ? `${parseFloat(tag.total_qty).toLocaleString()} (รวม ${tag.total_tags} ใบ)` 
        : `${parseFloat(tag.current_qty).toLocaleString()} / ${parseFloat(tag.qty_per_pallet).toLocaleString()}`;
    
    const tbody = document.getElementById('traceHistoryTbody');
    tbody.innerHTML = '';

    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">ยังไม่มีประวัติการเคลื่อนไหว</td></tr>';
    } else {
        history.forEach(row => {
            let typeColor = row.transaction_type.includes('IN') || row.transaction_type.includes('RECEIVE') ? 'text-success' : 'text-danger';
            let sign = typeColor === 'text-success' ? '+' : '-';
            // วาดข้อมูลให้ตรงกับตาราง 3 คอลัมน์ (เวลา, สถานะ, จำนวน)
            tbody.innerHTML += `
                <tr>
                    <td class="py-2 px-3"><div class="fw-bold text-dark">${row.transaction_timestamp.substring(11, 16)}</div><small class="text-muted">${row.transaction_timestamp.substring(0, 10)}</small></td>
                    <td class="py-2"><span class="badge bg-light text-dark border">${row.transaction_type}</span></td>
                    <td class="text-end fw-bold ${typeColor} py-2 px-3 fs-6">${sign}${parseFloat(row.quantity).toLocaleString()}</td>
                </tr>
            `;
        });
    }

    const actionArea = document.getElementById('traceActionArea');
    const receiveArea = document.getElementById('traceReceiveArea');
    const issueArea = document.getElementById('traceIssueArea');
    
    actionArea.classList.add('d-none');
    receiveArea.classList.add('d-none');
    issueArea.classList.add('d-none');

    if (tag.status === 'PENDING' && typeof CAN_MANAGE_RM !== 'undefined' && CAN_MANAGE_RM) {
        actionArea.classList.remove('d-none');
        receiveArea.classList.remove('d-none');
        
        const autoReceive = document.getElementById('continuousScanToggle');
        if (autoReceive && autoReceive.checked) {
            setTimeout(() => receiveScannedTag(), 300);
        }
    }
    else if (tag.status === 'AVAILABLE' && typeof CAN_MANAGE_WH !== 'undefined' && CAN_MANAGE_WH) {
        actionArea.classList.remove('d-none');
        issueArea.classList.remove('d-none');
    }
}

window.receiveScannedTag = async function() {
    if (!currentScannedBarcode) return;
    const locId = document.getElementById('receiveLocationTrace').value;
    
    const formData = new FormData();
    formData.append('barcode', currentScannedBarcode);
    formData.append('location_id', locId);
    
    const result = await fetchAPI('receive_scanned_tag', 'POST', formData, 'btnReceiveTrace');
    
    if(result) {
        if (typeof showToast === 'function') {
            showToast('รับเข้าสต็อกสำเร็จ!', 'var(--bs-success)');
        } else {
            Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: 'success', title: 'รับเข้าสำเร็จ!' });
        }
        
        if (typeof loadHistory === 'function') loadHistory();
        if (typeof loadDashboardData === 'function') loadDashboardData();
        
        document.getElementById('traceActionArea').classList.add('d-none');
        document.getElementById('traceStatus').className = 'badge bg-success fs-6 shadow-sm';
        document.getElementById('traceStatus').innerText = 'AVAILABLE';
        
        const autoReceive = document.getElementById('continuousScanToggle');
        if (autoReceive && autoReceive.checked) {
            setTimeout(() => startTraceScanning(), 1000); 
        }
    }
};

window.issueScannedTag = async function(ignoreFifo = false) {
    if (!currentScannedBarcode) return;
    const locId = document.getElementById('issueLocationTrace').value;
    
    const formData = new FormData();
    formData.append('barcode', currentScannedBarcode);
    formData.append('qty', 1);
    formData.append('to_location', locId);
    
    if (ignoreFifo) formData.append('ignore_fifo', 'true');
    
    const result = await fetchAPI('issue_rm', 'POST', formData, 'btnIssueTrace');
    
    if(result) {
        if (result.require_fifo_confirm) {
            Swal.fire({
                title: '⚠️ แจ้งเตือน FIFO',
                text: result.message,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ยืนยันจ่ายแท็กนี้ (ข้าม FIFO)',
                cancelButtonText: 'ยกเลิก (ไปหยิบแท็กเก่า)'
            }).then((confirmRes) => {
                if (confirmRes.isConfirmed) issueScannedTag(true); 
            });
            return; 
        }

        if (typeof showToast === 'function') {
            showToast('เบิกจ่ายสำเร็จ!', 'var(--bs-success)');
        } else {
            Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: 'success', title: 'เบิกจ่ายสำเร็จ!' });
        }
        executeTraceScan();

        if (typeof loadHistory === 'function') loadHistory();
        if (typeof loadDashboardData === 'function') loadDashboardData();
    }
};

window.renderPrintTags = function(tags) {
    const printArea = document.getElementById('printArea');
    if(!printArea) return;
    printArea.innerHTML = '';
    
    tags.forEach(tag => {
        let displayDesc = tag.part_description || tag.description_ref || '';
        let tagHTML = `
        <div class="tag-card">
            <div class="tag-details">
                <div class="t-title">${escapeHTML(tag.item_no)}</div>
                <div class="t-sub">${escapeHTML(tag.category || '')}</div>
                <div class="t-desc" title="${escapeHTML(displayDesc)}">${escapeHTML(displayDesc)}</div>
                
                <table class="t-table">
                    <tr>
                        <td style="width: 55%;"><b>QTY:</b> <span class="t-hl">${parseFloat(tag.qty_per_pallet).toLocaleString()}</span></td>
                        <td style="width: 45%;"><b>Inv:</b> ${escapeHTML(tag.warehouse_no)}</td>
                    </tr>
                    <tr>
                        <td><b>PO:</b> ${escapeHTML(tag.po_number)}</td>
                        <td><b>Pallet:</b> ${escapeHTML(tag.pallet_no)}</td>
                    </tr>
                    <tr>
                        <td><b>CTN:</b> ${escapeHTML(tag.ctn_number)}</td>
                        <td><b>Week:</b> ${escapeHTML(tag.week_no)}</td>
                    </tr>
                    <tr>
                        <td><b>Date:</b> ${escapeHTML(formatDateForPrint(tag.received_date || tag.created_at))}</td>
                        <td><b>Remark:</b> <span style="display:inline-block; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:bottom;">${escapeHTML(tag.remark || '-')}</span></td>
                    </tr>
                </table>
            </div>
            <div class="tag-qr">
                <div id="qr-${tag.serial_no}"></div>
                <div class="t-serial">${tag.serial_no}</div>
            </div>
        </div>
        `;
        printArea.insertAdjacentHTML('beforeend', tagHTML);
        
        if(typeof QRCode !== 'undefined') {
            new QRCode(document.getElementById(`qr-${tag.serial_no}`), {
                text: tag.serial_no, width: 85, height: 85,
                colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.M 
            });
        }
    });
};

window.renderMasterPalletTag = function(masterData) {
    const printArea = document.getElementById('printArea');
    if(!printArea) return;
    printArea.innerHTML = '';
    
    let isMixed = masterData.distinct_items > 1;
    let displayItemNo = isMixed ? `MIXED PARTS` : escapeHTML(masterData.item_no || 'MIXED PARTS');
    let displayDesc = isMixed ? 'พาเลทรวมสินค้าหลายชนิด (Consolidated Pallet)' : escapeHTML(masterData.part_description || masterData.description_ref || '');

    let tagHTML = `
    <div class="tag-card">
        <div class="tag-details">
            <div class="t-title" style="border-bottom: 2px solid #000; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 1px;">
                <i class="fas fa-layer-group"></i> PALLET TAG
            </div>
            <div class="t-sub" style="font-size: 1rem; color: #000;">${displayItemNo}</div>
            <div class="t-desc" style="height: 18px; margin-bottom: 4px;">${displayDesc}</div>
            
            <table class="t-table">
                <tr>
                    <td style="width: 55%;"><b>Total QTY:</b> <span class="t-hl">${parseFloat(masterData.total_qty || masterData.qty_per_pallet).toLocaleString()}</span></td>
                    <td style="width: 45%;"><b>Tags:</b> <span style="font-size: 1rem; font-weight: bold;">${masterData.total_tags || 1}</span></td>
                </tr>
                <tr><td colspan="2"><b>PO:</b> ${escapeHTML(masterData.po_number || '-')}</td></tr>
                <tr>
                    <td><b>Date:</b> ${escapeHTML(formatDateForPrint(masterData.received_date))}</td>
                    <td><b>Inv:</b> ${escapeHTML(masterData.warehouse_no || '-')}</td>
                </tr>
            </table>
        </div>
        <div class="tag-qr">
            <div id="qr-${masterData.master_pallet_no}"></div>
            <div class="t-serial" style="font-size: 0.65rem; word-wrap: break-word; text-align: center; line-height: 1.1; margin-top: 3px;">
                ${masterData.master_pallet_no}
            </div>
        </div>
    </div>
    `;
    printArea.innerHTML = tagHTML;
    
    if(typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById(`qr-${masterData.master_pallet_no}`), {
            text: masterData.master_pallet_no, width: 85, height: 85,
            colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.M 
        });
    }
};