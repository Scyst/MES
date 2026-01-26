"use strict";

const API_URL = 'api/manage_pl_master.php';
let allMasterData = [];

// ใช้ DOMContentLoaded แทน $(document).ready
document.addEventListener('DOMContentLoaded', function() {
    loadMasterData();

    // Search Logic แบบ Pure JS
    const searchInput = document.getElementById('masterSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const term = this.value.toLowerCase();
            const filtered = allMasterData.filter(item => 
                item.item_name.toLowerCase().includes(term) || 
                item.account_code.toLowerCase().includes(term)
            );
            renderMasterTable(filtered);
        });
    }
});

async function loadMasterData() {
    const tbody = document.getElementById('plMasterTableBody');
    // แสดง Spinner
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const response = await fetch(`${API_URL}?action=read`);
        const res = await response.json();
        
        if (res.success) {
            allMasterData = res.data;
            renderMasterTable(allMasterData);
        } else {
            alert('Error: ' + res.message);
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

function renderMasterTable(data) {
    const tbody = document.getElementById('plMasterTableBody');
    let html = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5">ไม่พบข้อมูล</td></tr>';
        return;
    }

    data.forEach(item => {
        const isParent = !item.parent_id;
        const sourceClass = item.data_source === 'MANUAL' ? 'badge bg-info-subtle text-info' : 
                           (item.data_source === 'MES_SYNC' ? 'badge bg-success-subtle text-success' : 'badge bg-secondary-subtle text-secondary');
        
        html += `
            <tr class="${isParent ? 'row-parent' : 'row-child'}">
                <td><span class="fw-mono">${item.account_code}</span></td>
                <td>
                    ${isParent ? '<i class="fas fa-folder me-2 text-warning"></i>' : '<i class="fas fa-level-up-alt fa-rotate-90 me-2 text-muted"></i>'}
                    ${item.item_name}
                </td>
                <td><small class="text-uppercase">${item.item_type}</small></td>
                <td><span class="${sourceClass}">${item.data_source}</span></td>
                <td class="text-center">${item.row_order}</td>
                <td class="text-center">
                    <div class="form-check form-switch d-flex justify-content-center">
                        <input class="form-check-input" type="checkbox" ${item.is_active == 1 ? 'checked' : ''} 
                               onchange="toggleItemStatus(${item.id}, ${item.is_active})">
                    </div>
                </td>
                <td class="text-center">
                    <button class="btn btn-icon-minimal text-primary" onclick='editItem(${JSON.stringify(item)})'>
                        <i class="fas fa-pen"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ฟังก์ชัน Toggle Status (Pure JS Fetch)
async function toggleItemStatus(id, currentStatus) {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const formData = new URLSearchParams();
    formData.append('action', 'update_status');
    formData.append('id', id);
    formData.append('is_active', newStatus);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        const res = await response.json();
        if (res.success) loadMasterData();
    } catch (err) {
        console.error('Update status error:', err);
    }
}

// หมายเหตุ: ฟังก์ชัน editItem ต้องเขียนเพิ่มเพื่อเปิด Modal และเติมข้อมูล
function editItem(item) {
    console.log('Editing item:', item);
    // TODO: logic สำหรับเปิด Modal และใส่ค่าในฟอร์ม
}