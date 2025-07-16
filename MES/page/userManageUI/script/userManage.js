//-- Global Variables & Constants --
let allUsers = []; //-- Array สำหรับเก็บข้อมูลผู้ใช้ทั้งหมดที่ดึงมาจาก API --
const API_URL = '../../api/userManage/userManage.php';

/**
 * ฟังก์ชันกลางสำหรับส่ง Request ไปยัง API
 * @param {string} action - Action ที่จะส่งไปใน Query String
 * @param {string} method - HTTP Method (GET, POST)
 * @param {object|null} body - ข้อมูลที่จะส่งไปใน Request Body
 * @param {object} urlParams - Parameters เพิ่มเติมสำหรับ URL
 * @returns {Promise<object>} ผลลัพธ์ที่ได้จาก API
 */
async function sendRequest(action, method, body = null, urlParams = {}) {
    try {
        urlParams.action = action;
        const queryString = new URLSearchParams(urlParams).toString();
        const url = `${API_URL}?${queryString}`;

        //-- ดึง CSRF Token จาก Meta Tag --
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const options = {
            method,
            headers: {},
        };

        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        //-- เพิ่ม CSRF Token ใน Header หากไม่ใช่ GET Request --
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

/**
 * ฟังก์ชันสำหรับดึงข้อมูลผู้ใช้ทั้งหมดและสั่ง Render ตาราง
 */
async function loadUsers() {
    const result = await sendRequest('read', 'GET');
    if (result && result.success) {
        allUsers = result.data; //-- เก็บข้อมูลไว้ในตัวแปร Global --
        renderTable();
    } else {
        showToast(result?.message || 'Failed to load users.', '#dc3545');
    }
}

/**
 * ฟังก์ชันสำหรับ Render ตารางข้อมูลผู้ใช้
 */
function renderTable() {
    const tbody = document.getElementById('userTable');
    tbody.innerHTML = '';
    //-- กรณีไม่พบข้อมูล --
    if (!allUsers || allUsers.length === 0) {
        const colSpan = canManage ? 6 : 5;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center">No users found.</td></tr>`;
        return;
    }

    allUsers.forEach(user => {
        const tr = document.createElement('tr');
        tr.dataset.id = user.id;

        const createCell = (text) => {
            const td = document.createElement('td');
            td.textContent = text;
            return td;
        };

        tr.appendChild(createCell(user.id));
        tr.appendChild(createCell(user.username));
        tr.appendChild(createCell(user.role));
        tr.appendChild(createCell(user.line || '-'));
        tr.appendChild(createCell(user.created_at || 'N/A'));

        //-- แสดงคอลัมน์ Actions หากผู้ใช้มีสิทธิ์ (canManage มาจาก PHP) --
        if (canManage) {
            const actionsTd = document.createElement('td');
            actionsTd.className = 'text-center';

            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'd-flex gap-1 btn-group-equal';

            const isSelf = (user.id === currentUserId);

            //-- ตรรกะตรวจสอบสิทธิ์ในการแก้ไข (Edit) --
            // 1. Creator แก้ไขได้ทุกคน
            // 2. Admin แก้ไขคนที่ไม่ใช่ Admin/Creator ได้
            // 3. ทุกคนแก้ไขตัวเองได้
            const canEditTarget = (currentUserRole === 'creator') || 
                                  (currentUserRole === 'admin' && user.role !== 'admin' && user.role !== 'creator') ||
                                  isSelf;

            //-- ตรรกะตรวจสอบสิทธิ์ในการลบ (Delete) --
            // 1. ห้ามลบตัวเอง
            // 2. Creator ลบได้ทุกคนที่ไม่ใช่ Creator
            // 3. Admin ลบได้ทุกคนที่ไม่ใช่ Admin/Creator
            const canDeleteTarget = !isSelf && 
                                    ((currentUserRole === 'creator' && user.role !== 'creator') || 
                                     (currentUserRole === 'admin' && user.role !== 'admin' && user.role !== 'creator'));

            //-- สร้างปุ่มตามสิทธิ์ --
            if (canEditTarget) {
                const editButton = document.createElement('button');
                editButton.className = 'btn btn-sm btn-warning flex-fill';
                editButton.textContent = 'Edit';
                editButton.addEventListener('click', () => openEditUserModal(user));
                buttonWrapper.appendChild(editButton);
            }

            if (canDeleteTarget) {
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-danger flex-fill';
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => deleteUser(user.id));
                buttonWrapper.appendChild(deleteButton);
            }
            
            actionsTd.appendChild(buttonWrapper);
            tr.appendChild(actionsTd);
        }

        tbody.appendChild(tr);
    });
}

/**
 * ฟังก์ชันสำหรับจัดการการลบข้อมูลผู้ใช้
 */
async function deleteUser(id) {
    if (!confirm(`Are you sure you want to delete user ID ${id}?`)) return;
    const result = await sendRequest('delete', 'GET', null, { id });
    showToast(result.message, result.success ? '#28a745' : '#dc3545');
    if (result.success) loadUsers();
}

/**
 * ฟังก์ชันสำหรับดึงและแสดงผลข้อมูล Log
 */
async function loadLogs() {
    const tbody = document.getElementById('logTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
    
    //-- ฟังก์ชันย่อยสำหรับแสดง Error ในตาราง --
    const renderError = (message) => {
        tbody.innerHTML = '';
        const tr = tbody.insertRow();
        const td = tr.insertCell();
        td.colSpan = 6;
        td.className = 'text-center text-danger';
        td.textContent = message;
    };

    try {
        const result = await sendRequest('logs', 'GET');
        tbody.innerHTML = '';

        if (result.success) {
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No logs found.</td></tr>';
                return;
            }
            result.data.forEach(log => {
                const tr = tbody.insertRow();
                const createCell = (text) => {
                    const td = tr.insertCell();
                    td.textContent = text;
                };

                createCell(log.id);
                createCell(log.action_by);
                createCell(log.action_type);
                createCell(log.target_user || '-');
                createCell(log.detail || '-');
                createCell(log.created_at);
            });
        } else {
            renderError(result.message || 'An error occurred.');
        }
    } catch (error) {
        renderError('Failed to load logs.');
    }
}

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
document.addEventListener('DOMContentLoaded', () => {
    //-- โหลดข้อมูลตารางผู้ใช้ครั้งแรก --
    loadUsers();
});