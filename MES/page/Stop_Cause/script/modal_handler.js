let modalTriggerElement = null;

function showBootstrapModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }
}

function openAddStopModal(triggerEl) {
    modalTriggerElement = triggerEl;
    const modal = document.getElementById('addStopModal');
    if (!modal) return;

    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + tzOffset);
    
    const dateStr = localNow.toISOString().split('T')[0];
    const timeStr = localNow.toISOString().split('T')[1].substring(0, 8);
    
    modal.querySelector('input[name="log_date"]').value = dateStr;
    modal.querySelector('input[name="stop_begin"]').value = timeStr;
    
    const endTime = new Date(localNow.getTime() + (5 * 60 * 1000));
    modal.querySelector('input[name="stop_end"]').value = endTime.toISOString().split('T')[1].substring(0, 8);

    showBootstrapModal('addStopModal');
}

async function openEditModal(id, triggerEl) {
    modalTriggerElement = triggerEl;
    try {
        const response = await fetch(`${API_URL}?action=get_stop_by_id&id=${id}`);
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            const modal = document.getElementById('editStopModal');
            
            const causeSelect = modal.querySelector('#edit_cause');
            const otherCauseWrapper = modal.querySelector('#editOtherCauseWrapper');
            const otherCauseInput = modal.querySelector('#editCauseOther');
            const standardCauses = ["Man", "Machine", "Method", "Material", "Measurement", "Environment"];

            if (standardCauses.includes(data.cause)) {
                causeSelect.value = data.cause;
                otherCauseWrapper.classList.add('d-none');
                otherCauseInput.value = '';
                otherCauseInput.required = false;
            } else {
                causeSelect.value = 'Other';
                otherCauseWrapper.classList.remove('d-none');
                otherCauseInput.value = data.cause;
                otherCauseInput.required = true;
            }
            
            for (const key in data) {
                if (key !== 'cause') {
                    const input = modal.querySelector(`#edit_${key}`);
                    if (input) input.value = data[key];
                }
            }

            showBootstrapModal('editStopModal');
        } else {
            showToast(result.message, '#dc3545');
        }
    } catch (error) {
        showToast('Failed to fetch details for editing.', '#dc3545');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    const addForm = document.getElementById('addStopForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(addForm);
            const payload = Object.fromEntries(formData.entries());

            if (payload.cause === 'Other') {
                payload.cause = payload.cause_other || 'Other';
            }
            delete payload.cause_other;

            try {
                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                const response = await fetch(`${API_URL}?action=add_stop`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken 
                    },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                showToast(result.message, result.success ? '#28a745' : '#dc3545');

                if (result.success) {
                    const modalElement = document.getElementById('addStopModal');
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        modalElement.addEventListener('hidden.bs.modal', () => {
                            addForm.reset();
                            const otherWrapper = document.getElementById('otherCauseWrapper');
                            if(otherWrapper) otherWrapper.classList.add('d-none');
                            fetchStopData(1);
                            if (modalTriggerElement) {
                                modalTriggerElement.focus();
                            }
                        }, { once: true });
                        modalInstance.hide();
                    }
                }
            } catch(error) {
                showToast('An error occurred while adding data.', '#dc3545');
            }
        });
    }

    const editForm = document.getElementById('editStopForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(editForm);
            const payload = Object.fromEntries(formData.entries());

            if (payload.cause_category === 'Other') {
                payload.cause = payload.cause_other || 'Other';
            } else {
                payload.cause = payload.cause_category;
            }
            delete payload.cause_category;
            delete payload.cause_other;

            try {
                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                const response = await fetch(`${API_URL}?action=update_stop`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                showToast(result.message, result.success ? '#28a745' : '#dc3545');

                if (result.success) {
                    const modalElement = document.getElementById('editStopModal');
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        modalElement.addEventListener('hidden.bs.modal', () => {
                            fetchStopData(currentPage);
                            if (modalTriggerElement) {
                                modalTriggerElement.focus();
                            }
                        }, { once: true });
                        modalInstance.hide();
                    }
                }
            } catch(error) {
                showToast('An error occurred while updating data.', '#dc3545');
            }
        });
    }

    const causeSelect = document.getElementById('addCause');
    const otherCauseWrapper = document.getElementById('otherCauseWrapper');
    const otherCauseInput = document.getElementById('addCauseOther');

    if (causeSelect) {
        causeSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                otherCauseWrapper.classList.remove('d-none');
                otherCauseInput.required = true;
                otherCauseInput.name = 'cause_other';
            } else {
                otherCauseWrapper.classList.add('d-none');
                otherCauseInput.value = '';
                otherCauseInput.required = false;
                otherCauseInput.name = '';
            }
        });
    }

    const editCauseSelect = document.getElementById('edit_cause');
    const editOtherCauseWrapper = document.getElementById('editOtherCauseWrapper');
    const editCauseOtherInput = document.getElementById('editCauseOther');

    if (editCauseSelect) {
        editCauseSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                editOtherCauseWrapper.classList.remove('d-none');
                editCauseOtherInput.required = true;
                editCauseOtherInput.name = 'cause_other';
            } else {
                editOtherCauseWrapper.classList.add('d-none');
                editCauseOtherInput.value = '';
                editCauseOtherInput.required = false;
                editCauseOtherInput.name = '';
            }
        });
    }
});