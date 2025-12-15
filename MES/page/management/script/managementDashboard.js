"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // SECTION 1: GLOBAL VARIABLES & DOM ELEMENTS (FIXED IDs)
    // =================================================================

    // --- State Variables ---
    let allPlanningItems = [];
    let selectedPlanItem = null;
    let planVsActualChartInstance = null;
    let fullCalendarInstance = null; 
    let currentExchangeRate = 32.0;
    let currentPage = 1;
    const itemsPerPage = 20;

    // --- DOM Element References ---
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const planLineFilter = document.getElementById('planLineFilter');
    const planShiftFilter = document.getElementById('planShiftFilter');
    const btnRefreshPlan = document.getElementById('btn-refresh-plan');
    const btnAddPlan = document.getElementById('btnAddPlan');
    const btnCalculateCarryOver = document.getElementById('btnCalculateCarryOver');
    
    // (Chart & Table)
    const planVsActualChartCanvas = document.getElementById('planVsActualChart');
    const productionPlanTableBody = document.getElementById('productionPlanTableBody');
    
    // (Calendar & DLOT)
    const calendarTitle = document.getElementById('calendar-title');
    const backToCalendarBtn = document.getElementById('backToCalendarBtn');
    const planningCalendarContainer = document.getElementById('planningCalendarContainer');
    const dlotViewContainer = document.getElementById('dlotViewContainer');
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
    
    // Mapping IDs ให้ถูกต้องตาม planModal.php
    const planModalPlanId = document.getElementById('planId');
    const planModalDate = document.getElementById('planDate');
    const planModalLine = document.getElementById('planLine');
    const planModalShift = document.getElementById('planShift');
    const planModalItemSearch = document.getElementById('planItemSearch');
    const planModalItemId = document.getElementById('planItemId');
    const planModalItemResults = document.getElementById('planItemDropdown');
    const planModalQuantity = document.getElementById('planQty');
    const planModalNote = document.getElementById('planNote');
    const savePlanButton = document.getElementById('btnSavePlan');
    const deletePlanButton = document.getElementById('btnDeletePlan');

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

    function formatCurrency(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return '฿0.00';
        if (num >= 1000000) return '฿' + (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return '฿' + (num / 1000).toFixed(2) + 'K';
        return '฿' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // =================================================================
    // SECTION 3: DATA FETCHING & UI SETUP
    // =================================================================

    function setAllDefaultDates() {
        const today = new Date();
        const todayFormatted = formatDateForInput(today);
        
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
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

    // [FIXED] ฟังก์ชันนี้แก้ไขแล้ว ตัดการเรียกใช้ตัวแปร null ออก
    function setupPlanItemAutocomplete() {
        const input = planModalItemSearch;
        const results = planModalItemResults;
        const hidden = planModalItemId;
              
        if (!input || !results) return;

        input.addEventListener('input', () => {
            const val = input.value.toLowerCase().trim();
            results.innerHTML = '';
            hidden.value = '';
            selectedPlanItem = null;
            
            input.classList.remove('is-invalid');

            if (val.length < 2) {
                results.style.display = 'none';
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

    async function fetchExchangeRate() {
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            if (data && data.rates && data.rates.THB) {
                currentExchangeRate = data.rates.THB;
                console.log("Exchange Rate (USD->THB):", currentExchangeRate);
            }
        } catch (e) {
            console.warn("Failed to fetch rate, using default:", currentExchangeRate);
        }
    }

    // =================================================================
    // SECTION 4: PLANNING LOGIC
    // =================================================================

    async function fetchPlans(page = 1) { // รับ parameter page
        showSpinner();
        currentPage = page; // อัปเดตตัวแปร Global
        
        productionPlanTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin me-2"></i>Loading plans...</td></tr>';
        
        // เรียกยอดรวม Actual DLOT (เรียกครั้งเดียวพอ ไม่ต้องตาม Page ก็ได้ หรือจะเรียกทุกครั้งก็ได้)
        fetchDlotActualSummary();

        try {
            const params = new URLSearchParams({
                action: 'get_plans',
                startDate: startDateFilter.value,
                endDate: endDateFilter.value,
                line: planLineFilter.value || '',
                shift: planShiftFilter.value || '',
                page: currentPage,       // [NEW] ส่งเลขหน้า
                limit: itemsPerPage      // [NEW] ส่งจำนวนต่อหน้า
            });

            const response = await fetch(`${PLAN_API}?${params.toString()}`);
            const res = await response.json();

            if (res.success) {
                renderPlanTable(res.data);
                
                // [NEW] สร้างปุ่มเปลี่ยนหน้า
                renderPagination(res.pagination);

                // กราฟ: ปกติกราฟควรแสดงภาพรวมทั้งหมด (ไม่ควรโดนตัดตามหน้า) 
                // แต่ถ้า API เราตัดมาแล้ว กราฟก็จะแสดงแค่ 20 แท่ง
                // *Tip: ถ้าอยากให้กราฟโชว์ทั้งหมดแต่ตารางแบ่งหน้า ต้องทำ API แยก หรือไม่ก็ยอมให้กราฟโชว์แค่ข้อมูลหน้าปัจจุบัน
                // ในที่นี้กราฟจะโชว์ตามข้อมูลที่ได้มา (20 รายการล่าสุด) ซึ่งก็ดูไม่รกดีครับ
                if (res.data && res.data.length > 0) {
                    renderPlanVsActualChart(res.data);
                } else {
                    if (planVsActualChartInstance) {
                        planVsActualChartInstance.destroy();
                        planVsActualChartInstance = null;
                    }
                }
            } else {
                throw new Error(res.message || 'Unknown error');
            }
        } catch (err) {
            console.error(err);
            productionPlanTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Error: ${err.message}</td></tr>`;
            document.getElementById('planningPagination').innerHTML = ''; // ล้างปุ่ม
            showToast(err.message, 'var(--bs-danger)');
        } finally {
            hideSpinner();
        }
    }

    function renderPagination(paginationData) {
        const paginationEl = document.getElementById('planningPagination');
        if (!paginationEl) return;
        
        paginationEl.innerHTML = '';
        
        if (!paginationData || paginationData.total_pages <= 1) return;

        const totalPages = paginationData.total_pages;
        const current = parseInt(paginationData.current_page);

        // Helper สร้างปุ่ม
        const createPageItem = (text, page, isActive = false, isDisabled = false) => {
            const li = document.createElement('li');
            li.className = `page-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
            
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.innerHTML = text;
            
            if (!isDisabled && !isActive) {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    fetchPlans(page);
                });
            }
            
            li.appendChild(a);
            return li;
        };

        // ปุ่ม Previous
        paginationEl.appendChild(createPageItem('&laquo;', current - 1, false, current === 1));

        // Logic ย่อเลขหน้า (เช่น 1 ... 4 5 6 ... 10)
        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(totalPages, current + 2);

        if (startPage > 1) {
             paginationEl.appendChild(createPageItem('1', 1));
             if (startPage > 2) paginationEl.appendChild(createPageItem('...', 0, false, true));
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationEl.appendChild(createPageItem(i, i, i === current));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationEl.appendChild(createPageItem('...', 0, false, true));
            paginationEl.appendChild(createPageItem(totalPages, totalPages));
        }

        // ปุ่ม Next
        paginationEl.appendChild(createPageItem('&raquo;', current + 1, false, current === totalPages));
        
        // ข้อมูลสรุป (เช่น Showing 1-20 of 100)
        const summary = document.createElement('li');
        summary.className = 'page-item disabled ms-2';
        summary.innerHTML = `<span class="page-link border-0 text-muted small">Total ${paginationData.total_records}</span>`;
        paginationEl.appendChild(summary);
    }

    function renderPlanTable(data) {
        productionPlanTableBody.innerHTML = '';
        
        if (!data || !Array.isArray(data)) {
            data = [];
        }

        let sumSale = 0, sumCost = 0, sumProfit = 0;
        let sumRM = 0, sumDL = 0, sumOH = 0;

        if (data.length === 0) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-5"><i class="fas fa-box-open fa-2x mb-3 opacity-25"></i><br>No production plans found.</td></tr>`;
            updateSummaryCards(0, 0, 0, 0, 0, 0); 
            return;
        }
        
        data.forEach(plan => {
            const adjPlan = parseFloat(plan.adjusted_planned_quantity || 0);
            const actualQty = parseFloat(plan.actual_quantity || 0);
            const originalPlan = parseFloat(plan.original_planned_quantity || 0);
            const carryOver = parseFloat(plan.carry_over_quantity || 0);

            // คำนวณเงิน
            const priceUSD = parseFloat(plan.price_usd || 0);
            const saleTHB = adjPlan * priceUSD * (currentExchangeRate || 34.0); 
            
            const costTotalUnit = parseFloat(plan.cost_total || 0);
            const costTotal = adjPlan * costTotalUnit;

            const costRMUnit = parseFloat(plan.cost_rm || 0);
            const costDLUnit = parseFloat(plan.cost_dl || 0);
            const costOHUnit = parseFloat(plan.cost_oh || 0);

            sumSale += saleTHB;
            sumCost += costTotal;
            sumRM += (adjPlan * costRMUnit);
            sumDL += (adjPlan * costDLUnit);
            sumOH += (adjPlan * costOHUnit);

            // Progress Logic
            let progressPercent = 0;
            let progressColor = 'bg-secondary';
            if (adjPlan > 0) {
                progressPercent = (actualQty / adjPlan) * 100;
                if (progressPercent >= 100) progressColor = 'bg-success';
                else if (progressPercent >= 80) progressColor = 'bg-info';
                else if (progressPercent >= 50) progressColor = 'bg-warning';
                else progressColor = 'bg-danger';
            } else if (actualQty > 0) {
                progressPercent = 100; progressColor = 'bg-secondary';
            }

            const tr = document.createElement('tr');
            tr.dataset.planId = plan.plan_id;
            tr.dataset.planData = JSON.stringify(plan);

            // [FIXED] แยก Column Line และ Shift และปรับ C/O เป็น Readonly
            tr.innerHTML = `
                <td class="text-secondary small font-monospace align-middle">${plan.plan_date}</td>
                
                <td class="align-middle">
                    <span class="badge bg-light text-dark border">${plan.line}</span>
                </td>
                
                <td class="align-middle">
                    <span class="badge ${plan.shift === 'DAY' ? 'bg-warning text-dark' : 'bg-dark text-white'} border border-opacity-25">${(plan.shift || '-').substring(0,1)}</span>
                </td>
                
                <td class="align-middle">
                    <div class="d-flex flex-column">
                        <div class="d-flex align-items-center">
                            <span class="fw-bold text-primary me-2">${plan.sap_no || '-'}</span>
                            ${plan.part_no ? `<span class="badge bg-secondary bg-opacity-10 text-secondary small">${plan.part_no}</span>` : ''}
                        </div>
                        <small class="text-muted text-truncate" style="max-width: 220px;" title="${plan.part_description || ''}">${plan.part_description || '-'}</small>
                    </div>
                </td>
                <td class="text-end align-middle text-muted font-monospace">${originalPlan.toLocaleString()}</td>
                <td class="text-end align-middle">
                    <div class="d-flex flex-column align-items-end">
                        <span class="fw-bold font-monospace ${actualQty >= adjPlan && adjPlan > 0 ? 'text-success' : 'text-dark'}">${actualQty.toLocaleString()}</span>
                        ${adjPlan > 0 ? `<div class="progress mt-1" style="height: 3px; width: 60px; background-color: #e9ecef;"><div class="progress-bar ${progressColor}" role="progressbar" style="width: ${Math.min(100, progressPercent)}%"></div></div>` : ''}
                    </div>
                </td>
                
                <td class="text-end align-middle">
                    <span class="font-monospace ${carryOver !== 0 ? 'text-warning fw-bold' : 'text-muted opacity-50'}" data-id="${plan.plan_id}" data-field="carry_over">${carryOver.toLocaleString()}</span>
                </td>
                
                <td class="text-end align-middle bg-primary bg-opacity-10">
                    <span class="fw-bold text-primary font-monospace fs-6">${adjPlan.toLocaleString()}</span>
                </td>
                
                <td class="text-start align-middle">
                    <span class="editable-plan d-inline-block text-truncate text-secondary small" style="max-width: 120px;" contenteditable="true" data-id="${plan.plan_id}" data-field="note" tabindex="0">${plan.note || '<span class="opacity-25">...</span>'}</span>
                </td>
            `;
            productionPlanTableBody.appendChild(tr);
        });

        sumProfit = sumSale - sumCost;
        // ส่ง null ไปที่ช่อง DL เพื่อไม่ให้ทับค่า Actual ที่เราดึงมา
        updateSummaryCards(sumSale, sumCost, sumProfit, sumRM, null, sumOH);
    }

    function updateSummaryCards(sale, cost, profit, rm, dl, oh) {
        const elSale = document.getElementById('kpi-sale-value');
        const elCost = document.getElementById('kpi-cost-value');
        const elProfit = document.getElementById('kpi-profit-value');
        const elRM = document.getElementById('kpi-rm-value');
        const elDL = document.getElementById('kpi-dl-value');
        const elOH = document.getElementById('kpi-oh-value');

        if(elSale) elSale.textContent = formatCurrency(sale);
        if(elCost) elCost.textContent = formatCurrency(cost);
        
        if(elProfit) {
            elProfit.textContent = formatCurrency(profit);
            elProfit.className = (parseFloat(profit) >= 0) ? 'fw-bold mb-0 text-success' : 'fw-bold mb-0 text-danger';
        }

        if(elRM) elRM.textContent = formatCurrency(rm);
        
        // เช็คก่อนอัปเดตช่อง DL
        if(dl !== null && elDL) {
             elDL.textContent = formatCurrency(dl);
        }

        if(elOH) elOH.textContent = formatCurrency(oh);
    }

    function renderPlanVsActualChart(planData) {
        const chartCanvas = document.getElementById('planVsActualChart'); 
        const chartWrapper = document.getElementById('planVsActualChartInnerWrapper'); 
        
        if (!chartCanvas || !chartWrapper) return;
        
        const uniqueItemsCount = new Set(planData.map(p => p.item_id)).size;
        
        if (uniqueItemsCount < 5) {
            chartWrapper.style.width = '100%';
        } else {
            chartWrapper.style.width = `${uniqueItemsCount * 150}px`; 
        }

        const ctx = chartCanvas.getContext('2d');
        const aggregatedData = {};
        
        planData.forEach(p => {
            const itemId = p.item_id;
            if (!aggregatedData[itemId]) {
                let labelText = p.part_no || 'Unknown';
                if (p.sap_no) {
                    labelText = `${p.sap_no} / ${p.part_no}`;
                }
                
                aggregatedData[itemId] = {
                    label: labelText,
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
                { 
                    label: 'Original Plan', 
                    data: aggregatedArray.map(a => a.totalOriginalPlan), 
                    backgroundColor: 'rgba(54, 162, 235, 0.7)', 
                    stack: 'plan' 
                },
                { 
                    label: 'Carry Over', 
                    data: aggregatedArray.map(a => a.totalCarryOver), 
                    backgroundColor: 'rgba(255, 159, 64, 0.7)', 
                    stack: 'plan' 
                },
                { 
                    label: 'Actual (Met Plan)', 
                    data: aggregatedArray.map(a => (a.totalActualQty >= a.totalAdjustedPlan && a.totalAdjustedPlan > 0) ? a.totalAdjustedPlan : (a.totalActualQty > 0 ? a.totalActualQty : 0)), 
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', 
                    stack: 'actual' 
                },
                { 
                    label: 'Gap (Shortfall)', 
                    data: aggregatedArray.map(a => (a.totalActualQty < a.totalAdjustedPlan) ? (a.totalAdjustedPlan - a.totalActualQty) : 0), 
                    backgroundColor: 'rgba(255, 99, 132, 0.3)', 
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    stack: 'actual' 
                },
                { 
                    label: 'Over Production', 
                    data: aggregatedArray.map(a => (a.totalActualQty > a.totalAdjustedPlan) ? (a.totalActualQty - a.totalAdjustedPlan) : 0), 
                    backgroundColor: 'rgba(153, 102, 255, 0.7)', 
                    stack: 'actual' 
                }
            ]
        };

        if (planVsActualChartInstance) {
            planVsActualChartInstance.destroy();
        }

        planVsActualChartInstance = new Chart(ctx, { 
            type: 'bar', 
            data: chartData, 
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    x: { 
                        stacked: true,
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }, 
                    y: { 
                        stacked: true,
                        beginAtZero: true
                    } 
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    }

    // [NEW] ฟังก์ชันดึงยอดรวมค่าแรงจริง (Actual DLOT) ตาม Filter
    async function fetchDlotActualSummary() {
        const dlCardValue = document.getElementById('kpi-dl-value');
        if(dlCardValue) dlCardValue.innerHTML = '<span class="spinner-border spinner-border-sm text-muted"></span>';

        try {
            const params = new URLSearchParams({
                action: 'get_dlot_summary_range',
                startDate: startDateFilter.value,
                endDate: endDateFilter.value,
                line: planLineFilter.value || 'ALL'
            });

            const res = await fetch(`${DLOT_API}?${params.toString()}`);
            const json = await res.json();

            if (json.success && json.data) {
                const totalLabor = parseFloat(json.data.total_labor || 0);
                
                if(dlCardValue) {
                    dlCardValue.textContent = formatCurrency(totalLabor);
                    dlCardValue.classList.remove('text-muted');
                    dlCardValue.classList.add('text-primary', 'fw-bold'); 
                }
            }
        } catch (e) {
            console.error("Failed to load DLOT summary", e);
            if(dlCardValue) dlCardValue.textContent = "Err";
        }
    }

    // =================================================================
    // SECTION 5: CALENDAR & DLOT LOGIC
    // =================================================================

    function initializeCalendar() {
        const calendarEl = document.getElementById('planningCalendarContainer');
        if (!calendarEl) return;

        fullCalendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            height: '100%', 
            expandRows: true,
            headerToolbar: false,
            dayMaxEvents: 2,
            
            datesSet: function(dateInfo) {
                if (calendarTitle) {
                    calendarTitle.textContent = dateInfo.view.title;
                }
            },

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
            windowResize: function(arg) {},
            handleWindowResize: true
        });
        fullCalendarInstance.render();
    }

    async function fetchCalendarEvents(fetchInfo, successCallback, failureCallback) {
        showSpinner();
        const endDate = formatDateForInput(new Date(new Date(fetchInfo.endStr).setDate(new Date(fetchInfo.endStr).getDate() - 1)));
        
        // [FIX] เพิ่ม limit: -1 เพื่อบอก API ว่าขอข้อมูลทั้งหมดในช่วงวันที่นี้
        const params = { 
            startDate: fetchInfo.startStr.substring(0, 10), 
            endDate: endDate, 
            line: planLineFilter.value || null,
            limit: -1  // <--- กุญแจสำคัญอยู่ตรงนี้!
        };
        
        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if (result.success) {
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

    window.switchToDlotView = function(dateStr) {
        const calendarContainer = document.getElementById('planningCalendarContainer');
        const dlotContainer = document.getElementById('dlotViewContainer');
        const dateInput = document.getElementById('dlot-entry-date'); 

        if (calendarContainer && dlotContainer) {
            calendarContainer.style.display = 'none';
            dlotContainer.style.display = 'block';
            
            if (dateInput) {
                dateInput.value = dateStr; 
            }
            
            fetchDailyDlot(dateStr);
        }
    };

    async function fetchDailyDlot(dateStr) {
        document.getElementById('dlot-headcount').value = '';
        document.getElementById('dlot-dl-cost').value = '';
        document.getElementById('dlot-ot-cost').value = '';

        const line = planLineFilter.value || 'ALL'; 

        try {
            const res = await sendRequest(DLOT_API, 'get_daily_costs', 'POST', {
                action: 'get_daily_costs',
                entry_date: dateStr,
                line: line
            });

            let hasExistingData = false;

            if (res.success && res.data) {
                const d = res.data;
                if (d.headcount > 0 || d.dl_cost > 0 || d.ot_cost > 0) {
                    hasExistingData = true;
                    document.getElementById('dlot-headcount').value = d.headcount;
                    document.getElementById('dlot-dl-cost').value = d.dl_cost;
                    document.getElementById('dlot-ot-cost').value = d.ot_cost;
                    updateDlotSummaryView();
                }
            }

            if (!hasExistingData) {
                await window.autoCalculateDlotFromManpower(true); 
            }

        } catch (error) {
            console.warn("Error fetching DLOT, trying auto-calc:", error);
            await window.autoCalculateDlotFromManpower(true);
        }
    }

    window.switchToCalendarView = function() {
        const calendarContainer = document.getElementById('planningCalendarContainer');
        const dlotContainer = document.getElementById('dlotViewContainer');
        
        if (calendarContainer && dlotContainer) {
            dlotContainer.style.display = 'none';
            calendarContainer.style.display = 'block';

            if (typeof fullCalendarInstance !== 'undefined' && fullCalendarInstance) {
                setTimeout(() => {
                    fullCalendarInstance.updateSize();
                }, 10);
            }
        }
    };

    window.autoCalculateDlotFromManpower = async function(isSilent = false) {
        const dateInput = document.getElementById('dlot-entry-date');
        
        if (!dateInput || !dateInput.value) return;

        const date = dateInput.value;
        const line = planLineFilter.value || 'ALL';
        
        if (!isSilent) {
            if(!confirm(`Connect to Manpower System?\nDate: ${date}\nLine: ${line}`)) return;
        }

        if (!isSilent) showSpinner();

        try {
            const res = await sendRequest(DLOT_API, 'calc_dlot_auto', 'POST', { 
                action: 'calc_dlot_auto', 
                entry_date: date, 
                line: line 
            });
            
            if (res.success && res.data) {
                const hcInput = document.getElementById('dlot-headcount');
                const dlInput = document.getElementById('dlot-dl-cost');
                const otInput = document.getElementById('dlot-ot-cost');

                if(hcInput) hcInput.value = res.data.headcount;
                if(dlInput) dlInput.value = res.data.dl_cost;
                if(otInput) otInput.value = res.data.ot_cost;
                
                updateDlotSummaryView(); 

                if (!isSilent) {
                    showToast(`Calculated: ${res.data.headcount} persons`, 'var(--bs-success)');
                    setTimeout(async () => {
                        if (confirm(`Data Retrieved.\nSave this data now?`)) {
                             const mockEvent = { preventDefault: () => {} };
                             await handleSaveDlotForm(mockEvent);
                        }
                    }, 100);
                } else {
                    console.log(`Auto-filled Manpower data for ${date}`);
                    showToast('Auto-filled data from Manpower', 'var(--bs-info)');
                }

            } else {
                if (!isSilent) showToast(res.message || 'No Manpower data found.', 'var(--bs-warning)');
            }
        } catch (err) {
            console.error(err);
            if (!isSilent) showToast('Calculation failed: ' + err.message, 'var(--bs-danger)');
        } finally {
            if (!isSilent) hideSpinner();
        }
    };

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
    }

    // =================================================================
    // SECTION 6: PLAN MODAL & CRUD
    // =================================================================

    // [FIXED] ฟังก์ชันนี้แก้ไขแล้ว ตัดการเรียกใช้ตัวแปร null ออก
    function openPlanModal(data = null) {
        planForm.reset();
        planModalPlanId.value = '0';
        planModalItemId.value = '';
        
        // เอา display text ออก หรือใช้ logic อื่นถ้าต้องการโชว์
        // if(planModalSelectedItem) planModalSelectedItem.textContent = 'No Item';
        
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
            
            // เอา display text ออก
            // if(planModalSelectedItem) planModalSelectedItem.textContent = ...
            
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

    function setupInlineEditing() {
        productionPlanTableBody.addEventListener('focusout', handleInlineSave);
        productionPlanTableBody.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur(); 
            }
        });
    }

    async function handleInlineSave(e) {
        const cell = e.target;
        
        if (!cell.classList.contains('editable-plan')) return;

        const row = cell.closest('tr');
        if (!row || !row.dataset.planData) return;

        let originalData;
        try {
            originalData = JSON.parse(row.dataset.planData);
        } catch (err) { return; }

        const field = cell.dataset.field; 
        const newValue = cell.textContent.trim();
        
        let oldValue = field === 'carry_over' ? parseFloat(originalData.carry_over_quantity) : originalData.note;
        if (field === 'carry_over') {
            if (parseFloat(newValue) === oldValue) return;
        } else {
            if (newValue === (oldValue || '')) return;
        }

        const updatedData = { ...originalData };
        
        if (field === 'carry_over') {
            updatedData.carry_over_quantity = parseFloat(newValue) || 0;
            updatedData.adjusted_planned_quantity = parseFloat(updatedData.original_planned_quantity) + updatedData.carry_over_quantity;
        } else if (field === 'note') {
            updatedData.note = newValue;
        }

        const originalColor = cell.style.color;
        cell.style.color = '#0d6efd'; 

        try {
            const body = {
                action: 'save_plan',
                plan_id: updatedData.plan_id,
                plan_date: updatedData.plan_date,
                line: updatedData.line,
                shift: updatedData.shift,
                item_id: updatedData.item_id,
                original_planned_quantity: updatedData.original_planned_quantity,
                note: updatedData.note
            };

            if (field === 'note') {
                const res = await sendRequest(PLAN_API, 'save_plan', 'POST', body);
                if (res.success) {
                    showToast('Note updated.', 'var(--bs-success)');
                    cell.style.color = originalColor; 
                    row.dataset.planData = JSON.stringify(updatedData);
                } else {
                    throw new Error(res.message);
                }
            } 
            else if (field === 'carry_over') {
                 showToast('Manual C/O update not supported via inline yet. Use "Calc C/O" button.', 'var(--bs-warning)');
                 cell.textContent = oldValue; 
            }

        } catch (err) {
            console.error(err);
            showToast('Update failed.', 'var(--bs-danger)');
            cell.textContent = oldValue; 
            cell.style.color = 'red';
        }
    }

    // =================================================================
    // SECTION 7: INITIALIZER
    // =================================================================

    function initializeApp() {
        setAllDefaultDates();
        setupInlineEditing();
        fetchDashboardLines()
            .then(fetchAllItemsForPlanning)
            .then(() => fetchExchangeRate())
            .then(() => {
                initializeCalendar();
                fetchPlans();
            });

        // Event Listeners
        startDateFilter?.addEventListener('change', () => fetchPlans(1)); // กลับไปหน้า 1
        endDateFilter?.addEventListener('change', () => fetchPlans(1));   // กลับไปหน้า 1
        planLineFilter?.addEventListener('change', () => { 
            fetchPlans(1); // กลับไปหน้า 1
            fullCalendarInstance?.refetchEvents(); 
        });
        planShiftFilter?.addEventListener('change', () => fetchPlans(1)); // กลับไปหน้า 1
        
        btnRefreshPlan?.addEventListener('click', () => { 
            fetchPlans(currentPage); // รีเฟรชหน้าปัจจุบัน (หรือหน้า 1 แล้วแต่ชอบ)
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
                btnMonth.classList.add('active');
                btnWeek.classList.remove('active');
            }
        });

        btnWeek?.addEventListener('click', () => {
            if (fullCalendarInstance) {
                fullCalendarInstance.changeView('timeGridWeek');
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
        const wb = XLSX.utils.book_new();
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

            const plansToUpload = jsonData.map(row => ({
                date: formatDateForInput(row['Date'] ? new Date((row['Date'] - (25567 + 2)) * 86400 * 1000) : new Date()), 
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
                        fetchPlans(); 
                    }
                } catch(err) {
                    showToast('Upload failed: ' + err.message, 'var(--bs-danger)');
                } finally {
                    hideSpinner();
                    input.value = ''; 
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Helper (Duplicate but safe to keep outside just in case)
    function formatDateForInput(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            return new Date().toISOString().split('T')[0];
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }