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

function closeModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }
}

async function openLogsModal() {
    openModal('logsModal');
    loadLogs();
}

function openEditUserModal(user) {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;

    document.getElementById('edit_id').value = user.id;
    document.getElementById('edit_username').value = user.username;
    document.getElementById('edit_role').value = user.role;
    document.getElementById('editLine').value = user.line || '';
    document.getElementById('editEmpId').value = user.emp_id || '';

    const isSelf = (user.id === currentUserId);
    document.getElementById('edit_username').disabled = (currentUserRole === 'admin' && isSelf);
    document.getElementById('edit_role').disabled = (currentUserRole === 'admin' && isSelf) || (currentUserRole === 'creator' && user.role === 'admin');
    
    document.getElementById('editUserLineWrapper').classList.toggle('d-none', user.role !== 'supervisor');
    
    openModal('editUserModal');
}

document.addEventListener('DOMContentLoaded', () => {
    if (!canManage) return;
    function handleRoleChange(roleSelectId, lineWrapperId) {
        const roleSelect = document.getElementById(roleSelectId);
        const lineWrapper = document.getElementById(lineWrapperId);
        if (roleSelect && lineWrapper) {
            roleSelect.addEventListener('change', (e) => {
                lineWrapper.classList.toggle('d-none', e.target.value !== 'supervisor');
            });
        }
    }
    handleRoleChange('addRole', 'addUserLineWrapper');
    handleRoleChange('edit_role', 'editUserLineWrapper');

    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(e.target).entries());

            if (!payload.username || !payload.password || !payload.role) {
                showToast("Please fill all required fields.", "#ffc107");
                return;
            }

            showSpinner();
            try {
                const result = await sendRequest('create', 'POST', payload);
                showToast(result.message, result.success ? '#28a745' : '#dc3545');
                
                if (result.success) {
                    const addUserModalElement = document.getElementById('addUserModal');
                    const modal = bootstrap.Modal.getInstance(addUserModalElement);
                    addUserModalElement.addEventListener('hidden.bs.modal', () => {
                        e.target.reset();
                        loadUsers();
                    }, { once: true }); 
                    modal.hide();
                }
            } finally {
                hideSpinner();
            }
        });
    }

    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(e.target).entries());

            showSpinner();
            try {
                const result = await sendRequest('update', 'POST', payload);
                showToast(result.message, result.success ? '#28a745' : '#dc3545');
                
                if (result.success) {
                    const editUserModalElement = document.getElementById('editUserModal');
                    const modal = bootstrap.Modal.getInstance(editUserModalElement);
                    editUserModalElement.addEventListener('hidden.bs.modal', () => {
                        loadUsers();
                    }, { once: true });
                    modal.hide();
                }
            } finally {
                hideSpinner();
            }
        });
    }
});