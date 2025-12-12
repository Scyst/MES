// page/sales/script/salesDashboard.js
"use strict";

const API_URL = 'api/manage_sales_orders.php';
let allData = [];
let currentStatusFilter = 'ALL';
let importModal;
let createOrderModal;
let sortState = []; 
let currentExchangeRate = 32.0;

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
            renderTable(document.getElementById('universalSearch').value); 
        }
    } catch (err) { console.error(err); showToast('Error loading data', '#dc3545'); } finally { hideSpinner(); }
}

function updateKPI(summary) {
    if (!summary) return;
    const setVal = (id, val) => document.getElementById(id).innerText = val || 0;
    setVal('kpi-total', summary.total);
    setVal('kpi-wait-prod', summary.wait_prod);
    setVal('kpi-prod-done', summary.prod_done);
    setVal('kpi-wait-load', summary.wait_load);
    setVal('kpi-loaded', summary.loaded);
}

function filterData(status) {
    currentStatusFilter = status;
    document.querySelectorAll('.kpi-card').forEach(el => el.classList.remove('active'));
    const idMap = { 'ALL': 'card-all', 'WAIT_PROD': 'card-wait-prod', 'PROD_DONE': 'card-prod-done', 'WAIT_LOAD': 'card-wait-load', 'LOADED': 'card-loaded' };
    const activeId = idMap[status];
    if(activeId) document.getElementById(activeId).classList.add('active');
    loadData(); 
}

function renderTable(searchTerm) {
    const tbody = document.getElementById('tableBody');
    const keywords = searchTerm ? searchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0) : [];

    let filtered = allData.filter(item => {
        const text = `
            ${item.po_number} ${item.sku} ${item.description} ${item.color} 
            ${item.dc_location} ${item.ticket_number} ${item.remark} 
            ${item.loading_week} ${item.shipping_week}
            ${item.production_status} ${item.loading_status} ${item.inspection_status}
        `.toLowerCase();
        if (keywords.length === 0) return true;
        return keywords.every(k => text.includes(k));
    });

    if (sortState.length > 0) {
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
    }

    const totalContainers = filtered.length;
    let totalQty = 0;
    let totalAmountTHB = 0;

    filtered.forEach(item => {
        const q = parseInt(item.quantity || 0);
        const pUSD = parseFloat(item.price || 0);
        totalQty += q;
        totalAmountTHB += (q * pUSD * currentExchangeRate); 
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
        // ลบ class small ออกเพื่อให้ตัวหนังสือเท่ากัน
        const editAttr = (field, val, type='text') => `class="editable" ondblclick="makeEditable(this, ${item.id}, '${field}', '${val || ''}', '${type}')"`;
        const inspText = (item.inspection_status || '').toLowerCase();
        const isInsp = (inspText === 'pass' || inspText === 'ok' || inspText === 'done');
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
        <tr class="${rowClass}">
            <td class="sticky-col fw-bold text-primary font-monospace ps-3">${item.po_number}</td>
            
            <td class="text-center bg-body" style="position:sticky; right:0; z-index:10;">
                <div class="form-check form-switch d-flex justify-content-center">
                    <input class="form-check-input" type="checkbox" style="cursor: pointer;" ${isConf ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'confirm', this.checked)">
                </div>
            </td>
            
            <td class="text-center">${formatDate(item.order_date)}</td>
            <td class="font-monospace text-center">${item.sku || '-'}</td>
            <td class="long-text-cell" title="${item.description}">${item.description || '-'}</td>
            <td class="text-center">${item.color || '-'}</td>
            <td class="text-center fw-bold font-monospace editable" ondblclick="makeEditable(this, ${item.id}, 'quantity', '${item.quantity}', 'number')">${item.quantity}</td>
            
            <td ${editAttr('dc_location', item.dc_location)}>${item.dc_location || '-'}</td>
            <td class="text-center" ${editAttr('loading_week', item.loading_week)}>${item.loading_week || '-'}</td>
            <td class="text-center" ${editAttr('shipping_week', item.shipping_week)}>${item.shipping_week || '-'}</td>
            
            <td class="text-center editable" ondblclick="makeEditable(this, ${item.id}, 'production_date', '${item.production_date || ''}', 'date')">${formatDate(item.production_date)}</td>
            <td class="text-center bg-warning bg-opacity-10"><input type="checkbox" class="form-check-input status-check" ${isPrd ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'prod', this.checked)"></td>

            <td class="text-center editable" ondblclick="makeEditable(this, ${item.id}, 'loading_date', '${item.loading_date || ''}', 'date')">${formatDate(item.loading_date)}</td>
            <td class="text-center bg-info bg-opacity-10"><input type="checkbox" class="form-check-input status-check" ${isLoad ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'load', this.checked)"></td>
            
            <td class="text-center editable" ondblclick="makeEditable(this, ${item.id}, 'inspection_date', '${item.inspection_date || ''}', 'date')">${formatDate(item.inspection_date)}</td>
            <td class="text-center bg-purple bg-opacity-10"><input type="checkbox" class="form-check-input status-check" style="border-color: #6f42c1; ${isInsp ? 'background-color: #6f42c1;' : ''}" ${isInsp ? 'checked' : ''} onchange="toggleCheck(${item.id}, 'insp', this.checked)"></td>

            <td class="font-monospace text-primary text-center" ${editAttr('ticket_number', item.ticket_number)}>${item.ticket_number || '-'}</td>
            <td class="text-center fw-bold text-success font-monospace">฿${parseFloat(priceTHB).toLocaleString()}</td>
            
            <td ${editAttr('remark', item.remark)} class="long-text-cell text-body-secondary" title="${item.remark || ''}">${item.remark || '-'}</td>
        </tr>`;
    }).join('');
}

function exportData() {
    if (!allData || allData.length === 0) {
        showToast('No data to export', '#dc3545');
        return;
    }

    const exportData = allData.map(item => {
        let prdStatus = item.is_production_done == 1 ? 'Done' : 'Wait';
        let loadStatus = item.is_loading_done == 1 ? 'Shipped' : 'Wait';
        let confStatus = item.is_confirmed == 1 ? 'Yes' : 'No';
        
        const priceUSD = parseFloat(item.price || 0);
        const priceTHB = priceUSD * currentExchangeRate;

        return {
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
            "Production Status": prdStatus,
            "Loading Date": formatDateForExcel(item.loading_date),
            "Loading Status": loadStatus,
            "Inspection Date": formatDateForExcel(item.inspection_date),
            "Inspection Status": item.inspection_status || '',
            "Ticket Number": item.ticket_number,
            "Price (USD)": priceUSD,
            "Price (THB)": priceTHB,
            "Confirmed": confStatus,
            "Remark": item.remark
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesOrders");

    const wscols = Object.keys(exportData[0]).map(key => ({ wch: 15 }));
    wscols[2] = { wch: 30 }; 
    ws['!cols'] = wscols;

    const dateStr = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `Sales_Order_Export_${dateStr}.xlsx`);
}

// [NEW] ฟังก์ชัน Download Template CSV
function downloadTemplate() {
    const headers = [
        "PO Number", "SKU", "Quantity", "Order Date", "Description", "Color", 
        "DC", "Loading Week", "Shipping Week", "PRD Completed date", "Load", "Inspection Information", "Remark"
    ];
    
    // สร้าง Dummy Data บรรทัดที่ 2 (เพื่อให้ User เห็นภาพ Format วันที่)
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
                const csvOutput = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
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