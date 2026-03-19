"use strict";

let allData = [];
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 100;
let detailsModal;
let issueModal;

document.addEventListener('DOMContentLoaded', () => {
    detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    issueModal = new bootstrap.Modal(document.getElementById('issueModal'));
    loadLocations(); 
});

// ⭐️ [เทคนิคใหม่]: จับ Event กด Enter ของช่องสแกนบาร์โค้ดแบบไม่มีบั๊กแน่นอน
document.addEventListener('keypress', function(e) {
    if (e.target && e.target.id === 'issueBarcode' && e.key === 'Enter') {
        e.preventDefault();
        fetchPalletTags();
    }
});

async function loadLocations() {
    try {
        const res = await fetch('api/manageInventory.php?action=get_locations');
        const json = await res.json();
        
        if (json.success) {
            const filterSelect = document.getElementById('locationFilter');
            const issueSelect = document.getElementById('issueToLocation');
            
            if(issueSelect) issueSelect.innerHTML = '';
            
            json.data.forEach(loc => {
                if(filterSelect) filterSelect.innerHTML += `<option value="${loc.location_id}">${loc.location_name}</option>`;
                if(issueSelect) issueSelect.innerHTML += `<option value="${loc.location_id}">${loc.location_name} (${loc.location_type || 'N/A'})</option>`;
            });
        }
    } catch (err) {
        console.error("Failed to load locations", err);
    }
    loadDashboardData();
}

