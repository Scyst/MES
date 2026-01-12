/**
 * page/sales/script/shipping_loading.js
 * COMPLETE VERSION
 * - Gatekeeper Auth
 * - Smart KPI & Pipeline Logic
 * - Read-only view for Customers
 * - Full Import/Export Functionality
 */

"use strict";

const API_URL = 'api/manage_shipping.php';
let allData = [];
let importModal;
let currentPage = 1;
let rowsPerPage = 100;
let filteredData = [];
let searchTimer;
let currentStatusFilter = 'TODAY'; // Default View
let lastFilterMode = 'ALL';
let currentFilterMode = 'ALL';

// Note: ตัวแปร 'isCustomer' ถูกประกาศไว้ในไฟล์ PHP แล้ว (Global Scope)

$(document).ready(function() {
    // 1. Init Import Modal
    const modalEl = document.getElementById('importResultModal');
    if (modalEl) {
        importModal = new bootstrap.Modal(modalEl);
    }
    
    // 2. Load Data (ถ้ายังไม่ใส่รหัส จะติด 401 หรือถูกบังด้วย Modal)
    loadData();

    // 3. Set Default UI State
    setTimeout(() => {
        // Highlight การ์ดแรก (TODAY)
        $('#defaultCard').addClass('ring-2');
    }, 500);

    // 4. Search Event (Debounce)
    $('#universalSearch').on('keyup', function() {
        clearTimeout(searchTimer);
        showSpinner(); 
        searchTimer = setTimeout(function() {
            applyGlobalFilter(); 
        }, 300);
    });
});

// ============================================================
//  SECTION 1: AUTH & GATEKEEPER
// ============================================================

async function verifyPasscode() {
    const code = document.getElementById('guestPasscode').value;
    const btn = document.querySelector('#gatekeeperModal button');
    const err = document.getElementById('passcodeError');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    err.style.display = 'none';
    
    try {
        const res = await fetch('api/auth_guest.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ passcode: code })
        });
        const json = await res.json();
        
        if (json.success) {
            // รหัสถูกต้อง -> รีโหลดหน้าจอเพื่อเข้าสู่ระบบในฐานะ Guest
            window.location.reload();
        } else {
            err.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = 'เข้าสู่ระบบ <i class="fas fa-arrow-right ms-2"></i>';
            document.getElementById('guestPasscode').value = '';
            document.getElementById('guestPasscode').focus();
        }
    } catch (e) {
        console.error(e);
        alert('System Error: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = 'เข้าสู่ระบบ <i class="fas fa-arrow-right ms-2"></i>';
    }
}

// ============================================================
//  SECTION 2: DATA LOADING & KPI
// ============================================================

function loadData() {
    showSpinner();
    $.ajax({
        url: `${API_URL}?action=read`,
        method: 'GET', 
        dataType: 'json',
        success: function(res) {
            if(res.success) {
                allData = res.data;
                calculateKPI(allData);
                applyGlobalFilter();
            } else {
                console.warn(res.message); // กรณี Unauthorized อาจจะไม่ส่งข้อมูลมา
            }
            hideSpinner();
        },
        error: function(xhr) {
            hideSpinner();
            // ถ้าเป็น 401 (ยังไม่ login/ใส่รหัส) ไม่ต้องแจ้งเตือน เพราะ Modal บังอยู่แล้ว
            if (xhr.status !== 401) {
                console.error('Connection Failed');
            }
        }
    });
}

