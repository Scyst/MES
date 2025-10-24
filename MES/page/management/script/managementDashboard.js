"use strict";
document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // SECTION 1: GLOBAL VARIABLES & CONSTANTS
    // =================================================================
    let currentShipmentPage = 1; // ⭐️ เปลี่ยนชื่อตัวแปร page
    const ROWS_PER_PAGE = 50;

    // --- DOM Elements (Shipment Section) ---
    const shipmentTableBody = document.getElementById('shipmentsTableBody'); // ⭐️ เปลี่ยนชื่อ
    const shipmentPaginationControls = document.getElementById('shipmentPagination'); // ⭐️ เปลี่ยนชื่อ
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const confirmSelectedBtn = document.getElementById('confirmSelectedBtn');
    const shipmentSearchInput = document.getElementById('shipmentSearch'); // ⭐️ เปลี่ยนชื่อ
    const shipmentStartDateInput = document.getElementById('shipmentStartDate'); // ⭐️ เปลี่ยนชื่อ
    const shipmentEndDateInput = document.getElementById('shipmentEndDate');   // ⭐️ เปลี่ยนชื่อ
    const shipmentSummaryBar = document.getElementById('shipmentSummaryBar');   // ⭐️ เปลี่ยนชื่อ
    const totalSelectedQtySpan = document.getElementById('totalSelectedQty');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    const statusFilterRadios = document.querySelectorAll('input[name="shipmentStatus"]');
    const rejectSelectedBtn = document.getElementById('rejectSelectedBtn');
    const rejectReasonModal = new bootstrap.Modal(document.getElementById('rejectReasonModal'));
    const confirmRejectBtn = document.getElementById('confirmRejectBtn');
    const rejectReasonText = document.getElementById('rejectReasonText');
    const rejectTransactionIdsInput = document.getElementById('rejectTransactionIds');

    // --- DOM Elements (DLOT Section) ---
    const dlotEntryForm = document.getElementById('dlot-entry-form');
    const dlotEntryDateInput = document.getElementById('dlot-entry-date');
    const dlotEntryLineSelect = document.getElementById('dlot-entry-line');
    const dlotHeadcountInput = document.getElementById('dlot-headcount');
    const dlotDlCostInput = document.getElementById('dlot-dl-cost');
    const dlotOtCostInput = document.getElementById('dlot-ot-cost');
    const btnSaveDlot = document.getElementById('btn-save-dlot');

    const costSummaryStartDateInput = document.getElementById('cost-summary-start-date');
    const costSummaryEndDateInput = document.getElementById('cost-summary-end-date');
    const costSummaryLineSelect = document.getElementById('cost-summary-line');
    const btnRefreshCostSummary = document.getElementById('btn-refresh-cost-summary');

    const stdDlCostDisplay = document.getElementById('std-dl-cost-display');
    const actualDlotCostDisplay = document.getElementById('actual-dlot-cost-display');
    const dlVarianceDisplay = document.getElementById('dl-variance-display');
    const varianceCard = document.getElementById('variance-card');

    // --- ⭐️ DOM Elements (Tabs) ---
    const costDlotTab = document.getElementById('cost-dlot-tab');
    const shipmentTab = document.getElementById('shipment-tab');

    // --- API Constants ---
    // (กำหนดไว้ใน <script> block ใน .php)
    // const SHIPMENT_API = 'api/shipment.php';
    // const DLOT_API = 'api/dlot_manual_manage.php';
    // const FILTERS_API = '../OEE_Dashboard/api/get_dashboard_filters.php';

    // Debounce Timer
    let searchDebounceTimer;
    let noteEditDebounceTimer;

    // =================================================================
    // SECTION 2: DLOT & COST SUMMARY FUNCTIONS
    // =================================================================

    function setAllDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        if (shipmentStartDateInput && !shipmentStartDateInput.value) shipmentStartDateInput.value = today;
        if (shipmentEndDateInput && !shipmentEndDateInput.value) shipmentEndDateInput.value = today;
        if (costSummaryStartDateInput && !costSummaryStartDateInput.value) costSummaryStartDateInput.value = firstDayOfMonth;
        if (costSummaryEndDateInput && !costSummaryEndDateInput.value) costSummaryEndDateInput.value = today;
        if (dlotEntryDateInput && !dlotEntryDateInput.value) dlotEntryDateInput.value = today;
    }

    async function fetchDashboardLines() {
        try {
            const result = await sendRequest(FILTERS_API, 'get_filters', 'GET');
            if (result.success && result.lines) {
                const lines = result.lines;
                // Clear existing options first (optional, prevents duplicates if called multiple times)
                costSummaryLineSelect.querySelectorAll('option:not([value="ALL"])').forEach(opt => opt.remove());
                dlotEntryLineSelect.querySelectorAll('option:not([value="ALL"])').forEach(opt => opt.remove());

                lines.forEach(line => {
                    costSummaryLineSelect.appendChild(new Option(line, line));
                    dlotEntryLineSelect.appendChild(new Option(line, line));
                });
            }
        } catch (error) {
            console.error("Error fetching lines:", error);
            showToast('Failed to load production lines.', 'var(--bs-danger)');
        }
    }

    async function fetchCostSummary() {
        // Only fetch if the cost tab is active or potentially visible
        if (!costDlotTab || !costDlotTab.classList.contains('active')) return;

        showSpinner();
        const params = {
            startDate: costSummaryStartDateInput.value,
            endDate: costSummaryEndDateInput.value,
            line: costSummaryLineSelect.value
        };

        try {
            const result = await sendRequest(DLOT_API, 'get_cost_summary', 'GET', null, params);
            if (result.success && result.data) {
                updateCostSummaryUI(result.data.standard, result.data.actual);
            } else {
                throw new Error(result.message || 'Failed to load cost summary');
            }
        } catch (error) {
            console.error("Error fetching cost summary:", error);
            showToast(error.message, 'var(--bs-danger)');
            updateCostSummaryUI(null, null);
        } finally {
            hideSpinner();
        }
    }

    function updateCostSummaryUI(standardData, actualData) {
        const stdCost = (standardData && standardData.TotalDLCost) ? parseFloat(standardData.TotalDLCost) : 0;
        const actualCost = (actualData && actualData.TotalActualDLOT) ? parseFloat(actualData.TotalActualDLOT) : 0;
        const variance = actualCost - stdCost;

        stdDlCostDisplay.textContent = stdCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        actualDlotCostDisplay.textContent = actualCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        dlVarianceDisplay.textContent = variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        varianceCard.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-light');
        if (variance < 0) {
            varianceCard.classList.add('text-bg-success');
             varianceCard.classList.add('text-white'); // เพิ่ม text-white สำหรับ Dark mode
        } else if (variance > 0) {
            varianceCard.classList.add('text-bg-danger');
             varianceCard.classList.add('text-white'); // เพิ่ม text-white
        } else {
            varianceCard.classList.add('text-bg-light');
             varianceCard.classList.remove('text-white');
        }
    }

    async function handleDlotDateChange() {
         // Only fetch if the cost tab is active or potentially visible
        if (!costDlotTab || !costDlotTab.classList.contains('active')) return;

        const entry_date = dlotEntryDateInput.value;
        const line = dlotEntryLineSelect.value;
        if (!entry_date) return;

        dlotHeadcountInput.value = '';
        dlotDlCostInput.value = '';
        dlotOtCostInput.value = '';

        try {
            const body = { action: 'get_daily_costs', entry_date: entry_date, line: line };
            const result = await sendRequest(DLOT_API, 'get_daily_costs', 'POST', body);
            if (result.success && result.data) {
                dlotHeadcountInput.value = parseFloat(result.data.headcount) || '';
                dlotDlCostInput.value = parseFloat(result.data.dl_cost) || '';
                dlotOtCostInput.value = parseFloat(result.data.ot_cost) || '';
            }
        } catch (error) {
            console.error("Error fetching daily DLOT entry:", error);
            showToast('Failed to load existing entry data.', 'var(--bs-danger)');
        }
    }

    async function handleSaveDlotForm(event) {
        event.preventDefault();
        showSpinner();
        try {
            const body = {
                action: 'save_daily_costs',
                entry_date: dlotEntryDateInput.value,
                line: dlotEntryLineSelect.value,
                headcount: dlotHeadcountInput.value || 0,
                dl_cost: dlotDlCostInput.value || 0,
                ot_cost: dlotOtCostInput.value || 0
            };
            const result = await sendRequest(DLOT_API, 'save_daily_costs', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                await fetchCostSummary(); // Refresh summary after save
            }
        } catch (error) {
            console.error("Error saving DLOT entry:", error);
            showToast('An unexpected error occurred.', 'var(--bs-danger)');
        } finally {
            hideSpinner();
        }
    }

    // =================================================================
    // SECTION 3: SHIPMENT FUNCTIONS
    // =================================================================

    async function fetchShipments(page = 1) {
        // ⭐️ Only fetch if the shipment tab is active ⭐️
        if (!shipmentTab || !shipmentTab.classList.contains('active')) return;

        currentShipmentPage = page; // ⭐️ ใช้ currentShipmentPage
        showSpinner();
        shipmentTableBody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
        if(shipmentSummaryBar) shipmentSummaryBar.style.display = 'none';

        const selectedStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'all';

        const params = {
            page: currentShipmentPage, // ⭐️ ใช้ currentShipmentPage
            limit: ROWS_PER_PAGE,
            status: selectedStatus,
            search_term: shipmentSearchInput.value, // ⭐️ ใช้ shipmentSearchInput
            startDate: shipmentStartDateInput.value, // ⭐️ ใช้ shipmentStartDateInput
            endDate: shipmentEndDateInput.value     // ⭐️ ใช้ shipmentEndDateInput
        };

        try {
            const result = await sendRequest(SHIPMENT_API, 'get_shipments', 'GET', null, params);
            if (result.success && result.data) {
                renderShipmentsTable(result.data);
                if (typeof renderPagination === 'function') {
                    // ⭐️ ใช้ shipmentPaginationControls และ currentShipmentPage
                    renderPagination('shipmentPagination', result.total, currentShipmentPage, ROWS_PER_PAGE, fetchShipments);
                } else { console.error('renderPagination function not defined.'); shipmentPaginationControls.innerHTML = ''; }
                updateConfirmSelectedButtonState();

                if (shipmentSummaryBar && totalSelectedQtySpan && result.summary) {
                     totalSelectedQtySpan.textContent = parseFloat(result.summary.total_quantity || 0).toLocaleString();
                     shipmentSummaryBar.style.display = 'block';
                }

            } else {
                shipmentTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${result.message || 'Failed to load data.'}</td></tr>`;
                shipmentPaginationControls.innerHTML = '';
                 if (shipmentSummaryBar) shipmentSummaryBar.style.display = 'none';
            }
        } catch (error) {
            console.error("Error fetching shipments:", error);
            shipmentTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">An error occurred.</td></tr>`;
            shipmentPaginationControls.innerHTML = '';
             if (shipmentSummaryBar) shipmentSummaryBar.style.display = 'none';
        } finally {
            hideSpinner();
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
        }
    }

    function renderShipmentsTable(data) {
        shipmentTableBody.innerHTML = '';
        if (data.length === 0) {
            shipmentTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No shipments found for the selected criteria.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.transactionId = item.transaction_id;
            const isPending = item.transaction_type === 'TRANSFER_PENDING_SHIPMENT';
            const isRejected = item.transaction_type === 'REJECTED_SHIPMENT';

            // ... (การ format วันที่และ status เหมือนเดิม) ...
             const requestDateObj = new Date(item.transaction_timestamp);
             // ... (Code for formatting date, status, path) ...
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
                <td>${requestDateTimeFormatted}</td>
                <td>${item.sap_no || ''} / ${item.part_no || ''}</td>
                <td>${transferPath}</td>
                <td class="text-center">${parseFloat(item.quantity).toLocaleString()}</td>
                <td>
                    <span class="editable-note ${isRejected ? 'text-muted' : ''}" contenteditable="${!isRejected}" data-id="${item.transaction_id}" tabindex="0">${item.notes || ''}</span>
                </td>
                <td class="text-center"><span class="badge ${statusBadgeClass}">${statusText}</span></td>
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
            shipmentTableBody.appendChild(tr);
        });
    }

    async function handleConfirmShipment(transactionId) {
        if (!transactionId || !confirm(`Confirm shipment ID: ${transactionId}?`)) return;
        showSpinner();
        try {
            const result = await sendRequest(SHIPMENT_API, 'confirm_shipment', 'POST', { transaction_ids: [transactionId] });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) await fetchShipments(currentShipmentPage); // ⭐️ ใช้ currentShipmentPage
        } finally { hideSpinner(); }
    }

    async function handleConfirmSelected() {
        const selectedCheckboxes = shipmentTableBody.querySelectorAll('.row-checkbox:checked'); // ⭐️ ใช้ shipmentTableBody
        const transactionIdsToConfirm = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (transactionIdsToConfirm.length === 0) { showToast('Please select at least one shipment to confirm.', 'var(--bs-warning)'); return; }
        if (!confirm(`Confirm ${transactionIdsToConfirm.length} selected shipment(s)?`)) return;
        showSpinner();
        try {
            const result = await sendRequest(SHIPMENT_API, 'confirm_shipment', 'POST', { transaction_ids: transactionIdsToConfirm });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success || result.message.includes("No shipments were confirmed")) {
                await fetchShipments(1); // Refresh page 1
            }
        } finally { hideSpinner(); }
    }

    async function exportHistoryToExcel() {
        showSpinner();
        showToast('Preparing export...', 'var(--bs-info)');
        const selectedStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'all'; // ⭐️ Default เป็น all
        const params = {
            limit: -1, // Export all matching
            status: selectedStatus,
            search_term: shipmentSearchInput.value,
            startDate: shipmentStartDateInput.value,
            endDate: shipmentEndDateInput.value
        };
        try {
            const result = await sendRequest(SHIPMENT_API, 'get_shipments', 'GET', null, params);
            if (result.success && result.data.length > 0) {
                 // ... (โค้ดสร้าง Excel เหมือนเดิม) ...
                 const worksheetData = result.data.map(item => {
                     // ... (mapping logic) ...
                       const dateObj = new Date(item.transaction_timestamp);
                       const day = String(dateObj.getDate()).padStart(2, '0');
                       const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                       const year = dateObj.getFullYear();
                       const dateFormatted = `${day}/${month}/${year}`;
                       let statusText = item.transaction_type === 'TRANSFER_PENDING_SHIPMENT' ? 'Pending' : (item.transaction_type === 'SHIPPED' ? 'Shipped' : item.transaction_type);
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
                const startDate = shipmentStartDateInput.value || 'all';
                const endDate = shipmentEndDateInput.value || 'all';
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
        try {
             const result = await sendRequest(SHIPMENT_API, 'update_shipment_note', 'POST', {
                 transaction_id: transactionId, notes: newNote
             });
             if (!result.success) {
                 showToast(result.message, 'var(--bs-danger)');
             } else {
                const noteSpan = shipmentTableBody.querySelector(`.editable-note[data-id="${transactionId}"]`); // ⭐️ ใช้ shipmentTableBody
                if(noteSpan) {
                    noteSpan.style.boxShadow = '0 0 0 2px var(--bs-success)';
                    setTimeout(() => { noteSpan.style.boxShadow = ''; }, 1500);
                }
             }
        } catch (error) {
             console.error("Error updating note:", error);
             showToast('Failed to update note.', 'var(--bs-danger)');
        }
    }

    function openRejectModal(transactionIds) {
         if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
             showToast('No items selected for rejection.', 'var(--bs-warning)'); return;
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
                 transaction_ids: transactionIds, reason: reason
             });
             showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
             if (result.success || result.message.includes("No shipments were rejected")) {
                 await fetchShipments(1); // Refresh page 1
             }
         } finally {
             hideSpinner();
         }
    }

    // =================================================================
    // SECTION 4: HELPER FUNCTIONS
    // =================================================================
    function updateConfirmSelectedButtonState() {
        const selectedCheckboxes = shipmentTableBody.querySelectorAll('.row-checkbox:checked'); // ⭐️ ใช้ shipmentTableBody
        const selectedCount = selectedCheckboxes.length;
        const selectedStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'all'; // ⭐️ Default เป็น all

        if (confirmSelectedBtn) {
            confirmSelectedBtn.disabled = !(selectedCount > 0 && (selectedStatus === 'pending' || selectedStatus === 'all'));
        }
        if (rejectSelectedBtn) {
             rejectSelectedBtn.disabled = !(selectedCount > 0 && (selectedStatus === 'pending' || selectedStatus === 'all'));
        }
    }

    // =================================================================
    // SECTION 5: EVENT LISTENERS
    // =================================================================

    // --- ⭐️ Tab Switching Event ---
    if (costDlotTab && shipmentTab) {
        const triggerTabList = [].slice.call(document.querySelectorAll('#managementTab button'));
        triggerTabList.forEach(triggerEl => {
            const tabTrigger = new bootstrap.Tab(triggerEl);
            triggerEl.addEventListener('click', event => {
                event.preventDefault();
                tabTrigger.show();
            });
        });

        // Add listeners for when a tab has finished showing
        costDlotTab.addEventListener('shown.bs.tab', () => {
             console.log("Cost/DLOT Tab shown");
             // Refresh cost summary and form data when tab becomes visible
             fetchCostSummary();
             handleDlotDateChange();
             // Hide shipment pagination if needed
             if (shipmentPaginationControls) shipmentPaginationControls.style.display = 'none';
        });
        shipmentTab.addEventListener('shown.bs.tab', () => {
            console.log("Shipment Tab shown");
            // Fetch shipment data when tab becomes visible
            fetchShipments(currentShipmentPage); // Fetch current page first
             // Show shipment pagination
             if (shipmentPaginationControls) shipmentPaginationControls.style.display = 'flex'; // Or 'block' depending on your CSS
        });
    }

    // --- DLOT Cost Summary Filter Events ---
    btnRefreshCostSummary?.addEventListener('click', fetchCostSummary);
    costSummaryStartDateInput?.addEventListener('change', fetchCostSummary);
    costSummaryEndDateInput?.addEventListener('change', fetchCostSummary);
    costSummaryLineSelect?.addEventListener('change', fetchCostSummary);

    // --- DLOT Entry Form Events ---
    dlotEntryForm?.addEventListener('submit', handleSaveDlotForm);
    dlotEntryDateInput?.addEventListener('change', handleDlotDateChange);
    dlotEntryLineSelect?.addEventListener('change', handleDlotDateChange);

    // --- Shipment Filter Events ---
    shipmentSearchInput?.addEventListener('input', () => { // ⭐️ ใช้ shipmentSearchInput
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => fetchShipments(1), 500);
    });
    shipmentStartDateInput?.addEventListener('change', () => fetchShipments(1)); // ⭐️ ใช้ shipmentStartDateInput
    shipmentEndDateInput?.addEventListener('change', () => fetchShipments(1)); // ⭐️ ใช้ shipmentEndDateInput
    exportHistoryBtn?.addEventListener('click', exportHistoryToExcel);

    // --- Status Filter ---
    statusFilterRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            fetchShipments(1); // Fetch page 1 when status changes
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
    selectAllCheckbox?.addEventListener('change', (e) => {
        shipmentTableBody.querySelectorAll('.row-checkbox').forEach(checkbox => { // ⭐️ ใช้ shipmentTableBody
            checkbox.checked = e.target.checked;
        });
        updateConfirmSelectedButtonState();
    });

    if (shipmentTableBody) { // ⭐️ ใช้ shipmentTableBody
        shipmentTableBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox')) {
                const allCheckboxes = shipmentTableBody.querySelectorAll('.row-checkbox');
                const checkedCount = shipmentTableBody.querySelectorAll('.row-checkbox:checked').length;
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
                }
                updateConfirmSelectedButtonState();
            }
        });
    } else { console.error("Element with ID 'shipmentsTableBody' not found."); }

    // --- Button Click Events ---
    confirmSelectedBtn?.addEventListener('click', handleConfirmSelected);
    rejectSelectedBtn?.addEventListener('click', () => {
         const selectedCheckboxes = shipmentTableBody.querySelectorAll('.row-checkbox:checked'); // ⭐️ ใช้ shipmentTableBody
         const transactionIdsToReject = Array.from(selectedCheckboxes).map(cb => cb.value);
         openRejectModal(transactionIdsToReject);
      });
    confirmRejectBtn?.addEventListener('click', executeReject);

    // --- Table Click/Input Events (Delegation) ---
    if (shipmentTableBody) { // ⭐️ ใช้ shipmentTableBody
        shipmentTableBody.addEventListener('click', (e) => {
            const confirmButton = e.target.closest('.confirm-single-btn');
            if (confirmButton) { handleConfirmShipment(confirmButton.dataset.id); return; }
            const rejectButton = e.target.closest('.reject-single-btn');
            if (rejectButton) { openRejectModal([rejectButton.dataset.id]); return; }
        });

        shipmentTableBody.addEventListener('blur', (e) => {
             if (e.target.classList.contains('editable-note') && !e.target.classList.contains('text-muted')) {
                 const span = e.target;
                 const transactionId = span.dataset.id;
                 const newNote = span.textContent.trim();
                 clearTimeout(noteEditDebounceTimer);
                 noteEditDebounceTimer = setTimeout(() => { handleNoteEdit(transactionId, newNote); }, 300);
             }
        }, true);

        shipmentTableBody.addEventListener('keydown', (e) => {
             if (e.target.classList.contains('editable-note') && e.key === 'Enter' && !e.target.classList.contains('text-muted')) {
                 e.preventDefault(); e.target.blur();
             }
        });

    } else { console.error("Element with ID 'shipmentsTableBody' not found."); }

    // =================================================================
    // SECTION 6: INITIALIZATION
    // =================================================================

    setAllDefaultDates();
    fetchDashboardLines();

    // ⭐️ Initial load depends on which tab is active first (Cost/DLOT)
    if (costDlotTab && costDlotTab.classList.contains('active')) {
        fetchCostSummary();
        handleDlotDateChange();
         if (shipmentPaginationControls) shipmentPaginationControls.style.display = 'none';
    } else if (shipmentTab && shipmentTab.classList.contains('active')) {
        fetchShipments(1);
         if (shipmentPaginationControls) shipmentPaginationControls.style.display = 'flex';
    } else {
        // Fallback: Load Cost/DLOT if no tab is marked active initially
        fetchCostSummary();
        handleDlotDateChange();
        if (shipmentPaginationControls) shipmentPaginationControls.style.display = 'none';
    }


    if(confirmSelectedBtn) confirmSelectedBtn.style.display = 'inline-block'; // Consider hiding/showing based on active tab?
    if(rejectSelectedBtn) rejectSelectedBtn.style.display = 'inline-block'; // Consider hiding/showing based on active tab?

}); // End DOMContentLoaded