// e:\MES\MES\MES\page\storeManagement\script\warehouse_ops.js

// === State Variables ===
let currentMode = 'receive'; // 'receive' or 'sell'
let currentPage = 1;
let totalPages = 1;
let rowsPerPage = 100;
let searchTimer = null;
let selectedUuids = new Set();
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// === Init ===
$(document).ready(function() {
    // Load table on page ready
    loadTableData();
    
    // Handle barcode scanner input (enter key)
    $('#barcodeInput').on('keypress', function(e) {
        if (e.which == 13) {
            e.preventDefault();
            const uuid = $(this).val().trim();
            if (uuid) {
                processSingleScan(uuid);
            }
        }
    });
    
    // Search input debounce (500ms)
    $('#listSearchInput').on('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentPage = 1;
            loadTableData();
        }, 500);
    });
    
    // Checkbox changes in table
    $('#tagsTableBody').on('change', '.row-checkbox', function() {
        const uuid = $(this).val();
        if (this.checked) {
            selectedUuids.add(uuid);
        } else {
            selectedUuids.delete(uuid);
            $('#selectAllCheckbox').prop('checked', false);
        }
        updateBulkActionBar();
    });
});

// === Mode Switching ===
function switchMode(mode) {
    if (currentMode === mode) return;
    currentMode = mode;
    
    if (mode === 'receive') {
        $('body').addClass('mode-receive').removeClass('mode-sell');
        $('#btnModeReceive').removeClass('btn-outline-success').addClass('btn-success');
        $('#btnModeSell').removeClass('btn-primary').addClass('btn-outline-primary');
        $('#destinationSelectorDiv').show();
        $('#barcodeInput').attr('placeholder', 'สแกนแท็กรับเข้าที่นี่...');
        $('#btnBulkAction').removeClass('btn-primary').addClass('btn-success');
        $('#btnBulkActionText').text('ยืนยันรับเข้าที่เลือก');
    } else {
        $('body').addClass('mode-sell').removeClass('mode-receive');
        $('#btnModeSell').removeClass('btn-outline-primary').addClass('btn-primary');
        $('#btnModeReceive').removeClass('btn-success').addClass('btn-outline-success');
        $('#destinationSelectorDiv').hide();
        $('#barcodeInput').attr('placeholder', 'สแกนแท็กโหลดขายที่นี่...');
        $('#btnBulkAction').removeClass('btn-success').addClass('btn-primary');
        $('#btnBulkActionText').text('ยืนยันตัดสต็อกที่เลือก');
    }
    
    // Reset
    $('#barcodeInput').val('').focus();
    hideScanFeedback();
    selectedUuids.clear();
    $('#selectAllCheckbox').prop('checked', false);
    updateBulkActionBar();
    currentPage = 1;
    loadTableData();
}

// === Location Change (filter + reload) ===
function onLocationChange() {
    currentPage = 1;
    loadTableData();
}

// === Scan Feedback (inline alert) ===
function playSound(id) {
    const el = document.getElementById(id);
    if (el && el.readyState >= 2) { el.play().catch(() => {}); }
}

function showScanFeedback(type, message) {
    const el = $('#scanFeedback');
    const icon = $('#scanFeedbackIcon');
    
    el.removeClass('alert-success alert-danger alert-warning');
    icon.removeClass('fa-check-circle fa-times-circle fa-spinner fa-spin');
    
    if (type === 'success') {
        el.addClass('alert-success');
        icon.addClass('fa-check-circle');
        playSound('successSound');
        setTimeout(() => hideScanFeedback(), 4000);
    } else if (type === 'error') {
        el.addClass('alert-danger');
        icon.addClass('fa-times-circle');
        playSound('errorSound');
    } else {
        el.addClass('alert-warning');
        icon.addClass('fa-spinner fa-spin');
    }
    
    $('#scanFeedbackText').text(message);
    el.attr('style', 'display: flex !important; font-size: 0.85rem;');
}

function hideScanFeedback() {
    $('#scanFeedback').attr('style', 'display: none !important; font-size: 0.85rem;');
}

