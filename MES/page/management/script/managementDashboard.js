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

    // --- DOM Element References ---
    // (Filters & Buttons)
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const planLineFilter = document.getElementById('planLineFilter');
    const planShiftFilter = document.getElementById('planShiftFilter');
    const btnRefreshPlan = document.getElementById('btn-refresh-plan');
    const btnAddPlan = document.getElementById('btnAddPlan');
    const btnCalculateCarryOver = document.getElementById('btnCalculateCarryOver');
    
    // (Chart & Table)
    const chartDateDisplay = document.getElementById('chartDateDisplay');
    const planVsActualChartCanvas = document.getElementById('planVsActualChart');
    const productionPlanTableBody = document.getElementById('productionPlanTableBody');
    
    // (Calendar & DLOT)
    const calendarTitle = document.getElementById('calendar-title');
    const backToCalendarBtn = document.getElementById('backToCalendarBtn');
    const planningCalendarContainer = document.getElementById('planningCalendarContainer');
    const dlotViewContainer = document.getElementById('dlotViewContainer');
    const dlotDateDisplayEntry = document.getElementById('dlotDateDisplayEntry');
    const dlotEntryForm = document.getElementById('dlot-entry-form');
    const dlotEntryDateInputHidden = document.getElementById('dlot-entry-date');
    const dlotHeadcountInput = document.getElementById('dlot-headcount');
    const dlotDlCostInput = document.getElementById('dlot-dl-cost');
    const dlotOtCostInput = document.getElementById('dlot-ot-cost');
    
    // (Modal Elements)
    const planModalElement = document.getElementById('planModal');
    const planModal = new bootstrap.Modal(planModalElement);
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

    // =================================================================
    // SECTION 2: CORE UTILITY FUNCTIONS
    // =================================================================
    
    function formatDateForInput(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            return new Date().toISOString().split('T')[0];
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // =================================================================
    // SECTION 3: DATA FETCHING & UI SETUP
    // =================================================================

    function setAllDefaultDates() {
        const today = new Date();
        const todayFormatted = formatDateForInput(today);
        
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        // --- เพิ่มบรรทัดนี้ครับ ---
        const sevenDaysAgoFormatted = formatDateForInput(sevenDaysAgo); 

        if (startDateFilter && !startDateFilter.value) startDateFilter.value = sevenDaysAgoFormatted;
        if (endDateFilter && !endDateFilter.value) endDateFilter.value = todayFormatted;
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
                if (planModalLine && !planModalLine.querySelector('option[value=""]')) {
                    const opt = new Option("Select Line...", "", true, true);
                    opt.disabled = true;
                    planModalLine.prepend(opt);
                }
            }
        } catch (error) {
            showToast('Failed load lines.', 'var(--bs-danger)');
        }
    }

    async function fetchAllItemsForPlanning() {
        try {
            const params = { limit: -1, show_inactive: false };
            const result = await sendRequest(ITEM_SEARCH_API, 'get_items', 'GET', null, params);
            if (result.success && result.data) {
                allPlanningItems = result.data;
                setupPlanItemAutocomplete();
            }
        } catch (error) {
            showToast('Failed to load items.', 'var(--bs-danger)');
        }
    }

    function setupPlanItemAutocomplete() {
        const input = planModalItemSearch;
        const results = planModalItemResults;
        const display = planModalSelectedItem;
        const hidden = planModalItemId;
        const error = itemSearchError;
              
        if (!input || !results) return;

        input.addEventListener('input', () => {
            const val = input.value.toLowerCase().trim();
            results.innerHTML = '';
            hidden.value = '';
            selectedPlanItem = null;
            display.textContent = 'Searching...';
            error.style.display = 'none';
            input.classList.remove('is-invalid');

            if (val.length < 2) {
                results.style.display = 'none';
                display.textContent = 'Type min 2 chars';
                return;
            }

            const items = allPlanningItems.filter(i =>
                (i.sap_no || '').toLowerCase().includes(val) ||
                (i.part_no || '').toLowerCase().includes(val) ||
                (i.part_description || '').toLowerCase().includes(val)
            ).slice(0, 10);

            if (items.length > 0) {
                items.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('autocomplete-item', 'dropdown-item');
                    div.style.cursor = 'pointer';
                    div.innerHTML = `<span class="fw-bold">${item.sap_no||'N/A'}</span>/<small>${item.part_no||'N/A'}</small><small class="d-block text-muted">${item.part_description||''}</small>`;
                    div.addEventListener('click', (e) => {
                        e.stopPropagation();
                        input.value = `${item.sap_no||''} / ${item.part_no||''}`;
                        hidden.value = item.item_id;
                        display.textContent = `${item.sap_no||'N/A'} - ${item.part_description||''}`;
                        selectedPlanItem = item;
                        results.style.display = 'none';
                    });
                    results.appendChild(div);
                });
                results.style.display = 'block';
            } else {
                results.innerHTML = '<div class="disabled dropdown-item text-muted">No items found.</div>';
                results.style.display = 'block';
            }
        });

        document.addEventListener('click', (e) => {
            if (results && !input.contains(e.target) && !results.contains(e.target)) {
                results.style.display = 'none';
            }
        });
    }

    // =================================================================
    // SECTION 4: PLANNING LOGIC
    // =================================================================

    async function fetchPlans() {
        showSpinner();
        productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center">Loading...</td></tr>`;
        const params = { 
            startDate: startDateFilter.value, 
            endDate: endDateFilter.value, 
            line: planLineFilter.value || null, 
            shift: planShiftFilter.value || null 
        };
        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if (result.success && result.data) {
                renderPlanTable(result.data);
                renderPlanVsActualChart(result.data);
            } else {
                productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No data.</td></tr>`;
                renderPlanVsActualChart([]);
            }
        } catch (error) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error loading plans.</td></tr>`;
        } finally {
            hideSpinner();
        }
    }

    // ฟังก์ชันแปลงตัวเลขเป็นหน่วยย่อ (เช่น 1,200,000 => 1.2M)
    function formatCurrencyShort(value) {
        if (value >= 1000000) return '฿' + (value / 1000000).toFixed(2) + 'M';
        if (value >= 1000) return '฿' + (value / 1000).toFixed(2) + 'K';
        return '฿' + value.toLocaleString();
    }

    function renderPlanTable(data) {
        productionPlanTableBody.innerHTML = '';
        
        // ตัวแปรสำหรับคำนวณ Summary Card
        let totalSale = 0, totalCost = 0, totalPlanQty = 0, totalActualQty = 0;

        if (!data || data.length === 0) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-5"><i class="fas fa-box-open fa-2x mb-3 opacity-25"></i><br>No production plans found for this criteria.</td></tr>`;
            updateSummaryCards(0, 0, 0, 0); 
            return;
        }
        
        data.forEach(plan => {
            // Parse Values
            const originalPlan = parseFloat(plan.original_planned_quantity || 0);
            const carryOver = parseFloat(plan.carry_over_quantity || 0);
            const adjustedPlan = parseFloat(plan.adjusted_planned_quantity || 0);
            const actualQty = parseFloat(plan.actual_quantity || 0);
            const price = parseFloat(plan.std_price || 0);
            const cost = parseFloat(plan.std_cost || 0);

            // Accumulate Totals
            totalSale += (adjustedPlan * price);
            totalCost += (adjustedPlan * cost);
            totalPlanQty += adjustedPlan;
            totalActualQty += actualQty;

            // Progress Logic
            let progressPercent = 0;
            let progressColor = 'bg-secondary';
            if (adjustedPlan > 0) {
                progressPercent = (actualQty / adjustedPlan) * 100;
                if (progressPercent >= 100) progressColor = 'bg-success'; // เขียว (ครบแล้ว)
                else if (progressPercent >= 80) progressColor = 'bg-info'; // ฟ้า (เกือบครบ)
                else if (progressPercent >= 50) progressColor = 'bg-warning'; // เหลือง (ครึ่งทาง)
                else progressColor = 'bg-danger'; // แดง (เพิ่งเริ่ม/ยังน้อย)
            } else if (actualQty > 0) {
                progressPercent = 100; progressColor = 'bg-secondary'; // Unplanned
            }

            const tr = document.createElement('tr');
            tr.dataset.planId = plan.plan_id;
            tr.dataset.planData = JSON.stringify(plan);

            // --- HTML Row Design ---
            tr.innerHTML = `
                <td class="text-secondary small font-monospace align-middle">${plan.plan_date}</td>
                
                <td class="align-middle">
                    <span class="badge bg-light text-dark border me-1">${plan.line}</span>
                    <span class="badge ${plan.shift === 'DAY' ? 'bg-warning text-dark' : 'bg-dark text-white'} border border-opacity-25">${plan.shift.substring(0,1)}</span>
                </td>
                
                <td class="align-middle">
                    <div class="d-flex flex-column">
                        <div class="d-flex align-items-center">
                            <span class="fw-bold text-primary me-2">${plan.sap_no || '-'}</span>
                            ${plan.part_no ? `<span class="badge bg-secondary bg-opacity-10 text-secondary small">${plan.part_no}</span>` : ''}
                        </div>
                        <small class="text-muted text-truncate" style="max-width: 220px;" title="${plan.part_description || ''}">
                            ${plan.part_description || '-'}
                        </small>
                    </div>
                </td>

                <td class="text-end align-middle text-muted font-monospace" style="font-size: 0.9rem;">
                    ${originalPlan > 0 ? originalPlan.toLocaleString() : '-'}
                </td>
                
                <td class="text-end align-middle">
                    <div class="d-flex flex-column align-items-end">
                        <span class="fw-bold font-monospace ${actualQty >= adjustedPlan && adjustedPlan > 0 ? 'text-success' : 'text-dark'}" style="font-size: 1rem;">
                            ${actualQty.toLocaleString()}
                        </span>
                        ${adjustedPlan > 0 ? `
                        <div class="progress mt-1" style="height: 3px; width: 60px; background-color: #e9ecef;">
                            <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${Math.min(100, progressPercent)}%"></div>
                        </div>` : ''}
                    </div>
                </td>

                <td class="text-end align-middle">
                    <span class="editable-plan font-monospace ${carryOver !== 0 ? 'text-warning fw-bold' : 'text-muted opacity-50'}" 
                          contenteditable="true" 
                          data-id="${plan.plan_id}" 
                          data-field="carry_over" 
                          inputmode="decimal" 
                          tabindex="0">${carryOver.toLocaleString()}</span>
                </td>
                
                <td class="text-end align-middle bg-primary bg-opacity-10">
                    <span class="fw-bold text-primary font-monospace fs-6">${adjustedPlan.toLocaleString()}</span>
                </td>
                
                <td class="text-start align-middle">
                    <span class="editable-plan d-inline-block text-truncate text-secondary small" 
                          style="max-width: 120px;"
                          contenteditable="true" 
                          data-id="${plan.plan_id}" 
                          data-field="note" 
                          tabindex="0" 
                          title="${plan.note || 'Edit note'}">${plan.note || '<span class="opacity-25">...</span>'}</span>
                </td>
            `;
            productionPlanTableBody.appendChild(tr);
        });

        updateSummaryCards(totalSale, totalCost, totalPlanQty, totalActualQty);
    }

    // แก้ไข function นี้ให้แสดงตัวเลขเต็ม
    function updateSummaryCards(sale, cost, planQty, actualQty) {
        const profit = sale - cost;
        const progress = planQty > 0 ? (actualQty / planQty) * 100 : 0;

        // ฟังก์ชัน Helper สำหรับ Format เงิน
        const fmt = (val) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        document.getElementById('kpi-sale-value').textContent = `฿${fmt(sale)}`;
        document.getElementById('kpi-cost-value').textContent = `฿${fmt(cost)}`;
        document.getElementById('kpi-profit-value').textContent = `฿${fmt(profit)}`;
        
        document.getElementById('kpi-progress-percent').textContent = `${progress.toFixed(1)}%`;
        
        const progressBar = document.getElementById('kpi-progress-bar');
        if(progressBar) {
            progressBar.style.width = `${Math.min(100, progress)}%`;
            if(progress >= 100) progressBar.className = 'progress-bar bg-success';
            else if(progress >= 80) progressBar.className = 'progress-bar bg-info';
            else progressBar.className = 'progress-bar bg-warning';
        }
        
        const profitEl = document.getElementById('kpi-profit-value');
        if(profitEl) profitEl.className = profit >= 0 ? 'kpi-value text-success' : 'kpi-value text-danger';
    }

    function renderPlanVsActualChart(planData) {
        const chartCanvas = planVsActualChartCanvas;
        const chartWrapper = document.getElementById('planVsActualChartInnerWrapper'); 
        if (!chartCanvas || !chartWrapper) return;
        
        const uniqueItemsCount = new Set(planData.map(p => p.item_id)).size;
        
        // [FIX 3] ปรับความกว้างกราฟ: ถ้าข้อมูลน้อยกว่า 5 แท่ง ให้กราฟเต็มจอ (100%) ถ้าเยอะค่อยขยาย Scroll
        if (uniqueItemsCount < 5) {
            chartWrapper.style.width = '100%';
        } else {
            chartWrapper.style.width = `${uniqueItemsCount * 120}px`; // เพิ่มความกว้างต่อแท่งเป็น 120px
        }

        const ctx = chartCanvas.getContext('2d');
        const aggregatedData = {};
        
        planData.forEach(p => {
            const itemId = p.item_id;
            if (!aggregatedData[itemId]) {
                // [FIX 1] แก้ไข Label: ใช้ SAP No คู่กับ Part No เพื่อให้ไม่ซ้ำกัน
                let labelText = p.part_no || 'Unknown';
                if (p.sap_no) {
                    labelText = `${p.sap_no} / ${p.part_no}`;
                }
                
                aggregatedData[itemId] = {
                    label: labelText, // <-- ใช้ Label ใหม่ที่สร้างขึ้น
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
        const labels = aggregatedArray.map(agg => agg.label);
        
        const chartData = {
            labels: labels,
            datasets: [
                { label: 'Original Plan', data: aggregatedArray.map(a => a.totalOriginalPlan), backgroundColor: 'rgba(54, 162, 235, 0.7)', stack: 'plan' },
                { label: 'Carry Over', data: aggregatedArray.map(a => a.totalCarryOver), backgroundColor: 'rgba(255, 159, 64, 0.7)', stack: 'plan' },
                { label: 'Actual (Met Plan)', data: aggregatedArray.map(a => (a.totalActualQty >= a.totalAdjustedPlan && a.totalAdjustedPlan > 0) ? a.totalAdjustedPlan : null), backgroundColor: 'rgba(75, 192, 192, 0.7)', stack: 'actual' },
                { label: 'Actual (Shortfall)', data: aggregatedArray.map(a => (a.totalActualQty < a.totalAdjustedPlan && a.totalAdjustedPlan > 0) ? a.totalActualQty : null), backgroundColor: 'rgba(255, 99, 132, 0.7)', stack: 'actual' },
                { label: 'Actual (Unplanned)', data: aggregatedArray.map(a => (a.totalActualQty > 0) ? Math.max(0, a.totalActualQty - a.totalAdjustedPlan) : null), backgroundColor: 'rgba(153, 102, 255, 0.7)', stack: 'actual' }
            ]
        };

        if (planVsActualChartInstance) planVsActualChartInstance.destroy();
        planVsActualChartInstance = new Chart(ctx, { 
            type: 'bar', 
            data: chartData, 
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true } }
            }
        });
    }

    // =================================================================
    // SECTION 5: CALENDAR & DLOT LOGIC
    // =================================================================

    function initializeCalendar() {
        if (!planningCalendarContainer) return;

        planningCalendarContainer.innerHTML = '';
        
        fullCalendarInstance = new FullCalendar.Calendar(planningCalendarContainer, {
            initialView: 'dayGridMonth',
            height: '100%', 
            expandRows: true,
            headerToolbar: false,
            dayMaxEvents: 2,
            
            // --- [FIX 1] เพิ่มส่วนนี้เพื่อให้ชื่อเดือนแสดงผล ---
            datesSet: function(dateInfo) {
                // อัปเดตข้อความใน Header ให้เป็น Title ของปฏิทิน (เช่น "December 2025")
                if (calendarTitle) {
                    calendarTitle.textContent = dateInfo.view.title;
                }
            },
            // ---------------------------------------------

            eventSources: [
                {
                    id: 'planEvents',
                    events: (info, sc, fc) => fetchCalendarEvents(info, sc, fc)
                },
                {
                    id: 'dlotMarkers',
                    events: fetchDlotMarkers
                }
            ],
            dateClick: (info) => switchToDlotView(info.dateStr),
            eventClick: handleEventClick,
            windowResize: function(arg) {
                console.log('Calendar resized'); 
            },
            handleWindowResize: true
        });
        fullCalendarInstance.render();
    }

    async function fetchCalendarEvents(fetchInfo, successCallback, failureCallback) {
        showSpinner();
        const endDate = formatDateForInput(new Date(new Date(fetchInfo.endStr).setDate(new Date(fetchInfo.endStr).getDate() - 1)));
        const params = { startDate: fetchInfo.startStr.substring(0, 10), endDate: endDate, line: planLineFilter.value || null };
        
        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if (result.success) {
                const today = formatDateForInput(new Date());
                const events = result.data.map(plan => ({
                    id: plan.plan_id,
                    title: `${plan.line} (${plan.shift.substring(0,1)}): ${plan.sap_no || plan.part_no}`,
                    start: plan.plan_date,
                    backgroundColor: (parseFloat(plan.actual_quantity) >= parseFloat(plan.adjusted_planned_quantity)) ? 'rgba(75, 192, 192, 0.7)' : 'rgba(255, 99, 132, 0.7)',
                    extendedProps: { planData: plan }
                }));
                successCallback(events);
            }
        } catch (error) {
            failureCallback(error);
        } finally {
            hideSpinner();
        }
    }

    async function fetchDlotMarkers(fetchInfo, successCallback, failureCallback) {
        const endDate = formatDateForInput(new Date(new Date(fetchInfo.endStr).setDate(new Date(fetchInfo.endStr).getDate() - 1)));
        try {
            const result = await sendRequest(DLOT_API, 'get_dlot_dates', 'GET', null, { 
                startDate: fetchInfo.startStr.substring(0, 10), 
                endDate: endDate, 
                line: planLineFilter.value || 'ALL'
            });
            if (result.success) {
                successCallback(result.data.map(date => ({ start: date, display: 'background', className: 'dlot-marker-bg', extendedProps: { type: 'dlot_marker' } })));
            }
        } catch (error) { failureCallback(error); }
    }

    function handleEventClick(info) {
        if (info.event.extendedProps.planData) openPlanModal(info.event.extendedProps.planData);
        else if (info.event.extendedProps.type === 'dlot_marker') switchToDlotView(info.event.startStr);
    }

    function switchToDlotView(dateString) {
        planningCalendarContainer.style.display = 'none';
        dlotViewContainer.style.display = 'block';
        backToCalendarBtn.style.display = 'inline-block';
        calendarTitle.textContent = `Daily Cost: ${dateString}`;
        dlotDateDisplayEntry.textContent = dateString;
        dlotEntryDateInputHidden.value = dateString;
        
        loadDlotDataForDate(dateString, planLineFilter.value || 'ALL');
    }

    function switchToCalendarView() {
        // 1. สลับหน้า (DOM Manipulation)
        planningCalendarContainer.style.display = 'block';
        dlotViewContainer.style.display = 'none';
        backToCalendarBtn.style.display = 'none';
        
        // 2. ทำลาย Instance เก่า (ถ้ามี)
        if (fullCalendarInstance) {
            fullCalendarInstance.destroy();
            fullCalendarInstance = null;
        }

        // 3. สร้างใหม่ (Re-initialize)
        // ใช้ requestAnimationFrame แทน setTimeout 50ms เพื่อความแม่นยำกว่าในการรอ Repaint
        requestAnimationFrame(() => {
            initializeCalendar();
            
            // คืนค่า Title
            if (calendarTitle) calendarTitle.textContent = "Calendar"; 
        });
    }

    async function loadDlotDataForDate(date, line) {
        dlotHeadcountInput.value = ''; dlotDlCostInput.value = ''; dlotOtCostInput.value = '';
        try {
            const result = await sendRequest(DLOT_API, 'get_daily_costs', 'POST', { action: 'get_daily_costs', entry_date: date, line: line });
            if (result.success && result.data) {
                dlotHeadcountInput.value = result.data.headcount || '';
                dlotDlCostInput.value = result.data.dl_cost || '';
                dlotOtCostInput.value = result.data.ot_cost || '';
            }
        } catch (e) {} finally { updateDlotSummaryView(); }
    }

    async function handleSaveDlotForm(e) {
        e.preventDefault();
        showSpinner();
        try {
            const body = {
                action: 'save_daily_costs',
                entry_date: dlotEntryDateInputHidden.value,
                line: planLineFilter.value || 'ALL',
                headcount: dlotHeadcountInput.value || 0,
                dl_cost: dlotDlCostInput.value || 0,
                ot_cost: dlotOtCostInput.value || 0
            };
            const result = await sendRequest(DLOT_API, 'save_daily_costs', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) fullCalendarInstance?.getEventSourceById('dlotMarkers')?.refetch();
        } catch (e) { showToast('Error saving DLOT.', 'var(--bs-danger)'); }
        finally { hideSpinner(); }
    }

    function updateDlotSummaryView() {
        const dl = parseFloat(dlotDlCostInput.value || 0);
        const ot = parseFloat(dlotOtCostInput.value || 0);
        document.getElementById('dl-cost-summary-display').textContent = dl.toLocaleString();
        document.getElementById('ot-cost-summary-display').textContent = ot.toLocaleString();
        document.getElementById('total-dlot-summary-display').textContent = (dl + ot).toLocaleString();
    }

    // =================================================================
    // SECTION 6: PLAN MODAL & CRUD
    // =================================================================

    function openPlanModal(data = null) {
        planForm.reset();
        planModalPlanId.value = '0';
        planModalItemId.value = '';
        planModalSelectedItem.textContent = 'No Item';
        deletePlanButton.style.display = 'none';
        
        if (data) {
            planModalLabel.textContent = 'Edit Plan';
            planModalPlanId.value = data.plan_id;
            planModalDate.value = data.plan_date;
            planModalLine.value = data.line;
            planModalShift.value = data.shift;
            planModalQuantity.value = data.original_planned_quantity;
            planModalNote.value = data.note || '';
            planModalItemId.value = data.item_id;
            planModalItemSearch.value = `${data.sap_no||''} / ${data.part_no||''}`;
            planModalSelectedItem.textContent = `${data.sap_no||'N/A'} - ${data.part_description||''}`;
            deletePlanButton.style.display = 'inline-block';
        } else {
            planModalLabel.textContent = 'Add Plan';
            planModalDate.value = formatDateForInput(new Date());
        }
        planModal.show();
    }

    async function savePlan() {
        if (!planForm.checkValidity()) { planForm.reportValidity(); return; }
        if (!planModalItemId.value) { showToast('Select item.', 'var(--bs-warning)'); return; }
        
        showSpinner();
        const body = {
            action: 'save_plan',
            plan_id: planModalPlanId.value || 0,
            plan_date: planModalDate.value,
            line: planModalLine.value,
            shift: planModalShift.value,
            item_id: planModalItemId.value,
            original_planned_quantity: planModalQuantity.value,
            note: planModalNote.value || null
        };
        try {
            const result = await sendRequest(PLAN_API, 'save_plan', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                planModal.hide();
                fetchPlans();
                fullCalendarInstance?.getEventSourceById('planEvents')?.refetch();
            }
        } catch (e) { showToast('Error saving plan.', 'var(--bs-danger)'); }
        finally { hideSpinner(); }
    }

    async function deletePlan() {
        const id = planModalPlanId.value;
        if (!id || id === '0') return;
        showSpinner();
        try {
            const result = await sendRequest(PLAN_API, 'delete_plan', 'POST', { action: 'delete_plan', plan_id: id });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                planModal.hide();
                fetchPlans();
                fullCalendarInstance?.refetchEvents();
            }
        } catch (e) { showToast('Error deleting.', 'var(--bs-danger)'); }
        finally { hideSpinner(); }
    }

    // =================================================================
    // SECTION 7: INITIALIZER
    // =================================================================

    function initializeApp() {
        setAllDefaultDates();
        fetchDashboardLines().then(fetchAllItemsForPlanning).then(() => {
            initializeCalendar();
            fetchPlans();
        });

        // Event Listeners
        startDateFilter?.addEventListener('change', fetchPlans);
        endDateFilter?.addEventListener('change', fetchPlans);
        planLineFilter?.addEventListener('change', () => { fetchPlans(); fullCalendarInstance?.refetchEvents(); });
        planShiftFilter?.addEventListener('change', fetchPlans);
        
        btnRefreshPlan?.addEventListener('click', () => { 
            fetchPlans(); 
            fullCalendarInstance?.refetchEvents();
        });
        
        btnAddPlan?.addEventListener('click', () => openPlanModal(null));
        savePlanButton?.addEventListener('click', savePlan);
        deletePlanButton?.addEventListener('click', () => { if (confirm('Delete?')) deletePlan(); });
        
        btnCalculateCarryOver?.addEventListener('click', async () => {
            if (!confirm('Calculate Carry Over?')) return;
            showSpinner();
            try {
                const res = await sendRequest(PLAN_API, 'calculate_carry_over', 'GET');
                showToast(res.message, res.success ? 'var(--bs-success)' : 'var(--bs-danger)');
                if (res.success) fetchPlans();
            } catch (e) {} finally { hideSpinner(); }
        });

        // DLOT Listeners
        backToCalendarBtn?.addEventListener('click', switchToCalendarView);
        dlotEntryForm?.addEventListener('submit', handleSaveDlotForm);
        dlotDlCostInput?.addEventListener('input', updateDlotSummaryView);
        dlotOtCostInput?.addEventListener('input', updateDlotSummaryView);

        // Calendar Button Listeners
        const btnMonth = document.getElementById('calendar-month-view-button');
        const btnWeek = document.getElementById('calendar-week-view-button');

        document.getElementById('calendar-prev-button')?.addEventListener('click', () => fullCalendarInstance?.prev());
        document.getElementById('calendar-next-button')?.addEventListener('click', () => fullCalendarInstance?.next());
        document.getElementById('calendar-today-button')?.addEventListener('click', () => fullCalendarInstance?.today());

        btnMonth?.addEventListener('click', () => {
            if (fullCalendarInstance) {
                fullCalendarInstance.changeView('dayGridMonth');
                // สลับสี: ให้ Month เป็น Active, Week เป็นธรรมดา
                btnMonth.classList.add('active');
                btnWeek.classList.remove('active');
            }
        });

        btnWeek?.addEventListener('click', () => {
            if (fullCalendarInstance) {
                fullCalendarInstance.changeView('timeGridWeek');
                // สลับสี: ให้ Week เป็น Active, Month เป็นธรรมดา
                btnWeek.classList.add('active');
                btnMonth.classList.remove('active');
            }
        });

        // Table Action Listeners
        productionPlanTableBody?.addEventListener('click', (e) => {
            if (e.target.classList.contains('editable-plan') || e.target.closest('.editable-plan')) {
                return;
            }
            const row = e.target.closest('tr');
            if (row && row.dataset.planData) {
                try {
                    const planData = JSON.parse(row.dataset.planData);
                    openPlanModal(planData);
                } catch (err) {
                    console.error("Error parsing plan data", err);
                }
            }
        });
    }

    initializeApp();
});

