"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // SECTION 1: GLOBAL VARIABLES & DOM ELEMENTS
    // =================================================================

    // --- State Variables ---
    let allPlanningItems = [];
    let selectedPlanItem = null;
    let planVsActualChartInstance = null;
    let fullCalendarInstance = null;
    let planNoteEditDebounceTimer;
    let planCarryOverEditDebounceTimer;

    // --- DOM Elements (Filters & Buttons) ---
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const planLineFilter = document.getElementById('planLineFilter');
    const planShiftFilter = document.getElementById('planShiftFilter');
    const btnRefreshPlan = document.getElementById('btn-refresh-plan');
    const btnAddPlan = document.getElementById('btnAddPlan');
    const btnCalculateCarryOver = document.getElementById('btnCalculateCarryOver');

    // --- DOM Elements (Visualization) ---
    const planVsActualChartCanvas = document.getElementById('planVsActualChart');
    const planningCalendarContainer = document.getElementById('planningCalendarContainer');
    const calendarTitle = document.getElementById('calendar-title');
    const productionPlanTableBody = document.getElementById('productionPlanTableBody');

    // --- DOM Elements (Modal) ---
    const planModalElement = document.getElementById('planModal');
    const planModal = new bootstrap.Modal(planModalElement);
    const planForm = document.getElementById('planForm');
    const planModalLabel = document.getElementById('planModalLabel');
    // Modal Inputs
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
    // Modal Buttons
    const savePlanButton = document.getElementById('savePlanButton');
    const deletePlanButton = document.getElementById('deletePlanButton');

    // =================================================================
    // SECTION 2: UTILITY FUNCTIONS
    // =================================================================
    
    function formatDateForInput(date) {
        if (!(date instanceof Date) || isNaN(date)) return new Date().toISOString().split('T')[0];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
    }

    // =================================================================
    // SECTION 3: INITIALIZATION & SETUP
    // =================================================================

    function setAllDefaultDates() {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        if (startDateFilter && !startDateFilter.value) startDateFilter.value = formatDateForInput(sevenDaysAgo);
        if (endDateFilter && !endDateFilter.value) endDateFilter.value = formatDateForInput(today);
    }

    async function fetchDashboardLines() {
        try {
            const result = await sendRequest(FILTERS_API, 'get_filters', 'GET');
            if (result.success && result.data && result.data.lines) {
                const lines = result.data.lines;
                [planLineFilter, planModalLine].forEach(select => { 
                    if (select) {
                        const valueToKeep = ""; 
                        select.querySelectorAll(`option:not([value="${valueToKeep}"])`).forEach(opt => opt.remove());
                        lines.forEach(line => select.appendChild(new Option(line, line)));
                    }
                });
            }
        } catch (error) { console.error("Error fetching lines:", error); }
    }

    async function fetchAllItemsForPlanning() {
        // Cache Logic (1 Hour)
        const cachedItems = localStorage.getItem('planning_items_cache');
        const cacheTimestamp = localStorage.getItem('planning_items_ts');
        const ONE_HOUR = 60 * 60 * 1000;

        if (cachedItems && cacheTimestamp && (Date.now() - cacheTimestamp < ONE_HOUR)) {
            allPlanningItems = JSON.parse(cachedItems);
            setupPlanItemAutocomplete();
            return;
        }

        try {
            const params = { limit: -1, show_inactive: false };
            const result = await sendRequest(ITEM_SEARCH_API, 'get_items', 'GET', null, params);
            if (result.success && result.data) {
                allPlanningItems = result.data;
                try {
                    localStorage.setItem('planning_items_cache', JSON.stringify(allPlanningItems));
                    localStorage.setItem('planning_items_ts', Date.now());
                } catch(e) {} 
                setupPlanItemAutocomplete();
            }
        } catch (error) { console.error("Error fetching items:", error); }
    }

    function setupPlanItemAutocomplete() {
        if (!planModalItemSearch) return;

        planModalItemSearch.addEventListener('input', () => {
            const val = planModalItemSearch.value.toLowerCase().trim();
            planModalItemResults.innerHTML = '';
            planModalItemId.value = '';
            selectedPlanItem = null;
            planModalSelectedItem.textContent = 'Searching...';
            itemSearchError.style.display = 'none';
            planModalItemSearch.classList.remove('is-invalid');

            if (val.length < 2) {
                planModalItemResults.style.display = 'none';
                planModalSelectedItem.textContent = 'Type min 2 chars';
                return;
            }

            const items = allPlanningItems.filter(i =>
                i.sap_no?.toLowerCase().includes(val) ||
                i.part_no?.toLowerCase().includes(val) ||
                i.part_description?.toLowerCase().includes(val)
            ).slice(0, 10);

            if (items.length > 0) {
                items.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('autocomplete-item', 'dropdown-item', 'p-2', 'border-bottom');
                    div.style.cursor = 'pointer';
                    div.innerHTML = `
                        <div class="d-flex justify-content-between">
                            <span class="fw-bold text-primary">${item.sap_no||'N/A'}</span>
                            <span class="text-dark small">${item.part_no||'N/A'}</span>
                        </div>
                        <small class="d-block text-muted text-truncate">${item.part_description||''}</small>
                    `;
                    
                    div.addEventListener('click', (e) => {
                        e.stopPropagation();
                        planModalItemSearch.value = `${item.sap_no} / ${item.part_no}`;
                        planModalItemId.value = item.item_id;
                        planModalSelectedItem.textContent = item.part_description;
                        selectedPlanItem = item;
                        planModalItemResults.style.display = 'none';
                    });
                    planModalItemResults.appendChild(div);
                });
                planModalItemResults.style.display = 'block';
                planModalSelectedItem.textContent = 'Select...';
            } else {
                planModalItemResults.innerHTML = '<div class="p-2 text-muted small">No items found.</div>';
                planModalItemResults.style.display = 'block';
                planModalSelectedItem.textContent = 'No items';
            }
        });

        document.addEventListener('click', (e) => {
            if (planModalItemResults && !planModalItemSearch.contains(e.target) && !planModalItemResults.contains(e.target)) {
                planModalItemResults.style.display = 'none';
            }
        });
    }

    // =================================================================
    // SECTION 4: DATA FETCHING (MASTER FUNCTION)
    // =================================================================

    async function fetchPlans() {
        showSpinner();
        productionPlanTableBody.innerHTML = `<tr><td colspan="11" class="text-center py-5 text-muted">Loading data...</td></tr>`;
        
        const params = { 
            startDate: startDateFilter.value, 
            endDate: endDateFilter.value, 
            line: planLineFilter.value || null, 
            shift: planShiftFilter.value || null,
            limit: -1 // [FIX] Load ALL data for table/chart without pagination
        };

        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if (result.success && result.data) {
                // 1. Render Table
                renderPlanTable(result.data);
                
                // 2. Render Footer Summary
                updateFooterSummaryClientSide(result.data);

                // 3. Render Chart (Chart uses same data as table)
                renderPlanVsActualChart(result.data);

                // [NOTE] Calendar refreshes independently on init/view change, no need to call here.

            } else {
                productionPlanTableBody.innerHTML = `<tr><td colspan="11" class="text-center text-muted py-5">No plans found.</td></tr>`;
                renderPlanVsActualChart([]); 
            }
        } catch (error) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="11" class="text-center text-danger py-5">Error loading data.</td></tr>`;
            console.error(error);
        } finally {
            hideSpinner();
        }
    }

    function updateFooterSummaryClientSide(data) {
        let totalQty = 0;
        let totalCost = 0;
        let totalSales = 0;

        data.forEach(p => {
            const adj = parseFloat(p.adjusted_planned_quantity || 0);
            const cost = parseFloat(p.cost_total || 0);
            
            const priceUSD = parseFloat(p.price_usd || 0);
            const priceTHB = parseFloat(p.standard_price || 0);
            let unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;

            totalQty += adj;
            totalCost += (adj * cost);
            totalSales += (adj * unitPrice);
        });

        document.getElementById('footer-total-qty').innerText = totalQty.toLocaleString();
        document.getElementById('footer-total-cost').innerText = formatCurrency(totalCost);
        document.getElementById('footer-total-sale').innerText = formatCurrency(totalSales);
    }

    // =================================================================
    // SECTION 5: RENDERING (TABLE, CHART, CALENDAR)
    // =================================================================

    // --- 5.1 TABLE ---
    function renderPlanTable(data) {
        productionPlanTableBody.innerHTML = '';
        if (!data || data.length === 0) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="11" class="text-center text-muted py-5">No plans found.</td></tr>`;
            return;
        }
        
        data.forEach(plan => {
            const originalPlan = parseFloat(plan.original_planned_quantity || 0);
            const carryOver = parseFloat(plan.carry_over_quantity || 0);
            const adjPlan = parseFloat(plan.adjusted_planned_quantity || 0);
            const actualQty = parseFloat(plan.actual_quantity || 0);
            
            const unitCost = parseFloat(plan.cost_total || 0);
            const totalPlanCost = adjPlan * unitCost;

            const priceUSD = parseFloat(plan.price_usd || 0);
            const priceTHB = parseFloat(plan.standard_price || 0);
            let unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
            const totalPlanSale = adjPlan * unitPrice;

            const tr = document.createElement('tr');
            tr.dataset.planId = plan.plan_id;
            tr.dataset.planData = JSON.stringify(plan);

            let progressClass = 'text-dark';
            if(adjPlan > 0) {
                if(actualQty >= adjPlan) progressClass = 'text-success fw-bold';
                else if(actualQty > 0) progressClass = 'text-primary';
            }

            tr.innerHTML = `
                <td class="text-secondary small font-monospace">${plan.plan_date}</td>
                <td><span class="badge bg-light text-dark border">${plan.line}</span></td>
                <td><span class="badge ${plan.shift === 'DAY' ? 'bg-warning text-dark' : 'bg-dark text-white'} border">${(plan.shift || '-').substring(0,1)}</span></td>
                
                <td>
                    <span class="fw-bold text-dark font-monospace">${plan.sap_no || '-'}</span> 
                    <span class="text-muted small mx-1">/</span> 
                    <span class="font-monospace text-secondary">${plan.part_no || '-'}</span>
                    <small class="d-block text-muted text-truncate mt-1" style="max-width: 250px;">${plan.part_description || ''}</small>
                </td>

                <td class="text-end text-muted font-monospace">${originalPlan.toLocaleString()}</td>
                <td class="text-end">
                    <span class="editable-plan ${carryOver !== 0 ? 'text-warning fw-bold' : 'text-muted opacity-50'}" contenteditable="true" data-id="${plan.plan_id}" data-field="carry_over">${carryOver.toLocaleString()}</span>
                </td>
                <td class="text-end bg-primary bg-opacity-10 fw-bold text-primary font-monospace" data-field="adjusted_plan">${adjPlan.toLocaleString()}</td>
                <td class="text-end font-monospace ${progressClass}" style="background-color: var(--bs-primary-bg-subtle);">${actualQty.toLocaleString()}</td>
                
                <td class="text-end text-danger small">${formatCurrency(totalPlanCost)}</td>
                <td class="text-end text-success fw-bold small">${formatCurrency(totalPlanSale)}</td>
                
                <td class="text-start">
                    <span class="editable-plan d-inline-block text-truncate text-secondary small" style="max-width: 140px;" contenteditable="true" data-id="${plan.plan_id}" data-field="note">${plan.note || '<span class="opacity-25">...</span>'}</span>
                </td>
            `;
            productionPlanTableBody.appendChild(tr);
        });
    }

    // --- 5.2 CHART (IMPROVED UI & ZOOM) ---
    function renderPlanVsActualChart(planData) {
        const chartWrapper = document.getElementById('planVsActualChartInnerWrapper');
        if (!planVsActualChartCanvas || !chartWrapper) return;

        // Grouping Data
        const aggregatedData = {};
        planData.forEach(p => {
            const itemId = p.item_id;
            const identifier = p.part_no || p.sap_no || `Item ${itemId}`;
            
            if (!aggregatedData[itemId]) {
                aggregatedData[itemId] = {
                    label: identifier,
                    part_no: p.part_no,
                    part_description: p.part_description,
                    totalAdjustedPlan: 0,
                    totalActualQty: 0,
                    totalOriginalPlan: 0,
                    totalCarryOver: 0
                };
            }
            aggregatedData[itemId].totalAdjustedPlan += parseFloat(p.adjusted_planned_quantity || 0);
            aggregatedData[itemId].totalActualQty += parseFloat(p.actual_quantity || 0);
            aggregatedData[itemId].totalOriginalPlan += parseFloat(p.original_planned_quantity || 0);
            aggregatedData[itemId].totalCarryOver += parseFloat(p.carry_over_quantity || 0);
        });

        const aggregatedArray = Object.values(aggregatedData);
        
        // [FIX] เพิ่มความกว้างแท่งกราฟให้มากขึ้นเพื่อไม่ให้ชื่อเบียด
        const minWidthPerBar = 120; 
        const totalWidth = Math.max(100, aggregatedArray.length * minWidthPerBar);
        chartWrapper.style.width = `${totalWidth}px`;

        const labels = aggregatedArray.map(agg => agg.label);
        const totalOriginalPlanData = aggregatedArray.map(agg => agg.totalOriginalPlan);
        const totalCarryOverData = aggregatedArray.map(agg => agg.totalCarryOver);
        const metPlanData = aggregatedArray.map(agg => (agg.totalActualQty >= agg.totalAdjustedPlan && agg.totalAdjustedPlan > 0) ? agg.totalAdjustedPlan : null);
        const shortfallData = aggregatedArray.map(agg => (agg.totalActualQty < agg.totalAdjustedPlan && agg.totalAdjustedPlan > 0) ? agg.totalActualQty : null);
        const unplannedData = aggregatedArray.map(agg => (agg.totalActualQty > 0) ? Math.max(0, agg.totalActualQty - agg.totalAdjustedPlan) : null);

        const ctx = planVsActualChartCanvas.getContext('2d');
        if (planVsActualChartInstance) planVsActualChartInstance.destroy();

        planVsActualChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Original Plan', data: totalOriginalPlanData, backgroundColor: 'rgba(54, 162, 235, 0.7)', stack: 'plan' },
                    { label: 'Carry Over', data: totalCarryOverData, backgroundColor: 'rgba(255, 159, 64, 0.7)', stack: 'plan' },
                    { label: 'Actual (Met)', data: metPlanData, backgroundColor: 'rgba(75, 192, 192, 0.7)', stack: 'actual' },
                    { label: 'Actual (Shortfall)', data: shortfallData, backgroundColor: 'rgba(255, 99, 132, 0.7)', stack: 'actual' },
                    { label: 'Actual (Unplanned)', data: unplannedData, backgroundColor: 'rgba(153, 102, 255, 0.7)', stack: 'actual' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // [FIX] ให้สูงเต็มพื้นที่ ไม่บี้แบน
                scales: {
                    x: { 
                        stacked: true,
                        ticks: {
                            minRotation: 0, // [FIX] ห้ามเอียงชื่อ
                            maxRotation: 0,
                            font: { size: 11, weight: 'bold' }
                        }
                    },
                    y: { stacked: true, beginAtZero: true }
                },
                plugins: {
                    legend: { position: 'top' },
                    // [FIX] เพิ่ม Zoom Plugin Configuration
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x', // ลากซ้ายขวาได้
                        },
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'x', // กลิ้งเมาส์ซูมแกน X
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => {
                                const idx = tooltipItems[0].dataIndex;
                                const item = aggregatedArray[idx];
                                return [item.label, item.part_description]; // โชว์ชื่อเต็มใน Tooltip
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 5.3 CALENDAR (UPDATED COLORS & LIMIT) ---
    function initializeCalendar() {
        if (!planningCalendarContainer) return;
        
        const todayString = formatDateForInput(new Date());
        planningCalendarContainer.innerHTML = '';
        
        fullCalendarInstance = new FullCalendar.Calendar(planningCalendarContainer, {
            initialView: 'dayGridMonth',
            headerToolbar: false, 
            editable: false,
            dayMaxEvents: 2,
            height: '100%',
            
            // Event Source
            events: (info, sc, fc) => fetchCalendarEvents(info, sc, fc, todayString),
            
            // Interaction
            eventClick: handleEventClick,
            
            // Sync Title
            datesSet: (dateInfo) => {
                if (calendarTitle) calendarTitle.textContent = dateInfo.view.title;
            }
        });
        
        fullCalendarInstance.render();
    }

    async function fetchCalendarEvents(fetchInfo, successCallback, failureCallback, todayString) {
        const startDate = fetchInfo.startStr.substring(0, 10);
        const endDate = fetchInfo.endStr.substring(0, 10);
        
        const params = { 
            startDate, 
            endDate, 
            line: planLineFilter.value || null,
            limit: -1 // [FIX] โหลดทั้งหมด ไม่แบ่งหน้า เพื่อให้ปฏิทินแสดงครบ
        };
        
        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if(result.success) {
                // Transform Plans to Calendar Events
                const events = result.data.map(p => {
                    const adj = parseFloat(p.adjusted_planned_quantity||0);
                    const act = parseFloat(p.actual_quantity||0);
                    
                    // [FIX] Color Logic to match Bar Graph
                    let color = 'rgba(54, 162, 235, 1)'; // Blue (Default/Plan)
                    let borderStyle = 'solid';

                    if(act >= adj && adj > 0) {
                        color = 'rgba(75, 192, 192, 1)'; // Teal (Met Target)
                    } else if(act < adj && adj > 0) {
                        // เช็คว่าเป็นวันอดีตหรือไม่
                        if (p.plan_date < todayString) {
                            color = 'rgba(255, 99, 132, 1)'; // Red (Missed & Past)
                        } else {
                            color = 'rgba(54, 162, 235, 1)'; // Blue (Pending/Future)
                        }
                    }
                    
                    return {
                        id: p.plan_id,
                        title: `${p.line}: ${p.sap_no} (${act}/${adj})`,
                        start: p.plan_date,
                        backgroundColor: color,
                        borderColor: color,
                        extendedProps: { planData: p }
                    };
                });
                successCallback(events);
            }
        } catch(e) { failureCallback(e); }
    }

    function handleEventClick(info) {
        const props = info.event.extendedProps;
        if(props.planData) {
            openPlanModal(props.planData);
        }
    }

    // =================================================================
    // SECTION 6: EDITING & SAVING LOGIC
    // =================================================================

    // --- 6.1 Inline Table Editing ---
    productionPlanTableBody.addEventListener('blur', (e) => {
        if (e.target.classList.contains('editable-plan')) {
            const el = e.target;
            const id = el.dataset.id;
            const field = el.dataset.field;
            const newVal = el.innerText.trim();
            const row = el.closest('tr');
            if(!row) return;
            const data = JSON.parse(row.dataset.planData);

            if(field === 'note' && newVal !== data.note) {
                clearTimeout(planNoteEditDebounceTimer);
                planNoteEditDebounceTimer = setTimeout(() => handlePlanNoteEdit(id, newVal), 500);
            } else if(field === 'carry_over') {
                const numVal = parseFloat(newVal.replace(/,/g, ''));
                if(!isNaN(numVal) && numVal !== parseFloat(data.carry_over_quantity)) {
                    clearTimeout(planCarryOverEditDebounceTimer);
                    planCarryOverEditDebounceTimer = setTimeout(() => handleCarryOverEdit(id, numVal, el), 500);
                }
            }
        }
    }, true);

    async function handlePlanNoteEdit(id, note) {
        const row = document.querySelector(`tr[data-plan-id="${id}"]`);
        if(!row) return;
        const data = JSON.parse(row.dataset.planData);
        
        const payload = {
            plan_id: id,
            plan_date: data.plan_date,
            line: data.line,
            shift: data.shift,
            item_id: data.item_id,
            original_planned_quantity: data.original_planned_quantity,
            note: note
        };

        try {
            await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
            data.note = note;
            row.dataset.planData = JSON.stringify(data);
            showToast('Note saved', 'var(--bs-success)');
        } catch(e) { showToast('Error saving note', 'var(--bs-danger)'); }
    }

    async function handleCarryOverEdit(id, qty, el) {
        try {
            const res = await sendRequest(PLAN_API, 'update_carry_over', 'POST', { plan_id: id, carry_over_quantity: qty });
            if(res.success) {
                showToast('C/O Updated', 'var(--bs-success)');
                fetchPlans(); 
            } else {
                showToast('Update failed', 'var(--bs-danger)');
            }
        } catch(e) { showToast('Error updating C/O', 'var(--bs-danger)'); }
    }

    // --- 6.2 Modal Editing ---
    window.openPlanModal = function(data) {
        resetPlanModal();
        if(data) {
            planModalLabel.innerText = 'Edit Plan';
            planModalPlanId.value = data.plan_id;
            planModalDate.value = data.plan_date;
            planModalLine.value = data.line;
            planModalShift.value = data.shift;
            planModalQuantity.value = data.original_planned_quantity;
            planModalNote.value = data.note || '';
            
            planModalItemId.value = data.item_id;
            planModalItemSearch.value = `${data.sap_no} / ${data.part_no}`;
            planModalSelectedItem.innerText = data.part_description;
            
            deletePlanButton.style.display = 'inline-block';
        } else {
            planModalLabel.innerText = 'Add Plan';
            deletePlanButton.style.display = 'none';
        }
        planModal.show();
    }

    function resetPlanModal() {
        planForm.reset();
        planModalPlanId.value = "0";
        planModalItemId.value = "";
        planModalSelectedItem.innerText = "No Item Selected";
        planModalItemSearch.classList.remove('is-invalid');
        planModalDate.value = endDateFilter.value; 
        planModalLine.value = planLineFilter.value || "";
        planModalShift.value = planShiftFilter.value || "";
    }

    savePlanButton?.addEventListener('click', async () => {
        if (!planModalItemId || !planModalPlanId) {
            console.error("Critical elements missing");
            return;
        }

        if(!planModalItemId.value) {
            planModalItemSearch.classList.add('is-invalid');
            return;
        }
        
        const payload = {
            plan_id: planModalPlanId.value,
            plan_date: planModalDate.value,
            line: planModalLine.value,
            shift: planModalShift.value,
            item_id: planModalItemId.value,
            original_planned_quantity: planModalQuantity.value,
            note: planModalNote.value
        };

        try {
            const res = await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
            if(res.success) {
                planModal.hide();
                fetchPlans(); 
                showToast('Plan saved successfully', 'var(--bs-success)');
            } else {
                showToast(res.message, 'var(--bs-danger)');
            }
        } catch(e) { console.error(e); }
    });

    deletePlanButton?.addEventListener('click', async () => {
        if(!confirm("Are you sure?")) return;
        try {
            const res = await sendRequest(PLAN_API, 'delete_plan', 'POST', { plan_id: planModalPlanId.value });
            if(res.success) {
                planModal.hide();
                fetchPlans();
                showToast('Plan deleted', 'var(--bs-success)');
            }
        } catch(e) { console.error(e); }
    });

    // =================================================================
    // SECTION 7: APP START
    // =================================================================

    function initializeApp() {
        setAllDefaultDates();
        
        // --- Event Listeners ---
        startDateFilter?.addEventListener('change', fetchPlans);
        endDateFilter?.addEventListener('change', fetchPlans);
        planShiftFilter?.addEventListener('change', fetchPlans);

        // Line Change -> Update All (Table + Calendar)
        planLineFilter?.addEventListener('change', () => {
            fetchPlans();
            fullCalendarInstance?.refetchEvents();
        });

        // Refresh Button
        btnRefreshPlan?.addEventListener('click', () => {
            fetchPlans();
            fullCalendarInstance?.refetchEvents();
        });
        
        // Calendar Navigation
        document.getElementById('calendar-prev-button')?.addEventListener('click', () => fullCalendarInstance?.prev());
        document.getElementById('calendar-next-button')?.addEventListener('click', () => fullCalendarInstance?.next());
        document.getElementById('calendar-today-button')?.addEventListener('click', () => fullCalendarInstance?.today());
        
        // View Switcher
        document.getElementById('calendar-month-view-button')?.addEventListener('click', () => fullCalendarInstance?.changeView('dayGridMonth'));
        document.getElementById('calendar-week-view-button')?.addEventListener('click', () => fullCalendarInstance?.changeView('timeGridWeek'));

        // C/O Button
        btnCalculateCarryOver?.addEventListener('click', async () => {
            if(!confirm("Calculate Carry Over for selected period?")) return;
            try {
                const res = await sendRequest(PLAN_API, 'calculate_carry_over', 'GET'); 
                if(res.success) {
                    showToast('Carry Over Updated', 'var(--bs-success)');
                    fetchPlans();
                    fullCalendarInstance?.refetchEvents();
                }
            } catch(e) { showToast('Error calculating C/O', 'var(--bs-danger)'); }
        });

        // Add Plan Button
        btnAddPlan?.addEventListener('click', () => openPlanModal(null));

        // --- Load Initial Data ---
        fetchDashboardLines()
            .then(fetchAllItemsForPlanning)
            .then(() => {
                initializeCalendar(); 
                fetchPlans();
            });
    }

    initializeApp();
});