// === Single Scan ===
function processSingleScan(uuid) {
    const input = $('#barcodeInput');
    input.prop('disabled', true);
    showScanFeedback('processing', 'กำลังประมวลผล...');
    
    let apiUrl = '';
    let payload = { transfer_uuid: uuid };
    
    if (currentMode === 'receive') {
        const locId = $('#receiveLocationId').val();
        if (!locId) {
            showScanFeedback('error', 'กรุณาเลือกคลังสินค้าปลายทางก่อนสแกนรับเข้า');
            input.prop('disabled', false).val('').focus();
            return;
        }
        apiUrl = '../production/api/transferManage.php?action=confirm_transfer';
        payload.to_location_id = locId;
    } else {
        apiUrl = '../production/api/transferManage.php?action=execute_scan_sale';
    }
    
    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showScanFeedback('success', `สำเร็จ! ${data.message}`);
            // Flash the table to indicate update
            $('#tagsTable').addClass('scan-flash');
            setTimeout(() => $('#tagsTable').removeClass('scan-flash'), 600);
            loadTableData(); // Refresh table after successful scan
        } else {
            showScanFeedback('error', `ผิดพลาด: ${data.message}`);
            $('#tagsTable').addClass('scan-flash-error');
            setTimeout(() => $('#tagsTable').removeClass('scan-flash-error'), 600);
        }
    })
    .catch(err => {
        showScanFeedback('error', 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว');
    })
    .finally(() => {
        input.prop('disabled', false).val('').focus();
    });
}

// === Table Data Loading (with Pagination) ===
function loadTableData(page) {
    if (page !== undefined) currentPage = page;
    
    const searchVal = $('#listSearchInput').val()?.trim() || '';
    const locationId = $('#filterLocationId').val() || '';
    const action = currentMode === 'receive' ? 'get_pending_receive' : 'get_pending_sell';
    
    $('#tagsTableBody').html('<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลดข้อมูล...</td></tr>');
    
    const params = new URLSearchParams({
        action: action,
        page: currentPage,
        limit: rowsPerPage,
        search: searchVal,
        location_id: locationId
    });
    
    fetch(`../production/api/transferManage.php?${params.toString()}`)
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                currentPage = parseInt(json.page);
                totalPages = parseInt(json.total_pages);
                renderTable(json.data);
                renderPaginationInfo(json.total);
                renderPaginationControls();
            } else {
                $('#tagsTableBody').html(`<tr><td colspan="7" class="text-center text-danger py-4">Error: ${json.message}</td></tr>`);
            }
        })
        .catch(err => {
            $('#tagsTableBody').html('<tr><td colspan="7" class="text-center text-danger py-4">เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว</td></tr>');
        });
}

// === Table Rendering ===
function renderTable(data) {
    const tbody = $('#tagsTableBody');
    tbody.empty();
    
    if (!data || data.length === 0) {
        const modeText = currentMode === 'receive' ? 'รอรับเข้า' : 'พร้อมโหลดขาย';
        tbody.html(`<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-inbox me-2"></i>ไม่พบรายการที่${modeText}</td></tr>`);
        return;
    }
    
    let html = '';
    data.forEach(row => {
        const isChecked = selectedUuids.has(row.transfer_uuid) ? 'checked' : '';
        const qty = parseFloat(row.quantity).toLocaleString();
        
        html += `
            <tr>
                <td class="text-center align-middle">
                    <input type="checkbox" class="form-check-input row-checkbox" value="${row.transfer_uuid}" ${isChecked}>
                </td>
                <td class="align-middle fw-bold text-primary">${row.transfer_uuid}</td>
                <td class="align-middle">${row.sap_no || '-'}</td>
                <td class="align-middle fw-bold">${row.part_no || '-'}</td>
                <td class="align-middle"><small class="text-muted">${row.part_description || ''}</small></td>
                <td class="align-middle text-end fw-bold">${qty}</td>
                <td class="align-middle text-muted small">${row.created_at || '-'}</td>
            </tr>
        `;
    });
    tbody.html(html);
}

// === Pagination ===
function renderPaginationInfo(totalRecords) {
    const start = totalRecords === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const end = Math.min(currentPage * rowsPerPage, totalRecords);
    $('#paginationInfo').text(`แสดง ${start} ถึง ${end} จาก ${totalRecords} รายการ`);
}

function renderPaginationControls() {
    const ul = document.getElementById('paginationControls');
    if (!ul) return;
    ul.innerHTML = '';
    if (totalPages <= 1) return;

    ul.innerHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage - 1}, event)">ก่อนหน้า</a></li>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) { startPage = Math.max(1, endPage - 4); }

    for (let i = startPage; i <= endPage; i++) {
        ul.innerHTML += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}, event)">${i}</a></li>`;
    }

    ul.innerHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage + 1}, event)">ถัดไป</a></li>`;
}

function changePage(page, event) {
    if (event) event.preventDefault();
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadTableData();
}

function changeRowsPerPage() {
    rowsPerPage = parseInt($('#rowsPerPage').val()) || 100;
    currentPage = 1;
    loadTableData();
}

