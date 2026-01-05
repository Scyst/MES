/**
 * script/shipping_loading.js
 * จัดการ Logic ทั้งหมดของหน้า Shipping Schedule (ฉบับปรับปรุงคอลัมน์ Quantity)
 */

let allData = [];
let importModal;
let currentPage = 1;
let rowsPerPage = 100; // แสดงหน้าละ 50 แถว (ปรับเปลี่ยนได้ตามเหมาะสม)
let filteredData = []; // เก็บข้อมูลที่ผ่านการค้นหาแล้ว
let searchTimer;
let currentStatusFilter = 'ALL'; // เก็บสถานะการกรองจาก Card

$(document).ready(function() {
    // 1. จัดการ Modal Instance ครั้งเดียวตอนโหลดหน้า
    const modalEl = document.getElementById('importResultModal');
    if (modalEl) {
        importModal = new bootstrap.Modal(modalEl);
    }
    
    loadData();

    // ระบบค้นหา
    $('#universalSearch').on('keyup', function() {
        clearTimeout(searchTimer);
        
        // พิมพ์ปุ๊บ แสดง Spinner ปั๊บ (เพื่อให้ User รู้ว่ากำลังหา)
        showSpinner(); 

        searchTimer = setTimeout(function() {
            applyGlobalFilter(); 
        }, 300);
    });
});

function showLoading(show) {
    if(show) $('#loadingOverlay').css('display', 'flex');
    else $('#loadingOverlay').hide();
}

function loadData() {
    showSpinner(); // เปลี่ยนจาก showLoading(true)
    $.ajax({
        url: 'api/manage_shipping.php?action=read',
        method: 'GET', 
        dataType: 'json',
        success: function(res) {
            if(res.success) {
                allData = res.data;
                updateKPICards(allData); 
                applyGlobalFilter(); 
            }
            hideSpinner(); // เปลี่ยนจาก showLoading(false)
        },
        error: function() {
            hideSpinner();
            alert('Connection Failed');
        }
    });
}

// ฟังก์ชันแปลง YYYY-MM-DD เป็น DD/MM/YYYY สำหรับแสดงผล
const fnDateDisplay = (d) => {
    if (!d || d === '0000-00-00' || d === '1900-01-01' || d === 'null') return '';
    const datePart = d.split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return d; 
    const [y, m, day] = parts;
    return `${day}/${m}/${y}`;
};

// --- ฟังก์ชันสำหรับคำนวณตัวเลขบน Card (เรียกใช้ตอนโหลดข้อมูลครั้งแรก) ---
function updateKPICards(data) {
    let active = 0;    // ยังโหลดไม่เสร็จ (is_loading_done != 1)
    let waitProd = 0;  // ผลิตไม่เสร็จ (is_production_done != 1)
    let prodDone = 0;  // ผลิตเสร็จแล้ว (is_production_done == 1)
    let loadDone = 0;  // โหลดเสร็จแล้ว (is_loading_done == 1)

    data.forEach(row => {
        if (row.is_loading_done != 1) active++;
        if (row.is_production_done != 1) waitProd++;
        if (row.is_production_done == 1 && row.is_loading_done != 1) prodDone++;
        if (row.is_loading_done == 1) loadDone++;
    });

    $('#kpi-active').text(active.toLocaleString());
    $('#kpi-wait-prod').text(waitProd.toLocaleString());
    $('#kpi-prod-done').text(prodDone.toLocaleString());
    $('#kpi-load-done').text(loadDone.toLocaleString());
    $('#kpi-total-all').text(data.length.toLocaleString());
}

// --- ฟังก์ชันเมื่อกดที่ Card ---
function filterByStatus(status) {
    showSpinner(); // 1. สั่งเปิด Spinner ทันทีที่กด

    // ใช้ setTimeout เพื่อให้ Spinner แสดงตัวก่อนเริ่มประมวลผลหนักๆ
    setTimeout(() => {
        currentStatusFilter = status;
        currentPage = 1;

        $('.kpi-card').removeClass('active');
        if(status === 'ACTIVE') $('#card-active').addClass('active');
        if(status === 'WAIT_PROD') $('#card-wait-prod').addClass('active');
        if(status === 'PROD_DONE') $('#card-prod-done').addClass('active');
        if(status === 'LOAD_DONE') $('#card-load-done').addClass('active');
        if(status === 'ALL') $('#card-all').addClass('active');

        applyGlobalFilter(); // เรียกตัวกรอง
        // hideSpinner() จะถูกเรียกท้าย applyGlobalFilter
    }, 50); 
}