function calculateKPI(data) {
    let countActive = 0, countTotal = 0, countWaitLoad = 0;
    let countToday = 0, countBacklog = 0;
    let count7Days = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);

    data.forEach(row => {
        countTotal++;
        
        const loadDate = getDateObj(row.snc_load_day);
        
        // 1 = เสร็จ, ค่าอื่น (0, null) = ยังไม่เสร็จ
        const isLoadDone = (row.is_loading_done == 1);
        const isProdDone = (row.is_production_done == 1);
        
        // Active = งานที่ยังไม่จบ (ยังไม่โหลด)
        if (!isLoadDone) countActive++; 
        
        // Wait Load = ผลิตเสร็จ(1) แต่ยังไม่โหลด
        if (isProdDone && !isLoadDone) countWaitLoad++;

        if (loadDate) {
            // TODAY Card: รวม Backlog (งานเก่าที่ยังไม่เสร็จ) + งานวันนี้
            if (loadDate < today && !isLoadDone) {
                countBacklog++;
                countToday++; 
            } else if (loadDate.getTime() === today.getTime()) {
                countToday++;
            }

            // 7 DAYS Card: งานล่วงหน้า 7 วัน
            if (loadDate > today && loadDate <= next7Days) {
                count7Days++;
            }
        }
    });

    // Update KPI Cards UI
    $('#kpi-today').text(countToday.toLocaleString());
    
    if (countBacklog > 0) {
        $('#kpi-backlog-sub').html(`<i class="fas fa-exclamation-triangle"></i> Inc. ${countBacklog} Delays`);
        $('#kpi-backlog-sub').removeClass('text-muted').addClass('text-danger fw-bold blink');
    } else {
        $('#kpi-backlog-sub').text('No Delays').removeClass('text-danger fw-bold blink').addClass('text-muted');
    }
    
    $('#kpi-7days').text(count7Days.toLocaleString());
    $('#kpi-wait-load').text(countWaitLoad.toLocaleString());
    $('#kpi-active').text(countActive.toLocaleString());
    $('#kpi-total').text(countTotal.toLocaleString());
}

// ============================================================
//  SECTION 3: FILTERING & SEARCH
// ============================================================

function filterTable(status) {
    showSpinner();
    setTimeout(() => {
        currentStatusFilter = status;
        currentPage = 1; // Reset หน้าไปหน้าแรก

        // Update UI Active State
        $('.kpi-card').removeClass('ring-2');
        if (status === 'TODAY') $('#defaultCard').addClass('ring-2');
        else if (status === '7DAYS') $('.kpi-card.border-info').addClass('ring-2');
        else if (status === 'WAIT_LOADING') $('.kpi-card.border-warning').addClass('ring-2');
        else if (status === 'ACTIVE') $('.kpi-card.border-primary').addClass('ring-2');
        else if (status === 'ALL') $('.kpi-card.border-secondary').addClass('ring-2');

        applyGlobalFilter();
    }, 50); 
}

function applyGlobalFilter() {
    const term = $('#universalSearch').val().toLowerCase().trim();
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);

    filteredData = allData.filter(row => {
        // 1. Search Text
        const txt = Object.values(row).join(' ').toLowerCase();
        if (term && !txt.includes(term)) return false;

        const isLoadDone = (row.is_loading_done == 1);
        const isProdDone = (row.is_production_done == 1);
        const loadDate = getDateObj(row.snc_load_day);

        // 2. Filter by Card Status
        if (currentStatusFilter === 'ALL') return true;
        if (currentStatusFilter === 'ACTIVE') return !isLoadDone;
        if (currentStatusFilter === 'WAIT_LOADING') return isProdDone && !isLoadDone;

        if (currentStatusFilter === 'TODAY') {
            if (!loadDate) return false; // ไม่มีวันที่ ไม่โชว์ใน Today
            const isBacklog = loadDate < today && !isLoadDone;
            const isToday = loadDate.getTime() === today.getTime();
            return isToday || isBacklog;
        }

        if (currentStatusFilter === '7DAYS') {
            if (!loadDate) return false;
            const isBacklog = loadDate < today && !isLoadDone; // รวม Backlog ให้เห็นด้วยเผื่อตกหล่น
            const isNext7 = loadDate > today && loadDate <= next7Days;
            return isBacklog || isNext7; 
        }

        return true;
    });

    // 3. Sorting (Priority: Delay > Today > Future > No Date)
    filteredData.sort((a, b) => {
        const da = getDateObj(a.snc_load_day);
        const db = getDateObj(b.snc_load_day);

        if (!da && !db) return 0;
        if (!da) return 1; // ไม่มีวันที่เอาไปท้ายสุด
        if (!db) return -1;

        // เช็ค Delay (เพื่อดันงาน Delay ขึ้นบนสุด)
        const delayA = (da < today && a.is_loading_done != 1) ? 1 : 0;
        const delayB = (db < today && b.is_loading_done != 1) ? 1 : 0;

        if (delayA !== delayB) return delayB - delayA; // Delay มาก่อน

        return da - db; // วันที่น้อย (ใกล้) มาก่อน
    });

    renderTable(); 
    hideSpinner();
}

// ============================================================
//  SECTION 4: RENDERING (TABLE & PAGINATION)
// ============================================================