// === Checkbox & Bulk Action ===
function toggleAllCheckboxes(source) {
    const isChecked = source.checked;
    $('.row-checkbox').each(function() {
        this.checked = isChecked;
        const uuid = $(this).val();
        if (isChecked) { selectedUuids.add(uuid); } 
        else { selectedUuids.delete(uuid); }
    });
    updateBulkActionBar();
}

function updateBulkActionBar() {
    const count = selectedUuids.size;
    $('#selectedCountText').text(`เลือกแล้ว ${count} รายการ`);
    if (count > 0) {
        $('#bulkActionBar').attr('style', 'display: flex !important;');
    } else {
        $('#bulkActionBar').attr('style', 'display: none !important;');
    }
}

// === Bulk Action ===
function processBulkAction() {
    if (selectedUuids.size === 0) return;
    
    let apiUrl = '';
    let payload = { transfer_uuids: Array.from(selectedUuids) };
    
    if (currentMode === 'receive') {
        const locId = $('#receiveLocationId').val();
        if (!locId) {
            alert('กรุณาเลือกคลังสินค้าปลายทางก่อนรับเข้า');
            return;
        }
        apiUrl = '../production/api/transferManage.php?action=bulk_confirm_transfer';
        payload.to_location_id = locId;
    } else {
        apiUrl = '../production/api/transferManage.php?action=bulk_execute_scan_sale';
    }
    
    const btn = $('#btnBulkAction');
    const originalText = btn.html();
    btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> กำลังประมวลผล...');
    
    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showScanFeedback('success', data.message);
            selectedUuids.clear();
            $('#selectAllCheckbox').prop('checked', false);
            updateBulkActionBar();
            loadTableData();
        } else {
            showScanFeedback('error', data.message);
        }
    })
    .catch(err => {
        showScanFeedback('error', 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว');
    })
    .finally(() => {
        btn.prop('disabled', false).html(originalText);
    });
}

// =====================================================
// === QR Camera Scanner ===
// =====================================================
let html5QrCodeWh = null;
let qrScannerModal = null;
let qrCropModal = null;
let qrCropper = null;
let qrScanCount = 0;
let qrIsProcessing = false;
let qrCameras = [];
let selectedCameraId = null;

// --- Init QR Scanner on DOM Ready ---
$(document).ready(function() {
    const qrModalEl = document.getElementById('qrScannerModal');
    if (qrModalEl) {
        qrScannerModal = new bootstrap.Modal(qrModalEl);
        
        qrModalEl.addEventListener('shown.bs.modal', function() {
            initCameraList().then(() => startQRScanning());
            $('#qrManualInput').focus();
        });
        
        qrModalEl.addEventListener('hidden.bs.modal', function() {
            stopQRScanning();
            resetQRScanResult();
        });
        
        // Manual input enter key
        $('#qrManualInput').on('keypress', function(e) {
            if (e.which === 13) {
                e.preventDefault();
                submitQRManualInput();
            }
        });
        
        // Camera select change
        $('#qrCameraSelect').on('change', function() {
            selectedCameraId = $(this).val();
            stopQRScanning();
            setTimeout(() => startQRScanning(), 200);
        });
    }

    // Crop Modal
    const cropModalEl = document.getElementById('qrCropModal');
    if (cropModalEl) {
        qrCropModal = new bootstrap.Modal(cropModalEl);
        
        // Image file input
        $('#qr-image-file').on('change', function(e) {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = function(event) {
                    $('#qrImageToCrop').attr('src', event.target.result);
                    qrCropModal.show();
                };
                reader.readAsDataURL(file);
                e.target.value = null;
            }
        });
        
        // Init cropper when crop modal opens
        cropModalEl.addEventListener('shown.bs.modal', function() {
            if (qrCropper) qrCropper.destroy();
            qrCropper = new Cropper(document.getElementById('qrImageToCrop'), {
                aspectRatio: NaN,
                viewMode: 1,
                autoCropArea: 0.8,
            });
        });
        
        // Confirm crop button
        $('#btnQrConfirmCrop').on('click', function() {
            if (!qrCropper) return;
            const btn = $(this);
            const originalHtml = btn.html();
            btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> กำลังครอป...');
            
            qrCropper.getCroppedCanvas({ fillColor: '#fff' }).toBlob(async function(blob) {
                const croppedFile = new File([blob], 'cropped_qr.png', { type: 'image/png' });
                qrCropModal.hide();
                await handleQRImageScan(croppedFile);
                btn.prop('disabled', false).html(originalHtml);
            });
        });
    }
});

