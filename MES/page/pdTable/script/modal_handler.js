let modalTriggerElement = null;
const PD_API_URL = '../../api/pdTable/pdTableManage.php';
const WIP_API_URL = '../../api/wipManage/wipManage.php';

/**
 * Helper function to open a Bootstrap modal.
 * @param {string} modalId - The ID of the modal to show.
 */
function showBootstrapModal(modalId) { 
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }
}

/**
 * Opens the main data entry modal and sets current date/time.
 * @param {HTMLElement} triggerEl - The button element that triggered the modal.
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
 * Opens the edit modal and populates it with data.
 * @param {object} rowData - The data object for the row to be edited.
 * @param {HTMLElement} triggerEl - The button element that triggered the modal.
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
 * Opens the summary modal and renders the summary table.
 * @param {HTMLElement} triggerEl - The button element that triggered the modal.
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
        tr.insertCell().textContent = row.model;
        tr.insertCell().textContent = row.part_no;
        tr.insertCell().textContent = row.lot_no || '';
        tr.insertCell().textContent = row.FG || 0;
        tr.insertCell().textContent = row.NG || 0;
        tr.insertCell().textContent = row.HOLD || 0;
        tr.insertCell().textContent = row.REWORK || 0;
        tr.insertCell().textContent = row.SCRAP || 0;
        tr.insertCell().textContent = row.ETC || 0;
    });

    tableContainer.appendChild(table);
    showBootstrapModal('summaryModal');
}

document.addEventListener('DOMContentLoaded', () => {

    /**
     * Generic function to handle form submissions via Fetch API.
     * @param {HTMLFormElement} form - The form element.
     * @param {string} apiUrl - The API endpoint URL.
     * @param {string} action - The action parameter for the API.
     * @param {string} modalId - The ID of the modal containing the form.
     * @param {Function} onSuccess - Callback function to run on success.
     */
    const handleFormSubmit = async (form, apiUrl, action, modalId, onSuccess) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(form).entries());
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

            try {
                const response = await fetch(`${apiUrl}?action=${action}`, {
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
                            if (modalTriggerElement) modalTriggerElement.focus(); 
                        }, { once: true });
                        modalInstance.hide();
                    }
                }
            } catch (error) {
                showToast(`An error occurred while processing your request.`, '#dc3545');
            }
        });
    };

    const addPartForm = document.getElementById('addPartForm');
    if (addPartForm) {
        handleFormSubmit(addPartForm, PD_API_URL, 'add_part', 'addPartModal', () => {
            addPartForm.reset();
           if (typeof fetchPartsData === 'function') fetchPartsData(1); 
        });
    }

    const editPartForm = document.getElementById('editPartForm');
    if (editPartForm) {
        handleFormSubmit(editPartForm, PD_API_URL, 'update_part', 'editPartModal', () => {
            if (typeof fetchPartsData === 'function') fetchPartsData(window.currentPage || 1); 
        });
    }

    const wipEntryForm = document.getElementById('wipEntryForm');
    if (wipEntryForm) {
        handleFormSubmit(wipEntryForm, WIP_API_URL, 'log_wip_entry', 'addPartModal', () => {
            wipEntryForm.reset();
            if (document.getElementById('wip-report-pane')?.classList.contains('active')) {
                if (typeof fetchWipReport === 'function') fetchWipReport();
            }
        });
    }
});