// --- ฟังก์ชันรวม (ทั้ง Search และ Status Filter) ---
function applyGlobalFilter() {
    // กรณีพิมพ์ Search เราเปิด Spinner ไว้ในส่วนของ searchTimer แล้ว
    // แต่ถ้าเรียกจากที่อื่น เราควรเช็คเพื่อให้แน่ใจว่า Spinner เปิดอยู่
    showSpinner(); 

    setTimeout(() => {
        const searchVal = $('#universalSearch').val().toLowerCase();
        
        let filtered = allData.filter(row => {
            const matchesSearch = Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchVal)
            );

            let matchesStatus = true;
            if (currentStatusFilter === 'ACTIVE') matchesStatus = (row.is_loading_done != 1);
            if (currentStatusFilter === 'WAIT_PROD') matchesStatus = (row.is_production_done != 1);
            if (currentStatusFilter === 'PROD_DONE') matchesStatus = (row.is_production_done == 1 && row.is_loading_done != 1);
            if (currentStatusFilter === 'LOAD_DONE') matchesStatus = (row.is_loading_done == 1);
            
            return matchesSearch && matchesStatus;
        });

        renderTable(filtered); // วาดตาราง
        hideSpinner(); // 2. สั่งปิด Spinner เมื่อวาดเสร็จ
    }, 50);
}

function showSpinner() { 
    document.getElementById('loadingOverlay').style.display = 'flex'; 
}

function hideSpinner() { 
    document.getElementById('loadingOverlay').style.display = 'none'; 
}

