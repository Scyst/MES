// page/sales/script/salesDashboard.js
"use strict";

const API_URL = 'api/manage_sales_orders.php';
let allData = [];
let currentStatusFilter = 'ACTIVE';
let importModal;
let createOrderModal;
let sortState = []; 
let currentExchangeRate = 32.0;
let currentPage = 1;
let rowsPerPage = 100;
let filteredData = [];
let sortableInstance = null;
let isManualSortMode = true;

// RM Forecast globals
let rmForecastData = null;
let rmForecastModal = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Modals
    const modalEl = document.getElementById('importResultModal');
    if (modalEl) importModal = new bootstrap.Modal(modalEl);

    const createEl = document.getElementById('createOrderModal');
    if (createEl) createOrderModal = new bootstrap.Modal(createEl);

    const rmEl = document.getElementById('rmForecastModal');
    if (rmEl) rmForecastModal = new bootstrap.Modal(rmEl);

    const startDateInput = document.getElementById('filterStartDate');
    const endDateInput = document.getElementById('filterEndDate');

    if(startDateInput && endDateInput) {
        startDateInput.addEventListener('change', () => loadData());
        endDateInput.addEventListener('change', () => loadData());
    }

    const dateTypeSelect = document.getElementById('filterDateType');
    if(dateTypeSelect) {
        dateTypeSelect.addEventListener('change', () => loadData());
    }

    // 2. Event Listeners
    document.getElementById('universalSearch').addEventListener('input', (e) => {
        // Debounce search
        clearTimeout(window.searchTimer);
        window.searchTimer = setTimeout(() => renderTable(e.target.value), 300);
    });
    
    document.getElementById('fileInput').addEventListener('change', uploadFile);
    
    const rateInput = document.getElementById('exchangeRate');
    if(rateInput) {
        rateInput.addEventListener('change', (e) => {
            currentExchangeRate = parseFloat(e.target.value) || 32;
            renderTable(document.getElementById('universalSearch').value);
        });
        fetchExchangeRate(); 
    }

    // 3. Sorting Headers
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', (e) => handleSort(th.dataset.sort, e));
    });

    // 4. Initial Load
    loadData();
});

// --- Helper Functions [FIXED TIMEZONE ISSUES] ---

