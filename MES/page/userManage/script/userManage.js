"use strict";

const API_URL = 'api/userManage.php';
let allUsers = [];

// --- API Helper ---
async function sendRequest(action, method, body = null) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const options = { method, headers: {} };

    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    if (method !== 'GET' && csrfToken) options.headers['X-CSRF-TOKEN'] = csrfToken;

    const res = await fetch(`${API_URL}?action=${action}`, options);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
}

// --- Toast & Loader ---
function showToast(message, color = '#333') {
    Swal.fire({
        text: message,
        background: color,
        color: '#fff',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });
}
function setBtnLoading(btn, isLoading) {
    if(!btn) return;
    if(isLoading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.originalHtml;
        btn.disabled = false;
    }
}

// --- Logic Functions ---
async function loadUsers() {
    try {
        const result = await sendRequest('read', 'GET');
        if (result.success) {
            allUsers = result.data;
            renderTable(allUsers);
        }
    } catch (e) {
        console.error(e);
        showToast('Failed to load users', '#dc3545');
    }
}

function getRoleBadge(role) {
    const map = {
        'admin': 'bg-danger',
        'manager': 'bg-dark',
        'planner': 'bg-info text-dark',
        'supervisor': 'bg-primary',
        'qc': 'bg-warning text-dark',
        'maintenance': 'bg-secondary',
        'operator': 'bg-success'
    };
    const cls = map[role] || 'bg-light text-dark border';
    return `<span class="badge ${cls} badge-role text-uppercase">${role}</span>`;
}

function renderTable(users) {
    const tbody = document.getElementById('userTable');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">No data found.</td></tr>`;
        return;
    }

    users.forEach(u => {
        const isActive = (u.is_active == 1);
        const nameChar = (u.fullname || u.username).charAt(0).toUpperCase();
        
        const tr = document.createElement('tr');
        if (!isActive) tr.style.opacity = '0.5';

        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center gap-3">
                    <div class="avatar-circle ${isActive ? '' : 'bg-secondary'}">${nameChar}</div>
                    <div>
                        <div class="fw-bold mb-0 text-dark">${u.fullname || '-'}</div>
                        <small class="text-muted"><i class="fas fa-id-badge me-1"></i> ${u.emp_id || 'No ID'}</small>
                    </div>
                </div>
            </td>
            <td class="fw-semibold text-primary">@${u.username}</td>
            <td>
                <div>${getRoleBadge(u.role)}</div>
                <small class="text-muted d-block mt-1">
                    <i class="fas fa-layer-group me-1"></i> ${u.line || 'ALL'} 
                    ${u.team_group ? `| Team: ${u.team_group}` : ''}
                </small>
            </td>
            <td>
                ${isActive 
                    ? '<span class="badge bg-success bg-opacity-10 text-success border border-success"><i class="fas fa-check-circle me-1"></i> Active</span>' 
                    : '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary"><i class="fas fa-ban me-1"></i> Inactive</span>'}
            </td>
            <td>
                ${u.is_auto_generated == 1 
                    ? '<span class="badge bg-primary bg-opacity-10 text-primary"><i class="fas fa-robot me-1"></i> System</span>' 
                    : '<span class="badge bg-light text-dark border"><i class="fas fa-user-edit me-1"></i> Manual</span>'}
            </td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-light border btn-edit" title="Edit"><i class="fas fa-edit text-warning"></i></button>
                <button class="btn btn-sm btn-light border ms-1 btn-toggle" title="${isActive ? 'Disable' : 'Enable'}">
                    <i class="fas ${isActive ? 'fa-ban text-danger' : 'fa-check text-success'}"></i>
                </button>
            </td>
        `;

        tr.querySelector('.btn-edit').onclick = () => openEdit(u);
        tr.querySelector('.btn-toggle').onclick = () => toggleStatus(u.id, isActive);
        
        tbody.appendChild(tr);
    });
}

function openModal(id) {
    const el = document.getElementById(id);
    if(el) new bootstrap.Modal(el).show();
}

function openEdit(user) {
    document.getElementById('edit_id').value = user.id;
    document.getElementById('edit_emp_id').value = user.emp_id || '';
    document.getElementById('edit_username').value = user.username;
    document.getElementById('edit_fullname').value = user.fullname || '';
    document.getElementById('edit_role').value = user.role;
    document.getElementById('edit_team').value = user.team_group || '';
    document.getElementById('edit_line').value = user.line || '';
    document.getElementById('edit_password').value = ''; // clear input
    openModal('editUserModal');
}

async function toggleStatus(id, isActive) {
    const act = isActive ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${act} this user?`)) return;
    try {
        const res = await sendRequest('toggle_status', 'POST', { id });
        showToast(res.message, res.success ? '#198754' : '#dc3545');
        if (res.success) loadUsers();
    } catch (e) {
        showToast('Operation failed', '#dc3545');
    }
}

