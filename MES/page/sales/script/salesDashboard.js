// page/sales/script/salesDashboard.js
"use strict";

const API_URL = 'api/manage_sales_orders.php';
let allData = [];
let currentStatusFilter = 'ACTIVE';
let importModal;
let createOrderModal;
let sortState = []; 
let currentExchangeRate = 32.0;

// ระบบ Drag & Drop
let sortableInstance = null;
let isManualSortMode = true; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Modals
    const modalEl = document.getElementById('importResultModal');
    if (modalEl) importModal = new bootstrap.Modal(modalEl);

    const createEl = document.getElementById('createOrderModal');
    if (createEl) createOrderModal = new bootstrap.Modal(createEl);

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

// --- Helper Functions ---
function getDateObj(dateStr) {
    if (!dateStr || dateStr === '0000-00-00') return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDate(d) {
    if(!d) return '';
    const date = new Date(d);
    // return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    // หรือใช้รูปแบบสั้นๆ
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
        const res = await fetch(`${API_URL}?action=read&status=${currentStatusFilter}`);
        const json = await res.json();
        if (json.success) {
            allData = json.data;
            updateKPI(json.summary);
            
            // Reset sorting to default logic
            sortState = [];
            updateSortUI();
            
            renderTable(document.getElementById('universalSearch').value); 
        }
    } catch (err) { console.error(err); showToast('Error loading data', '#dc3545'); } finally { hideSpinner(); }
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

// --- Table Rendering (The Core Logic) ---

function renderTable(searchTerm) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    // 1. Filtering
    const keywords = searchTerm ? searchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0) : [];
    let filtered = allData.filter(item => {
        if (keywords.length === 0) return true;
        const text = Object.values(item).join(' ').toLowerCase();
        return keywords.every(k => text.includes(k));
    });

    // 2. Sorting
    if (sortState.length > 0) {
        isManualSortMode = false;
        if(sortableInstance) sortableInstance.option("disabled", true);
        
        filtered.sort((a, b) => {
            for (let sort of sortState) {
                const col = sort.column;
                const dir = sort.direction === 'asc' ? 1 : -1;
                let valA = a[col] || ''; let valB = b[col] || '';
                
                if (col === 'quantity' || col === 'price') { 
                    valA = parseFloat(valA) || 0; valB = parseFloat(valB) || 0; 
                }
                if (col.includes('date')) { 
                    valA = new Date(valA || '1970-01-01').getTime(); 
                    valB = new Date(valB || '1970-01-01').getTime(); 
                }
                
                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
            }
            return 0;
        });
    } else {
        isManualSortMode = true;
        // Default Sort: custom_order asc, id desc
        filtered.sort((a, b) => {
            let ordA = parseInt(a.custom_order) || 999999;
            let ordB = parseInt(b.custom_order) || 999999;
            if (ordA !== ordB) return ordA - ordB;
            return b.id - a.id; 
        });
        if(sortableInstance) sortableInstance.option("disabled", false);
    }

    // 3. Summary Calculation
    const totalContainers = filtered.length;
    let totalQty = 0;
    let totalAmountTHB = 0;
    filtered.forEach(item => {
        totalQty += parseInt(item.quantity || 0);
        totalAmountTHB += (parseFloat(item.price || 0) * currentExchangeRate); 
    });
    
    document.getElementById('sum-containers').innerText = `${totalContainers}`;
    const elQty = document.getElementById('sum-qty');
    if (elQty) elQty.innerText = `${totalQty.toLocaleString()}`;
    document.getElementById('sum-amount').innerText = `฿${totalAmountTHB.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // 4. Generate HTML
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="19" class="text-center py-5 text-muted">No data found</td></tr>';
        return;
    }

    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);

    tbody.innerHTML = filtered.map(item => {
        // -- Logic Helper --
        const isPrd = item.is_production_done == 1;
        const isLoad = item.is_loading_done == 1;
        const isConf = item.is_confirmed == 1;
        
        // Inspection Check
        const inspRaw = (item.inspection_status || '').toLowerCase();
        const isInsp = (inspRaw === 'pass' || inspRaw === 'ok' || inspRaw === 'done' || inspRaw === 'yes');

        // Delay Calculation
        const loadDateObj = getDateObj(item.loading_date);
        const isDelay = loadDateObj && loadDateObj < todayDate && !isLoad;

        // -- Style Classes --
        const stickyClass = 'bg-white'; // Always white for sticky
        
        // -- PO Number Display (with Delay Alert) --
        let poHtml = '';
        if (isDelay) {
            poHtml = `<div class="d-flex align-items-center text-danger" title="Late Delivery">
                        <i class="fas fa-exclamation-triangle me-2 blink"></i>
                        <span>${item.po_number}</span>
                      </div>`;
        } else {
            poHtml = `<span class="text-primary font-monospace">${item.po_number}</span>`;
        }

        // -- Minimal Icon Buttons --
        const btnPrdClass = isPrd ? 'status-done' : 'status-wait';
        const btnPrdIcon = isPrd ? '<i class="fas fa-check"></i>' : '<i class="fas fa-industry"></i>';
        
        const btnLoadClass = isLoad ? 'status-done' : 'status-wait';
        const btnLoadIcon = isLoad ? '<i class="fas fa-check"></i>' : '<i class="fas fa-truck-loading"></i>';

        const btnInspClass = isInsp ? 'status-done' : 'status-wait';
        const btnInspIcon = isInsp ? '<i class="fas fa-check"></i>' : '<i class="fas fa-microscope"></i>';

        // -- Price --
        const priceTHB = (parseFloat(item.price || 0) * currentExchangeRate).toFixed(2);

        // -- Row Construction (Matches SalesDashboard.css columns) --
        return `<tr data-id="${item.id}">
            
            <td class="text-center drag-handle sticky-col-left-1 ${stickyClass}" style="cursor: ${isManualSortMode ? 'move' : 'not-allowed'}; color: ${isManualSortMode ? '#6c757d' : '#dee2e6'};">
                <i class="fas fa-grip-vertical"></i>
            </td>

            <td class="sticky-col-left-2 fw-bold ${stickyClass} text-start ps-3">
                ${poHtml}
            </td>

            <td class="sticky-col-left-3 text-center ${stickyClass}">
                <div class="form-check form-switch d-flex justify-content-center">
                    <input class="form-check-input" type="checkbox" style="cursor: pointer;" ${isConf ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'confirm', this.checked)">
                </div>
            </td>

            <td class="font-monospace text-center">${item.sku || '-'}</td>
            <td class="text-start" style="max-width: 200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.description}">${item.description || '-'}</td>
            <td class="text-center">${item.color || '-'}</td>
            <td class="text-center fw-bold font-monospace editable" ondblclick="makeEditable(this, ${item.id}, 'quantity', '${item.quantity}', 'number')">${parseInt(item.quantity||0).toLocaleString()}</td>
            
            <td class="text-center editable" ondblclick="makeEditable(this, ${item.id}, 'dc_location', '${item.dc_location}')">${item.dc_location || '-'}</td>
            <td class="text-center editable" ondblclick="makeEditable(this, ${item.id}, 'loading_week', '${item.loading_week}')">${item.loading_week || '-'}</td>
            <td class="text-center editable" ondblclick="makeEditable(this, ${item.id}, 'shipping_week', '${item.shipping_week}')">${item.shipping_week || '-'}</td>
            
            <td class="text-center bg-warning bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'production_date', '${item.production_date}', 'date')">${formatDate(item.production_date)}</td>
            <td class="text-center bg-warning bg-opacity-10">
                <button class="btn-icon-minimal ${btnPrdClass}" onclick="toggleCheck(${item.id}, 'prod', ${!isPrd})">
                    ${btnPrdIcon}
                </button>
            </td>

            <td class="text-center bg-info bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'loading_date', '${item.loading_date}', 'date')">${formatDate(item.loading_date)}</td>
            <td class="text-center bg-info bg-opacity-10">
                <button class="btn-icon-minimal ${btnLoadClass}" onclick="toggleCheck(${item.id}, 'load', ${!isLoad})">
                    ${btnLoadIcon}
                </button>
            </td>

            <td class="text-center bg-purple bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'inspection_date', '${item.inspection_date}', 'date')">${formatDate(item.inspection_date)}</td>
            <td class="text-center bg-purple bg-opacity-10">
                <button class="btn-icon-minimal ${btnInspClass}" onclick="toggleCheck(${item.id}, 'insp', ${!isInsp})" style="${isInsp ? 'background-color:#d1e7dd; color:#198754;' : ''}">
                    ${btnInspIcon}
                </button>
            </td>

            <td class="font-monospace text-primary text-center editable" ondblclick="makeEditable(this, ${item.id}, 'ticket_number', '${item.ticket_number}')">${item.ticket_number || '-'}</td>
            <td class="text-end fw-bold text-success font-monospace">฿${parseFloat(priceTHB).toLocaleString()}</td>
            <td class="text-start text-muted small editable" ondblclick="makeEditable(this, ${item.id}, 'remark', '${item.remark}')">${item.remark || '-'}</td>
        </tr>`;
    }).join('');

    setTimeout(initSortable, 100);
}

// --- Inline Editing (Visual Feedback) ---

function makeEditable(td, id, field, currentVal, type = 'text') {
    if (td.querySelector('input')) return; // ป้องกันการสร้างซ้ำ
    if (currentVal === 'null' || currentVal === 'undefined') currentVal = '';

    const originalHtml = td.innerHTML;
    const input = document.createElement('input');
    input.type = type; 
    input.value = currentVal;
    input.className = 'form-control form-control-sm p-1 text-center';
    input.style.width = '100%';
    
    // 1. Visual Feedback: กำลังแก้ไข (สีเหลืองอ่อน)
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
                    // 2. Success Feedback: สีเขียววูบหนึ่ง
                    input.style.backgroundColor = '#d1e7dd';
                    input.style.borderColor = '#198754';
                    input.style.transition = 'all 0.5s';
                    
                    // Update Local Data
                    const row = allData.find(d => d.id == id);
                    if (row) row[field] = newValue;

                    setTimeout(() => {
                        renderTable(document.getElementById('universalSearch').value);
                    }, 500); // รอให้ User เห็นสีเขียวนิดนึงค่อย Render คืน
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
            // ค่าเหมือนเดิม ก็แค่คืนค่าเดิม (ไม่ต้องโหลดใหม่)
            td.innerHTML = originalHtml; 
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') input.blur(); });
}

// --- Toggle Status (Buttons/Checkboxes) ---

async function toggleCheck(id, field, val) {
    // val รับเข้ามาเป็น Boolean (true/false) หรือ 0/1 แล้วแต่กรณี
    // แปลงให้เป็น 1 หรือ 0 สำหรับ Database
    const dbVal = (val === true || val === 1 || val === '1') ? 1 : 0;

    // Visual Feedback: Show spinner globally or locally?
    // เพื่อความไว เราจะ update UI ก่อนเลย (Optimistic UI) แล้วค่อยส่ง req
    // แต่ถ้าพลาดต้อง rollback... เอาแบบชัวร์คือ showSpinner ดีกว่า
    showSpinner();

    try {
        const res = await fetch(`${API_URL}?action=update_check`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, field, checked: dbVal })
        });
        const json = await res.json();
        
        if (json.success) {
            // Update Local Data
            const row = allData.find(d => d.id == id);
            if (row) {
                // Map field name กลับไปเป็น column name
                if(field === 'confirm') row.is_confirmed = dbVal;
                else if(field === 'prod') row.is_production_done = dbVal;
                else if(field === 'load') row.is_loading_done = dbVal;
                else if(field === 'insp') row.inspection_status = dbVal ? 'Pass' : '';
            }
            renderTable(document.getElementById('universalSearch').value);
        } else {
            showToast('Update failed', '#dc3545');
        }
    } catch (err) { console.error(err); showToast('Connection failed', '#dc3545'); }
    finally { hideSpinner(); }
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

    orderedIds.forEach((id, index) => {
        const item = allData.find(d => d.id == id);
        if(item) item.custom_order = index + 1; 
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
    } catch (err) { alert('Failed to create order'); } finally { hideSpinner(); }
}

async function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    showToast("Uploading...", "#0dcaf0");
    
    // Simple FormData upload (Let backend handle parsing if possible, or use frontend lib)
    // Here we assume backend handles CSV. If you want frontend XLSX parsing like shipping_loading, we can add it.
    // For now, let's keep consistent with your previous structure but handle both.
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const csvOutput = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]], { dateNF: 'dd/mm/yyyy', defval: '' });
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

async function sendFileToBackend(formData) {
    showSpinner();
    try {
        const res = await fetch(`${API_URL}?action=import`, { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) { showImportResultModal(json); loadData(); } 
        else { alert('Import Error: ' + json.message); }
    } catch (err) { alert('Upload failed'); } finally { hideSpinner(); }
}

function showImportResultModal(json) {
    document.getElementById('importSuccessCount').innerText = json.imported_count;
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

function exportData() {
    // [UPDATED] เรียกใช้ API หลังบ้านโดยตรง เพื่อ Export ข้อมูล "ทั้งหมด" (เหมือนหน้า Shipping)
    // ไม่สนใจ Filter หน้าจอ และไม่ต้องใช้ JS คำนวณให้หนักเครื่อง
    window.location.href = `${API_URL}?action=export`;
}