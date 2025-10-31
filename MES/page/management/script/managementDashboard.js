"use strict";
document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // SECTION 1: GLOBAL VARIABLES & CONSTANTS
    // =================================================================

    const todayString = formatDateForInput(new Date());

    // --- State Variables ---
    let allPlanningItems = [];
    let selectedPlanItem = null;
    let planVsActualChartInstance = null;
    let fullCalendarInstance = null;
    let dlotDateSet = new Set();
    let planNoteEditDebounceTimer;
    let planCarryOverEditDebounceTimer;
    let debounceTimerAutocomplete;

    // --- DOM Element References ---
    const mainContent = document.getElementById('main-content');
    const planModalElement = document.getElementById('planModal');
    const planModal = new bootstrap.Modal(planModalElement);
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const planLineFilter = document.getElementById('planLineFilter');
    const planShiftFilter = document.getElementById('planShiftFilter');
    const btnRefreshPlan = document.getElementById('btn-refresh-plan');
    const btnAddPlan = document.getElementById('btnAddPlan');
    const btnCalculateCarryOver = document.getElementById('btnCalculateCarryOver');
    
    // Chart & Table
    const chartDateDisplay = document.getElementById('chartDateDisplay');
    const planVsActualChartCanvas = document.getElementById('planVsActualChart');
    const productionPlanTableBody = document.getElementById('productionPlanTableBody');
    
    // Calendar & DLOT View
    const calendarCardHeader = document.querySelector('.calendar-card .card-header');
    const calendarTitle = document.getElementById('calendar-title');
    const backToCalendarBtn = document.getElementById('backToCalendarBtn');
    const planningCalendarContainer = document.getElementById('planningCalendarContainer');
    const dlotViewContainer = document.getElementById('dlotViewContainer');
    const dlotDateDisplayCost = document.getElementById('dlotDateDisplayCost');
    const dlotDateDisplayEntry = document.getElementById('dlotDateDisplayEntry');
    const dlotEntryForm = document.getElementById('dlot-entry-form');
    const dlotEntryDateInputHidden = document.getElementById('dlot-entry-date');
    const dlotHeadcountInput = document.getElementById('dlot-headcount');
    const dlotDlCostInput = document.getElementById('dlot-dl-cost');
    const dlotOtCostInput = document.getElementById('dlot-ot-cost');
    const btnSaveDlot = document.getElementById('btn-save-dlot');
    
    // DLOT Cost Summary
    const stdDlCostDisplayDlot = document.getElementById('std-dl-cost-display-dlot');
    const actualDlotCostDisplayDlot = document.getElementById('actual-dlot-cost-display-dlot');
    const dlVarianceDisplayDlot = document.getElementById('dl-variance-display-dlot');
    const varianceCardDlot = document.getElementById('variance-card-dlot');
    
    // Plan Modal
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
    // SECTION 2: CORE HELPER FUNCTIONS
    // =================================================================
    
    /**
     * Formats a Date object into 'YYYY-MM-DD' string.
     * @param {Date} date The date object to format.
     * @returns {string} Formatted date string.
     */
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

    /**
     * Sets the default date for the plan filter.
     */
    function setAllDefaultDates() {
        const today = new Date();
        const todayFormatted = formatDateForInput(today);

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        const sevenDaysAgoFormatted = formatDateForInput(sevenDaysAgo);

        if (startDateFilter && !startDateFilter.value) startDateFilter.value = sevenDaysAgoFormatted;
        if (endDateFilter && !endDateFilter.value) endDateFilter.value = todayFormatted;
    }

    function updateDlotSummaryView() {
        // 1. ค้นหา DOM elements ใหม่
        const dlDisplay = document.getElementById('dl-cost-summary-display');
        const otDisplay = document.getElementById('ot-cost-summary-display');
        const totalDisplay = document.getElementById('total-dlot-summary-display');

        if (!dlDisplay || !otDisplay || !totalDisplay) return;

        // 2. อ่านค่าจาก Inputs
        const dlValue = parseFloat(dlotDlCostInput.value || 0);
        const otValue = parseFloat(dlotOtCostInput.value || 0);
        const totalValue = dlValue + otValue;

        // 3. อัปเดต UI
        dlDisplay.textContent = dlValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        otDisplay.textContent = otValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        totalDisplay.textContent = totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // =================================================================
    // SECTION 3: DATA FETCHING & UI RENDERING
    // =================================================================

    /**
     * Fetches production lines and populates all line dropdowns.
     */
    async function fetchDashboardLines() {
        try {
            const result = await sendRequest(FILTERS_API, 'get_filters', 'GET');
            if (result.success && result.data && result.data.lines) {
                const lines = result.data.lines;
                
                [planLineFilter, planModalLine].forEach(select => { 

                    if (select) {
                        const valueToKeep = (select.id === 'planLineFilter' || select.id === 'planModalLine') ? "" : "";
                        select.querySelectorAll(`option:not([value="${valueToKeep}"])`).forEach(opt => opt.remove());
                        lines.forEach(line => {
                            select.appendChild(new Option(line, line));
                        });
                    }
                });
                if (planModalLine && !planModalLine.querySelector('option[value=""]')) {
                    const opt = new Option("Select Line...", "", true, true);
                    opt.disabled = true;
                    planModalLine.prepend(opt);
                }
            } else {
                console.warn("Lines data missing.", result);
                showToast('Could not retrieve lines.', 'var(--bs-warning)');
            }
        } catch (error) {
            console.error("Error fetching lines:", error);
            showToast('Failed load lines.', 'var(--bs-danger)');
        }
    }

    /**
     * Fetches all items for the planning modal autocomplete.
     */
    async function fetchAllItemsForPlanning() {
        try {
            const params = { limit: -1, show_inactive: false };
            const result = await sendRequest(ITEM_SEARCH_API, 'get_items', 'GET', null, params);
            if (result.success && result.data) {
                allPlanningItems = result.data;
                setupPlanItemAutocomplete(); // Setup autocomplete after items are loaded
            } else {
                console.error("Failed load items:", result.message);
                showToast('Error loading items.', 'var(--bs-danger)');
            }
        } catch (error) {
            console.error("Error fetching items:", error);
            showToast('Failed to load items.', 'var(--bs-danger)');
        }
    }

    /**
     * Fetches plans based on global filters and updates table/chart.
     */
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
                productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">${result.message || 'Failed.'}</td></tr>`;
                renderPlanVsActualChart([]);
            }
        } catch (error) {
            console.error("Error fetch plans:", error);
            productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error loading plans.</td></tr>`;
            renderPlanVsActualChart([]);
        } finally {
            hideSpinner();
        }
    }

    /**
     * Renders the main production plan table.
     */
    function renderPlanTable(data) {
        productionPlanTableBody.innerHTML = '';
        if (!data || data.length === 0) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No plans found.</td></tr>`;
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
            let actualClass = actualQty < adjustedPlan ? 'text-danger' : (actualQty >= adjustedPlan && adjustedPlan > 0 ? 'text-success' : '');
            
            tr.innerHTML = `
                <td>${plan.plan_date||''}</td>
                <td>${plan.line||''}</td>
                <td>${plan.shift||''}</td>
                <td><span class="fw-bold">${plan.sap_no||'N/A'}</span> / ${plan.part_no||'N/A'}<small class="d-block text-muted">${plan.part_description||''}</small></td>
                <td class="text-center">${originalPlan.toLocaleString()}</td>
                <td class="text-center ${actualClass}">${actualQty.toLocaleString()}</td>
                <td class="text-center ${carryOver > 0 ? 'text-warning' : ''}">
                    <span class="text-center editable-plan" contenteditable="true" data-id="${plan.plan_id}" data-field="carry_over" inputmode="decimal" tabindex="0">${carryOver.toLocaleString()}</span>
                </td>
                <td class="text-center fw-bold" data-field="adjusted_plan">${adjustedPlan.toLocaleString()}</td>
                <td class="text-center">
                    <span class="text-center editable-plan" contenteditable="true" data-id="${plan.plan_id}" data-field="note" tabindex="0">${plan.note || ''}</span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary edit-plan-btn" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-plan-btn ms-1" title="Delete"><i class="fas fa-trash"></i></button>
                </td>`;
            productionPlanTableBody.appendChild(tr);
        });
    }

    /**
     * [HELPER] อ่านค่าสีจาก CSS Variable และแปลงเป็น RGBA
     * @param {string} varName - ชื่อตัวแปร CSS (เช่น '--mes-chart-color-1')
     * @param {float} alpha - ค่าความโปร่งใส (เช่น 0.7)
     * @returns {string} - สตริงสี rgba()
     */
    function getCssVarAsRgba(varName, alpha = 1.0) {
        try {
            const colorValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            if (!colorValue) throw new Error(`CSS var ${varName} not found.`);

            let hex = colorValue.replace('#', '');
            
            if (hex.length === 3) {
                hex = hex.split('').map(char => char + char).join('');
            }

            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            return `rgba(${r}, ${g}, ${b}, ${alpha})`;

        } catch (error) {
            console.warn(error.message);
            // Fallback (เผื่อหา CSS Var ไม่เจอ)
            if (varName.includes('danger')) return `rgba(220, 53, 69, ${alpha})`;
            if (varName.includes('success')) return `rgba(25, 135, 84, ${alpha})`;
            if (varName.includes('warning')) return `rgba(255, 193, 7, ${alpha})`;
            if (varName.includes('chart-color-3')) return `rgba(253, 126, 20, ${alpha})`; // Orange
            if (varName.includes('chart-color-2')) return `rgba(111, 66, 193, ${alpha})`; // Purple
            return `rgba(13, 110, 253, ${alpha})`; // Default Blue
        }
    }

    /**
     * [REFACTORED v4 - Final Logic]
     * Renders the Plan vs Actual chart.
     * - (Goal 1) Consolidates 'Actual' datalabels into a single total,
     * displayed on the topmost segment ('Unplanned').
     * - (Goal 2) Enriches the tooltip to include Part No. and Description.
     */
    function renderPlanVsActualChart(planData) {
        const chartCanvas = planVsActualChartCanvas;
        if (!chartCanvas) return;
        const ctx = chartCanvas.getContext('2d');
        
        // 1. ตั้งค่า Header (เหมือนเดิม)
        if (chartDateDisplay) {
            if (typeof startDateFilter !== 'undefined' && typeof endDateFilter !== 'undefined') {
                chartDateDisplay.textContent = `${startDateFilter.value} to ${endDateFilter.value}`;
            } else if (typeof planDateFilter !== 'undefined') {
                chartDateDisplay.textContent = planDateFilter.value;
            }
        }

        // --- 2. AggregatedData (⭐️ [FIX 1] เพิ่ม PartNo/Desc สำหรับ Tooltip) ---
        const aggregatedData = {};
        planData.forEach(p => {
            const itemId = p.item_id;
            const identifier = p.sap_no || p.part_no || `Item ${itemId}`;
            const adjustedPlan = parseFloat(p.adjusted_planned_quantity || 0);
            const actualQty = parseFloat(p.actual_quantity || 0);
            const originalPlan = parseFloat(p.original_planned_quantity || 0);
            const carryOver = parseFloat(p.carry_over_quantity || 0);

            if (!aggregatedData[itemId]) {
                aggregatedData[itemId] = {
                    label: identifier,
                    part_no: p.part_no, // 👈 [เพิ่ม] สำหรับ Tooltip
                    part_description: p.part_description, // 👈 [เพิ่ม] สำหรับ Tooltip
                    totalAdjustedPlan: 0,
                    totalActualQty: 0,
                    totalOriginalPlan: 0,
                    totalCarryOver: 0
                };
            }
            aggregatedData[itemId].totalAdjustedPlan += adjustedPlan;
            aggregatedData[itemId].totalActualQty += actualQty;
            aggregatedData[itemId].totalOriginalPlan += originalPlan;
            aggregatedData[itemId].totalCarryOver += carryOver;
        });
        const aggregatedArray = Object.values(aggregatedData);
        // --- [END FIX 1] ---

        // --- 3. Data Arrays (Logic v3 - ถูกต้องแล้ว) ---
        const labels = aggregatedArray.map(agg => agg.label);
        const totalOriginalPlanData = aggregatedArray.map(agg => agg.totalOriginalPlan);
        const totalCarryOverData = aggregatedArray.map(agg => agg.totalCarryOver);
        const totalAdjustedPlanData = aggregatedArray.map(agg => agg.totalAdjustedPlan); 
        
        const metPlanData = aggregatedArray.map(agg => {
            const Plan = agg.totalAdjustedPlan;
            const Actual = agg.totalActualQty;
            return (Actual >= Plan && Plan > 0) ? Plan : null;
        });
        
        const shortfallData = aggregatedArray.map(agg => {
            const Plan = agg.totalAdjustedPlan;
            const Actual = agg.totalActualQty;
            return (Actual < Plan && Plan > 0) ? Actual : null; 
        });

        const unplannedData = aggregatedArray.map(agg => {
            const Plan = agg.totalAdjustedPlan;
            const Actual = agg.totalActualQty;
            return (Actual > 0) ? Math.max(0, Actual - Plan) : null;
        });
        
        const dataMaxValue = Math.max(0, ...totalAdjustedPlanData, ...aggregatedArray.map(agg => agg.totalActualQty));
        const suggestedTopValue = dataMaxValue > 0 ? dataMaxValue * 1.15 : 10;
        
        // --- 4. ChartData Datasets (สะอาด) ---
        const chartData = {
            labels: labels,
            datasets: [
                { label: 'Original Plan', data: totalOriginalPlanData, backgroundColor: 'rgba(54, 162, 235, 0.7)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1, stack: 'plan' },
                { label: 'Carry Over', data: totalCarryOverData, backgroundColor: 'rgba(255, 159, 64, 0.7)', borderColor: 'rgba(255, 159, 64, 1)', borderWidth: 1, stack: 'plan' },
                { label: 'Actual (Met Plan)', data: metPlanData, backgroundColor: 'rgba(75, 192, 192, 0.7)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1, stack: 'actual' },
                { label: 'Actual (Shortfall)', data: shortfallData, backgroundColor: 'rgba(255, 99, 132, 0.7)', borderColor: 'rgba(255, 99, 132, 1)', borderWidth: 1, stack: 'actual' },
                { label: 'Actual (Unplanned)', data: unplannedData, backgroundColor: 'rgba(153, 102, 255, 0.7)', borderColor: 'rgba(153, 102, 255, 1)', borderWidth: 1, stack: 'actual' }
            ]
        };

        // --- 5. ChartOptions (⭐️ [FIX 2] แก้ไข Tooltip และ Datalabels) ---
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 25 } },
            scales: {
                y: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Total Quantity' }, 
                    ticks: { callback: v => v.toLocaleString() },
                    suggestedMax: suggestedTopValue,
                    stacked: true
                },
                x: { 
                    ticks: { 
                        maxRotation: 0, 
                        minRotation: 0,
                        font: { size: 11 },
                        autoSkip: false
                    },
                    stacked: true,
                    offset: true    
                }
            },
            plugins: {
                legend: { 
                    position: 'top',
                },
                
                // ⭐️ [FIX 2.1] เพิ่ม Title Callback ให้ Tooltip
                tooltip: { 
                    callbacks: {
                        title: (tooltipItems) => {
                            if (!tooltipItems.length) return '';
                            const dataIndex = tooltipItems[0].dataIndex;
                            const aggItem = aggregatedArray[dataIndex];
                            if (!aggItem) return '';
                            
                            const title = aggItem.label; // SAP No
                            const partNo = aggItem.part_no || 'N/A';
                            const desc = aggItem.part_description || 'No Description';
                            
                            // คืนค่าเป็น Array เพื่อแสดงผลหลายบรรทัด
                            return [
                                title,
                                partNo,
                                desc
                            ];
                        },
                        label: c => { // (คงเดิม)
                            if (c.parsed.y === null) return null;
                            return `${c.dataset.label || ''}: ${c.parsed.y.toLocaleString()}`;
                        }
                    },
                    mode: 'index',
                    intersect: false
                },
                
                // ⭐️ [FIX 2.2] แก้ไข Logic การแสดงผล Datalabels
                datalabels: {
                    formatter: (value, context) => {
                        const label = context.dataset.label;
                        const dataIndex = context.dataIndex;
                        const aggItem = aggregatedArray[dataIndex];
                        if (!aggItem) return null;

                        // 1. ซ่อน 'Original Plan'
                        if (label === 'Original Plan') {
                            return null;
                        }
                        
                        // 2. แสดง "Total Plan" บน 'Carry Over'
                        if (label === 'Carry Over') {
                            const totalPlan = aggItem.totalAdjustedPlan;
                            return totalPlan > 0 ? totalPlan.toLocaleString() : '';
                        }

                        // 3. ซ่อน 'Met Plan' และ 'Shortfall'
                        if (label === 'Actual (Met Plan)' || label === 'Actual (Shortfall)') {
                            return null;
                        }

                        // 4. แสดง "Total Actual" บน 'Unplanned'
                        if (label === 'Actual (Unplanned)') {
                            const totalActual = aggItem.totalActualQty;
                            return totalActual > 0 ? totalActual.toLocaleString() : '';
                        }

                        return null; // ซ่อน Dataset อื่นๆ (ถ้ามี)
                    },
                    
                    // --- ตั้งค่าการจัดรูปแบบ (ให้ Total Plan และ Total Actual เหมือนกัน) ---
                    anchor: 'end',
                    align: 'top',
                    color: '#444',
                    
                    font: (context) => {
                        const label = context.dataset.label;
                        // ถ้าเป็นแท่งบนสุดของ Stack (Carry Over หรือ Unplanned) ให้ตัวหนา
                        if (label === 'Carry Over' || label === 'Actual (Unplanned)') {
                            return { size: 10, weight: 'bold' };
                        }
                        return { size: 10 };
                    },
                    
                    offset: (context) => {
                        const label = context.dataset.label;
                        // ถ้าเป็นแท่งบนสุดของ Stack ให้ขยับลอยขึ้น
                        return (label === 'Carry Over' || label === 'Actual (Unplanned)') ? -5 : 0;
                    }
                }
            },
        };

        // --- 8. Render (เหมือนเดิม) ---
        if (planVsActualChartInstance) {
            planVsActualChartInstance.destroy();
        }

        const availablePlugins = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];
        planVsActualChartInstance = new Chart(ctx, { type: 'bar', data: chartData, options: chartOptions , plugins: availablePlugins });
        if (availablePlugins.length === 0) { console.warn("ChartDataLabels plugin not found."); }
    }

    /**
     * [REVERTED] Fetches ONLY Plan events for the FullCalendar.
     * (DLOT is now handled by fetchDlotMarkers)
     */
    async function fetchCalendarEvents(fetchInfo, successCallback, failureCallback) {
        showSpinner();
        
        const startDate = fetchInfo.startStr.substring(0, 10);
        const calendarEndDate = new Date(fetchInfo.endStr);
        calendarEndDate.setDate(calendarEndDate.getDate() - 1);
        const endDate = formatDateForInput(calendarEndDate);

        const planParams = { 
            startDate: startDate,
            endDate: endDate,
            line: planLineFilter.value || null 
        };
        
        try {
            // 1. ดึงเฉพาะ Plan
            const planResult = await sendRequest(PLAN_API, 'get_plans', 'GET', null, planParams);

            // 2. ประมวลผล Plan Events
            if (planResult.success && planResult.data) {
                successCallback(transformPlansToEvents(planResult.data));
            } else {
                throw new Error(planResult.message || 'Failed load events');
            }

        } catch (error) {
            console.error("Error fetching calendar data:", error);
            showToast('Error loading calendar data.', 'var(--bs-danger)');
            failureCallback(error);
        } finally {
            hideSpinner();
        }
    }

    /**
     * [NEW v2 - Background Event] Fetches DLOT (Direct Labor/OT) entry dates.
     * These will be rendered as background events.
     */
    async function fetchDlotMarkers(fetchInfo, successCallback, failureCallback) {
        const startDate = fetchInfo.startStr.substring(0, 10);
        
        const calendarEndDate = new Date(fetchInfo.endStr);
        calendarEndDate.setDate(calendarEndDate.getDate() - 1);
        const endDate = formatDateForInput(calendarEndDate);

        const params = { 
            startDate: startDate,
            endDate: endDate,
            line: planLineFilter.value || 'ALL'
        };

        try {
            const result = await sendRequest(DLOT_API, 'get_dlot_dates', 'GET', null, params);
            
            if (result.success && Array.isArray(result.data)) {
                // ⭐️ แปลง "วันที่" ให้เป็น Background Event
                const dlotEvents = result.data.map(dateString => ({
                    // ⭐️ ไม่ต้องมี Title
                    start: dateString,
                    allDay: true,
                    display: 'background', // ⭐️⭐️ [สำคัญ] แสดงเป็นพื้นหลัง
                    className: 'dlot-marker-bg', // ⭐️⭐️ [สำคัญ] ใช้ CSS ที่เราเพิ่งเพิ่ม
                    extendedProps: { type: 'dlot_marker' } 
                }));
                successCallback(dlotEvents);
            } else {
                throw new Error(result.message || 'Failed to load DLOT markers');
            }
        } catch (error) {
            console.error("Error fetching DLOT markers:", error);
            failureCallback(error);
        }
    }

    /**
     * [UPGRADED v3 - Synced Colors]
     * Uses the exact same color palette as the Bar Chart for consistency.
     */
    function transformPlansToEvents(plans) {
        return plans.map(plan => {
            // --- 1. ดึงข้อมูล ---
            const adjustedPlan = parseFloat(plan.adjusted_planned_quantity || 0);
            const actualQty = parseFloat(plan.actual_quantity || 0);
            const planDate = plan.plan_date;

            // --- 2. กำหนดค่าเริ่มต้น (จาก Chart Palette) ---
            let statusColor = 'rgba(201, 203, 207, 0.7)'; // Default: สีเทา (Chart Gray)
            let borderStyle = 'solid';

            // --- 3. ใช้ Logic 7 ข้อ (ด้วยสีชุดใหม่) ---

            // ⭐️ Rule 6: ปิดยอดแล้ว (สีเขียว)
            // (ใช้สีเขียว/Teal จากกราฟ)
            if (adjustedPlan > 0 && actualQty >= adjustedPlan) {
                statusColor = 'rgba(75, 192, 192, 0.7)'; // Chart Green
            }
            // ⭐️ Rule 5: ผลิตโดยไม่มีแผน (สีม่วง)
            // (ใช้สีม่วงจากกราฟ)
            else if (adjustedPlan <= 0 && actualQty > 0) {
                statusColor = 'rgba(153, 102, 255, 0.7)'; // Chart Purple (Unplanned)
            }
            // ⭐️ Rule 7: "กำลังทำ" ในวันนี้ (สีส้ม)
            // (ใช้สีส้ม C/O จากกราฟ แทนสีม่วงเดิม)
            else if (adjustedPlan > 0 && actualQty < adjustedPlan && planDate === todayString) {
                statusColor = 'rgba(255, 159, 64, 0.7)'; // Chart Orange (Carry Over)
                borderStyle = 'dashed'; // ⭐️ ทำให้แตกต่าง
            }
            // ⭐️ Rule 4: "ตกแผน" (อดีต) (สีแดง)
            // (ใช้สีแดงจากกราฟ)
            else if (adjustedPlan > 0 && actualQty < adjustedPlan && planDate < todayString) {
                statusColor = 'rgba(255, 99, 132, 0.7)'; // Chart Red (Shortfall)
            }
            // ⭐️ Rule 2: "แผนในอนาคต" (สีเทา)
            // (ใช้สีเทาจากกราฟ)
            else if (adjustedPlan > 0 && planDate > todayString) {
                statusColor = 'rgba(201, 203, 207, 0.7)'; // Chart Gray
            }
            // --- (กรณีอื่นๆ: เช่น แผน 0 ยอด 0 จะใช้สีเทา Default) ---


            // --- 4. สร้าง Title (เอาไอคอนออก) ---
            const title = `${plan.line} (${plan.shift.substring(0,1)}): ${plan.sap_no || plan.part_no}`;
            
            // --- 5. คืนค่า Event Object ---
            return {
                id: plan.plan_id,
                title: title,
                start: plan.plan_date,
                allDay: true,
                backgroundColor: statusColor,
                borderColor: statusColor.replace('0.7', '1'),
                borderStyle: borderStyle,
                extendedProps: { planData: plan }
            };
        });
    }

    /**
     * [UPGRADED] Loads existing DLOT data and updates the new summary view.
     */
    async function loadDlotDataForDate(entry_date, line) {
        if (!entry_date) return;
        
        // เคลียร์ค่า Input
        dlotHeadcountInput.value = '';
        dlotDlCostInput.value = '';
        dlotOtCostInput.value = '';

        try {
            const body = { action: 'get_daily_costs', entry_date: entry_date, line: line };
            const result = await sendRequest(DLOT_API, 'get_daily_costs', 'POST', body);
            
            if (result.success && result.data) {
                dlotHeadcountInput.value = result.data.headcount > 0 ? result.data.headcount : '';
                dlotDlCostInput.value = result.data.dl_cost > 0 ? result.data.dl_cost : '';
                dlotOtCostInput.value = result.data.ot_cost > 0 ? result.data.ot_cost : '';
            } else {
                console.warn(`No DLOT data for ${entry_date}/${line}`);
            }
        } catch (error) {
            console.error("Error fetching DLOT:", error);
            showToast('Failed load entry data.', 'var(--bs-danger)');
        } finally {
            // ⭐️ [NEW] อัปเดต Summary (ไม่ว่าจะโหลดสำเร็จหรือล้มเหลว)
            updateDlotSummaryView();
        }
    }

    /* (เก็บเอาไว้ก่อน เผื่อใช้ในอนาคต)
    async function fetchCostSummaryForDate(date, line) {
        if (!date) return;
        stdDlCostDisplayDlot.textContent = '...';
        actualDlotCostDisplayDlot.textContent = '...';
        dlVarianceDisplayDlot.textContent = '...';
        const params = { startDate: date, endDate: date, line: line === 'ALL' ? null : line };
        try {
            const result = await sendRequest(DLOT_API, 'get_cost_summary', 'GET', null, params);
            if (result.success && result.data) {
                updateCostSummaryUIDlot(result.data.standard, result.data.actual);
            } else {
                throw new Error(result.message || 'Failed load cost summary');
            }
        } catch (error) {
            console.error("Error fetching cost:", error);
            showToast(error.message, 'var(--bs-danger)');
            updateCostSummaryUIDlot(null, null);
        }
    }

    function updateCostSummaryUIDlot(standardData, actualData) {
        const stdCost = (standardData?.TotalDLCost != null) ? parseFloat(standardData.TotalDLCost) : 0;
        const actualCost = (actualData?.TotalActualDLOT != null) ? parseFloat(actualData.TotalActualDLOT) : 0;
        const variance = actualCost - stdCost;
        stdDlCostDisplayDlot.textContent = stdCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        actualDlotCostDisplayDlot.textContent = actualCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        dlVarianceDisplayDlot.textContent = variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        varianceCardDlot.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-light', 'text-white');
        if (variance < 0) {
            varianceCardDlot.classList.add('text-bg-success', 'text-white');
        } else if (variance > 0) {
            varianceCardDlot.classList.add('text-bg-danger', 'text-white');
        } else {
            varianceCardDlot.classList.add('text-bg-light');
        }
    }
    */

    // =================================================================
    // SECTION 4: ACTIONS & MODAL LOGIC
    // =================================================================

    /**
     * [UPGRADED v3 - Event Sources] Initializes the FullCalendar instance.
     * Uses TWO event sources (Plans + DLOT Backgrounds)
     * Removes the problematic dayCellDidMount hook.
     */
    function initializeCalendar() {
        if (!planningCalendarContainer) {
            console.error("Calendar container missing.");
            return;
        }
        planningCalendarContainer.innerHTML = '';
        fullCalendarInstance = new FullCalendar.Calendar(planningCalendarContainer, {
            initialView: 'dayGridMonth',
            headerToolbar: false,
            editable: false,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: 3,
            
            // ⭐️ [แก้ไข] ใช้ eventSources เพื่อดึงข้อมูล 2 ชุด
            eventSources: [
                {
                    id: 'planEvents',
                    events: fetchCalendarEvents // (ฟังก์ชันนี้จะดึงแค่ "Plan" อย่างเดียว)
                },
                {
                    id: 'dlotMarkers',
                    events: fetchDlotMarkers // (ฟังก์ชันนี้จะดึง "Background" อย่างเดียว)
                }
            ],

            dateClick: handleDateClick,
            eventClick: handleEventClick, // ⭐️ (เราต้องแก้ handleEventClick ด้วย)
            themeSystem: 'bootstrap5',
            buttonIcons: { prev: 'bi-chevron-left', next: 'bi-chevron-right' },

            datesSet: function(dateInfo) {
                if (calendarTitle) {
                    calendarTitle.textContent = dateInfo.view.title;
                }
            },
            viewDidMount: function(dateInfo) {
                 if (calendarTitle) {
                    calendarTitle.textContent = dateInfo.view.title;
                }
            }
            
            // ⭐️⭐️ [ลบ] ลบ dayCellDidMount ทั้งหมด (ถ้ายังมี) ⭐️⭐️
            // dayCellDidMount: function(hookProps) { ... }
        });
        fullCalendarInstance.render();
    }

    /**
     * Handles click on a date in the calendar.
     */
    function handleDateClick(dateClickInfo) {
        switchToDlotView(dateClickInfo.dateStr);
    }

    /**
     * [UPGRADED] Handles click on an event in the calendar.
     * Differentiates between clicking a Plan or a DLOT Marker (if clickable).
     */
    function handleEventClick(eventClickInfo) {
        const props = eventClickInfo.event.extendedProps;

        if (props?.planData) {
            // 1. ถ้าคลิก "แผน" (มี planData) -> เปิด Modal แก้ไข
            openPlanModal(props.planData);
            
        } else if (props?.type === 'dlot_marker') {
            // 2. ถ้าคลิก "DLOT Marker" (เผื่อคลิกโดน) -> เปิดหน้า DLOT
            switchToDlotView(eventClickInfo.event.startStr);
            
        } else {
            // 3. อื่นๆ (ถ้ามี)
            console.warn("Clicked on an unknown event type", eventClickInfo.event);
        }
    }

    /**
     * Switches the UI from Calendar view to DLOT entry view.
     */
    function switchToDlotView(dateString) {
        if (planningCalendarContainer) planningCalendarContainer.style.display = 'none';
        if (dlotViewContainer) dlotViewContainer.style.display = 'flex';
        if (backToCalendarBtn) backToCalendarBtn.style.display = 'inline-block';
        if (calendarTitle) calendarTitle.textContent = `Daily Cost Entry`;
        if (dlotDateDisplayCost) dlotDateDisplayCost.textContent = dateString;
        if (dlotDateDisplayEntry) dlotDateDisplayEntry.textContent = dateString;
        dlotEntryDateInputHidden.value = dateString;
        
        loadDlotDataForDate(dateString, planLineFilter.value || 'ALL');
        //fetchCostSummaryForDate(dateString, planLineFilter.value || 'ALL');
    }

    /**
     * Switches the UI back to the Calendar view.
     */
    function switchToCalendarView() {
        if (planningCalendarContainer) planningCalendarContainer.style.display = '';
        if (dlotViewContainer) dlotViewContainer.style.display = 'none';
        if (backToCalendarBtn) backToCalendarBtn.style.display = 'none';
        if (calendarTitle) calendarTitle.textContent = `Planning Calendar`;

        // Fix for calendar rendering issue when toggling display
        setTimeout(() => {
            if (fullCalendarInstance) {
                fullCalendarInstance.updateSize();
            }
        }, 10);
    }

    /**
     * Handles the submission of the DLOT entry form.
     */
    async function handleSaveDlotForm(event) {
        event.preventDefault();
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
            if (result.success) {
                //await fetchCostSummaryForDate(dlotEntryDateInputHidden.value, planLineFilter.value || 'ALL');
                if (fullCalendarInstance) {
                    fullCalendarInstance.getEventSourceById('dlotMarkers')?.refetch();
                }
            }
        } catch (error) {
            console.error("Error saving DLOT:", error);
            showToast('Error saving DLOT data.', 'var(--bs-danger)');
        } finally {
            hideSpinner();
        }
    }

    /**
     * Handles inline editing of the plan note.
     */
    async function handlePlanNoteEdit(planId, newNote) {
        const row = productionPlanTableBody?.querySelector(`tr[data-plan-id="${planId}"]`);
        if (!row || !row.dataset.planData) return;
        
        try {
            const existing = JSON.parse(row.dataset.planData);
            const body = {
                action: 'save_plan',
                plan_id: planId,
                plan_date: existing.plan_date,
                line: existing.line,
                shift: existing.shift,
                item_id: existing.item_id,
                original_planned_quantity: existing.original_planned_quantity,
                note: newNote
            };
            const result = await sendRequest(PLAN_API, 'save_plan', 'POST', body);
            
            if (!result.success) {
                showToast(result.message || 'Failed to save note.', 'var(--bs-danger)');
                const span = row.querySelector('.editable-plan[data-field="note"]');
                if (span) span.textContent = existing.note || '';
            } else {
                existing.note = newNote;
                row.dataset.planData = JSON.stringify(existing);
                const span = row.querySelector('.editable-plan[data-field="note"]');
                if (span) {
                    span.style.boxShadow = '0 0 0 2px var(--bs-success)';
                    setTimeout(() => { span.style.boxShadow = ''; }, 1500);
                }
            }
        } catch (e) {
            console.error("Error saving note:", e);
            showToast('Error saving note.', 'var(--bs-danger)');
        }
    }

    /**
     * Handles inline editing of the carry-over quantity.
     */
    async function handleCarryOverEdit(planId, value, span) {
        showSpinner();
        const row = span.closest('tr');
        const original = JSON.parse(row?.dataset.planData || '{}');
        const originalVal = parseFloat(original.carry_over_quantity || 0);
        const body = { action: 'update_carry_over', plan_id: planId, carry_over_quantity: value };
        
        try {
            const result = await sendRequest(PLAN_API, 'update_carry_over', 'POST', body);
            if (result.success) {
                showToast(result.message || 'Updated.', 'var(--bs-success)');
                original.carry_over_quantity = value;
                const op = parseFloat(original.original_planned_quantity || 0);
                const adj = op + value;
                original.adjusted_planned_quantity = adj;
                row.dataset.planData = JSON.stringify(original);
                
                const adjCell = row.querySelector('td[data-field="adjusted_plan"]');
                if (adjCell) adjCell.textContent = adj.toLocaleString();
                span.textContent = value.toLocaleString();
                span.classList.toggle('text-warning', value > 0);
                span.style.boxShadow = '0 0 0 2px var(--bs-success)';
                setTimeout(() => { span.style.boxShadow = ''; }, 1500);
            } else {
                showToast(result.message || 'Failed.', 'var(--bs-danger)');
                span.textContent = originalVal.toLocaleString();
                span.classList.toggle('text-warning', originalVal > 0);
            }
        } catch (e) {
            console.error("Error updating C/O:", e);
            showToast('Error.', 'var(--bs-danger)');
            span.textContent = originalVal.toLocaleString();
            span.classList.toggle('text-warning', originalVal > 0);
        } finally {
            hideSpinner();
        }
    }

    /**
     * Resets the plan modal to its default state.
     */
    function resetPlanModal() {
        planModalLabel.textContent = 'Add Plan';
        if (planForm) planForm.reset();
        planModalPlanId.value = '0';
        planModalItemId.value = '';
        planModalSelectedItem.textContent = 'No Item';
        planModalItemSearch.classList.remove('is-invalid');
        itemSearchError.style.display = 'none';
        deletePlanButton.style.display = 'none';
        planModalDate.value = endDateFilter.value || startDateFilter.value || formatDateForInput(new Date());
        planModalLine.value = planLineFilter.value || "";
        planModalShift.value = planShiftFilter.value || "";
        if (planModalItemResults) {
            planModalItemResults.innerHTML = '';
            planModalItemResults.style.display = 'none';
        }
    }

    /**
     * Opens the plan modal, optionally populating it with data for editing.
     */
    function openPlanModal(data = null) {
        resetPlanModal();
        if (data) {
            // Edit Mode
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
            // Add Mode
            planModalDate.value = endDateFilter.value || startDateFilter.value || formatDateForInput(new Date());
            planModalLine.value = planLineFilter.value || "";
            planModalShift.value = planShiftFilter.value || "";
        }
        planModal.show();
    }

    /**
     * Saves a new plan or updates an existing one from the modal.
     */
    async function savePlan() {
        if (!planForm || !planForm.checkValidity()) {
            planForm?.reportValidity();
            return;
        }
        if (!planModalItemId.value) {
            planModalItemSearch.classList.add('is-invalid');
            itemSearchError.style.display = 'block';
            showToast('Select item.', 'var(--bs-warning)');
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
            note: planModalNote.value || null
        };
        
        try {
            const result = await sendRequest(PLAN_API, 'save_plan', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                planModal.hide();
                fetchPlans();
                // ⭐️ [แก้ไข]
                if (fullCalendarInstance) {
                    // สั่งโหลด Plan Events ใหม่อย่างเดียว (เพราะ DLOT ไม่เปลี่ยน)
                    fullCalendarInstance.getEventSourceById('planEvents')?.refetch();
                }
            }
        } catch (e) {
            console.error("Error saving plan:", e);
            showToast('Error saving plan.', 'var(--bs-danger)');
        } finally {
            hideSpinner();
            savePlanButton.disabled = false;
            deletePlanButton.disabled = false;
        }
    }

    /**
     * Deletes a plan (triggered from modal or table).
     */
    async function deletePlan() {
        const id = planModalPlanId.value;
        if (!id || id === '0') return;
        
        // Confirmation is handled by the caller
        
        showSpinner();
        savePlanButton.disabled = true;
        deletePlanButton.disabled = true;
        
        const body = { action: 'delete_plan', plan_id: id };
        
        try {
            const result = await sendRequest(PLAN_API, 'delete_plan', 'POST', body);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                planModal.hide();
                fetchPlans();
                if (fullCalendarInstance) fullCalendarInstance.refetchEvents();
            }
        } catch (e) {
            console.error("Error deleting plan:", e);
            showToast('Error deleting plan.', 'var(--bs-danger)');
        } finally {
            hideSpinner();
            savePlanButton.disabled = false;
            deletePlanButton.disabled = false;
        }
    }

    /**
     * Sets up the item search autocomplete logic for the plan modal.
     */
    function setupPlanItemAutocomplete() {
        const input = planModalItemSearch,
              results = planModalItemResults,
              display = planModalSelectedItem,
              hidden = planModalItemId,
              error = itemSearchError;
              
        if (!input || !results || !display || !hidden || !error) return;

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
                i.sap_no?.toLowerCase().includes(val) ||
                i.part_no?.toLowerCase().includes(val) ||
                i.part_description?.toLowerCase().includes(val)
            ).slice(0, 10);

            if (items.length > 0) {
                items.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('autocomplete-item', 'dropdown-item');
                    div.style.cursor = 'pointer';
                    div.innerHTML = `<span class="fw-bold">${item.sap_no||'N/A'}</span>/<small>${item.part_no||'N/A'}</small><small class="d-block text-muted">${item.part_description||''}</small>`;
                    div.dataset.itemId = item.item_id;
                    div.dataset.itemText = `${item.sap_no||''} / ${item.part_no||''}`;
                    div.dataset.itemDetail = `${item.sap_no||'N/A'} - ${item.part_description||''}`;
                    div.addEventListener('click', (e) => {
                        e.stopPropagation();
                        input.value = div.dataset.itemText;
                        hidden.value = div.dataset.itemId;
                        display.textContent = div.dataset.itemDetail;
                        selectedPlanItem = item;
                        results.innerHTML = '';
                        results.style.display = 'none';
                        error.style.display = 'none';
                        input.classList.remove('is-invalid');
                    });
                    results.appendChild(div);
                });
                results.style.display = 'block';
                display.textContent = 'Select...';
            } else {
                results.innerHTML = '<div class="disabled dropdown-item text-muted">No items found.</div>';
                results.style.display = 'block';
                display.textContent = 'No items';
            }
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (results && !input.contains(e.target) && !results.contains(e.target)) {
                results.style.display = 'none';
            }
        });

        // Clear if input is manually emptied
        input.addEventListener('change', () => {
            if (input.value.trim() === '') {
                hidden.value = '';
                selectedPlanItem = null;
                display.textContent = 'No Item';
                error.style.display = 'none';
                input.classList.remove('is-invalid');
            }
        });
    }

    // =================================================================
    // SECTION 5: INITIALIZATION & EVENT LISTENERS
    // =================================================================

    function initialize() {
        // --- Attach Event Listeners ---
        
        // Global Filters
        startDateFilter?.addEventListener('change', fetchPlans);
        endDateFilter?.addEventListener('change', fetchPlans);
        
        planLineFilter?.addEventListener('change', () => {
            fetchPlans();
            if (fullCalendarInstance) fullCalendarInstance.refetchEvents();

            if (dlotViewContainer.style.display === 'flex') {
                const currentDate = dlotEntryDateInputHidden.value;
                loadDlotDataForDate(currentDate, planLineFilter.value || 'ALL');
                fetchCostSummaryForDate(currentDate, planLineFilter.value || 'ALL');
            }
        });

        planShiftFilter?.addEventListener('change', () => {
            fetchPlans();

            if (dlotViewContainer.style.display === 'flex') {
                const currentDate = dlotEntryDateInputHidden.value;
                loadDlotDataForDate(currentDate, planLineFilter.value || 'ALL');
                fetchCostSummaryForDate(currentDate, planLineFilter.value || 'ALL');
            }
        });

        btnRefreshPlan?.addEventListener('click', () => {
            fetchPlans();
            if (fullCalendarInstance) {
                fullCalendarInstance.getEventSourceById('planEvents')?.refetch();
                fullCalendarInstance.getEventSourceById('dlotMarkers')?.refetch();
            }

            if (dlotViewContainer.style.display === 'flex') {
                const currentDate = dlotEntryDateInputHidden.value;
                loadDlotDataForDate(currentDate, planLineFilter.value || 'ALL');
                fetchCostSummaryForDate(currentDate, planLineFilter.value || 'ALL');
            }
        });

        // Main Actions
        btnAddPlan?.addEventListener('click', () => openPlanModal(null));
        btnCalculateCarryOver?.addEventListener('click', async () => {
            if (!confirm('Calculate C/O?')) return;
            showSpinner();
            btnCalculateCarryOver.disabled = true;
            try {
                const res = await sendRequest(PLAN_API, 'calculate_carry_over', 'GET');
                showToast(res.message, res.success ? 'var(--bs-success)' : 'var(--bs-danger)');
                if (res.success) {
                    await fetchPlans();
                    if (fullCalendarInstance) fullCalendarInstance.refetchEvents();
                }
            } catch (e) {
                console.error("Error calculating C/O:", e);
                showToast('Error calculating C/O.', 'var(--bs-danger)');
            } finally {
                hideSpinner();
                btnCalculateCarryOver.disabled = false;
            }
        });

        // Plan Modal
        savePlanButton?.addEventListener('click', savePlan);
        deletePlanButton?.addEventListener('click', () => {
            const id = planModalPlanId.value;
            if (!id || id === '0') return;
            if (confirm(`Delete plan ID: ${id}?`)) {
                deletePlan(); // deletePlan handles spinner and button state
            }
        });

        // DLOT View
        backToCalendarBtn?.addEventListener('click', switchToCalendarView);
        dlotEntryForm?.addEventListener('submit', handleSaveDlotForm);
        
        dlotDlCostInput?.addEventListener('input', updateDlotSummaryView);
        dlotOtCostInput?.addEventListener('input', updateDlotSummaryView);
        
        // Production Plan Table (Event Delegation)
        productionPlanTableBody?.addEventListener('click', (e) => {
            // Edit button click
            const editBtn = e.target.closest('.edit-plan-btn');
            if (editBtn) {
                const row = editBtn.closest('tr');
                if (row?.dataset.planData) {
                    try { openPlanModal(JSON.parse(row.dataset.planData)); } 
                    catch (e) { console.error("Failed to parse plan data:", e); }
                }
                return;
            }
            
            // Delete button click
            const delBtn = e.target.closest('.delete-plan-btn');
            if (delBtn) {
                const row = delBtn.closest('tr');
                const id = row?.dataset.planId;
                if (id) {
                    if (confirm(`Delete ID: ${id}?`)) {
                        planModalPlanId.value = id; // Set ID for deletion
                        deletePlan(); // deletePlan will show spinner
                        planModalPlanId.value = '0'; // Reset after triggering
                    }
                }
                return;
            }
        });
        
        // Table Inline Editing (Blur)
        productionPlanTableBody?.addEventListener('blur', (e) => {
            if (e.target.classList.contains('editable-plan')) {
                const span = e.target;
                const id = parseInt(span.dataset.id);
                const field = span.dataset.field;
                const newVal = span.textContent.trim();
                const row = span.closest('tr');
                if (!row || !id) return;
                
                const orig = JSON.parse(row?.dataset.planData || '{}');
                
                if (field === 'note') {
                    const origVal = orig.note || '';
                    if (newVal !== origVal) {
                        clearTimeout(planNoteEditDebounceTimer);
                        planNoteEditDebounceTimer = setTimeout(() => {
                            handlePlanNoteEdit(id, newVal);
                        }, 300);
                    } else {
                        span.textContent = origVal; // Revert
                    }
                } else if (field === 'carry_over') {
                    const origVal = parseFloat(orig.carry_over_quantity || 0);
                    const numStr = newVal.replace(/,/g, '');
                    let numVal = parseFloat(numStr);
                    
                    if (isNaN(numVal) || numVal < 0) {
                        showToast('Invalid C/O.', 'var(--bs-warning)');
                        span.textContent = origVal.toLocaleString();
                        return;
                    }
                    
                    numVal = parseFloat(numVal.toFixed(2));
                    if (numVal !== origVal) {
                        clearTimeout(planCarryOverEditDebounceTimer);
                        planCarryOverEditDebounceTimer = setTimeout(() => {
                            handleCarryOverEdit(id, numVal, span);
                        }, 200);
                    } else {
                        span.textContent = origVal.toLocaleString(); // Revert
                    }
                }
            }
        }, true); // Use capture phase

        // Table Inline Editing (Keydown)
        productionPlanTableBody?.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('editable-plan')) {
                const field = e.target.dataset.field;
                if (field === 'carry_over') {
                    // Allow only numbers, dot, and navigation keys
                    if (!/[0-9.,]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key)) {
                        e.preventDefault();
                    }
                    // Prevent multiple dots
                    if (e.key === '.' && e.target.textContent.includes('.')) {
                        e.preventDefault();
                    }
                }
                // On Enter, blur the field
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            }
        });

        document.getElementById('calendar-prev-button')?.addEventListener('click', () => {
            fullCalendarInstance?.prev(); // เรียก method .prev() ของ FullCalendar
        });
        document.getElementById('calendar-next-button')?.addEventListener('click', () => {
            fullCalendarInstance?.next(); // เรียก method .next()
        });
        document.getElementById('calendar-today-button')?.addEventListener('click', () => {
            fullCalendarInstance?.today(); // เรียก method .today()
        });
        document.getElementById('calendar-month-view-button')?.addEventListener('click', () => {
            fullCalendarInstance?.changeView('dayGridMonth'); // เปลี่ยน View เป็น Month
            // สลับ active class ของปุ่ม View
            document.getElementById('calendar-month-view-button')?.classList.add('active');
            document.getElementById('calendar-week-view-button')?.classList.remove('active');
        });
        document.getElementById('calendar-week-view-button')?.addEventListener('click', () => {
            fullCalendarInstance?.changeView('timeGridWeek'); // เปลี่ยน View เป็น Week
            // สลับ active class ของปุ่ม View
            document.getElementById('calendar-month-view-button')?.classList.remove('active');
            document.getElementById('calendar-week-view-button')?.classList.add('active');
        });

        // --- Initial Data Load ---
        setAllDefaultDates();
        fetchDashboardLines()
            .then(fetchAllItemsForPlanning) // This now includes setupPlanItemAutocomplete()
            .then(() => {
                initializeCalendar(); // Init calendar after helpers are ready
                fetchPlans(); // Initial load for table and chart
            });
    }

    // Run the application
    initialize();
});