function getDateObj(dateStr) {
    if (!dateStr || dateStr === '0000-00-00') return null;
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === '' || dateStr === '0000-00-00') {
        return '<span class="text-muted fw-light">-</span>'; 
    }
    
    let datePart = dateStr.split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d}/${m}/${y}`;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-GB').format(d);
}

function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }

function showToast(msg, color='#333') {
    const el = document.createElement('div');
    el.className = 'toast show position-fixed top-0 end-0 m-3 text-white border-0 shadow';
    el.style.backgroundColor = color;
    el.style.zIndex = 1060;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 3000);
}

// --- Data Loading & API ---

async function fetchExchangeRate() {
    const rateInput = document.getElementById('exchangeRate');
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data && data.rates && data.rates.THB) {
            const thbRate = data.rates.THB;
            if (rateInput) rateInput.value = thbRate.toFixed(2);
            currentExchangeRate = thbRate;
            renderTable(document.getElementById('universalSearch').value);
        }
    } catch (err) { console.error("Failed to fetch rate:", err); }
}

async function loadData() {
    showSpinner();
    try {
        const startDate = document.getElementById('filterStartDate')?.value || '';
        const endDate = document.getElementById('filterEndDate')?.value || '';
        const dateType = document.getElementById('filterDateType')?.value || 'loading_date';

        const res = await fetch(`${API_URL}?action=read&status=${currentStatusFilter}&start_date=${startDate}&end_date=${endDate}&date_type=${dateType}`);
        const json = await res.json();

        if (json.success) {
            allData = json.data;
            updateKPI(json.summary);
            sortState = [];
            currentPage = 1;
            updateSortUI();
            renderTable(document.getElementById('universalSearch').value);
            
            // Auto-run forecast silently without opening modal
            runRMForecast(false);
        }
    } catch (err) { console.error(err); showToast('Error loading data', '#dc3545'); } finally { hideSpinner(); }
}

function clearDateFilter() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    loadData(); 
}

function updateKPI(summary) {
    if (!summary) return;
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = (val || 0).toLocaleString();
    };
    
    setVal('kpi-active', summary.total_active); 
    setVal('kpi-wait-prod', summary.wait_prod);
    setVal('kpi-prod-done', summary.prod_done);
    setVal('kpi-wait-load', summary.wait_load);
    setVal('kpi-total-all', summary.total_all); 
}

function renderTable(searchTerm) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    // 1. Filtering
    const keywords = searchTerm ? searchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0) : [];
    filteredData = allData.filter(item => {
        if (keywords.length === 0) return true;
        const text = Object.values(item).join(' ').toLowerCase();
        return keywords.every(k => text.includes(k));
    });

    // 2. Sorting
    if (sortState.length > 0) {
        isManualSortMode = false;
        if(sortableInstance) sortableInstance.option("disabled", true);
        
        filteredData.sort((a, b) => {
            for (let sort of sortState) {
                const col = sort.column;
                const dir = sort.direction === 'asc' ? 1 : -1;
                let valA = a[col] || ''; let valB = b[col] || '';
                
                if (col === 'quantity' || col === 'price') { 
                    valA = parseFloat(valA) || 0; valB = parseFloat(valB) || 0; 
                }
                if (col.includes('date')) { 
                    if(valA && valA.match(/^\d{4}-\d{2}-\d{2}/)) { }
                    else {
                        valA = new Date(valA || '1970-01-01').getTime(); 
                        valB = new Date(valB || '1970-01-01').getTime();
                    }
                }
                
                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
            }
            return 0;
        });
    } else {
        isManualSortMode = true;
        filteredData.sort((a, b) => {
            let ordA = parseInt(a.custom_order) || 999999;
            let ordB = parseInt(b.custom_order) || 999999;
            if (ordA !== ordB) return ordA - ordB;
            return b.id - a.id; 
        });
        if(sortableInstance) sortableInstance.option("disabled", false);
    }

    // 3. Summary (คำนวณจาก filteredData ทั้งหมด ไม่ใช่แค่หน้าเดียว)
    const totalContainers = filteredData.length;
    let totalQty = 0;
    let totalAmountTHB = 0;
    filteredData.forEach(item => {
        totalQty += parseInt(item.quantity || 0);
        totalAmountTHB += (parseFloat(item.price || 0) * currentExchangeRate); 
    });
    
    document.getElementById('sum-containers').innerText = `${totalContainers}`;
    const elQty = document.getElementById('sum-qty');
    if (elQty) elQty.innerText = `${totalQty.toLocaleString()}`;
    document.getElementById('sum-amount').innerText = `฿${totalAmountTHB.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // 4. Pagination Slice
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="20" class="text-center py-5 text-muted">No data found</td></tr>';
        document.getElementById('paginationContainer').innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

    // 5. Generate HTML
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);

    const showTxt = (val) => {
        return (val && val.toString().trim() !== '') ? val : '<span class="text-muted fw-light">-</span>';
    };

    tbody.innerHTML = paginatedData.map(item => {
        const isPrd = item.is_production_done == 1;
        const isLoad = item.is_loading_done == 1;
        const isConf = item.is_confirmed == 1;
        
        const inspRaw = (item.inspection_status || '').toLowerCase();
        const isInsp = (inspRaw === 'pass' || inspRaw === 'ok' || inspRaw === 'done' || inspRaw === 'yes');

        const loadDateObj = getDateObj(item.loading_date);
        const isDelay = loadDateObj && loadDateObj < todayDate && !isLoad;
        const stickyClass = 'bg-white';
        
        // FORECAST BADGE (Sleek Design)
        let forecastIcon = '';
        let rowLeftBorder = '';
        
        if (rmForecastData && rmForecastData[item.id]) {
            const fData = rmForecastData[item.id];
            if (fData.status === 'SHORTAGE') {
                let missingList = fData.shortages.filter(s => s.shortage > 0 || s.is_missing_bom).map(s => s.is_missing_bom ? `No BOM found` : `${s.sap_no} (ขาด ${s.shortage.toLocaleString()})`).join('<br>');
                forecastIcon = `<i class="fas fa-exclamation-circle text-danger ms-2" title="${missingList}" data-bs-toggle="tooltip" data-bs-html="true" style="cursor:help; font-size: 1.1em;"></i>`;
                rowLeftBorder = 'box-shadow: inset 4px 0 0 #dc3545;'; // Red left border
            } else if (fData.status === 'READY') {
                forecastIcon = `<i class="fas fa-check-circle text-success ms-2 opacity-50" title="RM Ready" data-bs-toggle="tooltip"></i>`;
                rowLeftBorder = 'box-shadow: inset 4px 0 0 #198754;'; // Green left border
            }
        }
        
        let poContent = isDelay 
            ? `<div class="d-flex align-items-center text-danger" title="Late Delivery"><i class="fas fa-exclamation-triangle me-2 blink"></i><span class="text-truncate" style="max-width:120px;">${item.po_number}</span>${forecastIcon}</div>`
            : `<div class="d-flex align-items-center"><span class="text-primary font-monospace text-truncate" style="max-width:120px;">${item.po_number}</span>${forecastIcon}</div>`;

        const poHtml = `
            <div class="d-flex justify-content-between align-items-center w-100 group-action">
                ${poContent}
                <button class="btn btn-link btn-sm text-danger p-0 ms-2 opacity-25 hover-100" onclick="deleteOrder(${item.id}, '${item.po_number}')" title="Delete Order" style="text-decoration:none;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>`;

        const btnPrdClass = isPrd ? 'status-done' : 'status-wait';
        const btnPrdIcon = isPrd ? '<i class="fas fa-check"></i>' : '<i class="fas fa-industry"></i>';
        const btnLoadClass = isLoad ? 'status-done' : 'status-wait';
        const btnLoadIcon = isLoad ? '<i class="fas fa-check"></i>' : '<i class="fas fa-truck-loading"></i>';
        const btnInspClass = isInsp ? 'status-done' : 'status-wait';
        const btnInspIcon = isInsp ? '<i class="fas fa-check"></i>' : '<i class="fas fa-microscope"></i>';
        const priceTHB = (parseFloat(item.price || 0) * currentExchangeRate).toFixed(2);

        return `<tr data-id="${item.id}">
            <td class="text-center drag-handle sticky-col-left-1 ${stickyClass}" style="cursor: ${isManualSortMode ? 'move' : 'not-allowed'}; color: ${isManualSortMode ? '#6c757d' : '#dee2e6'}; ${rowLeftBorder}">
                <i class="fas fa-grip-vertical"></i>
            </td>
            <td class="sticky-col-left-2 fw-bold ${stickyClass} text-start ps-3">${poHtml}</td>
            <td class="sticky-col-left-3 text-center ${stickyClass}">
                <div class="form-check form-switch d-flex justify-content-center">
                    <input class="form-check-input" type="checkbox" style="cursor: pointer;" ${isConf ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'confirm', this.checked)">
                </div>
            </td>
            <td class="font-monospace text-center">${showTxt(item.sku)}</td>
            <td class="text-start" style="max-width: 200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.description}">${showTxt(item.description)}</td>
            <td class="text-center">${showTxt(item.color)}</td>
            <td class="text-center fw-bold font-monospace editable" ondblclick="makeEditable(this, ${item.id}, 'quantity', '${item.quantity}', 'number')">${parseInt(item.quantity||0).toLocaleString()}</td>
            <td class="text-center editable" ondblclick="makeEditable(this, ${item.id}, 'dc_location', '${item.dc_location}')">${showTxt(item.dc_location)}</td>
            <td class="text-center editable" ondblclick="makeEditable(this, ${item.id}, 'loading_week', '${item.loading_week}')">${showTxt(item.loading_week)}</td>
            <td class="text-center editable" ondblclick="makeEditable(this, ${item.id}, 'shipping_week', '${item.shipping_week}')">${showTxt(item.shipping_week)}</td>
            <td class="text-center fw-bold text-secondary editable" ondblclick="makeEditable(this, ${item.id}, 'team', '${item.team}')">${showTxt(item.team)}</td>
            <td class="text-center bg-warning bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'production_date', '${item.production_date}', 'date')">${formatDate(item.production_date)}</td>
            <td class="text-center bg-warning bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'production_end_date', '${item.production_end_date}', 'date')">${formatDate(item.production_end_date)}</td>
            <td class="text-center bg-warning bg-opacity-10"><button class="btn-icon-minimal ${btnPrdClass}" onclick="toggleCheck(${item.id}, 'prod', ${!isPrd})">${btnPrdIcon}</button></td>
            <td class="text-center bg-info bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'loading_date', '${item.loading_date}', 'date')">${formatDate(item.loading_date)}</td>
            <td class="text-center bg-info bg-opacity-10"><button class="btn-icon-minimal ${btnLoadClass}" onclick="toggleCheck(${item.id}, 'load', ${!isLoad})">${btnLoadIcon}</button></td>
            <td class="text-center bg-purple bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'inspection_date', '${item.inspection_date}', 'date')">${formatDate(item.inspection_date)}</td>
            <td class="text-center bg-purple bg-opacity-10"><button class="btn-icon-minimal ${btnInspClass}" onclick="toggleCheck(${item.id}, 'insp', ${!isInsp})" style="${isInsp ? 'background-color:#d1e7dd; color:#198754;' : ''}">${btnInspIcon}</button></td>
            <td class="font-monospace text-primary text-center editable" ondblclick="makeEditable(this, ${item.id}, 'ticket_number', '${item.ticket_number}')">${showTxt(item.ticket_number)}</td>
            <td class="text-end fw-bold text-success font-monospace">฿${parseFloat(priceTHB).toLocaleString()}</td>
            <td class="text-start text-muted small editable" ondblclick="makeEditable(this, ${item.id}, 'remark', '${item.remark}')">${showTxt(item.remark)}</td>
        </tr>`;
    }).join('');

    renderPagination();
    setTimeout(initSortable, 100);
}

function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const container = document.getElementById('paginationContainer');
    
    if (totalPages <= 1) { 
        container.innerHTML = ''; 
        return; 
    }
    
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
    container.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable(document.getElementById('universalSearch').value);
    document.querySelector('.table-responsive-custom').scrollTop = 0;
}

// --- Inline Editing (Visual Feedback) ---

function makeEditable(td, id, field, currentVal, type = 'text') {
    if (td.querySelector('input')) return; 
    if (currentVal === 'null' || currentVal === 'undefined') currentVal = '';

    const originalHtml = td.innerHTML;
    const input = document.createElement('input');
    input.type = type; 
    input.value = currentVal;
    input.className = 'form-control form-control-sm p-1 text-center';
    input.style.width = '100%';
    
    input.style.backgroundColor = '#fff3cd'; 
    input.style.borderColor = '#ffc107';

    td.innerHTML = '';
    td.appendChild(input);
    input.focus();

    const save = async () => {
        const newValue = input.value.trim();
        if (newValue !== String(currentVal)) {
            try {
                const res = await fetch(`${API_URL}?action=update_cell`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ id, field, value: newValue })
                });
                const json = await res.json();
                
                if (json.success) {
                    input.style.backgroundColor = '#d1e7dd';
                    input.style.borderColor = '#198754';
                    input.style.transition = 'all 0.5s';
                    
                    const row = allData.find(d => d.id == id);
                    if (row) row[field] = newValue;

                    setTimeout(() => {
                        renderTable(document.getElementById('universalSearch').value);
                    }, 500); 
                } else { 
                    alert('Update failed: ' + json.message); 
                    td.innerHTML = originalHtml; 
                }
            } catch (e) { 
                console.error(e); 
                td.innerHTML = originalHtml; 
                alert('Connection failed');
            }
        } else { 
            td.innerHTML = originalHtml; 
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') input.blur(); });
}