// --- Init Camera List ---
async function initCameraList() {
    if (qrCameras.length > 0) return; // Already initialized
    try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
            qrCameras = devices;
            const select = $('#qrCameraSelect');
            select.empty();
            
            devices.forEach((device, index) => {
                const label = device.label || `กล้อง ${index + 1}`;
                select.append(new Option(label, device.id));
            });
            
            // Try to default to a back camera
            let defaultId = devices[devices.length - 1].id; // usually last is back
            for (let i = 0; i < devices.length; i++) {
                if (devices[i].label.toLowerCase().includes('back') || devices[i].label.toLowerCase().includes('environment')) {
                    defaultId = devices[i].id;
                    break;
                }
            }
            
            select.val(defaultId);
            selectedCameraId = defaultId;
            $('#qrCameraSelectContainer').show();
        }
    } catch (err) {
        console.warn('Error getting cameras', err);
        $('#qrCameraSelectContainer').hide();
    }
}

// --- Parse QR Content ---
// Supports: URL format (mobile_app.php?type=receipt&transfer_id=XXX) and plain transfer_uuid
function parseQRContent(decodedText) {
    const text = decodedText.trim();
    
    // Try to parse as URL (from label_printer.php)
    try {
        if (text.includes('transfer_id=') || text.includes('http')) {
            const url = new URL(text, window.location.origin);
            const transferId = url.searchParams.get('transfer_id');
            if (transferId) return transferId;
        }
    } catch (e) {
        // Not a valid URL, try manual regex
        const match = text.match(/transfer_id=([^&]+)/);
        if (match) return match[1];
    }
    
    // Return as-is (direct transfer_uuid like "L-202604-001")
    return text;
}

// --- Open Modal ---
function openQRScannerModal() {
    if (currentMode === 'receive') {
        const locId = $('#receiveLocationId').val();
        if (!locId) {
            showScanFeedback('error', 'กรุณาเลือกคลังสินค้าปลายทางก่อนเปิดกล้องสแกน');
            return;
        }
    }
    qrScannerModal.show();
}

// --- Start Camera ---
async function startQRScanning() {
    const qrContainer = document.getElementById('qr-reader-wh');
    if (!qrContainer) return;
    
    $('#qrResumeOverlay').addClass('d-none');
    
    const tryStartCamera = async (attempts = 0) => {
        const currentWidth = qrContainer.clientWidth || qrContainer.offsetWidth;
        if (currentWidth === 0 && attempts < 20) {
            setTimeout(() => tryStartCamera(attempts + 1), 100);
            return;
        }
        
        if (html5QrCodeWh) {
            if (html5QrCodeWh.isScanning) {
                try { await html5QrCodeWh.stop(); } catch(e) {}
            }
            html5QrCodeWh.clear();
            html5QrCodeWh = null;
        }
        
        const formats = typeof Html5QrcodeSupportedFormats !== 'undefined' ? [
            Html5QrcodeSupportedFormats.QR_CODE, 
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13
        ] : undefined;
        html5QrCodeWh = new Html5Qrcode('qr-reader-wh', { verbose: false, formatsToSupport: formats });
        
        // Use string ID if explicitly selected, otherwise use environment config
        const cameraConfig = selectedCameraId ? selectedCameraId : { facingMode: 'environment' };
        
        try {
            await html5QrCodeWh.start(
                cameraConfig,
                { 
                    fps: 10, 
                    qrbox: function(viewfinderWidth, viewfinderHeight) {
                        return { 
                            width: Math.floor(viewfinderWidth * 0.9), 
                            height: Math.floor(viewfinderHeight * 0.5) 
                        };
                    }
                },
                (decodedText) => {
                    if (qrIsProcessing) return; // Prevent duplicate scans
                    qrIsProcessing = true;
                    stopQRScanning();
                    const transferUuid = parseQRContent(decodedText);
                    processQRScan(transferUuid);
                }
            );
        } catch (err) {
            console.warn('QR Camera start failed:', err);
            showQRScanResult('error', 'ไม่สามารถเปิดกล้องได้', 'กรุณาอนุญาตให้เข้าถึงกล้อง หรือใช้ช่องพิมพ์ด้านล่าง');
        }
    };
    
    setTimeout(() => tryStartCamera(0), 200);
}

// --- Stop Camera ---
function stopQRScanning() {
    if (html5QrCodeWh && html5QrCodeWh.isScanning) {
        html5QrCodeWh.stop().catch(err => console.log('Stop camera error:', err));
    }
    $('#qrResumeOverlay').removeClass('d-none').addClass('d-flex');
}

// --- Resume Scanning ---
function resumeQRScanning() {
    resetQRScanResult();
    $('#qrResumeOverlay').removeClass('d-flex').addClass('d-none');
    startQRScanning();
    setTimeout(() => $('#qrManualInput').focus(), 300);
}

// --- Process QR Scan (send to API via processSingleScan logic) ---
function processQRScan(transferUuid) {
    if (!transferUuid) {
        showQRScanResult('error', 'ไม่สามารถอ่าน QR ได้', 'ลองสแกนใหม่อีกครั้ง');
        qrIsProcessing = false;
        return;
    }
    
    showQRScanResult('processing', 'กำลังประมวลผล...', transferUuid);
    
    let apiUrl = '';
    let payload = { transfer_uuid: transferUuid };
    
    if (currentMode === 'receive') {
        const locId = $('#receiveLocationId').val();
        if (!locId) {
            showQRScanResult('error', 'ไม่ได้เลือกคลังปลายทาง', 'กรุณาปิด Modal แล้วเลือกคลังก่อน');
            qrIsProcessing = false;
            return;
        }
        apiUrl = '../production/api/transferManage.php?action=confirm_transfer';
        payload.to_location_id = locId;
    } else {
        apiUrl = '../production/api/transferManage.php?action=execute_scan_sale';
    }
    
    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            qrScanCount++;
            $('#qrScanCount').text(qrScanCount);
            showQRScanResult('success', 'สำเร็จ!', `${data.message} (${transferUuid})`);
            playSound('successSound');
            loadTableData(); // Refresh table
            
            // Auto-resume if continuous mode
            const isContinuous = $('#qrContinuousScan').is(':checked');
            if (isContinuous) {
                setTimeout(() => {
                    qrIsProcessing = false;
                    resumeQRScanning();
                }, 1500);
            } else {
                qrIsProcessing = false;
            }
        } else {
            showQRScanResult('error', 'ผิดพลาด', `${data.message} (${transferUuid})`);
            playSound('errorSound');
            qrIsProcessing = false;
        }
    })
    .catch(err => {
        showQRScanResult('error', 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว', 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
        playSound('errorSound');
        qrIsProcessing = false;
    });
}

// --- Image Upload Scan ---
async function handleQRImageScan(file) {
    if (!file) return;
    
    showQRScanResult('processing', 'กำลังอ่าน QR จากรูปภาพ...', '');
    
    try {
        if (!html5QrCodeWh) {
            const formats = typeof Html5QrcodeSupportedFormats !== 'undefined' ? [
            Html5QrcodeSupportedFormats.QR_CODE, 
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13
        ] : undefined;
            html5QrCodeWh = new Html5Qrcode('qr-reader-wh', { verbose: false, formatsToSupport: formats });
        }
        const decodedText = await html5QrCodeWh.scanFile(file, false);
        const transferUuid = parseQRContent(decodedText.trim());
        processQRScan(transferUuid);
    } catch (err) {
        showQRScanResult('error', 'ไม่พบ QR Code ในรูปภาพ', 'ลองครอปให้ชัดเจนกว่านี้');
    }
}

// --- Manual Input ---
function submitQRManualInput() {
    const value = $('#qrManualInput').val().trim();
    if (!value) return;
    
    const transferUuid = parseQRContent(value);
    stopQRScanning();
    processQRScan(transferUuid);
    $('#qrManualInput').val('');
}

// --- Show Scan Result ---
function showQRScanResult(type, title, message) {
    const container = $('#qrScanResult');
    const alert = $('#qrScanResultAlert');
    const icon = $('#qrScanResultIcon');
    
    container.removeClass('d-none flash-success flash-error');
    alert.removeClass('alert-success alert-danger alert-warning alert-info');
    icon.removeClass('fas fa-check-circle fa-times-circle fa-spinner fa-spin fa-exclamation-triangle');
    
    if (type === 'success') {
        alert.addClass('alert-success');
        icon.addClass('fas fa-check-circle text-success');
        container.addClass('flash-success');
    } else if (type === 'error') {
        alert.addClass('alert-danger');
        icon.addClass('fas fa-times-circle text-danger');
        container.addClass('flash-error');
    } else { // processing
        alert.addClass('alert-info');
        icon.addClass('fas fa-spinner fa-spin text-info');
    }
    
    $('#qrScanResultTitle').text(title);
    $('#qrScanResultMsg').text(message || '');
}

// --- Reset Scan Result ---
function resetQRScanResult() {
    $('#qrScanResult').addClass('d-none');
    qrIsProcessing = false;
}

// --- Reset Scan Counter ---
function resetQRScanCount() {
    qrScanCount = 0;
    $('#qrScanCount').text('0');
}