function renderTable(data) {
    filteredData = data;
    const tableBody = $('#tableBody');

    // 1. คำนวณยอดรวม (Qty, GW, CBM) จากข้อมูลที่กรองแล้ว (เปลี่ยนตามตาราง)
    let totalQty = 0, totalGW = 0, totalCBM = 0;
    let containerSet = new Set();

    data.forEach(row => {
        totalQty += parseFloat(row.quantity || 0);
        totalGW += parseFloat(row.gross_weight || 0);
        totalCBM += parseFloat(row.cbm || 0);
        if (row.container_no) containerSet.add(row.container_no.trim().toUpperCase());
    });

    $('#kpiTotalQty').text(totalQty.toLocaleString());
    $('#kpiTotalGW').text(totalGW.toLocaleString(undefined, {minimumFractionDigits: 2}));
    $('#kpiTotalCBM').text(totalCBM.toLocaleString(undefined, {minimumFractionDigits: 2}));
    $('#kpiTotalCont').text(containerSet.size);
    if (data.length === 0) {
        tableBody.html('<tr><td colspan="31" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>');
        $('#paginationContainer').html('');
        return;
    }

    // 2. เตรียมข้อมูล Pagination
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + rowsPerPage);

    // 3. สร้าง HTML (ใช้ .map() เพื่อประสิทธิภาพที่สูงกว่าในการจัดการ DOM)
    const rowsHtml = paginatedData.map(row => {
        const loadClass = row.is_loading_done == 1 ? 'bg-success-custom' : 'bg-pending';
        const prodClass = row.is_production_done == 1 ? 'bg-success-custom' : 'bg-pending';
        const loadTxt = row.is_loading_done == 1 ? 'DONE' : 'WAIT';
        const prodTxt = row.is_production_done == 1 ? 'DONE' : 'WAIT';
        const ro = isCustomer ? 'readonly' : '';
        const qtyDisplay = row.quantity ? parseInt(row.quantity).toLocaleString() : 0;

        return `<tr>
            <td class="sticky-col-left-1 text-center bg-white">
                ${isCustomer ? `<span class="status-badge ${loadClass}">${loadTxt}</span>` : `<button class="status-badge ${loadClass}" onclick="toggleStatus(${row.id}, 'loading', ${row.is_loading_done})">${loadTxt}</button>`}
            </td>
            <td class="sticky-col-left-2 text-center bg-white">
                ${isCustomer ? `<span class="status-badge ${prodClass}">${prodTxt}</span>` : `<button class="status-badge ${prodClass}" onclick="toggleStatus(${row.id}, 'production', ${row.is_production_done})">${prodTxt}</button>`}
            </td>
            <td class="sticky-col-left-3 fw-bold text-primary bg-white">${row.po_number || '-'}</td>
            <td class="text-center">${row.shipping_week || ''}</td>
            <td><input class="editable-input" value="${row.shipping_customer_status || ''}" onchange="upd(${row.id}, 'shipping_customer_status', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.inspect_type || ''}" onchange="upd(${row.id}, 'inspect_type', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.inspection_result || ''}" onchange="upd(${row.id}, 'inspection_result', this.value)" ${ro}></td>
            <td><input type="text" class="editable-input datepicker" value="${fnDateDisplay(row.snc_load_day)}" data-field="snc_load_day" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td><input class="editable-input" value="${row.dc_location || ''}" onchange="upd(${row.id}, 'dc_location', this.value)" ${ro}></td>
            <td>${row.sku || ''}</td>
            <td><input class="editable-input" value="${row.booking_no || ''}" onchange="upd(${row.id}, 'booking_no', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.invoice_no || ''}" onchange="upd(${row.id}, 'invoice_no', this.value)" ${ro}></td>
            <td title="${row.description || ''}"><div class="text-truncate" style="max-width:150px;">${row.description || ''}</div></td>
            <td class="text-center">${qtyDisplay}</td>
            <td><input class="editable-input" value="${row.ctn_size || ''}" onchange="upd(${row.id}, 'ctn_size', this.value)" ${ro}></td>
            <td><input class="editable-input fw-bold text-primary" value="${row.container_no || ''}" onchange="upd(${row.id}, 'container_no', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.seal_no || ''}" onchange="upd(${row.id}, 'seal_no', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.container_tare || ''}" onchange="upd(${row.id}, 'container_tare', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.net_weight || ''}" onchange="upd(${row.id}, 'net_weight', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.gross_weight || ''}" onchange="upd(${row.id}, 'gross_weight', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.cbm || ''}" onchange="upd(${row.id}, 'cbm', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.feeder_vessel || ''}" onchange="upd(${row.id}, 'feeder_vessel', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.mother_vessel || ''}" onchange="upd(${row.id}, 'mother_vessel', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.snc_ci_no || ''}" onchange="upd(${row.id}, 'snc_ci_no', this.value)" ${ro}></td>
            <td><input type="text" class="editable-input datepicker" value="${fnDateDisplay(row.si_vgm_cut_off)}" data-field="si_vgm_cut_off" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td><input type="text" class="editable-input datepicker" value="${fnDateDisplay(row.pickup_date)}" data-field="pickup_date" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td><input type="text" class="editable-input datepicker" value="${fnDateDisplay(row.return_date)}" data-field="return_date" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td class="bg-warning bg-opacity-10"><input type="text" class="editable-input datepicker fw-bold" value="${fnDateDisplay(row.etd)}" data-field="etd" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td><input class="editable-input" value="${row.remark || ''}" onchange="upd(${row.id}, 'remark', this.value)" ${ro}></td>
            <td class="sticky-col-right-2 bg-white"><input type="text" class="editable-input datepicker text-danger fw-bold" value="${fnDateDisplay(row.cutoff_date)}" data-field="cutoff_date" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td class="sticky-col-right-1 bg-white"><input type="time" class="editable-input text-danger fw-bold" value="${row.cutoff_time ? row.cutoff_time.substring(0,5) : ''}" onchange="upd(${row.id}, 'cutoff_time', this.value)" ${ro}></td>
        </tr>`;
    }).join('');

    tableBody.html(rowsHtml);
    renderPagination();
    initDatePickers(); 
}

function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    let html = '';

    if (totalPages > 1) {
        html += `<div class="d-flex justify-content-between align-items-center mt-2">
                    <div class="small text-muted">
                        Showing <b>${Math.min((currentPage - 1) * rowsPerPage + 1, filteredData.length)}</b> 
                        to <b>${Math.min(currentPage * rowsPerPage, filteredData.length)}</b> 
                        of <b>${filteredData.length}</b> entries
                    </div>
                    <nav>
                        <ul class="pagination pagination-sm mb-0">`;
        
        // ปุ่ม Previous
        html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
                 </li>`;

        // แสดงเลขหน้าแบบยืดหยุ่น (หน้าแรก, หน้าสุดท้าย, และหน้ารอบข้าง)
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                         </li>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // ปุ่ม Next
        html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
                 </li>`;
        
        html += `       </ul>
                    </nav>
                </div>`;
    }

    $('#paginationContainer').html(html);
}

