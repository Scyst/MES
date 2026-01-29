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
    
    // 1. จำตำแหน่ง Scroll ปัจจุบันไว้
    const currentScroll = window.scrollY;

    // 2. ถ้าเป็นการ Update ไม่ต้องโชว์ Spinner (จะได้ไม่กระพริบ)
    // แต่ถ้าเปิดหน้ามาครั้งแรก (isUpdate = false) ให้โชว์ Spinner ตามปกติ
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

            // 3. คืนตำแหน่ง Scroll กลับไปที่เดิม (เฉพาะตอน Update)
            if (isUpdate) {
                window.scrollTo(0, currentScroll);
            }
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
        // 1. ดึงค่าตัวแปร (ลบ isSection ทิ้งไปแล้ว)
        const level = parseInt(item.item_level) || 0;
        const isAuto = item.data_source.includes('AUTO');
        const isCalc = item.data_source === 'CALCULATED';
        
        // 2. Class Logic: ใช้ Level เป็นตัวคุมความเข้ม (Hierarchy Coloring)
        let rowClass = '';
        if (level === 0) rowClass = 'level-0';
        else if (level === 1) rowClass = 'level-1';
        else rowClass = 'level-deep';

        // 3. Icon Logic
        let icon = 'far fa-file-alt text-muted'; // Default Icon
        if (level === 0) icon = 'fas fa-folder text-primary'; // Root ใช้ Folder
        else if (isCalc) icon = 'fas fa-calculator text-primary'; // Formula ใช้เครื่องคิดเลข
        else if (isAuto) icon = 'fas fa-robot text-info'; // Auto ใช้หุ่นยนต์

        // 4. Indent & Connector Logic
        let nameContent = '';
        let indentPx = level * 30;

        if (level === 0) {
            nameContent = `<i class="${icon} me-2"></i>${item.item_name}`;
        } else {
            nameContent = `
                <div style="padding-left: ${indentPx}px; position: relative;">
                    <span class="tree-line-v" style="left: ${indentPx - 18}px;"></span>
                    <span class="tree-line-h" style="left: ${indentPx - 18}px;"></span>
                    <i class="${icon} me-2 fa-sm"></i>
                    ${item.item_name}
                </div>
            `;
        }

        // 5. Type Badge
        let typeBadge = '';
        if(item.item_type === 'REVENUE') typeBadge = '<span class="text-success fw-bold small">REV</span>';
        else if(item.item_type === 'COGS') typeBadge = '<span class="text-warning fw-bold small">COGS</span>';
        else typeBadge = '<span class="text-danger fw-bold small">EXP</span>';

        // 6. Source Badge (จุดที่เคย Error เพราะมี isSection)
        let sourceBadge = '';
        // แก้ไข: เช็คแค่ Auto, Calc, หรือ Manual เท่านั้น (ตัด Section ทิ้ง)
        if (isAuto) {
            sourceBadge = '<span class="badge bg-info text-dark rounded-pill px-3"><i class="fas fa-robot me-1"></i>AUTO</span>';
        } else if (isCalc) {
            sourceBadge = '<span class="badge bg-primary rounded-pill px-3"><i class="fas fa-calculator me-1"></i>FORMULA</span>';
        } else {
            sourceBadge = '<span class="badge bg-light text-dark border rounded-pill px-3">MANUAL</span>';
        }

        // 7. Render Row
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
                    <button class="action-btn btn-light text-primary border" onclick='editItem(${JSON.stringify(item)})'><i class="fas fa-pen fa-xs"></i></button>
                    <button class="action-btn btn-light text-danger border ms-1" onclick="deleteItem(${item.id})"><i class="fas fa-trash fa-xs"></i></button>
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
    if (!select) {
        console.warn('Element #parentId not found in DOM');
        return; 
    }
    const currentVal = select.value; 

    select.innerHTML = '<option value="">-- เป็นรายการหลัก (No Parent) --</option>';

    // กรองเอาเฉพาะตัวที่น่าจะเป็นแม่ได้ (คือพวกที่เป็นสูตรคำนวณ หรือไม่มีแม่)
    const parents = data.filter(item => 
        !item.parent_id || // เป็น Root
        item.data_source === 'CALCULATED' // เป็นสูตร (ซึ่งส่วนใหญ่คือหัวข้อรวม)
    );

    parents.forEach(p => {
        let prefix = '';
        if (parseInt(p.item_level) > 0) {
            prefix = '&nbsp;&nbsp;'.repeat(parseInt(p.item_level)) + '└─ ';
        }
        
        // แสดง Formula เป็นค่า Default
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
    
    // Fill Basic Data
    document.getElementById('itemId').value = item.id;
    document.getElementById('accountCode').value = item.account_code;
    document.getElementById('itemName').value = item.item_name;
    document.getElementById('rowOrder').value = item.row_order;
    document.getElementById('itemType').value = item.item_type;
    document.getElementById('parentId').value = item.parent_id || '';

    // 🔥 Fill Formula (แก้ปัญหาเปิดมาแล้วสูตรหาย)
    const formulaInput = document.getElementById('calculationFormula');
    formulaInput.value = item.calculation_formula || '';

    // 🔥 Handle Data Source Selection
    const src = item.data_source;

    if (src === 'CALCULATED') {
        document.getElementById('srcCalculated').checked = true;
    } 
    else if (src.startsWith('AUTO')) {
        document.getElementById('srcAuto').checked = true;
        document.getElementById('autoSystemSelect').value = src; // เลือก Dropdown ให้ตรงค่าเก่า
    } 
    else {
        // Manual หรืออื่นๆ
        document.getElementById('srcManual').checked = true;
    }

    // Trigger UI Change (เพื่อให้ช่อง Formula หรือ Dropdown เด้งขึ้นมา)
    // เราต้องเรียกฟังก์ชันนี้หลังจาก Set Checked แล้ว
    // (ฟังก์ชันนี้อยู่ใน scope ของ Modal HTML แต่เราเรียกผ่าน window หรือ event ได้)
    // วิธีง่ายสุดคือ manually trigger event
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

    // เตรียม FormData
    const formData = new FormData(form);
    
    // 🔥 Logic รวมร่าง Data Source
    // 1. ดูว่าเลือก Mode ไหน (CALCULATED, AUTO, MANUAL)
    const mode = formData.get('data_source_mode'); 
    let finalSource = 'MANUAL';

    if (mode === 'CALCULATED') {
        finalSource = 'CALCULATED';
    } else if (mode === 'AUTO') {
        // ถ้าเลือก Auto ให้ไปเอาค่าจาก Dropdown แทน
        finalSource = document.getElementById('autoSystemSelect').value;
    } else {
        finalSource = 'MANUAL';
    }

    // ยัดค่าที่ถูกต้องกลับเข้าไปใน FormData เพื่อส่งไปหลังบ้าน
    formData.append('data_source', finalSource);
    
    // (ค่า data_source_mode ไม่ต้องส่งไปก็ได้ หรือส่งไปก็ไม่เป็นไร หลังบ้านไม่ใช้)

    // ส่งข้อมูล
    try {
        const res = await fetch('api/manage_pl_master.php', {
            method: 'POST',
            body: formData
        });
        const json = await res.json();

        if (json.success) {
            myModal.hide();
            loadData(true); // Refresh table
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
            "Formula": item.calculation_formula || '', // 🔥 เพิ่มช่องนี้
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
        { wch: 20 }, // Formula
        { wch: 15 }, // Parent
        { wch: 15 }, // Code
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