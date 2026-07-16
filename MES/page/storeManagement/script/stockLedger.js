// MES/page/storeManagement/script/stockLedger.js
"use strict";

let currentPage = 1;
let rowsPerPage = 100;
let totalPages = 1;
let searchTimer;

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

function resetLedgerFilters() {
    const defaultDate = new Date();
    document.getElementById('filterEndDate').value = defaultDate.toISOString().split('T')[0];
    defaultDate.setDate(defaultDate.getDate() - 7);
    document.getElementById('filterStartDate').value = defaultDate.toISOString().split('T')[0];
    
    const typeSelect = document.getElementById('locationTypeFilter');
    if (typeSelect) typeSelect.value = 'ALL';
    if (typeof updateLocationFilterDropdown === 'function') updateLocationFilterDropdown();
    
    const locSelect = document.getElementById('locationFilter');
    if (locSelect) locSelect.value = 'ALL';
    
    document.getElementById('typeFilter').value = 'ALL';
    document.getElementById('materialTypeFilter').value = 'ALL';
    const subTypeSelect = document.getElementById('categoryFilter');
    subTypeSelect.value = 'ALL';
    updateFilterSubTypeOptions('ALL');
    loadLedgerData();
}

function updateFilterSubTypeOptions(selectedType) {
    const subTypeSelect = document.getElementById('categoryFilter');
    const wrapper = document.getElementById('categoryFilterWrapper') || subTypeSelect;
    if (!subTypeSelect) return;
    
    wrapper.classList.remove('d-none');
    subTypeSelect.innerHTML = '<option value="ALL">All Sub-types</option>';
    
    if (!selectedType || selectedType === '' || selectedType === 'ALL') {
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
    loadLocations();
    loadLedgerData();

    document.getElementById('locationFilter')?.addEventListener('change', () => { currentPage = 1; loadLedgerData(); });
    document.getElementById('locationTypeFilter')?.addEventListener('change', () => { 
        updateLocationFilterDropdown(); 
        currentPage = 1; 
        loadLedgerData(); 
    });
    document.getElementById('typeFilter')?.addEventListener('change', () => { currentPage = 1; loadLedgerData(); });
    document.getElementById('categoryFilter')?.addEventListener('change', () => { currentPage = 1; loadLedgerData(); });
    document.getElementById('materialTypeFilter')?.addEventListener('change', (e) => { 
        updateFilterSubTypeOptions(e.target.value);
        currentPage = 1; 
        loadLedgerData(); 
    });
    document.getElementById('filterStartDate')?.addEventListener('change', () => { currentPage = 1; loadLedgerData(); });
    document.getElementById('filterEndDate')?.addEventListener('change', () => { currentPage = 1; loadLedgerData(); });
    document.getElementById('filterSearch')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentPage = 1; 
            loadLedgerData();
        }, 500);
    });
});

window.allLocationsList = [];

async function loadLocations() {
    try {
        const result = await fetchAPI('get_master_data', 'GET');
        if (result.data && result.data.locations) {
            window.allLocationsList = result.data.locations;
            updateLocationFilterDropdown();
        }
    } catch (err) { console.error("Failed to load locations:", err); }
}

function updateLocationFilterDropdown() {
    const filterSelect = document.getElementById('locationFilter');
    const typeSelect = document.getElementById('locationTypeFilter');
    const selectedType = typeSelect ? typeSelect.value : 'ALL';
    
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="ALL">All Locations</option>';
        window.allLocationsList.forEach(loc => {
            if (selectedType === 'ALL' || loc.location_type === selectedType) {
                filterSelect.innerHTML += `<option value="${escapeHTML(loc.location_id)}">${escapeHTML(loc.location_name)}</option>`;
            }
        });
    }
}

