/**
 * ฟังก์ชันสำหรับเปิด Bootstrap Modal (ตรวจสอบ Instance ก่อนสร้างใหม่)
 * @param {string} modalId - ID ของ Modal ที่จะเปิด
 */
function openModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        let modal = bootstrap.Modal.getInstance(modalElement); 
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }
        modal.show();
    }
}

/**
 * ฟังก์ชันสำหรับปิด Bootstrap Modal
 * @param {string} modalId - ID ของ Modal ที่จะปิด
 */
function closeModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }
}

/**
 * ฟังก์ชันสำหรับเปิด Modal แสดง Logs และเรียกโหลดข้อมูล
 */
async function openLogsModal() {
    openModal('logsModal');
    loadLogs();
}

/**
 * ฟังก์ชันสำหรับเปิด Modal "Edit User" และเติมข้อมูลพร้อมตั้งค่าสิทธิ์การแก้ไข
 * @param {object} user - Object ข้อมูลของผู้ใช้ที่ต้องการแก้ไข
 */
function openEditUserModal(user) {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;

    //-- เติมข้อมูลผู้ใช้ลงในฟอร์ม --
    document.getElementById('edit_id').value = user.id;
    document.getElementById('edit_username').value = user.username;
    document.getElementById('edit_role').value = user.role;

    //-- ตรวจสอบเงื่อนไขสิทธิ์ในการแก้ไข --
    const isSelf = (user.id === currentUserId);
    const usernameInput = document.getElementById('edit_username');
    const roleInput = document.getElementById('edit_role');

    //-- ปิดการใช้งานช่อง Username และ Role หาก Admin กำลังแก้ไขข้อมูลของตัวเอง --
    usernameInput.disabled = (currentUserRole === 'admin' && isSelf);
    //-- ปิดการใช้งานช่อง Role หาก Admin แก้ไขตัวเอง หรือ Creator กำลังแก้ไขผู้ใช้ที่เป็น Admin --
    roleInput.disabled = (currentUserRole === 'admin' && isSelf) || (currentUserRole === 'creator' && user.role === 'admin');
    
    openModal('editUserModal');
}

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
document.addEventListener('DOMContentLoaded', () => {
    //-- หากผู้ใช้ไม่มีสิทธิ์จัดการ ให้จบการทำงาน --
    if (!canManage) return;

    //-- จัดการการ Submit ฟอร์ม "Add User" --
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(e.target).entries());

            //-- ตรวจสอบข้อมูลเบื้องต้น --
            if (!payload.username || !payload.password || !payload.role) {
                showToast("Please fill all required fields.", "#ffc107");
                return;
            }

            //-- ส่งข้อมูลไปยัง API --
            const result = await sendRequest('create', 'POST', payload);
            showToast(result.message, result.success ? '#28a745' : '#dc3545');
            
            if (result.success) {
                const addUserModalElement = document.getElementById('addUserModal');
                const modal = bootstrap.Modal.getInstance(addUserModalElement);

                //-- รอให้ Modal ปิดสนิทก่อน แล้วจึงรีเซ็ตฟอร์มและโหลดข้อมูลใหม่ --
                addUserModalElement.addEventListener('hidden.bs.modal', () => {
                    e.target.reset();
                    loadUsers();
                }, { once: true }); 
                modal.hide();
            }
        });
    }

    //-- จัดการการ Submit ฟอร์ม "Edit User" --
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(e.target).entries());

            //-- ส่งข้อมูลไปยัง API --
            const result = await sendRequest('update', 'POST', payload);
            showToast(result.message, result.success ? '#28a745' : '#dc3545');
            
            if (result.success) {
                const editUserModalElement = document.getElementById('editUserModal');
                const modal = bootstrap.Modal.getInstance(editUserModalElement);

                //-- รอให้ Modal ปิดสนิทก่อน แล้วจึงโหลดข้อมูลใหม่ --
                editUserModalElement.addEventListener('hidden.bs.modal', () => {
                    loadUsers();
                }, { once: true });
                modal.hide();
            }
        });
    }
});