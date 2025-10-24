"use strict";

// =================================================================
// SECTION 0: COPIED HELPER FUNCTIONS (sendRequest)
// =================================================================
async function sendRequest(endpoint, action, method, body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) {
            const filteredParams = Object.entries(params)
                                    .filter(([key, value]) => value !== null && value !== '')
                                    .reduce((obj, [key, value]) => {
                                        obj[key] = value;
                                        return obj;
                                    }, {});
            if (Object.keys(filteredParams).length > 0) {
                 url += `&${new URLSearchParams(filteredParams).toString()}`;
            }
        }
        const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfTokenMeta ? csrfTokenMeta.getAttribute('content') : null;
        const options = {
            method: method.toUpperCase(),
            headers: {}
        };
        if (options.method !== 'GET' && csrfToken) {
            options.headers['X-CSRF-TOKEN'] = csrfToken;
        }
        if (body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMessage = result.message || response.statusText || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }
        if (typeof result.success === 'undefined') {
            console.warn(`API action '${action}' response missing 'success' property. Assuming failure.`);
            result.success = false;
        }
        return result;
    } catch (error) {
        console.error(`Request for action '${action}' to endpoint '${endpoint}' failed:`, error);
        if (typeof showToast === 'function') {
             showToast(`Error: ${error.message}` || 'An unexpected network or server error occurred.', 'var(--bs-danger)');
        } else {
             alert(`Error: ${error.message}` || 'An unexpected network or server error occurred.');
        }
        return { success: false, message: error.message || "Network or server error." };
    }
}
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // SECTION 1: GLOBAL VARIABLES & CONSTANTS
    // =================================================================
    let currentConfirmPage = 1;
    let currentHistoryPage = 1;
    const ROWS_PER_PAGE = 50;

    const confirmTableBody = document.getElementById('pendingShipmentsTableBody');
    const confirmPaginationControls = document.getElementById('shipmentPagination');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const confirmSelectedBtn = document.getElementById('confirmSelectedBtn');
    const confirmSearchInput = document.getElementById('shipmentSearch');
    const confirmStartDateInput = document.getElementById('shipmentStartDate');
    const confirmEndDateInput = document.getElementById('shipmentEndDate');

    const historyTableBody = document.getElementById('shipmentHistoryTableBody');
    const historyPaginationControls = document.getElementById('historyPagination');
    const historySearchInput = document.getElementById('historySearch');
    const historyStartDateInput = document.getElementById('historyStartDate');
    const historyEndDateInput = document.getElementById('historyEndDate');
    const historySummaryBar = document.getElementById('historySummaryBar');
    const totalShippedQtySpan = document.getElementById('totalShippedQty');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');

    let searchDebounceTimer;

    // =================================================================
    // SECTION 2: CORE FUNCTIONS
    // =================================================================

    // --- Confirmation Functions ---
    async function fetchPendingShipments(page = 1) {
        currentConfirmPage = page;
        showSpinner();
        confirmTableBody.innerHTML = `<tr><td colspan="7" class="text-center">Loading...</td></tr>`;

        const params = {
            page: currentConfirmPage,
            limit: ROWS_PER_PAGE,
            search_term: confirmSearchInput.value,
            startDate: confirmStartDateInput.value,
            endDate: confirmEndDateInput.value
        };

        try {
            const result = await sendRequest(SHIPMENT_API, 'get_pending_shipments', 'GET', null, params);
            if (result.success && result.data) {
                renderPendingShipmentsTable(result.data);
                if (typeof renderPagination === 'function') {
                    renderPagination('shipmentPagination', result.total, result.page, ROWS_PER_PAGE, fetchPendingShipments);
                } else { console.error('renderPagination function not defined.'); confirmPaginationControls.innerHTML = ''; }
                updateConfirmSelectedButtonState();
            } else {
                confirmTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${result.message || 'Failed to load data.'}</td></tr>`;
                confirmPaginationControls.innerHTML = '';
            }
        } catch (error) {
            console.error("Error fetching pending shipments:", error);
            confirmTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">An error occurred. Please try again.</td></tr>`;
            confirmPaginationControls.innerHTML = '';
        } finally {
            hideSpinner();
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
        }
    }

    function renderPendingShipmentsTable(data) {
        confirmTableBody.innerHTML = '';
        if (data.length === 0) {
            confirmTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No pending shipments found.</td></tr>`;
            return;
        }
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.transactionId = item.transaction_id;
            const requestDateObj = new Date(item.transaction_timestamp);
            const day = String(requestDateObj.getDate()).padStart(2, '0');
            const month = String(requestDateObj.getMonth() + 1).padStart(2, '0');
            const year = String(requestDateObj.getFullYear()).slice(-2);
            const requestDateFormatted = `${day}/${month}/${year}`;
            //<td>${item.part_description || ''}</td>

            tr.innerHTML = `
                <td class="text-start"><input class="form-check-input row-checkbox" type="checkbox" value="${item.transaction_id}"></td>
                <td class="text-start">${requestDateFormatted}</td>
                <td class="text-center">${item.sap_no || ''} / ${item.part_no || ''}</td>
                <td class="text-center">${parseFloat(item.quantity).toLocaleString()}</td>
                <td>${item.notes || ''}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-success confirm-single-btn" data-id="${item.transaction_id}" title="Confirm this shipment">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                </td>
            `;
            confirmTableBody.appendChild(tr);
        });
    }

    async function handleConfirmShipment(transactionId) {
        if (!transactionId) return; // Added check
        if (!confirm(`Are you sure you want to confirm shipment for Transaction ID: ${transactionId}?`)) return;
        showSpinner();
        try {
            const result = await sendRequest(SHIPMENT_API, 'confirm_shipment', 'POST', { transaction_ids: [transactionId] });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) await fetchPendingShipments(currentConfirmPage);
        } finally { hideSpinner(); }
    }

    async function handleConfirmSelected() {
        const selectedCheckboxes = confirmTableBody.querySelectorAll('.row-checkbox:checked');
        const transactionIdsToConfirm = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (transactionIdsToConfirm.length === 0) {
            showToast('Please select at least one shipment to confirm.', 'var(--bs-warning)'); return;
        }
        if (!confirm(`Are you sure you want to confirm ${transactionIdsToConfirm.length} selected shipment(s)?`)) return;
        showSpinner();
        try {
            const result = await sendRequest(SHIPMENT_API, 'confirm_shipment', 'POST', { transaction_ids: transactionIdsToConfirm });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success || result.message.includes("No shipments were confirmed")) {
                await fetchPendingShipments(1);
                // Also refresh history if it's potentially loaded
                if (!historyTableBody.innerHTML.includes('Loading')) {
                     await fetchShipmentHistory(1);
                }
            }
        } finally { hideSpinner(); }
    }

    // --- History Functions ---
    async function fetchShipmentHistory(page = 1) {
        currentHistoryPage = page;
        showSpinner();
        historyTableBody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
        if (totalShippedQtySpan) totalShippedQtySpan.textContent = '...';

        const params = {
            page: currentHistoryPage,
            limit: ROWS_PER_PAGE,
            search_term: historySearchInput.value,
            startDate: historyStartDateInput.value,
            endDate: historyEndDateInput.value
        };

        try {
            const result = await sendRequest(SHIPMENT_API, 'get_shipment_history', 'GET', null, params);

            if (result.success && result.data) {
                renderShipmentHistoryTable(result.data);
                if (typeof renderPagination === 'function') {
                    renderPagination('historyPagination', result.total, result.page, ROWS_PER_PAGE, fetchShipmentHistory);
                } else { console.error('renderPagination function not defined.'); historyPaginationControls.innerHTML = ''; }
                if (totalShippedQtySpan && result.summary) {
                    totalShippedQtySpan.textContent = parseFloat(result.summary.total_quantity || 0).toLocaleString();
                }
            } else {
                historyTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${result.message || 'Failed to load history.'}</td></tr>`;
                historyPaginationControls.innerHTML = '';
                 if (totalShippedQtySpan) totalShippedQtySpan.textContent = '0';
            }
        } catch (error) {
             console.error("Error fetching shipment history:", error);
            historyTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">An error occurred. Please try again.</td></tr>`;
            historyPaginationControls.innerHTML = '';
             if (totalShippedQtySpan) totalShippedQtySpan.textContent = 'Error';
        } finally {
            hideSpinner();
        }
    }

    function renderShipmentHistoryTable(data) {
        historyTableBody.innerHTML = '';
        if (data.length === 0) {
            historyTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No shipment history found for the selected criteria.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            const shippedDateObj = new Date(item.confirmed_at || item.transaction_timestamp);
            const day = String(shippedDateObj.getDate()).padStart(2, '0');
            const month = String(shippedDateObj.getMonth() + 1).padStart(2, '0');
            const year = String(shippedDateObj.getFullYear()).slice(-2);
            const shippedDateFormatted = `${day}/${month}/${year}`;

            //<td>${item.part_description || ''}</td>
            //<td class="text-center">${item.requested_by || 'N/A'}</td>

            tr.innerHTML = `
                <td class="text-start">${shippedDateFormatted}</td>
                <td class="text-center">${item.sap_no || ''} / ${item.part_no || ''}</td>
                <td class="text-center">${item.from_location || 'N/A'}</td>
                <td class="text-center">${item.to_location || 'N/A'}</td>
                <td class="text-center">${parseFloat(item.quantity).toLocaleString()}</td>
                <td>${item.notes || ''}</td>
            `;
            historyTableBody.appendChild(tr);
        });
    }

    async function exportHistoryToExcel() {
        showSpinner();
        showToast('Preparing export...', 'var(--bs-info)');
        const params = {
            limit: -1,
            search_term: historySearchInput.value,
            startDate: historyStartDateInput.value,
            endDate: historyEndDateInput.value
        };
        try {
            const result = await sendRequest(SHIPMENT_API, 'get_shipment_history', 'GET', null, params);
            if (result.success && result.data.length > 0) {
                 const worksheetData = result.data.map(item => {
                     const shippedDateObj = new Date(item.confirmed_at || item.transaction_timestamp);
                     const day = String(shippedDateObj.getDate()).padStart(2, '0');
                     const month = String(shippedDateObj.getMonth() + 1).padStart(2, '0');
                     const year = shippedDateObj.getFullYear();
                     const shippedDateFormatted = `${day}/${month}/${year}`;
                     return {
                         'Shipped Date': shippedDateFormatted,
                         'SAP No': item.sap_no,
                         'Part No': item.part_no,
                         'Description': item.part_description,
                         'Quantity': parseFloat(item.quantity),
                         'From Warehouse': item.from_location,
                         'To Shipping': item.to_location,
                         'Requested By': item.requested_by,
                         'Notes': item.notes
                     };
                 });
                const worksheet = XLSX.utils.json_to_sheet(worksheetData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Shipment History");
                const startDate = historyStartDateInput.value || 'all';
                const endDate = historyEndDateInput.value || 'all';
                XLSX.writeFile(workbook, `ShipmentHistory_${startDate}_to_${endDate}.xlsx`);
                showToast('Export successful!', 'var(--bs-success)');
            } else {
                showToast(result.message || 'No history data to export.', 'var(--bs-warning)');
            }
        } finally {
            hideSpinner();
        }
    }


    // SECTION 3: HELPER FUNCTIONS
    function updateConfirmSelectedButtonState() {
        // Corrected: use confirmTableBody to find checkboxes
        const selectedCount = confirmTableBody.querySelectorAll('.row-checkbox:checked').length;
        if (confirmSelectedBtn) confirmSelectedBtn.disabled = selectedCount === 0;
    }

    function setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        if (!confirmStartDateInput.value) confirmStartDateInput.value = today;
        if (!confirmEndDateInput.value) confirmEndDateInput.value = today;
        if (!historyStartDateInput.value) historyStartDateInput.value = today;
        if (!historyEndDateInput.value) historyEndDateInput.value = today;
    }

    function showCorrectPagination(activeTabId) {
        document.querySelectorAll('.pagination-footer[data-tab-target]').forEach(p => {
            p.style.display = p.dataset.tabTarget === activeTabId ? 'block' : 'none';
        });
    }

    // =================================================================
    // SECTION 4: EVENT LISTENERS - *** ฉบับเต็ม ไม่ย่อ ***
    // =================================================================

    // --- Filter Events (Confirmation Tab) ---
    confirmSearchInput?.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            fetchPendingShipments(1); // กรองเมื่อหยุดพิมพ์
        }, 500); // Delay 500ms
    });
    confirmStartDateInput?.addEventListener('change', () => {
        fetchPendingShipments(1); // กรองทันทีเมื่อเปลี่ยนวันที่
    });
    confirmEndDateInput?.addEventListener('change', () => {
        fetchPendingShipments(1); // กรองทันทีเมื่อเปลี่ยนวันที่
    });

    // --- Filter Events (History Tab) ---
    historySearchInput?.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            fetchShipmentHistory(1); // กรองเมื่อหยุดพิมพ์
        }, 500);
    });
    historyStartDateInput?.addEventListener('change', () => {
        fetchShipmentHistory(1); // กรองทันทีเมื่อเปลี่ยนวันที่
    });
    historyEndDateInput?.addEventListener('change', () => {
        fetchShipmentHistory(1); // กรองทันทีเมื่อเปลี่ยนวันที่
    });
    exportHistoryBtn?.addEventListener('click', exportHistoryToExcel);

    // --- Checkbox Events ---
    selectAllCheckbox?.addEventListener('change', (e) => {
        // Corrected: use confirmTableBody
        confirmTableBody.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
        updateConfirmSelectedButtonState();
    });

    // Use confirmTableBody for checkbox changes within the confirmation table
    if (confirmTableBody) {
        confirmTableBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox')) {
                const allCheckboxes = confirmTableBody.querySelectorAll('.row-checkbox');
                const checkedCount = confirmTableBody.querySelectorAll('.row-checkbox:checked').length;
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
                }
                updateConfirmSelectedButtonState();
            }
        });
    } else {
        console.error("Element with ID 'pendingShipmentsTableBody' not found for change listener.");
    }

    // --- Button Click Events ---
    confirmSelectedBtn?.addEventListener('click', handleConfirmSelected);

    // Use confirmTableBody for single confirm button clicks
    if (confirmTableBody) {
        confirmTableBody.addEventListener('click', (e) => {
            const confirmButton = e.target.closest('.confirm-single-btn');
            if (confirmButton) {
                const transactionId = confirmButton.dataset.id;
                handleConfirmShipment(transactionId);
            }
        });
    } else {
         console.error("Element with ID 'pendingShipmentsTableBody' not found for click listener.");
    }


    // --- Tab Change Event Listener ---
    const managementTabs = document.querySelectorAll('#managementTab button[data-bs-toggle="tab"]');
    managementTabs.forEach(tab => {
        // Make sure the second argument (the function) is present
        tab.addEventListener('shown.bs.tab', (event) => {
            const activeTabId = event.target.getAttribute('data-bs-target');
            showCorrectPagination(activeTabId);

            // Load data for the newly shown tab if it hasn't been loaded yet (simple check)
            if (activeTabId === '#shipment-history-pane') {
                // Check if the history table body still shows the initial loading message
                const isLoading = historyTableBody.innerHTML.includes('Loading') || historyTableBody.children.length === 0;
                if (isLoading) {
                    fetchShipmentHistory(1);
                }
            } else if (activeTabId === '#shipment-confirm-pane') {
                 // Optional: Reload confirmation tab data if needed
                 // fetchPendingShipments(currentConfirmPage);
            }
        });
    });

    // =================================================================
    // SECTION 5: INITIALIZATION
    // =================================================================
    setDefaultDates();
    fetchPendingShipments(1); // โหลดข้อมูล Tab แรก (Confirmation)

}); // End DOMContentLoaded