async function loadLedgerData() {
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';
    const locId = document.getElementById('locationFilter')?.value || 'ALL';
    const locType = document.getElementById('locationTypeFilter')?.value || 'ALL';
    const typeFilter = document.getElementById('typeFilter')?.value || 'ALL';
    const materialType = document.getElementById('materialTypeFilter')?.value || 'ALL';
    const category = document.getElementById('categoryFilter')?.value || 'ALL';
    const searchStr = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');

    const tbody = document.getElementById('ledgerTbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-primary mb-2"></i><br>กำลังโหลดข้อมูลประวัติ...</td></tr>';

    try {
        const queryParams = `get_stock_ledger&start_date=${startDate}&end_date=${endDate}&location_id=${locId}&location_type=${locType}&type_filter=${typeFilter}&material_type=${materialType}&category=${category}&search=${searchStr}&page=${currentPage}&limit=${rowsPerPage}`;
        const result = await fetchAPI(queryParams, 'GET');

        if (result.kpi) {
            document.getElementById('kpiTotalTrans').innerText = parseFloat(result.kpi.total_trans || 0).toLocaleString();
            document.getElementById('kpiTotalIn').innerText = parseFloat(result.kpi.total_in || 0).toLocaleString();
            document.getElementById('kpiTotalOut').innerText = parseFloat(result.kpi.total_out || 0).toLocaleString();
        }

        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center py-5 text-muted"><i class="fas fa-folder-open fa-3x mb-3 text-secondary opacity-50"></i><br>ไม่พบประวัติความเคลื่อนไหวในช่วงเวลานี้</td></tr>';
            document.getElementById('paginationControls').innerHTML = '';
            document.getElementById('paginationInfo').innerText = 'แสดง 0 ถึง 0 จาก 0 รายการ';
            return;
        }

        let htmlTable = '';
        
        result.data.forEach((row, index) => {
            const runningNumber = ((currentPage - 1) * rowsPerPage) + index + 1;
            const qty = parseFloat(row.quantity);
            const timeStr = escapeHTML(row.transaction_timestamp.substring(0, 16));
            
            let displayQty = qty;
            
            // If it's a transfer and we are filtering by location
            if (row.transaction_type === 'INTERNAL_TRANSFER' && locId !== 'ALL') {
                if (row.from_location_id == locId) {
                    displayQty = -Math.abs(qty); // Outgoing
                } else if (row.to_location_id == locId) {
                    displayQty = Math.abs(qty); // Incoming
                }
            } else if (row.transaction_type === 'INTERNAL_TRANSFER') {
                // If not filtering by location, it's a generic transfer log. It will show as IN by default since it's positive.
                // We can let it be positive.
                displayQty = qty;
            }

            let inQty = '-';
            let outQty = '-';
            if (displayQty > 0) inQty = `<span class="text-in">+${displayQty.toLocaleString()}</span>`;
            if (displayQty < 0) outQty = `<span class="text-out">${displayQty.toLocaleString()}</span>`;

            let locDisplay = '-';
            if (row.from_loc && row.to_loc) {
                locDisplay = `${escapeHTML(row.from_loc)} <i class="fas fa-arrow-right text-muted mx-1"></i> ${escapeHTML(row.to_loc)}`;
            } else if (row.to_loc) {
                locDisplay = `<i class="fas fa-arrow-down text-success me-1"></i> ${escapeHTML(row.to_loc)}`;
            } else if (row.from_loc) {
                locDisplay = `<i class="fas fa-arrow-up text-danger me-1"></i> ${escapeHTML(row.from_loc)}`;
            }

            let typeBadge = 'bg-secondary';
            if (row.transaction_type.includes('RECEIPT')) typeBadge = 'bg-success';
            if (row.transaction_type.includes('CONSUMPTION') || row.transaction_type.includes('SCRAP')) typeBadge = 'bg-danger';
            if (row.transaction_type.includes('TRANSFER')) typeBadge = 'bg-info text-dark';
            if (row.transaction_type.includes('ADJUST')) typeBadge = 'bg-warning text-dark';

            htmlTable += `
                <tr>
                    <td class="text-center text-muted">${runningNumber}</td>
                    <td class="small">${timeStr}</td>
                    <td class="text-muted small">${escapeHTML(row.sap_no || '-')}</td>
                    <td>
                        <div class="fw-bold text-primary" style="font-size: 0.95rem;">${escapeHTML(row.item_no)}</div>
                        <div class="small text-muted text-truncate" style="max-width: 220px;" title="${escapeHTML(row.part_description || '')}">${escapeHTML((row.part_description || '-').startsWith(row.item_no) ? (row.part_description || '-').replace(row.item_no, '').trim() : (row.part_description || '-'))}</div>
                    </td>
                    <td>${locDisplay}</td>
                    <td class="text-center"><span class="badge ${typeBadge} w-100">${escapeHTML(row.transaction_type)}</span></td>
                    <td class="text-end bg-success bg-opacity-10">${inQty}</td>
                    <td class="text-end bg-danger bg-opacity-10">${outQty}</td>
                    <td class="small fw-bold text-secondary">${escapeHTML(row.reference_id || '-')}</td>
                    <td class="small">${escapeHTML(row.actor_name || 'System')}</td>
                    <td class="small text-truncate" style="max-width: 200px;" title="${escapeHTML(row.notes)}">${escapeHTML(row.notes || '-')}</td>
                </tr>
            `;
        });

        tbody.innerHTML = htmlTable;

        if (result.pagination) {
            totalPages = result.pagination.total_pages || 1;
            renderPaginationControls(result.pagination.total_records);
        }

    } catch (err) {
        console.error("Ledger Load Error:", err);
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle"></i> เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
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
    loadLedgerData();
}

function changeRowsPerPage() {
    rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
    currentPage = 1;
    loadLedgerData();
}

function exportLedgerToExcel() {
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';
    const locId = document.getElementById('locationFilter')?.value || 'ALL';
    const typeFilter = document.getElementById('typeFilter')?.value || 'ALL';
    const materialType = document.getElementById('materialTypeFilter')?.value || 'ALL';
    const category = document.getElementById('categoryFilter')?.value || 'ALL';
    const searchStr = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');

    const exportUrl = `api/api_store.php?action=get_stock_ledger&start_date=${startDate}&end_date=${endDate}&location_id=${locId}&type_filter=${typeFilter}&material_type=${materialType}&category=${category}&search=${searchStr}&export=true`;
    
    Swal.fire({
        title: 'กำลังเตรียมไฟล์ Excel...',
        text: 'กรุณารอสักครู่',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    fetch(exportUrl)
        .then(res => res.json())
        .then(json => {
            if (json.success && json.data) {
                if (typeof XLSX === 'undefined') {
                    Swal.fire('Error', 'ไม่พบไลบรารี XLSX', 'error');
                    return;
                }
                
                const wsData = [
                    ['วันที่-เวลา', 'SAP No.', 'Item No', 'Description', 'จาก Location', 'ถึง Location', 'ประเภท', 'IN (+)', 'OUT (-)', 'Ref / Lot No', 'ผู้บันทึก', 'หมายเหตุ']
                ];
                
                json.data.forEach(row => {
                    let inQty = parseFloat(row.quantity) > 0 ? parseFloat(row.quantity) : 0;
                    let outQty = parseFloat(row.quantity) < 0 ? Math.abs(parseFloat(row.quantity)) : 0;
                    
                    wsData.push([
                        row.transaction_timestamp,
                        row.sap_no || '-',
                        row.item_no,
                        row.part_description,
                        row.from_loc || '-',
                        row.to_loc || '-',
                        row.transaction_type,
                        inQty,
                        outQty,
                        row.reference_id || '-',
                        row.actor_name || '-',
                        row.notes || '-'
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(wsData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Stock_Ledger");
                XLSX.writeFile(wb, `Stock_Ledger_${startDate}_to_${endDate}.xlsx`);
                
                Swal.close();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่มีข้อมูลสำหรับ Export', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            Swal.fire('เกิดข้อผิดพลาด', 'ดาวน์โหลดไฟล์ไม่สำเร็จ', 'error');
        });
}