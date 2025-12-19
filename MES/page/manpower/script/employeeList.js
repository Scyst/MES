// page/manpower/script/employeeList.js
"use strict";

const API_URL = 'api/api_master_data.php';

// Variables
let allEmployees = [];
let displayData = [];
let editModal;
let currentPage = 1;
const rowsPerPage = 100; // Pagination Limit

document.addEventListener('DOMContentLoaded', () => {
    // Init Components
    // ID Modal ตรงกับ editEmployeeModal.php คือ 'editEmployeeModal'
    const modalEl = document.getElementById('editEmployeeModal'); 
    if (modalEl) editModal = new bootstrap.Modal(modalEl);

    // Initial Fetch
    fetchEmployees();

    // Search Listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
});

// ==========================================
// Data & Actions
// ==========================================

async function fetchEmployees() {
    showSpinner();
    try {
        // [CORRECTED] Action ตรงกับ Backend ใหม่
        const res = await fetch(`${API_URL}?action=read_employees`);
        const json = await res.json();
        
        if (json.success) {
            allEmployees = json.data;
            displayData = [...allEmployees];
            
            populateDropdowns(json);
            
            currentPage = 1;
            renderTablePage(currentPage);
        } else {
            showToast(json.message || 'Error loading data', '#dc3545');
        }
    } catch (err) {
        console.error(err);
        showToast('Connection Error', '#dc3545');
    } finally {
        hideSpinner();
    }
}

// [CORRECTED] เปลี่ยนชื่อฟังก์ชันให้ตรงกับ onclick ใน editEmployeeModal.php
async function saveEmployeeInfo() {
    // [CORRECTED] แก้ ID ให้ตรงกับ HTML (empEdit...)
    const payload = {
        emp_id: document.getElementById('empEditId').value,
        line: document.getElementById('empEditLine').value,
        shift_id: document.getElementById('empEditShift').value || null,
        team_group: document.getElementById('empEditTeam').value || null,
        // หมายเหตุ: ใน HTML Modal ที่ส่งมา ผมไม่เห็น checkbox is_active 
        // แต่ถ้ามีและตั้ง id เป็น empEditActive ให้ใช้ตามนี้ครับ
        is_active: document.getElementById('empEditActive') ? (document.getElementById('empEditActive').checked ? 1 : 0) : 1
    };

    if(!payload.line) {
        showToast('Please select a Line', '#ffc107'); 
        return;
    }

    showSpinner();
    try {
        // [CORRECTED] Action ตรงกับ Backend ใหม่ (update_employee)
        const res = await fetch(`${API_URL}?action=update_employee`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.success) {
            showToast('Employee updated successfully', '#198754');
            editModal.hide();
            fetchEmployees(); // Reload table
        } else {
            showToast(json.message, '#dc3545');
        }
    } catch (err) {
        console.error(err);
        showToast('Error saving data', '#dc3545');
    } finally {
        hideSpinner();
    }
}

// ==========================================
// UI & Rendering (ส่วนนี้ถูกต้องแล้ว ใช้ของเดิมได้)
// ==========================================

function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    displayData = allEmployees.filter(emp => 
        (emp.name_th && emp.name_th.toLowerCase().includes(term)) || 
        (emp.emp_id && emp.emp_id.includes(term)) || 
        (emp.team_group && emp.team_group.toLowerCase().includes(term)) || 
        (emp.line && emp.line.toLowerCase().includes(term))
    );
    currentPage = 1;
    renderTablePage(currentPage);
}

