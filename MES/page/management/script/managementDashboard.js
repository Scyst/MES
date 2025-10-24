"use strict";
document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // SECTION 1: GLOBAL VARIABLES & CONSTANTS
    // =================================================================
    let currentPage = 1;
    let currentConfirmPage = 1;
    let currentHistoryPage = 1;
    const ROWS_PER_PAGE = 50;

    // --- DOM Elements ---
    const tableBody = document.getElementById('shipmentsTableBody'); // ⭐️ ใช้ ID ที่ถูกต้อง
    const paginationControls = document.getElementById('shipmentPagination');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const confirmSelectedBtn = document.getElementById('confirmSelectedBtn');
    const searchInput = document.getElementById('shipmentSearch');
    const startDateInput = document.getElementById('shipmentStartDate');
    const endDateInput = document.getElementById('shipmentEndDate');
    const summaryBar = document.getElementById('shipmentSummaryBar');
    const totalSelectedQtySpan = document.getElementById('totalSelectedQty');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    const statusFilterRadios = document.querySelectorAll('input[name="shipmentStatus"]');
    const rejectSelectedBtn = document.getElementById('rejectSelectedBtn');
    const rejectReasonModal = new bootstrap.Modal(document.getElementById('rejectReasonModal'));
    const confirmRejectBtn = document.getElementById('confirmRejectBtn');
    const rejectReasonText = document.getElementById('rejectReasonText');
    const rejectTransactionIdsInput = document.getElementById('rejectTransactionIds');

    // Debounce Timer
    let searchDebounceTimer;
    let noteEditDebounceTimer;

    // =================================================================
    // SECTION 2: CORE FUNCTIONS
    // =================================================================

    async function fetchShipments(page = 1) {
        currentPage = page;
        showSpinner();
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`; // ⭐️ ปรับ Colspan เป็น 8
        summaryBar.style.display = 'none';

        const selectedStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'pending';

        const params = {
            page: currentPage,
            limit: ROWS_PER_PAGE,
            status: selectedStatus,
            search_term: searchInput.value,
            startDate: startDateInput.value,
            endDate: endDateInput.value
        };

        try {
            const result = await sendRequest(SHIPMENT_API, 'get_shipments', 'GET', null, params);
            if (result.success && result.data) {
                renderShipmentsTable(result.data);
                if (typeof renderPagination === 'function') {
                    renderPagination('shipmentPagination', result.total, result.page, ROWS_PER_PAGE, fetchShipments);
                } else { console.error('renderPagination function not defined.'); paginationControls.innerHTML = ''; }
                updateConfirmSelectedButtonState();

                if (summaryBar && totalSelectedQtySpan && result.summary) {
                     totalSelectedQtySpan.textContent = parseFloat(result.summary.total_quantity || 0).toLocaleString();
                     summaryBar.style.display = 'block';
                }

            } else {
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${result.message || 'Failed to load data.'}</td></tr>`; // ⭐️ ปรับ Colspan เป็น 8
                paginationControls.innerHTML = '';
                 if (summaryBar) summaryBar.style.display = 'none';
            }
        } catch (error) {
            console.error("Error fetching shipments:", error);
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">An error occurred.</td></tr>`; // ⭐️ ปรับ Colspan เป็น 8
            paginationControls.innerHTML = '';
             if (summaryBar) summaryBar.style.display = 'none';
        } finally {
            hideSpinner();
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
        }
    }

    function renderShipmentsTable(data) {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No shipments found for the selected criteria.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.transactionId = item.transaction_id;
            const isPending = item.transaction_type === 'TRANSFER_PENDING_SHIPMENT';
            const isRejected = item.transaction_type === 'REJECTED_SHIPMENT';

            const requestDateObj = new Date(item.transaction_timestamp);
            const day = String(requestDateObj.getDate()).padStart(2, '0');
            const month = String(requestDateObj.getMonth() + 1).padStart(2, '0');
            const year = String(requestDateObj.getFullYear()).slice(-2);
            const hours = String(requestDateObj.getHours()).padStart(2, '0');
            const minutes = String(requestDateObj.getMinutes()).padStart(2, '0');
            const requestDateTimeFormatted = `${day}/${month}/${year} ${hours}:${minutes}`;

            let statusText = '';
            let statusBadgeClass = '';
            if (isPending) {statusText = 'Pending'; statusBadgeClass = 'bg-warning text-dark'; }
            else if (item.transaction_type === 'SHIPPED') {statusText = 'Shipped'; statusBadgeClass = 'bg-success'; }
            else if (isRejected) {statusText = 'Rejected'; statusBadgeClass = 'bg-danger'; }
            else {statusText = item.transaction_type; statusBadgeClass = 'bg-secondary'; }

            const transferPath = `${item.from_location || 'N/A'} → ${item.to_location || 'N/A'}`;

            tr.innerHTML = `
                <td class="text-center">
                    ${isPending ? `<input class="form-check-input row-checkbox" type="checkbox" value="${item.transaction_id}">` : ''}
                </td>
                <td><span class="badge ${statusBadgeClass}">${statusText}</span></td>
                <td>${requestDateTimeFormatted}</td> <td>${item.sap_no || ''} / ${item.part_no || ''}</td>
                <td class="text-end">${parseFloat(item.quantity).toLocaleString()}</td>
                <td>${transferPath}</td>
                <td>
                    <span class="editable-note ${isRejected ? 'text-muted text-decoration-line-through' : ''}" contenteditable="${!isRejected}" data-id="${item.transaction_id}" tabindex="0">${item.notes || ''}</span>
                </td>
                <td class="text-center">
                    ${isPending ? `
                        <button class="btn btn-sm btn-success confirm-single-btn" data-id="${item.transaction_id}" title="Confirm this shipment">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger reject-single-btn ms-1" data-id="${item.transaction_id}" title="Reject this shipment">
                            <i class="fas fa-ban"></i>
                        </button>
                        ` : ''}
                     ${isRejected ? `<span class="text-muted fst-italic">Rejected</span>` : ''}
                     ${item.transaction_type === 'SHIPPED' ? `<span class="text-muted fst-italic">Shipped</span>` : ''}
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    async function handleConfirmShipment(transactionId) {
        if (!transactionId || !confirm(`Confirm shipment ID: ${transactionId}?`)) return;
        showSpinner();
        try {
            const result = await sendRequest(SHIPMENT_API, 'confirm_shipment', 'POST', { transaction_ids: [transactionId] });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) await fetchShipments(currentPage);
        } finally { hideSpinner(); }
    }

    async function handleConfirmSelected() {
        const selectedCheckboxes = tableBody.querySelectorAll('.row-checkbox:checked');
        const transactionIdsToConfirm = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (transactionIdsToConfirm.length === 0) { showToast('Please select at least one shipment to confirm.', 'var(--bs-warning)'); return; }
        if (!confirm(`Confirm ${transactionIdsToConfirm.length} selected shipment(s)?`)) return;
        showSpinner();
        try {
            const result = await sendRequest(SHIPMENT_API, 'confirm_shipment', 'POST', { transaction_ids: transactionIdsToConfirm });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success || result.message.includes("No shipments were confirmed")) {
                await fetchShipments(1);
            }
        } finally { hideSpinner(); }
    }

    async function exportHistoryToExcel() {
        showSpinner();
        showToast('Preparing export...', 'var(--bs-info)');
        const selectedStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'pending';
        const params = {
            limit: -1,
            status: selectedStatus,
            search_term: searchInput.value,
            startDate: startDateInput.value,
            endDate: endDateInput.value
        };
        try {
            const result = await sendRequest(SHIPMENT_API, 'get_shipments', 'GET', null, params);
            if (result.success && result.data.length > 0) {
                 const worksheetData = result.data.map(item => {
                     const dateObj = new Date(item.transaction_timestamp);
                     const day = String(dateObj.getDate()).padStart(2, '0');
                     const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                     const year = dateObj.getFullYear();
                     const dateFormatted = `${day}/${month}/${year}`;
                     let statusText = item.transaction_type === 'TRANSFER_PENDING_SHIPMENT' ? 'Pending' : (item.transaction_type === 'SHIPPED' ? 'Shipped' : item.transaction_type);
                     // Add Rejected status text
                     if (item.transaction_type === 'REJECTED_SHIPMENT') statusText = 'Rejected';

                     return {
                         'Status': statusText,
                         'Date': dateFormatted,
                         'SAP No': item.sap_no,
                         'Part No': item.part_no,
                         'Quantity': parseFloat(item.quantity),
                         'From': item.from_location,
                         'To': item.to_location,
                         'Notes': item.notes
                     };
                 });
                const worksheet = XLSX.utils.json_to_sheet(worksheetData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Shipments");
                const startDate = startDateInput.value || 'all';
                const endDate = endDateInput.value || 'all';
                XLSX.writeFile(workbook, `Shipments_${selectedStatus}_${startDate}_to_${endDate}.xlsx`);
                showToast('Export successful!', 'var(--bs-success)');
            } else {
                showToast(result.message || 'No data to export for the selected criteria.', 'var(--bs-warning)');
            }
        } finally {
            hideSpinner();
        }
    }

    async function handleNoteEdit(transactionId, newNote) {
        // showSpinner(); // อาจจะไม่ต้องใช้ก็ได้
        try {
             const result = await sendRequest(SHIPMENT_API, 'update_shipment_note', 'POST', {
                 transaction_id: transactionId,
                 notes: newNote
             });
             if (!result.success) {
                  showToast(result.message, 'var(--bs-danger)');
                  // Optional: revert
             } else {
                 // Optional: Visual feedback
                 const noteSpan = tableBody.querySelector(`.editable-note[data-id="${transactionId}"]`);
                 if(noteSpan) {
                     noteSpan.style.boxShadow = '0 0 0 2px var(--bs-success)'; // Highlight border
                     setTimeout(() => { noteSpan.style.boxShadow = ''; }, 1500);
                 }
             }
        } finally {
            // hideSpinner();
        }
    }

    function openRejectModal(transactionIds) {
         if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
              showToast('No items selected for rejection.', 'var(--bs-warning)');
              return;
         }
         rejectTransactionIdsInput.value = JSON.stringify(transactionIds);
         rejectReasonText.value = '';
         rejectReasonModal.show();
    }

    async function executeReject() {
         const transactionIds = JSON.parse(rejectTransactionIdsInput.value || '[]');
         const reason = rejectReasonText.value;
         if (transactionIds.length === 0) return;

         rejectReasonModal.hide();
         showSpinner();
         try {
             const result = await sendRequest(SHIPMENT_API, 'reject_shipment', 'POST', {
                 transaction_ids: transactionIds,
                 reason: reason
             });
             showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
             if (result.success || result.message.includes("No shipments were rejected")) {
                 await fetchShipments(1);
             }
         } finally {
             hideSpinner();
         }
    }

    // SECTION 3: HELPER FUNCTIONS
    function updateConfirmSelectedButtonState() {
        const selectedCheckboxes = tableBody.querySelectorAll('.row-checkbox:checked'); // ⭐️ ใช้ tableBody
        const selectedCount = selectedCheckboxes.length;
        const selectedStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'pending';

        if (confirmSelectedBtn) {
            confirmSelectedBtn.disabled = !(selectedCount > 0 && (selectedStatus === 'pending' || selectedStatus === 'all'));
        }
        if (rejectSelectedBtn) {
             rejectSelectedBtn.disabled = !(selectedCount > 0 && (selectedStatus === 'pending' || selectedStatus === 'all'));
        }
    }

    function setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        if (!startDateInput.value) startDateInput.value = today;
        if (!endDateInput.value) endDateInput.value = today;
    }

    // =================================================================
    // SECTION 4: EVENT LISTENERS - *** ตรวจสอบ Argument ตัวที่สอง ***
    // =================================================================

    // --- Filter Events ---
    searchInput?.addEventListener('input', () => { // ✅ Argument 2: Function
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => fetchShipments(1), 500);
    });
    startDateInput?.addEventListener('change', () => fetchShipments(1)); // ✅ Argument 2: Function
    endDateInput?.addEventListener('change', () => fetchShipments(1));   // ✅ Argument 2: Function
    exportHistoryBtn?.addEventListener('click', exportHistoryToExcel);     // ✅ Argument 2: Function Name

    // --- Status Filter ---
    statusFilterRadios.forEach(radio => {
        radio.addEventListener('change', () => { // ✅ Argument 2: Function
            fetchShipments(1);
            const isViewOnly = radio.value === 'shipped' || radio.value === 'rejected';
            if (confirmSelectedBtn) confirmSelectedBtn.style.display = isViewOnly ? 'none' : 'inline-block';
            if (rejectSelectedBtn) rejectSelectedBtn.style.display = isViewOnly ? 'none' : 'inline-block';
            if (selectAllCheckbox) {
                selectAllCheckbox.style.visibility = isViewOnly ? 'hidden' : 'visible';
                if (isViewOnly) selectAllCheckbox.checked = false;
            }
            updateConfirmSelectedButtonState();
        });
    });

    // --- Checkbox Events ---
    selectAllCheckbox?.addEventListener('change', (e) => { // ✅ Argument 2: Function
        tableBody.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
        updateConfirmSelectedButtonState();
    });

    if (tableBody) {
        tableBody.addEventListener('change', (e) => { // ✅ Argument 2: Function
            if (e.target.classList.contains('row-checkbox')) {
                const allCheckboxes = tableBody.querySelectorAll('.row-checkbox');
                const checkedCount = tableBody.querySelectorAll('.row-checkbox:checked').length;
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
                }
                updateConfirmSelectedButtonState();
            }
        });
    } else { console.error("Element with ID 'shipmentsTableBody' not found."); }

    // --- Button Click Events ---
    confirmSelectedBtn?.addEventListener('click', handleConfirmSelected); // ✅ Argument 2: Function Name
    rejectSelectedBtn?.addEventListener('click', () => { // ✅ Argument 2: Function
          const selectedCheckboxes = tableBody.querySelectorAll('.row-checkbox:checked');
          const transactionIdsToReject = Array.from(selectedCheckboxes).map(cb => cb.value);
          openRejectModal(transactionIdsToReject);
     });
    confirmRejectBtn?.addEventListener('click', executeReject); // ✅ Argument 2: Function Name

    // --- Table Click/Input Events (Delegation) ---
    if (tableBody) {
        tableBody.addEventListener('click', (e) => { // ✅ Argument 2: Function
            const confirmButton = e.target.closest('.confirm-single-btn');
            if (confirmButton) { handleConfirmShipment(confirmButton.dataset.id); return; }
            const rejectButton = e.target.closest('.reject-single-btn');
            if (rejectButton) { openRejectModal([rejectButton.dataset.id]); return; }
        });

        tableBody.addEventListener('blur', (e) => { // ✅ Argument 2: Function
             if (e.target.classList.contains('editable-note') && !e.target.classList.contains('text-muted')) {
                 const span = e.target;
                 const transactionId = span.dataset.id;
                 const newNote = span.textContent.trim();
                 clearTimeout(noteEditDebounceTimer);
                 noteEditDebounceTimer = setTimeout(() => { handleNoteEdit(transactionId, newNote); }, 300);
             }
        }, true);

        tableBody.addEventListener('keydown', (e) => { // ✅ Argument 2: Function
             if (e.target.classList.contains('editable-note') && e.key === 'Enter' && !e.target.classList.contains('text-muted')) {
                 e.preventDefault();
                 e.target.blur();
             }
        });

    } else { console.error("Element with ID 'shipmentsTableBody' not found."); }

    // =================================================================
    // SECTION 5: INITIALIZATION
    // =================================================================
    setDefaultDates();
    fetchShipments(1);

    const initialStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'pending';
    const isInitialViewOnly = initialStatus === 'shipped' || initialStatus === 'rejected';
    if(confirmSelectedBtn) confirmSelectedBtn.style.display = isInitialViewOnly ? 'none' : 'inline-block';
    if(rejectSelectedBtn) rejectSelectedBtn.style.display = isInitialViewOnly ? 'none' : 'inline-block';

}); // End DOMContentLoaded