// userManage.js (เวอร์ชันปรับปรุง Pagination)

//-- Global Variables & Constants --
const API_URL = '../../api/userManage/userManage.php';

/**
 * ฟังก์ชันกลางสำหรับส่ง Request ไปยัง API
 */
async function sendRequest(action, method, body = null, urlParams = {}) {
    try {
        urlParams.action = action;
        const queryString = new URLSearchParams(urlParams).toString();
        const url = `${API_URL}?${queryString}`;

        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const options = { method, headers: {} };

        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        if (method.toUpperCase() !== 'GET' && csrfToken) {
            options.headers['X-CSRF-TOKEN'] = csrfToken;
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        showToast('An unexpected error occurred. Check console for details.', '#dc3545');
        return { success: false, message: "A network or server error occurred." };
    }
}


// ==============================================
//  SECTION: USER LIST MANAGEMENT
// ==============================================

let allUsers = [];

async function loadUsers() {
    showSpinner(); // <-- เพิ่ม: แสดง Spinner
    try {
        const result = await sendRequest('read', 'GET');
        if (result && result.success) {
            allUsers = result.data;
            renderUserTable(allUsers);
        } else {
            showToast(result?.message || 'Failed to load users.', '#dc3545');
        }
    } finally {
        hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
    }
}

function renderUserTable(usersToRender) {
    const tbody = document.getElementById('userTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!usersToRender || usersToRender.length === 0) {
        const colSpan = canManage ? 6 : 5;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center">No users found.</td></tr>`;
        return;
    }

    usersToRender.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td>${user.line || '-'}</td>
            <td>${user.created_at || 'N/A'}</td>
            ${canManage ? `<td class="text-center"></td>` : ''}
        `;

        if (canManage) {
            const actionsTd = tr.querySelector('.text-center');
            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'd-flex gap-1 btn-group-equal';

            const isSelf = (user.id === currentUserId);
            const canEditTarget = (currentUserRole === 'creator') || (currentUserRole === 'admin' && user.role !== 'admin' && user.role !== 'creator') || isSelf;
            const canDeleteTarget = !isSelf && ((currentUserRole === 'creator' && user.role !== 'creator') || (currentUserRole === 'admin' && user.role !== 'admin' && user.role !== 'creator'));

            if (canEditTarget) {
                const editButton = document.createElement('button');
                editButton.className = 'btn btn-sm btn-warning flex-fill';
                editButton.textContent = 'Edit';
                editButton.onclick = () => openEditUserModal(user);
                buttonWrapper.appendChild(editButton);
            }

            if (canDeleteTarget) {
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-danger flex-fill';
                deleteButton.textContent = 'Delete';
                deleteButton.onclick = () => deleteUser(user.id);
                buttonWrapper.appendChild(deleteButton);
            }
            actionsTd.appendChild(buttonWrapper);
        }
        tbody.appendChild(tr);
    });
}

async function deleteUser(id) {
    if (!confirm(`Are you sure you want to delete user ID ${id}?`)) return;

    showSpinner(); // <-- เพิ่ม: แสดง Spinner
    try {
        const result = await sendRequest('delete', 'GET', null, { id });
        showToast(result.message, result.success ? '#28a745' : '#dc3545');
        if (result.success) {
            await loadUsers(); // ใช้ await เพื่อให้ spinner แสดงต่อเนื่อง
        }
    } finally {
        hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
    }
}

// ==============================================
//  SECTION: USER LOGS MANAGEMENT
// ==============================================

let logTabInitialized = false;

async function fetchLogs(page = 1) {
    const userFilter = document.getElementById('logUserFilter').value;
    const actionFilter = document.getElementById('logActionFilter').value;
    const targetFilter = document.getElementById('logTargetFilter').value;
    const startDate = document.getElementById('logStartDate').value;
    const endDate = document.getElementById('logEndDate').value;
    
    const params = { page, limit: 50 };

    if (userFilter) params.user = userFilter;
    if (actionFilter) params.action_type = actionFilter;
    if (targetFilter) params.target = targetFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    showSpinner(); // <-- เพิ่ม: แสดง Spinner
    try {
        const result = await sendRequest('logs', 'GET', null, params);
        if (result.success) {
            renderLogTable(result.data);
            renderLogPagination(result.page, Math.ceil(result.total / result.limit));
        } else {
            const logTable = document.getElementById('log-table');
            if (logTable) {
                logTable.innerHTML = `<tbody><tr><td colspan="5" class="text-center text-danger">${result.message}</td></tr></tbody>`;
            }
        }
    } finally {
        hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
    }
}

function renderLogTable(logs) {
    const table = document.getElementById('log-table');
    if (!table) return;
    table.innerHTML = `
        <thead class="">
            <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No logs found for the selected filters.</td></tr>`;
        return;
    }

    logs.forEach(log => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${log.created_at}</td>
            <td>${log.action_by}</td>
            <td>${log.action_type}</td>
            <td>${log.target_user || '-'}</td>
            <td>${log.detail || '-'}</td>
        `;
    });
}

