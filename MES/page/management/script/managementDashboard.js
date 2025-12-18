"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // SECTION 1: GLOBAL VARIABLES & DOM ELEMENTS
    // =================================================================

    // --- State Variables ---
    let allPlanningItems = [];
    let currentPlanData = [];
    let selectedPlanItem = null;
    let currentChartMode = 'date'; // 'item' or 'date'
    let planVsActualChartInstance = null;
    let fullCalendarInstance = null;
    
    // Timer สำหรับ Debounce (หน่วงเวลาเซฟ)
    let saveDebounceTimer;

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
    const chartDateDisplay = document.getElementById('chartDateDisplay'); 

    // --- DOM Elements (Plan Modal) ---
    const planModalElement = document.getElementById('planModal');
    const planModal = new bootstrap.Modal(planModalElement);
    const planForm = document.getElementById('planForm');
    const planModalLabel = document.getElementById('planModalLabel');
    
    // Inputs
    const planModalPlanId = document.getElementById('planModalPlanId');
    const planModalDate = document.getElementById('planModalDate');
    const planModalLine = document.getElementById('planModalLine');
    const planModalQuantity = document.getElementById('planModalQuantity');
    const planModalNote = document.getElementById('planModalNote');
    
    // Search / Autocomplete Inputs
    const planModalItemSearch = document.getElementById('planModalItemSearch');
    const planModalSelectedItem = document.getElementById('planModalSelectedItem');
    const planModalItemId = document.getElementById('planModalItemId');
    const planModalItemResults = document.getElementById('planModalItemResults');
    const itemSearchError = document.getElementById('item-search-error');

    // Buttons
    const savePlanButton = document.getElementById('savePlanButton');
    const deletePlanButton = document.getElementById('deletePlanButton');

    // --- DOM Elements (DLOT Modal) ---
    const dlotModalElement = document.getElementById('dlotModal'); 
    const dlotModal = dlotModalElement ? new bootstrap.Modal(dlotModalElement) : null;


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

    window.exportToExcel = function() {
        if (!currentPlanData || currentPlanData.length === 0) {
            showToast('No data to export', 'var(--bs-warning)');
            return;
        }
        const exportData = currentPlanData.map(p => ({
            Date: p.plan_date,
            Line: p.line,
            Shift: p.shift,
            SAP_No: p.sap_no,
            Part_No: p.part_no,
            Description: p.part_description,
            Original_Plan: parseFloat(p.original_planned_quantity || 0),
            Carry_Over: parseFloat(p.carry_over_quantity || 0),
            Adjusted_Plan: parseFloat(p.adjusted_planned_quantity || 0),
            Actual_Qty: parseFloat(p.actual_quantity || 0),
            Note: p.note || ''
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ProductionPlan");
        XLSX.writeFile(wb, `Production_Plan_${startDateFilter.value}_${endDateFilter.value}.xlsx`);
    };

    window.syncLaborCost = function() {
        const start = startDateFilter.value;
        const end = endDateFilter.value;
        if(!confirm(`Start Sync DL/OT from Manpower?\nData Range: ${start} to ${end}`)) return;
        showSpinner();
        
        const payload = { 
            action: 'sync_dlot_batch', 
            startDate: start, 
            endDate: end 
        };

        sendRequest(DLOT_API, 'sync_dlot_batch', 'POST', payload)
            .then(res => {
                if(res.success) {
                    showToast('Sync Completed!', 'var(--bs-success)');
                } else {
                    showToast(res.message || 'Sync failed', 'var(--bs-danger)');
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Error syncing labor data', 'var(--bs-danger)');
            })
            .finally(() => {
                hideSpinner();
            });
    };

    // =================================================================
    // SECTION 3: INITIALIZATION & AUTOCOMPLETE
    // =================================================================

    function setAllDefaultDates() {
        const today = new Date();
        const pastDate = new Date();
        
        // ★★★ แก้ตรงนี้: เปลี่ยนจาก 7 เป็น 30 เพื่อดูย้อนหลัง 1 เดือน ★★★
        pastDate.setDate(today.getDate() - 30);

        if(startDateFilter) startDateFilter.value = formatDateForInput(pastDate);
        if(endDateFilter) endDateFilter.value = formatDateForInput(today);
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

                        // ★★★ เพิ่ม Logic เลือก Default เป็น ASSEMBLY ★★★
                        // ตรวจสอบว่าในรายการมีคำว่า ASSEMBLY หรือไม่ (Case Insensitive)
                        const assemblyOption = Array.from(select.options).find(opt => opt.value.toUpperCase() === 'ASSEMBLY');
                        
                        if (assemblyOption) {
                            select.value = assemblyOption.value;
                        } else if (lines.length > 0) {
                            // ถ้าไม่มี ASSEMBLY ให้เลือกอันแรกสุดแทน (กันเหนียว)
                            select.value = lines[0];
                        }
                    }
                });
                
                // ★★★ สำคัญ: หลังจากเลือกค่าแล้ว ต้องสั่งให้โหลดข้อมูลทันที ★★★
                // เพราะ initializeApp() อาจจะรันไปก่อนแล้วตอนที่ Dropdown ยังว่างเปล่า
                // เราจึงต้องกระตุ้น (Trigger) ให้โหลดข้อมูลใหม่อีกรอบเมื่อได้ Line มาแล้ว
                if (planLineFilter.value) {
                    fetchPlans(); // โหลดข้อมูลทันที
                    fullCalendarInstance?.refetchEvents();
                }
            }
        } catch (error) { console.error("Error fetching lines:", error); }
    }

    async function fetchAllItemsForPlanning() {
        // Cache Items 1 Hour
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
        if (!planModalItemSearch || !planModalItemResults) return;

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
                    div.className = 'autocomplete-item dropdown-item p-2 border-bottom';
                    div.style.cursor = 'pointer';

                    div.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold text-primary">${item.sap_no || '-'}</span>
                            <span class="badge bg-light text-dark border">${item.part_no || '-'}</span>
                        </div>
                        <div class="small text-muted text-truncate mt-1">
                            ${item.part_description || ''}
                        </div>
                    `;
                    
                    div.addEventListener('click', (e) => {
                        e.stopPropagation();
                        planModalItemSearch.value = `${item.sap_no} / ${item.part_no}`;
                        planModalItemId.value = item.item_id;
                        planModalSelectedItem.textContent = item.part_description;
                        
                        document.getElementById('selectedItemContainer').classList.remove('d-none');
                        document.getElementById('planModalItemSearch').classList.add('is-valid'); // ใส่สีเขียวให้ Input
                        
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
    // SECTION 4: DATA FETCHING
    // =================================================================

    async function fetchPlans() {
        showSpinner();
        productionPlanTableBody.innerHTML = `<tr><td colspan="11" class="text-center py-5 text-muted">Loading data...</td></tr>`;
        
        const params = { 
            startDate: startDateFilter.value, 
            endDate: endDateFilter.value, 
            line: planLineFilter.value || null, 
            shift: planShiftFilter.value || null,
            limit: -1 
        };

        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if (result.success && result.data) {
                currentPlanData = result.data;
                renderPlanTable(result.data);
                updateFooterSummaryClientSide(result.data);
                renderPlanVsActualChart(result.data);
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
        // 1. เพิ่มตัวแปร totalActual
        let totalQty = 0, totalActual = 0, totalCost = 0, totalSales = 0;

        data.forEach(p => {
            const adj = parseFloat(p.adjusted_planned_quantity || 0);
            
            // 2. ดึงค่า Actual มาบวก
            const act = parseFloat(p.actual_quantity || 0);
            
            const cost = parseFloat(p.cost_total || 0);
            const priceUSD = parseFloat(p.price_usd || 0);
            const priceTHB = parseFloat(p.standard_price || 0);
            let unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;

            totalQty += adj;
            totalActual += act; // 3. บวกยอด Actual
            totalCost += (adj * cost);
            totalSales += (adj * unitPrice);
        });

        document.getElementById('footer-total-qty').innerText = totalQty.toLocaleString();
        
        // 4. อัปเดตขึ้นหน้าจอ (ใส่เช็ค if เผื่อหา ID ไม่เจอจะได้ไม่ error)
        const footerActualEl = document.getElementById('footer-total-actual');
        if (footerActualEl) {
            footerActualEl.innerText = totalActual.toLocaleString();
        }

        document.getElementById('footer-total-cost').innerText = formatCurrency(totalCost);
        document.getElementById('footer-total-sale').innerText = formatCurrency(totalSales);
    }

    // =================================================================
    // SECTION 5: RENDERING (UPDATED LAYOUT & INLINE EDIT)
    // =================================================================

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

            // สีของตัวเลข Actual
            let progressClass = 'text-dark';
            if(adjPlan > 0) {
                if(actualQty >= adjPlan) progressClass = 'text-success fw-bold';
                else if(actualQty > 0) progressClass = 'text-primary';
            }

            // HTML Structure ตามที่ผู้ใช้ต้องการ
            tr.innerHTML = `
                <td style="width: 100px;" class="text-secondary small ">${plan.plan_date}</td>
                
                <td style="width: 100px;" class="text-center">
                    <span class="badge bg-light text-dark border">${plan.line}</span>
                </td>
                
                <td style="width: 100px;" class="text-center">
                    <span class="badge ${plan.shift === 'DAY' ? 'bg-warning text-dark' : 'bg-dark text-white'} border">${(plan.shift || '-').substring(0,1)}</span>
                </td>
                
                <td>
                    <span class="fw-bold text-dark ">${plan.sap_no || '-'}</span> 
                    <span class="text-muted small mx-1">/</span> 
                    <span class=" text-secondary">${plan.part_no || '-'}</span>
                    <small class="d-block text-muted text-truncate mt-1" style="max-width: 250px;">${plan.part_description || ''}</small>
                </td>

                <td style="width: 100px;" class="text-end">
                    <span class="editable-plan fw-bold text-dark" 
                          contenteditable="true" 
                          data-id="${plan.plan_id}"  data-field="original_plan"
                          style="cursor: pointer; border-bottom: 1px dashed #ccc; display:inline-block; min-width: 50px;">
                          ${originalPlan.toLocaleString()}
                    </span>
                </td>
                
                <td style="width: 100px;" class="text-end">
                    <span class="editable-plan ${carryOver !== 0 ? 'text-warning fw-bold' : 'text-muted opacity-50'}" 
                          contenteditable="true" 
                          data-id="${plan.plan_id}"  data-field="carry_over"
                          style="cursor: pointer; border-bottom: 1px dashed #ccc;">
                          ${carryOver.toLocaleString()}
                    </span>
                </td>
                
                <td class="text-end fw-bold text-primary " 
                    data-field="adjusted_plan">
                    ${adjPlan.toLocaleString()}
                </td>

                <td class="text-end  ${progressClass}" 
                    data-field="actual_quantity">
                    ${actualQty.toLocaleString()}
                </td>
                
                <td style="width: 120px; cursor: pointer;" 
                    class="text-end text-danger fw-bold small view-cost-detail"
                    title="Click to view Manpower details">
                    ${formatCurrency(totalPlanCost)}
                </td>
                <td style="width: 120px;" class="text-end text-success fw-bold small">${formatCurrency(totalPlanSale)}</td>
                
                <td style="width: 250px;" class="text-center">
                    <span class="editable-plan d-inline-block text-truncate text-secondary small" 
                          style="max-width: 230px; cursor: pointer; border-bottom: 1px dashed #ccc;" 
                          contenteditable="true" data-id="${plan.plan_id}" data-field="note">
                          ${plan.note || '<span class="opacity-25">...</span>'}
                    </span>
                </td>
            `;
            productionPlanTableBody.appendChild(tr);
        });
    }

    // =================================================================
    // SECTION 6: HYBRID INTERACTION & INLINE LOGIC
    // =================================================================
    // 1. Click Handler: Hybrid Mode
    productionPlanTableBody.addEventListener('click', (e) => {
        if (e.target.isContentEditable || e.target.closest('.editable-plan') || e.target.closest('button')) {
            return;
        }

        const row = e.target.closest('tr');
        if (!row || !row.dataset.planData) return;
        const data = JSON.parse(row.dataset.planData);

        // ★★★ ถ้ากดที่ช่อง Sales หรือ Cost ให้เปิด Financial Modal ★★★
        // (คุณอาจจะต้องไปเพิ่ม class 'view-financial-detail' ให้ช่อง Sales ด้วยใน renderPlanTable)
        if (e.target.closest('.view-cost-detail') || e.target.closest('.view-sales-detail')) {
            openFinancialDetail(data); // <--- เรียกฟังก์ชันใหม่
            return;
        }

        openPlanModal(data);
    });

    // 2. Blur Handler: Save on focus out
    productionPlanTableBody.addEventListener('blur', (e) => {
        if (e.target.classList.contains('editable-plan')) {
            const el = e.target;
            const id = el.dataset.id;
            const field = el.dataset.field;
            let newVal = el.innerText.trim();
            const row = el.closest('tr');
            if(!row) return;

            const data = JSON.parse(row.dataset.planData);

            // Handle Note
            if (field === 'note' && newVal !== (data.note || '')) {
                clearTimeout(saveDebounceTimer);
                saveDebounceTimer = setTimeout(() => handleNoteEdit(id, newVal, row), 500);
            } 
            // Handle Numbers (Plan & Carry Over)
            else if (['original_plan', 'carry_over'].includes(field)) {
                // ลบลูกน้ำก่อนแปลงเป็นเลข
                const numVal = parseFloat(newVal.replace(/,/g, ''));

                if (!isNaN(numVal)) {
                    // Optimistic UI Update: คำนวณจอให้เปลี่ยนทันที
                    updateRowCalculationUI(row, field, numVal);

                    // Debounce Save
                    clearTimeout(saveDebounceTimer);
                    saveDebounceTimer = setTimeout(() => {
                        handleQtyEdit(id, field, numVal, row);
                    }, 500);
                } else {
                    // ถ้าพิมพ์มั่ว คืนค่าเดิม
                    el.innerText = field === 'original_plan' ? 
                                   parseFloat(data.original_planned_quantity).toLocaleString() : 
                                   parseFloat(data.carry_over_quantity).toLocaleString();
                }
            }
        }
    }, true);

    // กัน Enter ขึ้นบรรทัดใหม่
    productionPlanTableBody.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('editable-plan') && e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    });

    // --- Helper Functions ---

    function updateRowCalculationUI(row, field, newVal) {
        const data = JSON.parse(row.dataset.planData);
        let plan = parseFloat(data.original_planned_quantity || 0);
        let co = parseFloat(data.carry_over_quantity || 0);

        if (field === 'original_plan') plan = newVal;
        if (field === 'carry_over') co = newVal;

        const newTarget = plan + co;
        
        // อัปเดตช่อง Target (Adjusted Plan)
        const targetEl = row.querySelector('[data-field="adjusted_plan"]');
        if(targetEl) targetEl.innerText = newTarget.toLocaleString();

        // อัปเดตสี Actual vs Target
        const actualQty = parseFloat(data.actual_quantity || 0);
        // หา element โดยใช้ data-field แทน index เพื่อความชัวร์
        const actualEl = row.querySelector('[data-field="actual_quantity"]') || row.children[7]; 

        if (actualEl) {
            actualEl.className = 'text-end '; 
            
            /* [ลบ] บรรทัดนี้ทิ้งครับ เพราะเราไม่อยากได้พื้นหลังแล้ว */
            // actualEl.style.backgroundColor = 'var(--bs-primary-bg-subtle)'; 
            
            if (newTarget > 0) {
                if (actualQty >= newTarget) actualEl.classList.add('text-success', 'fw-bold');
                else if (actualQty > 0) actualEl.classList.add('text-primary');
                else actualEl.classList.add('text-dark');
            }
        }
    }

    async function handleQtyEdit(id, field, val, row) {
        const data = JSON.parse(row.dataset.planData);
        
        if (!id || id == 0 || id == "0") {
            
            const payload = {
                plan_id: 0,
                plan_date: data.plan_date,
                line: data.line,
                shift: data.shift,
                item_id: data.item_id,
                original_planned_quantity: (field === 'original_plan') ? val : 0,
                carry_over_quantity: (field === 'carry_over') ? val : 0,
                
                note: data.note || ''
            };

            try {
                const res = await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
                if(res.success) {
                    showToast('Plan created automatically', 'var(--bs-success)');
                    fetchPlans(); 
                } else {
                    showToast(res.message, 'var(--bs-danger)');
                }
            } catch(e) { console.error(e); }
            
            return;
        }

        if (field === 'original_plan') {
            const payload = {
                plan_id: id,
                plan_date: data.plan_date,
                line: data.line,
                shift: data.shift,
                item_id: data.item_id,
                original_planned_quantity: val,
                note: data.note || ''
            };
            
            try {
                const res = await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
                if(res.success) {
                    data.original_planned_quantity = val;
                    row.dataset.planData = JSON.stringify(data);
                    showToast('Plan updated', 'var(--bs-success)');
                    updateLocalDataArray(id, 'original_planned_quantity', val);
                }
            } catch(e) { showToast('Error saving plan', 'var(--bs-danger)'); }
        } 
        else if (field === 'carry_over') {
            try {
                const res = await sendRequest(PLAN_API, 'update_carry_over', 'POST', { plan_id: id, carry_over_quantity: val });
                if(res.success) {
                    data.carry_over_quantity = val;
                    row.dataset.planData = JSON.stringify(data);
                    showToast('C/O updated', 'var(--bs-success)');
                    updateLocalDataArray(id, 'carry_over_quantity', val);
                }
            } catch(e) { showToast('Error updating C/O', 'var(--bs-danger)'); }
        }
    }

    async function handleNoteEdit(id, note, row) {
        const data = JSON.parse(row.dataset.planData);
        const cleanNote = note === '...' ? '' : note;
        
        const payload = {
            plan_id: id,
            plan_date: data.plan_date,
            line: data.line,
            shift: data.shift,
            item_id: data.item_id,
            original_planned_quantity: data.original_planned_quantity,
            note: cleanNote
        };

        try {
            await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
            data.note = cleanNote;
            row.dataset.planData = JSON.stringify(data);
            showToast('Note saved', 'var(--bs-success)');
        } catch(e) { showToast('Error saving note', 'var(--bs-danger)'); }
    }

    function updateLocalDataArray(id, key, val) {
        const idx = currentPlanData.findIndex(p => p.plan_id == id);
        if(idx !== -1) {
            currentPlanData[idx][key] = val;
            // คำนวณ Adjusted ใหม่
            const plan = parseFloat(currentPlanData[idx].original_planned_quantity || 0);
            const co = parseFloat(currentPlanData[idx].carry_over_quantity || 0);
            currentPlanData[idx].adjusted_planned_quantity = plan + co;
            
            updateFooterSummaryClientSide(currentPlanData);
        }
    }

    // =================================================================
    // SECTION 7: CHART CONFIG
    // =================================================================
    function renderPlanVsActualChart(planData) {
        if (currentChartMode === 'date') {
            renderDailyTrendChart(planData);
        } else if (currentChartMode === 'money') { 
            // ★★★ เพิ่มเงื่อนไขนี้ ★★★
            renderFinancialTrendChart(planData);
        } else {
            renderItemChart(planData);
        }
    }

    function renderFinancialTrendChart(planData) {
        const chartWrapper = document.getElementById('planVsActualChartInnerWrapper');
        const ctx = planVsActualChartCanvas.getContext('2d');
        
        if (!planVsActualChartCanvas || !chartWrapper) return;

        // --- Aggregation By Date (Money) ---
        const dateMap = {};
        let curr = new Date(startDateFilter.value);
        const end = new Date(endDateFilter.value);
        
        while (curr <= end) {
            const dStr = curr.toISOString().split('T')[0];
            dateMap[dStr] = { date: dStr, planRev: 0, actualRev: 0 };
            curr.setDate(curr.getDate() + 1);
        }

        planData.forEach(p => {
            const d = p.plan_date;
            if (dateMap[d]) {
                const priceUSD = parseFloat(p.price_usd || 0);
                const priceTHB = parseFloat(p.standard_price || 0);
                const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;

                const planQty = parseFloat(p.adjusted_planned_quantity || 0);
                const actQty = parseFloat(p.actual_quantity || 0);

                dateMap[d].planRev += (planQty * unitPrice);
                dateMap[d].actualRev += (actQty * unitPrice);
            }
        });

        const sortedDates = Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));
        
        // ปรับความกว้างให้เท่ากับกราฟรายวัน
        const minWidthPerBar = 50; 
        const totalWidth = Math.max(chartWrapper.parentElement.clientWidth, sortedDates.length * minWidthPerBar);
        chartWrapper.style.width = `${totalWidth}px`;

        const labels = sortedDates.map(d => {
            const dateObj = new Date(d.date);
            return `${dateObj.getDate()}/${dateObj.getMonth()+1}`;
        });
        
        const planDataArr = sortedDates.map(d => d.planRev);
        const actualDataArr = sortedDates.map(d => d.actualRev);

        if (planVsActualChartInstance) planVsActualChartInstance.destroy();
        const plugins = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];

        planVsActualChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Target Revenue',
                        data: planDataArr,
                        // ปรับสีทองให้ Soft ลง เข้ากับ Theme พาสเทล
                        backgroundColor: 'rgba(255, 205, 86, 0.2)', 
                        borderColor: 'rgba(255, 205, 86, 0.6)',
                        borderWidth: 1,
                        barPercentage: 0.6, // เท่ากับกราฟรายวัน
                        categoryPercentage: 0.8,
                        borderRadius: 0,
                        order: 2
                    },
                    {
                        label: 'Actual Revenue',
                        data: actualDataArr,
                        // ★★★ เปลี่ยนมาใช้สี Teal/Pink เหมือนกราฟอื่นๆ ★★★
                        backgroundColor: (ctx) => {
                            const idx = ctx.dataIndex;
                            const p = planDataArr[idx];
                            const a = actualDataArr[idx];
                            // สีเดียวกับ renderDailyTrendChart
                            return (a >= p && p > 0) ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)';
                        },
                        hoverBackgroundColor: (ctx) => {
                            const idx = ctx.dataIndex;
                            const p = planDataArr[idx];
                            const a = actualDataArr[idx];
                            return (a >= p && p > 0) ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
                        },
                        borderWidth: 0,
                        barPercentage: 0.6, // ★★★ ปรับเป็น 0.6 ให้เต็มเท่ากัน (ไม่ผอมแล้ว)
                        categoryPercentage: 0.8,
                        grouped: false, 
                        order: 1,
                        borderRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    },
                    y: { 
                        beginAtZero: true,
                        grid: { borderDash: [2, 2] },
                        title: { display: true, text: 'Revenue (THB)' },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                                return value;
                            }
                        }
                    }
                },
                plugins: {
                    legend: { 
                        position: 'top', align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            generateLabels: (chart) => [
                                // อัปเดตสีใน Legend ให้ตรงกับกราฟใหม่
                                { text: 'Target Rev.', fillStyle: 'rgba(255, 205, 86, 0.2)', strokeStyle: 'rgba(255, 205, 86, 0.6)', lineWidth: 1 },
                                { text: 'Actual Rev. (Hit)', fillStyle: 'rgba(75, 192, 192, 1)', strokeStyle: 'rgba(75, 192, 192, 1)', lineWidth: 0 },
                                { text: 'Actual Rev. (Miss)', fillStyle: 'rgba(255, 99, 132, 1)', strokeStyle: 'rgba(255, 99, 132, 1)', lineWidth: 0 }
                            ],
                            onClick: null
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const d = sortedDates[items[0].dataIndex].date;
                                return new Date(d).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
                            },
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    },
                    datalabels: { display: false }
                }
            },
            plugins: plugins
        });
        
        if (chartDateDisplay) chartDateDisplay.textContent = "Daily Financial Trend";
    }
    function renderItemChart(planData) {
        const chartWrapper = document.getElementById('planVsActualChartInnerWrapper');
        const ctx = planVsActualChartCanvas.getContext('2d');
        
        if (!planVsActualChartCanvas || !chartWrapper) return;

        // --- 1. Data Aggregation ---
        const aggregatedData = {};
        planData.forEach(p => {
            const itemId = p.item_id;
            const identifier = p.part_no || p.sap_no || `Item ${itemId}`;
            if (!aggregatedData[itemId]) {
                aggregatedData[itemId] = {
                    label: identifier,
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

        // ★★★ 1. เพิ่มความกว้างต่อแท่ง เพื่อให้ชื่อยาวๆ วางแนวนอนได้พอดี ★★★
        // จากเดิม 70 -> เพิ่มเป็น 100px หรือ 120px (ขึ้นอยู่กับความยาวชื่อ)
        const minWidthPerBar = 100; 
        const totalWidth = Math.max(100, aggregatedArray.length * minWidthPerBar);
        chartWrapper.style.width = `${totalWidth}px`; 

        const labels = aggregatedArray.map(agg => agg.label);
        const totalOriginalPlanData = aggregatedArray.map(agg => agg.totalOriginalPlan);
        const totalCarryOverData = aggregatedArray.map(agg => agg.totalCarryOver);
        
        const metPlanData = aggregatedArray.map(agg => (agg.totalActualQty >= agg.totalAdjustedPlan && agg.totalAdjustedPlan > 0) ? agg.totalAdjustedPlan : null);
        const shortfallData = aggregatedArray.map(agg => (agg.totalActualQty < agg.totalAdjustedPlan && agg.totalAdjustedPlan > 0) ? agg.totalActualQty : null);
        const unplannedData = aggregatedArray.map(agg => (agg.totalActualQty > 0) ? Math.max(0, agg.totalActualQty - agg.totalAdjustedPlan) : null);

        if (planVsActualChartInstance) planVsActualChartInstance.destroy();

        const plugins = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];

        planVsActualChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    // === GROUP 1: PLAN (BACKGROUND) ===
                    { 
                        label: 'Original Plan', 
                        data: totalOriginalPlanData, 
                        backgroundColor: 'rgba(54, 162, 235, 0.2)', 
                        borderColor: 'rgba(54, 162, 235, 0.2)', 
                        borderWidth: 1, 
                        stack: 'plan',
                        barPercentage: 0.7, // ★★★ 2. ปรับเป็น 0.7 (เท่ากัน)
                        categoryPercentage: 0.8,
                        grouped: false,
                        order: 2,
                        borderRadius: 0 
                    },
                    { 
                        label: 'Carry Over', 
                        data: totalCarryOverData, 
                        backgroundColor: 'rgba(255, 159, 64, 0.2)', 
                        borderColor: 'rgba(255, 159, 64, 0.2)', 
                        borderWidth: 1,
                        stack: 'plan', 
                        barPercentage: 0.7, // ★★★ 2. ปรับเป็น 0.7 (เท่ากัน)
                        categoryPercentage: 0.8,
                        grouped: false,
                        order: 2,
                        borderRadius: 0
                    },

                    // === GROUP 2: ACTUAL (CORE) ===
                    { 
                        label: 'Actual (Met)', 
                        data: metPlanData, 
                        backgroundColor: 'rgba(75, 192, 192, 1)', 
                        hoverBackgroundColor: 'rgba(75, 192, 192, 0.8)',
                        stack: 'actual', 
                        barPercentage: 0.7, // ★★★ 2. ปรับเป็น 0.7 (เท่ากัน -> ทับมิดถ้าค่าเท่ากัน)
                        categoryPercentage: 0.8,
                        grouped: false,
                        order: 1,
                        borderRadius: 0
                    },
                    { 
                        label: 'Actual (Short)', 
                        data: shortfallData, 
                        backgroundColor: 'rgba(255, 99, 132, 1)', 
                        hoverBackgroundColor: 'rgba(255, 99, 132, 0.8)',
                        stack: 'actual', 
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        grouped: false,
                        order: 1,
                        borderRadius: 0
                    },
                    { 
                        label: 'Actual (Unplanned)', 
                        data: unplannedData, 
                        backgroundColor: 'rgba(153, 102, 255, 1)', 
                        hoverBackgroundColor: 'rgba(153, 102, 255, 0.8)',
                        stack: 'actual', 
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        grouped: false,
                        order: 1,
                        borderRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 25, right: 10, left: 0, bottom: 0 } },
                
                interaction: {
                    mode: 'index',
                    intersect: false,
                },

                scales: {
                    x: { 
                        stacked: true,
                        ticks: {
                            autoSkip: false, 
                            
                            // ★★★ 3. บังคับห้ามเอียง (Horizontal Only) ★★★
                            maxRotation: 0, 
                            minRotation: 0,
                            
                            font: { size: 11, weight: '600' },
                            color: '#495057'
                        },
                        grid: { display: false } 
                    },
                    y: { 
                        stacked: true,
                        beginAtZero: true,
                        title: { display: true, text: 'Quantity (Pcs)', font: { weight: 'bold', size: 12 }, color: '#6c757d' },
                        grid: { 
                            color: '#e9ecef', 
                            borderDash: [2, 2] 
                        },
                        border: { display: false }
                    }
                },
                // ... (Plugins Legend, Tooltip, Datalabels เหมือนเดิม) ...
                plugins: {
                    legend: { 
                        position: 'top',
                        align: 'center',
                        labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#000',
                        bodyColor: '#444',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            title: (tooltipItems) => aggregatedArray[tooltipItems[0].dataIndex].label,
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) label += context.parsed.y.toLocaleString();
                                return label;
                            }
                        }
                    },
                    datalabels: {
                        formatter: (value, context) => {
                            if (context.datasetIndex < 2) return null;
                            return value > 0 ? value.toLocaleString() : null;
                        },
                        color: '#fff',
                        anchor: 'center',
                        align: 'center',
                        font: { size: 10, weight: 'bold' },
                        textShadowBlur: 2,
                        textShadowColor: 'rgba(0,0,0,0.5)'
                    }
                }
            },
            plugins: plugins
        });
        
        if (chartDateDisplay) {
            chartDateDisplay.textContent = `${startDateFilter.value} to ${endDateFilter.value}`;
        }
    }

    function renderDailyTrendChart(planData) {
        const chartWrapper = document.getElementById('planVsActualChartInnerWrapper');
        const ctx = planVsActualChartCanvas.getContext('2d');
        
        if (!planVsActualChartCanvas || !chartWrapper) return;

        // --- Aggregation By Date ---
        const dateMap = {};
        
        // สร้างโครงวันทั้งหมดในช่วง (เผื่อวันไหนไม่มีผลิตจะได้ไม่แหว่ง)
        let curr = new Date(startDateFilter.value);
        const end = new Date(endDateFilter.value);
        
        while (curr <= end) {
            const dStr = curr.toISOString().split('T')[0];
            dateMap[dStr] = { 
                date: dStr, 
                plan: 0, 
                actual: 0 
            };
            curr.setDate(curr.getDate() + 1);
        }
        // เติมข้อมูล
        planData.forEach(p => {
            const d = p.plan_date; // สมมติ format YYYY-MM-DD
            if (dateMap[d]) {
                dateMap[d].plan += parseFloat(p.adjusted_planned_quantity || 0);
                dateMap[d].actual += parseFloat(p.actual_quantity || 0);
            }
        });

        const sortedDates = Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));

        // ปรับความกว้าง (รายวันแท่งไม่เยอะเท่าราย Item อาจจะไม่ต้อง Scroll มาก)
        const minWidthPerBar = 50; 
        const totalWidth = Math.max(chartWrapper.parentElement.clientWidth, sortedDates.length * minWidthPerBar);
        chartWrapper.style.width = `${totalWidth}px`;

        const labels = sortedDates.map(d => {
            const dateObj = new Date(d.date);
            return `${dateObj.getDate()}/${dateObj.getMonth()+1}`; // format d/m
        });
        
        const planValues = sortedDates.map(d => d.plan);
        const actualValues = sortedDates.map(d => d.actual);

        if (planVsActualChartInstance) planVsActualChartInstance.destroy();

        const plugins = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];

        planVsActualChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Plan',
                        data: planValues,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 0.5)',
                        borderWidth: 1,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8,
                        borderRadius: 0,
                        order: 2
                    },
                    {
                        label: 'Total Actual',
                        data: actualValues,
                        backgroundColor: (ctx) => {
                            // Dynamic Color: ถ้าผ่านเป้า=เขียว, ตกเป้า=แดง
                            const idx = ctx.dataIndex;
                            const p = planValues[idx];
                            const a = actualValues[idx];
                            return (a >= p && p > 0) ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)';
                        },
                        hoverBackgroundColor: (ctx) => {
                            const idx = ctx.dataIndex;
                            const p = planValues[idx];
                            const a = actualValues[idx];
                            return (a >= p && p > 0) ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
                        },
                        borderWidth: 0,
                        barPercentage: 0.6, // เล็กกว่า Plan (ซ้อนทับเหมือนเดิม)
                        categoryPercentage: 0.8,
                        grouped: false, // Overlapping Mode
                        order: 1,
                        borderRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    },
                    y: { 
                        beginAtZero: true,
                        grid: { borderDash: [2, 2] },
                        title: { display: true, text: 'Total Qty' }
                    }
                },
                plugins: {
                    legend: { 
                        position: 'top', 
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            font: { size: 11 },
                            
                            // ★★★ แก้ไข Legend ตรงนี้ครับ ★★★
                            generateLabels: (chart) => {
                                // เราสร้างป้ายกำกับเอง 3 อัน เพื่อบอกความหมายของสี
                                return [
                                    {
                                        text: 'Total Plan',
                                        fillStyle: 'rgba(54, 162, 235, 0.2)', // สีฟ้าจาง
                                        strokeStyle: 'rgba(54, 162, 235, 0.5)',
                                        lineWidth: 1,
                                        hidden: false
                                    },
                                    {
                                        text: 'Actual (Met Plan)',
                                        fillStyle: 'rgba(75, 192, 192, 1)', // สีเขียว Teal
                                        strokeStyle: 'rgba(75, 192, 192, 1)',
                                        lineWidth: 0,
                                        hidden: false
                                    },
                                    {
                                        text: 'Actual (Missed)',
                                        fillStyle: 'rgba(255, 99, 132, 1)', // สีแดง
                                        strokeStyle: 'rgba(255, 99, 132, 1)',
                                        lineWidth: 0,
                                        hidden: false
                                    }
                                ];
                            }
                        },
                        // ปิดการคลิก Legend (เพราะเรา Custom เอง การคลิกซ่อนกราฟจะทำยากขึ้นนิดนึง ปิดไปเลยง่ายกว่า)
                        onClick: null 
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const d = sortedDates[items[0].dataIndex].date;
                                return new Date(d).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
                            }
                        }
                    },
                    datalabels: {
                        display: false // ซ่อนตัวเลขจะได้ไม่รก (หรือจะเปิดก็ได้ครับ)
                    }
                }
            },
            plugins: plugins
        });
        
        if (chartDateDisplay) chartDateDisplay.textContent = "Daily Trend";
    }

    // =================================================================
    // SECTION 8: CALENDAR & MODAL
    // =================================================================
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
            
            events: (info, sc, fc) => fetchCalendarEvents(info, sc, fc, todayString),
            
            eventClick: (info) => {
                const props = info.event.extendedProps;
                // เปลี่ยนไปเรียก Modal การเงินแทน
                if(props.planData) openFinancialDetail(props.planData);
            },
            
            // ★★★ แก้ไขตรงนี้ (เปลี่ยนจากรวมคน เป็นรวมเงิน) ★★★
            dateClick: (info) => {
                const clickedDate = info.dateStr;
                
                // 1. ค้นหาแผนทั้งหมดของวันนั้น
                const plansOnDate = currentPlanData.filter(p => p.plan_date === clickedDate);

                if (plansOnDate.length > 0) {
                    // 2. เตรียมตัวแปรผลรวม
                    let totalPlanQty = 0;
                    let totalActualQty = 0;
                    let totalPlanSales = 0;
                    let totalPlanCost = 0;

                    // 3. วนลูปคำนวณยอดเงินของทุก Plan ในวันนั้น
                    plansOnDate.forEach(p => {
                        const planQty = parseFloat(p.adjusted_planned_quantity || 0);
                        const actualQty = parseFloat(p.actual_quantity || 0);
                        
                        // คำนวณราคาต่อหน่วย (รองรับ USD/THB)
                        const priceUSD = parseFloat(p.price_usd || 0);
                        const priceTHB = parseFloat(p.standard_price || 0);
                        const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
                        const unitCost = parseFloat(p.cost_total || 0);

                        totalPlanQty += planQty;
                        totalActualQty += actualQty;
                        
                        totalPlanSales += (planQty * unitPrice);
                        totalPlanCost += (planQty * unitCost);
                    });

                    // 4. คำนวณค่าเฉลี่ย (Weighted Average) เพื่อส่งให้ Modal
                    // (เพราะ Modal ใช้สูตร Qty * Price เราเลยต้องย้อนหราราคาเฉลี่ยส่งไป)
                    const avgPrice = totalPlanQty > 0 ? (totalPlanSales / totalPlanQty) : 0;
                    const avgCost = totalPlanQty > 0 ? (totalPlanCost / totalPlanQty) : 0;

                    // 5. สร้าง Object ส่งให้ Modal
                    const displayData = {
                        plan_date: clickedDate,
                        line: planLineFilter.value ? planLineFilter.value : 'Multiple Lines',
                        part_no: 'Daily Summary', // ชื่อสมมติสำหรับยอดรวม
                        part_description: `Aggregated ${plansOnDate.length} Items`,
                        
                        adjusted_planned_quantity: totalPlanQty,
                        actual_quantity: totalActualQty,
                        
                        // ส่งราคาเฉลี่ยไปเพื่อให้ Modal คูณกลับมาได้ยอดรวมที่ถูกต้อง
                        price_usd: 0, 
                        standard_price: avgPrice,
                        cost_total: avgCost,
                        
                        updated_at: plansOnDate[0].updated_at
                    };

                    // เปิด Modal การเงิน
                    openFinancialDetail(displayData);

                } else {
                    // กรณีไม่มีแผน เปิด Modal ว่างๆ
                    openFinancialDetail({
                        plan_date: clickedDate,
                        line: planLineFilter.value || '-',
                        part_no: '-',
                        part_description: 'No production plan',
                        adjusted_planned_quantity: 0,
                        actual_quantity: 0,
                        price_usd: 0,
                        standard_price: 0,
                        cost_total: 0
                    });
                }
            },
            
            datesSet: (dateInfo) => {
                if (calendarTitle) calendarTitle.textContent = dateInfo.view.title;
            }
        });
        fullCalendarInstance.render();
    }

    /* script/managementDashboard.js */

    async function fetchCalendarEvents(fetchInfo, successCallback, failureCallback, todayString) {
        const startDate = fetchInfo.startStr.substring(0, 10);
        const endDate = fetchInfo.endStr.substring(0, 10);
        
        const params = { 
            startDate, endDate, 
            line: planLineFilter.value || null,
            limit: -1 
        };
        
        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if(result.success) {
                const events = [];
                // ★ เปลี่ยนโครงสร้างตัวแปรเก็บยอดรวม เพื่อเทียบ Plan vs Actual
                const dailyStats = {}; 

                // --- 1. แปลง Data เป็น Event ปกติ ---
                result.data.forEach(p => {
                    // ... (ส่วนสร้าง Event แท่งสีๆ เหมือนเดิม ไม่ต้องแก้) ...
                    const adj = parseFloat(p.adjusted_planned_quantity||0);
                    const act = parseFloat(p.actual_quantity||0);
                    
                    let bgColor = 'rgba(54, 162, 235, 1)'; 
                    let bdColor = 'rgba(54, 162, 235, 1)'; 

                    if (adj === 0 && act > 0) { 
                        bgColor = 'rgba(153, 102, 255, 0.7)'; bdColor = 'rgb(153, 102, 255)';
                    } else if(act >= adj && adj > 0) { 
                        bgColor = 'rgba(75, 192, 192, 1)'; bdColor = 'rgba(75, 192, 192, 1)';
                    } else if(act < adj && adj > 0) { 
                        if (p.plan_date < todayString) {
                            bgColor = 'rgba(255, 99, 132, 1)'; bdColor = 'rgba(255, 99, 132, 1)';
                        }
                    }
                    
                    events.push({
                        id: p.plan_id,
                        title: `${p.line}: ${p.sap_no} (${act}/${adj})`,
                        start: p.plan_date,
                        backgroundColor: bgColor,
                        borderColor: bdColor,
                        extendedProps: { planData: p }
                    });

                    // --- 2. สะสมยอด Plan vs Actual (เพื่อทำพื้นหลัง) ---
                    if (!dailyStats[p.plan_date]) {
                        dailyStats[p.plan_date] = { planRevenue: 0, actualRevenue: 0 };
                    }

                    // คำนวณราคาขาย
                    const priceUSD = parseFloat(p.price_usd || 0);
                    const priceTHB = parseFloat(p.standard_price || 0);
                    const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;

                    const planQty = parseFloat(p.adjusted_planned_quantity || 0);
                    const actualQty = parseFloat(p.actual_quantity || 0);

                    // ★ บวกยอดเป้าหมาย และ ยอดจริง
                    dailyStats[p.plan_date].planRevenue += (planQty * unitPrice);
                    dailyStats[p.plan_date].actualRevenue += (actualQty * unitPrice);
                });

                // --- 3. สร้าง Background Events (สีพื้นหลัง) ---
                Object.keys(dailyStats).forEach(date => {
                    if (date < todayString) {
                        const stat = dailyStats[date];
                        
                        // ★ Logic ใหม่: เทียบ Actual vs Plan (เหมือนกราฟ)
                        // ถ้า Actual >= Plan ให้เขียว, ถ้าต่ำกว่าให้แดง
                        const isTargetMet = (stat.actualRevenue >= stat.planRevenue) && (stat.planRevenue > 0);
                        
                        const color = isTargetMet 
                            ? 'rgba(75, 192, 192, 0.4)'  // เขียว (ผ่านเป้า)
                            : 'rgba(255, 99, 132, 0.4)'; // แดง (หลุดเป้า)

                        events.push({
                            start: date,
                            end: date,
                            display: 'background',
                            backgroundColor: color,
                            allDay: true
                        });
                    }
                });

                successCallback(events);
            }
        } catch(e) { failureCallback(e); }
    }

    window.openPlanModal = function(data) {
        // 1. เรียกฟังก์ชันล้างค่าก่อนเสมอ เพื่อไม่ให้ข้อมูลเก่าค้าง
        resetPlanModal();

        if (data) {
            // ==========================================
            // กรณี: มีข้อมูลส่งมา (โหมดแก้ไข / Edit)
            // ==========================================
            
            // เปลี่ยนหัวข้อ Modal
            if (planModalLabel) planModalLabel.innerHTML = 'แก้ไขแผนการผลิต (Edit Plan)';

            // Map ข้อมูลพื้นฐานเข้า Input
            if (planModalPlanId) planModalPlanId.value = data.plan_id;
            if (planModalDate) planModalDate.value = data.plan_date;
            if (planModalLine) planModalLine.value = data.line;
            if (planModalQuantity) planModalQuantity.value = data.original_planned_quantity;
            if (planModalNote) planModalNote.value = data.note || '';

            // Map Shift (Radio Button)
            const s = data.shift || 'DAY';
            if (s === 'DAY') {
                const dayBtn = document.getElementById('shiftDay');
                if (dayBtn) dayBtn.checked = true;
            } else {
                const nightBtn = document.getElementById('shiftNight');
                if (nightBtn) nightBtn.checked = true;
            }

            // Map Item Info (ส่วนที่สำคัญ)
            if (planModalItemId) planModalItemId.value = data.item_id;
            
            // ใส่ชื่อลงในช่องค้นหาและช่องโชว์
            if (planModalItemSearch) {
                planModalItemSearch.value = `${data.sap_no} / ${data.part_no}`;
                planModalItemSearch.classList.add('is-valid'); // ใส่สีเขียวให้รู้ว่ามีค่าแล้ว
            }
            
            if (planModalSelectedItem) {
                planModalSelectedItem.textContent = data.part_description;
            }

            // ★ โชว์กล่องสีเทาที่ซ่อนไว้ ★
            const container = document.getElementById('selectedItemContainer');
            if (container) container.classList.remove('d-none');

            // โชว์ปุ่มลบ
            if (deletePlanButton) deletePlanButton.style.display = 'inline-block';

        } else {
            // ==========================================
            // กรณี: ไม่มีข้อมูล (โหมดเพิ่มใหม่ / Add New)
            // ==========================================

            // เปลี่ยนหัวข้อ Modal
            if (planModalLabel) planModalLabel.innerHTML = 'เพิ่มแผนการผลิตใหม่ (Add New Plan)';
            
            // ซ่อนปุ่มลบ
            if (deletePlanButton) deletePlanButton.style.display = 'none';

            // หมายเหตุ: วันที่, ไลน์, Shift ถูกตั้งค่า Default ไว้แล้วใน resetPlanModal()
        }
        
        // สุดท้ายสั่งให้ Modal เด้งขึ้นมา
        planModal.show();
    }

    function resetPlanModal() {
        // 1. ล้างค่าใน Form ทั้งหมด (Input ที่พิมพ์ไว้จะหายไป)
        if (planForm) planForm.reset();

        // 2. รีเซ็ตค่า ID ที่ซ่อนอยู่ (สำคัญมาก: เพื่อบอกว่าเป็นโหมดสร้างใหม่)
        if (planModalPlanId) planModalPlanId.value = "0";
        if (planModalItemId) planModalItemId.value = "";

        // 3. รีเซ็ตส่วนแสดงผล Item (ซ่อนกล่องสีเทา)
        const container = document.getElementById('selectedItemContainer');
        if (container) container.classList.add('d-none'); // ซ่อนกล่อง

        if (planModalSelectedItem) planModalSelectedItem.textContent = ""; // ล้างชื่อสินค้า
        
        // ล้างสีเขียว/แดง ในช่องค้นหา
        if (planModalItemSearch) {
            planModalItemSearch.value = "";
            planModalItemSearch.classList.remove('is-valid', 'is-invalid');
        }

        // 4. ตั้งค่าเริ่มต้น: วันที่และไลน์ผลิต (เอามาจาก Filter หน้าเว็บเพื่อความสะดวก)
        if (planModalDate && endDateFilter) {
            // ใช้วันที่จาก Filter หรือถ้าไม่มีก็ใช้วันปัจจุบัน
            planModalDate.value = endDateFilter.value || new Date().toISOString().split('T')[0]; 
        }
        
        if (planModalLine && planLineFilter) {
            // เลือกไลน์ตาม Filter หน้าเว็บ
            planModalLine.value = planLineFilter.value || "";
        }

        // 5. ตั้งค่าเริ่มต้น: Shift (ให้เป็น DAY เสมอ)
        const shiftDayBtn = document.getElementById('shiftDay');
        if (shiftDayBtn) shiftDayBtn.checked = true;
    }
    
    function openFinancialDetail(data) {
        if (!dlotModal) return;

        // --- A. เตรียมตัวแปรตัวเลข ---
        const planQty = parseFloat(data.adjusted_planned_quantity || 0);
        const actualQty = parseFloat(data.actual_quantity || 0);
        
        // ราคาขาย (Logic เดิม: ถ้ามี USD ให้คูณ 34 ถ้าไม่มีใช้ THB)
        const priceUSD = parseFloat(data.price_usd || 0);
        const priceTHB = parseFloat(data.standard_price || 0); // ต้องมั่นใจว่า backend ส่ง standard_price มาแล้ว
        const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
        
        // ต้นทุน (Standard Cost)
        const unitCost = parseFloat(data.cost_total || 0);

        // --- B. คำนวณยอดเงิน ---
        // Plan
        const planSales = planQty * unitPrice;
        const planCost = planQty * unitCost;
        const planProfit = planSales - planCost;

        // Actual
        const actualSales = actualQty * unitPrice;
        const actualCost = actualQty * unitCost;
        const actualProfit = actualSales - actualCost;

        // --- C. แสดงผลบน Modal ---
        
        // Title
        const dateObj = new Date(data.plan_date);
        document.getElementById('financialModalSubtitle').textContent = 
            `${dateObj.toLocaleDateString('en-GB')} | ${data.line} | ${data.part_no}`;

        // 1. Profit Summary (ส่วนหัว)
        document.getElementById('finActualProfit').textContent = formatCurrency(actualProfit);
        document.getElementById('finPlanProfitCompare').textContent = `Target: ${formatCurrency(planProfit)}`;
        
        // เปลี่ยนสี Profit: ถ้า Actual < 0 เป็นสีแดง, ถ้า > Plan เป็นเขียวเข้ม
        const profitEl = document.getElementById('finActualProfit');
        profitEl.className = 'fw-bold mb-0 ' + (actualProfit < 0 ? 'text-danger' : 'text-success');

        // 2. Table Data
        document.getElementById('finPlanQty').textContent = planQty.toLocaleString();
        document.getElementById('finActualQty').textContent = actualQty.toLocaleString();

        document.getElementById('finPlanSales').textContent = formatCurrency(planSales);
        document.getElementById('finActualSales').textContent = formatCurrency(actualSales);

        document.getElementById('finPlanCost').textContent = formatCurrency(planCost);
        document.getElementById('finActualCost').textContent = formatCurrency(actualCost);

        // 3. Progress Bar
        let progress = 0;
        if (planSales > 0) {
            progress = (actualSales / planSales) * 100;
            progress = Math.min(progress, 100); // ไม่เกิน 100% สำหรับบาร์
        }
        document.getElementById('finProgressText').textContent = progress.toFixed(1) + '%';
        document.getElementById('finProgressBar').style.width = progress + '%';
        
        // เปลี่ยนสีบาร์ตามความสำเร็จ
        const barEl = document.getElementById('finProgressBar');
        if (progress < 50) barEl.className = 'progress-bar bg-danger';
        else if (progress < 80) barEl.className = 'progress-bar bg-warning';
        else barEl.className = 'progress-bar bg-success';

        // 4. Footer Info
        document.getElementById('finUnitPrice').textContent = formatCurrency(unitPrice);
        document.getElementById('finUnitCost').textContent = formatCurrency(unitCost);

        // Show Modal
        dlotModal.show();
    }

    savePlanButton?.addEventListener('click', async () => {
        if (!planModalItemId.value) {
            planModalItemSearch.classList.add('is-invalid');
            return;
        }
        
        const selectedShiftEl = document.querySelector('input[name="planModalShift"]:checked');
        const shiftValue = selectedShiftEl ? selectedShiftEl.value : 'DAY';

        const payload = {
            plan_id: planModalPlanId.value,
            plan_date: planModalDate.value,
            line: planModalLine.value,
            shift: shiftValue, // ส่งค่านี้ไปแทน
            item_id: planModalItemId.value,
            original_planned_quantity: planModalQuantity.value,
            note: planModalNote.value
        };

        try {
            const res = await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
            if(res.success) {
                planModal.hide();
                fetchPlans(); 
                if (fullCalendarInstance) fullCalendarInstance.refetchEvents();
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
                if (fullCalendarInstance) fullCalendarInstance.refetchEvents();
                showToast('Plan deleted', 'var(--bs-success)');
            }
        } catch(e) { console.error(e); }
    });

    // =================================================================
    // SECTION 9: APP START
    // =================================================================

    function initializeApp() {
        setAllDefaultDates();
        
        startDateFilter?.addEventListener('change', fetchPlans);
        endDateFilter?.addEventListener('change', fetchPlans);
        planShiftFilter?.addEventListener('change', fetchPlans);

        planLineFilter?.addEventListener('change', () => {
            fetchPlans();
            fullCalendarInstance?.refetchEvents();
        });

        btnRefreshPlan?.addEventListener('click', () => {
            fetchPlans();
            fullCalendarInstance?.refetchEvents();
        });
        
        document.getElementById('calendar-prev-button')?.addEventListener('click', () => fullCalendarInstance?.prev());
        document.getElementById('calendar-next-button')?.addEventListener('click', () => fullCalendarInstance?.next());
        document.getElementById('calendar-today-button')?.addEventListener('click', () => fullCalendarInstance?.today());
        
        document.getElementById('calendar-month-view-button')?.addEventListener('click', () => fullCalendarInstance?.changeView('dayGridMonth'));
        document.getElementById('calendar-week-view-button')?.addEventListener('click', () => fullCalendarInstance?.changeView('timeGridWeek'));

        document.querySelectorAll('input[name="chartViewMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentChartMode = e.target.value;
                // เรียก render ใหม่ (ใช้ข้อมูลเดิมที่มีอยู่แล้ว ไม่ต้องโหลดใหม่)
                if (currentPlanData) renderPlanVsActualChart(currentPlanData);
            });
        });

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

        btnAddPlan?.addEventListener('click', () => openPlanModal(null));

        fetchDashboardLines()
            .then(fetchAllItemsForPlanning)
            .then(() => {
                initializeCalendar(); 
                fetchPlans();
            });
    }

    initializeApp();
});