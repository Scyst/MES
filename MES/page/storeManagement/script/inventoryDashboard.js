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

const materialSubTypes = {
    'RM': [{val: 'STEEL', text: 'STEEL (เหล็ก)'}, {val: 'PLASTIC', text: 'PLASTIC (พลาสติก)'}, {val: 'CHEMICAL', text: 'CHEMICAL (เคมีภัณฑ์)'}, {val: 'PAINT', text: 'PAINT (สี)'}, {val: 'BOLT & NUT', text: 'BOLT & NUT'}, {val: 'RIVET', text: 'RIVET'}, {val: 'OTHER', text: 'OTHER (อื่นๆ)'}],
    'PKG': [{val: 'BOX', text: 'BOX (กล่องกระดาษ)'}, {val: 'PALLET', text: 'PALLET (พาเลท)'}, {val: 'LABEL', text: 'LABEL (สติ๊กเกอร์/ฉลาก)'}, {val: 'KEY', text: 'KEY'}, {val: 'BBS', text: 'BBS'}, {val: 'HANDLE', text: 'HANDLE'}, {val: 'PLASTIC BAG', text: 'PLASTIC BAG'}, {val: 'FOAM', text: 'FOAM'}, {val: 'PVC LINER', text: 'PVC LINER'}, {val: 'TRIUM', text: 'TRIUM'}, {val: 'GASSTUT', text: 'GASSTUT'}, {val: 'CASTER', text: 'CASTER (ล้อ)'}, {val: 'PLASTIC SLIDE LOCK', text: 'PLASTIC SLIDE LOCK'}, {val: 'PEARL COTTON', text: 'PEARL COTTON'}, {val: 'MANUAL', text: 'MANUAL (คู่มือ)'}, {val: 'OTHER', text: 'OTHER (อื่นๆ)'}],
    'CON': [{val: 'ACC', text: 'ACC (Accessory/อุปกรณ์ประกอบ)'}, {val: '5S', text: '5S (อุปกรณ์ 5ส.)'}, {val: 'PROD', text: 'PROD (สิ้นเปลืองไลน์ผลิต)'}, {val: 'OFFICE', text: 'OFFICE (เครื่องเขียน)'}, {val: 'PPE', text: 'PPE (อุปกรณ์เซฟตี้)'}],
    'SP': [{val: 'MECHANICAL', text: 'MECHANICAL (อะไหล่เครื่องกล)'}, {val: 'ELECTRICAL', text: 'ELECTRICAL (อะไหล่ไฟฟ้า)'}, {val: 'OTHER', text: 'OTHER (อื่นๆ)'}],
    'TOOL': [{val: 'HANDTOOL', text: 'HANDTOOL (เครื่องมือช่าง)'}, {val: 'MACHINE', text: 'MACHINE (เครื่องจักร)'}],
    'FG': [{val: 'STANDARD', text: 'STANDARD (มาตรฐาน)'}],
    'SEMI': [{val: 'STANDARD', text: 'STANDARD (มาตรฐาน)'}],
    'WIP': [{val: 'STANDARD', text: 'STANDARD (มาตรฐาน)'}],
    'OTHER': [{val: 'OTHER', text: 'OTHER (อื่นๆ)'}]
};

function setSort(sortValue, element) {
    document.getElementById('sortFilter').value = sortValue;
    const dropdownMenu = element.closest('.dropdown-menu');
    dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
    loadDashboardData();
}

function resetFilters() {
    const typeSelect = document.getElementById('locationTypeFilter');
    if (typeSelect) typeSelect.value = 'STORE';
    if (typeof updateLocationFilterDropdown === 'function') updateLocationFilterDropdown();
    
    const locSelect = document.getElementById('locationFilter');
    if (locSelect) locSelect.value = 'ALL';
    
    document.getElementById('materialFilter').value = 'ALL';
    const subTypeSelect = document.getElementById('categoryFilter');
    subTypeSelect.value = 'ALL';
    document.getElementById('hideZeroStock').checked = false;
    updateFilterSubTypeOptions('ALL');
    loadDashboardData();
}