// --- 4. ฟังก์ชันเปลี่ยนหน้า ---
function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable(filteredData);
    
    // เลื่อนตารางกลับไปบนสุดของ Container
    $('.table-responsive-custom').scrollTop(0); 
}

function initDatePickers() {
    flatpickr(".datepicker", {
        dateFormat: "d/m/Y",
        allowInput: true,
        disableMobile: "true",
        onChange: function(selectedDates, dateStr, instance) {
            if (!dateStr) return;
            const id = instance.element.getAttribute('data-id');
            const field = instance.element.getAttribute('data-field');
            const [d, m, y] = dateStr.split('/');
            const apiDate = `${y}-${m}-${d}`;
            upd(id, field, apiDate);
        }
    });
}

function upd(id, field, val) {
    if(isCustomer) return;
    if (field === 'cutoff_time' && val) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(val)) return;
    }
    $.post('api/manage_shipping.php', {action:'update_cell', id:id, field:field, value:val});
}

function toggleStatus(id, type, currentVal) {
    if(isCustomer) return;
    let fieldName = (type === 'loading') ? 'is_loading_done' : 'is_production_done';
    let newVal = (currentVal == 1) ? 0 : 1;
    
    showSpinner(); // เปลี่ยนจาก showLoading(true)
    
    $.post('api/manage_shipping.php', {
        action: 'update_check',
        id: id, 
        field: fieldName, 
        checked: newVal
    }, function(res){
        if(res.success) loadData(); // loadData จะไปสั่งปิด Spinner เอง
        else {
            hideSpinner(); // ปิดถ้า error
            alert('Update Failed: ' + res.message);
        }
    }, 'json');
}

async function uploadFile() {
    const fileInput = document.getElementById('csv_file'); 
    if (!fileInput || !fileInput.files[0]) return;

    const file = fileInput.files[0];
    showSpinner(); // เรียกตั้งแต่เริ่มอ่านไฟล์เลย

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        let rawData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        let cleanedData = rawData.map(row => {
            let newRow = {};
            for (let key in row) {
                // ล้างช่องว่างที่หัวตาราง
                let cleanKey = key.trim().replace(/\s+/g, ' '); 
                newRow[cleanKey] = row[key];
            }
            return newRow;
        });

        // กรองแถวที่ไม่มี PO (เพิ่มความยืดหยุ่นในการหาหัวข้อ PO)
        cleanedData = cleanedData.filter(row => row['PO'] || row['po_number'] || row['PO Number']);
        
        $.post('api/manage_shipping.php', {
            action: 'import_json',
            data: JSON.stringify(cleanedData)
        }, function(res) {
            hideSpinner(); // ปิดเมื่อเสร็จ
            if (res.success) {
                showImportResult(res);
                loadData();
            }
        }, 'json').fail(function() {
            hideSpinner();
            alert('Server Connection Error');
        });
    } catch (e) {
        hideSpinner(); // เปลี่ยนจาก showLoading(false)
        alert("Error reading file: " + e.message);
    }
}

function showImportResult(res) {
    // ใช้ตัวแปร jQuery เพื่อความเร็ว
    $('#importSuccessCount').text(res.success_count || 0);
    const errorSection = $('#importErrorSection');
    const successMsg = $('#importAllSuccess');
    
    if (res.skipped_count > 0 || (res.errors && res.errors.length > 0)) {
        $('#importSkipCount').text(res.skipped_count || 0);
        $('#importErrorLog').val(res.errors ? res.errors.join("\n") : "");
        errorSection.removeClass('d-none');
        successMsg.addClass('d-none');
    } else {
        errorSection.addClass('d-none');
        successMsg.removeClass('d-none');
    }
    
    // เรียกแสดง Modal จากตัวแปรที่เราสร้างไว้ตอนเริ่ม
    if (importModal) importModal.show();
}

function exportToCSV() { window.location.href = 'api/manage_shipping.php?action=export'; }