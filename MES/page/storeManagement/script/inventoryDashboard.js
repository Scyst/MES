// MES/page/storeManagement/script/inventoryDashboard.js
"use strict";

let currentPage = 1;
let rowsPerPage = 100;
let totalPages = 1;
let detailsModalInstance;
let searchTimer;
let cycleCountModal;
let approvalModal;
let ccHistoryModal;

document.addEventListener('DOMContentLoaded', () => {
    const detailsModalEl = document.getElementById('detailsModal');
    if (detailsModalEl) detailsModalInstance = new bootstrap.Modal(detailsModalEl);

    const historyModalEl = document.getElementById('ccHistoryModal');
    if (historyModalEl) ccHistoryModal = new bootstrap.Modal(historyModalEl);

    const cycleCountModalEl = document.getElementById('cycleCountModal');
    if (cycleCountModalEl) cycleCountModal = new bootstrap.Modal(cycleCountModalEl);

    const approvalModalEl = document.getElementById('approvalModal');
    if (approvalModalEl) approvalModal = new bootstrap.Modal(approvalModalEl);

    loadDashboardData();

    document.getElementById('locationFilter')?.addEventListener('change', () => { currentPage = 1; loadDashboardData(); });
    document.getElementById('materialFilter')?.addEventListener('change', () => { currentPage = 1; loadDashboardData(); });
    document.getElementById('hideZeroStock')?.addEventListener('change', () => { currentPage = 1; loadDashboardData(); });
    document.getElementById('filterSearch')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentPage = 1; 
            loadDashboardData();
        }, 500);
    });

    checkPendingApprovals();
    setInterval(checkPendingApprovals, 30000);
});

