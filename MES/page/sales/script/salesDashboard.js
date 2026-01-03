// page/sales/script/salesDashboard.js
"use strict";

const API_URL = 'api/manage_sales_orders.php';
let allData = [];
let currentStatusFilter = 'ACTIVE';
let importModal;
let createOrderModal;
let sortState = []; 
let currentExchangeRate = 32.0;

// [CHANGES] เพิ่มตัวแปรสำหรับระบบ Drag & Drop
let sortableInstance = null;
let isManualSortMode = true; // Default คือเรียงตามใจพี่

document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('importResultModal');
    if (modalEl) importModal = new bootstrap.Modal(modalEl);

    const createEl = document.getElementById('createOrderModal');
    if (createEl) createOrderModal = new bootstrap.Modal(createEl);

    document.getElementById('universalSearch').addEventListener('input', (e) => renderTable(e.target.value));
    document.getElementById('fileInput').addEventListener('change', uploadFile);
    
    const rateInput = document.getElementById('exchangeRate');
    if(rateInput) {
        rateInput.addEventListener('change', (e) => {
            currentExchangeRate = parseFloat(e.target.value) || 32;
            renderTable(document.getElementById('universalSearch').value);
        });
        fetchExchangeRate(); 
    }

    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', (e) => handleSort(th.dataset.sort, e));
    });
    
    // [CHANGES] เพิ่มปุ่ม Reset Sort (ถ้ามีใน HTML หรือเพิ่ม Dynamic ก็ได้)
    // ถ้ายังไม่มีปุ่มใน HTML คุณสามารถเพิ่มปุ่ม <button onclick="resetToPlanOrder()">Reset</button> 
    // ใน salesDashboard.php ได้เลย

    loadData();
});

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
        if (isMulti) {
            sortState.push({ column, direction: 'asc' });
        } else {
            sortState = [{ column, direction: 'asc' }];
        }
    }
    updateSortUI();
    renderTable(document.getElementById('universalSearch').value);
}

function updateSortUI() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('active-sort');
        const icon = th.querySelector('.sort-icon');
        if(icon) icon.className = 'sort-icon fas fa-sort text-muted opacity-25';
        
        const oldBadge = th.querySelector('.sort-order-badge');
        if(oldBadge) oldBadge.remove();

        const sortIndex = sortState.findIndex(s => s.column === th.dataset.sort);
        if (sortIndex !== -1) {
            th.classList.add('active-sort');
            const direction = sortState[sortIndex].direction;
            if(icon) icon.className = direction === 'asc' ? 'sort-icon fas fa-sort-up text-primary' : 'sort-icon fas fa-sort-down text-primary';
            
            if (sortState.length > 1) {
                const badge = document.createElement('span');
                badge.className = 'sort-order-badge badge bg-primary rounded-pill ms-1';
                badge.style.fontSize = '0.6em';
                badge.style.verticalAlign = 'top';
                badge.innerText = sortIndex + 1; 
                th.appendChild(badge);
            }
        }
    });
}

// [CHANGES] ฟังก์ชันสำหรับ Reset การเรียงหัวตาราง เพื่อกลับมาโหมด "ตามใจพี่"
function resetToPlanOrder() {
    sortState = [];
    updateSortUI();
    renderTable(document.getElementById('universalSearch').value);
}

function openCreateModal() {
    document.getElementById('createOrderForm').reset();
    createOrderModal.show();
}

