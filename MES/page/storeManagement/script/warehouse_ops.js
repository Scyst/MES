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