async function loadDashboardData() {
    const locId = document.getElementById('locationFilter')?.value || 'ALL';
    const matType = document.getElementById('materialFilter')?.value || 'ALL';
    const hideZero = document.getElementById('hideZeroStock')?.checked || false;
    const searchStr = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');

    const tbody = document.getElementById('dashboardTbody');
    const cardContainer = document.getElementById('dashboardCardContainer');
    
    if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-primary mb-2"></i><br>กำลังโหลดข้อมูล...</td></tr>';
    if (cardContainer) cardContainer.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin fa-2x mb-3"></i><br>กำลังโหลดข้อมูล...</div>';

    try {
        const queryParams = `get_inventory_dashboard&location_id=${locId}&material_type=${matType}&hide_zero=${hideZero}&search=${searchStr}&page=${currentPage}&limit=${rowsPerPage}`;
        const result = await fetchAPI(queryParams, 'GET');

        if (result.kpi) {
            document.getElementById('totalSkus').innerText = result.kpi.total_skus.toLocaleString();
            document.getElementById('outOfStock').innerText = result.kpi.out_of_stock.toLocaleString();
            document.getElementById('totalPending').innerText = parseFloat(result.kpi.total_pending_qty).toLocaleString();
            document.getElementById('totalValue').innerText = parseFloat(result.kpi.total_value).toLocaleString(undefined, {minimumFractionDigits: 2});
        }

        if (!result.data || result.data.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">ไม่พบข้อมูลสินค้าคงคลัง</td></tr>';
            if (cardContainer) cardContainer.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-box-open fa-3x mb-3 text-secondary opacity-50"></i><br>ไม่พบข้อมูลในระบบ</div>';
            document.getElementById('paginationControls').innerHTML = '';
            document.getElementById('paginationInfo').innerText = 'แสดง 0 ถึง 0 จาก 0 รายการ';
            return;
        }

        let htmlTable = '';
        let htmlCards = '';

        result.data.forEach((row, index) => {
            const availableQty = parseFloat(row.available_qty);
            const pendingQty = parseFloat(row.pending_qty);
            const totalQty = parseFloat(row.total_qty);
            const isOutOfStock = availableQty <= 0;
            const runningNumber = ((currentPage - 1) * rowsPerPage) + index + 1;
            const badgeType = row.material_type === 'RM' ? 'bg-primary' : (row.material_type === 'FG' ? 'bg-success' : 'bg-secondary');
            const rowClass = isOutOfStock ? 'row-out-of-stock' : '';
            const borderLeftColor = isOutOfStock ? 'var(--bs-danger)' : (availableQty > 0 ? 'var(--bs-success)' : 'var(--bs-secondary)');

            htmlTable += `
                <tr class="${rowClass}">
                    <td class="text-center text-muted">${runningNumber}</td>
                    <td class="fw-bold text-primary">${escapeHTML(row.item_no)}</td>
                    <td class="text-truncate" style="max-width: 250px;" title="${escapeHTML(row.part_description || '-')}">${escapeHTML(row.part_description || '-')}</td>
                    <td class="text-center"><span class="badge ${badgeType}">${escapeHTML(row.material_type)}</span></td>
                    <td class="text-end text-warning fw-bold">${pendingQty.toLocaleString()}</td>
                    <td class="text-end fw-bold ${isOutOfStock ? 'text-danger' : 'text-success'}">${availableQty.toLocaleString()}</td>
                    <td class="text-end fw-bold text-dark">${totalQty.toLocaleString()}</td>
                    <td class="text-end text-muted">${parseFloat(row.unit_price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td class="text-end text-primary fw-bold">${parseFloat(row.total_value).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td class="text-center">
                        <div class="btn-group shadow-sm">
                            <button class="btn btn-sm btn-light border text-secondary" onclick="showItemDetails(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}')" title="ดูพิกัดสต็อก">
                                <i class="fas fa-search-location"></i>
                            </button>
                            <button class="btn btn-sm btn-light border text-warning" onclick="openCycleCountModal(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}')" title="นับ/ปรับสต็อก">
                                <i class="fas fa-clipboard-list"></i>
                            </button>
                            <button class="btn btn-sm btn-light border text-info" onclick="openCreateTransferModal(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}', ${availableQty})" title="โอนย้าย/ส่ง Shipping">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;

            htmlCards += `
                <div class="card shadow-sm mb-3 border-0" style="border-left: 4px solid ${borderLeftColor} !important; border-radius: 0.5rem;">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <div>
                                <span class="badge ${badgeType} me-1">${escapeHTML(row.material_type)}</span>
                                ${isOutOfStock ? '<span class="badge bg-danger">OUT OF STOCK</span>' : ''}
                            </div>
                            <div class="btn-group shadow-sm">
                                <button class="btn btn-sm btn-light border text-secondary" onclick="showItemDetails(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}')" style="width: 32px; height: 32px;"><i class="fas fa-search-location"></i></button>
                                <button class="btn btn-sm btn-light border text-warning" onclick="openCycleCountModal(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}')" style="width: 32px; height: 32px;"><i class="fas fa-clipboard-list"></i></button>
                            </div>
                            <button class="btn btn-sm btn-light border text-info" onclick="openCreateTransferModal(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}', ${availableQty})" title="โอนย้าย/ส่ง Shipping">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                        </div>
                        
                        <h6 class="fw-bold text-primary mb-1 mt-1" style="font-size: 1.1rem;">${escapeHTML(row.item_no)}</h6>
                        <div class="text-muted small mb-2 text-truncate">${escapeHTML(row.part_description || '-')}</div>
                        
                        <div class="row g-2 text-center mt-2 border-top pt-2" style="font-size: 0.85rem;">
                            <div class="col-4 border-end">
                                <div class="text-muted" style="font-size: 0.7rem;">Pending</div>
                                <div class="fw-bold text-warning">${pendingQty.toLocaleString()}</div>
                            </div>
                            <div class="col-4 border-end">
                                <div class="text-muted" style="font-size: 0.7rem;">Available</div>
                                <div class="fw-bold ${isOutOfStock ? 'text-danger' : 'text-success'} fs-6">${availableQty.toLocaleString()}</div>
                            </div>
                            <div class="col-4">
                                <div class="text-muted" style="font-size: 0.7rem;">Total</div>
                                <div class="fw-bold text-dark">${totalQty.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        if (tbody) tbody.innerHTML = htmlTable;
        if (cardContainer) cardContainer.innerHTML = htmlCards;

        if (result.pagination) {
            totalPages = result.pagination.total_pages || 1;
            renderPaginationControls(result.pagination.total_records);
        }

    } catch (err) {
        console.error("Dashboard Load Error:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle"></i> โหลดข้อมูลล้มเหลว</td></tr>`;
        if (cardContainer) cardContainer.innerHTML = `<div class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>โหลดข้อมูลล้มเหลว</div>`;
    }
}

function renderPaginationControls(totalRecords) {
    const start = totalRecords === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const end = Math.min(currentPage * rowsPerPage, totalRecords);
    document.getElementById('paginationInfo').innerText = `แสดง ${start} ถึง ${end} จาก ${totalRecords} รายการ`;

    const paginationUl = document.getElementById('paginationControls');
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
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadDashboardData();
}

function changeRowsPerPage() {
    rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
    currentPage = 1;
    loadDashboardData();
}

async function showItemDetails(itemId, itemNo, itemDesc) {
    document.getElementById('modalItemNo').innerText = itemNo;
    document.getElementById('modalItemDesc').innerText = itemDesc || '-';
    
    const availTbody = document.getElementById('modalAvailTbody');
    const pendTbody = document.getElementById('modalPendTbody');
    
    availTbody.innerHTML = '<tr><td colspan="2" class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    pendTbody.innerHTML = '<tr><td colspan="2" class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    
    detailsModalInstance.show();

    try {
        const res = await fetchAPI(`get_item_details&item_id=${itemId}`, 'GET');
        
        availTbody.innerHTML = '';
        if (res.available_details && res.available_details.length > 0) {
            res.available_details.forEach(loc => {
                availTbody.innerHTML += `<tr><td>${escapeHTML(loc.location_name)}</td><td class="text-end fw-bold text-success">${parseFloat(loc.qty).toLocaleString()}</td></tr>`;
            });
        } else {
            availTbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">ไม่มีของในคลัง</td></tr>';
        }

        pendTbody.innerHTML = '';
        if (res.pending_details && res.pending_details.length > 0) {
            res.pending_details.forEach(p => {
                pendTbody.innerHTML += `
                    <tr>
                        <td>
                            ${escapeHTML(p.tracking_no)}
                            <div class="small text-muted">PO: ${escapeHTML(p.po_number || '-')}</div>
                        </td>
                        <td class="text-end fw-bold text-warning align-middle">${parseFloat(p.qty).toLocaleString()}</td>
                    </tr>`;
            });
        } else {
            pendTbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">ไม่มีของรอรับเข้า</td></tr>';
        }
        
    } catch (err) {
        availTbody.innerHTML = '<tr><td colspan="2" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
        pendTbody.innerHTML = '<tr><td colspan="2" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
    }
}

function openCycleCountModal(itemId, itemNo, itemDesc) {
    document.getElementById('cycleCountForm').reset();
    document.getElementById('ccItemId').value = itemId;
    document.getElementById('ccItemNo').innerText = itemNo;
    document.getElementById('ccItemDesc').innerText = itemDesc || '-';

    const locSelect = document.getElementById('ccLocation');
    const filterSelect = document.getElementById('locationFilter');
    locSelect.innerHTML = '<option value="" selected disabled>เลือกคลังสินค้าที่ตรวจนับ...</option>';
    
    Array.from(filterSelect.options).forEach(opt => {
        if (opt.value !== 'ALL') {
            locSelect.add(new Option(opt.text, opt.value));
        }
    });

    const currentFilterLoc = document.getElementById('locationFilter').value;
    if (currentFilterLoc !== 'ALL') {
        locSelect.value = currentFilterLoc;
    }

    cycleCountModal.show();
    setTimeout(() => document.getElementById('ccActualQty').focus(), 500);
}

async function submitCycleCount(e) {
    e.preventDefault();
    
    if (!confirm('ยืนยันส่งยอดที่นับได้? (ระบบจะส่งคำขอไปให้หัวหน้าอนุมัติ)')) return;

    const formData = new FormData();
    formData.append('item_id', document.getElementById('ccItemId').value);
    formData.append('location_id', document.getElementById('ccLocation').value);
    formData.append('actual_qty', document.getElementById('ccActualQty').value);
    formData.append('remark', document.getElementById('ccRemark').value);

    const res = await fetchAPI('submit_cycle_count', 'POST', formData, 'btnSubmitCC');
    if (res) {
        showToast(res.message, 'var(--bs-success)');
        cycleCountModal.hide();
        checkPendingApprovals();
    }
}

function updateMainAlertBadge() {
    const c1 = parseInt(document.getElementById('badgePendingCount').innerText) || 0;
    const c2 = parseInt(document.getElementById('badgeTransferCount').innerText) || 0;
    const mainBadge = document.getElementById('badgeTotalAlert');
    
    if (mainBadge) {
        if (c1 + c2 > 0) mainBadge.classList.remove('d-none');
        else mainBadge.classList.add('d-none');
    }
}

async function checkPendingApprovals() {
    if (typeof CAN_MANAGE_WH === 'undefined' || !CAN_MANAGE_WH) return;
    try {
        const res = await fetchAPI('get_pending_counts', 'GET');
        const badge = document.getElementById('badgePendingCount');
        if (res && badge) {
            if (res.count > 0) {
                badge.innerText = res.count;
                badge.classList.remove('d-none');
            } else {
                badge.innerText = '0';
                badge.classList.add('d-none');
            }
            updateMainAlertBadge();
        }
    } catch (e) { console.error(e); }
}

async function openApprovalModal() {
    const tbody = document.getElementById('approvalTbody');
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-warning"></i></td></tr>';
    approvalModal.show();

    try {
        const res = await fetchAPI('get_pending_counts', 'GET');
        tbody.innerHTML = '';
        
        if (!res.data || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">ไม่มีรายการรออนุมัติ</td></tr>';
            document.getElementById('badgePendingCount').style.display = 'none';
            return;
        }

        res.data.forEach(row => {
            const diff = parseFloat(row.diff_qty);
            const diffClass = diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-muted');
            const diffSign = diff > 0 ? '+' : '';
            
            const tr = `
                <tr>
                    <td class="text-muted small d-none d-md-table-cell">${row.counted_at.substring(0,16)}</td>
                    <td class="fw-bold text-primary" title="${escapeHTML(row.part_description)}">${row.item_no}</td>
                    <td>${escapeHTML(row.location_name)}</td>
                    <td class="text-end fw-bold text-secondary d-none d-md-table-cell">${parseFloat(row.system_qty).toLocaleString()}</td>
                    <td class="text-end fw-bold text-primary fs-6">${parseFloat(row.actual_qty).toLocaleString()}</td>
                    <td class="text-end fw-bold ${diffClass}">${diffSign}${diff.toLocaleString()}</td>
                    <td class="small text-truncate d-none d-lg-table-cell" style="max-width: 150px;" title="${escapeHTML(row.remark)}">${escapeHTML(row.remark || '-')}</td>
                    <td class="small d-none d-md-table-cell">${escapeHTML(row.counter_name)}</td>
                    <td class="text-center">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-success" onclick="processApproval(${row.count_id}, 'APPROVE')" title="อนุมัติ"><i class="fas fa-check"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="processApproval(${row.count_id}, 'REJECT')" title="ไม่อนุมัติ"><i class="fas fa-times"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += tr;
        });

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

async function processApproval(countId, actionType) {
    let msg = actionType === 'APPROVE' ? 'ยืนยันการอนุมัติเพื่อปรับยอดสต็อกจริง?' : 'ไม่อนุมัติและปัดตกคำขอนี้?';
    if (!confirm(msg)) return;

    const formData = new FormData();
    formData.append('count_id', countId);
    formData.append('approval_action', actionType);

    const res = await fetchAPI('approve_cycle_count', 'POST', formData);
    if (res) {
        if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
        openApprovalModal();
        loadDashboardData();
        checkPendingApprovals();
    }
}

async function openCcHistoryModal() {
    ccHistoryModal.show();
    const tbody = document.getElementById('ccHistoryTbody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-info"></i></td></tr>';
    
    try {
        const res = await fetchAPI('get_cycle_count_history', 'GET');
        tbody.innerHTML = '';
        
        if (!res.data || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">ยังไม่มีประวัติการปรับยอด</td></tr>';
            return;
        }

        res.data.forEach(row => {
            const diff = parseFloat(row.diff_qty);
            const diffClass = diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-muted');
            const diffSign = diff > 0 ? '+' : '';
            
            const badge = row.status === 'APPROVED' 
                ? '<span class="badge bg-success">APPROVED</span>' 
                : '<span class="badge bg-danger">REJECTED</span>';

            const timeStr = row.approved_at ? row.approved_at.substring(0, 16) : '-';

            const tr = `
                <tr>
                    <td class="text-muted small d-none d-md-table-cell">${timeStr}</td>
                    <td class="fw-bold text-primary" title="${escapeHTML(row.part_description)}">${row.item_no}</td>
                    <td>${escapeHTML(row.location_name)}</td>
                    <td class="text-end fw-bold text-secondary d-none d-md-table-cell">${parseFloat(row.system_qty).toLocaleString()}</td>
                    <td class="text-end fw-bold text-dark">${parseFloat(row.actual_qty).toLocaleString()}</td>
                    <td class="text-end fw-bold ${diffClass}">${diffSign}${diff.toLocaleString()}</td>
                    <td class="text-center">${badge}</td>
                    <td class="small d-none d-lg-table-cell">
                        <div><span class="text-muted">นับ:</span> ${escapeHTML(row.counter_name)}</div>
                        <div><span class="text-muted">อนุมัติ:</span> <span class="fw-bold">${escapeHTML(row.approver_name)}</span></div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += tr;
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดประวัติ</td></tr>';
    }
}

function toggleMobileCards() {
    const container = document.getElementById('kpiContainer');
    const btn = document.getElementById('btnToggleCards');
    const icon = btn.querySelector('i');
    
    if (container.classList.contains('d-none')) {
        container.classList.remove('d-none');
        btn.classList.remove('btn-primary', 'text-white');
        btn.classList.add('btn-outline-primary');
        icon.className = 'fas fa-eye-slash'; 
    } else {
        container.classList.add('d-none');
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('btn-primary', 'text-white');
        icon.className = 'fas fa-eye'; 
    }
}

// --- ระบบโอนย้าย (Stock Transfer) ---
let createTransferModalInst;
let confirmTransferModalInst;

document.addEventListener('DOMContentLoaded', () => {
    const ctModalEl = document.getElementById('createTransferModal');
    if(ctModalEl) createTransferModalInst = new bootstrap.Modal(ctModalEl);
    
    const cfModalEl = document.getElementById('confirmTransferModal');
    if(cfModalEl) confirmTransferModalInst = new bootstrap.Modal(cfModalEl);

    checkPendingTransfers();
    setInterval(checkPendingTransfers, 30000); // เช็คยอดรอส่งทุก 30 วิ
});

function openCreateTransferModal(itemId, itemNo, itemDesc, availQty) {
    document.getElementById('formCreateTransfer').reset();
    document.getElementById('transItemId').value = itemId;
    document.getElementById('transItemNo').innerText = itemNo;
    document.getElementById('transItemDesc').innerText = itemDesc || '-';
    document.getElementById('transAvailQty').innerText = parseFloat(availQty).toLocaleString();
    
    // โหลด Location ใส่ Dropdown
    const filterSelect = document.getElementById('locationFilter');
    const fromLoc = document.getElementById('transFromLoc');
    const toLoc = document.getElementById('transToLoc');
    
    fromLoc.innerHTML = '<option value="" selected disabled>เลือกต้นทาง...</option>';
    toLoc.innerHTML = '<option value="" selected disabled>เลือกปลายทาง...</option>';
    
    Array.from(filterSelect.options).forEach(opt => {
        if (opt.value !== 'ALL') {
            fromLoc.add(new Option(opt.text, opt.value));
            toLoc.add(new Option(opt.text, opt.value));
            
            // ตั้งค่า Default ปลายทางเป็น Shipping ถ้ามีคำว่า Shipping
            if(opt.text.toUpperCase().includes('SHIPPING')) {
                toLoc.value = opt.value;
            }
        }
    });

    createTransferModalInst.show();
    setTimeout(() => document.getElementById('transQty').focus(), 500);
}

async function submitTransferRequest(e) {
    e.preventDefault();
    if (!confirm('ยืนยันสร้างรายการโอนย้าย? (สถานะจะเป็น รอรับของ)')) return;

    const formData = new FormData();
    formData.append('item_id', document.getElementById('transItemId').value);
    formData.append('from_loc_id', document.getElementById('transFromLoc').value);
    formData.append('to_loc_id', document.getElementById('transToLoc').value);
    formData.append('quantity', document.getElementById('transQty').value);
    formData.append('remark', document.getElementById('transRemark').value);

    const res = await fetchAPI('create_transfer_request', 'POST', formData, 'btnSubmitTransfer');
    if (res) {
        showToast(res.message, 'var(--bs-success)');
        createTransferModalInst.hide();
        checkPendingTransfers();
        loadDashboardData(); // อัปเดตยอด Pending ทันที
    }
}

async function checkPendingTransfers() {
    try {
        const res = await fetchAPI('get_pending_transfers', 'GET');
        const badge = document.getElementById('badgeTransferCount');
        if (res && badge) {
            if (res.count > 0) {
                badge.innerText = res.count;
                badge.classList.remove('d-none');
            } else {
                badge.innerText = '0';
                badge.classList.add('d-none');
            }
            updateMainAlertBadge();
        }
    } catch (e) { console.error(e); }
}

// หน่วงเวลาพิมพ์ค้นหาใน Modal 0.5 วิ
let pendingSearchTimer;
document.getElementById('pendingSearch')?.addEventListener('input', () => {
    clearTimeout(pendingSearchTimer);
    pendingSearchTimer = setTimeout(() => { loadPendingTransfers(); }, 500);
});

// เพิ่มตัวแปรสำหรับคุม Pagination ของ Modal
let pendingCurrentPage = 1;
let pendingRowsPerPage = 100;
let pendingTotalPages = 1;

// อัปเดตฟังก์ชัน open ให้รีเซ็ตหน้ากลับไปหน้า 1 เสมอ
function openConfirmTransferModal() {
    document.getElementById('pendingTypeFilter').value = 'ALL'; 
    document.getElementById('pendingSearch').value = ''; 
    document.getElementById('selectAllTransfers').checked = false;
    pendingCurrentPage = 1; // รีเซ็ตหน้า
    updateBulkButton();
    confirmTransferModalInst.show();
    loadPendingTransfers();
}

// อัปเดตฟังก์ชันโหลดข้อมูล ให้ส่ง page และ limit ไปด้วย
async function loadPendingTransfers() {
    const tbody = document.getElementById('pendingTransferTbody');
    const typeFilter = document.getElementById('pendingTypeFilter').value;
    const searchStr = encodeURIComponent(document.getElementById('pendingSearch').value.trim());
    
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i></td></tr>';
    document.getElementById('selectAllTransfers').checked = false;
    updateBulkButton();

    try {
        // ส่งตัวแปร page และ limit ไปที่ API
        const res = await fetchAPI(`get_pending_transfers&type=${typeFilter}&search=${searchStr}&page=${pendingCurrentPage}&limit=${pendingRowsPerPage}`, 'GET');
        tbody.innerHTML = '';
        
        if (!res.data || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">ไม่มีรายการที่ตรงกับเงื่อนไข</td></tr>';
            document.getElementById('pendingPaginationInfo').innerText = 'แสดง 0 ถึง 0 จาก 0 รายการ';
            document.getElementById('pendingPaginationControls').innerHTML = '';
            return;
        }

        res.data.forEach(row => {
            const isReplacement = row.notes && row.notes.includes('Replacement');
            const typeBadge = isReplacement ? '<span class="badge bg-danger ms-1">ชดเชยของเสีย</span>' : '';

            const tr = `
                <tr>
                    <td class="text-center px-2">
                        <input class="form-check-input transfer-checkbox shadow-sm" type="checkbox" value="${row.transfer_id}" onchange="updateBulkButton()" style="transform: scale(1.2); cursor:pointer;">
                    </td>
                    <td class="px-2 text-muted small">${row.created_at.substring(0,16)}</td>
                    <td class="fw-bold text-primary" title="${escapeHTML(row.part_description)}">${escapeHTML(row.item_no)} ${typeBadge}</td>
                    <td>
                        <span class="badge bg-secondary">${escapeHTML(row.from_loc)}</span> 
                        <i class="fas fa-arrow-right text-muted mx-1"></i> 
                        <span class="badge bg-info text-dark">${escapeHTML(row.to_loc)}</span>
                    </td>
                    <td class="text-end fw-bold text-dark fs-6">${parseFloat(row.quantity).toLocaleString()}</td>
                    <td class="small">${escapeHTML(row.requester)}</td>
                    <td class="small text-truncate" style="max-width: 150px;" title="${escapeHTML(row.notes)}">${escapeHTML(row.notes || '-')}</td>
                    <td class="text-center px-3">
                        <div class="btn-group shadow-sm">
                            <button class="btn btn-sm btn-success fw-bold" onclick="processTransfer(${row.transfer_id}, 'COMPLETED')" title="รับของเข้าปลายทาง"><i class="fas fa-check"></i></button>
                            <button class="btn btn-sm btn-danger fw-bold" onclick="processTransfer(${row.transfer_id}, 'CANCELLED')" title="ยกเลิกรายการ"><i class="fas fa-times"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += tr;
        });

        // วาด Pagination
        if (res.pagination) {
            pendingTotalPages = res.pagination.total_pages || 1;
            renderPendingPagination(res.pagination.total_records);
        }

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

// ฟังก์ชันวาดปุ่ม Pagination
function renderPendingPagination(totalRecords) {
    const start = totalRecords === 0 ? 0 : ((pendingCurrentPage - 1) * pendingRowsPerPage) + 1;
    const end = Math.min(pendingCurrentPage * pendingRowsPerPage, totalRecords);
    document.getElementById('pendingPaginationInfo').innerText = `แสดง ${start} ถึง ${end} จาก ${totalRecords} รายการ`;

    const paginationUl = document.getElementById('pendingPaginationControls');
    paginationUl.innerHTML = '';
    if (pendingTotalPages <= 1) return;

    paginationUl.innerHTML += `<li class="page-item ${pendingCurrentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePendingPage(${pendingCurrentPage - 1}, event)">ก่อนหน้า</a></li>`;

    let startPage = Math.max(1, pendingCurrentPage - 2);
    let endPage = Math.min(pendingTotalPages, startPage + 4);
    if (endPage - startPage < 4) { startPage = Math.max(1, endPage - 4); }

    for (let i = startPage; i <= endPage; i++) {
        paginationUl.innerHTML += `<li class="page-item ${pendingCurrentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="changePendingPage(${i}, event)">${i}</a></li>`;
    }
    paginationUl.innerHTML += `<li class="page-item ${pendingCurrentPage === pendingTotalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePendingPage(${pendingCurrentPage + 1}, event)">ถัดไป</a></li>`;
}

function changePendingPage(page, event) {
    if (event) event.preventDefault();
    if (page < 1 || page > pendingTotalPages) return;
    pendingCurrentPage = page;
    loadPendingTransfers();
}

// ฟังก์ชัน Select All
function toggleSelectAllTransfers(checkbox) {
    const checkboxes = document.querySelectorAll('.transfer-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
    updateBulkButton();
}

// อัปเดตจำนวนและแสดงปุ่ม Bulk
function updateBulkButton() {
    const checkedCount = document.querySelectorAll('.transfer-checkbox:checked').length;
    const btnApprove = document.getElementById('btnBulkApprove');
    document.getElementById('selectedCount').innerText = checkedCount;
    
    if (checkedCount > 0) {
        btnApprove.classList.remove('d-none');
    } else {
        btnApprove.classList.add('d-none');
        document.getElementById('selectAllTransfers').checked = false;
    }
}

// ยิง API Bulk Approve
async function bulkProcessTransfer(status) {
    const checkboxes = document.querySelectorAll('.transfer-checkbox:checked');
    const transferIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (transferIds.length === 0) return;
    if (!confirm(`ยืนยันการอนุมัติรับของจำนวน ${transferIds.length} รายการ รวดเดียว?`)) return;

    const formData = new FormData();
    formData.append('transfer_ids', JSON.stringify(transferIds));
    formData.append('action_status', status);

    const res = await fetchAPI('bulk_process_transfer_request', 'POST', formData);
    if (res) {
        showToast(res.message, 'var(--bs-success)');
        loadPendingTransfers(); 
        checkPendingTransfers(); 
        loadDashboardData(); 
    }
}

async function processTransfer(transferId, status) {
    let msg = status === 'COMPLETED' ? 'ยืนยันรับของเข้าปลายทาง (ตัดสต็อกจริง)?' : 'ต้องการยกเลิกคำขอนี้ใช่หรือไม่?';
    if (!confirm(msg)) return;

    const formData = new FormData();
    formData.append('transfer_id', transferId);
    formData.append('action_status', status);

    const res = await fetchAPI('process_transfer_request', 'POST', formData);
    if (res) {
        showToast(res.message, 'var(--bs-success)');
        loadPendingTransfers();
        checkPendingTransfers();
        loadDashboardData();
    }
}