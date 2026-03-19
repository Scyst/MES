"use strict";

let allData = [];
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 100;
let detailsModal;

document.addEventListener('DOMContentLoaded', () => {
    detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    loadLocations(); // โหลด Dropdown คลังสินค้าตอนเปิดหน้าเว็บ
});

// ฟังก์ชันดึง Location ลง Dropdown
async function loadLocations() {
    try {
        const res = await fetch('api/manageInventory.php?action=get_locations');
        const json = await res.json();
        
        if (json.success) {
            const select = document.getElementById('locationFilter');
            json.data.forEach(loc => {
                select.innerHTML += `<option value="${loc.location_id}">${loc.location_name}</option>`;
            });
        }
    } catch (err) {
        console.error("Failed to load locations", err);
    }
    // โหลด Dropdown เสร็จแล้วค่อยไปดึงข้อมูล Data หลัก
    loadDashboardData();
}

async function loadDashboardData() {
    const tbody = document.getElementById('inventoryTbody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลดข้อมูล...</td></tr>';
    
    // ดึงค่า Location ที่เลือก (ถ้ามี)
    const locId = document.getElementById('locationFilter').value;
    
    try {
        const res = await fetch(`api/manageInventory.php?action=get_dashboard&location_id=${locId}`);
        const json = await res.json();
        
        if (json.success) {
            allData = json.data;
            filteredData = [...allData];
            
            // อัปเดต KPI Cards
            document.getElementById('kpi-skus').innerText = json.kpi.total_skus.toLocaleString();
            document.getElementById('kpi-out-of-stock').innerText = json.kpi.out_of_stock.toLocaleString(); // การ์ดใหม่
            document.getElementById('kpi-pending').innerText = json.kpi.total_pending_qty.toLocaleString();
            
            // ยอดรวมพร้อมใช้ ไปโชว์ที่ Toolbar
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
        console.error(err);
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

        // ⭐️ ถ้าของในคลังหมด ให้ทำแถวนี้เป็นสีแดงอ่อนๆ ช่วยให้จัดซื้อเห็นชัดๆ
        let rowClass = availQty <= 0 ? 'row-out-of-stock' : '';
        let availDisplay = availQty <= 0 ? '<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i> 0</span>' : availQty.toLocaleString();

        let rowHtml = `
            <tr class="${rowClass}">
                <td class="fw-bold">${escapeHTML(row.item_no)}</td>
                <td class="text-truncate text-muted" style="max-width: 300px;" title="${escapeHTML(row.part_description || '')}">${escapeHTML(row.part_description || '-')}</td>
                <td class="text-end text-warning fw-bold">${pendQty > 0 ? pendQty.toLocaleString() : '-'}</td>
                <td class="text-end fw-bold ${availQty > 0 ? 'text-success' : ''}">${availDisplay}</td>
                <td class="text-end text-primary fw-bold" style="font-size: 1.05rem;">${totalQty.toLocaleString()}</td>
                <td class="text-end text-secondary">฿ ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-light border shadow-sm text-primary rounded-circle" style="width: 30px; height: 30px; padding: 0;" onclick="viewDetails(${row.item_id}, '${escapeHTML(row.item_no)}', '${escapeHTML(row.part_description ? row.part_description.replace(/'/g, "\\'") : '')}')" title="ดูพิกัดพาเลท">
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

// ---------------- Pagination Logic ----------------
function updatePaginationInfo() {
    const total = filteredData.length;
    const start = total === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const end = Math.min(currentPage * rowsPerPage, total);
    document.getElementById('paginationInfo').innerText = `แสดง ${start} ถึง ${end} จาก ${total} รายการ`;
}

function renderPaginationControls() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
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
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
}

// ---------------- Drill down Details ----------------
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