// --- Toggle Status (Buttons/Checkboxes) ---

async function toggleCheck(id, field, val) {
    const dbVal = (val === true || val === 1 || val === '1') ? 1 : 0;
    showSpinner();

    try {
        const res = await fetch(`${API_URL}?action=update_check`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, field, checked: dbVal })
        });
        const json = await res.json();
        
        if (json.success) {
            const row = allData.find(d => d.id == id);
            if (row) {
                // สร้างฟังก์ชันช่วยหาวันที่ปัจจุบัน Format: YYYY-MM-DD
                const getTodayStr = () => {
                    const d = new Date();
                    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                };

                if (field === 'confirm') {
                    row.is_confirmed = dbVal;
                }
                else if (field === 'prod') {
                    row.is_production_done = dbVal;
                    // ถ้าเป็นการกด Done (1) และวันที่ยังว่างอยู่ ให้เติมวันที่ปัจจุบันลงไปใน UI ทันที
                    if (dbVal === 1 && (!row.production_end_date || row.production_end_date === '0000-00-00')) {
                        row.production_end_date = getTodayStr();
                    }
                }
                else if (field === 'load') {
                    row.is_loading_done = dbVal;
                    // เผื่อไว้สำหรับช่อง Load Date ด้วย (ใช้ Logic COALESCE เหมือน backend)
                    if (dbVal === 1 && (!row.loading_date || row.loading_date === '0000-00-00')) {
                        row.loading_date = getTodayStr();
                    }
                }
                else if (field === 'insp') {
                    row.inspection_status = dbVal ? 'Pass' : '';
                }
            }
            // รีเฟรชตารางด้วยข้อมูลที่ถูกอัปเดตใน Memory
            renderTable(document.getElementById('universalSearch').value);
        } else {
            showToast('Update failed', '#dc3545');
        }
    } catch (err) { 
        console.error(err); 
        showToast('Connection failed', '#dc3545'); 
    }
    finally { 
        hideSpinner(); 
    }
}

