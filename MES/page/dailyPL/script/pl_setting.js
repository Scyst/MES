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

async function loadData() {
    const tbody = document.getElementById('masterTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const res = await fetch('api/manage_pl_master.php?action=read');
        const json = await res.json();

        if (json.success) {
            allData = json.data;
            renderTable(allData);
            updateParentOptions(allData);
            initSortable(); // Init Drag & Drop
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
        // --- 1. Identify Level & Style ---
        const level = parseInt(item.item_level) || 0;
        const isSection = item.data_source === 'SECTION';
        const isAuto = item.data_source.includes('AUTO');

        let rowClass = 'tree-item'; // Level 2+
        if (level === 0) rowClass = 'tree-l0'; // Root
        else if (level === 1) rowClass = 'tree-l1'; // Group

        // --- 2. Indentation Logic ---
        let nameContent = '';
        let indentPx = level * 30; // ย่อหน้าทีละ 30px
        
        if (level === 0) {
            nameContent = `<i class="fas fa-folder text-primary me-2"></i>${item.item_name}`;
        } else {
            // L-Shape Line
            nameContent = `
                <div style="padding-left: ${indentPx}px; position: relative;">
                    <span class="tree-line-v" style="left: ${indentPx - 18}px;"></span>
                    <span class="tree-line-h" style="left: ${indentPx - 18}px;"></span>
                    <i class="${isSection ? 'fas fa-folder-open' : 'far fa-file-alt'} text-muted me-2 fa-sm"></i>
                    ${item.item_name}
                </div>
            `;
        }

        // --- 3. Badges ---
        let typeBadge = '';
        if(item.item_type === 'REVENUE') typeBadge = '<span class="text-success fw-bold small">REV</span>';
        else if(item.item_type === 'COGS') typeBadge = '<span class="text-warning fw-bold small">COGS</span>';
        else typeBadge = '<span class="text-danger fw-bold small">EXP</span>';

        let sourceBadge = '';
        if (isSection) sourceBadge = '<span class="badge bg-secondary opacity-75 rounded-pill px-3">HEADER</span>';
        else if (isAuto) sourceBadge = '<span class="badge bg-info text-dark rounded-pill px-3"><i class="fas fa-robot me-1"></i>AUTO</span>';
        else sourceBadge = '<span class="badge bg-light text-dark border rounded-pill px-3">MANUAL</span>';

        // --- 4. Render Row ---
        html += `
            <tr data-id="${item.id}" class="${rowClass}">
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-grip-vertical text-muted cursor-move me-2 drag-handle opacity-25" style="cursor: grab;"></i>
                        <span class="w-100">${nameContent}</span>
                    </div>
                </td>
                <td class="text-center"><code class="text-muted bg-light px-2 rounded">${item.account_code}</code></td>
                <td class="text-center">${typeBadge}</td>
                <td class="text-center">${sourceBadge}</td>
                <td class="text-center text-muted small">${item.row_order}</td>
                <td class="text-center">
                    <button class="action-btn btn-light text-primary border" onclick='editItem(${JSON.stringify(item)})' title="Edit">
                        <i class="fas fa-pen fa-xs"></i>
                    </button>
                    <button class="action-btn btn-light text-danger border ms-1" onclick="deleteItem(${item.id})" title="Delete">
                        <i class="fas fa-trash fa-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

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
            loadData(); // Reload to refresh index
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
    select.innerHTML = '<option value="">-- Main Header --</option>';
    const parents = data.filter(item => !item.parent_id || item.data_source === 'SECTION');
    parents.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.account_code} - ${p.item_name}</option>`;
    });
}

function openModal() {
    document.getElementById('plItemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Add New Item';
    document.getElementById('srcManual').checked = true;
    myModal.show();
}

window.editItem = function(item) {
    document.getElementById('itemId').value = item.id;
    document.getElementById('accountCode').value = item.account_code;
    document.getElementById('itemName').value = item.item_name;
    document.getElementById('itemType').value = item.item_type;
    document.getElementById('rowOrder').value = item.row_order;
    document.getElementById('parentId').value = item.parent_id || '';
    
    const radios = document.getElementsByName('data_source');
    radios.forEach(r => { if (r.value === item.data_source) r.checked = true; });

    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Item';
    myModal.show();
}

window.saveItem = async function() {
    const form = document.getElementById('plItemForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const formData = new FormData(form);
    const btn = document.querySelector('button[onclick="saveItem()"]');
    btn.disabled = true;

    try {
        const res = await fetch('api/manage_pl_master.php', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) {
            myModal.hide();
            loadData();
            Swal.fire({ icon: 'success', title: 'Saved', timer: 1000, showConfirmButton: false });
        } else {
            Swal.fire('Error', json.message, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Connection Failed', 'error');
    } finally {
        btn.disabled = false;
    }
}

window.deleteItem = async function(id) {
    if (!await Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed)) return;
    
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('id', id);
    
    const res = await fetch('api/manage_pl_master.php', { method: 'POST', body: formData });
    const json = await res.json();
    if(json.success) loadData(); else Swal.fire('Error', json.message, 'error');
}

// =========================================================
// EXCEL EXPORT (FIXED KEY NAMES)
// =========================================================
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
            "Parent Code": parent ? parent.account_code : '', 
            "Account Code": item.account_code,
            "Order": item.row_order
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Manual Width Config
    ws['!cols'] = [
        { wch: 50 }, // Name
        { wch: 15 }, // Type
        { wch: 15 }, // Source
        { wch: 15 }, // Parent Code
        { wch: 15 }, // Account Code
        { wch: 10 }  // Order
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PL_Master");
    XLSX.writeFile(wb, `PL_Structure_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// =========================================================
// EXCEL IMPORT (FIXED KEY MAPPING)
// =========================================================
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

    // 🔥 Key Mapping ต้องตรงกับตอน Export เป๊ะๆ
    const mappedData = rows.map(row => ({
        account_code: row["Account Code"] || '', // Key ต้องตรงกับ Excel Header
        item_name: row["Item Name"] || '',
        item_type: row["Type"] || 'EXPENSE',
        data_source: row["Source"] || 'MANUAL',
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
            loadData();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Connection Failed', 'error');
    }
}