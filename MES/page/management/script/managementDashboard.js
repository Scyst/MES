"use strict";
document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // SECTION 1: GLOBAL VARIABLES & CONSTANTS
    // =================================================================
    let currentShipmentPage = 1;
    let currentPlanPage = 1;
    const ROWS_PER_PAGE = 50;
    let allPlanningItems = []; // เก็บ Item ทั้งหมดสำหรับ Autocomplete
    let selectedPlanItem = null; // เก็บ Item ที่ถูกเลือกใน Modal
    let planVsActualChart = null;
    let planVsActualChartInstance = null;

    // --- DOM Elements (Shared & Tabs) ---
    const costPlanningTab = document.getElementById('cost-planning-tab');
    const shipmentTab = document.getElementById('shipment-tab');
    const planModalElement = document.getElementById('planModal');
    const planModal = new bootstrap.Modal(planModalElement);

    // --- DOM Elements (Shipment Section) ---
    const shipmentTableBody = document.getElementById('shipmentsTableBody');
    const shipmentPaginationControls = document.getElementById('shipmentPagination');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const confirmSelectedBtn = document.getElementById('confirmSelectedBtn');
    const shipmentSearchInput = document.getElementById('shipmentSearch');
    const shipmentStartDateInput = document.getElementById('shipmentStartDate');
    const shipmentEndDateInput = document.getElementById('shipmentEndDate');
    const shipmentSummaryBar = document.getElementById('shipmentSummaryBar');
    const totalSelectedQtySpan = document.getElementById('totalSelectedQty');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    const statusFilterRadios = document.querySelectorAll('input[name="shipmentStatus"]');
    const rejectSelectedBtn = document.getElementById('rejectSelectedBtn');
    const rejectReasonModal = new bootstrap.Modal(document.getElementById('rejectReasonModal'));
    const confirmRejectBtn = document.getElementById('confirmRejectBtn');
    const rejectReasonText = document.getElementById('rejectReasonText');
    const rejectTransactionIdsInput = document.getElementById('rejectTransactionIds');

    // --- DOM Elements (DLOT & Cost Summary Section) ---
    const dlotEntryForm = document.getElementById('dlot-entry-form');
    const dlotEntryDateInput = document.getElementById('dlot-entry-date');
    const dlotEntryLineSelect = document.getElementById('dlot-entry-line');
    const dlotHeadcountInput = document.getElementById('dlot-headcount');
    const dlotDlCostInput = document.getElementById('dlot-dl-cost');
    const dlotOtCostInput = document.getElementById('dlot-ot-cost');
    const costSummaryStartDateInput = document.getElementById('cost-summary-start-date');
    const costSummaryEndDateInput = document.getElementById('cost-summary-end-date');
    const costSummaryLineSelect = document.getElementById('cost-summary-line');
    const btnRefreshCostSummary = document.getElementById('btn-refresh-cost-summary');
    const stdDlCostDisplay = document.getElementById('std-dl-cost-display');
    const actualDlotCostDisplay = document.getElementById('actual-dlot-cost-display');
    const dlVarianceDisplay = document.getElementById('dl-variance-display');
    const varianceCard = document.getElementById('variance-card');

    // --- DOM Elements (Production Planning Section) ---
    const planDateFilter = document.getElementById('planDateFilter');
    const planLineFilter = document.getElementById('planLineFilter');
    const planShiftFilter = document.getElementById('planShiftFilter');
    const btnRefreshPlan = document.getElementById('btn-refresh-plan');
    const btnAddPlan = document.getElementById('btnAddPlan');
    const productionPlanTableBody = document.getElementById('productionPlanTableBody');
    const planPaginationControls = document.getElementById('planPagination');

    // --- DOM Elements (Plan Modal) ---
    const planModalLabel = document.getElementById('planModalLabel');
    const planForm = document.getElementById('planForm');
    const planModalPlanId = document.getElementById('planModalPlanId');
    const planModalDate = document.getElementById('planModalDate');
    const planModalLine = document.getElementById('planModalLine');
    const planModalShift = document.getElementById('planModalShift');
    const planModalItemSearch = document.getElementById('planModalItemSearch');
    const planModalSelectedItem = document.getElementById('planModalSelectedItem');
    const planModalItemId = document.getElementById('planModalItemId');
    const planModalItemResultsContainer = document.getElementById('planModalItemResultsContainer');
    const planModalItemResults = document.getElementById('planModalItemResults');
    const itemSearchError = document.getElementById('item-search-error');
    const planModalQuantity = document.getElementById('planModalQuantity');
    const planModalNote = document.getElementById('planModalNote');
    const savePlanButton = document.getElementById('savePlanButton');
    const deletePlanButton = document.getElementById('deletePlanButton');


    // --- API Constants ---
    // Defined in PHP script block

    // --- Debounce Timers ---
    let searchDebounceTimer;
    let noteEditDebounceTimer;
    let planNoteEditDebounceTimer;
    let planCarryOverEditDebounceTimer;

    // =================================================================
    // SECTION 2: HELPER FUNCTIONS (Includes Date Formatting)
    // =================================================================
    function formatDateForInput(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            console.error("Invalid date passed to formatDateForInput:", date);
            return new Date().toISOString().split('T')[0]; // Fallback
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // =================================================================
    // SECTION 3: DLOT & COST SUMMARY FUNCTIONS
    // =================================================================

    function setAllDefaultDates() {
        const today = new Date();
        const firstDayOfMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const todayFormatted = formatDateForInput(today);
        const firstDayOfMonthFormatted = formatDateForInput(firstDayOfMonthDate);

        // Shipment Dates
        if (shipmentStartDateInput && !shipmentStartDateInput.value) shipmentStartDateInput.value = todayFormatted;
        if (shipmentEndDateInput && !shipmentEndDateInput.value) shipmentEndDateInput.value = todayFormatted;
        // Cost Summary Dates
        if (costSummaryStartDateInput && !costSummaryStartDateInput.value) costSummaryStartDateInput.value = firstDayOfMonthFormatted;
        if (costSummaryEndDateInput && !costSummaryEndDateInput.value) costSummaryEndDateInput.value = todayFormatted;
        // DLOT Entry Date
        if (dlotEntryDateInput && !dlotEntryDateInput.value) dlotEntryDateInput.value = todayFormatted;
        // ⭐️ Planning Date Filter ⭐️
        if (planDateFilter && !planDateFilter.value) planDateFilter.value = todayFormatted;
    }

    async function fetchDashboardLines() {
        try {
            const result = await sendRequest(FILTERS_API, 'get_filters', 'GET');

            // ⭐️ แก้ไข: เข้าถึง lines ผ่าน result.data ⭐️
            if (result.success && result.data && result.data.lines) {
                const lines = result.data.lines; // <--- แก้ไขตรงนี้

                // Clear existing options (excluding defaults)
                [costSummaryLineSelect, dlotEntryLineSelect, planLineFilter, planModalLine].forEach(select => {
                    if (select) {
                        // Keep 'All Lines' or placeholder based on select id
                        const valueToKeep = (select.id === 'planLineFilter' || select.id === 'costSummaryLineSelect' || select.id === 'planModalLine') ? "" : "ALL";
                        const optionsToRemove = select.querySelectorAll(`option:not([value="${valueToKeep}"])`);
                        optionsToRemove.forEach(opt => opt.remove());

                        // Add new lines
                        lines.forEach(line => {
                            select.appendChild(new Option(line, line));
                        });
                    }
                });
                 // Ensure default placeholder for planModalLine if it was removed
                 if (planModalLine && !planModalLine.querySelector('option[value=""]')) {
                     const defaultOption = new Option("Select Line...", "", true, true);
                     defaultOption.disabled = true;
                     planModalLine.prepend(defaultOption);
                 }


            } else {
                 // Log if lines data is missing even if success is true
                 console.warn("fetchDashboardLines: API success but lines data is missing or invalid.", result);
                 showToast('Could not retrieve production lines list.', 'var(--bs-warning)');
            }
        } catch (error) {
            console.error("Error fetching lines:", error);
            showToast('Failed to load production lines.', 'var(--bs-danger)');
        }
    }

    async function fetchCostSummary() {
        if (!costPlanningTab || !costPlanningTab.classList.contains('active')) return;
        showSpinner();
        const params = { startDate: costSummaryStartDateInput.value, endDate: costSummaryEndDateInput.value, line: costSummaryLineSelect.value || null }; // Send null if ALL
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
        const stdCost = (standardData && standardData.TotalDLCost != null) ? parseFloat(standardData.TotalDLCost) : 0; // Check for null
        const actualCost = (actualData && actualData.TotalActualDLOT != null) ? parseFloat(actualData.TotalActualDLOT) : 0; // Check for null
        const variance = actualCost - stdCost;

        stdDlCostDisplay.textContent = stdCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        actualDlotCostDisplay.textContent = actualCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        dlVarianceDisplay.textContent = variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        varianceCard.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-light', 'text-white');
        if (variance < 0) {
            varianceCard.classList.add('text-bg-success', 'text-white');
        } else if (variance > 0) {
            varianceCard.classList.add('text-bg-danger', 'text-white');
        } else {
            varianceCard.classList.add('text-bg-light');
        }
    }


    async function handleDlotDateChange() {
        if (!costPlanningTab || !costPlanningTab.classList.contains('active')) return;
        const entry_date = dlotEntryDateInput.value;
        const line = dlotEntryLineSelect.value || 'ALL'; // Default to ALL if empty
        if (!entry_date) return;
        dlotHeadcountInput.value = ''; dlotDlCostInput.value = ''; dlotOtCostInput.value = '';
        try {
            const body = { action: 'get_daily_costs', entry_date: entry_date, line: line };
            const result = await sendRequest(DLOT_API, 'get_daily_costs', 'POST', body);
            if (result.success && result.data) {
                dlotHeadcountInput.value = result.data.headcount > 0 ? result.data.headcount : ''; // Show empty if 0
                dlotDlCostInput.value = result.data.dl_cost > 0 ? result.data.dl_cost : ''; // Show empty if 0
                dlotOtCostInput.value = result.data.ot_cost > 0 ? result.data.ot_cost : ''; // Show empty if 0
            }
        } catch (error) {
            console.error("Error fetching daily DLOT entry:", error);
            showToast('Failed to load existing entry data.', 'var(--bs-danger)');
        }
    }

    async function handleSaveDlotForm(event) {
        // ... (function remains the same) ...
        event.preventDefault(); showSpinner();
        try {
            const body = {
                action: 'save_daily_costs', entry_date: dlotEntryDateInput.value,
                line: dlotEntryLineSelect.value || 'ALL', headcount: dlotHeadcountInput.value || 0,
                dl_cost: dlotDlCostInput.value || 0, ot_cost: dlotOtCostInput.value || 0
            };
            const result = await sendRequest(DLOT_API, 'save_daily_costs', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) { await fetchCostSummary(); }
        } catch (error) {
            console.error("Error saving DLOT entry:", error);
            showToast('An unexpected error occurred.', 'var(--bs-danger)');
        } finally { hideSpinner(); }
    }


    // =================================================================
    // SECTION 4: ⭐️ PRODUCTION PLANNING FUNCTIONS ⭐️
    // =================================================================

    /**
     * Renders or updates the Plan vs Actual comparison chart using Chart.js.
     * @param {Array} planData Array of plan objects (already filtered by date/line/shift).
     */
    function renderPlanVsActualChart(planData) {
        const chartCanvas = document.getElementById('planVsActualChart'); // Get the canvas element
        const chartDateDisplay = document.getElementById('chartDateDisplay');
        if (!chartCanvas) return; // Exit if canvas not found

        // Get the 2D context for Chart.js
        const ctx = chartCanvas.getContext('2d');

        // Update chart title date
        if (chartDateDisplay && planData.length > 0) {
            chartDateDisplay.textContent = planData[0].plan_date;
        } else if (chartDateDisplay) {
            chartDateDisplay.textContent = planDateFilter.value;
        }

        // --- Prepare data for Chart.js ---
        const labels = planData.map(p => p.sap_no || p.part_no || 'N/A');
        const adjustedPlanData = planData.map(p => parseFloat(p.adjusted_planned_quantity || 0));
        const actualQtyData = planData.map(p => parseFloat(p.actual_quantity || 0));

        // --- Chart.js Configuration ---
        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Adjusted Plan',
                data: adjustedPlanData,
                backgroundColor: 'rgba(54, 162, 235, 0.7)', // Blue
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }, {
                label: 'Actual Qty',
                data: actualQtyData,
                backgroundColor: (context) => { // Dynamic color based on comparison
                    const index = context.dataIndex;
                    const planValue = adjustedPlanData[index];
                    const actualValue = actualQtyData[index];
                    if (actualValue < planValue) {
                        return 'rgba(255, 99, 132, 0.7)'; // Red if less than plan
                    } else if (actualValue >= planValue && planValue > 0) {
                        return 'rgba(75, 192, 192, 0.7)'; // Green if met or exceeded (and plan > 0)
                    }
                    return 'rgba(201, 203, 207, 0.7)'; // Grey otherwise (e.g., plan is 0)
                },
                borderColor: (context) => {
                    const index = context.dataIndex;
                    const planValue = adjustedPlanData[index];
                    const actualValue = actualQtyData[index];
                    if (actualValue < planValue) {
                        return 'rgba(255, 99, 132, 1)';
                    } else if (actualValue >= planValue && planValue > 0) {
                        return 'rgba(75, 192, 192, 1)';
                    }
                    return 'rgba(201, 203, 207, 1)';
                },
                borderWidth: 1
            }]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false, // Allow chart to fill container height
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity'
                    },
                    ticks: { // Format Y-axis labels with commas
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0,
                        font: {
                            size: 12
                        },
                        autoSkip: true,
                        maxTicksLimit: 15
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                    label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString(); // Format tooltip value
                            }
                            return label;
                        }
                    }
                },
                datalabels: { // Using chartjs-plugin-datalabels
                    anchor: 'end',
                    align: 'top',
                    formatter: (value, context) => {
                        return value > 0 ? value.toLocaleString() : ''; // Show label if > 0, formatted
                    },
                    font: {
                        size: 10
                    },
                    color: '#444' // Adjust label color if needed
                }
            }
        };

        // Destroy previous chart instance if it exists before creating a new one
        if (planVsActualChartInstance) {
            planVsActualChartInstance.destroy();
        }

        // Create the new chart instance
        planVsActualChartInstance = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: chartOptions,
            plugins: [ChartDataLabels] // Register the datalabels plugin
        });
    }

    /**
     * Fetches production plans based on current filters.
     */
    async function fetchPlans(page = 1) {
        // Only fetch if the planning tab is active
        if (!costPlanningTab || !costPlanningTab.classList.contains('active')) return;

        currentPlanPage = page;
        showSpinner();
        productionPlanTableBody.innerHTML = `<tr><td colspan="9" class="text-center">Loading plans...</td></tr>`;
        planPaginationControls.innerHTML = ''; // Clear pagination

        const params = {
            planDate: planDateFilter.value,
            line: planLineFilter.value || null, // Send null if "All Lines"
            shift: planShiftFilter.value || null, // Send null if "All Shifts"
            // Add pagination params if needed later: page: currentPlanPage, limit: ROWS_PER_PAGE
        };

        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);

            if (result.success && result.data) {
                renderPlanTable(result.data);
                renderPlanVsActualChart(result.data);
                // Add pagination rendering if implementing pagination for plans
                // if (typeof renderPagination === 'function' && result.total > ROWS_PER_PAGE) {
                //     renderPagination('planPagination', result.total, currentPlanPage, ROWS_PER_PAGE, fetchPlans);
                // }
            } else {
                productionPlanTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${result.message || 'Failed to load plans.'}</td></tr>`;
                renderPlanVsActualChart([]);
            }
        } catch (error) {
            console.error("Error fetching plans:", error);
            productionPlanTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">An error occurred while loading plans.</td></tr>`;
            renderPlanVsActualChart([]);
        } finally {
            hideSpinner();
        }
    }

    /**
     * Renders the production plan data into the table.
     * @param {Array} data Array of plan objects.
     */
    function renderPlanTable(data) {
        productionPlanTableBody.innerHTML = '';
        if (!data || data.length === 0) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No production plans found for the selected criteria.</td></tr>`;
            return;
        }

        data.forEach(plan => {
            const tr = document.createElement('tr');
            tr.dataset.planId = plan.plan_id;
            tr.dataset.planData = JSON.stringify(plan); // Store full data

            const originalPlan = parseFloat(plan.original_planned_quantity || 0);
            const carryOver = parseFloat(plan.carry_over_quantity || 0);
            const adjustedPlan = parseFloat(plan.adjusted_planned_quantity || 0);
            const actualQty = parseFloat(plan.actual_quantity || 0);

            let actualClass = '';
            if (actualQty < adjustedPlan) {
                actualClass = 'text-danger'; // สีแดงถ้าน้อยกว่าแผน
            } else if (actualQty >= adjustedPlan && adjustedPlan > 0) { // adjustedPlan > 0 ป้องกันกรณีแผนเป็น 0 แล้วผลิตได้
                actualClass = 'text-success'; // สีเขียวถ้าเท่ากับหรือมากกว่าแผน
            }

            tr.innerHTML = `
                <td>${plan.plan_date || ''}</td>
                <td>${plan.line || ''}</td>
                <td>${plan.shift || ''}</td>
                <td>
                    <span class="fw-bold">${plan.sap_no || 'N/A'}</span> / ${plan.part_no || 'N/A'}
                    <small class="d-block text-muted">${plan.part_description || ''}</small>
                </td>
                <td class="text-center">${originalPlan.toLocaleString()}</td>
                <td class="text-center ${actualClass}">${actualQty.toLocaleString()}</td>
                <td class="text-center ${carryOver > 0 ? 'text-warning' : ''}">
                    <span class="editable-plan" contenteditable="true" data-id="${plan.plan_id}" data-field="carry_over" inputmode="decimal" tabindex="0">${carryOver.toLocaleString()}</span>
                </td>
                <td class="text-center fw-bold" data-field="adjusted_plan">${adjustedPlan.toLocaleString()}</td>
                <td class="text-center">
                    <span class="editable-plan" contenteditable="true" data-id="${plan.plan_id}" data-field="note" tabindex="0">${plan.note || ''}</span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary edit-plan-btn" title="Edit Plan">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-plan-btn ms-1" title="Delete Plan">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            productionPlanTableBody.appendChild(tr);
        });
    }

     /**
     * Handles inline editing of the plan note.
     * @param {number} planId
     * @param {string} newNote
     */
     async function handlePlanNoteEdit(planId, newNote) {
        // We need to fetch the existing plan data to send all required fields for update
        const planRow = productionPlanTableBody.querySelector(`tr[data-plan-id="${planId}"]`);
        if (!planRow || !planRow.dataset.planData) return;

        try {
            const existingPlan = JSON.parse(planRow.dataset.planData);
            const body = {
                action: 'save_plan',
                plan_id: planId,
                plan_date: existingPlan.plan_date,
                line: existingPlan.line,
                shift: existingPlan.shift,
                item_id: existingPlan.item_id,
                original_planned_quantity: existingPlan.original_planned_quantity,
                note: newNote // Only the note is changed
            };

            const result = await sendRequest(PLAN_API, 'save_plan', 'POST', body);
            if (!result.success) {
                showToast(result.message || 'Failed to update note.', 'var(--bs-danger)');
                // Optional: revert the text content
                const noteSpan = planRow.querySelector('.editable-plan[data-field="note"]');
                if (noteSpan) noteSpan.textContent = existingPlan.note || '';
            } else {
                 // Update the stored data on the row
                existingPlan.note = newNote;
                planRow.dataset.planData = JSON.stringify(existingPlan);
                 // Visual feedback
                const noteSpan = planRow.querySelector('.editable-plan[data-field="note"]');
                 if(noteSpan) {
                     noteSpan.style.boxShadow = '0 0 0 2px var(--bs-success)';
                     setTimeout(() => { noteSpan.style.boxShadow = ''; }, 1500);
                 }
            }
        } catch (error) {
            console.error("Error updating plan note:", error);
            showToast('Error updating note.', 'var(--bs-danger)');
        }
    }

    /**
     * ⭐️ Handles inline editing of the carry over quantity. ⭐️
     * @param {number} planId
     * @param {number} newCarryOverValue
     * @param {HTMLElement} spanElement The edited span element
     */
    async function handleCarryOverEdit(planId, newCarryOverValue, spanElement) {
        showSpinner(); // Show spinner during save
        const row = spanElement.closest('tr');
        const originalData = JSON.parse(row?.dataset.planData || '{}');
        const originalCarryOver = parseFloat(originalData.carry_over_quantity || 0);

        const body = {
            action: 'update_carry_over', // ⭐️ Use the new action
            plan_id: planId,
            carry_over_quantity: newCarryOverValue // Send the validated numeric value
        };

        try {
            const result = await sendRequest(PLAN_API, 'update_carry_over', 'POST', body); // ⭐️ Call the new action

            if (result.success) {
                showToast(result.message || 'Carry-over updated.', 'var(--bs-success)');

                // Update the stored data on the row
                originalData.carry_over_quantity = newCarryOverValue;
                // Recalculate adjusted plan based on original plan and NEW carry over
                const originalPlan = parseFloat(originalData.original_planned_quantity || 0);
                const newAdjustedPlan = originalPlan + newCarryOverValue;
                originalData.adjusted_planned_quantity = newAdjustedPlan; // Update adjusted plan in stored data
                row.dataset.planData = JSON.stringify(originalData);

                // Update the Adjusted Plan cell in the UI
                const adjustedPlanCell = row.querySelector('td[data-field="adjusted_plan"]');
                if (adjustedPlanCell) {
                    adjustedPlanCell.textContent = newAdjustedPlan.toLocaleString();
                    adjustedPlanCell.classList.add('fw-bold'); // Keep it bold
                }
                 // Update the Carry Over cell formatting
                 spanElement.textContent = newCarryOverValue.toLocaleString(); // Format the saved value
                 spanElement.classList.toggle('text-warning', newCarryOverValue > 0);


                // Visual feedback
                spanElement.style.boxShadow = '0 0 0 2px var(--bs-success)';
                setTimeout(() => { spanElement.style.boxShadow = ''; }, 1500);

            } else {
                showToast(result.message || 'Failed to update carry-over.', 'var(--bs-danger)');
                // Revert the value in the cell
                spanElement.textContent = originalCarryOver.toLocaleString();
                spanElement.classList.toggle('text-warning', originalCarryOver > 0);

            }
        } catch (error) {
            console.error("Error updating carry-over:", error);
            showToast('Error updating carry-over.', 'var(--bs-danger)');
            // Revert the value in the cell
            spanElement.textContent = originalCarryOver.toLocaleString();
             spanElement.classList.toggle('text-warning', originalCarryOver > 0);
        } finally {
            hideSpinner(); // Hide spinner after operation
        }
    }

    /**
     * Resets the Plan Modal form to default/empty state.
     */
    function resetPlanModal() {
        planModalLabel.textContent = 'Add New Production Plan';
        planForm.reset(); // Reset form elements to default values
        planModalPlanId.value = '0'; // Important: reset plan ID
        planModalItemId.value = ''; // Clear hidden item ID
        planModalSelectedItem.textContent = 'No Item Selected'; // Reset selected item display
        planModalItemSearch.classList.remove('is-invalid'); // Remove validation styles
        itemSearchError.style.display = 'none';
        deletePlanButton.style.display = 'none'; // Hide delete button
        planModalDate.value = planDateFilter.value || formatDateForInput(new Date()); // Default date from filter or today
        planModalLine.value = planLineFilter.value || ""; // Default line from filter
        planModalShift.value = planShiftFilter.value || ""; // Default shift from filter

         // Clear any previous autocomplete results
         planModalItemResults.innerHTML = '';
         planModalItemResults.style.display = 'none';
    }

    /**
     * Opens the Plan Modal for adding or editing.
     * @param {object|null} planData The plan data object for editing, or null for adding.
     */
    function openPlanModal(planData = null) {
        resetPlanModal();

        if (planData) {
            // --- EDIT MODE ---
            planModalLabel.textContent = 'Edit Production Plan';
            planModalPlanId.value = planData.plan_id;
            planModalDate.value = planData.plan_date; // Assumes YYYY-MM-DD format from API
            planModalLine.value = planData.line;
            planModalShift.value = planData.shift;
            planModalQuantity.value = planData.original_planned_quantity;
            planModalNote.value = planData.note || '';

            // Set Item details
            planModalItemId.value = planData.item_id;
            planModalItemSearch.value = `${planData.sap_no || ''} / ${planData.part_no || ''}`; // Show current item in search
            planModalSelectedItem.textContent = `${planData.sap_no || 'N/A'} - ${planData.part_description || 'N/A'}`; // Show current item detail

            deletePlanButton.style.display = 'inline-block'; // Show delete button
        } else {
            // --- ADD MODE ---
            // resetPlanModal already handled defaults
            // Set date/line/shift based on current filter values
            planModalDate.value = planDateFilter.value || formatDateForInput(new Date());
            planModalLine.value = planLineFilter.value || "";
            planModalShift.value = planShiftFilter.value || "";
        }
        planModal.show();
    }

    /**
     * Saves the plan data (Insert or Update) via API.
     */
    async function savePlan() {
        // Basic form validation (HTML5 required should handle most)
        if (!planForm.checkValidity()) {
            planForm.reportValidity(); // Show browser validation messages
            return;
        }
        // Specific check for item selection
        if (!planModalItemId.value) {
             planModalItemSearch.classList.add('is-invalid');
             itemSearchError.style.display = 'block';
             showToast('Please select a valid item.', 'var(--bs-warning)');
             return;
        } else {
             planModalItemSearch.classList.remove('is-invalid');
             itemSearchError.style.display = 'none';
        }


        showSpinner();
        savePlanButton.disabled = true;
        deletePlanButton.disabled = true;

        const body = {
            action: 'save_plan',
            plan_id: planModalPlanId.value || 0,
            plan_date: planModalDate.value,
            line: planModalLine.value,
            shift: planModalShift.value,
            item_id: planModalItemId.value,
            original_planned_quantity: planModalQuantity.value,
            note: planModalNote.value || null // Send null if empty
        };

        try {
            const result = await sendRequest(PLAN_API, 'save_plan', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                planModal.hide();
                fetchPlans(currentPlanPage); // Refresh the table
            }
        } catch (error) {
            console.error("Error saving plan:", error);
            showToast('An error occurred while saving the plan.', 'var(--bs-danger)');
        } finally {
            hideSpinner();
            savePlanButton.disabled = false;
            deletePlanButton.disabled = false;
        }
    }

    /**
     * Deletes a plan via API.
     */
    async function deletePlan() {
        const planId = planModalPlanId.value;
        if (!planId || planId === '0') return;

        if (!confirm(`Are you sure you want to delete this plan entry (ID: ${planId})? This cannot be undone.`)) {
            return;
        }

        showSpinner();
        savePlanButton.disabled = true;
        deletePlanButton.disabled = true;

        const body = {
            action: 'delete_plan',
            plan_id: planId
        };

        try {
            const result = await sendRequest(PLAN_API, 'delete_plan', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                planModal.hide();
                fetchPlans(1); // Refresh table from page 1 after delete
            }
        } catch (error) {
            console.error("Error deleting plan:", error);
            showToast('An error occurred while deleting the plan.', 'var(--bs-danger)');
        } finally {
            hideSpinner();
            savePlanButton.disabled = false;
            deletePlanButton.disabled = false; // Re-enable even on failure
        }
    }

    /**
     * ⭐️ Initializes Autocomplete using local data (allPlanningItems). ⭐️
     */
    function setupPlanItemAutocomplete() {
        const searchInput = planModalItemSearch;
        const resultsWrapper = planModalItemResults; // Use the existing div
        const selectedDisplay = planModalSelectedItem;
        const hiddenInput = planModalItemId;
        const errorDisplay = itemSearchError;

        searchInput.addEventListener('input', () => {
            const value = searchInput.value.toLowerCase().trim();
            resultsWrapper.innerHTML = '';
            hiddenInput.value = ''; // Clear hidden ID when user types
            selectedPlanItem = null; // Clear selected item object
            selectedDisplay.textContent = 'Searching...';
            errorDisplay.style.display = 'none';
            searchInput.classList.remove('is-invalid');

            if (value.length < 2) { // Minimum 2 characters to trigger search
                 resultsWrapper.style.display = 'none';
                 selectedDisplay.textContent = 'Type min 2 chars';
                 return;
            }

            // Filter from the global allPlanningItems array
            const filteredItems = allPlanningItems.filter(item =>
                item.sap_no?.toLowerCase().includes(value) || // Optional chaining for safety
                item.part_no?.toLowerCase().includes(value) ||
                item.part_description?.toLowerCase().includes(value)
            ).slice(0, 10); // Limit results to 10

            if (filteredItems.length > 0) {
                filteredItems.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('autocomplete-item');
                    div.innerHTML = `
                        <span class="fw-bold">${item.sap_no || 'N/A'}</span> / ${item.part_no || 'N/A'}
                        <small class="d-block text-muted">${item.part_description || 'No description'}</small>
                    `;
                    // Store necessary data on the element
                    div.dataset.itemId = item.item_id;
                    div.dataset.itemText = `${item.sap_no || ''} / ${item.part_no || ''}`;
                    div.dataset.itemDetail = `${item.sap_no || 'N/A'} - ${item.part_description || 'N/A'}`;

                    div.addEventListener('click', () => {
                        searchInput.value = div.dataset.itemText;
                        hiddenInput.value = div.dataset.itemId;
                        selectedDisplay.textContent = div.dataset.itemDetail;
                        selectedPlanItem = item; // Store the selected item object
                        resultsWrapper.innerHTML = ''; // Clear results
                        resultsWrapper.style.display = 'none';
                        errorDisplay.style.display = 'none';
                        searchInput.classList.remove('is-invalid');
                    });
                    resultsWrapper.appendChild(div);
                });
                resultsWrapper.style.display = 'block';
                 selectedDisplay.textContent = 'Select from list...';
            } else {
                resultsWrapper.innerHTML = '<div class="autocomplete-item text-muted">No items found.</div>';
                resultsWrapper.style.display = 'block';
                selectedDisplay.textContent = 'No items found';
            }
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
             // Check if click is outside the search input AND the results container
             if (!searchInput.contains(e.target) && !resultsWrapper.contains(e.target)) {
                 resultsWrapper.style.display = 'none';
                  // Optional: Reset if nothing valid was selected
                 if (!hiddenInput.value && searchInput.value) {
                     // selectedDisplay.textContent = 'No Item Selected';
                 }
             }
         });

         // Optional: Clear selection if input is cleared manually
         searchInput.addEventListener('change', () => { // Use change event
            if (searchInput.value.trim() === '') {
                 hiddenInput.value = '';
                 selectedPlanItem = null;
                 selectedDisplay.textContent = 'No Item Selected';
                 errorDisplay.style.display = 'none';
                 searchInput.classList.remove('is-invalid');
            }
         });
    }

    /**
     * ⭐️ Fetches all active items for planning autocomplete. ⭐️
     */
    async function fetchAllItemsForPlanning() {
         console.log("Fetching all items for planning autocomplete...");
         try {
             // Use ITEM_SEARCH_API (itemMasterManage.php) with action 'get_items'
             // Send parameters to get ALL active items (no pagination, no search term)
             const params = {
                 limit: -1,         // Get all items
                 show_inactive: false // Only active items
                 // Add supervisor line filter if applicable? Check API logic
             };
             const result = await sendRequest(ITEM_SEARCH_API, 'get_items', 'GET', null, params);
             if (result.success && result.data) {
                 allPlanningItems = result.data;
                 console.log(`Loaded ${allPlanningItems.length} items for autocomplete.`);
                 // Now setup the autocomplete input
                 setupPlanItemAutocomplete(); // ⭐️ Call the new setup function
             } else {
                 console.error("Failed to load items for autocomplete:", result.message);
                 showToast('Error loading item list for planning.', 'var(--bs-danger)');
             }
         } catch (error) {
             console.error("Error fetching all items:", error);
             showToast('Failed to load item list.', 'var(--bs-danger)');
         }
    }

    /**
     * Initializes the autocomplete for the Item search input in the modal.
     */
    function initItemAutocomplete() {
        const resultsList = planModalItemResults;
        const searchInput = planModalItemSearch;
        const selectedDisplay = planModalSelectedItem;
        const hiddenInput = planModalItemId;
        const errorDisplay = itemSearchError;

        searchInput.addEventListener('input', () => {
             const searchTerm = searchInput.value.trim();
             hiddenInput.value = ''; // Clear hidden ID when user types
             selectedDisplay.textContent = 'Searching...';
             errorDisplay.style.display = 'none';
             searchInput.classList.remove('is-invalid');


             clearTimeout(debounceTimerAutocomplete);
             if (searchTerm.length < 2) { // Minimum characters to search
                 resultsList.innerHTML = '';
                 resultsList.style.display = 'none';
                 selectedDisplay.textContent = 'Type min 2 chars';
                 return;
             }

            debounceTimerAutocomplete = setTimeout(async () => {
                try {
                    // --- ⭐️ แก้ไขตรงนี้ ⭐️ ---
                    const params = { search: searchTerm, limit: 10 }; // ใช้ parameter 'search'
                    const result = await sendRequest(ITEM_SEARCH_API, 'get_items', 'GET', null, params); // ใช้ action 'get_items'
                    // --- ⭐️ สิ้นสุดการแก้ไข ⭐️ ---

                    resultsList.innerHTML = ''; // Clear previous results
                    if (result.success && result.data && result.data.length > 0) {
                        result.data.forEach(item => {
                             const div = document.createElement('div');
                             div.classList.add('autocomplete-item');
                             // Display SAP, Part No, and Description
                             div.innerHTML = `
                                 <span class="fw-bold">${item.sap_no || 'N/A'}</span> / ${item.part_no || 'N/A'}
                                 <small class="d-block text-muted">${item.part_description || 'No description'}</small>
                             `;
                             div.dataset.itemId = item.item_id;
                             div.dataset.itemText = `${item.sap_no || ''} / ${item.part_no || ''}`;
                             div.dataset.itemDetail = `${item.sap_no || 'N/A'} - ${item.part_description || 'N/A'}`;

                             div.addEventListener('click', () => {
                                 searchInput.value = div.dataset.itemText; // Update search input text
                                 hiddenInput.value = div.dataset.itemId; // Set the hidden ID
                                 selectedDisplay.textContent = div.dataset.itemDetail; // Update display span
                                 resultsList.style.display = 'none'; // Hide results
                                 errorDisplay.style.display = 'none';
                                 searchInput.classList.remove('is-invalid');
                             });
                             resultsList.appendChild(div);
                        });
                        resultsList.style.display = 'block';
                        selectedDisplay.textContent = 'Select from list...';
                    } else {
                        resultsList.innerHTML = '<div class="autocomplete-item text-muted">No items found.</div>';
                        resultsList.style.display = 'block';
                         selectedDisplay.textContent = 'No items found';
                    }
                } catch (error) {
                    console.error('Item autocomplete error:', error);
                    resultsList.innerHTML = '<div class="autocomplete-item text-danger">Error searching items.</div>';
                    resultsList.style.display = 'block';
                    selectedDisplay.textContent = 'Search Error';
                }
            }, 300); // 300ms debounce
        });

        // Hide results when clicking outside
         document.addEventListener('click', (e) => {
             if (!searchInput.contains(e.target) && !resultsList.contains(e.target)) {
                 resultsList.style.display = 'none';
                  // Check if an item was actually selected before hiding
                 if (!hiddenInput.value && searchInput.value) {
                      selectedDisplay.textContent = 'No Item Selected'; // Reset if nothing was chosen
                 }
             }
         });

         // Optional: Clear selection if input is cleared manually
         searchInput.addEventListener('change', () => { // Use change event
            if (searchInput.value.trim() === '') {
                 hiddenInput.value = '';
                 selectedDisplay.textContent = 'No Item Selected';
                 errorDisplay.style.display = 'none';
                 searchInput.classList.remove('is-invalid');
            }
         });
    }


    // =================================================================
    // SECTION 5: SHIPMENT FUNCTIONS (Mostly Unchanged)
    // =================================================================
    // ... (All functions from fetchShipments to executeReject remain largely the same,
    //      just ensure they use the correctly named variables like shipmentTableBody,
    //      currentShipmentPage, shipmentPaginationControls etc.) ...
    async function fetchShipments(page = 1) {
        if (!shipmentTab || !shipmentTab.classList.contains('active')) return;
        currentShipmentPage = page; showSpinner();
        shipmentTableBody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
        if(shipmentSummaryBar) shipmentSummaryBar.style.display = 'none';
        const selectedStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'all';
        const params = { page: currentShipmentPage, limit: ROWS_PER_PAGE, status: selectedStatus, search_term: shipmentSearchInput.value, startDate: shipmentStartDateInput.value, endDate: shipmentEndDateInput.value };
        try { /* ... rest of fetchShipments ... */
            const result = await sendRequest(SHIPMENT_API, 'get_shipments', 'GET', null, params);
            if (result.success && result.data) {
                renderShipmentsTable(result.data);
                if (typeof renderPagination === 'function') {
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
        } catch(e){/*...error handling...*/
             console.error("Error fetching shipments:", e);
             shipmentTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">An error occurred.</td></tr>`;
             shipmentPaginationControls.innerHTML = '';
              if (shipmentSummaryBar) shipmentSummaryBar.style.display = 'none';
        } finally { hideSpinner(); if(selectAllCheckbox) selectAllCheckbox.checked = false;}
    }
    function renderShipmentsTable(data) { /* ... function body ... */
         shipmentTableBody.innerHTML = '';
         if (data.length === 0) {
             shipmentTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No shipments found.</td></tr>`; return;
         }
         data.forEach(item=>{/* ... create row ... */
             const tr = document.createElement('tr'); tr.dataset.transactionId = item.transaction_id;
             const isPending = item.transaction_type === 'TRANSFER_PENDING_SHIPMENT';
             const isRejected = item.transaction_type === 'REJECTED_SHIPMENT';
             const requestDateObj = new Date(item.transaction_timestamp);
             const day = String(requestDateObj.getDate()).padStart(2, '0'); const month = String(requestDateObj.getMonth() + 1).padStart(2, '0'); const year = String(requestDateObj.getFullYear()).slice(-2); const hours = String(requestDateObj.getHours()).padStart(2, '0'); const minutes = String(requestDateObj.getMinutes()).padStart(2, '0'); const requestDateTimeFormatted = `${day}/${month}/${year} ${hours}:${minutes}`;
             let statusText = ''; let statusBadgeClass = '';
             if (isPending) {statusText = 'Pending'; statusBadgeClass = 'bg-warning text-dark'; } else if (item.transaction_type === 'SHIPPED') {statusText = 'Shipped'; statusBadgeClass = 'bg-success'; } else if (isRejected) {statusText = 'Rejected'; statusBadgeClass = 'bg-danger'; } else {statusText = item.transaction_type; statusBadgeClass = 'bg-secondary'; }
             const transferPath = `${item.from_location || 'N/A'} → ${item.to_location || 'N/A'}`;
             tr.innerHTML = `...`; // Same innerHTML as before
              tr.innerHTML = `<td class="text-center">${isPending ? `<input class="form-check-input row-checkbox" type="checkbox" value="${item.transaction_id}">` : ''}</td><td>${requestDateTimeFormatted}</td><td>${item.sap_no || ''} / ${item.part_no || ''}</td><td>${transferPath}</td><td class="text-center">${parseFloat(item.quantity).toLocaleString()}</td><td><span class="editable-note ${isRejected ? 'text-muted' : ''}" contenteditable="${!isRejected}" data-id="${item.transaction_id}" tabindex="0">${item.notes || ''}</span></td><td class="text-center"><span class="badge ${statusBadgeClass}">${statusText}</span></td><td class="text-center">${isPending ? `<button class="btn btn-sm btn-success confirm-single-btn" data-id="${item.transaction_id}" title="Confirm shipment"><i class="fas fa-check"></i></button><button class="btn btn-sm btn-danger reject-single-btn ms-1" data-id="${item.transaction_id}" title="Reject shipment"><i class="fas fa-ban"></i></button>` : ''}${isRejected ? `<span class="text-muted fst-italic">Rejected</span>` : ''}${item.transaction_type === 'SHIPPED' ? `<span class="text-muted fst-italic">Shipped</span>` : ''}</td>`;
             shipmentTableBody.appendChild(tr);
         });
    }
    async function handleConfirmShipment(transactionId) { /* ... function body ... */
         if (!transactionId || !confirm(`Confirm shipment ID: ${transactionId}?`)) return; showSpinner();
         try { const result = await sendRequest(SHIPMENT_API, 'confirm_shipment', 'POST', { transaction_ids: [transactionId] }); showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)'); if (result.success) await fetchShipments(currentShipmentPage); } finally { hideSpinner(); }
    }
    async function handleConfirmSelected() { /* ... function body ... */
         const selectedCheckboxes = shipmentTableBody.querySelectorAll('.row-checkbox:checked'); const transactionIdsToConfirm = Array.from(selectedCheckboxes).map(cb => cb.value); if (transactionIdsToConfirm.length === 0) { showToast('Please select shipments.', 'var(--bs-warning)'); return; } if (!confirm(`Confirm ${transactionIdsToConfirm.length} selected shipments?`)) return; showSpinner();
         try { const result = await sendRequest(SHIPMENT_API, 'confirm_shipment', 'POST', { transaction_ids: transactionIdsToConfirm }); showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)'); if (result.success || result.message.includes("No shipments were confirmed")) { await fetchShipments(1); } } finally { hideSpinner(); }
    }
    async function exportHistoryToExcel() { /* ... function body ... */
         showSpinner(); showToast('Preparing export...', 'var(--bs-info)'); const selectedStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'all'; const params = { limit: -1, status: selectedStatus, search_term: shipmentSearchInput.value, startDate: shipmentStartDateInput.value, endDate: shipmentEndDateInput.value };
         try { const result = await sendRequest(SHIPMENT_API, 'get_shipments', 'GET', null, params); if (result.success && result.data.length > 0) { const worksheetData = result.data.map(item => { /* mapping */ const dateObj = new Date(item.transaction_timestamp); const day = String(dateObj.getDate()).padStart(2, '0'); const month = String(dateObj.getMonth() + 1).padStart(2, '0'); const year = dateObj.getFullYear(); const dateFormatted = `${day}/${month}/${year}`; let statusText = item.transaction_type === 'TRANSFER_PENDING_SHIPMENT' ? 'Pending' : (item.transaction_type === 'SHIPPED' ? 'Shipped' : item.transaction_type); if (item.transaction_type === 'REJECTED_SHIPMENT') statusText = 'Rejected'; return {'Status': statusText,'Date': dateFormatted,'SAP No': item.sap_no,'Part No': item.part_no,'Quantity': parseFloat(item.quantity),'From': item.from_location,'To': item.to_location,'Notes': item.notes};}); const worksheet = XLSX.utils.json_to_sheet(worksheetData); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Shipments"); const startDate = shipmentStartDateInput.value || 'all'; const endDate = shipmentEndDateInput.value || 'all'; XLSX.writeFile(workbook, `Shipments_${selectedStatus}_${startDate}_to_${endDate}.xlsx`); showToast('Export successful!', 'var(--bs-success)'); } else { showToast(result.message || 'No data to export.', 'var(--bs-warning)'); } } finally { hideSpinner(); }
    }
    async function handleNoteEdit(transactionId, newNote) { /* ... function body ... */
         try { const result = await sendRequest(SHIPMENT_API, 'update_shipment_note', 'POST', { transaction_id: transactionId, notes: newNote }); if (!result.success) { showToast(result.message, 'var(--bs-danger)'); } else { const noteSpan = shipmentTableBody.querySelector(`.editable-note[data-id="${transactionId}"]`); if(noteSpan) { noteSpan.style.boxShadow = '0 0 0 2px var(--bs-success)'; setTimeout(() => { noteSpan.style.boxShadow = ''; }, 1500); } } } catch (error) { console.error("Error updating note:", error); showToast('Failed to update note.', 'var(--bs-danger)'); }
    }
    function openRejectModal(transactionIds) { /* ... function body ... */
         if (!Array.isArray(transactionIds) || transactionIds.length === 0) { showToast('No items selected.', 'var(--bs-warning)'); return; } rejectTransactionIdsInput.value = JSON.stringify(transactionIds); rejectReasonText.value = ''; rejectReasonModal.show();
    }
    async function executeReject() { /* ... function body ... */
         const transactionIds = JSON.parse(rejectTransactionIdsInput.value || '[]'); const reason = rejectReasonText.value; if (transactionIds.length === 0) return; rejectReasonModal.hide(); showSpinner();
         try { const result = await sendRequest(SHIPMENT_API, 'reject_shipment', 'POST', { transaction_ids: transactionIds, reason: reason }); showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)'); if (result.success || result.message.includes("No shipments were rejected")) { await fetchShipments(1); } } finally { hideSpinner(); }
    }
    function updateConfirmSelectedButtonState() { /* ... function body ... */
         const selectedCheckboxes = shipmentTableBody.querySelectorAll('.row-checkbox:checked'); const selectedCount = selectedCheckboxes.length; const selectedStatus = document.querySelector('input[name="shipmentStatus"]:checked')?.value || 'all'; if (confirmSelectedBtn) { confirmSelectedBtn.disabled = !(selectedCount > 0 && (selectedStatus === 'pending' || selectedStatus === 'all')); } if (rejectSelectedBtn) { rejectSelectedBtn.disabled = !(selectedCount > 0 && (selectedStatus === 'pending' || selectedStatus === 'all')); }
    }


    // =================================================================
    // SECTION 6: EVENT LISTENERS
    // =================================================================

    // --- Tab Switching ---
    const costPlanningTabElement = document.getElementById('cost-planning-tab'); // ⭐️ Get renamed tab element
    if (costPlanningTabElement && shipmentTab) {
        const triggerTabList = [].slice.call(document.querySelectorAll('#managementTab button'));
        triggerTabList.forEach(triggerEl => {
            const tabTrigger = new bootstrap.Tab(triggerEl);
            triggerEl.addEventListener('click', event => { event.preventDefault(); tabTrigger.show(); });
        });

        costPlanningTabElement.addEventListener('shown.bs.tab', () => { // ⭐️ Use renamed tab element
             console.log("Costing & Planning Tab shown");
             fetchCostSummary();
             handleDlotDateChange();
             fetchPlans(currentPlanPage); // ⭐️ Fetch plans when tab is shown
             if (shipmentPaginationControls) shipmentPaginationControls.style.display = 'none';
             if (planPaginationControls) planPaginationControls.style.display = 'flex'; // ⭐️ Show plan pagination
        });
        shipmentTab.addEventListener('shown.bs.tab', () => {
            console.log("Shipment Tab shown");
            fetchShipments(currentShipmentPage);
            if (shipmentPaginationControls) shipmentPaginationControls.style.display = 'flex';
             if (planPaginationControls) planPaginationControls.style.display = 'none'; // ⭐️ Hide plan pagination
        });
    }

    // --- DLOT & Cost Summary ---
    btnRefreshCostSummary?.addEventListener('click', fetchCostSummary);
    costSummaryStartDateInput?.addEventListener('change', fetchCostSummary);
    costSummaryEndDateInput?.addEventListener('change', fetchCostSummary);
    costSummaryLineSelect?.addEventListener('change', fetchCostSummary);
    dlotEntryForm?.addEventListener('submit', handleSaveDlotForm);
    dlotEntryDateInput?.addEventListener('change', handleDlotDateChange);
    dlotEntryLineSelect?.addEventListener('change', handleDlotDateChange);

    // --- Planning Filters & Buttons ---
    planDateFilter?.addEventListener('change', () => fetchPlans(1));
    planLineFilter?.addEventListener('change', () => fetchPlans(1));
    planShiftFilter?.addEventListener('change', () => fetchPlans(1));
    btnRefreshPlan?.addEventListener('click', () => fetchPlans(currentPlanPage));
    btnAddPlan?.addEventListener('click', () => openPlanModal(null));
    savePlanButton?.addEventListener('click', savePlan);
    deletePlanButton?.addEventListener('click', deletePlan);

    // --- ⭐️ Planning Table Event Delegation (Edit/Delete/Note Edit) ---
    productionPlanTableBody?.addEventListener('click', (e) => {
        const editButton = e.target.closest('.edit-plan-btn');
        if (editButton) {
            const row = editButton.closest('tr');
            if (row && row.dataset.planData) {
                 try {
                     const planData = JSON.parse(row.dataset.planData);
                     openPlanModal(planData); // Open modal in Edit mode
                 } catch (err) { console.error("Failed to parse plan data from row:", err); }
            }
            return;
        }
        const deleteButton = e.target.closest('.delete-plan-btn');
        if (deleteButton) {
            const row = deleteButton.closest('tr');
             const planId = row?.dataset.planId;
             if (planId) {
                 // Open modal first to confirm, then call deletePlan OR directly confirm and delete
                 // For simplicity, let's confirm directly for now
                  if (confirm(`Are you sure you want to delete plan ID: ${planId}?`)) {
                      showSpinner(); // Show spinner immediately
                      // Simulate opening modal to reuse deletePlan logic needing planModalPlanId
                      planModalPlanId.value = planId;
                      deletePlan().finally(hideSpinner); // Call delete and ensure spinner hides
                      planModalPlanId.value = '0'; // Reset after deletion attempt
                  }
             }
             return;
        }
    });

    productionPlanTableBody?.addEventListener('blur', (e) => { // ⭐️ Updated Blur Listener ⭐️
        if (e.target.classList.contains('editable-plan')) {
            const span = e.target;
            const planId = parseInt(span.dataset.id);
            const field = span.dataset.field;
            const newValue = span.textContent.trim();
            const row = span.closest('tr');
            if (!row || !planId) return; // Exit if row or planId is missing

            const originalData = JSON.parse(row?.dataset.planData || '{}');

            if (field === 'note') {
                const originalNote = originalData.note || '';
                if (newValue !== originalNote) {
                    clearTimeout(planNoteEditDebounceTimer);
                    planNoteEditDebounceTimer = setTimeout(() => { handlePlanNoteEdit(planId, newValue); }, 300);
                } else {
                    span.textContent = originalNote; // Revert if no actual change
                }
            }
            // ⭐️ Handle Carry Over Edit ⭐️
            else if (field === 'carry_over') {
                const originalCarryOver = parseFloat(originalData.carry_over_quantity || 0);
                const numericValueString = newValue.replace(/,/g, ''); // Remove commas
                let newCarryOverValue = parseFloat(numericValueString);

                // Validate: Must be a non-negative number
                if (isNaN(newCarryOverValue) || newCarryOverValue < 0) {
                     showToast('Invalid Carry Over. Please enter a non-negative number.', 'var(--bs-warning)');
                     span.textContent = originalCarryOver.toLocaleString(); // Revert to original formatted value
                     return;
                }
                 // Ensure it's treated as a number
                 newCarryOverValue = parseFloat(newCarryOverValue.toFixed(2)); // Round to 2 decimals if needed

                // Only call API if the numeric value actually changed
                if (newCarryOverValue !== originalCarryOver) {
                     clearTimeout(planCarryOverEditDebounceTimer);
                     // Using a short debounce might prevent accidental double calls if blur happens quickly
                     planCarryOverEditDebounceTimer = setTimeout(() => { handleCarryOverEdit(planId, newCarryOverValue, span); }, 200);
                } else {
                     // If value didn't change numerically, just reformat the original value
                     span.textContent = originalCarryOver.toLocaleString();
                }
            }
        }
    }, true);

    productionPlanTableBody?.addEventListener('keydown', (e) => { // ⭐️ Updated Keydown Listener ⭐️
        if (e.target.classList.contains('editable-plan')) {
             const field = e.target.dataset.field;

             // Allow only numbers, one decimal point, and comma for carry_over
             if (field === 'carry_over') {
                 // Allow numbers, backspace, delete, arrows, tab, enter, comma, period
                 if (!/[0-9.,]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key)) {
                     e.preventDefault();
                 }
                 // Prevent multiple decimal points
                 if (e.key === '.' && e.target.textContent.includes('.')) {
                     e.preventDefault();
                 }
                 // Prevent comma at the start? (Optional)
             }

             // Trigger blur (save) on Enter
             if (e.key === 'Enter') {
                 e.preventDefault();
                 e.target.blur();
             }
             // Optional: Revert on Escape key?
             // if (e.key === 'Escape') {
             //     const row = e.target.closest('tr');
             //     const originalData = JSON.parse(row?.dataset.planData || '{}');
             //     if (field === 'note') e.target.textContent = originalData.note || '';
             //     if (field === 'carry_over') e.target.textContent = parseFloat(originalData.carry_over_quantity || 0).toLocaleString();
             //     e.target.blur();
             // }
        }
    });

    // --- ⭐️ Planning Catch-up Button ---
    btnCalculateCarryOver?.addEventListener('click', async () => {
        if (!confirm('This will calculate carry-over values sequentially up to today based on previous data. This might take some time and overwrite manual adjustments made after the last calculation. Continue?')) {
            return;
        }
        showSpinner();
        btnCalculateCarryOver.disabled = true; // Disable button during calculation

        try {
            // Call the API action, let the API determine the start date
            const result = await sendRequest(PLAN_API, 'calculate_carry_over', 'GET');
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                // Refresh the plan table to show updated carry-over values
                await fetchPlans(currentPlanPage); // Refresh current page (หรือ page 1)
            }
        } catch (error) {
            console.error("Error triggering carry-over calculation:", error);
            showToast('An error occurred during calculation.', 'var(--bs-danger)');
        } finally {
            hideSpinner();
            btnCalculateCarryOver.disabled = false; // Re-enable button
        }
    });

    // --- Shipment Filters/Buttons/Table Events ---
    // ... (All Shipment event listeners remain the same, ensure they use correct variable names) ...
     shipmentSearchInput?.addEventListener('input', () => { clearTimeout(searchDebounceTimer); searchDebounceTimer = setTimeout(() => fetchShipments(1), 500); });
     shipmentStartDateInput?.addEventListener('change', () => fetchShipments(1));
     shipmentEndDateInput?.addEventListener('change', () => fetchShipments(1));
     exportHistoryBtn?.addEventListener('click', exportHistoryToExcel);
     statusFilterRadios.forEach(radio => { radio.addEventListener('change', () => { fetchShipments(1); /*... rest of listener ...*/ const isViewOnly = radio.value === 'shipped' || radio.value === 'rejected'; if (confirmSelectedBtn) confirmSelectedBtn.style.display = isViewOnly ? 'none' : 'inline-block'; if (rejectSelectedBtn) rejectSelectedBtn.style.display = isViewOnly ? 'none' : 'inline-block'; if (selectAllCheckbox) { selectAllCheckbox.style.visibility = isViewOnly ? 'hidden' : 'visible'; if (isViewOnly) selectAllCheckbox.checked = false; } updateConfirmSelectedButtonState(); }); });
     selectAllCheckbox?.addEventListener('change', (e) => { shipmentTableBody.querySelectorAll('.row-checkbox').forEach(checkbox => { checkbox.checked = e.target.checked; }); updateConfirmSelectedButtonState(); });
     if (shipmentTableBody) { shipmentTableBody.addEventListener('change', (e) => { if (e.target.classList.contains('row-checkbox')) { /*... rest of listener ...*/ const allCheckboxes = shipmentTableBody.querySelectorAll('.row-checkbox'); const checkedCount = shipmentTableBody.querySelectorAll('.row-checkbox:checked').length; if (selectAllCheckbox) { selectAllCheckbox.checked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length; } updateConfirmSelectedButtonState(); } }); }
     confirmSelectedBtn?.addEventListener('click', handleConfirmSelected);
     rejectSelectedBtn?.addEventListener('click', () => { const selectedCheckboxes = shipmentTableBody.querySelectorAll('.row-checkbox:checked'); const transactionIdsToReject = Array.from(selectedCheckboxes).map(cb => cb.value); openRejectModal(transactionIdsToReject); });
     confirmRejectBtn?.addEventListener('click', executeReject);
     if (shipmentTableBody) {
         shipmentTableBody.addEventListener('click', (e) => { const confirmButton = e.target.closest('.confirm-single-btn'); if (confirmButton) { handleConfirmShipment(confirmButton.dataset.id); return; } const rejectButton = e.target.closest('.reject-single-btn'); if (rejectButton) { openRejectModal([rejectButton.dataset.id]); return; } });
         shipmentTableBody.addEventListener('blur', (e) => { if (e.target.classList.contains('editable-note') && !e.target.classList.contains('text-muted')) { const span = e.target; const transactionId = span.dataset.id; const newNote = span.textContent.trim(); clearTimeout(noteEditDebounceTimer); noteEditDebounceTimer = setTimeout(() => { handleNoteEdit(transactionId, newNote); }, 300); } }, true);
         shipmentTableBody.addEventListener('keydown', (e) => { if (e.target.classList.contains('editable-note') && e.key === 'Enter' && !e.target.classList.contains('text-muted')) { e.preventDefault(); e.target.blur(); } });
     }


    // =================================================================
    // SECTION 7: INITIALIZATION
    // =================================================================

    setAllDefaultDates();
    fetchDashboardLines()
     .then(fetchAllItemsForPlanning) // Fetch items after lines
     .then(() => {
        // Initial load depends on active tab
        const activeTabButton = document.querySelector('#managementTab button.active');
        if (activeTabButton && activeTabButton.id === 'shipment-tab') {
            fetchShipments(1);
            if (shipmentPaginationControls) shipmentPaginationControls.style.display = 'flex';
            if (planPaginationControls) planPaginationControls.style.display = 'none';
        } else {
            fetchCostSummary();
            handleDlotDateChange();
            fetchPlans(1);
            if (shipmentPaginationControls) shipmentPaginationControls.style.display = 'none';
            if (planPaginationControls) planPaginationControls.style.display = 'flex';
        }
    });

    if(confirmSelectedBtn) confirmSelectedBtn.style.display = 'none';
    if(rejectSelectedBtn) rejectSelectedBtn.style.display = 'none';

});