function updateFilterSubTypeOptions(selectedType) {
    const subTypeSelect = document.getElementById('categoryFilter');
    const wrapper = document.getElementById('categoryFilterWrapper') || subTypeSelect;
    if (!subTypeSelect) return;
    
    wrapper.classList.remove('d-none');
    subTypeSelect.innerHTML = '<option value="ALL">All Sub-types</option>';
    
    if (!selectedType || selectedType === 'ALL') {
        const addedVals = new Set();
        Object.values(materialSubTypes).forEach(subArray => {
            subArray.forEach(sub => {
                if (!addedVals.has(sub.val)) {
                    addedVals.add(sub.val);
                    const opt = document.createElement('option');
                    opt.value = sub.val;
                    opt.textContent = sub.text;
                    subTypeSelect.appendChild(opt);
                }
            });
        });
    } else if (materialSubTypes[selectedType]) {
        materialSubTypes[selectedType].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.val;
            opt.textContent = sub.text;
            subTypeSelect.appendChild(opt);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateFilterSubTypeOptions('ALL');
    const detailsModalEl = document.getElementById('detailsModal');
    if (detailsModalEl) detailsModalInstance = new bootstrap.Modal(detailsModalEl);

    const historyModalEl = document.getElementById('ccHistoryModal');
    if (historyModalEl) ccHistoryModal = new bootstrap.Modal(historyModalEl);

    const cycleCountModalEl = document.getElementById('cycleCountModal');
    if (cycleCountModalEl) cycleCountModal = new bootstrap.Modal(cycleCountModalEl);

    const approvalModalEl = document.getElementById('approvalModal');
    if (approvalModalEl) approvalModal = new bootstrap.Modal(approvalModalEl);

    document.addEventListener('locationsLoaded', () => {
        loadDashboardData();
    });

    document.getElementById('locationTypeFilter')?.addEventListener('change', () => { 
        if (typeof updateLocationFilterDropdown === 'function') {
            updateLocationFilterDropdown();
        }
        currentPage = 1; 
        loadDashboardData(); 
    });
    document.getElementById('locationFilter')?.addEventListener('change', () => { currentPage = 1; loadDashboardData(); });
    document.getElementById('categoryFilter')?.addEventListener('change', () => { currentPage = 1; loadDashboardData(); });
    document.getElementById('materialFilter')?.addEventListener('change', (e) => { 
        updateFilterSubTypeOptions(e.target.value);
        currentPage = 1; 
        loadDashboardData(); 
    });
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
    const locType = document.getElementById('locationTypeFilter')?.value || 'ALL';
    const matType = document.getElementById('materialFilter')?.value || 'ALL';
    const category = document.getElementById('categoryFilter')?.value || 'ALL';
    const hideZero = document.getElementById('hideZeroStock')?.checked || false;
    const searchStr = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');
    const sortVal = document.getElementById('sortFilter')?.value || 'DEFAULT';

    const tbody = document.getElementById('dashboardTbody');
    const cardContainer = document.getElementById('dashboardCardContainer');
    
    if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-primary mb-2"></i><br>กำลังโหลดข้อมูล...</td></tr>';
    if (cardContainer) cardContainer.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin fa-2x mb-3"></i><br>กำลังโหลดข้อมูล...</div>';

    try {
        const queryParams = `get_inventory_dashboard&location_id=${locId}&location_type=${locType}&material_type=${matType}&category=${category}&hide_zero=${hideZero}&sort=${sortVal}&search=${searchStr}&page=${currentPage}&limit=${rowsPerPage}`;
        const result = await fetchAPI(queryParams, 'GET');

        if (result.kpi) {
            document.getElementById('totalSkus').innerText = parseInt(result.kpi.total_skus || 0, 10).toLocaleString();
            document.getElementById('outOfStock').innerText = parseInt(result.kpi.out_of_stock || 0, 10).toLocaleString();
            document.getElementById('totalPending').innerText = parseFloat(result.kpi.total_pending_qty || 0).toLocaleString();
            document.getElementById('totalValue').innerText = parseFloat(result.kpi.total_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
        }

        if (!result.data || result.data.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-muted">ไม่พบข้อมูลสินค้าคงคลัง</td></tr>';
            if (cardContainer) cardContainer.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-box-open fa-3x mb-3 text-secondary opacity-50"></i><br>ไม่พบข้อมูลในระบบ</div>';
            document.getElementById('paginationControls').innerHTML = '';
            document.getElementById('paginationInfo').innerText = 'แสดง 0 ถึง 0 จาก 0 รายการ';
            return;
        }

        let htmlTable = '';
        let htmlCards = '';

        result.data.forEach((row, index) => {
            const availableQty = parseInt(row.available_qty, 10) || 0;
            const pendingQty = parseInt(row.pending_qty, 10) || 0;
            const totalQty = parseInt(row.total_qty, 10) || 0;
            const isOutOfStock = availableQty <= 0;
            const runningNumber = ((currentPage - 1) * rowsPerPage) + index + 1;
            const badgeType = row.material_type === 'RM' ? 'bg-primary' : (row.material_type === 'FG' ? 'bg-success' : 'bg-secondary');
            const rowClass = isOutOfStock ? 'row-out-of-stock' : '';
            const borderLeftColor = isOutOfStock ? 'var(--bs-danger)' : (availableQty > 0 ? 'var(--bs-success)' : 'var(--bs-secondary)');

            htmlTable += `
                <tr class="${rowClass}">
                    <td class="text-center text-muted">${runningNumber}</td>
                    <td class="fw-bold text-primary">${escapeHTML(row.item_no)}</td>
                    <td class="text-muted">${escapeHTML(row.sap_no || '-')}</td>
                    <td class="text-truncate" style="max-width: 250px;" title="${escapeHTML(row.part_description || '-')}">${escapeHTML(row.part_description || '-')}</td>
                    <td class="text-center"><span class="badge ${badgeType}">${escapeHTML(row.material_type)}</span></td>
                    <td class="text-end text-warning fw-bold">${pendingQty.toLocaleString()}</td>
                    <td class="text-end fw-bold ${isOutOfStock ? 'text-danger' : 'text-success'}" onclick="showItemDetails(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}')" title="คลิกเพื่อดูพิกัดและแท็กสินค้า" style="cursor: pointer;"><u>${availableQty.toLocaleString()}</u></td>
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
                        
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div class="d-flex flex-wrap gap-1">
                                <span class="badge ${badgeType}">${escapeHTML(row.material_type)}</span>
                                ${isOutOfStock ? '<span class="badge bg-danger">OUT OF STOCK</span>' : ''}
                            </div>
                            
                            <div class="btn-group shadow-sm flex-shrink-0 ms-2">
                                <button class="btn btn-sm btn-light border text-secondary" onclick="showItemDetails(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}')" style="width: 32px; height: 32px; padding:0;" title="ดูพิกัด">
                                    <i class="fas fa-search-location"></i>
                                </button>
                                <button class="btn btn-sm btn-light border-top border-bottom border-secondary-subtle text-warning" onclick="openCycleCountModal(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}')" style="width: 32px; height: 32px; padding:0;" title="นับ/ปรับสต็อก">
                                    <i class="fas fa-clipboard-list"></i>
                                </button>
                                <button class="btn btn-sm btn-light border text-info" onclick="openCreateTransferModal(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}', ${availableQty})" style="width: 32px; height: 32px; padding:0;" title="โอนย้าย/ส่ง Shipping">
                                    <i class="fas fa-exchange-alt"></i>
                                </button>
                            </div>
                        </div>
                        
                        <h6 class="fw-bold text-primary mb-1 mt-1" style="font-size: 1.1rem;">${escapeHTML(row.item_no)}</h6>
                        <div class="text-muted small mb-2 text-truncate">${escapeHTML(row.part_description || '-')}</div>
                        
                        <div class="row g-2 text-center mt-2 border-top pt-2" style="font-size: 0.85rem;">
                            <div class="col-4 border-end">
                                <div class="text-muted" style="font-size: 0.7rem;">Pending</div>
                                <div class="fw-bold text-warning">${pendingQty.toLocaleString()}</div>
                            </div>
                            <div class="col-4 border-end" onclick="showItemDetails(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description)}')" title="คลิกเพื่อดูพิกัดและแท็กสินค้า" style="cursor: pointer;">
                                <div class="text-muted" style="font-size: 0.7rem;">Available</div>
                                <div class="fw-bold ${isOutOfStock ? 'text-danger' : 'text-success'} fs-6"><u>${availableQty.toLocaleString()}</u></div>
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
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle"></i> โหลดข้อมูลล้มเหลว</td></tr>`;
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
    const tagsTbody = document.getElementById('modalTagsTbody');
    
    availTbody.innerHTML = '<tr><td colspan="2" class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    pendTbody.innerHTML = '<tr><td colspan="2" class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    if(tagsTbody) tagsTbody.innerHTML = '<tr><td colspan="2" class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    
    detailsModalInstance.show();

    try {
        const locFilterId = document.getElementById('locationFilter')?.value || 'ALL';
        const [res, tagRes] = await Promise.all([
            fetchAPI(`get_item_details&item_id=${itemId}&location_id=${locFilterId}`, 'GET'),
            fetchAPI(`get_available_tags_for_item&item_code=${encodeURIComponent(itemNo)}&item_id=${itemId}&location_id=${locFilterId}`, 'GET').catch(e => ({data: []}))
        ]);
        
        let totalSystemStock = 0;
        let storeSystemStock = 0;
        let storeTagsStock = 0;
        
        availTbody.innerHTML = '';
        const overviewList = document.getElementById('overviewLocationsList');
        if(overviewList) overviewList.innerHTML = '';
        
        if (res.available_details && res.available_details.length > 0) {
            res.available_details.forEach(loc => {
                const qty = parseFloat(loc.qty);
                totalSystemStock += qty;
                if (loc.location_id == 1008 || (loc.location_name && loc.location_name.toUpperCase().includes('STORE'))) {
                    storeSystemStock += qty;
                }
                
                availTbody.innerHTML += `<tr style="height: 61px;"><td>${escapeHTML(loc.location_name)}</td><td class="text-end fw-bold ${qty < 0 ? 'text-danger' : 'text-success'} align-middle">${qty.toLocaleString()}</td></tr>`;
                
                if (overviewList) {
                    overviewList.innerHTML += `
                        <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                            <span class="text-dark fw-bold"><i class="fas fa-map-marker-alt text-primary me-2"></i> ${escapeHTML(loc.location_name)}</span>
                            <span class="badge ${qty < 0 ? 'bg-danger' : 'bg-success'} rounded-pill fs-6">${qty.toLocaleString()}</span>
                        </div>
                    `;
                }
            });
        } else {
            availTbody.innerHTML = '<tr style="height: 61px;"><td colspan="2" class="text-center text-muted align-middle">ไม่มีของในคลัง</td></tr>';
            if (overviewList) overviewList.innerHTML = '<div class="text-center text-muted py-3">ไม่มีสต็อกในระบบ</div>';
        }

        const totalQtyEl = document.getElementById('modalItemTotalQty');
        if (totalQtyEl) {
            totalQtyEl.innerHTML = `
                <div class="text-muted small">ยอดรวมทั้งโรงงาน</div>
                <h4 class="fw-bold ${totalSystemStock < 0 ? 'text-danger' : 'text-success'} mb-0">${totalSystemStock.toLocaleString()}</h4>
            `;
        }

        pendTbody.innerHTML = '';
        if (res.pending_details && res.pending_details.length > 0) {
            res.pending_details.forEach(p => {
                pendTbody.innerHTML += `
                    <tr style="height: 61px;">
                        <td>
                            ${escapeHTML(p.tracking_no)}
                            <div class="small text-muted">PO: ${escapeHTML(p.po_number || '-')}</div>
                        </td>
                        <td class="text-end fw-bold text-warning align-middle">${parseInt(p.qty, 10).toLocaleString()}</td>
                    </tr>`;
            });
        } else {
            pendTbody.innerHTML = '<tr style="height: 61px;"><td colspan="2" class="text-center text-muted align-middle">ไม่มีของรอรับเข้า</td></tr>';
        }
        
        if (tagsTbody) {
            tagsTbody.innerHTML = '';
            if (tagRes.data && tagRes.data.length > 0) {
                tagRes.data.forEach(t => {
                    const qty = parseInt(t.current_qty, 10);
                    if (t.location_id == 1008 || (t.location_name && t.location_name.toUpperCase().includes('STORE'))) {
                        storeTagsStock += qty;
                    }
                    
                    tagsTbody.innerHTML += `<tr style="height: 61px;">
                        <td>
                            ${escapeHTML(t.serial_no)}
                            <div class="small text-muted">Loc: ${escapeHTML(t.location_name || '-')} | Pallet: ${escapeHTML(t.warehouse_no || '-')}</div>
                        </td>
                        <td class="text-end fw-bold text-primary align-middle text-nowrap">
                            ${qty.toLocaleString()}
                            ${CAN_MANAGE_WH ? `<button class="btn btn-sm btn-outline-danger ms-2 py-0 px-2 shadow-sm border-0" onclick="forceIssueTag('${t.serial_no}')" title="ตัดจ่ายแท็กนี้ออกจากสต็อก (ชดเชยการใช้มือ)"><i class="fas fa-sign-out-alt"></i></button>` : ''}
                        </td>
                    </tr>`;
                });
            } else {
                tagsTbody.innerHTML = '<tr style="height: 61px;"><td colspan="2" class="text-center text-muted align-middle">ไม่มีข้อมูลแท็ก</td></tr>';
            }
        }
        
        const mismatchWarning = document.getElementById('mismatchWarningContainer');
        if (mismatchWarning) {
            if (storeSystemStock !== storeTagsStock) {
                mismatchWarning.classList.remove('d-none');
                mismatchWarning.innerHTML = `
                    <div class="alert alert-danger shadow-sm border-0 d-flex flex-wrap align-items-center justify-content-between p-3 rounded">
                        <div class="mb-2 mb-md-0">
                            <h6 class="fw-bold mb-1 text-danger"><i class="fas fa-exclamation-triangle me-2"></i> สต็อกคลัง Store ไม่ตรงกับยอดแท็กจริง!</h6>
                            <div class="small text-dark">
                                ยอดในระบบ (Store 1008): <strong class="fs-6">${storeSystemStock.toLocaleString()}</strong> 
                                <span class="mx-2 text-muted">|</span> 
                                ยอดแท็กจริงทั้งหมด: <strong class="fs-6 text-success">${storeTagsStock.toLocaleString()}</strong>
                            </div>
                        </div>
                        <button class="btn btn-warning fw-bold shadow-sm flex-shrink-0" onclick="syncStoreStockWithTags(${itemId})">
                            <i class="fas fa-sync-alt me-1"></i> ปรับสต็อกให้ตรงกับแท็ก
                        </button>
                    </div>
                `;
            } else {
                mismatchWarning.classList.add('d-none');
            }
        }
        
    } catch (err) {
        console.error(err);
        availTbody.innerHTML = '<tr><td colspan="2" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
        pendTbody.innerHTML = '<tr><td colspan="2" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
        if(tagsTbody) tagsTbody.innerHTML = '<tr><td colspan="2" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
    }
}

async function syncStoreStockWithTags(itemId) {
    const result = await Swal.fire({
        title: 'ยืนยันปรับยอดสต็อก?',
        html: `ระบบจะปรับยอดสต็อกของ <b>Store (1008)</b> ให้ตรงกับจำนวนแท็กที่พร้อมใช้งานจริง<br><br><small class="text-danger">*แนะนำให้ทำเฉพาะรายการที่เกิดบั๊ก Data Import ย้อนหลังเท่านั้น</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ยืนยันปรับยอด',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({ title: 'กำลังปรับยอดสต็อก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            
            const formData = new FormData();
            formData.append('item_id', itemId);
            const res = await fetchAPI('sync_store_stock_with_tags', 'POST', formData);
            
            if (res.success) {
                await Swal.fire('สำเร็จ', res.message, 'success');
                if (detailsModalInstance) detailsModalInstance.hide();
                loadDashboardData();
            } else {
                Swal.fire('ข้อผิดพลาด', res.message || 'ไม่สามารถปรับยอดได้', 'error');
            }
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
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
                    <td class="fw-bold text-primary" title="${escapeHTML(row.part_description)}">${escapeHTML(row.item_no)}</td>
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
                    <td class="fw-bold text-primary" title="${escapeHTML(row.part_description)}">${escapeHTML(row.item_no)}</td>
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

let createTransferModalInst;
let confirmTransferModalInst;

document.addEventListener('DOMContentLoaded', () => {
    const ctModalEl = document.getElementById('createTransferModal');
    if(ctModalEl) createTransferModalInst = new bootstrap.Modal(ctModalEl);
    
    const cfModalEl = document.getElementById('confirmTransferModal');
    if(cfModalEl) confirmTransferModalInst = new bootstrap.Modal(cfModalEl);

    checkPendingTransfers();
    setInterval(checkPendingTransfers, 30000);
});

function openCreateTransferModal(itemId, itemNo, itemDesc, availQty) {
    document.getElementById('formCreateTransfer').reset();
    document.getElementById('transItemId').value = itemId;
    document.getElementById('transItemNo').innerText = itemNo;
    document.getElementById('transItemDesc').innerText = itemDesc || '-';
    document.getElementById('transAvailQty').innerText = parseFloat(availQty).toLocaleString();
    
    const filterSelect = document.getElementById('locationFilter');
    const fromLoc = document.getElementById('transFromLoc');
    const toLoc = document.getElementById('transToLoc');
    
    fromLoc.innerHTML = '<option value="" selected disabled>เลือกต้นทาง...</option>';
    toLoc.innerHTML = '<option value="" selected disabled>เลือกปลายทาง...</option>';
    
    Array.from(filterSelect.options).forEach(opt => {
        if (opt.value !== 'ALL') {
            fromLoc.add(new Option(opt.text, opt.value));
            toLoc.add(new Option(opt.text, opt.value));
            
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
        loadDashboardData();
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

let pendingSearchTimer;
document.getElementById('pendingSearch')?.addEventListener('input', () => {
    clearTimeout(pendingSearchTimer);
    pendingSearchTimer = setTimeout(() => { loadPendingTransfers(); }, 500);
});

let pendingCurrentPage = 1;
let pendingRowsPerPage = 100;
let pendingTotalPages = 1;

function openConfirmTransferModal() {
    document.getElementById('pendingTypeFilter').value = 'ALL'; 
    document.getElementById('pendingSearch').value = ''; 
    document.getElementById('selectAllTransfers').checked = false;
    pendingCurrentPage = 1;
    updateBulkButton();
    confirmTransferModalInst.show();
    loadPendingTransfers();
}

async function loadPendingTransfers() {
    const tbody = document.getElementById('pendingTransferTbody');
    const typeFilter = document.getElementById('pendingTypeFilter').value;
    const searchStr = encodeURIComponent(document.getElementById('pendingSearch').value.trim());
    
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i></td></tr>';
    document.getElementById('selectAllTransfers').checked = false;
    updateBulkButton();

    try {
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

        if (res.pagination) {
            pendingTotalPages = res.pagination.total_pages || 1;
            renderPendingPagination(res.pagination.total_records);
        }

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

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

function toggleSelectAllTransfers(checkbox) {
    const checkboxes = document.querySelectorAll('.transfer-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
    updateBulkButton();
}

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

window.exportInventoryData = async function() {
    const locId = document.getElementById('locationFilter')?.value || 'ALL';
    const locSelect = document.getElementById('locationFilter');
    const locName = locSelect ? locSelect.options[locSelect.selectedIndex].text : 'All Locations';
    const matType = document.getElementById('materialFilter')?.value || 'ALL';
    const hideZero = document.getElementById('hideZeroStock')?.checked || false;
    const searchStr = document.getElementById('filterSearch')?.value.trim() || '';

    let optionsHtml = `
        <div class="text-start mt-3" style="font-size: 0.95rem;">
            <div class="form-check mb-3">
                <input class="form-check-input" type="radio" name="exportType" id="expCurrent" value="CURRENT" checked>
                <label class="form-check-label fw-bold text-primary" for="expCurrent">
                    1. Export ตามตารางที่เห็นอยู่ตอนนี้
                    <div class="small text-muted fw-normal mt-1">ใช้เงื่อนไขคลัง, ประเภทสินค้า และคำค้นหาปัจจุบัน</div>
                </label>
            </div>
    `;

    if (locId !== 'ALL') {
        optionsHtml += `
            <div class="form-check mb-3">
                <input class="form-check-input" type="radio" name="exportType" id="expFilter" value="FILTER">
                <label class="form-check-label fw-bold text-success" for="expFilter">
                    2. Export คลัง "${escapeHTML(locName)}" ทั้งหมด
                    <div class="small text-muted fw-normal mt-1">โหลดของทั้งหมดในคลังนี้ (ยกเลิกคำค้นหา)</div>
                </label>
            </div>
        `;
    }

    optionsHtml += `
            <div class="form-check mb-2">
                <input class="form-check-input" type="radio" name="exportType" id="expAll" value="ALL">
                <label class="form-check-label fw-bold text-danger" for="expAll">
                    3. Export ทุกคลัง (แยกชีท + ผูกสูตรรวม)
                    <div class="small text-muted fw-normal mt-1">แต่ละคลังจะแยกเป็น 1 ชีท และมีชีท Summary รวมยอดด้วยสูตร</div>
                </label>
            </div>
        </div>
    `;

    const { value: exportType } = await Swal.fire({
        title: 'เลือกรูปแบบการ Export',
        html: optionsHtml,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-file-excel me-1"></i> เริ่ม Export',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#198754',
        preConfirm: () => {
            const checked = document.querySelector('input[name="exportType"]:checked');
            return checked ? checked.value : null;
        }
    });

    if (!exportType) return;

    try {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'กำลังเตรียมข้อมูล Export...',
                html: 'โปรดรอสักครู่ ระบบกำลังดึงข้อมูลทั้งหมด...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
        }

        if (typeof XLSX === 'undefined') {
            throw new Error("XLSX library not found");
        }

        const wb = XLSX.utils.book_new();
        const dateStr = new Date().toISOString().slice(0, 10);

        if (exportType === 'ALL') {
            // โหมด ALL: ดึงข้อมูลแต่ละคลังแยกกัน และดึงภาพรวมสำหรับ Summary
            const allLocs = Array.from(document.getElementById('locationFilter').options)
                .filter(opt => opt.value !== 'ALL')
                .map(opt => ({ 
                    id: opt.value, 
                    name: opt.text.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F ]/g, '').trim().substring(0,30) 
                }));

            const locType = document.getElementById('locationTypeFilter')?.value || 'ALL';
            const category = document.getElementById('categoryFilter')?.value || 'ALL';

            const sortVal = document.getElementById('sortFilter')?.value || 'DEFAULT';
            const masterRes = await fetchAPI(`get_inventory_dashboard&location_id=ALL&location_type=${locType}&material_type=${matType}&category=${category}&hide_zero=${hideZero}&sort=${sortVal}&search=&page=1&limit=999999`, 'GET');
            
            if (!masterRes.data || masterRes.data.length === 0) {
                Swal.fire('ไม่พบข้อมูล', 'ไม่มีข้อมูลในระบบเลย', 'warning');
                return;
            }

            const actualSheets = [];

            // ดึงข้อมูลแต่ละคลัง
            for (const loc of allLocs) {
                const sortVal = document.getElementById('sortFilter')?.value || 'DEFAULT';
                const locRes = await fetchAPI(`get_inventory_dashboard&location_id=${loc.id}&location_type=${locType}&material_type=${matType}&category=${category}&hide_zero=${hideZero}&sort=${sortVal}&search=&page=1&limit=999999`, 'GET');
                
                if (locRes.data && locRes.data.length > 0) {
                    actualSheets.push(loc.name);
                    
                    const ws_data = [
                        ["Location:", loc.name],
                        ["Export Date:", new Date().toLocaleString('th-TH')],
                        [],
                        ["Item No.", "Description", "Type", "Pending Qty", "Available Qty", "Total Qty", "Cost/Unit", "Total Value"]
                    ];
                    
                    locRes.data.forEach(row => {
                        ws_data.push([
                            row.item_no || '',
                            row.part_description || '',
                            row.material_type || '',
                            parseFloat(row.pending_qty) || 0,
                            parseFloat(row.available_qty) || 0,
                            parseFloat(row.total_qty) || 0,
                            parseFloat(row.unit_price) || 0,
                            parseFloat(row.total_value) || 0
                        ]);
                    });
                    
                    const ws = XLSX.utils.aoa_to_sheet(ws_data);
                    ws['!cols'] = [{wch:20}, {wch:50}, {wch:12}, {wch:15}, {wch:15}, {wch:15}, {wch:15}, {wch:18}];
                    XLSX.utils.book_append_sheet(wb, ws, loc.name);
                }
            }

            // สร้างชีท Summary
            const summary_data = [
                ["Location:", "Summary (All Locations)"],
                ["Export Date:", new Date().toLocaleString('th-TH')],
                [],
                ["Item No.", "Description", "Type", "Pending Qty", "Available Qty", "Total Qty", "Cost/Unit", "Total Value"]
            ];

            masterRes.data.forEach((row, idx) => {
                const rIdx = idx + 5; // Data starts at Excel row 5
                
                let formulaPending = actualSheets.map(s => `SUMIF('${s}'!A:A, $A${rIdx}, '${s}'!D:D)`).join(' + ');
                let formulaAvail = actualSheets.map(s => `SUMIF('${s}'!A:A, $A${rIdx}, '${s}'!E:E)`).join(' + ');
                let formulaTotal = actualSheets.map(s => `SUMIF('${s}'!A:A, $A${rIdx}, '${s}'!F:F)`).join(' + ');
                
                if (actualSheets.length === 0) {
                    formulaPending = "0"; formulaAvail = "0"; formulaTotal = "0";
                }

                summary_data.push([
                    row.item_no || '',
                    row.part_description || '',
                    row.material_type || '',
                    { f: formulaPending, v: parseFloat(row.pending_qty) || 0, t: 'n' },
                    { f: formulaAvail, v: parseFloat(row.available_qty) || 0, t: 'n' },
                    { f: formulaTotal, v: parseFloat(row.total_qty) || 0, t: 'n' },
                    parseFloat(row.unit_price) || 0,
                    { f: `F${rIdx}*G${rIdx}`, v: parseFloat(row.total_value) || 0, t: 'n' }
                ]);
            });

            const wsSummary = XLSX.utils.aoa_to_sheet(summary_data);
            wsSummary['!cols'] = [{wch:20}, {wch:50}, {wch:12}, {wch:15}, {wch:15}, {wch:15}, {wch:15}, {wch:18}];
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

            // ย้าย Summary มาไว้ชีทแรกสุด
            const sheetNames = wb.SheetNames;
            const sumIndex = sheetNames.indexOf("Summary");
            if (sumIndex > -1) {
                sheetNames.splice(sumIndex, 1);
                sheetNames.unshift("Summary");
            }

            XLSX.writeFile(wb, `Inventory_All_Locations_${dateStr}.xlsx`);

        } else {
            // โหมด FILTER / CURRENT: แบบเก่า (ชีทเดียว)
            let reqLocId = exportType === 'FILTER' ? locId : locId;
            let reqMatType = exportType === 'FILTER' ? matType : matType;
            let reqHideZero = exportType === 'FILTER' ? hideZero : hideZero;
            let reqSearchStr = exportType === 'FILTER' ? '' : searchStr;
            let exportLocName = exportType === 'FILTER' ? locName : locName;
            
            const locType = document.getElementById('locationTypeFilter')?.value || 'ALL';
            const category = document.getElementById('categoryFilter')?.value || 'ALL';

            const sortVal = document.getElementById('sortFilter')?.value || 'DEFAULT';
            const queryParams = `get_inventory_dashboard&location_id=${reqLocId}&location_type=${locType}&material_type=${reqMatType}&category=${category}&hide_zero=${reqHideZero}&sort=${sortVal}&search=${encodeURIComponent(reqSearchStr)}&page=1&limit=999999`;
            const result = await fetchAPI(queryParams, 'GET');

            if (!result.data || result.data.length === 0) {
                Swal.fire('ไม่พบข้อมูล', 'ไม่มีข้อมูลสำหรับ Export ตามเงื่อนไขที่เลือก', 'warning');
                return;
            }

            const ws_data = [
                ["Location:", exportLocName],
                ["Search Filter:", reqSearchStr ? reqSearchStr : "None"],
                ["Export Date:", new Date().toLocaleString('th-TH')],
                [],
                ["Item No.", "Description", "Type", "Pending Qty", "Available Qty", "Total Qty", "Cost/Unit", "Total Value"]
            ];

            result.data.forEach(row => {
                ws_data.push([
                    row.item_no || '',
                    row.part_description || '',
                    row.material_type || '',
                    parseFloat(row.pending_qty) || 0,
                    parseFloat(row.available_qty) || 0,
                    parseFloat(row.total_qty) || 0,
                    parseFloat(row.unit_price) || 0,
                    parseFloat(row.total_value) || 0
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            ws['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];

            const safeLocName = exportLocName.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_').substring(0,30);
            XLSX.utils.book_append_sheet(wb, ws, safeLocName || "Inventory");
            
            let fileName = `Inventory_${safeLocName}_${dateStr}.xlsx`;
            if (exportType === 'CURRENT' && reqSearchStr) {
                fileName = `Inventory_Filtered_${dateStr}.xlsx`;
            }

            XLSX.writeFile(wb, fileName);
        }

        if (typeof Swal !== 'undefined') Swal.close();
    } catch (err) {
        console.error("Export Error:", err);
        if (typeof Swal !== 'undefined') Swal.fire('ข้อผิดพลาด', 'ไม่สามารถ Export ข้อมูลได้', 'error');
    }
};

window.forceIssueTag = async function(serialNo) {
    const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันการตัดจ่ายแท็ก?',
        html: `คุณกำลังจะตัดจ่ายแท็ก <b>${serialNo}</b> ออกจากสต็อก<br><small class="text-danger">การกระทำนี้สำหรับแก้ไขปัญหาแท็กที่ถูกนำไปใช้แล้วแต่ยังไม่ได้ตัดในระบบ (ชดเชยรอยต่อระบบใหม่)</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ยืนยันการตัดจ่าย',
        cancelButtonText: 'ยกเลิก'
    });

    if (isConfirmed) {
        try {
            Swal.fire({
                title: 'กำลังดำเนินการ...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const formData = new FormData();
            formData.append('serial_no', serialNo);
            
            const res = await fetchAPI('force_issue_tag', 'POST', formData);
            if (res && res.success) {
                Swal.fire('สำเร็จ!', 'ตัดจ่ายแท็กเรียบร้อยแล้ว', 'success');
                if (detailsModalInstance) detailsModalInstance.hide();
                loadDashboardData();
            }
        } catch (error) {
            console.error("Force issue error:", error);
        }
    }
};