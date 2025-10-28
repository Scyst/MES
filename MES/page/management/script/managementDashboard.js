"use strict";
document.addEventListener('DOMContentLoaded', () => {

    let allPlanningItems = [];
    let selectedPlanItem = null;
    let planVsActualChartInstance = null;

    const mainContent = document.getElementById('main-content');
    const planModalElement = document.getElementById('planModal');
    const planModal = new bootstrap.Modal(planModalElement);

    const planDateFilter = document.getElementById('planDateFilter');
    const planLineFilter = document.getElementById('planLineFilter');
    const planShiftFilter = document.getElementById('planShiftFilter');
    const btnRefreshPlan = document.getElementById('btn-refresh-plan');
    const btnAddPlan = document.getElementById('btnAddPlan');
    const btnCalculateCarryOver = document.getElementById('btnCalculateCarryOver');

    const chartDateDisplay = document.getElementById('chartDateDisplay');
    const planVsActualChartCanvas = document.getElementById('planVsActualChart');
    const productionPlanTableBody = document.getElementById('productionPlanTableBody');
    const planningCalendarContainer = document.getElementById('planningCalendarContainer');

    const planModalLabel = document.getElementById('planModalLabel');
    const planForm = document.getElementById('planForm');
    const planModalPlanId = document.getElementById('planModalPlanId');
    const planModalDate = document.getElementById('planModalDate');
    const planModalLine = document.getElementById('planModalLine');
    const planModalShift = document.getElementById('planModalShift');
    const planModalItemSearch = document.getElementById('planModalItemSearch');
    const planModalSelectedItem = document.getElementById('planModalSelectedItem');
    const planModalItemId = document.getElementById('planModalItemId');
    const planModalItemResults = document.getElementById('planModalItemResults');
    const itemSearchError = document.getElementById('item-search-error');
    const planModalQuantity = document.getElementById('planModalQuantity');
    const planModalNote = document.getElementById('planModalNote');
    const savePlanButton = document.getElementById('savePlanButton');
    const deletePlanButton = document.getElementById('deletePlanButton');

    let planNoteEditDebounceTimer;
    let planCarryOverEditDebounceTimer;
    let debounceTimerAutocomplete;

    function formatDateForInput(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            console.error("Invalid date:", date);
            return new Date().toISOString().split('T')[0];
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function setAllDefaultDates() {
        const today = new Date();
        const todayFormatted = formatDateForInput(today);
        if (planDateFilter && !planDateFilter.value) planDateFilter.value = todayFormatted;
    }

    async function fetchDashboardLines() {
        try {
            const result = await sendRequest(FILTERS_API, 'get_filters', 'GET');
            if (result.success && result.data && result.data.lines) {
                const lines = result.data.lines;
                [planLineFilter, planModalLine].forEach(select => {
                    if (select) {
                        const valueToKeep = (select.id === 'planLineFilter' || select.id === 'planModalLine') ? "" : "ALL";
                        const optionsToRemove = select.querySelectorAll(`option:not([value="${valueToKeep}"])`);
                        optionsToRemove.forEach(opt => opt.remove());
                        lines.forEach(line => {
                            select.appendChild(new Option(line, line));
                        });
                    }
                });
                 if (planModalLine && !planModalLine.querySelector('option[value=""]')) {
                     const defaultOption = new Option("Select Line...", "", true, true);
                     defaultOption.disabled = true;
                     planModalLine.prepend(defaultOption);
                 }
            } else {
                console.warn("Lines data missing.", result);
                showToast('Could not retrieve production lines.', 'var(--bs-warning)');
            }
        } catch (error) {
            console.error("Error fetching lines:", error);
            showToast('Failed to load production lines.', 'var(--bs-danger)');
        }
    }

    async function fetchPlans() {
        showSpinner();
        productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center">Loading plans...</td></tr>`;

        const params = {
            planDate: planDateFilter.value,
            line: planLineFilter.value || null,
            shift: planShiftFilter.value || null,
        };

        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);

            if (result.success && result.data) {
                renderPlanTable(result.data);
                renderPlanVsActualChart(result.data);
            } else {
                productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">${result.message || 'Failed to load plans.'}</td></tr>`;
                renderPlanVsActualChart([]);
            }
        } catch (error) {
            console.error("Error fetching plans:", error);
            productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">An error occurred.</td></tr>`;
            renderPlanVsActualChart([]);
        } finally {
            hideSpinner();
        }
    }

    function renderPlanTable(data) {
        productionPlanTableBody.innerHTML = '';
        if (!data || data.length === 0) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No plans found for selected date/filters.</td></tr>`;
            return;
        }

        data.forEach(plan => {
            const tr = document.createElement('tr');
            tr.dataset.planId = plan.plan_id;
            tr.dataset.planData = JSON.stringify(plan);

            const originalPlan = parseFloat(plan.original_planned_quantity || 0);
            const carryOver = parseFloat(plan.carry_over_quantity || 0);
            const adjustedPlan = parseFloat(plan.adjusted_planned_quantity || 0);
            const actualQty = parseFloat(plan.actual_quantity || 0);

            let actualClass = '';
            if (actualQty < adjustedPlan) {
                actualClass = 'text-danger';
            } else if (actualQty >= adjustedPlan && adjustedPlan > 0) {
                actualClass = 'text-success';
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

     function renderPlanVsActualChart(planData) {
         const chartCanvas = planVsActualChartCanvas;
         if (!chartCanvas) return;
         const ctx = chartCanvas.getContext('2d');

         if (chartDateDisplay) {
            chartDateDisplay.textContent = planDateFilter.value || 'Selected Date';
         }

         const labels = planData.map(p => p.sap_no || p.part_no || 'N/A');
         const adjustedPlanData = planData.map(p => parseFloat(p.adjusted_planned_quantity || 0));
         const actualQtyData = planData.map(p => parseFloat(p.actual_quantity || 0));

         const chartData = {
             labels: labels,
             datasets: [{
                 label: 'Adjusted Plan',
                 data: adjustedPlanData,
                 backgroundColor: 'rgba(54, 162, 235, 0.7)',
                 borderColor: 'rgba(54, 162, 235, 1)',
                 borderWidth: 1
             }, {
                 label: 'Actual Qty',
                 data: actualQtyData,
                 backgroundColor: (context) => {
                       const index = context.dataIndex;
                       if (index >= adjustedPlanData.length) return 'rgba(201, 203, 207, 0.7)';
                       const planValue = adjustedPlanData[index];
                       const actualValue = actualQtyData[index];
                       if (actualValue < planValue) return 'rgba(255, 99, 132, 0.7)';
                       else if (actualValue >= planValue && planValue > 0) return 'rgba(75, 192, 192, 0.7)';
                       return 'rgba(201, 203, 207, 0.7)';
                 },
                 borderColor: (context) => {
                      const index = context.dataIndex;
                      if (index >= adjustedPlanData.length) return 'rgba(201, 203, 207, 1)';
                      const planValue = adjustedPlanData[index];
                      const actualValue = actualQtyData[index];
                      if (actualValue < planValue) return 'rgba(255, 99, 132, 1)';
                      else if (actualValue >= planValue && planValue > 0) return 'rgba(75, 192, 192, 1)';
                      return 'rgba(201, 203, 207, 1)';
                 },
                 borderWidth: 1
             }]
         };

         const chartOptions = {
             responsive: true,
             maintainAspectRatio: false,
             scales: {
                 y: {
                     beginAtZero: true,
                     title: { display: true, text: 'Quantity' },
                     ticks: { callback: function(value) { return value.toLocaleString(); } },
                     suggestedMax: Math.max(...adjustedPlanData, ...actualQtyData) * 1.1
                 },
                 x: {
                      ticks: {
                         maxRotation: 0,
                         minRotation: 0,
                         font: { size: 12 },
                         autoSkip: true,
                         maxTicksLimit: 15
                      }
                 }
             },
             plugins: {
                 legend: { position: 'top' },
                 tooltip: {
                      callbacks: {
                           label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) { label += context.parsed.y.toLocaleString(); }
                                return label;
                           }
                      }
                 },
                 datalabels: {
                      anchor: 'end',
                      align: 'top',
                      formatter: (value, context) => { return value > 0 ? value.toLocaleString() : ''; },
                      font: { size: 10 },
                      color: '#444'
                 }
             }
         };

         if (planVsActualChartInstance) {
             planVsActualChartInstance.destroy();
         }

         const availablePlugins = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];
         planVsActualChartInstance = new Chart(ctx, {
             type: 'bar',
             data: chartData,
             options: chartOptions,
             plugins: availablePlugins
         });
         if (availablePlugins.length === 0){
              console.warn("ChartDataLabels plugin not found.");
         }
     }

    async function handlePlanNoteEdit(planId, newNote) {
        const planRow = productionPlanTableBody?.querySelector(`tr[data-plan-id="${planId}"]`);
        if (!planRow || !planRow.dataset.planData) return;
        try {
            const existingPlan = JSON.parse(planRow.dataset.planData);
            const body = { action: 'save_plan', plan_id: planId, plan_date: existingPlan.plan_date, line: existingPlan.line, shift: existingPlan.shift, item_id: existingPlan.item_id, original_planned_quantity: existingPlan.original_planned_quantity, note: newNote };
            const result = await sendRequest(PLAN_API, 'save_plan', 'POST', body);
            if (!result.success) {
                showToast(result.message || 'Failed.', 'var(--bs-danger)');
                const noteSpan = planRow.querySelector('.editable-plan[data-field="note"]');
                if (noteSpan) noteSpan.textContent = existingPlan.note || '';
            } else {
                existingPlan.note = newNote; planRow.dataset.planData = JSON.stringify(existingPlan);
                const noteSpan = planRow.querySelector('.editable-plan[data-field="note"]');
                 if(noteSpan) { noteSpan.style.boxShadow = '0 0 0 2px var(--bs-success)'; setTimeout(() => { noteSpan.style.boxShadow = ''; }, 1500); }
            }
        } catch (error) { console.error("Error:", error); showToast('Error.', 'var(--bs-danger)'); }
    }

    async function handleCarryOverEdit(planId, newCarryOverValue, spanElement) {
        showSpinner();
        const row = spanElement.closest('tr');
        const originalData = JSON.parse(row?.dataset.planData || '{}');
        const originalCarryOver = parseFloat(originalData.carry_over_quantity || 0);
        const body = { action: 'update_carry_over', plan_id: planId, carry_over_quantity: newCarryOverValue };
        try {
            const result = await sendRequest(PLAN_API, 'update_carry_over', 'POST', body);
            if (result.success) {
                showToast(result.message || 'Updated.', 'var(--bs-success)');
                originalData.carry_over_quantity = newCarryOverValue;
                const originalPlan = parseFloat(originalData.original_planned_quantity || 0);
                const newAdjustedPlan = originalPlan + newCarryOverValue;
                originalData.adjusted_planned_quantity = newAdjustedPlan;
                row.dataset.planData = JSON.stringify(originalData);
                const adjustedPlanCell = row.querySelector('td[data-field="adjusted_plan"]');
                if (adjustedPlanCell) { adjustedPlanCell.textContent = newAdjustedPlan.toLocaleString(); }
                 spanElement.textContent = newCarryOverValue.toLocaleString(); spanElement.classList.toggle('text-warning', newCarryOverValue > 0);
                spanElement.style.boxShadow = '0 0 0 2px var(--bs-success)'; setTimeout(() => { spanElement.style.boxShadow = ''; }, 1500);
            } else {
                showToast(result.message || 'Failed.', 'var(--bs-danger)');
                spanElement.textContent = originalCarryOver.toLocaleString(); spanElement.classList.toggle('text-warning', originalCarryOver > 0);
            }
        } catch (error) {
            console.error("Error:", error); showToast('Error.', 'var(--bs-danger)');
            spanElement.textContent = originalCarryOver.toLocaleString(); spanElement.classList.toggle('text-warning', originalCarryOver > 0);
        } finally { hideSpinner(); }
    }

    function resetPlanModal() {
        planModalLabel.textContent = 'Add New Production Plan';
        if (planForm) planForm.reset();
        planModalPlanId.value = '0'; planModalItemId.value = '';
        planModalSelectedItem.textContent = 'No Item Selected';
        planModalItemSearch.classList.remove('is-invalid'); itemSearchError.style.display = 'none';
        deletePlanButton.style.display = 'none';
        planModalDate.value = planDateFilter.value || formatDateForInput(new Date());
        planModalLine.value = planLineFilter.value || ""; planModalShift.value = planShiftFilter.value || "";
        if (planModalItemResults) { planModalItemResults.innerHTML = ''; planModalItemResults.style.display = 'none'; }
    }

    function openPlanModal(planData = null) {
        resetPlanModal();
        if (planData) {
            planModalLabel.textContent = 'Edit Production Plan';
            planModalPlanId.value = planData.plan_id; planModalDate.value = planData.plan_date;
            planModalLine.value = planData.line; planModalShift.value = planData.shift;
            planModalQuantity.value = planData.original_planned_quantity; planModalNote.value = planData.note || '';
            planModalItemId.value = planData.item_id; planModalItemSearch.value = `${planData.sap_no || ''} / ${planData.part_no || ''}`;
            planModalSelectedItem.textContent = `${planData.sap_no || 'N/A'} - ${planData.part_description || 'N/A'}`;
            deletePlanButton.style.display = 'inline-block';
        } else {
            planModalDate.value = planDateFilter.value || formatDateForInput(new Date());
            planModalLine.value = planLineFilter.value || ""; planModalShift.value = planShiftFilter.value || "";
        }
        planModal.show();
    }

    async function savePlan() {
        if (!planForm || !planForm.checkValidity()) { planForm?.reportValidity(); return; }
        if (!planModalItemId.value) { planModalItemSearch.classList.add('is-invalid'); itemSearchError.style.display = 'block'; showToast('Please select item.', 'var(--bs-warning)'); return; }
        else { planModalItemSearch.classList.remove('is-invalid'); itemSearchError.style.display = 'none'; }

        showSpinner(); savePlanButton.disabled = true; deletePlanButton.disabled = true;
        const body = { action: 'save_plan', plan_id: planModalPlanId.value || 0, plan_date: planModalDate.value, line: planModalLine.value, shift: planModalShift.value, item_id: planModalItemId.value, original_planned_quantity: planModalQuantity.value, note: planModalNote.value || null };

        try {
            const result = await sendRequest(PLAN_API, 'save_plan', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) { planModal.hide(); fetchPlans(); }
        } catch (error) { console.error("Error:", error); showToast('Error.', 'var(--bs-danger)'); }
        finally { hideSpinner(); savePlanButton.disabled = false; deletePlanButton.disabled = false; }
    }

    async function deletePlan() {
        const planId = planModalPlanId.value; if (!planId || planId === '0') return;
        if (!confirm(`Delete plan ID: ${planId}?`)) return;

        showSpinner(); savePlanButton.disabled = true; deletePlanButton.disabled = true;
        const body = { action: 'delete_plan', plan_id: planId };

        try {
            const result = await sendRequest(PLAN_API, 'delete_plan', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) { planModal.hide(); fetchPlans(); }
        } catch (error) { console.error("Error:", error); showToast('Error.', 'var(--bs-danger)'); }
        finally { hideSpinner(); savePlanButton.disabled = false; deletePlanButton.disabled = false; }
    }

    function setupPlanItemAutocomplete() {
        const searchInput = planModalItemSearch; const resultsWrapper = planModalItemResults;
        const selectedDisplay = planModalSelectedItem; const hiddenInput = planModalItemId;
        const errorDisplay = itemSearchError;
        if (!searchInput || !resultsWrapper || !selectedDisplay || !hiddenInput || !errorDisplay) { console.error("Autocomplete elements missing."); return; }

        searchInput.addEventListener('input', () => {
            const value = searchInput.value.toLowerCase().trim();
            resultsWrapper.innerHTML = ''; hiddenInput.value = ''; selectedPlanItem = null;
            selectedDisplay.textContent = 'Searching...'; errorDisplay.style.display = 'none'; searchInput.classList.remove('is-invalid');
            if (value.length < 2) { resultsWrapper.style.display = 'none'; selectedDisplay.textContent = 'Type min 2 chars'; return; }

            const filteredItems = allPlanningItems.filter(item => item.sap_no?.toLowerCase().includes(value) || item.part_no?.toLowerCase().includes(value) || item.part_description?.toLowerCase().includes(value) ).slice(0, 10);
            if (filteredItems.length > 0) {
                filteredItems.forEach(item => {
                    const div = document.createElement('div'); div.classList.add('autocomplete-item', 'dropdown-item'); div.style.cursor = 'pointer';
                    div.innerHTML = `<span class="fw-bold">${item.sap_no || 'N/A'}</span> / ${item.part_no || 'N/A'}<small class="d-block text-muted">${item.part_description || ''}</small>`;
                    div.dataset.itemId = item.item_id; div.dataset.itemText = `${item.sap_no || ''} / ${item.part_no || ''}`; div.dataset.itemDetail = `${item.sap_no || 'N/A'} - ${item.part_description || 'N/A'}`;
                    div.addEventListener('click', (e) => { e.stopPropagation(); searchInput.value = div.dataset.itemText; hiddenInput.value = div.dataset.itemId; selectedDisplay.textContent = div.dataset.itemDetail; selectedPlanItem = item; resultsWrapper.innerHTML = ''; resultsWrapper.style.display = 'none'; errorDisplay.style.display = 'none'; searchInput.classList.remove('is-invalid'); });
                    resultsWrapper.appendChild(div);
                });
                resultsWrapper.style.display = 'block'; selectedDisplay.textContent = 'Select from list...';
            } else {
                resultsWrapper.innerHTML = '<div class="autocomplete-item text-muted dropdown-item disabled">No items found.</div>';
                resultsWrapper.style.display = 'block'; selectedDisplay.textContent = 'No items found';
            }
        });

        document.addEventListener('click', (e) => { if (resultsWrapper && !searchInput.contains(e.target) && !resultsWrapper.contains(e.target)) { resultsWrapper.style.display = 'none'; } });
        searchInput.addEventListener('change', () => { if (searchInput.value.trim() === '') { hiddenInput.value = ''; selectedPlanItem = null; selectedDisplay.textContent = 'No Item Selected'; errorDisplay.style.display = 'none'; searchInput.classList.remove('is-invalid'); } });
    }

    async function fetchAllItemsForPlanning() {
         console.log("Fetching items...");
         try {
             const params = { limit: -1, show_inactive: false };
             const result = await sendRequest(ITEM_SEARCH_API, 'get_items', 'GET', null, params);
             if (result.success && result.data) { allPlanningItems = result.data; setupPlanItemAutocomplete(); }
             else { console.error("Failed load items:", result.message); showToast('Error.', 'var(--bs-danger)'); }
         } catch (error) { console.error("Error fetching items:", error); showToast('Failed.', 'var(--bs-danger)'); }
    }

    // SECTION 5: EVENT LISTENERS

    planDateFilter?.addEventListener('change', fetchPlans);
    planLineFilter?.addEventListener('change', fetchPlans);
    planShiftFilter?.addEventListener('change', fetchPlans);
    btnRefreshPlan?.addEventListener('click', fetchPlans);
    btnAddPlan?.addEventListener('click', () => openPlanModal(null));
    savePlanButton?.addEventListener('click', savePlan);
    deletePlanButton?.addEventListener('click', deletePlan);

    btnCalculateCarryOver?.addEventListener('click', async () => {
        if (!confirm('Calculate carry-over up to today?')) return;
        showSpinner(); btnCalculateCarryOver.disabled = true;
        try {
            const result = await sendRequest(PLAN_API, 'calculate_carry_over', 'GET');
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) { await fetchPlans(); }
        } catch (error) { console.error("Error calc carry-over:", error); showToast('Error.', 'var(--bs-danger)'); }
        finally { hideSpinner(); btnCalculateCarryOver.disabled = false; }
    });

    productionPlanTableBody?.addEventListener('click', (e) => {
        const editButton = e.target.closest('.edit-plan-btn');
        if (editButton) { const row = editButton.closest('tr'); if (row && row.dataset.planData) { try { openPlanModal(JSON.parse(row.dataset.planData)); } catch (err) { console.error("Err parse plan data:", err); } } return; }
        const deleteButton = e.target.closest('.delete-plan-btn');
        if (deleteButton) { const row = deleteButton.closest('tr'); const planId = row?.dataset.planId; if (planId) { if (confirm(`Delete plan ID: ${planId}?`)) { showSpinner(); planModalPlanId.value = planId; deletePlan().finally(hideSpinner); planModalPlanId.value = '0'; } } return; }
    });

    productionPlanTableBody?.addEventListener('blur', (e) => {
        if (e.target.classList.contains('editable-plan')) {
            const span = e.target; const planId = parseInt(span.dataset.id); const field = span.dataset.field; const newValue = span.textContent.trim(); const row = span.closest('tr'); if (!row || !planId) return;
            const originalData = JSON.parse(row?.dataset.planData || '{}');
            if (field === 'note') { const originalNote = originalData.note || ''; if (newValue !== originalNote) { clearTimeout(planNoteEditDebounceTimer); planNoteEditDebounceTimer = setTimeout(() => { handlePlanNoteEdit(planId, newValue); }, 300); } else { span.textContent = originalNote; } }
            else if (field === 'carry_over') { const originalCarryOver = parseFloat(originalData.carry_over_quantity || 0); const numericValueString = newValue.replace(/,/g, ''); let newCarryOverValue = parseFloat(numericValueString); if (isNaN(newCarryOverValue) || newCarryOverValue < 0) { showToast('Invalid Carry Over.', 'var(--bs-warning)'); span.textContent = originalCarryOver.toLocaleString(); return; } newCarryOverValue = parseFloat(newCarryOverValue.toFixed(2)); if (newCarryOverValue !== originalCarryOver) { clearTimeout(planCarryOverEditDebounceTimer); planCarryOverEditDebounceTimer = setTimeout(() => { handleCarryOverEdit(planId, newCarryOverValue, span); }, 200); } else { span.textContent = originalCarryOver.toLocaleString(); } }
        }
    }, true);

    productionPlanTableBody?.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('editable-plan')) { const field = e.target.dataset.field; if (field === 'carry_over') { if (!/[0-9.,]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key)) { e.preventDefault(); } if (e.key === '.' && e.target.textContent.includes('.')) { e.preventDefault(); } } if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }
    });

    // SECTION 6: INITIALIZATION
    setAllDefaultDates();
    fetchDashboardLines()
     .then(fetchAllItemsForPlanning)
     .then(() => {
         fetchPlans();
     });

});