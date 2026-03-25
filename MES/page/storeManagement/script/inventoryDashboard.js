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

            // Table View
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
                        </div>
                    </td>
                </tr>
            `;

            // Card View
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

async function checkPendingApprovals() {
    if (typeof CAN_MANAGE_WH === 'undefined' || !CAN_MANAGE_WH) return;

    try {
        const res = await fetchAPI('get_pending_counts', 'GET');
        const btn = document.getElementById('btnApprovalModal');
        const badge = document.getElementById('badgePendingCount');
        
        if (res && btn && badge) {
            btn.classList.remove('d-none');
            if (res.count > 0) {
                badge.innerText = res.count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) { console.error('Failed to check approvals', e); }
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