// =================================================================
    // SECTION 8: EXCEL IMPORT / EXPORT FUNCTIONS
    // =================================================================

    // 1. Export Function
    window.exportToExcel = function() {
        // ใช้ข้อมูลชุดเดียวกับที่แสดงในตาราง (สามารถดึงจาก API หรือตัวแปร global ที่เก็บ data ไว้ก็ได้)
        // สมมติว่าเก็บ data ไว้ใน global variable `currentPlanData` (ต้องไปประกาศเพิ่ม)
        // หรือดึงจาก DOM ก็ได้แต่ง่ายกว่าคือดึงจาก response ของ fetchPlans
        
        const wb = XLSX.utils.book_new();
        // สร้าง Table Element ชั่วคราว หรือใช้ json_to_sheet ถ้ามี data object
        const table = document.getElementById('productionPlanTable');
        const ws = XLSX.utils.table_to_sheet(table);
        XLSX.utils.book_append_sheet(wb, ws, "ProductionPlans");
        XLSX.writeFile(wb, `Production_Plan_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    // 2. Import Function
    window.importFromExcel = function(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
                showToast('Excel file is empty!', 'var(--bs-warning)');
                return;
            }

            // แปลงข้อมูลให้ตรงกับ Format ที่ API ต้องการ
            // คาดหวัง Column: Date, Line, Shift, Item Code, Qty
            const plansToUpload = jsonData.map(row => ({
                date: formatDateForInput(row['Date'] ? new Date((row['Date'] - (25567 + 2)) * 86400 * 1000) : new Date()), // แก้เรื่อง Date Serial ของ Excel
                line: row['Line'] || '',
                shift: row['Shift'] || 'DAY',
                item_code: row['Item Code'] || row['Item'] || '',
                qty: row['Qty'] || row['Quantity'] || 0
            }));

            if(confirm(`Found ${plansToUpload.length} rows. Upload now?`)) {
                showSpinner();
                try {
                    const res = await sendRequest(PLAN_API, 'import_plans_bulk', 'POST', { 
                        action: 'import_plans_bulk', 
                        plans: plansToUpload 
                    });
                    showToast(res.message, res.success ? 'var(--bs-success)' : 'var(--bs-danger)');
                    if (res.success) {
                        fetchPlans(); // รีโหลดข้อมูล
                    }
                } catch(err) {
                    showToast('Upload failed: ' + err.message, 'var(--bs-danger)');
                } finally {
                    hideSpinner();
                    input.value = ''; // Reset input
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // =================================================================
    // SECTION 9: MANPOWER INTEGRATION (CONCEPT)
    // =================================================================
    
    // เพิ่มฟังก์ชันนี้ลงใน global scope หรือเชื่อมกับปุ่มใน DLOT Form
    window.autoCalculateDlotFromManpower = async function() {
        const date = document.getElementById('dlot-entry-date').value;
        const line = planLineFilter.value || 'ALL';
        
        if(!confirm(`Auto-calculate labor cost for ${date} (Line: ${line}) from Manpower system?`)) return;

        showSpinner();
        try {
            // เรียก API ใหม่ (ต้องไปสร้าง case 'calc_dlot_auto' ใน dlot_manual_manage.php)
            const res = await sendRequest(DLOT_API, 'calc_dlot_auto', 'POST', { 
                action: 'calc_dlot_auto', 
                entry_date: date, 
                line: line 
            });
            
            if (res.success && res.data) {
                // เติมค่าลงฟอร์ม
                document.getElementById('dlot-headcount').value = res.data.headcount;
                document.getElementById('dlot-dl-cost').value = res.data.dl_cost;
                document.getElementById('dlot-ot-cost').value = res.data.ot_cost;
                updateDlotSummaryView(); // อัปเดตตัวเลขรวมทันที
                showToast('Calculated from Manpower data!', 'var(--bs-success)');
            } else {
                showToast('No Manpower data found for this date.', 'var(--bs-warning)');
            }
        } catch (err) {
            showToast('Calculation failed.', 'var(--bs-danger)');
        } finally {
            hideSpinner();
        }
    };