// --- Sorting & Reordering ---

function handleSort(column, event) {
    const isMulti = event.shiftKey; 
    const existingIndex = sortState.findIndex(s => s.column === column);
    
    if (existingIndex !== -1) {
        if (sortState[existingIndex].direction === 'asc') {
            sortState[existingIndex].direction = 'desc';
        } else {
            sortState.splice(existingIndex, 1);
        }
    } else {
        if (isMulti) sortState.push({ column, direction: 'asc' });
        else sortState = [{ column, direction: 'asc' }];
    }
    updateSortUI();
    renderTable(document.getElementById('universalSearch').value);
}

function updateSortUI() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('active-sort');
        const icon = th.querySelector('.sort-icon');
        if(icon) icon.className = 'sort-icon fas fa-sort text-muted opacity-25';
        
        const sortIndex = sortState.findIndex(s => s.column === th.dataset.sort);
        if (sortIndex !== -1) {
            th.classList.add('active-sort');
            const direction = sortState[sortIndex].direction;
            if(icon) icon.className = direction === 'asc' ? 'sort-icon fas fa-sort-up text-primary' : 'sort-icon fas fa-sort-down text-primary';
        }
    });
}

function resetToPlanOrder() {
    sortState = [];
    updateSortUI();
    renderTable(document.getElementById('universalSearch').value);
}

function initSortable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    if (sortableInstance) sortableInstance.destroy();

    sortableInstance = new Sortable(tbody, {
        animation: 150,
        handle: '.drag-handle', 
        disabled: !isManualSortMode, 
        ghostClass: 'bg-primary-subtle', 
        onEnd: function (evt) { saveNewOrder(); }
    });
}

async function saveNewOrder() {
    const rows = document.querySelectorAll('#tableBody tr');
    const orderedIds = Array.from(rows).map(row => row.dataset.id);
    
    // [FIXED] คำนวณ Offset ของหน้าที่กำลังแสดงอยู่
    const startIndex = (currentPage - 1) * rowsPerPage;

    orderedIds.forEach((id, index) => {
        const item = allData.find(d => d.id == id);
        if(item) item.custom_order = startIndex + index + 1; // บวก Offset ของหน้าปัจจุบัน
    });

    try {
        await fetch(`${API_URL}?action=reorder_items`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderedIds })
        });
    } catch (err) {
        console.error('Reorder failed', err);
        showToast('Failed to save order', '#dc3545');
        loadData(); 
    }
}

// --- Import / Create Modal Functions ---

function filterData(status) {
    currentStatusFilter = status;
    currentPage = 1;
    document.querySelectorAll('.kpi-card').forEach(el => el.classList.remove('active'));
    
    const idMap = { 
        'ACTIVE': 'card-active', 'ALL': 'card-all', 
        'WAIT_PROD': 'card-wait-prod', 'PROD_DONE': 'card-prod-done', 
        'WAIT_LOAD': 'card-wait-load'
    };
    
    const activeId = idMap[status];
    if(activeId) document.getElementById(activeId).classList.add('active');
    
    loadData(); 
}

