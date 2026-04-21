// MES/page/storeManagement/script/stockLedger.js
"use strict";

let currentPage = 1;
let rowsPerPage = 100;
let totalPages = 1;
let searchTimer;

document.addEventListener('DOMContentLoaded', () => {
    loadLocations();
    loadLedgerData();

    // Event Listeners สำหรับตัวกรองทั้งหมด
    document.getElementById('locationFilter')?.addEventListener('change', () => { currentPage = 1; loadLedgerData(); });
    document.getElementById('typeFilter')?.addEventListener('change', () => { currentPage = 1; loadLedgerData(); });
    document.getElementById('filterStartDate')?.addEventListener('change', () => { currentPage = 1; loadLedgerData(); });
    document.getElementById('filterEndDate')?.addEventListener('change', () => { currentPage = 1; loadLedgerData(); });
    
    // หน่วงเวลาพิมพ์ค้นหา 0.5 วิ (Debounce)
    document.getElementById('filterSearch')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentPage = 1; 
            loadLedgerData();
        }, 500);
    });
});

async function loadLocations() {
    try {
        const result = await fetchAPI('get_master_data', 'GET');
        const filterSelect = document.getElementById('locationFilter');
        
        if (filterSelect) filterSelect.innerHTML = '<option value="ALL">All Locations</option>';
        
        if (result.data && result.data.locations) {
            result.data.locations.forEach(loc => {
                filterSelect.innerHTML += `<option value="${escapeHTML(loc.location_id)}">${escapeHTML(loc.location_name)}</option>`;
            });
        }
    } catch (err) { console.error("Failed to load locations:", err); }
}

async function loadLedgerData() {
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';
    const locId = document.getElementById('locationFilter')?.value || 'ALL';
    const typeFilter = document.getElementById('typeFilter')?.value || 'ALL';
    const searchStr = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');

    const tbody = document.getElementById('ledgerTbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-primary mb-2"></i><br>กำลังโหลดข้อมูลประวัติ...</td></tr>';

    try {
        const queryParams = `get_stock_ledger&start_date=${startDate}&end_date=${endDate}&location_id=${locId}&type_filter=${typeFilter}&search=${searchStr}&page=${currentPage}&limit=${rowsPerPage}`;
        const result = await fetchAPI(queryParams, 'GET');

        // อัปเดตกรอบ KPI ด้านบน
        if (result.kpi) {
            document.getElementById('kpiTotalTrans').innerText = parseFloat(result.kpi.total_trans || 0).toLocaleString();
            document.getElementById('kpiTotalIn').innerText = parseFloat(result.kpi.total_in || 0).toLocaleString();
            document.getElementById('kpiTotalOut').innerText = parseFloat(result.kpi.total_out || 0).toLocaleString();
        }

        // กรณีไม่พบข้อมูล
        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-muted"><i class="fas fa-folder-open fa-3x mb-3 text-secondary opacity-50"></i><br>ไม่พบประวัติความเคลื่อนไหวในช่วงเวลานี้</td></tr>';
            document.getElementById('paginationControls').innerHTML = '';
            document.getElementById('paginationInfo').innerText = 'แสดง 0 ถึง 0 จาก 0 รายการ';
            return;
        }

        let htmlTable = '';
        
        result.data.forEach((row, index) => {
            const runningNumber = ((currentPage - 1) * rowsPerPage) + index + 1;
            const qty = parseFloat(row.quantity);
            const timeStr = escapeHTML(row.transaction_timestamp.substring(0, 16)); // ตัดเอาแค่วันและเวลา
            
            // จัดการแสดงผล IN / OUT
            let inQty = '-';
            let outQty = '-';
            if (qty > 0) inQty = `<span class="text-in">+${qty.toLocaleString()}</span>`;
            if (qty < 0) outQty = `<span class="text-out">${qty.toLocaleString()}</span>`;

            // จัดการแสดงผล Location (ถ้าเป็นการโอนย้าย ให้แสดง ต้นทาง -> ปลายทาง)
            let locDisplay = '-';
            if (row.from_loc && row.to_loc) {
                locDisplay = `${escapeHTML(row.from_loc)} <i class="fas fa-arrow-right text-muted mx-1"></i> ${escapeHTML(row.to_loc)}`;
            } else if (row.to_loc) {
                locDisplay = `<i class="fas fa-arrow-down text-success me-1"></i> ${escapeHTML(row.to_loc)}`;
            } else if (row.from_loc) {
                locDisplay = `<i class="fas fa-arrow-up text-danger me-1"></i> ${escapeHTML(row.from_loc)}`;
            }

            // จัดการสี Badge ของ Type
            let typeBadge = 'bg-secondary';
            if (row.transaction_type.includes('RECEIPT')) typeBadge = 'bg-success';
            if (row.transaction_type.includes('CONSUMPTION') || row.transaction_type.includes('SCRAP')) typeBadge = 'bg-danger';
            if (row.transaction_type.includes('TRANSFER')) typeBadge = 'bg-info text-dark';
            if (row.transaction_type.includes('ADJUST')) typeBadge = 'bg-warning text-dark';

            htmlTable += `
                <tr>
                    <td class="text-center text-muted">${runningNumber}</td>
                    <td class="small">${timeStr}</td>
                    <td>
                        <div class="fw-bold text-primary" style="font-size: 0.95rem;">${escapeHTML(row.item_no)}</div>
                        <div class="small text-muted text-truncate" style="max-width: 220px;" title="${escapeHTML(row.part_description || '')}">${escapeHTML(row.part_description || '-')}</div>
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
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle"></i> เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
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
    const searchStr = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');

    const exportUrl = `api/api_store.php?action=get_stock_ledger&start_date=${startDate}&end_date=${endDate}&location_id=${locId}&type_filter=${typeFilter}&search=${searchStr}&export=true`;
    
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
                    ['วันที่-เวลา', 'Item No', 'Description', 'จาก Location', 'ถึง Location', 'ประเภท', 'IN (+)', 'OUT (-)', 'Ref / Lot No', 'ผู้บันทึก', 'หมายเหตุ']
                ];
                
                json.data.forEach(row => {
                    let inQty = parseFloat(row.quantity) > 0 ? parseFloat(row.quantity) : 0;
                    let outQty = parseFloat(row.quantity) < 0 ? Math.abs(parseFloat(row.quantity)) : 0;
                    
                    wsData.push([
                        row.transaction_timestamp,
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