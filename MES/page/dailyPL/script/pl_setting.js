"use strict";

let allData = [];
let myModal = null;
let sortable = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Modal
    const modalEl = document.getElementById('plItemModal');
    if(modalEl) myModal = new bootstrap.Modal(modalEl);

    // 2. Load Data
    loadData();
});

async function loadData(isUpdate = false) {
    const tbody = document.getElementById('masterTableBody');
    const currentScroll = window.scrollY;

    if (!isUpdate) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>';
    }

    try {
        const res = await fetch('api/manage_pl_master.php?action=read');
        const json = await res.json();

        if (json.success) {
            allData = json.data;
            renderTable(allData);
            updateParentOptions(allData);
            initSortable();

            if (isUpdate) window.scrollTo(0, currentScroll);
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Error Loading Data</td></tr>';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('masterTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">No Data Found</td></tr>';
        return;
    }

    let html = '';
    data.forEach(item => {
        const level = parseInt(item.item_level) || 0;
        const isAuto = item.data_source.includes('AUTO');
        const isCalc = item.data_source === 'CALCULATED';
        
        // --- Row Styling ---
        let rowClass = (level === 0) ? 'level-0' : (level === 1 ? 'level-1' : 'level-deep');
        let indentStyle = (level === 0) ? '' : (level === 1 ? 'padding-left: 2rem;' : `padding-left: ${2 + (level * 1.5)}rem;`);
        
        // --- Icons ---
        let iconHtml = '';
        if (level === 0) iconHtml = `<i class="fas fa-folder text-primary me-2 fa-lg"></i>`;
        else if (level === 1) iconHtml = `<i class="far fa-folder-open text-secondary me-2"></i>`;
        else iconHtml = `<span class="text-muted opacity-25 me-1" style="font-family: monospace;">└─</span><i class="far fa-file-alt text-muted me-2"></i>`;

        // --- Badges (ใช้ Mini Badge แบบหน้า Entry) ---
        let typeBadge = '';
        if (item.item_type === 'REVENUE') typeBadge = `<span class="badge-mini badge-type-rev" title="Revenue">R</span>`;
        else if (item.item_type === 'COGS') typeBadge = `<span class="badge-mini badge-type-cogs" title="Cost of Goods Sold">C</span>`;
        else typeBadge = `<span class="badge-mini badge-type-exp" title="Expense">E</span>`;

        let sourceBadge = '';
        if (isAuto) sourceBadge = `<span class="badge-mini badge-src-auto" title="Auto System: ${item.data_source}">A</span>`;
        else if (isCalc) {
            const formulaDesc = item.calculation_formula === 'SUM_CHILDREN' ? 'Sum Children' : item.calculation_formula;
            sourceBadge = `<span class="badge-mini badge-src-calc" title="Formula: ${formulaDesc}">F</span>`;
        } else sourceBadge = `<span class="badge-mini badge-src-manual" title="Manual Input">M</span>`;

        // --- Build Row ---
        html += `
            <tr data-id="${item.id}" class="${rowClass}">
                <td style="${indentStyle}" class="pe-3">
                    <div class="d-flex align-items-center text-nowrap">
                        <i class="fas fa-grip-vertical text-muted cursor-move me-2 drag-handle opacity-25" style="cursor: grab;"></i>
                        ${iconHtml}
                        <span class="text-truncate">${item.item_name}</span>
                    </div>
                </td>

                <td class="text-start px-3">
                    <code class="text-muted small bg-light px-1 rounded">${item.account_code}</code>
                </td>

                <td class="text-start">
                    ${typeBadge} <small class="text-muted ms-1" style="font-size: 0.75rem;">${item.item_type}</small>
                </td>

                <td class="text-start">
                    ${sourceBadge} <small class="text-muted ms-1" style="font-size: 0.75rem;">${isAuto ? 'AUTO' : (isCalc ? 'FORMULA' : 'MANUAL')}</small>
                </td>

                <td class="text-center text-muted small">${item.row_order}</td>

                <td class="text-end pe-4">
                    <button class="action-btn btn-light text-primary border" onclick='editItem(${JSON.stringify(item)})'><i class="fas fa-pen fa-xs"></i></button>
                    <button class="action-btn btn-light text-danger border ms-1" onclick="deleteItem(${item.id})"><i class="fas fa-trash fa-xs"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ... (ส่วน Drag & Drop, Modal, Export, Import ยังคงเดิมครับ Logic ไม่เปลี่ยน) ...

// --- Drag & Drop ---
function initSortable() {
    const el = document.getElementById('masterTableBody');
    if (sortable) sortable.destroy();

    sortable = new Sortable(el, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'bg-light',
        onEnd: function (evt) { saveReorder(); }
    });
}

async function saveReorder() {
    const rows = document.querySelectorAll('#masterTableBody tr');
    const ids = Array.from(rows).map(row => row.getAttribute('data-id'));

    try {
        const formData = new FormData();
        formData.append('action', 'reorder');
        formData.append('items', JSON.stringify(ids));

        const res = await fetch('api/manage_pl_master.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            loadData(true);
            Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 })
                .fire({ icon: 'success', title: 'Reordered' });
        }
    } catch (err) {
        console.error(err);
    }
}

// --- Modal Functions ---
function updateParentOptions(data) {
    const select = document.getElementById('parentId');
    if (!select) return;
    const currentVal = select.value; 

    select.innerHTML = '<option value="">-- เป็นรายการหลัก (No Parent) --</option>';

    const parents = data.filter(item => 
        !item.parent_id || 
        item.data_source === 'CALCULATED' 
    );

    parents.forEach(p => {
        let prefix = '';
        if (parseInt(p.item_level) > 0) {
            prefix = '&nbsp;&nbsp;'.repeat(parseInt(p.item_level)) + '└─ ';
        }
        select.innerHTML += `<option value="${p.id}">${prefix}${p.account_code} : ${p.item_name}</option>`;
    });

    if (currentVal) select.value = currentVal;
}

function openModal() {
    document.getElementById('plItemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Add New Item';
    document.getElementById('srcManual').checked = true;
    myModal.show();
}

window.editItem = function(item) {
    document.getElementById('modalAction').value = 'save';
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>แก้ไขรายการบัญชี';
    
    document.getElementById('itemId').value = item.id;
    document.getElementById('accountCode').value = item.account_code;
    document.getElementById('itemName').value = item.item_name;
    document.getElementById('rowOrder').value = item.row_order;
    document.getElementById('itemType').value = item.item_type;
    document.getElementById('parentId').value = item.parent_id || '';

    const formulaInput = document.getElementById('calculationFormula');
    formulaInput.value = item.calculation_formula || '';

    const src = item.data_source;
    if (src === 'CALCULATED') document.getElementById('srcCalculated').checked = true;
    else if (src.startsWith('AUTO')) {
        document.getElementById('srcAuto').checked = true;
        document.getElementById('autoSystemSelect').value = src;
    } else document.getElementById('srcManual').checked = true;

    const radio = document.querySelector('input[name="data_source_mode"]:checked');
    if(radio) radio.onchange(); 

    myModal.show();
}

window.saveItem = async function() {
    const form = document.getElementById('plItemForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const formData = new FormData(form);
    const mode = formData.get('data_source_mode'); 
    let finalSource = 'MANUAL';

    if (mode === 'CALCULATED') finalSource = 'CALCULATED';
    else if (mode === 'AUTO') finalSource = document.getElementById('autoSystemSelect').value;
    else finalSource = 'MANUAL';

    formData.append('data_source', finalSource);
    
    try {
        const res = await fetch('api/manage_pl_master.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            myModal.hide();
            loadData(true);
            Swal.fire({ icon: 'success', title: 'Saved', timer: 1000, showConfirmButton: false });
        } else {
            Swal.fire('Error', json.message, 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Connection Error', 'error');
    }
}

window.deleteItem = async function(id) {
    if (!await Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed)) return;
    
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('id', id);
    
    const res = await fetch('api/manage_pl_master.php', { method: 'POST', body: formData });
    const json = await res.json();
    if(json.success) loadData(true);
    else Swal.fire('Error', json.message, 'error');
}

// ... (Export/Import Functions คงเดิม) ...
function exportTemplate() {
    if (allData.length === 0) {
        Swal.fire('Info', 'No Data', 'info'); return;
    }

    const exportData = allData.map(item => {
        const parent = allData.find(p => p.id === item.parent_id);
        return {
            "Item Name": item.item_name,
            "Type": item.item_type,
            "Source": item.data_source,
            "Formula": item.calculation_formula || '', 
            "Parent Code": parent ? parent.account_code : '', 
            "Account Code": item.account_code,
            "Order": item.row_order
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PL_Master");
    XLSX.writeFile(wb, `PL_Structure_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function handleFileUpload(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    input.value = '';

    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

            if (rows.length === 0) {
                Swal.fire('Error', 'Empty File', 'error'); return;
            }

            if (await Swal.fire({ title: 'Confirm Import?', text: `Found ${rows.length} items`, icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed)) {
                processImport(rows);
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Invalid File Format', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

async function processImport(rows) {
    Swal.fire({ title: 'Importing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const mappedData = rows.map(row => ({
        account_code: row["Account Code"] || '',
        item_name: row["Item Name"] || '',
        item_type: row["Type"] || 'EXPENSE',
        data_source: row["Source"] || 'MANUAL',
        calculation_formula: row["Formula"] || '',
        parent_code: row["Parent Code"] || null, 
        row_order: row["Order"] || 10
    }));

    try {
        const formData = new FormData();
        formData.append('action', 'import_batch');
        formData.append('data', JSON.stringify(mappedData));

        const response = await fetch('api/manage_pl_master.php', { method: 'POST', body: formData });
        const res = await response.json();

        if (res.success) {
            Swal.fire('Success', `Imported ${res.count} items`, 'success');
            loadData(true);
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Connection Failed', 'error');
    }
}