function openCreateModal() {
    document.getElementById('createOrderForm').reset();
    createOrderModal.show();
}

async function submitCreateOrder() {
    const form = document.getElementById('createOrderForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    
    // Disable submit button manually to prevent double submit (Operator Proofing)
    const submitBtn = form.querySelector('button[type="button"].btn-primary');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    }
    
    showSpinner();
    try {
        const res = await fetch(`${API_URL}?action=create_single`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Created successfully', '#198754');
            createOrderModal.hide();
            loadData();
        } else { alert('Error: ' + json.message); }
    } catch (err) { 
        alert('Failed to create order'); 
    } finally { 
        hideSpinner(); 
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create (บันทึก)';
        }
    }
}

// --- RM Forecast ---
async function runRMForecast(showModal = true) {
    if (showModal) showSpinner();
    try {
        const startDate = document.getElementById('filterStartDate')?.value || '';
        const endDate = document.getElementById('filterEndDate')?.value || '';
        const dateType = document.getElementById('filterDateType')?.value || 'loading_date';

        const res = await fetch(`api/forecast_rm.php?start_date=${startDate}&end_date=${endDate}&date_type=${dateType}`);
        const json = await res.json();
        
        if (json.success) {
            rmForecastData = json.data;
            
            const tbody = document.getElementById('rmForecastTableBody');
            tbody.innerHTML = '';
            
            if (json.summary && json.summary.length > 0) {
                json.summary.sort((a,b) => b.total_shortage - a.total_shortage);
                
                json.summary.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="fw-bold text-danger">${item.sap_no}</td>
                        <td>${item.part_description}</td>
                        <td class="text-end fw-bold text-primary">${(item.available_in_store || 0).toLocaleString()}</td>
                        <td class="text-end fw-bold text-danger">${item.total_shortage.toLocaleString()}</td>
                    `;
                    tbody.appendChild(tr);
                });
                
                if(showModal && rmForecastModal) rmForecastModal.show();
            } else {
                if (showModal) showToast('✅ วัตถุดิบเพียงพอสำหรับทุก PO ที่ยังไม่เสร็จ', '#198754');
            }
            
            renderTable(document.getElementById('universalSearch').value);
            
            // Re-init tooltips for newly added badges
            setTimeout(() => {
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
            }, 500);

        } else {
            if (showModal) alert('Error running forecast: ' + json.message);
        }
    } catch (err) {
        console.error(err);
        if (showModal) alert('Failed to connect to forecast API');
    } finally {
        if (showModal) hideSpinner();
    }
}

async function deleteOrder(id, poNum) {
    if (!confirm(`Are you sure you want to delete PO: ${poNum}?`)) return;

    showSpinner();
    try {
        const res = await fetch(`${API_URL}?action=delete_single`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: id })
        });
        const json = await res.json();

        if (json.success) {
            showToast('Order deleted successfully', '#198754');
            loadData(); 
        } else {
            alert('Error: ' + json.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to delete order');
    } finally {
        hideSpinner();
    }
}

async function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    showToast("Uploading...", "#0dcaf0");
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type: 'array', dateNF: 'dd/mm/yyyy'});
            const csvOutput = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: '' });
            const blob = new Blob([csvOutput], { type: 'text/csv' });
            const formData = new FormData();
            formData.append('file', blob, 'converted.csv');
            sendFileToBackend(formData);
        };
        reader.readAsArrayBuffer(file);
    } else {
        const formData = new FormData();
        formData.append('file', file);
        sendFileToBackend(formData);
    }
    e.target.value = '';
}

let previewImportData = [];
let previewModal = null;

document.addEventListener('DOMContentLoaded', () => {
    previewModal = new bootstrap.Modal(document.getElementById('importPreviewModal'));
});

async function sendFileToBackend(formData) {
    showSpinner();
    try {
        const res = await fetch(`${API_URL}?action=preview_import`, { method: 'POST', body: formData });
        const json = await res.json();
        hideSpinner();
        
        if (json.success) {
            previewImportData = json.data;
            renderPreviewTable();
            previewModal.show();
        } else {
            alert('Preview Error: ' + json.message);
        }
    } catch (err) {
        hideSpinner();
        alert('Upload failed: ' + err.message);
    }
}

function renderPreviewTable() {
    const tbody = document.getElementById('previewTableBody');
    tbody.innerHTML = '';
    let errorCount = 0;
    previewImportData.forEach(r => {
        errorCount += Object.keys(r.warnings || {}).length;
    });
    
    const searchVal = (document.getElementById('previewSearchInput') ? document.getElementById('previewSearchInput').value.toLowerCase() : '');
    const errOnly = (document.getElementById('previewErrorFilter') ? document.getElementById('previewErrorFilter').checked : false);
    
    previewImportData.forEach((row, idx) => {
        const hasWarning = Object.keys(row.warnings || {}).length > 0;
        
        // Filter logic
        if (errOnly && !hasWarning) return;
        
        if (searchVal) {
            const rowText = `${row.po_number || ''} ${row.sku || ''} ${row.description || ''}`.toLowerCase();
            if (!rowText.includes(searchVal)) return;
        }

        const tr = document.createElement('tr');
        
        const makeDateCell = (key, val) => {
            const isWarn = row.warnings && row.warnings[key];
            
            const displayVal = formatDate(val).replace(/<[^>]+>/g, '') === '-' ? '' : formatDate(val);
            
            return `<td class="${isWarn ? 'bg-danger bg-opacity-10 border-danger border-2' : ''}">
                <input type="text" class="form-control form-control-sm border-0 bg-transparent text-center ${isWarn ? 'text-danger fw-bold' : ''}" 
                    value="${displayVal}" 
                    placeholder="DD/MM/YYYY"
                    onchange="updatePreviewData(${idx}, '${key}', this.value, event)"
                    ${isWarn ? 'title="ปี < 2023 กรุณาแก้ไข (วว/ดด/ปปปป)"' : ''}>
            </td>`;
        };

        tr.innerHTML = `
            <td class="text-muted text-center">${row.row_index}</td>
            <td class="fw-bold">${row.po_number || '-'}</td>
            <td>${row.sku || '-'}</td>
            ${makeDateCell('order_date', row.order_date)}
            ${makeDateCell('production_date', row.production_date)}
            ${makeDateCell('production_end_date', row.production_end_date)}
            ${makeDateCell('loading_date', row.loading_date)}
            ${makeDateCell('inspection_date', row.inspection_date)}
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('previewErrorCount').innerText = errorCount;
}

window.updatePreviewData = function(index, key, value, event) {
    let ymd = null;
    value = value.trim();
    if (value) {
        const m = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (m) {
            let y = parseInt(m[3], 10);
            if (y < 100) y += (y < 50 ? 2000 : 1900);
            const mo = m[2].padStart(2, '0');
            const d = m[1].padStart(2, '0');
            ymd = `${y}-${mo}-${d}`;
        } else {
            const m2 = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (m2) {
                ymd = value;
            } else {
                alert("รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้รูปแบบ วัน/เดือน/ปี เช่น 09/05/2026");
                if (event && event.target) {
                    const oldVal = previewImportData[index][key];
                    event.target.value = oldVal ? formatDate(oldVal).replace(/<[^>]+>/g, '') : '';
                }
                return;
            }
        }
    }

    previewImportData[index][key] = ymd;
    // Re-evaluate if it's still a warning
    if (ymd) {
        const year = parseInt(ymd.split('-')[0], 10);
        if (year >= 2023) {
            if (previewImportData[index].warnings) {
                delete previewImportData[index].warnings[key];
            }
        } else {
            previewImportData[index].warnings = previewImportData[index].warnings || {};
            previewImportData[index].warnings[key] = true;
        }
    } else {
        if (previewImportData[index].warnings) delete previewImportData[index].warnings[key];
    }
    
    // Update total error count
    let totalErrors = 0;
    previewImportData.forEach(r => {
        totalErrors += Object.keys(r.warnings || {}).length;
    });
    document.getElementById('previewErrorCount').innerText = totalErrors;
    
    // Visually update the input field's parent styling
    if (event && event.target) {
        const input = event.target;
        const td = input.parentElement;
        if (previewImportData[index].warnings && previewImportData[index].warnings[key]) {
            td.className = 'bg-danger bg-opacity-10 border-danger border-2';
            input.classList.add('text-danger', 'fw-bold');
        } else {
            td.className = '';
            input.classList.remove('text-danger', 'fw-bold');
        }
    }
};

window.confirmImport = async function() {
    // Check if there are still errors
    let stillHasErrors = false;
    previewImportData.forEach(r => {
        if (Object.keys(r.warnings || {}).length > 0) stillHasErrors = true;
    });
    
    if (stillHasErrors) {
        if (!confirm('ยังมีข้อมูลบางช่องที่เป็นสีแดง (เช่น ปี < 2023) คุณแน่ใจหรือไม่ว่าจะบันทึกข้อมูลนี้?')) return;
    }
    
    previewModal.hide();
    showSpinner();
    
    try {
        const res = await fetch(`${API_URL}?action=import_json`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: previewImportData }) 
        });
        const json = await res.json();
        
        if (json.success) { 
            showImportResultModal(json); 
            loadData(); 
        } else { 
            alert('Import Error: ' + json.message); 
        }
    } catch (err) { 
        alert('Save failed: ' + err.message); 
    } finally { 
        hideSpinner(); 
    }
};