function renderTable() {
    const tableBody = $('#tableBody');
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);

    if (filteredData.length === 0) {
        tableBody.html('<tr><td colspan="31" class="text-center py-5 text-muted">ไม่พบข้อมูลตามเงื่อนไข</td></tr>');
        $('#paginationContainer').html('');
        return;
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

    const rowsHtml = paginatedData.map(row => {
        const isLoad = row.is_loading_done == 1;
        const isProd = row.is_production_done == 1;
        
        const btnLoad = isCustomer 
            ? `<div class="btn-icon-minimal ${isLoad ? 'status-done' : 'status-wait'}"><i class="fas ${isLoad ? 'fa-check' : 'fa-truck-loading'}"></i></div>`
            : `<button class="btn-icon-minimal ${isLoad ? 'status-done' : 'status-wait'}" onclick="toggleStatus(${row.id}, 'loading', ${row.is_loading_done})"><i class="fas ${isLoad ? 'fa-check' : 'fa-truck-loading'}"></i></button>`;

        const btnProd = isCustomer 
            ? `<div class="btn-icon-minimal ${isProd ? 'status-done' : 'status-wait'}"><i class="fas ${isProd ? 'fa-check' : 'fa-industry'}"></i></div>`
            : `<button class="btn-icon-minimal ${isProd ? 'status-done' : 'status-wait'}" onclick="toggleStatus(${row.id}, 'production', ${row.is_production_done})"><i class="fas ${isProd ? 'fa-check' : 'fa-industry'}"></i></button>`;

        const inputHTML = (field, val, align = 'center') => {
            if(isCustomer) {
                return (val && val !== '') 
                    ? `<span class="text-dark">${val}</span>` 
                    : '<span class="text-muted fw-light">-</span>';
            }
            return `<input class="editable-input text-${align}" value="${val || ''}" onchange="upd(${row.id}, '${field}', this.value, this)" placeholder="-">`;
        };

        const dateDisplay = (val) => {
            const d = fnDateDisplay(val);
            if(isCustomer) return d || '<span class="text-muted fw-light">-</span>';
            return d; 
        };

        const loadDateObj = getDateObj(row.snc_load_day);
        const isDelay = loadDateObj && loadDateObj < todayDate && !isLoad;
        
        let poHtml = isDelay 
            ? `<div class="d-flex align-items-center justify-content-center text-danger fw-bold" style="font-size: 0.9rem;">
                <i class="fas fa-exclamation-triangle me-1 blink"></i>${row.po_number}
            </div>`
            : `<span class="text-primary fw-bold font-monospace" style="font-size: 0.9rem;">${row.po_number}</span>`;

        let dateHtml = '';
        const dateVal = fnDateDisplay(row.snc_load_day);
        if(isCustomer) {
            dateHtml = `<span class="${isDelay ? 'text-danger fw-bold' : ''}">${dateVal || '<span class="text-muted fw-light">-</span>'}</span>`;
        } else {
            dateHtml = `<input type="text" class="editable-input datepicker text-center ${isDelay?'text-danger fw-bold':''}" value="${dateVal}" data-field="snc_load_day" data-id="${row.id}" placeholder="-" style="width:85px; font-size:0.85rem;">`;
        }

        const cutDateVal = fnDateDisplay(row.cutoff_date);
        const cutTimeVal = row.cutoff_time ? row.cutoff_time.substring(0,5) : '';
        const htmlCutDate = isCustomer 
            ? (cutDateVal || '<span class="text-muted fw-light">-</span>') 
            : `<input type="text" class="editable-input datepicker text-danger fw-bold text-center" value="${cutDateVal}" data-field="cutoff_date" data-id="${row.id}" placeholder="-" style="width:85px;">`;
        const htmlCutTime = isCustomer 
            ? (cutTimeVal || '<span class="text-muted fw-light">-</span>') 
            : `<input type="time" class="editable-input text-danger fw-bold text-center" value="${cutTimeVal}" onchange="upd(${row.id}, 'cutoff_time', this.value, this)" placeholder="-" style="width:58px; padding:0;">`;

        // เรียงลำดับ <td> ใหม่ตามหัวข้อที่คุณต้องการ (Load -> Prod -> PO -> Remark -> Day/Time -> Booking -> CI -> Invoice -> Desc -> SKU -> Qty -> Cont -> Seal -> Week -> DC ...)
        return `<tr>
            <td class="sticky-col-left-1 bg-white text-center">${btnLoad}</td>
            <td class="sticky-col-left-2 bg-white text-center">${btnProd}</td>
            <td class="sticky-col-left-3 bg-white text-center fw-bold">${poHtml}</td>
            <td class="text-center">${inputHTML('remark', row.remark)}</td>

            <td class="text-center">
                <div class="d-flex gap-1 justify-content-center align-items-center">
                    ${dateHtml}
                    ${isCustomer 
                        ? (row.load_time ? `<span class="small text-muted">${row.load_time.substring(0,5)}</span>` : '')
                        : `<input type="time" class="editable-input fw-bold text-primary text-center" value="${row.load_time ? row.load_time.substring(0,5) : ''}" onchange="upd(${row.id}, 'load_time', this.value, this)" style="width:58px; font-size:0.85rem; padding:0;">`
                    }
                </div>
            </td>

            <td class="text-center">${inputHTML('booking_no', row.booking_no)}</td>
            <td class="text-center">${inputHTML('snc_ci_no', row.snc_ci_no)}</td>
            
            <td class="text-center" style="min-width:200px;">${row.description || '-'}</td>
            <td class="font-monospace text-center">${row.sku || '-'}</td>
            <td class="text-center fw-bold">${parseInt(row.quantity||0).toLocaleString()}</td>

            <td class="text-center">${inputHTML('container_no', row.container_no)}</td>
            <td class="text-center">${inputHTML('seal_no', row.seal_no)}</td>
            <td class="text-center">${inputHTML('container_tare', row.container_tare)}</td>
            <td class="text-center">${row.shipping_week || '-'}</td>
            <td class="text-center">${inputHTML('dc_location', row.dc_location)}</td>
            
            <td class="text-center">${inputHTML('ctn_size', row.ctn_size)}</td>
            <td class="text-center">${inputHTML('net_weight', row.net_weight)}</td>
            <td class="text-center">${inputHTML('gross_weight', row.gross_weight)}</td>
            <td class="text-center">${inputHTML('cbm', row.cbm)}</td>
            
            <td class="text-center col-vessel">
            <div class="editable-div text-center" 
            ${!isCustomer ? `contenteditable="true" onblur="upd(${row.id}, 'feeder_vessel', this.innerText, this)"` : ''}>
            ${row.feeder_vessel || '-'}
            </div>
            </td>
            
            <td class="text-center col-vessel">
            <div class="editable-div text-center" 
            ${!isCustomer ? `contenteditable="true" onblur="upd(${row.id}, 'mother_vessel', this.innerText, this)"` : ''}>
            ${row.mother_vessel || '-'}
            </div>
            </td>
            
            <td class="text-center">${isCustomer ? dateDisplay(row.si_vgm_cut_off) : `<input type="text" class="editable-input datepicker text-center" value="${fnDateDisplay(row.si_vgm_cut_off)}" data-field="si_vgm_cut_off" data-id="${row.id}" style="width:85px;">`}</td>
            <td class="text-center">${isCustomer ? dateDisplay(row.pickup_date) : `<input type="text" class="editable-input datepicker text-center" value="${fnDateDisplay(row.pickup_date)}" data-field="pickup_date" data-id="${row.id}" style="width:85px;">`}</td>
            <td class="text-center">${isCustomer ? dateDisplay(row.return_date) : `<input type="text" class="editable-input datepicker text-center" value="${fnDateDisplay(row.return_date)}" data-field="return_date" data-id="${row.id}" style="width:85px;">`}</td>
            
            <td class="text-center">${inputHTML('invoice_no', row.invoice_no)}</td>
            <td class="text-center">${inputHTML('shipping_customer_status', row.shipping_customer_status)}</td>
            <td class="text-center">${inputHTML('inspect_type', row.inspect_type)}</td>
            <td class="text-center">${inputHTML('inspection_result', row.inspection_result)}</td>
            <td class="bg-warning bg-opacity-10 text-center">${isCustomer ? `<strong>${dateDisplay(row.etd)}</strong>` : `<input type="text" class="editable-input datepicker fw-bold text-center" value="${fnDateDisplay(row.etd)}" data-field="etd" data-id="${row.id}" style="width:85px;">`}</td>

            <td class="sticky-col-right-2 bg-white text-danger text-center fw-bold">${htmlCutDate}</td>
            <td class="sticky-col-right-1 bg-white text-danger text-center fw-bold">${htmlCutTime}</td>
        </tr>`;
    }).join('');

    tableBody.html(rowsHtml);
    renderPagination();
    updateSummary();
    if(!isCustomer) initDatePickers(); 
}

function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (totalPages <= 1) { $('#paginationContainer').html(''); return; }
    
    let html = `<nav><ul class="pagination pagination-sm justify-content-center mb-0">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Prev</a></li>`;
    
    for(let i=1; i<=totalPages; i++) {
        if(i==1 || i==totalPages || (i >= currentPage-2 && i <= currentPage+2)) {
            html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a></li>`;
        } else if(i == currentPage-3 || i == currentPage+3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a></li></ul></nav>`;
    $('#paginationContainer').html(html);
}

function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    $('.table-responsive-custom').scrollTop(0);
}

// ============================================================
//  SECTION 5: ACTIONS (UPDATE / EXPORT / IMPORT)
// ============================================================

// Helpers
function getDateObj(dateStr) {
    if (!dateStr || dateStr === '0000-00-00') return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

// แก้ไขฟังก์ชัน fnDateDisplay ในไฟล์ shipping_loading.js
const fnDateDisplay = (d) => {
    if (!d || d === '0000-00-00' || d === '1900-01-01' || d === 'null') return '';
    
    // ถ้า d เป็น Date Object (เช่น new Date()) ให้แปลงเป็นสตริงก่อน
    if (d instanceof Date) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
    }

    // ถ้าเป็นสตริง (จากฐานข้อมูล) ให้ทำเหมือนเดิม
    const datePart = d.split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return d; 
    const [y, m, day] = parts;
    return `${day}/${m}/${y}`;
};

function showSpinner() { $('#loadingOverlay').css('display', 'flex'); }
function hideSpinner() { $('#loadingOverlay').hide(); }

// Inline Edit Logic
function initDatePickers() {
    if (typeof flatpickr !== 'undefined') {
        flatpickr(".datepicker", {
            dateFormat: "d/m/Y", allowInput: true, disableMobile: "true",
            onChange: function(selectedDates, dateStr, instance) {
                if (!dateStr) return;
                const id = instance.element.getAttribute('data-id');
                const field = instance.element.getAttribute('data-field');
                // แปลงเป็น YYYY-MM-DD เพื่อส่ง API
                const [d, m, y] = dateStr.split('/');
                upd(id, field, `${y}-${m}-${d}`, instance.element);
            }
        });
    }
}

function upd(id, field, val, inputElement) {
    if(isCustomer) return;
    const $el = $(inputElement);
    $el.css({'background-color': '#fff3cd', 'border': '1px solid #ffc107'});

    $.post(API_URL, { action: 'update_cell', id, field, value: val })
    .done(res => {
        if(res.success) {
            $el.css({'background-color': '#d1e7dd', 'border-color': '#198754'});
            setTimeout(() => $el.css({'background-color': 'transparent', 'border-color': 'transparent'}), 1000);
            
            // อัปเดตข้อมูลในตัวแปรหลัก
            const row = allData.find(d => d.id == id);
            if(row) row[field] = val;

            // --- ส่วนสำคัญ: สั่งคำนวณใหม่ทั้งหมดหน้าจอ ---
            calculateKPI(allData);  // อัปเดตตัวเลขบน Card (Today, 7Days, etc.)
            applyGlobalFilter();    // อัปเดตตารางและเรียก updateSummary() อัตโนมัติ
        } else {
            alert('Save failed: ' + res.message);
        }
    });
}

function toggleStatus(id, type, currentVal) {
    if(isCustomer) return;
    showSpinner();
    const field = (type === 'loading') ? 'is_loading_done' : 'is_production_done';
    const newVal = (currentVal == 1) ? 0 : 1;
    
    $.post(API_URL, { action: 'update_check', id, field, checked: newVal })
    .done(res => {
        if(res.success) {
            // อัปเดตข้อมูลใน Local เพื่อความรวดเร็ว (หรือจะ Load ใหม่เลยก็ได้)
            const row = allData.find(d => d.id == id);
            if(row) row[field] = newVal;
            updateSummary();
            
            calculateKPI(allData); // คำนวณ KPI ใหม่
            applyGlobalFilter();   // วาดตารางใหม่
        } else { 
            hideSpinner(); alert('Failed: ' + res.message); 
        }
    });
}

