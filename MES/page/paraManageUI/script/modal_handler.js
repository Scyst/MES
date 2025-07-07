//-- เปิดใช้งาน Strict Mode --
"use strict";

const MODAL_PARA_API_ENDPOINT = '../../api/paraManage/paraManage.php';

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

    //-- จัดการการ Submit ฟอร์มสำหรับ "Parameter" --
    document.getElementById('addParamForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        
        // ** FIXED: แก้ไขการเรียก sendRequest **
        const result = await sendRequest(MODAL_PARA_API_ENDPOINT, 'create', 'POST', payload);
        
        if (result.success) {
            showToast('Parameter added successfully!', '#28a745');
            closeModal('addParamModal');
            e.target.reset();
            loadStandardParams();
        } else {
            showToast(result.message || 'Failed to add parameter.', '#dc3545');
        }
    });

    document.getElementById('editParamForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        
        // ** FIXED: แก้ไขการเรียก sendRequest **
        const result = await sendRequest(MODAL_PARA_API_ENDPOINT, 'update', 'POST', payload);

        if (result.success) {
            showToast('Parameter updated successfully!', '#28a745');
            closeModal('editParamModal');
            loadStandardParams();
        } else {
            showToast(result.message || 'Failed to update parameter.', '#dc3545');
        }
    });

    //-- จัดการการ Submit ฟอร์มสำหรับ "Line Schedule" --
    document.getElementById('addScheduleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        payload.id = 0;
        payload.is_active = payload.is_active ? 1 : 0;
        
        // ** FIXED: แก้ไขการเรียก sendRequest **
        const result = await sendRequest(MODAL_PARA_API_ENDPOINT, 'save_schedule', 'POST', payload);

        if (result.success) {
            showToast('Schedule added successfully!', '#28a745');
            closeModal('addScheduleModal');
            e.target.reset();
            loadSchedules();
        } else {
            showToast(result.message || 'Failed to add schedule.', '#dc3545');
        }
    });

    document.getElementById('editScheduleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        payload.is_active = payload.is_active ? 1 : 0;

        // ** FIXED: แก้ไขการเรียก sendRequest **
        const result = await sendRequest(MODAL_PARA_API_ENDPOINT, 'save_schedule', 'POST', payload);

        if (result.success) {
            showToast('Schedule updated successfully!', '#28a745');
            closeModal('editScheduleModal');
            loadSchedules();
        } else {
            showToast(result.message || 'Failed to update schedule.', '#dc3545');
        }
    });
});