function showImportResultModal(json) {
    document.getElementById('importSuccessCount').innerText = json.imported_count || 0;
    const errorSection = document.getElementById('importErrorSection');
    const successMsg = document.getElementById('importAllSuccess');
    if (json.skipped_count > 0) {
        document.getElementById('importSkipCount').innerText = json.skipped_count;
        document.getElementById('importErrorLog').value = (json.errors || []).join("\n");
        errorSection.classList.remove('d-none');
        successMsg.classList.add('d-none');
    } else {
        errorSection.classList.add('d-none');
        successMsg.classList.remove('d-none');
    }
    if (importModal) importModal.show();
}

async function exportData() {
    if (allData.length === 0) return alert('No data to export');
    showSpinner();
    
    try {
        const dataToExport = typeof filteredData !== 'undefined' && filteredData.length > 0 ? filteredData : allData;
        const rawDate = (d) => {
            if (!d || d === '0000-00-00') return '';
            const ds = getDateObj(d);
            return ds ? `${ds.getFullYear()}-${String(ds.getMonth()+1).padStart(2, '0')}-${String(ds.getDate()).padStart(2, '0')}` : d;
        };

        const excelData = dataToExport.map(row => {
            const isLoad = row.is_loading_done == 1 ? 'Yes' : 'No';
            const isProd = row.is_production_done == 1 ? 'Yes' : 'No';
            const isConf = row.is_confirmed == 1 ? 'Yes' : 'No';
            const inspRaw = (row.inspection_status || '').toLowerCase();
            const isInsp = ['pass', 'ok', 'done', 'yes', '1', 'true'].includes(inspRaw) ? 'Yes' : 'No';
            
            const qty = parseInt(row.quantity || 0);
            const priceUSD = parseFloat(row.price || 0);
            const priceTHB = priceUSD * currentExchangeRate;

            return {
                'Seq': row.custom_order,
                'PO Number': row.po_number,
                'SKU': row.sku,
                'Description': row.description,
                'Color': row.color,
                'Quantity': qty,
                'DC': row.dc_location,
                'Order Date': rawDate(row.order_date),
                'Loading Week': row.loading_week,
                'Shipping Week': row.shipping_week,
                'Team': row.team,
                'Prd Start Date': rawDate(row.production_date),
                'Prd End Date': rawDate(row.production_end_date),
                'Loading Date': rawDate(row.loading_date),
                'Inspection Date': rawDate(row.inspection_date),
                'Production Status': isProd,
                'Loading Status': isLoad,
                'Confirmed': isConf,
                'Inspection Status': isInsp,
                'Ticket Number': row.ticket_number,
                'Price (USD)': priceUSD,
                'Price (THB)': priceTHB,
                'Remark': row.remark
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        ws['!cols'] = [
            { wch: 8 },  { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 10 }, 
            { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, 
            { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
            { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, 
            { wch: 12 }, { wch: 30 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Sales Data");
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Sales_Plan_Export_${dateStr}.xlsx`);

    } catch (err) {
        console.error(err);
        alert('Export failed');
    } finally {
        hideSpinner();  
    }
}