function renderTablePage(page) {
    const tbody = document.getElementById('empTableBody');
    const paginationControls = document.getElementById('paginationControls');
    
    if (displayData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-5 text-muted">No employees found.</td></tr>';
        document.getElementById('pageInfo').innerText = 'Showing 0 entries';
        paginationControls.innerHTML = '';
        return;
    }

    const totalItems = displayData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, totalItems);
    const pageData = displayData.slice(start, end);

    document.getElementById('pageInfo').innerText = `Showing ${start + 1} to ${end} of ${totalItems} employees`;

    tbody.innerHTML = pageData.map(emp => {
        const isActive = emp.is_active == 1 
            ? '<span class="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-2">Active</span>' 
            : '<span class="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-2">Inactive</span>';
        
        const lineBadge = emp.line && emp.line.includes('POOL') 
            ? `<span class="badge bg-warning text-dark bg-opacity-25 border border-warning">${emp.line}</span>` 
            : `<span class="badge bg-light text-dark border font-monospace">${emp.line || '-'}</span>`;
        
        const shiftName = emp.shift_name ? `<span class="badge bg-info text-dark bg-opacity-10 border border-info">${emp.shift_name}</span>` : '<span class="text-muted">-</span>';

        let teamBadge = '<span class="text-muted opacity-25">-</span>';
        if(emp.team_group === 'A') teamBadge = '<span class="badge bg-primary border border-light shadow-sm" style="width:30px;">A</span>';
        if(emp.team_group === 'B') teamBadge = '<span class="badge bg-warning text-dark border border-light shadow-sm" style="width:30px;">B</span>';
        if(emp.team_group === 'C') teamBadge = '<span class="badge bg-success border border-light shadow-sm" style="width:30px;">C</span>';
        if(emp.team_group === 'D') teamBadge = '<span class="badge bg-danger border border-light shadow-sm" style="width:30px;">D</span>';

        const safeEmp = JSON.stringify(emp).replace(/"/g, '&quot;');

        return `
            <tr class="cursor-pointer hover-bg" onclick="openEdit(${safeEmp})">
                <td class="ps-4 pe-3 font-monospace text-primary fw-bold">${emp.emp_id}</td>
                <td>
                    <div class="fw-bold text-dark">${emp.name_th || '-'}</div>
                    <div class="small text-muted">
                        <i class="fas fa-briefcase me-1"></i>${emp.department_api || '-'} 
                        <span class="mx-1 text-secondary">|</span> 
                        ${emp.position || '-'}
                    </div>
                </td>
                <td class="text-center">${teamBadge}</td>
                <td class="text-center">${lineBadge}</td>
                <td class="text-center">${shiftName}</td>
                <td class="text-center">${isActive}</td>
            </tr>
        `;
    }).join('');

    renderPagination(totalPages, paginationControls);
}

function renderPagination(totalPages, nav) {
    let buttons = '';
    buttons += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="event.preventDefault(); changePage(${currentPage - 1})">Previous</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            buttons += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="event.preventDefault(); changePage(${i})">${i}</a></li>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            buttons += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    buttons += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="event.preventDefault(); changePage(${currentPage + 1})">Next</a></li>`;
    nav.innerHTML = buttons;
}

window.changePage = function(page) {
    if (page < 1) return;
    currentPage = page;
    renderTablePage(currentPage);
}

// ==========================================
// Modals & Helpers
// ==========================================

window.openEdit = function(emp) {
    // [CORRECTED] แก้ ID ให้ตรงกับ HTML (empEdit...)
    document.getElementById('empEditName').value = `${emp.emp_id} - ${emp.name_th}`;
    document.getElementById('empEditId').value = emp.emp_id;
    
    const lineEl = document.getElementById('empEditLine');
    if(lineEl) lineEl.value = emp.line || ''; 

    const shiftEl = document.getElementById('empEditShift');
    if(shiftEl) shiftEl.value = emp.default_shift_id || '';

    const teamEl = document.getElementById('empEditTeam');
    if(teamEl) teamEl.value = emp.team_group || ''; 
    
    // Checkbox ถ้ามี
    const activeEl = document.getElementById('empEditActive');
    if(activeEl) activeEl.checked = (emp.is_active == 1);
    
    if(editModal) editModal.show();
}

function populateDropdowns(json) {
    // [CORRECTED] แก้ ID ให้ตรงกับ HTML
    const lineSelect = document.getElementById('empEditLine');
    const shiftSelect = document.getElementById('empEditShift');

    if(lineSelect) {
        let lineHtml = '<option value="">-- Select Line --</option>';
        if (json.lines && json.lines.length > 0) {
            json.lines.forEach(line => lineHtml += `<option value="${line}">${line}</option>`);
        } else {
            lineHtml += `<option value="L1">L1</option><option value="L2">L2</option>`;
        }
        lineSelect.innerHTML = lineHtml;
    }

    if(shiftSelect) {
        let shiftHtml = '<option value="">-- Select Shift --</option>';
        if(json.shifts) {
            json.shifts.forEach(s => {
                shiftHtml += `<option value="${s.shift_id}">${s.shift_name} (${s.start_time.substring(0,5)}-${s.end_time.substring(0,5)})</option>`;
            });
        }
        shiftSelect.innerHTML = shiftHtml;
    }
}

function showToast(message, color) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 9999;';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = 'toast show align-items-center text-white border-0 mb-2 shadow';
    el.style.backgroundColor = color;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function showSpinner() { const el = document.getElementById('loadingOverlay'); if(el) el.style.display = 'flex'; }
function hideSpinner() { const el = document.getElementById('loadingOverlay'); if(el) el.style.display = 'none'; }