async function submitCreateOrder() {
    const form = document.getElementById('createOrderForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    showSpinner();
    try {
        const res = await fetch(`${API_URL}?action=create_single`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast('New order created!', '#198754');
            createOrderModal.hide();
            loadData();
        } else { alert('Error: ' + json.message); }
    } catch (err) { console.error(err); alert('Failed to create order'); } finally { hideSpinner(); }
}

async function loadData() {
    showSpinner();
    try {
        const res = await fetch(`${API_URL}?action=read&status=${currentStatusFilter}`);
        const json = await res.json();
        if (json.success) {
            allData = json.data;
            updateKPI(json.summary);
            
            // [CHANGES] เมื่อโหลดข้อมูลใหม่ ให้ Reset Sort กลับเป็นค่าเริ่มต้น (ตาม custom_order)
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
    
    // การ์ดแรก: Active (ยังไม่ Confirm)
    setVal('kpi-active', summary.total_active); 
    
    // การ์ดสถานะย่อย
    setVal('kpi-wait-prod', summary.wait_prod);
    setVal('kpi-prod-done', summary.prod_done);
    setVal('kpi-wait-load', summary.wait_load);
    
    // การ์ดสุดท้าย: All History (ต้องใช้ total_all ที่เราเพิ่งแก้ SQL)
    setVal('kpi-total-all', summary.total_all); 
}

function filterData(status) {
    currentStatusFilter = status;
    document.querySelectorAll('.kpi-card').forEach(el => el.classList.remove('active'));
    
    const idMap = { 
        'ACTIVE': 'card-active', // การ์ดแรก
        'ALL': 'card-all',       // ถ้ามีปุ่มดูทั้งหมด
        'WAIT_PROD': 'card-wait-prod', 
        'PROD_DONE': 'card-prod-done', 
        'WAIT_LOAD': 'card-wait-load', 
        'LOADED': 'card-loaded' 
    };
    
    const activeId = idMap[status];
    if(activeId) {
        const el = document.getElementById(activeId);
        if(el) el.classList.add('active');
    }
    loadData(); 
}

function renderTable(searchTerm) {
    const tbody = document.getElementById('tableBody');
    const keywords = searchTerm ? searchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0) : [];

    let filtered = allData.filter(item => {
        // [FIX] แปลงสถานะเป็นคำว่า Yes/No เพื่อให้ User ค้นหาด้วยคำพวกนี้ได้
        const prdText = item.is_production_done == 1 ? 'yes done' : 'no wait';
        const loadText = item.is_loading_done == 1 ? 'yes shipped' : 'no wait';
        const confText = item.is_confirmed == 1 ? 'yes confirmed' : 'no';
        
        // แปลง Inspection เป็น Yes/No ด้วย
        const inspRaw = (item.inspection_status || '').toLowerCase();
        const inspText = (inspRaw === 'pass' || inspRaw === 'ok' || inspRaw === 'done' || inspRaw === 'yes') ? 'yes pass' : 'no fail';

        const text = `
            ${item.po_number} ${item.sku} ${item.description} ${item.color} 
            ${item.dc_location} ${item.ticket_number} ${item.remark} 
            ${item.loading_week} ${item.shipping_week}
            ${prdText} ${loadText} ${confText} ${inspText} 
        `.toLowerCase();
        
        if (keywords.length === 0) return true;
        return keywords.every(k => text.includes(k));
    });

    if (sortState.length > 0) {
        isManualSortMode = false;
        if(sortableInstance) sortableInstance.option("disabled", true);
        
        filtered.sort((a, b) => {
            for (let sort of sortState) {
                const col = sort.column;
                const dir = sort.direction === 'asc' ? 1 : -1;
                let valA = a[col]; let valB = b[col];
                
                if (valA == null) valA = ''; 
                if (valB == null) valB = '';
                
                if (col === 'quantity' || col === 'price') { 
                    valA = parseFloat(valA) || 0; 
                    valB = parseFloat(valB) || 0; 
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
        filtered.sort((a, b) => {
            let ordA = parseInt(a.custom_order) || 999999;
            let ordB = parseInt(b.custom_order) || 999999;
            if (ordA !== ordB) return ordA - ordB;
            return b.id - a.id; 
        });
        
        if(sortableInstance) sortableInstance.option("disabled", false);
    }

    // คำนวณยอดรวม (สูตรที่ถูกต้อง: ไม่คูณ qty ซ้ำ)
    const totalContainers = filtered.length;
    let totalQty = 0;
    let totalAmountTHB = 0;

    filtered.forEach(item => {
        const q = parseInt(item.quantity || 0);
        const totalUSD = parseFloat(item.price || 0); // ค่านี้คือราคารวมแล้วจาก SQL
        totalQty += q;
        totalAmountTHB += (totalUSD * currentExchangeRate); 
    });

    document.getElementById('sum-containers').innerText = `${totalContainers} Orders`;
    const elQty = document.getElementById('sum-qty');
    if (elQty) elQty.innerText = `${totalQty.toLocaleString()} Pcs`;
    document.getElementById('sum-amount').innerText = `฿${totalAmountTHB.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="19" class="text-center py-4 text-muted">No data found</td></tr>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    tbody.innerHTML = filtered.map(item => {
        const isPrd = item.is_production_done == 1;
        const isLoad = item.is_loading_done == 1;
        const isConf = item.is_confirmed == 1;
        const editAttr = (field, val, type='text') => `class="editable" ondblclick="makeEditable(this, ${item.id}, '${field}', '${val || ''}', '${type}')"`;
        
        // [FIXED] เพิ่ม 'yes' ให้ระบบรู้จัก จะได้ติ๊กถูก
        const inspText = (item.inspection_status || '').toLowerCase();
        const isInsp = (inspText === 'pass' || inspText === 'ok' || inspText === 'done' || inspText === 'yes');
        
        const priceTHB = (parseFloat(item.price || 0) * currentExchangeRate).toFixed(2);

        let rowClass = '';
        const loadDateObj = item.loading_date ? new Date(item.loading_date) : null;
        if(loadDateObj) loadDateObj.setHours(0,0,0,0);

        if (isConf) {
            rowClass = 'row-confirmed';
        } else if (loadDateObj && !isLoad) {
            if (loadDateObj < today) {
                rowClass = 'row-late'; 
            } else if (loadDateObj <= threeDaysLater) {
                rowClass = 'row-warning';
            }
        }

        return `
        <tr class="${rowClass}" data-id="${item.id}">
            
            <td class="text-center drag-handle sticky-col start-0 bg-body" style="cursor: ${isManualSortMode ? 'move' : 'not-allowed'}; color: ${isManualSortMode ? '#6c757d' : '#dee2e6'}; width: 60px; z-index: 45;">
                <div class="d-flex align-items-center justify-content-center gap-2">
                    <i class="fas fa-grip-vertical small"></i>
                    <span class="fw-bold small text-dark">${item.custom_order || '-'}</span>
                </div>
            </td>

            <td class="sticky-po fw-bold text-primary font-monospace ps-3 text-nowrap">${item.po_number}</td>
            
            <td class="text-center bg-body" style="position:sticky; right:0; z-index:10;">
                <div class="form-check form-switch d-flex justify-content-center">
                    <input class="form-check-input" type="checkbox" style="cursor: pointer;" ${isConf ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'confirm', this.checked)">
                </div>
            </td>
            
            <td class="font-monospace text-center">${item.sku || '-'}</td>
            <td class="long-text-cell" title="${item.description}">${item.description || '-'}</td>
            <td class="text-center">${item.color || '-'}</td>
            <td class="text-center fw-bold font-monospace editable" ondblclick="makeEditable(this, ${item.id}, 'quantity', '${item.quantity}', 'number')">${item.quantity}</td>
            
            <td ${editAttr('dc_location', item.dc_location)}>${item.dc_location || '-'}</td>
            <td class="text-center" ${editAttr('loading_week', item.loading_week)}>${item.loading_week || '-'}</td>
            <td class="text-center" ${editAttr('shipping_week', item.shipping_week)}>${item.shipping_week || '-'}</td>
            
            <td class="text-center bg-warning bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'production_date', '${item.production_date || ''}', 'date')">${formatDate(item.production_date)}</td>
            <td class="text-center bg-warning bg-opacity-10"><input type="checkbox" class="form-check-input status-check" ${isPrd ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'prod', this.checked)"></td>

            <td class="text-center bg-info bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'loading_date', '${item.loading_date || ''}', 'date')">${formatDate(item.loading_date)}</td>
            <td class="text-center bg-info bg-opacity-10"><input type="checkbox" class="form-check-input status-check" ${isLoad ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'load', this.checked)"></td>
            
            <td class="text-center bg-purple bg-opacity-10 editable" ondblclick="makeEditable(this, ${item.id}, 'inspection_date', '${item.inspection_date || ''}', 'date')">${formatDate(item.inspection_date)}</td>
            <td class="text-center bg-purple bg-opacity-10"><input type="checkbox" class="form-check-input status-check" style="border-color: #6f42c1; ${isInsp ? 'background-color: #6f42c1;' : ''}" ${isInsp ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'insp', this.checked)"></td>

            <td class="font-monospace text-primary text-center" ${editAttr('ticket_number', item.ticket_number)}>${item.ticket_number || '-'}</td>
            <td class="text-center fw-bold text-success font-monospace">฿${parseFloat(priceTHB).toLocaleString()}</td>
            
            <td ${editAttr('remark', item.remark)} class="long-text-cell text-body-secondary" title="${item.remark || ''}">${item.remark || '-'}</td>
        </tr>`;
    }).join('');

    setTimeout(initSortable, 100);
}

// [CHANGES] ฟังก์ชัน Init SortableJS
function initSortable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    // ถ้ามี Instance เดิมอยู่ ให้ทำลายทิ้งก่อน (ป้องกันการซ้อนทับ)
    if (sortableInstance) sortableInstance.destroy();

    sortableInstance = new Sortable(tbody, {
        animation: 150,
        handle: '.drag-handle', // ลากได้เฉพาะตรงไอคอน Grip
        disabled: !isManualSortMode, // ปิดถ้าอยู่ในโหมด Analysis (Sort หัวตาราง)
        ghostClass: 'bg-primary-subtle', // คลาสตอนกำลังลาก
        onEnd: function (evt) {
            // เมื่อปล่อยเมาส์ ให้บันทึกลำดับใหม่
            saveNewOrder();
        }
    });
}

async function saveNewOrder() {
    // 1. ดึง ID ตามลำดับที่ User เพิ่งลากวางเสร็จสดๆ ร้อนๆ
    const rows = document.querySelectorAll('#tableBody tr');
    const orderedIds = Array.from(rows).map(row => row.dataset.id);

    // --- ส่วนที่เพิ่ม: อัปเดตหน้าจอทันที (ไม่ต้องรอ Server) ---
    
    // อัปเดตข้อมูลในตัวแปร allData ในเครื่องทันที
    orderedIds.forEach((id, index) => {
        const item = allData.find(d => d.id == id);
        if(item) item.custom_order = index + 1; // เปลี่ยนเลขลำดับในแรม
    });

    // สั่งวาดตารางใหม่ทันที! (User จะเห็นเลขเปลี่ยนปุ๊บปั๊บ)
    // หมายเหตุ: การวาดใหม่จะทำให้ DOM เปลี่ยน Sortable อาจจะหลุด ต้อง init ใหม่ (ซึ่งใน renderTable เราใส่ initSortable ไว้แล้ว)
    renderTable(document.getElementById('universalSearch').value);

    // -----------------------------------------------------

    try {
        // 2. ค่อยส่งข้อมูลไปบันทึกหลังบ้าน (ทำเงียบๆ)
        const res = await fetch(`${API_URL}?action=reorder_items`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderedIds })
        });
        
        // ถ้าอยากให้เนียน ไม่ต้อง showToast ตอนสำเร็จก็ได้ครับ จะได้ไม่รกหน้าจอ
        // หรือถ้าอยากโชว์ ก็เปิดบรรทัดล่างนี้
        // showToast('Order saved', '#198754'); 

    } catch (err) {
        console.error('Reorder failed', err);
        showToast('Failed to save order', '#dc3545');
        // ถ้าซวยจริงๆ บันทึกไม่ผ่าน ค่อยโหลดข้อมูลเก่ากลับมา
        loadData(); 
    }
}

function exportData() {
    if (!allData || allData.length === 0) {
        showToast('No data to export', '#dc3545');
        return;
    }

    let dataToExport = [...allData];
    if (sortState.length === 0) {
        dataToExport.sort((a, b) => (parseInt(a.custom_order) || 999999) - (parseInt(b.custom_order) || 999999));
    }

    const exportData = dataToExport.map(item => {
        // [FIX] เปลี่ยนเป็น Yes/No ให้หมด (จากเดิมที่เป็น Done/Wait/Shipped)
        let prdStatus = item.is_production_done == 1 ? 'Yes' : 'No';
        let loadStatus = item.is_loading_done == 1 ? 'Yes' : 'No';
        let confStatus = item.is_confirmed == 1 ? 'Yes' : 'No';
        
        // *หมายเหตุ: ตรง Price เอาคูณ Qty ออกแล้วนะ ตามที่คุยกันตะกี้*
        const priceUSD = parseFloat(item.price || 0); 
        const priceTHB = priceUSD * currentExchangeRate;

        return {
            "Seq": item.custom_order,
            "PO Number": item.po_number,
            "SKU": item.sku,
            "Description": item.description,
            "Color": item.color,
            "Quantity": parseInt(item.quantity || 0),
            "Order Date": formatDateForExcel(item.order_date),
            "DC Location": item.dc_location,
            "Loading Week": item.loading_week,
            "Shipping Week": item.shipping_week,
            "Production Date": formatDateForExcel(item.production_date),
            
            "Production Status": prdStatus, // Yes/No
            
            "Loading Date": formatDateForExcel(item.loading_date),
            
            "Loading Status": loadStatus,   // Yes/No
            
            "Inspection Date": formatDateForExcel(item.inspection_date),
            "Inspection Status": item.inspection_status || '',
            "Ticket Number": item.ticket_number,
            "Price (USD)": priceUSD,
            "Price (THB)": priceTHB,
            "Confirmed": confStatus,        // Yes/No
            "Remark": item.remark
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesOrders");

    const wscols = Object.keys(exportData[0]).map(key => ({ wch: 15 }));
    wscols[3] = { wch: 30 }; 
    ws['!cols'] = wscols;

    const dateStr = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `Sales_Order_Export_${dateStr}.xlsx`);
}

function downloadTemplate() {
    const headers = [
        "PO Number", "SKU", "Quantity", "Order Date", "Description", "Color", 
        "DC", "Loading Week", "Shipping Week", "PRD Completed date", "Load", "Inspection Information", "Remark"
    ];
    
    const exampleRow = [
        "PO-12345", "ITEM-001", "1000", "2023-12-01", "Product Name", "Black",
        "Bangkok", "W48", "W49", "2023-12-15", "2023-12-20", "INSP-999 (OK)", "Test"
    ];

    const csvContent = "\uFEFF" + headers.join(",") + "\n" + exampleRow.join(",");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Sales_Order_Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatDateForExcel(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB'); 
}

function makeEditable(td, id, field, currentVal, type = 'text') {
    if (td.querySelector('input')) return;
    const originalContent = td.innerHTML;
    const input = document.createElement('input');
    input.type = type; 
    input.value = currentVal === 'null' ? '' : currentVal;
    input.className = 'form-control form-control-sm p-1';
    input.style.width = '100%';
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();

    const save = async () => {
        const newValue = input.value.trim();
        if (newValue !== currentVal) {
            try {
                const res = await fetch(`${API_URL}?action=update_cell`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ id, field, value: newValue })
                });
                const json = await res.json();
                if (json.success) {
                    showToast('Saved', '#198754');
                    const row = allData.find(d => d.id == id);
                    if (row) row[field] = newValue;
                    renderTable(document.getElementById('universalSearch').value);
                } else { alert('Update failed'); td.innerHTML = originalContent; }
            } catch (e) { console.error(e); td.innerHTML = originalContent; }
        } else { renderTable(document.getElementById('universalSearch').value); }
    };
    input.addEventListener('blur', save);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') input.blur(); });
}

async function toggleCheck(id, field, checked) {
    try {
        await fetch(`${API_URL}?action=update_check`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, field, checked })
        });
        loadData(); 
    } catch (err) { console.error(err); showToast('Update failed', '#dc3545'); }
}

async function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'xlsx' || ext === 'xls') {
        showToast("Processing Excel...", "#0dcaf0");
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                
                // [FIXED] เพิ่ม Option { dateNF: 'dd/mm/yyyy' } เพื่อบังคับวันที่ให้ PHP อ่านรู้เรื่อง
                const csvOutput = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]], {
                    dateNF: 'dd/mm/yyyy', // บังคับ format วันที่
                    defval: '' // ช่องว่างให้เป็นว่าง
                });

                const blob = new Blob([csvOutput], { type: 'text/csv' });
                const formData = new FormData();
                formData.append('file', blob, 'converted.csv');
                await sendFileToBackend(formData);
            } catch (err) { alert('Excel Error: ' + err.message); }
        };
        reader.readAsArrayBuffer(file);
    } else {
        const formData = new FormData();
        formData.append('file', file);
        await sendFileToBackend(formData);
    }
    e.target.value = '';
}

async function sendFileToBackend(formData) {
    showSpinner();
    try {
        const res = await fetch(`${API_URL}?action=import`, { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) { showImportResultModal(json); loadData(); } else { alert('Import Error: ' + json.message); }
    } catch (err) { console.error(err); alert('Upload failed'); } finally { hideSpinner(); }
}

function showImportResultModal(json) {
    document.getElementById('importSuccessCount').innerText = json.imported_count;
    const errorSection = document.getElementById('importErrorSection');
    const successMsg = document.getElementById('importAllSuccess');
    if (json.skipped_count > 0) {
        document.getElementById('importSkipCount').innerText = json.skipped_count;
        let errorText = "";
        if(json.errors && json.errors.length > 0) errorText = json.errors.join("\n");
        document.getElementById('importErrorLog').value = errorText;
        errorSection.classList.remove('d-none');
        successMsg.classList.add('d-none');
    } else {
        errorSection.classList.add('d-none');
        successMsg.classList.remove('d-none');
    }
    if (importModal) importModal.show();
}

function formatDate(d) {
    if(!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB');
}

function showToast(msg, color='#333') {
    const el = document.createElement('div');
    el.className = 'toast show position-fixed top-0 end-0 m-3 text-white border-0 shadow';
    el.style.backgroundColor = color;
    el.style.zIndex = 1060;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 3000);
}
function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }