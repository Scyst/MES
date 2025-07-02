let modalTriggerElement = null;

/**
 * 
 * @param {string} modalId - 
 */
function showBootstrapModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }
}

/**
 * 
 * @param {HTMLElement} triggerEl 
 */
function openAddPartModal(triggerEl) {
    modalTriggerElement = triggerEl;
    const modal = document.getElementById('addPartModal');
    if (!modal) return;

    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + tzOffset);
    
    const dateStr = localNow.toISOString().split('T')[0];
    const timeStr = localNow.toISOString().split('T')[1].substring(0, 8);
    
    modal.querySelector('input[name="log_date"]').value = dateStr;
    modal.querySelector('input[name="log_time"]').value = timeStr;

    showBootstrapModal('addPartModal');
}

/**
 * 
 * @param {object} rowData 
 * @param {HTMLElement} triggerEl 
 */
function openEditModal(rowData, triggerEl) {
    modalTriggerElement = triggerEl; 
    const modal = document.getElementById('editPartModal');
    if (!modal) return;
    
    for (const key in rowData) {
        const input = modal.querySelector(`#edit_${key}`);
        if (input) {
            if (key === 'log_time' && typeof rowData[key] === 'string') {
                input.value = rowData[key].substring(0, 8);
            } else {
                input.value = rowData[key];
            }
        }
    }

    showBootstrapModal('editPartModal');
}

/**
 * 
 * @param {HTMLElement} triggerEl
 */
function openSummaryModal(triggerEl) {
    modalTriggerElement = triggerEl; 
    
    const grandTotalContainer = document.getElementById('summaryGrandTotalContainer');
    const tableContainer = document.getElementById('summaryTableContainer');
    const summaryData = window.cachedSummary || [];
    const grandTotalData = window.cachedGrand || {};

    if (!tableContainer || !grandTotalContainer) return;

    let grandTotalHTML = '<strong>Grand Total: </strong>';
    if (grandTotalData) {
        grandTotalHTML += Object.entries(grandTotalData)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => `${key.toUpperCase()}: ${value || 0}`)
            .join(' | ');
    }
    grandTotalContainer.innerHTML = grandTotalHTML;

    tableContainer.innerHTML = '';
    if (summaryData.length === 0) {
        tableContainer.innerHTML = '<p class="text-center mt-3">No summary data to display.</p>';
        showBootstrapModal('summaryModal');
        return;
    }

    const table = document.createElement('table');
    table.className = 'table table-dark table-striped table-hover';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ["Model", "Part No.", "Lot No.", "FG", "NG", "HOLD", "REWORK", "SCRAP", "ETC."];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    summaryData.forEach(row => {
        const tr = tbody.insertRow();
        const createCell = (text, className = '') => {
            const td = tr.insertCell();
            td.textContent = text;
            if (className) td.className = className;
        };
        createCell(row.model);
        createCell(row.part_no);
        createCell(row.lot_no || '');
        createCell(row.FG || 0, 'text-center');
        createCell(row.NG || 0, 'text-center');
        createCell(row.HOLD || 0, 'text-center');
        createCell(row.REWORK || 0, 'text-center');
        createCell(row.SCRAP || 0, 'text-center');
        createCell(row.ETC || 0, 'text-center');
    });

    tableContainer.appendChild(table);
    showBootstrapModal('summaryModal');
}

document.addEventListener('DOMContentLoaded', () => {

    const handleFormSubmit = async (form, action, modalId, onSuccess) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(form).entries());
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

            try {
                const response = await fetch(`${API_URL}?action=${action}`, {
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
                    const modalElement = document.getElementById(modalId);
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        modalElement.addEventListener('hidden.bs.modal', () => {
                            onSuccess(); 
                            if (modalTriggerElement) {
                                modalTriggerElement.focus(); 
                            }
                        }, { once: true });
                        modalInstance.hide();
                    }
                }
            } catch (error) {
                showToast(`An error occurred while ${action.replace('_', ' ')} data.`, '#dc3545');
            }
        });
    };

    const addForm = document.getElementById('addPartForm');
    if (addForm) {
        handleFormSubmit(addForm, 'add_part', 'addPartModal', () => {
            addForm.reset();
            fetchPartsData(1); 
        });
    }

    const editForm = document.getElementById('editPartForm');
    if (editForm) {
        handleFormSubmit(editForm, 'update_part', 'editPartModal', () => {
            fetchPartsData(currentPage); 
        });
    }
});