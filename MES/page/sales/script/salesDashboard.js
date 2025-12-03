// page/sales/script/salesDashboard.js
"use strict";

const API_URL = 'api/manage_sales_orders.php';
let allData = [];
let currentStatusFilter = 'ALL';
let importModal;
let createOrderModal;

document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('importResultModal');
    if (modalEl) importModal = new bootstrap.Modal(modalEl);

    loadData();
    document.getElementById('universalSearch').addEventListener('input', (e) => {
        renderTable(e.target.value);
    });
    document.getElementById('fileInput').addEventListener('change', uploadFile);

    const createEl = document.getElementById('createOrderModal');
    if (createEl) createOrderModal = new bootstrap.Modal(createEl);
});

// Functions
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
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.success) {
            showToast('New order created!', '#198754');
            createOrderModal.hide();
            loadData(); // รีโหลดตาราง
        } else {
            alert('Error: ' + json.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to create order');
    } finally {
        hideSpinner();
    }
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
    } catch (err) {
        console.error(err);
        showToast('Error loading data', '#dc3545');
    } finally {
        hideSpinner();
    }
}

function updateKPI(summary) {
    if (!summary) return;
    const setVal = (id, val) => document.getElementById(id).innerText = val || 0;
    setVal('kpi-wait-prod', summary.wait_prod);
    setVal('kpi-prod-done', summary.prod_done);
    setVal('kpi-wait-load', summary.wait_load);
    setVal('kpi-loaded', summary.loaded);
}

function filterData(status) {
    currentStatusFilter = status;
    document.querySelectorAll('.kpi-card').forEach(el => el.classList.remove('active'));
    // Logic Highlight Active Card ...
    loadData(); 
}

function renderTable(searchTerm) {
    const tbody = document.getElementById('tableBody');
    const keywords = searchTerm ? searchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0) : [];

    const filtered = allData.filter(item => {
        const text = `
            ${item.po_number} 
            ${item.sku} 
            ${item.description} 
            ${item.color} 
            ${item.dc_location} 
            ${item.ticket_number} 
            ${item.remark} 
            ${item.loading_week} 
            ${item.shipping_week}
            ${item.production_status} 
            ${item.loading_status}
            ${item.inspection_status}
        `.toLowerCase();

        if (keywords.length === 0) return true;
        return keywords.every(k => text.includes(k));
    });

    // Calculate Summary
    const totalContainers = filtered.length;
    let totalQty = 0;
    let totalAmount = 0;

    filtered.forEach(item => {
        const q = parseInt(item.quantity || 0);
        const p = parseFloat(item.price || 0);
        totalQty += q;
        totalAmount += (q * p);
    });

    document.getElementById('sum-containers').innerText = `${totalContainers} Containers`;
    document.getElementById('sum-qty').innerText = `${totalQty.toLocaleString()} Pcs`;
    document.getElementById('sum-amount').innerText = `$${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="19" class="text-center py-4 text-muted">No data found</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const isPrd = item.is_production_done == 1;
        const isLoad = item.is_loading_done == 1;
        const isConf = item.is_confirmed == 1;
        const rowClass = isConf ? 'row-confirmed' : '';

        // Helper สำหรับเซลล์ที่แก้ได้
        const editAttr = (field, val, type='text') => 
            `class="editable" ondblclick="makeEditable(this, ${item.id}, '${field}', '${val || ''}', '${type}')"`;

        // Logic Inspection Checkbox
        const inspText = (item.inspection_status || '').toLowerCase();
        const isInsp = (inspText === 'pass' || inspText === 'ok' || inspText === 'done');

        return `
        <tr class="${rowClass}">
            <td class="sticky-col fw-bold text-primary font-monospace ps-3">
                ${item.po_number}
            </td>

            <td class="text-center">
                <div class="form-check form-switch d-flex justify-content-center">
                    <input class="form-check-input" type="checkbox" style="cursor: pointer;" 
                        ${isConf ? 'checked' : ''} 
                        onchange="toggleCheck(${item.id}, 'confirm', this.checked)">
                </div>
            </td>

            <td class="text-center">${formatDate(item.order_date)}</td>
            
            <td class="font-monospace text-center">${item.sku || '-'}</td>
            
            <td class="long-text-cell" title="${item.description}">
                ${item.description || '-'}
            </td>
            
            <td class="text-center">${item.color || '-'}</td>
            
            <td class="text-center fw-bold font-monospace editable" 
                ondblclick="makeEditable(this, ${item.id}, 'quantity', '${item.quantity}', 'number')">
                ${item.quantity}
            </td>

            <td ${editAttr('dc_location', item.dc_location)}>${item.dc_location || '-'}</td>
            
            <td class="text-center" ${editAttr('loading_week', item.loading_week)}>${item.loading_week || '-'}</td>
            
            <td class="text-center" ${editAttr('shipping_week', item.shipping_week)}>${item.shipping_week || '-'}</td>
            
            <td class="text-center small editable" 
                ondblclick="makeEditable(this, ${item.id}, 'production_date', '${item.production_date || ''}', 'date')">
                ${formatDate(item.production_date)}
            </td>
            
            <td class="text-center bg-warning bg-opacity-10">
                <input type="checkbox" class="form-check-input status-check" 
                    ${isPrd ? 'checked' : ''} 
                    onchange="toggleCheck(${item.id}, 'prod', this.checked)">
            </td>

            <td class="text-center small editable" 
                ondblclick="makeEditable(this, ${item.id}, 'loading_date', '${item.loading_date || ''}', 'date')">
                ${formatDate(item.loading_date)}
            </td>
            
            <td class="text-center bg-info bg-opacity-10">
                <input type="checkbox" class="form-check-input status-check" 
                    ${isLoad ? 'checked' : ''} 
                    onchange="toggleCheck(${item.id}, 'load', this.checked)">
            </td>
            
            <td class="text-center small editable"
                ondblclick="makeEditable(this, ${item.id}, 'inspection_date', '${item.inspection_date || ''}', 'date')">
                ${formatDate(item.inspection_date)}
            </td>

            <td class="text-center bg-purple bg-opacity-10">
                <input type="checkbox" class="form-check-input status-check" 
                    style="border-color: #6f42c1; ${isInsp ? 'background-color: #6f42c1;' : ''}"
                    ${isInsp ? 'checked' : ''} 
                    onchange="toggleCheck(${item.id}, 'insp', this.checked)">
            </td>

            <td class="text-center fw-bold text-success font-monospace">
                $${parseFloat(item.price || 0).toFixed(2)}
            </td>

            <td class="small font-monospace text-primary text-center" ${editAttr('ticket_number', item.ticket_number)}>
                ${item.ticket_number || '-'}
            </td>

            <td ${editAttr('remark', item.remark)} 
                class="long-text-cell small text-muted" 
                title="${item.remark || ''}">
                ${item.remark || '-'}
            </td>
        </tr>`;
    }).join('');
}

// --- Inline Edit Logic ---
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
                } else {
                    alert('Update failed');
                    td.innerHTML = originalContent;
                }
            } catch (e) { console.error(e); td.innerHTML = originalContent; }
        } else {
            renderTable(document.getElementById('universalSearch').value);
        }
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
        if (json.success) {
            showImportResultModal(json);
            loadData();
        } else {
            alert('Import Error: ' + json.message);
        }
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