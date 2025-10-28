"use strict";
document.addEventListener('DOMContentLoaded', () => {

    // SECTION 1: GLOBAL VARIABLES & CONSTANTS
    let allPlanningItems = [];
    let selectedPlanItem = null;
    let planVsActualChartInstance = null;
    let fullCalendarInstance = null;

    let planNoteEditDebounceTimer;
    let planCarryOverEditDebounceTimer;
    let debounceTimerAutocomplete;

    // SECTION 2: DOM ELEMENT REFERENCES
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
    const calendarCardHeader = document.querySelector('.calendar-card .card-header');
    const calendarTitle = document.getElementById('calendar-title');
    const backToCalendarBtn = document.getElementById('backToCalendarBtn');
    const planningCalendarContainer = document.getElementById('planningCalendarContainer');
    const dlotViewContainer = document.getElementById('dlotViewContainer');
    const dlotDateDisplayCost = document.getElementById('dlotDateDisplayCost');
    const dlotDateDisplayEntry = document.getElementById('dlotDateDisplayEntry');
    const dlotEntryForm = document.getElementById('dlot-entry-form');
    const dlotEntryDateInputHidden = document.getElementById('dlot-entry-date');
    const dlotEntryLineSelect = document.getElementById('dlot-entry-line');
    const dlotHeadcountInput = document.getElementById('dlot-headcount');
    const dlotDlCostInput = document.getElementById('dlot-dl-cost');
    const dlotOtCostInput = document.getElementById('dlot-ot-cost');
    const btnSaveDlot = document.getElementById('btn-save-dlot');
    const costSummaryLineSelectDlot = document.getElementById('cost-summary-line-dlot');
    const btnRefreshCostSummaryDlot = document.getElementById('btn-refresh-cost-summary-dlot');
    const stdDlCostDisplayDlot = document.getElementById('std-dl-cost-display-dlot');
    const actualDlotCostDisplayDlot = document.getElementById('actual-dlot-cost-display-dlot');
    const dlVarianceDisplayDlot = document.getElementById('dl-variance-display-dlot');
    const varianceCardDlot = document.getElementById('variance-card-dlot');
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

    // SECTION 3: HELPER FUNCTIONS
    function formatDateForInput(date) {
        if (!(date instanceof Date) || isNaN(date)) { console.error("Invalid date:", date); return new Date().toISOString().split('T')[0]; }
        const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // SECTION 4: INITIAL DATA LOADING & SETUP
    function setAllDefaultDates() {
        const today = new Date(); const todayFormatted = formatDateForInput(today);
        if (planDateFilter && !planDateFilter.value) planDateFilter.value = todayFormatted;
    }

    async function fetchDashboardLines() {
        try {
            const result = await sendRequest(FILTERS_API, 'get_filters', 'GET');
            if (result.success && result.data && result.data.lines) {
                const lines = result.data.lines;
                [planLineFilter, planModalLine, dlotEntryLineSelect, costSummaryLineSelectDlot].forEach(select => {
                    if (select) {
                        const isAllOption = select.id === 'dlot-entry-line' || select.id === 'cost-summary-line-dlot';
                        const valueToKeep = (select.id === 'planLineFilter' || select.id === 'planModalLine') ? "" : (isAllOption ? "ALL" : "");
                        select.querySelectorAll(`option:not([value="${valueToKeep}"])`).forEach(opt => opt.remove());
                        lines.forEach(line => { select.appendChild(new Option(line, line)); });
                    }
                });
                 if (planModalLine && !planModalLine.querySelector('option[value=""]')) { const opt = new Option("Select Line...", "", true, true); opt.disabled = true; planModalLine.prepend(opt); }
            } else { console.warn("Lines data missing.", result); showToast('Could not retrieve lines.', 'var(--bs-warning)'); }
        } catch (error) { console.error("Error fetching lines:", error); showToast('Failed load lines.', 'var(--bs-danger)'); }
    }

    async function fetchAllItemsForPlanning() {
         try {
             const params = { limit: -1, show_inactive: false };
             const result = await sendRequest(ITEM_SEARCH_API, 'get_items', 'GET', null, params);
             if (result.success && result.data) { allPlanningItems = result.data; setupPlanItemAutocomplete(); }
             else { console.error("Failed load items:", result.message); showToast('Error.', 'var(--bs-danger)'); }
         } catch (error) { console.error("Error fetching items:", error); showToast('Failed.', 'var(--bs-danger)'); }
    }

    // SECTION 5: CALENDAR VIEW & DLOT VIEW SWITCHING
    function initializeCalendar() {
        if (!planningCalendarContainer) { console.error("Calendar container missing."); return; }
        fullCalendarInstance = new FullCalendar.Calendar(planningCalendarContainer, { initialView: 'dayGridMonth', headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }, editable: false, selectable: true, selectMirror: true, dayMaxEvents: 3, events: fetchCalendarEvents, dateClick: handleDateClick, eventClick: handleEventClick, themeSystem: 'bootstrap5', buttonIcons: { prev: 'bi-chevron-left', next: 'bi-chevron-right', prevYear: 'bi-chevron-double-left', nextYear: 'bi-chevron-double-right' } });
        fullCalendarInstance.render();
    }

    async function fetchCalendarEvents(fetchInfo, successCallback, failureCallback) {
        showSpinner();
        const params = { start: fetchInfo.startStr.substring(0, 10), end: fetchInfo.endStr.substring(0, 10), line: planLineFilter.value || null };
        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if (result.success && result.data) { successCallback(transformPlansToEvents(result.data)); }
            else { throw new Error(result.message || 'Failed load events'); }
        } catch (error) { console.error("Error fetching events:", error); showToast('Error.', 'var(--bs-danger)'); failureCallback(error); }
        finally { hideSpinner(); }
    }

    function transformPlansToEvents(plans) {
        return plans.map(plan => {
            const adjustedPlan = parseFloat(plan.adjusted_planned_quantity || 0); const actualQty = parseFloat(plan.actual_quantity || 0);
            let statusColor = '#6c757d'; let titlePrefix = '📅 ';
            if (adjustedPlan > 0) { if (actualQty >= adjustedPlan) { statusColor = '#198754'; titlePrefix = '✅ '; } else if (actualQty > 0) { statusColor = '#ffc107'; titlePrefix = '⚠️ '; } } else if (actualQty > 0) { statusColor = '#0dcaf0'; titlePrefix = '📦 '; }
            return { id: plan.plan_id, title: `${titlePrefix}${plan.line} ${plan.shift}: ${plan.sap_no || plan.part_no} (${adjustedPlan.toLocaleString()}/${actualQty.toLocaleString()})`, start: plan.plan_date, allDay: true, backgroundColor: statusColor, borderColor: statusColor, extendedProps: { planData: plan } };
        });
    }

    function handleDateClick(dateClickInfo) { switchToDlotView(dateClickInfo.dateStr); }
    function handleEventClick(eventClickInfo) { if (eventClickInfo.event.extendedProps?.planData) { openPlanModal(eventClickInfo.event.extendedProps.planData); } else { showToast('Details missing.', 'var(--bs-warning)'); } }

    function switchToDlotView(dateString) {
        if (planningCalendarContainer) planningCalendarContainer.style.display = 'none';
        if (dlotViewContainer) dlotViewContainer.style.display = 'flex';
        if (backToCalendarBtn) backToCalendarBtn.style.display = 'inline-block';
        if (calendarTitle) calendarTitle.textContent = `Daily Entry`;
        if (dlotDateDisplayCost) dlotDateDisplayCost.textContent = dateString;
        if (dlotDateDisplayEntry) dlotDateDisplayEntry.textContent = dateString;
        dlotEntryDateInputHidden.value = dateString;
        loadDlotDataForDate(dateString, dlotEntryLineSelect.value || 'ALL');
        fetchCostSummaryForDate(dateString, costSummaryLineSelectDlot.value || 'ALL');
    }

    function switchToCalendarView() {
        if (planningCalendarContainer) planningCalendarContainer.style.display = '';
        if (dlotViewContainer) dlotViewContainer.style.display = 'none';
        if (backToCalendarBtn) backToCalendarBtn.style.display = 'none';
        if (calendarTitle) calendarTitle.textContent = `Planning Calendar`;

        setTimeout(() => {
            if (fullCalendarInstance) {
                fullCalendarInstance.updateSize();
            }
        }, 10);
    }

    // SECTION 6: DLOT ENTRY & COST SUMMARY (for DLOT View)
    async function loadDlotDataForDate(entry_date, line) {
        if (!entry_date) return;
        dlotHeadcountInput.value = ''; dlotDlCostInput.value = ''; dlotOtCostInput.value = '';
        try {
            const body = { action: 'get_daily_costs', entry_date: entry_date, line: line };
            const result = await sendRequest(DLOT_API, 'get_daily_costs', 'POST', body);
            if (result.success && result.data) {
                dlotHeadcountInput.value = result.data.headcount > 0 ? result.data.headcount : '';
                dlotDlCostInput.value = result.data.dl_cost > 0 ? result.data.dl_cost : '';
                dlotOtCostInput.value = result.data.ot_cost > 0 ? result.data.ot_cost : '';
            } else { console.warn(`No DLOT data for ${entry_date}/${line}`); }
        } catch (error) { console.error("Error fetching DLOT:", error); showToast('Failed load entry.', 'var(--bs-danger)'); }
    }

    async function handleSaveDlotForm(event) {
        event.preventDefault(); showSpinner();
        try {
            const body = { action: 'save_daily_costs', entry_date: dlotEntryDateInputHidden.value, line: dlotEntryLineSelect.value || 'ALL', headcount: dlotHeadcountInput.value || 0, dl_cost: dlotDlCostInput.value || 0, ot_cost: dlotOtCostInput.value || 0 };
            const result = await sendRequest(DLOT_API, 'save_daily_costs', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) { await fetchCostSummaryForDate(dlotEntryDateInputHidden.value, costSummaryLineSelectDlot.value || 'ALL'); }
        } catch (error) { console.error("Error saving DLOT:", error); showToast('Error.', 'var(--bs-danger)'); }
        finally { hideSpinner(); }
    }

    async function fetchCostSummaryForDate(date, line) {
         if (!date) return;
        stdDlCostDisplayDlot.textContent = '...'; actualDlotCostDisplayDlot.textContent = '...'; dlVarianceDisplayDlot.textContent = '...';
        const params = { startDate: date, endDate: date, line: line === 'ALL' ? null : line };
        try {
            const result = await sendRequest(DLOT_API, 'get_cost_summary', 'GET', null, params);
            if (result.success && result.data) { updateCostSummaryUIDlot(result.data.standard, result.data.actual); }
            else { throw new Error(result.message || 'Failed load cost summary'); }
        } catch (error) { console.error("Error fetching cost:", error); showToast(error.message, 'var(--bs-danger)'); updateCostSummaryUIDlot(null, null); }
    }

    function updateCostSummaryUIDlot(standardData, actualData) {
        const stdCost = (standardData?.TotalDLCost != null) ? parseFloat(standardData.TotalDLCost) : 0;
        const actualCost = (actualData?.TotalActualDLOT != null) ? parseFloat(actualData.TotalActualDLOT) : 0;
        const variance = actualCost - stdCost;
        stdDlCostDisplayDlot.textContent = stdCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        actualDlotCostDisplayDlot.textContent = actualCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        dlVarianceDisplayDlot.textContent = variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        varianceCardDlot.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-light', 'text-white');
        if (variance < 0) { varianceCardDlot.classList.add('text-bg-success', 'text-white'); }
        else if (variance > 0) { varianceCardDlot.classList.add('text-bg-danger', 'text-white'); }
        else { varianceCardDlot.classList.add('text-bg-light'); }
    }

    // SECTION 7: PLANNING TABLE & CHART FUNCTIONS
    async function fetchPlans() {
        showSpinner(); productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center">Loading...</td></tr>`;
        const params = { planDate: planDateFilter.value, line: planLineFilter.value || null, shift: planShiftFilter.value || null };
        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if (result.success && result.data) { renderPlanTable(result.data); renderPlanVsActualChart(result.data); }
            else { productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">${result.message || 'Failed.'}</td></tr>`; renderPlanVsActualChart([]); }
        } catch (error) { console.error("Error fetch plans:", error); productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error.</td></tr>`; renderPlanVsActualChart([]); }
        finally { hideSpinner(); }
    }

    function renderPlanTable(data) {
        productionPlanTableBody.innerHTML = '';
        if (!data || data.length === 0) { productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No plans found.</td></tr>`; return; }
        data.forEach(plan => {
            const tr = document.createElement('tr'); tr.dataset.planId = plan.plan_id; tr.dataset.planData = JSON.stringify(plan);
            const originalPlan = parseFloat(plan.original_planned_quantity || 0); const carryOver = parseFloat(plan.carry_over_quantity || 0);
            const adjustedPlan = parseFloat(plan.adjusted_planned_quantity || 0); const actualQty = parseFloat(plan.actual_quantity || 0);
            let actualClass = actualQty < adjustedPlan ? 'text-danger' : (actualQty >= adjustedPlan && adjustedPlan > 0 ? 'text-success' : '');
            tr.innerHTML = `<td>${plan.plan_date||''}</td><td>${plan.line||''}</td><td>${plan.shift||''}</td><td><span class="fw-bold">${plan.sap_no||'N/A'}</span> / ${plan.part_no||'N/A'}<small class="d-block text-muted">${plan.part_description||''}</small></td><td class="text-center">${originalPlan.toLocaleString()}</td><td class="text-center ${actualClass}">${actualQty.toLocaleString()}</td><td class="text-center ${carryOver > 0 ? 'text-warning' : ''}"><span class="editable-plan" contenteditable="true" data-id="${plan.plan_id}" data-field="carry_over" inputmode="decimal" tabindex="0">${carryOver.toLocaleString()}</span></td><td class="text-center fw-bold" data-field="adjusted_plan">${adjustedPlan.toLocaleString()}</td><td class="text-center"><span class="editable-plan" contenteditable="true" data-id="${plan.plan_id}" data-field="note" tabindex="0">${plan.note || ''}</span></td><td class="text-center"><button class="btn btn-sm btn-outline-primary edit-plan-btn" title="Edit"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-outline-danger delete-plan-btn ms-1" title="Delete"><i class="fas fa-trash"></i></button></td>`;
            productionPlanTableBody.appendChild(tr);
        });
    }

     function renderPlanVsActualChart(planData) {
         const chartCanvas = planVsActualChartCanvas; if (!chartCanvas) return;
         const ctx = chartCanvas.getContext('2d'); if (chartDateDisplay) { chartDateDisplay.textContent = planDateFilter.value || 'Selected'; }
         const labels = planData.map(p => p.sap_no || p.part_no || 'N/A'); const adjustedPlanData = planData.map(p => parseFloat(p.adjusted_planned_quantity || 0)); const actualQtyData = planData.map(p => parseFloat(p.actual_quantity || 0));
         const chartData = { labels: labels, datasets: [{ label: 'Adjusted Plan', data: adjustedPlanData, backgroundColor: 'rgba(54, 162, 235, 0.7)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }, { label: 'Actual Qty', data: actualQtyData, backgroundColor: (ctx) => { const i = ctx.dataIndex; if (i >= adjustedPlanData.length) return '#CCC'; const pVal = adjustedPlanData[i]; const aVal = actualQtyData[i]; if (aVal < pVal) return 'rgba(255, 99, 132, 0.7)'; else if (aVal >= pVal && pVal > 0) return 'rgba(75, 192, 192, 0.7)'; return 'rgba(201, 203, 207, 0.7)'; }, borderColor: (ctx) => { const i = ctx.dataIndex; if (i >= adjustedPlanData.length) return '#AAA'; const pVal = adjustedPlanData[i]; const aVal = actualQtyData[i]; if (aVal < pVal) return 'rgba(255, 99, 132, 1)'; else if (aVal >= pVal && pVal > 0) return 'rgba(75, 192, 192, 1)'; return 'rgba(201, 203, 207, 1)'; }, borderWidth: 1 }] };
         const chartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Quantity' }, ticks: { callback: v => v.toLocaleString() } }, x: { ticks: { maxRotation: 45, minRotation: 30, font: { size: 9 }, autoSkip: true, maxTicksLimit: 15 } } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.dataset.label || ''}: ${c.parsed.y !== null ? c.parsed.y.toLocaleString() : ''}` } }, datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v.toLocaleString() : '', font: { size: 10 }, color: '#444' } } };
         if (planVsActualChartInstance) { planVsActualChartInstance.destroy(); }
         const availablePlugins = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];
         planVsActualChartInstance = new Chart(ctx, { type: 'bar', data: chartData, options: chartOptions, plugins: availablePlugins });
         if (availablePlugins.length === 0){ console.warn("ChartDataLabels plugin not found."); }
     }

    async function handlePlanNoteEdit(planId, newNote) {
        const row = productionPlanTableBody?.querySelector(`tr[data-plan-id="${planId}"]`); if (!row || !row.dataset.planData) return;
        try {
            const existing = JSON.parse(row.dataset.planData); const body = { action: 'save_plan', plan_id: planId, plan_date: existing.plan_date, line: existing.line, shift: existing.shift, item_id: existing.item_id, original_planned_quantity: existing.original_planned_quantity, note: newNote };
            const result = await sendRequest(PLAN_API, 'save_plan', 'POST', body);
            if (!result.success) { showToast(result.message || 'Failed.', 'var(--bs-danger)'); const span = row.querySelector('.editable-plan[data-field="note"]'); if (span) span.textContent = existing.note || ''; }
            else { existing.note = newNote; row.dataset.planData = JSON.stringify(existing); const span = row.querySelector('.editable-plan[data-field="note"]'); if(span) { span.style.boxShadow = '0 0 0 2px var(--bs-success)'; setTimeout(() => { span.style.boxShadow = ''; }, 1500); } }
        } catch (e) { console.error("Error:", e); showToast('Error.', 'var(--bs-danger)'); }
    }
    async function handleCarryOverEdit(planId, value, span) {
        showSpinner(); const row = span.closest('tr'); const original = JSON.parse(row?.dataset.planData || '{}'); const originalVal = parseFloat(original.carry_over_quantity || 0); const body = { action: 'update_carry_over', plan_id: planId, carry_over_quantity: value };
        try {
            const result = await sendRequest(PLAN_API, 'update_carry_over', 'POST', body);
            if (result.success) {
                showToast(result.message || 'Updated.', 'var(--bs-success)'); original.carry_over_quantity = value; const op = parseFloat(original.original_planned_quantity || 0); const adj = op + value; original.adjusted_planned_quantity = adj; row.dataset.planData = JSON.stringify(original); const adjCell = row.querySelector('td[data-field="adjusted_plan"]'); if (adjCell) adjCell.textContent = adj.toLocaleString(); span.textContent = value.toLocaleString(); span.classList.toggle('text-warning', value > 0); span.style.boxShadow = '0 0 0 2px var(--bs-success)'; setTimeout(() => { span.style.boxShadow = ''; }, 1500);
            } else { showToast(result.message || 'Failed.', 'var(--bs-danger)'); span.textContent = originalVal.toLocaleString(); span.classList.toggle('text-warning', originalVal > 0); }
        } catch (e) { console.error("Error:", e); showToast('Error.', 'var(--bs-danger)'); span.textContent = originalVal.toLocaleString(); span.classList.toggle('text-warning', originalVal > 0); } finally { hideSpinner(); }
    }

    // SECTION 8: PLAN MODAL & ITEM AUTOCOMPLETE
    function resetPlanModal() { planModalLabel.textContent = 'Add Plan'; if (planForm) planForm.reset(); planModalPlanId.value = '0'; planModalItemId.value = ''; planModalSelectedItem.textContent = 'No Item'; planModalItemSearch.classList.remove('is-invalid'); itemSearchError.style.display = 'none'; deletePlanButton.style.display = 'none'; planModalDate.value = planDateFilter.value || formatDateForInput(new Date()); planModalLine.value = planLineFilter.value || ""; planModalShift.value = planShiftFilter.value || ""; if (planModalItemResults) { planModalItemResults.innerHTML = ''; planModalItemResults.style.display = 'none'; } }
    function openPlanModal(data = null) { resetPlanModal(); if (data) { planModalLabel.textContent = 'Edit Plan'; planModalPlanId.value = data.plan_id; planModalDate.value = data.plan_date; planModalLine.value = data.line; planModalShift.value = data.shift; planModalQuantity.value = data.original_planned_quantity; planModalNote.value = data.note || ''; planModalItemId.value = data.item_id; planModalItemSearch.value = `${data.sap_no||''} / ${data.part_no||''}`; planModalSelectedItem.textContent = `${data.sap_no||'N/A'} - ${data.part_description||''}`; deletePlanButton.style.display = 'inline-block'; } else { planModalDate.value = planDateFilter.value || formatDateForInput(new Date()); planModalLine.value = planLineFilter.value || ""; planModalShift.value = planShiftFilter.value || ""; } planModal.show(); }
    async function savePlan() { if (!planForm || !planForm.checkValidity()) { planForm?.reportValidity(); return; } if (!planModalItemId.value) { planModalItemSearch.classList.add('is-invalid'); itemSearchError.style.display = 'block'; showToast('Select item.', 'var(--bs-warning)'); return; } else { planModalItemSearch.classList.remove('is-invalid'); itemSearchError.style.display = 'none'; } showSpinner(); savePlanButton.disabled = true; deletePlanButton.disabled = true; const body = { action: 'save_plan', plan_id: planModalPlanId.value || 0, plan_date: planModalDate.value, line: planModalLine.value, shift: planModalShift.value, item_id: planModalItemId.value, original_planned_quantity: planModalQuantity.value, note: planModalNote.value || null }; try { const result = await sendRequest(PLAN_API, 'save_plan', 'POST', body); showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)'); if (result.success) { planModal.hide(); fetchPlans(); if (fullCalendarInstance) fullCalendarInstance.refetchEvents(); } } catch (e) { console.error("Error:", e); showToast('Error.', 'var(--bs-danger)'); } finally { hideSpinner(); savePlanButton.disabled = false; deletePlanButton.disabled = false; } }
    async function deletePlan() { const id = planModalPlanId.value; if (!id || id === '0') return; if (!confirm(`Delete plan ID: ${id}?`)) return; showSpinner(); savePlanButton.disabled = true; deletePlanButton.disabled = true; const body = { action: 'delete_plan', plan_id: id }; try { const result = await sendRequest(PLAN_API, 'delete_plan', 'POST', body); showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)'); if (result.success) { planModal.hide(); fetchPlans(); if (fullCalendarInstance) fullCalendarInstance.refetchEvents(); } } catch (e) { console.error("Error:", e); showToast('Error.', 'var(--bs-danger)'); } finally { hideSpinner(); savePlanButton.disabled = false; deletePlanButton.disabled = false; } }
    function setupPlanItemAutocomplete() { const input = planModalItemSearch, results = planModalItemResults, display = planModalSelectedItem, hidden = planModalItemId, error = itemSearchError; if (!input || !results || !display || !hidden || !error) return; input.addEventListener('input', () => { const val = input.value.toLowerCase().trim(); results.innerHTML = ''; hidden.value = ''; selectedPlanItem = null; display.textContent = 'Searching...'; error.style.display = 'none'; input.classList.remove('is-invalid'); if (val.length < 2) { results.style.display = 'none'; display.textContent = 'Type min 2 chars'; return; } const items = allPlanningItems.filter(i => i.sap_no?.toLowerCase().includes(val) || i.part_no?.toLowerCase().includes(val) || i.part_description?.toLowerCase().includes(val)).slice(0, 10); if (items.length > 0) { items.forEach(item => { const div = document.createElement('div'); div.classList.add('autocomplete-item', 'dropdown-item'); div.style.cursor = 'pointer'; div.innerHTML = `<span class="fw-bold">${item.sap_no||'N/A'}</span>/<small>${item.part_no||'N/A'}</small><small class="d-block text-muted">${item.part_description||''}</small>`; div.dataset.itemId = item.item_id; div.dataset.itemText = `${item.sap_no||''} / ${item.part_no||''}`; div.dataset.itemDetail = `${item.sap_no||'N/A'} - ${item.part_description||''}`; div.addEventListener('click', (e) => { e.stopPropagation(); input.value = div.dataset.itemText; hidden.value = div.dataset.itemId; display.textContent = div.dataset.itemDetail; selectedPlanItem = item; results.innerHTML = ''; results.style.display = 'none'; error.style.display = 'none'; input.classList.remove('is-invalid'); }); results.appendChild(div); }); results.style.display = 'block'; display.textContent = 'Select...'; } else { results.innerHTML = '<div class="disabled dropdown-item text-muted">No items found.</div>'; results.style.display = 'block'; display.textContent = 'No items'; } }); document.addEventListener('click', (e) => { if (results && !input.contains(e.target) && !results.contains(e.target)) { results.style.display = 'none'; } }); input.addEventListener('change', () => { if (input.value.trim() === '') { hidden.value = ''; selectedPlanItem = null; display.textContent = 'No Item'; error.style.display = 'none'; input.classList.remove('is-invalid'); } }); }

    // SECTION 9: EVENT LISTENERS
    planDateFilter?.addEventListener('change', fetchPlans);
    planLineFilter?.addEventListener('change', () => { fetchPlans(); if (fullCalendarInstance) fullCalendarInstance.refetchEvents(); });
    planShiftFilter?.addEventListener('change', fetchPlans);
    btnRefreshPlan?.addEventListener('click', () => { fetchPlans(); if (fullCalendarInstance) fullCalendarInstance.refetchEvents(); });
    btnAddPlan?.addEventListener('click', () => openPlanModal(null));
    savePlanButton?.addEventListener('click', savePlan);
    deletePlanButton?.addEventListener('click', deletePlan);
    btnCalculateCarryOver?.addEventListener('click', async () => { if (!confirm('Calculate C/O?')) return; showSpinner(); btnCalculateCarryOver.disabled = true; try { const res = await sendRequest(PLAN_API, 'calculate_carry_over', 'GET'); showToast(res.message, res.success?'var(--bs-success)':'var(--bs-danger)'); if (res.success) { await fetchPlans(); if (fullCalendarInstance) fullCalendarInstance.refetchEvents(); } } catch (e) { console.error("Error:", e); showToast('Error.', 'var(--bs-danger)'); } finally { hideSpinner(); btnCalculateCarryOver.disabled = false; } });
    backToCalendarBtn?.addEventListener('click', switchToCalendarView);
    dlotEntryForm?.addEventListener('submit', handleSaveDlotForm);
    dlotEntryLineSelect?.addEventListener('change', () => { if(dlotViewContainer.style.display !== 'none') { loadDlotDataForDate(dlotEntryDateInputHidden.value, dlotEntryLineSelect.value || 'ALL'); } });
    costSummaryLineSelectDlot?.addEventListener('change', () => { if(dlotViewContainer.style.display !== 'none') { fetchCostSummaryForDate(dlotEntryDateInputHidden.value, costSummaryLineSelectDlot.value || 'ALL'); } });
    btnRefreshCostSummaryDlot?.addEventListener('click', () => { if(dlotViewContainer.style.display !== 'none') { fetchCostSummaryForDate(dlotEntryDateInputHidden.value, costSummaryLineSelectDlot.value || 'ALL'); } });
    productionPlanTableBody?.addEventListener('click', (e) => { const editBtn = e.target.closest('.edit-plan-btn'); if (editBtn) { const row = editBtn.closest('tr'); if (row?.dataset.planData) { try { openPlanModal(JSON.parse(row.dataset.planData)); } catch (e) { console.error(e); } } return; } const delBtn = e.target.closest('.delete-plan-btn'); if (delBtn) { const row = delBtn.closest('tr'); const id = row?.dataset.planId; if (id) { if (confirm(`Delete ID: ${id}?`)) { showSpinner(); planModalPlanId.value = id; deletePlan().finally(hideSpinner); planModalPlanId.value = '0'; } } return; } });
    productionPlanTableBody?.addEventListener('blur', (e) => { if (e.target.classList.contains('editable-plan')) { const span = e.target; const id = parseInt(span.dataset.id); const field = span.dataset.field; const newVal = span.textContent.trim(); const row = span.closest('tr'); if (!row || !id) return; const orig = JSON.parse(row?.dataset.planData || '{}'); if (field === 'note') { const origVal = orig.note || ''; if (newVal !== origVal) { clearTimeout(planNoteEditDebounceTimer); planNoteEditDebounceTimer = setTimeout(() => { handlePlanNoteEdit(id, newVal); }, 300); } else { span.textContent = origVal; } } else if (field === 'carry_over') { const origVal = parseFloat(orig.carry_over_quantity || 0); const numStr = newVal.replace(/,/g, ''); let numVal = parseFloat(numStr); if (isNaN(numVal) || numVal < 0) { showToast('Invalid C/O.', 'var(--bs-warning)'); span.textContent = origVal.toLocaleString(); return; } numVal = parseFloat(numVal.toFixed(2)); if (numVal !== origVal) { clearTimeout(planCarryOverEditDebounceTimer); planCarryOverEditDebounceTimer = setTimeout(() => { handleCarryOverEdit(id, numVal, span); }, 200); } else { span.textContent = origVal.toLocaleString(); } } } }, true);
    productionPlanTableBody?.addEventListener('keydown', (e) => { if (e.target.classList.contains('editable-plan')) { const field = e.target.dataset.field; if (field === 'carry_over') { if (!/[0-9.,]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key)) { e.preventDefault(); } if (e.key === '.' && e.target.textContent.includes('.')) { e.preventDefault(); } } if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } } });

    // SECTION 10: INITIALIZATION
    setAllDefaultDates();
    fetchDashboardLines().then(fetchAllItemsForPlanning).then(() => { initializeCalendar(); fetchPlans(); });

});