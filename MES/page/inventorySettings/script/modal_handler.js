//-- เปิดใช้งาน Strict Mode --
"use strict";

const MODAL_PARA_API_ENDPOINT = 'api/paraManage.php';

/**
 * ฟังก์ชันสำหรับเปิด Bootstrap Modal
 */
function openModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        modal.show();
    }
}

/**
 * ฟังก์ชันสำหรับปิด Bootstrap Modal
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

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
document.addEventListener('DOMContentLoaded', () => {
    if (!canManage) return;

    const addParamForm = document.getElementById('addParamForm');
    if (addParamForm) {
        addParamForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            // --- แก้ไข: ตรวจสอบว่าผู้ใช้ได้เลือก Item จาก Autocomplete แล้วหรือยัง ---
            const itemId = document.getElementById('param_item_id').value;
            if (!itemId) {
                showToast('Please search and select an item from the master list first.', '#ffc107');
                return;
            }
            // --- สิ้นสุดการแก้ไข ---

            const formData = new FormData(addParamForm);
            const data = Object.fromEntries(formData.entries());

            showSpinner();
            try {
                const result = await sendRequest(MODAL_PARA_API_ENDPOINT, 'create', 'POST', data);
                if (result.success) {
                    showToast(result.message, '#28a745');
                    closeModal('addParamModal');
                    if (typeof loadStandardParams === 'function') {
                        await loadStandardParams();
                    }
                } else {
                    showToast(result.message || 'Failed to add parameter.', '#dc3545');
                }
            } finally {
                hideSpinner();
            }
        });
    }

    document.getElementById('editParamForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        
        showSpinner(); // <-- เพิ่ม: แสดง Spinner
        try {
            const result = await sendRequest(MODAL_PARA_API_ENDPOINT, 'update', 'POST', payload);

            if (result.success) {
                showToast('Parameter updated successfully!', '#28a745');
                closeModal('editParamModal');
                loadStandardParams();
            } else {
                showToast(result.message || 'Failed to update parameter.', '#dc3545');
            }
        } finally {
            hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
        }
    });

    //-- จัดการการ Submit ฟอร์มสำหรับ "Line Schedule" --
    document.getElementById('addScheduleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.id = 0;
        payload.is_active = form.querySelector('[name="is_active"]').checked ? 1 : 0;
        
        showSpinner(); // <-- เพิ่ม: แสดง Spinner
        try {
            const result = await sendRequest(MODAL_PARA_API_ENDPOINT, 'save_schedule', 'POST', payload);

            if (result.success) {
                showToast('Schedule added successfully!', '#28a745');
                closeModal('addScheduleModal');
                form.reset();
                loadSchedules();
            } else {
                showToast(result.message || 'Failed to add schedule.', '#dc3545');
            }
        } finally {
            hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
        }
    });

    document.getElementById('editScheduleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.is_active = form.querySelector('[name="is_active"]').checked ? 1 : 0;

        showSpinner(); // <-- เพิ่ม: แสดง Spinner
        try {
            const result = await sendRequest(MODAL_PARA_API_ENDPOINT, 'save_schedule', 'POST', payload);

            if (result.success) {
                showToast('Schedule updated successfully!', '#28a745');
                closeModal('editScheduleModal');
                loadSchedules();
            } else {
                showToast(result.message || 'Failed to update schedule.', '#dc3545');
            }
        } finally {
            hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
        }
    });
});