/**
 * ===== ฟังก์ชัน Pagination ที่ปรับปรุงใหม่ =====
 */
function renderLogPagination(currentPage, totalPages) {
    const container = document.getElementById('log-pagination');
    if (!container) return;
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const ul = document.createElement('ul');
    ul.className = 'pagination pagination';

    const createPageItem = (text, page, isDisabled = false, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        a.dataset.page = page;
        li.appendChild(a);
        return li;
    };
    
    const createEllipsis = () => {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        const span = document.createElement('span');
        span.className = 'page-link';
        span.textContent = '...';
        li.appendChild(span);
        return li;
    };

    ul.appendChild(createPageItem('Previous', currentPage - 1, currentPage === 1));

    if (totalPages <= 7) { // ถ้ามีไม่เกิน 7 หน้า ให้แสดงทั้งหมด
        for (let i = 1; i <= totalPages; i++) {
            ul.appendChild(createPageItem(i, i, false, i === currentPage));
        }
    } else { // ถ้ามีมากกว่า 7 หน้า ให้แสดงแบบย่อ
        // แสดงหน้า 1 เสมอ
        ul.appendChild(createPageItem(1, 1, false, currentPage === 1));

        // แสดง ... หลังหน้า 1
        if (currentPage > 4) {
            ul.appendChild(createEllipsis());
        }

        // คำนวณช่วงของหน้าที่แสดง
        let startPage = Math.max(2, currentPage - 2);
        let endPage = Math.min(totalPages - 1, currentPage + 2);

        if (currentPage <= 4) {
            startPage = 2;
            endPage = 5;
        }
        if (currentPage >= totalPages - 3) {
            startPage = totalPages - 4;
            endPage = totalPages - 1;
        }

        for (let i = startPage; i <= endPage; i++) {
            ul.appendChild(createPageItem(i, i, false, i === currentPage));
        }

        // แสดง ... ก่อนหน้าสุดท้าย
        if (currentPage < totalPages - 3) {
            ul.appendChild(createEllipsis());
        }
        
        // แสดงหน้าสุดท้ายเสมอ
        ul.appendChild(createPageItem(totalPages, totalPages, false, currentPage === totalPages));
    }

    ul.appendChild(createPageItem('Next', currentPage + 1, currentPage === totalPages));
    container.appendChild(ul);
}


// ==============================================
//  SECTION: DYNAMIC UI & EVENT LISTENERS
// ==============================================

function updateControls(activeTabId) {
    const userFilters = document.getElementById('user-filters');
    const logFilters = document.getElementById('log-filters');
    const buttonGroup = document.getElementById('dynamic-button-group');

    if (!userFilters || !logFilters || !buttonGroup) return;

    buttonGroup.innerHTML = '';

    if (activeTabId === 'users-tab') {
        userFilters.classList.remove('d-none');
        logFilters.classList.add('d-none');
        
        if (canManage) {
            const addButton = document.createElement('button');
            addButton.className = 'btn btn-success';
            addButton.textContent = 'Add New User';
            addButton.onclick = () => openModal('addUserModal');
            buttonGroup.appendChild(addButton);
        }
    } else if (activeTabId === 'logs-tab') {
        userFilters.classList.add('d-none');
        logFilters.classList.remove('d-none');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredUsers = allUsers.filter(user =>
                user.username.toLowerCase().includes(searchTerm) ||
                user.role.toLowerCase().includes(searchTerm) ||
                (user.line && user.line.toLowerCase().includes(searchTerm))
            );
            renderUserTable(filteredUsers);
        });
    }

    const logFilterIds = ['logUserFilter', 'logActionFilter', 'logTargetFilter', 'logStartDate', 'logEndDate'];
    logFilterIds.forEach(id => {
        const inputElement = document.getElementById(id);
        if (inputElement) {
            inputElement.addEventListener('input', () => {
                clearTimeout(window.logFilterTimer);
                window.logFilterTimer = setTimeout(() => fetchLogs(1), 500);
            });
        }
    });

    const mainTabs = document.querySelectorAll('#userManagementTab button[data-bs-toggle="tab"]');
    if (mainTabs) {
        mainTabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const activeTabId = event.target.id;
                updateControls(activeTabId);

                if (activeTabId === 'logs-tab' && !logTabInitialized) {
                    fetchLogs(1);
                    logTabInitialized = true;
                }
            });
        });
    }
    
    const logPagination = document.getElementById('log-pagination');
    if (logPagination) {
        logPagination.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (!isNaN(page)) {
                    fetchLogs(page);
                }
            }
        });
    }
    
    const activeTab = document.querySelector('#userManagementTab .nav-link.active');
    if (activeTab) {
        updateControls(activeTab.id);
    }
});