async function loadDashboardData() {
    const tbody = document.getElementById('inventoryTbody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลดข้อมูล...</td></tr>';
    
    const locId = document.getElementById('locationFilter')?.value || 'ALL';
    const matType = document.getElementById('matTypeFilter')?.value || 'ALL';
    const hideZero = document.getElementById('hideZeroToggle')?.checked || false;
    
    try {
        const res = await fetch(`api/manageInventory.php?action=get_dashboard&location_id=${locId}&material_type=${matType}&hide_zero=${hideZero}`);
        const json = await res.json();
        
        if (json.success) {
            allData = json.data;
            filteredData = [...allData];
            
            document.getElementById('kpi-skus').innerText = json.kpi.total_skus.toLocaleString();
            document.getElementById('kpi-out-of-stock').innerText = json.kpi.out_of_stock.toLocaleString();
            document.getElementById('kpi-pending').innerText = json.kpi.total_pending_qty.toLocaleString();
            document.getElementById('toolbar-total-avail').innerText = json.kpi.toolbar_total_pcs.toLocaleString();

            let val = json.kpi.total_value;
            let valStr = val > 1000000 ? (val / 1000000).toFixed(2) + ' M' : val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('kpi-value').innerText = valStr;

            currentPage = 1;
            renderTable();
        } else {
            Swal.fire('ข้อผิดพลาด', json.message, 'error');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">ไม่สามารถโหลดข้อมูลได้</td></tr>`;
    }
}

function handleSearch() {
    const keyword = document.getElementById('searchInput').value.toLowerCase();
    filteredData = allData.filter(row => 
        (row.item_no && row.item_no.toLowerCase().includes(keyword)) ||
        (row.part_description && row.part_description.toLowerCase().includes(keyword))
    );
    currentPage = 1;
    renderTable();
}

function changeRowsPerPage() {
    rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
    currentPage = 1;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('inventoryTbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">ไม่พบข้อมูลสต็อก</td></tr>';
        updatePaginationInfo();
        renderPaginationControls();
        return;
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedItems = filteredData.slice(startIndex, endIndex);

    paginatedItems.forEach(row => {
        let availQty = parseFloat(row.available_qty);
        let pendQty = parseFloat(row.pending_qty);
        let totalQty = parseFloat(row.total_qty);
        let value = parseFloat(row.total_value);

        let rowClass = availQty <= 0 ? 'row-out-of-stock' : '';
        let availDisplay = availQty <= 0 ? '<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i> 0</span>' : availQty.toLocaleString();

        let typeBadge = '';
        if(row.material_type === 'RM') typeBadge = '<span class="badge bg-primary ms-2" style="font-size:0.65rem;">RM</span>';
        else if(row.material_type === 'FG') typeBadge = '<span class="badge bg-success ms-2" style="font-size:0.65rem;">FG</span>';
        else if(row.material_type === 'SEMI' || row.material_type === 'WIP') typeBadge = '<span class="badge bg-warning text-dark ms-2" style="font-size:0.65rem;">SEMI</span>';
        else typeBadge = `<span class="badge bg-secondary ms-2" style="font-size:0.65rem;">${escapeHTML(row.material_type)}</span>`;

        let rowHtml = `
            <tr class="${rowClass}">
                <td class="fw-bold text-dark d-flex align-items-center border-bottom-0">
                    ${escapeHTML(row.item_no)} ${typeBadge}
                </td>
                <td class="text-truncate text-muted" style="max-width: 300px;" title="${escapeHTML(row.part_description || '')}">${escapeHTML(row.part_description || '-')}</td>
                <td class="text-end text-warning fw-bold">${pendQty > 0 ? pendQty.toLocaleString() : '-'}</td>
                <td class="text-end fw-bold ${availQty > 0 ? 'text-success' : ''}">${availDisplay}</td>
                <td class="text-end text-primary fw-bold" style="font-size: 1.05rem;">${totalQty.toLocaleString()}</td>
                <td class="text-end text-secondary">฿ ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-light border shadow-sm text-primary rounded-circle" style="width: 30px; height: 30px; padding: 0;" onclick="viewDetails(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description ? row.part_description.replace(/'/g, "\\'") : '')}')" title="ดูพิกัดสต็อก">
                        <i class="fas fa-search"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += rowHtml;
    });

    updatePaginationInfo();
    renderPaginationControls();
}

function updatePaginationInfo() {
    const total = filteredData.length;
    const start = total === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const end = Math.min(currentPage * rowsPerPage, total);
    const info = document.getElementById('paginationInfo');
    if(info) info.innerText = `แสดง ${start} ถึง ${end} จาก ${total} รายการ`;
}

function renderPaginationControls() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const paginationUl = document.getElementById('paginationControls');
    if(!paginationUl) return;
    paginationUl.innerHTML = '';

    if (totalPages <= 1) return;

    paginationUl.innerHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage - 1}, event)">ก่อนหน้า</a></li>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) { startPage = Math.max(1, endPage - 4); }

    for (let i = startPage; i <= endPage; i++) {
        paginationUl.innerHTML += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}, event)">${i}</a></li>`;
    }

    paginationUl.innerHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage + 1}, event)">ถัดไป</a></li>`;
}

function changePage(page, event) {
    if (event) event.preventDefault();
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
}

window.viewDetails = async function(itemId, itemNo, itemDesc) {
    document.getElementById('modalItemNo').innerText = itemNo;
    document.getElementById('modalItemDesc').innerText = itemDesc || '-';
    document.getElementById('modalAvailTbody').innerHTML = '<tr><td colspan="2" class="text-center text-muted">กำลังโหลด...</td></tr>';
    document.getElementById('modalPendTbody').innerHTML = '<tr><td colspan="2" class="text-center text-muted">กำลังโหลด...</td></tr>';
    
    detailsModal.show();

    try {
        const res = await fetch(`api/manageInventory.php?action=get_item_details&item_id=${itemId}`);
        const json = await res.json();

        if (json.success) {
            let availHtml = '';
            if (json.available_details.length === 0) {
                availHtml = '<tr><td colspan="2" class="text-center text-muted small">ไม่มีของในคลัง</td></tr>';
            } else {
                json.available_details.forEach(r => {
                    availHtml += `<tr><td><i class="fas fa-map-marker-alt text-success me-2"></i>${escapeHTML(r.location_name)}</td><td class="text-end fw-bold">${parseFloat(r.qty).toLocaleString()}</td></tr>`;
                });
            }
            document.getElementById('modalAvailTbody').innerHTML = availHtml;

            let pendHtml = '';
            if (json.pending_details.length === 0) {
                pendHtml = '<tr><td colspan="2" class="text-center text-muted small">ไม่มีของรอรับเข้า</td></tr>';
            } else {
                json.pending_details.forEach(r => {
                    let po = r.po_number ? `<br><small class="text-muted">PO: ${escapeHTML(r.po_number)}</small>` : '';
                    pendHtml += `<tr><td><i class="fas fa-box text-warning me-2"></i>${escapeHTML(r.tracking_no || 'ไม่ระบุ')}${po}</td><td class="text-end fw-bold">${parseFloat(r.qty).toLocaleString()}</td></tr>`;
                });
            }
            document.getElementById('modalPendTbody').innerHTML = pendHtml;
        }
    } catch (err) {
        document.getElementById('modalAvailTbody').innerHTML = '<tr><td colspan="2" class="text-center text-danger">Error</td></tr>';
        document.getElementById('modalPendTbody').innerHTML = '<tr><td colspan="2" class="text-center text-danger">Error</td></tr>';
    }
};

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

// ==========================================
// 🚀 ระบบเบิกจ่ายแบบเลือก Tag (Smart Issue)
// ==========================================
window.openIssueModal = function() {
    document.getElementById('issueBarcode').value = '';
    document.getElementById('issueTagsTbody').innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">กรุณาสแกนบาร์โค้ดเพื่อดึงรายการ</td></tr>';
    document.getElementById('checkAllTags').checked = false;
    document.getElementById('selectedTagsCount').innerText = 'เลือก 0 รายการ';
    document.getElementById('btnSubmitIssue').disabled = true;
    
    issueModal.show();
    setTimeout(() => { document.getElementById('issueBarcode').focus(); }, 500);
};

window.fetchPalletTags = async function() {
    const barcode = document.getElementById('issueBarcode').value.trim();
    if(!barcode) return;

    const tbody = document.getElementById('issueTagsTbody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3"><i class="fas fa-spinner fa-spin text-primary"></i> กำลังโหลด...</td></tr>';
    
    try {
        const res = await fetch(`api/manageInventory.php?action=get_pallet_tags&barcode=${barcode}`);
        const json = await res.json();
        
        if(json.success && json.data.length > 0) {
            tbody.innerHTML = '';
            json.data.forEach(tag => {
                tbody.innerHTML += `
                    <tr>
                        <td class="text-center">
                            <input class="form-check-input issue-tag-checkbox" type="checkbox" value="${tag.serial_no}" onchange="updateSelectedCount()">
                        </td>
                        <td class="fw-bold text-primary">${tag.serial_no}</td>
                        <td class="text-muted">${tag.part_no}</td>
                        <td class="text-end pe-3 fw-bold">${parseFloat(tag.current_qty).toLocaleString()}</td>
                    </tr>
                `;
            });
            document.getElementById('checkAllTags').checked = false;
            updateSelectedCount();
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-danger fw-bold">ไม่พบข้อมูล หรือถูกเบิกไปแล้ว</td></tr>';
        }
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-danger">เกิดข้อผิดพลาด</td></tr>';
    }
};

window.toggleAllTags = function(source) {
    const checkboxes = document.querySelectorAll('.issue-tag-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateSelectedCount();
};

window.updateSelectedCount = function() {
    const checkedCount = document.querySelectorAll('.issue-tag-checkbox:checked').length;
    document.getElementById('selectedTagsCount').innerText = `เลือก ${checkedCount} รายการ`;
    document.getElementById('btnSubmitIssue').disabled = (checkedCount === 0);
};

window.submitSpecificIssue = async function() {
    const checkedBoxes = document.querySelectorAll('.issue-tag-checkbox:checked');
    const serials = Array.from(checkedBoxes).map(cb => cb.value).join(',');
    const toLocation = document.getElementById('issueToLocation').value;

    const btnSubmit = document.getElementById('btnSubmitIssue');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังตัดสต็อก...';

    const formData = new FormData();
    formData.append('action', 'issue_selected_tags');
    formData.append('serials', serials);
    formData.append('to_location', toLocation);

    try {
        const res = await fetch('api/manageInventory.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            Swal.fire({
                title: 'เบิกสำเร็จ!',
                text: `ตัดสต็อกจำนวน ${json.issued_count} รายการ กำลังเตรียมปริ้นท์...`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            
            issueModal.hide();
            loadDashboardData(); 
            printIssuedTags(json.issued_tags);
        } else {
            Swal.fire('ล้มเหลว', json.message, 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-print me-2"></i> ยืนยันเบิก & พิมพ์สติ๊กเกอร์';
        }
    } catch (err) {
        Swal.fire('Error', 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว', 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-print me-2"></i> ยืนยันเบิก & พิมพ์สติ๊กเกอร์';
    }
};

// ==========================================
// 🖨️ ระบบสร้างและสั่งปริ้นท์สติ๊กเกอร์ WIP Tag
// ==========================================
async function printIssuedTags(issuedTagsArray) {
    if (!issuedTagsArray || issuedTagsArray.length === 0) return;
    const serials = issuedTagsArray.map(t => t.serial_no).join(',');
    const formData = new FormData();
    formData.append('action', 'get_print_tags');
    formData.append('serials', serials);
    
    try {
        const res = await fetch('api/manageInventory.php', { method: 'POST', body: formData });
        const json = await res.json();
        
        if (json.success && json.data.length > 0) {
            const printArea = document.getElementById('printArea');
            printArea.innerHTML = '';
            printArea.classList.remove('d-none');
            json.data.forEach((tag, index) => {
                const qrId = 'qr-code-' + index;
                const html = `
                    <div class="tag-print-card">
                        <div class="tag-print-header">WIP TAG (Line Issue)</div>
                        <div class="tag-print-body">
                            <div class="tag-print-info">
                                <b>Item:</b> ${tag.part_no}<br>
                                <b>Desc:</b> ${tag.part_description ? tag.part_description.substring(0, 15) + '...' : '-'}<br>
                                <b>QTY:</b> <span style="font-size: 16px; font-weight: bold;">${parseFloat(tag.qty).toLocaleString()}</span><br>
                                <b>Date:</b> ${tag.received_date ? tag.received_date.split(' ')[0] : '-'}
                            </div>
                            <div class="tag-print-qr">
                                <div id="${qrId}"></div>
                                <div style="font-size: 10px; margin-top: 5px; font-weight: bold;">${tag.serial_no}</div>
                            </div>
                        </div>
                    </div>
                `;
                printArea.innerHTML += html;
            });
            
            if (typeof QRCode !== 'undefined') {
                json.data.forEach((tag, index) => {
                    new QRCode(document.getElementById('qr-code-' + index), {
                        text: tag.serial_no,
                        width: 70, height: 70,
                        colorDark : "#000000", colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.M 
                    });
                });
            }
            
            setTimeout(() => {
                window.print();
                printArea.classList.add('d-none');
                printArea.innerHTML = ''; 
            }, 500);
        }
    } catch(err) {
        console.error("Print Error:", err);
        Swal.fire('Print Error', 'ไม่สามารถสร้างสติ๊กเกอร์ได้', 'error');
    }
}