//-- เปิดใช้งาน Strict Mode เพื่อป้องกันข้อผิดพลาดทั่วไป --
"use strict";

/**
 * ฟังก์ชันสำหรับเปิด Bootstrap Modal
 * @param {string} modalId - ID ของ Modal ที่จะเปิด
 */
function openModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
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

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
document.addEventListener('DOMContentLoaded', () => {
    //-- หากผู้ใช้ไม่มีสิทธิ์จัดการ ให้จบการทำงานทันที --
    if (!canManage) return;

    //-- จัดการการ Submit ฟอร์มสำหรับ "Parameter" --
    document.getElementById('addParamForm')?.addEventListener('submit', async (e) => {
        e.preventDefault(); //-- ป้องกันการโหลดหน้าใหม่ --
        //-- แปลงข้อมูลในฟอร์มเป็น Object --
        const payload = Object.fromEntries(new FormData(e.target).entries());
        //-- ส่งข้อมูลไปยัง API --
        const result = await sendRequest('create', 'POST', payload);
        //-- จัดการผลลัพธ์ --
        if (result.success) {
            showToast('Parameter added successfully!', '#28a745');
            closeModal('addParamModal');
            e.target.reset(); //-- ล้างข้อมูลในฟอร์ม --
            loadStandardParams(); //-- โหลดข้อมูลตารางใหม่ --
        } else {
            showToast(result.message || 'Failed to add parameter.', '#dc3545');
        }
    });

    document.getElementById('editParamForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        const result = await sendRequest('update', 'POST', payload);
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
        payload.id = 0; //-- กำหนด id เป็น 0 สำหรับการสร้างใหม่ --
        //-- แปลงค่า Checkbox (on/undefined) เป็น 1/0 --
        payload.is_active = payload.is_active ? 1 : 0;
        
        const result = await sendRequest('save_schedule', 'POST', payload);
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
        //-- แปลงค่า Checkbox (on/undefined) เป็น 1/0 --
        payload.is_active = payload.is_active ? 1 : 0;

        const result = await sendRequest('save_schedule', 'POST', payload);
        if (result.success) {
            showToast('Schedule updated successfully!', '#28a745');
            closeModal('editScheduleModal');
            loadSchedules();
        } else {
            showToast(result.message || 'Failed to update schedule.', '#dc3545');
        }
    });
});