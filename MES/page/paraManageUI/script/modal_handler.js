"use strict";

function openModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
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

document.addEventListener('DOMContentLoaded', () => {
    if (!canManage) return;

    // --- Standard Parameter Form Handlers ---
    document.getElementById('addParamForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        const result = await sendRequest('create', 'POST', payload);
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
        const result = await sendRequest('update', 'POST', payload);
        if (result.success) {
            showToast('Parameter updated successfully!', '#28a745');
            closeModal('editParamModal');
            loadStandardParams();
        } else {
            showToast(result.message || 'Failed to update parameter.', '#dc3545');
        }
    });

    // --- Line Schedule Form Handlers ---
    document.getElementById('addScheduleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        payload.id = 0;
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