"use strict";

let allData = [];
let myModal = null;

document.addEventListener('DOMContentLoaded', () => {
    myModal = new bootstrap.Modal(document.getElementById('plItemModal'));
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
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('masterTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">ยังไม่มีข้อมูล</td></tr>';
        return;
    }

    let html = '';
    
    // เราจะวนลูปสร้าง HTML โดยเช็ค Level เพื่อจัดย่อหน้า
    data.forEach(item => {
        const isParent = !item.parent_id;
        const rowClass = isParent ? 'row-section' : 'row-item';
        
        // Badge Colors
        let typeBadge = 'bg-secondary';
        if (item.item_type === 'REVENUE') typeBadge = 'bg-success';
        if (item.item_type === 'COGS') typeBadge = 'bg-warning text-dark';
        if (item.item_type === 'EXPENSE') typeBadge = 'bg-danger';

        let sourceBadge = '<span class="badge bg-light text-dark border">MANUAL</span>';
        if (item.data_source === 'SECTION') sourceBadge = '<span class="badge bg-dark">HEADER</span>';
        if (item.data_source.includes('AUTO')) sourceBadge = '<span class="badge bg-info text-dark"><i class="fas fa-magic me-1"></i>AUTO</span>';

        html += `
            <tr class="${rowClass}">
                <td>
                    <div class="d-flex align-items-center">
                        ${isParent ? '<i class="fas fa-folder-open text-primary me-2"></i>' : '<i class="fas fa-caret-right text-muted me-2"></i>'}
                        <span class="${isParent ? 'fw-bold' : ''}">${item.item_name}</span>
                    </div>
                </td>
                <td><code class="text-dark bg-light px-2 py-1 rounded small">${item.account_code}</code></td>
                <td class="text-center"><span class="badge ${typeBadge}">${item.item_type}</span></td>
                <td class="text-center">${sourceBadge}</td>
                <td class="text-center text-muted small">${item.row_order}</td>
                <td class="text-center">
                    <button class="action-btn btn-outline-primary me-1" onclick='editItem(${JSON.stringify(item)})' title="แก้ไข">
                        <i class="fas fa-pencil-alt fa-sm"></i>
                    </button>
                    <button class="action-btn btn-outline-danger" onclick="deleteItem(${item.id})" title="ลบ">
                        <i class="fas fa-trash fa-sm"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function updateParentOptions(data) {
    const select = document.getElementById('parentId');
    select.innerHTML = '<option value="">-- เป็นหมวดหมู่หลัก --</option>';
    
    // กรองเอาเฉพาะตัวที่เป็น SECTION หรือตัวที่ไม่มี Parent (Level 0)
    const parents = data.filter(item => !item.parent_id || item.data_source === 'SECTION');
    
    parents.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.account_code} - ${p.item_name}</option>`;
    });
}

function openModal() {
    document.getElementById('plItemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle me-2"></i>เพิ่มรายการใหม่';
    
    // Default checked
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
    
    // Radio buttons logic
    const radios = document.getElementsByName('data_source');
    radios.forEach(r => {
        if (r.value === item.data_source) r.checked = true;
    });

    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>แก้ไขรายการ';
    myModal.show();
}

window.saveItem = async function() {
    const form = document.getElementById('plItemForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    
    // Disable Button
    const btn = document.querySelector('button[onclick="saveItem()"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

    try {
        const res = await fetch('api/manage_pl_master.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
            myModal.hide();
            loadData();
        } else {
            Swal.fire('Error', json.message, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Connection Failed', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

window.deleteItem = async function(id) {
    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "หากลบแล้วข้อมูลย้อนหลังอาจได้รับผลกระทบ",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'ลบรายการ'
    });

    if (result.isConfirmed) {
        try {
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('id', id);

            const res = await fetch('api/manage_pl_master.php', { method: 'POST', body: formData });
            const json = await res.json();

            if (json.success) {
                Swal.fire('Deleted!', 'ลบข้อมูลเรียบร้อย', 'success');
                loadData();
            } else {
                Swal.fire('Failed', json.message, 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Connection Failed', 'error');
        }
    }
}