function exportToCSV() {
    window.location.href = `${API_URL}?action=export`;
}

// FULL IMPORT LOGIC (Client-side Parse -> Send JSON)
async function uploadFile() {
    const fileInput = document.getElementById('csv_file'); 
    if (!fileInput || !fileInput.files[0]) return;

    if (isCustomer) { alert('Access Denied'); return; }

    const file = fileInput.files[0];
    showSpinner();

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        let rawData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        // Clean Keys (ลบช่องว่างหัวตาราง)
        let cleanedData = rawData.map(row => {
            let newRow = {};
            for (let key in row) {
                let cleanKey = key.trim().replace(/\s+/g, ' '); 
                newRow[cleanKey] = row[key];
            }
            return newRow;
        });

        // Filter empty rows
        cleanedData = cleanedData.filter(row => row['PO'] || row['po_number'] || row['PO Number']);
        
        $.post(API_URL, {
            action: 'import_json',
            data: JSON.stringify(cleanedData)
        }, function(res) {
            hideSpinner();
            if (res.success) {
                showImportResult(res);
                loadData(); // Reload ข้อมูลใหม่
            } else {
                alert('Import Error: ' + res.message);
            }
        }, 'json').fail(function() {
            hideSpinner();
            alert('Server Connection Error');
        });
    } catch (e) {
        hideSpinner();
        alert("Error reading file: " + e.message);
    }
    
    // Clear Input
    fileInput.value = '';
}

function showImportResult(res) {
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
    
    if (importModal) importModal.show();
}

function guestLogout() {
    if(!confirm('ต้องการล็อคหน้าจอใช่หรือไม่?')) return;
    
    // เรียก API เพื่อล้าง Session
    fetch('api/auth_guest.php?action=logout')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // รีโหลดหน้าจอ -> จะกลับไปเจอ Gatekeeper Modal เพราะไม่มี Session แล้ว
                window.location.reload();
            }
        })
        .catch(err => console.error(err));
}

function updateSummary() {
    if (!allData || allData.length === 0) return;

    // สร้างวันที่วันนี้แบบ YYYY-MM-DD เพื่อเอาไว้เทียบกับค่าใน Database ตรงๆ
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0]; 
    
    const targetData = allData.filter(row => {
        // row.snc_load_day มักจะมาเป็น "YYYY-MM-DD"
        const rowDate = row.snc_load_day ? row.snc_load_day.split(' ')[0] : '';
        const rowDateObj = getDateObj(row.snc_load_day);
        
        const isTodayJob = (rowDate === todayISO);
        // งานค้าง: วันที่น้อยกว่าวันนี้ และ ยังโหลดไม่เสร็จ
        const isBacklog = (rowDateObj && rowDateObj < now && row.is_loading_done == 0);
        
        return isTodayJob || isBacklog;
    });

    // คำนวณ Containers (นับ Unique)
    const uniqueContainers = [...new Set(targetData
        .map(row => {
            // ถ้ามีเลขตู้ (Container No) ให้ใช้เลขตู้เพื่อจัดการตู้ที่รวมหลาย PO
            if (row.container_no && row.container_no !== '' && row.container_no !== '-') {
                return row.container_no;
            }
            // ถ้าไม่มีเลขตู้ ให้ใช้ PO Number หรือ ID แถวเพื่อให้นับเป็น 1 รายการ
            return 'PENDING_' + row.id; 
        })
    )].length;

    // คำนวณ Pcs
    const totalPcs = targetData.reduce((sum, row) => sum + (parseInt(row.quantity) || 0), 0);

    // คำนวณ Progress
    const totalRows = targetData.length;
    const loadedCount = targetData.filter(row => row.is_loading_done == 1).length;
    const loadPercent = totalRows > 0 ? Math.round((loadedCount / totalRows) * 100) : 0;

    // อัปเดต UI
    $('#sumTotalContainers').text(uniqueContainers.toLocaleString());
    $('#sumTotalPcs').text(totalPcs.toLocaleString());
    $('#sumLoadProgress').text(`${loadedCount}/${totalRows}`);
    $('#loadProgressBar').css('width', loadPercent + '%');
    
    // เปลี่ยนสีหลอด
    if (loadPercent === 100 && totalRows > 0) {
        $('#loadProgressBar').removeClass('bg-primary').addClass('bg-success');
    } else {
        $('#loadProgressBar').removeClass('bg-success').addClass('bg-primary');
    }
}