// --- DOM Ready Events ---
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    // Client-side search
    document.getElementById('searchUserInput').addEventListener('input', (e) => {
        const kw = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => 
            (u.fullname || '').toLowerCase().includes(kw) || 
            (u.username || '').toLowerCase().includes(kw) || 
            (u.emp_id || '').toLowerCase().includes(kw)
        );
        renderTable(filtered);
    });

    // Forms Submission
    document.getElementById('addUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setBtnLoading(btn, true);
        try {
            const data = Object.fromEntries(new FormData(e.target));
            const res = await sendRequest('create', 'POST', data);
            showToast(res.message, res.success ? '#198754' : '#dc3545');
            if(res.success) {
                bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
                e.target.reset();
                loadUsers();
            }
        } finally { setBtnLoading(btn, false); }
    });

    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setBtnLoading(btn, true);
        try {
            const data = Object.fromEntries(new FormData(e.target));
            const res = await sendRequest('update', 'POST', data);
            showToast(res.message, res.success ? '#ffc107' : '#dc3545');
            if(res.success) {
                bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
                loadUsers();
            }
        } finally { setBtnLoading(btn, false); }
    });

    // Sync Button
    document.getElementById('btnSyncManpower').addEventListener('click', async (e) => {
        if(!confirm("This will pull new users and update existing profiles from Manpower Data. Proceed?")) return;
        const btn = e.currentTarget;
        setBtnLoading(btn, true);
        try {
            const res = await sendRequest('sync_manpower', 'POST');
            showToast(res.message, res.success ? '#0d6efd' : '#dc3545');
            if(res.success) loadUsers();
        } catch(err) {
            showToast('Sync failed!', '#dc3545');
        } finally {
            setBtnLoading(btn, false);
        }
    });

    // 🔥 ระบบ Auto-fill ข้อมูลจากตาราง Manpower เมื่อพิมพ์รหัสพนักงาน
    async function fetchEmpInfoAndFill(empId, prefix) {
        const cleanId = empId.trim();
        if (cleanId.length < 4) return; // ไม่ค้นหาถ้ารหัสสั้นเกินไป

        try {
            const res = await sendRequest('get_emp_info', 'GET', null, { emp_id: cleanId });
            if (res.success && res.data) {
                // เติมข้อมูลลงช่องต่างๆ
                document.getElementById(prefix + 'fullname').value = res.data.name_th || '';
                document.getElementById(prefix + 'line').value = res.data.line || '';
                document.getElementById(prefix + 'team').value = res.data.team_group || '';
                
                // ถ้านี่คือฟอร์ม Add ให้เอา emp_id ไปใส่ในช่อง Username ให้ด้วยเลยเพื่อความไว
                if (prefix === 'add_') {
                    const unInput = document.getElementById('add_username');
                    if (!unInput.value) unInput.value = cleanId;
                }
                
                showToast(`พบข้อมูลพนักงาน: ${res.data.name_th}`, '#0d6efd');
            }
        } catch (e) {
            console.log('Employee not found in manpower DB yet.');
        }
    }

    // จับ Event เมื่อพิมพ์รหัสพนักงานเสร็จแล้วคลิกออก (change) 
    const addEmpInput = document.getElementById('add_emp_id');
    if(addEmpInput) {
        addEmpInput.addEventListener('change', (e) => fetchEmpInfoAndFill(e.target.value, 'add_'));
    }

    const editEmpInput = document.getElementById('edit_emp_id');
    if(editEmpInput) {
        editEmpInput.addEventListener('change', (e) => fetchEmpInfoAndFill(e.target.value, 'edit_'));
    }
});