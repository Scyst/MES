/* script/managementDashboard.js (Fix Calculation & UI Logic) */
"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // SECTION 1: GLOBAL VARIABLES & DOM ELEMENTS
    // =================================================================

    // --- State Variables ---
    let allPlanningItems = [];
    let currentPlanData = [];
    let selectedPlanItem = null;
    let currentChartMode = 'date'; 
    let planVsActualChartInstance = null;
    let fullCalendarInstance = null;
    let saveDebounceTimer;

    // --- DOM Elements ---
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const planLineFilter = document.getElementById('planLineFilter');
    const planShiftFilter = document.getElementById('planShiftFilter');
    const btnRefreshPlan = document.getElementById('btn-refresh-plan');
    const btnAddPlan = document.getElementById('btnAddPlan');
    const btnCalculateCarryOver = document.getElementById('btnCalculateCarryOver');

    const planVsActualChartCanvas = document.getElementById('planVsActualChart');
    const planningCalendarContainer = document.getElementById('planningCalendarContainer');
    const calendarTitle = document.getElementById('calendar-title');
    const productionPlanTableBody = document.getElementById('productionPlanTableBody');
    const chartDateDisplay = document.getElementById('chartDateDisplay'); 

    // --- Modal Elements ---
    const planModalElement = document.getElementById('planModal');
    const planModal = new bootstrap.Modal(planModalElement);
    const planForm = document.getElementById('planForm');
    const planModalLabel = document.getElementById('planModalLabel');
    
    const planModalPlanId = document.getElementById('planModalPlanId');
    const planModalDate = document.getElementById('planModalDate');
    const planModalLine = document.getElementById('planModalLine');
    const planModalQuantity = document.getElementById('planModalQuantity');
    const planModalNote = document.getElementById('planModalNote');
    
    const planModalItemSearch = document.getElementById('planModalItemSearch');
    const planModalSelectedItem = document.getElementById('planModalSelectedItem');
    const planModalItemId = document.getElementById('planModalItemId');
    const planModalItemResults = document.getElementById('planModalItemResults');
    const itemSearchError = document.getElementById('item-search-error');

    const savePlanButton = document.getElementById('savePlanButton');
    const deletePlanButton = document.getElementById('deletePlanButton');

    const dlotModalElement = document.getElementById('dlotModal'); 
    const dlotModal = dlotModalElement ? new bootstrap.Modal(dlotModalElement) : null;

    const btnImportPlan = document.getElementById('btnImportPlan');
    const importPlanInput = document.getElementById('importPlanInput');


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
        
        // Map ข้อมูลให้ตรงกับ Header ที่เราตกลงกัน
        const exportData = currentPlanData.map(p => ({
            'Date': p.plan_date,           // ตรงกับหน้าเว็บ
            'Line': p.line,
            'Shift': p.shift,
            'SAP_No': p.sap_no || '',      // สำคัญ: ใช้สำหรับ Import กลับ
            'Part_No': p.part_no || '',    // สำรอง: ใช้สำหรับ Import กลับ
            'Part_Name': p.part_description || '',
            'Original_Plan': parseFloat(p.original_planned_quantity || 0), // ค่าที่ต้องการแก้ไข
            'Note': p.note || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // ปรับความกว้างคอลัมน์นิดหน่อยให้สวยงาม (Optional)
        const wscols = [
            {wch: 12}, // Date
            {wch: 15}, // Line
            {wch: 8},  // Shift
            {wch: 15}, // SAP
            {wch: 15}, // Part
            {wch: 30}, // Name
            {wch: 15}, // Plan
            {wch: 20}  // Note
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ProductionPlan");
        
        // ตั้งชื่อไฟล์ให้สื่อความหมาย
        const filename = `Production_Plan_${startDateFilter.value}_to_${endDateFilter.value}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    // ฟังก์ชันสำหรับ Import ไฟล์ Excel
    async function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Reset input เพื่อให้เลือกไฟล์เดิมซ้ำได้ถ้าต้องการ
        event.target.value = '';

        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // แปลง Excel เป็น JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    showToast('File is empty', 'var(--bs-warning)');
                    return;
                }

                // ★★★ MAGIC MAPPING: แปลงชื่อคอลัมน์ Excel -> API Parameters ★★★
                const mappedPlans = jsonData.map(row => {
                    // พยายามหา Item Code จาก SAP_No ก่อน ถ้าไม่มีเอา Part_No
                    // (รองรับทั้ง Case เล็ก/ใหญ่ เผื่อ User พิมพ์แก้หัวตารางเอง)
                    const itemCode = row['SAP_No'] || row['sap_no'] || row['Part_No'] || row['part_no'] || '';
                    
                    // ต้องมีข้อมูลสำคัญครบ ถึงจะส่งไป
                    if (!row['Date'] && !row['date']) return null; 

                    return {
                        date: row['Date'] || row['date'] || row['plan_date'],
                        line: row['Line'] || row['line'],
                        shift: row['Shift'] || row['shift'] || 'DAY', // Default DAY
                        item_code: itemCode,
                        qty: row['Original_Plan'] || row['original_plan'] || row['qty'] || 0,
                        note: row['Note'] || row['note'] || ''
                    };
                }).filter(item => item !== null && item.item_code !== ''); // กรองแถวเสียทิ้ง

                if (mappedPlans.length === 0) {
                    showToast('No valid data found in file. Check column headers.', 'var(--bs-danger)');
                    return;
                }

                // ส่งไปให้ API (ใช้ confirm ก่อนเพื่อความปลอดภัย)
                if(!confirm(`Ready to import ${mappedPlans.length} items? \n(Existing plans will be updated)`)) return;

                showSpinner();
                const res = await sendRequest(PLAN_API, 'import_plans_bulk', 'POST', { plans: mappedPlans });
                
                if (res.success) {
                    showToast(res.message, 'var(--bs-success)');
                    // โหลดข้อมูลใหม่ทันที
                    fetchPlans();
                    if(fullCalendarInstance) fullCalendarInstance.refetchEvents();
                } else {
                    // กรณีมี Error บางบรรทัด
                    let errMsg = res.message;
                    if (res.errors && res.errors.length > 0) {
                        errMsg += '\n' + res.errors.slice(0, 3).join('\n') + (res.errors.length > 3 ? '\n...' : '');
                    }
                    alert("Import Completed with issues:\n" + errMsg);
                    fetchPlans(); // โหลดส่วนที่ผ่าน
                }

            } catch (err) {
                console.error(err);
                showToast('Error reading file. Please check format.', 'var(--bs-danger)');
            } finally {
                hideSpinner();
            }
        };

        reader.readAsArrayBuffer(file);
    }   

    // =================================================================
    // SECTION 3: INITIALIZATION & AUTOCOMPLETE
    // =================================================================
    function setAllDefaultDates() {
        const today = new Date();
        const pastDate = new Date();
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
                        const assemblyOption = Array.from(select.options).find(opt => opt.value.toUpperCase() === 'ASSEMBLY');
                        if (assemblyOption) select.value = assemblyOption.value;
                        else if (lines.length > 0) select.value = lines[0];
                    }
                });
                if (planLineFilter.value) {
                    fetchPlans();
                    fullCalendarInstance?.refetchEvents();
                }
            }
        } catch (error) { console.error("Error fetching lines:", error); }
    }

    async function fetchAllItemsForPlanning() {
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
                        <div class="small text-muted text-truncate mt-1">${item.part_description || ''}</div>
                    `;
                    div.addEventListener('click', (e) => {
                        e.stopPropagation();
                        planModalItemSearch.value = `${item.sap_no} / ${item.part_no}`;
                        planModalItemId.value = item.item_id;
                        planModalSelectedItem.textContent = item.part_description;
                        document.getElementById('selectedItemContainer').classList.remove('d-none');
                        document.getElementById('planModalItemSearch').classList.add('is-valid'); 
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

    // ★★★ [FIXED] คำนวณยอดรวมที่ Footer โดยใช้ตรรกะเดียวกับ Table Row ★★★
    function updateFooterSummaryClientSide(data) {
        let totalQty = 0, totalActual = 0, totalCost = 0, totalSales = 0;

        data.forEach(p => {
            // คำนวณ Adjusted Plan เอง ไม่รอ Backend
            const original = parseFloat(p.original_planned_quantity || 0);
            const carryOver = parseFloat(p.carry_over_quantity || 0);
            const adj = original + carryOver; // <-- Fix: Force Calculation

            const act = parseFloat(p.actual_quantity || 0);
            
            const cost = parseFloat(p.cost_total || 0);
            const priceUSD = parseFloat(p.price_usd || 0);
            const priceTHB = parseFloat(p.standard_price || 0);
            let unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;

            totalQty += adj;
            totalActual += act;
            totalCost += (adj * cost);
            totalSales += (adj * unitPrice);
        });

        document.getElementById('footer-total-qty').innerText = totalQty.toLocaleString();
        
        const footerActualEl = document.getElementById('footer-total-actual');
        if (footerActualEl) footerActualEl.innerText = totalActual.toLocaleString();

        document.getElementById('footer-total-cost').innerText = formatCurrency(totalCost);
        document.getElementById('footer-total-sale').innerText = formatCurrency(totalSales);
    }

    // =================================================================
    // SECTION 5: RENDERING TABLE (FIXED CALCULATION)
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
            
            // ★★★ [FIXED] คำนวณ Adjusted Plan ทันที ไม่รอค่าจาก DB ★★★
            const adjPlan = originalPlan + carryOver; 
            
            const actualQty = parseFloat(plan.actual_quantity || 0);
            const unitCost = parseFloat(plan.cost_total || 0);
            
            // คำนวณยอดเงินจาก adjPlan ที่ถูกต้อง
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
                <td style="width: 100px;" class="text-secondary small ">${plan.plan_date}</td>
                <td style="width: 100px;" class="text-center"><span class="badge bg-light text-dark border">${plan.line}</span></td>
                <td style="width: 100px;" class="text-center"><span class="badge ${plan.shift === 'DAY' ? 'bg-warning text-dark' : 'bg-dark text-white'} border">${(plan.shift || '-').substring(0,1)}</span></td>
                <td>
                    <span class="fw-bold text-dark ">${plan.sap_no || '-'}</span> 
                    <span class="text-muted small mx-1">/</span> 
                    <span class=" text-secondary">${plan.part_no || '-'}</span>
                    <small class="d-block text-muted text-truncate mt-1" style="max-width: 250px;">${plan.part_description || ''}</small>
                </td>
                <td style="width: 100px;" class="text-end">
                    <span class="editable-plan fw-bold text-dark" contenteditable="true" data-id="${plan.plan_id}" data-field="original_plan" style="cursor: pointer; border-bottom: 1px dashed #ccc; display:inline-block; min-width: 50px;">${originalPlan.toLocaleString()}</span>
                </td>
                <td style="width: 100px;" class="text-end">
                    <span class="editable-plan ${carryOver !== 0 ? 'text-warning fw-bold' : 'text-muted opacity-50'}" contenteditable="true" data-id="${plan.plan_id}" data-field="carry_over" style="cursor: pointer; border-bottom: 1px dashed #ccc;">${carryOver.toLocaleString()}</span>
                </td>
                
                <td class="text-end fw-bold text-primary " data-field="adjusted_plan">${adjPlan.toLocaleString()}</td>
                
                <td class="text-end  ${progressClass}" data-field="actual_quantity">${actualQty.toLocaleString()}</td>
                
                <td style="width: 120px; cursor: pointer;" class="text-end text-danger fw-bold small view-cost-detail" title="Click to view Manpower details">${formatCurrency(totalPlanCost)}</td>
                <td style="width: 120px;" class="text-end text-success fw-bold small">${formatCurrency(totalPlanSale)}</td>
                
                <td style="width: 250px;" class="text-center">
                    <span class="editable-plan d-inline-block text-truncate text-secondary small" style="max-width: 230px; cursor: pointer; border-bottom: 1px dashed #ccc;" contenteditable="true" data-id="${plan.plan_id}" data-field="note">${plan.note || '<span class="opacity-25">...</span>'}</span>
                </td>
            `;
            productionPlanTableBody.appendChild(tr);
        });
    }

    // =================================================================
    // SECTION 6: INTERACTION & INLINE EDIT
    // =================================================================
    
    // Function openPlanModal (Fix: Disable item search on Edit)
    function openPlanModal(data) {
        resetPlanModal();
        if (data) {
            if (planModalLabel) planModalLabel.innerHTML = 'แก้ไขแผนการผลิต (Edit Plan)';
            if (planModalPlanId) planModalPlanId.value = data.plan_id;
            if (planModalDate) planModalDate.value = data.plan_date;
            if (planModalLine) planModalLine.value = data.line;
            if (planModalQuantity) planModalQuantity.value = data.original_planned_quantity;
            if (planModalNote) planModalNote.value = data.note || '';

            const s = data.shift || 'DAY';
            if (s === 'DAY') {
                const dayBtn = document.getElementById('shiftDay');
                if (dayBtn) dayBtn.checked = true;
            } else {
                const nightBtn = document.getElementById('shiftNight');
                if (nightBtn) nightBtn.checked = true;
            }

            if (planModalItemId) planModalItemId.value = data.item_id;
            if (planModalItemSearch) {
                planModalItemSearch.value = `${data.sap_no} / ${data.part_no}`;
                planModalItemSearch.classList.add('is-valid');
                // ★★★ [FIXED] ล็อคช่องค้นหาเมื่อแก้ไข ★★★
                planModalItemSearch.disabled = true; 
                planModalItemSearch.style.backgroundColor = '#e9ecef';
            }
            if (planModalSelectedItem) planModalSelectedItem.textContent = data.part_description;
            
            const container = document.getElementById('selectedItemContainer');
            if (container) container.classList.remove('d-none');

            if (deletePlanButton) deletePlanButton.style.display = 'inline-block';
        } else {
            if (planModalLabel) planModalLabel.innerHTML = 'เพิ่มแผนการผลิตใหม่ (Add New Plan)';
            if (deletePlanButton) deletePlanButton.style.display = 'none';
            
            // ★★★ [FIXED] ปลดล็อคช่องค้นหาเมื่อเพิ่มใหม่ ★★★
            if (planModalItemSearch) {
                planModalItemSearch.disabled = false;
                planModalItemSearch.style.backgroundColor = '';
            }
        }
        planModal.show();
    }

    function resetPlanModal() {
        if (planForm) planForm.reset();
        if (planModalPlanId) planModalPlanId.value = "0";
        if (planModalItemId) planModalItemId.value = "";

        const container = document.getElementById('selectedItemContainer');
        if (container) container.classList.add('d-none');

        if (planModalSelectedItem) planModalSelectedItem.textContent = "";
        
        if (planModalItemSearch) {
            planModalItemSearch.value = "";
            planModalItemSearch.classList.remove('is-valid', 'is-invalid');
            planModalItemSearch.disabled = false; // Reset state
            planModalItemSearch.style.backgroundColor = '';
        }

        if (planModalDate && endDateFilter) {
            planModalDate.value = endDateFilter.value || new Date().toISOString().split('T')[0]; 
        }
        
        if (planModalLine && planLineFilter) {
            planModalLine.value = planLineFilter.value || "";
        }

        const shiftDayBtn = document.getElementById('shiftDay');
        if (shiftDayBtn) shiftDayBtn.checked = true;
    }

    function openFinancialDetail(data) {
        if (!dlotModal) return;

        // ★★★ คำนวณ Adjusted Plan สดๆ (Original + CarryOver) ★★★
        const original = parseFloat(data.original_planned_quantity || 0);
        const carryOver = parseFloat(data.carry_over_quantity || 0);
        const planQty = original + carryOver; // ใช้ค่าที่คำนวณเอง

        const actualQty = parseFloat(data.actual_quantity || 0);
        
        const priceUSD = parseFloat(data.price_usd || 0);
        const priceTHB = parseFloat(data.standard_price || 0);
        const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
        const unitCost = parseFloat(data.cost_total || 0);

        const planSales = planQty * unitPrice;
        const planCost = planQty * unitCost;
        const planProfit = planSales - planCost;

        const actualSales = actualQty * unitPrice;
        const actualCost = actualQty * unitCost;
        const actualProfit = actualSales - actualCost;

        const dateObj = new Date(data.plan_date);
        document.getElementById('financialModalSubtitle').textContent = 
            `${dateObj.toLocaleDateString('en-GB')} | ${data.line} | ${data.part_no}`;

        document.getElementById('finActualProfit').textContent = formatCurrency(actualProfit);
        document.getElementById('finPlanProfitCompare').textContent = `Target: ${formatCurrency(planProfit)}`;
        
        const profitEl = document.getElementById('finActualProfit');
        profitEl.className = 'fw-bold mb-0 ' + (actualProfit < 0 ? 'text-danger' : 'text-success');

        document.getElementById('finPlanQty').textContent = planQty.toLocaleString();
        document.getElementById('finActualQty').textContent = actualQty.toLocaleString();

        document.getElementById('finPlanSales').textContent = formatCurrency(planSales);
        document.getElementById('finActualSales').textContent = formatCurrency(actualSales);

        document.getElementById('finPlanCost').textContent = formatCurrency(planCost);
        document.getElementById('finActualCost').textContent = formatCurrency(actualCost);

        let progress = 0;
        if (planSales > 0) {
            progress = (actualSales / planSales) * 100;
            progress = Math.min(progress, 100);
        }
        document.getElementById('finProgressText').textContent = progress.toFixed(1) + '%';
        document.getElementById('finProgressBar').style.width = progress + '%';
        
        const barEl = document.getElementById('finProgressBar');
        if (progress < 50) barEl.className = 'progress-bar bg-danger';
        else if (progress < 80) barEl.className = 'progress-bar bg-warning';
        else barEl.className = 'progress-bar bg-success';

        document.getElementById('finUnitPrice').textContent = formatCurrency(unitPrice);
        document.getElementById('finUnitCost').textContent = formatCurrency(unitCost);

        dlotModal.show();
    }

    // Event Listeners for Table
    productionPlanTableBody.addEventListener('click', (e) => {
        if (e.target.isContentEditable || e.target.closest('.editable-plan') || e.target.closest('button')) return;
        const row = e.target.closest('tr');
        if (!row || !row.dataset.planData) return;
        const data = JSON.parse(row.dataset.planData);

        if (e.target.closest('.view-cost-detail') || e.target.closest('.view-sales-detail')) {
            openFinancialDetail(data); 
            return;
        }
        openPlanModal(data);
    });

    productionPlanTableBody.addEventListener('blur', (e) => {
        if (e.target.classList.contains('editable-plan')) {
            const el = e.target;
            const id = el.dataset.id;
            const field = el.dataset.field;
            let newVal = el.innerText.trim();
            const row = el.closest('tr');
            if(!row) return;
            const data = JSON.parse(row.dataset.planData);

            if (field === 'note' && newVal !== (data.note || '')) {
                clearTimeout(saveDebounceTimer);
                saveDebounceTimer = setTimeout(() => handleNoteEdit(id, newVal, row), 500);
            } 
            else if (['original_plan', 'carry_over'].includes(field)) {
                const numVal = parseFloat(newVal.replace(/,/g, ''));
                if (!isNaN(numVal)) {
                    // ★★★ อัปเดตการคำนวณทันทีเมื่อพิมพ์เสร็จ ★★★
                    updateRowCalculationUI(row, field, numVal);
                    clearTimeout(saveDebounceTimer);
                    saveDebounceTimer = setTimeout(() => { handleQtyEdit(id, field, numVal, row); }, 500);
                } else {
                    el.innerText = field === 'original_plan' ? parseFloat(data.original_planned_quantity).toLocaleString() : parseFloat(data.carry_over_quantity).toLocaleString();
                }
            }
        }
    }, true);

    productionPlanTableBody.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('editable-plan') && e.key === 'Enter') {
            e.preventDefault(); e.target.blur();
        }
    });

    // ★★★ [FIXED] อัปเดต UI ทันทีเมื่อมีการแก้ตัวเลข (Optimistic Update) ★★★
    function updateRowCalculationUI(row, field, newVal) {
        const data = JSON.parse(row.dataset.planData);
        let plan = parseFloat(data.original_planned_quantity || 0);
        let co = parseFloat(data.carry_over_quantity || 0);

        if (field === 'original_plan') plan = newVal;
        if (field === 'carry_over') co = newVal;

        const newTarget = plan + co;
        
        // 1. อัปเดตช่อง Target
        const targetEl = row.querySelector('[data-field="adjusted_plan"]');
        if(targetEl) targetEl.innerText = newTarget.toLocaleString();

        // 2. คำนวณและอัปเดตช่อง Cost & Sale ทันที
        const unitCost = parseFloat(data.cost_total || 0);
        const newTotalCost = newTarget * unitCost;
        const costEl = row.querySelector('.view-cost-detail'); // หา class นี้แทน data-field
        if(costEl) costEl.innerText = formatCurrency(newTotalCost);

        const priceUSD = parseFloat(data.price_usd || 0);
        const priceTHB = parseFloat(data.standard_price || 0);
        const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
        const newTotalSale = newTarget * unitPrice;
        // ช่อง Sale คือลูกคนที่ 10 (index 9)
        if(row.children[9]) row.children[9].innerText = formatCurrency(newTotalSale);

        // 3. อัปเดตสี Actual
        const actualQty = parseFloat(data.actual_quantity || 0);
        const actualEl = row.querySelector('[data-field="actual_quantity"]'); 
        if (actualEl) {
            actualEl.className = 'text-end '; 
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
                plan_id: 0, plan_date: data.plan_date, line: data.line, shift: data.shift, item_id: data.item_id,
                original_planned_quantity: (field === 'original_plan') ? val : 0,
                carry_over_quantity: (field === 'carry_over') ? val : 0,
                note: data.note || ''
            };
            try {
                const res = await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
                if(res.success) { showToast('Plan created automatically', 'var(--bs-success)'); fetchPlans(); } 
                else { showToast(res.message, 'var(--bs-danger)'); }
            } catch(e) { console.error(e); }
            return;
        }
        let payload = { plan_id: id, plan_date: data.plan_date, line: data.line, shift: data.shift, item_id: data.item_id, note: data.note || '' };
        if (field === 'original_plan') {
            payload.original_planned_quantity = val;
            try {
                const res = await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
                if(res.success) {
                    data.original_planned_quantity = val; row.dataset.planData = JSON.stringify(data);
                    showToast('Plan updated', 'var(--bs-success)'); updateLocalDataArray(id, 'original_planned_quantity', val);
                }
            } catch(e) { showToast('Error saving plan', 'var(--bs-danger)'); }
        } else if (field === 'carry_over') {
            try {
                const res = await sendRequest(PLAN_API, 'update_carry_over', 'POST', { plan_id: id, carry_over_quantity: val });
                if(res.success) {
                    data.carry_over_quantity = val; row.dataset.planData = JSON.stringify(data);
                    showToast('C/O updated', 'var(--bs-success)'); updateLocalDataArray(id, 'carry_over_quantity', val);
                }
            } catch(e) { showToast('Error updating C/O', 'var(--bs-danger)'); }
        }
    }

    async function handleNoteEdit(id, note, row) {
        const data = JSON.parse(row.dataset.planData);
        const cleanNote = note === '...' ? '' : note;
        const payload = {
            plan_id: id, plan_date: data.plan_date, line: data.line, shift: data.shift, item_id: data.item_id,
            original_planned_quantity: data.original_planned_quantity, note: cleanNote
        };
        try {
            await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
            data.note = cleanNote; row.dataset.planData = JSON.stringify(data);
            showToast('Note saved', 'var(--bs-success)');
        } catch(e) { showToast('Error saving note', 'var(--bs-danger)'); }
    }

    function updateLocalDataArray(id, key, val) {
        const idx = currentPlanData.findIndex(p => p.plan_id == id);
        if(idx !== -1) {
            currentPlanData[idx][key] = val;
            // Update Adjusted Plan in Local Array too
            const plan = parseFloat(currentPlanData[idx].original_planned_quantity || 0);
            const co = parseFloat(currentPlanData[idx].carry_over_quantity || 0);
            currentPlanData[idx].adjusted_planned_quantity = plan + co;
            
            updateFooterSummaryClientSide(currentPlanData);
        }
    }

    savePlanButton?.addEventListener('click', async () => {
        if (!planModalItemId.value) { planModalItemSearch.classList.add('is-invalid'); return; }
        const selectedShiftEl = document.querySelector('input[name="planModalShift"]:checked');
        const shiftValue = selectedShiftEl ? selectedShiftEl.value : 'DAY';
        const payload = {
            plan_id: planModalPlanId.value, plan_date: planModalDate.value, line: planModalLine.value, shift: shiftValue,
            item_id: planModalItemId.value, original_planned_quantity: planModalQuantity.value, note: planModalNote.value
        };
        try {
            const res = await sendRequest(PLAN_API, 'save_plan', 'POST', payload);
            if(res.success) {
                planModal.hide(); fetchPlans(); if (fullCalendarInstance) fullCalendarInstance.refetchEvents();
                showToast('Plan saved successfully', 'var(--bs-success)');
            } else { showToast(res.message, 'var(--bs-danger)'); }
        } catch(e) { console.error(e); }
    });

    deletePlanButton?.addEventListener('click', async () => {
        if(!confirm("Are you sure?")) return;
        try {
            const res = await sendRequest(PLAN_API, 'delete_plan', 'POST', { plan_id: planModalPlanId.value });
            if(res.success) {
                planModal.hide(); fetchPlans(); if (fullCalendarInstance) fullCalendarInstance.refetchEvents();
                showToast('Plan deleted', 'var(--bs-success)');
            }
        } catch(e) { console.error(e); }
    });

    // =================================================================
    // SECTION 7: CHART CONFIG (Trend Lines Added - Fixed Colors)
    // =================================================================
    function renderPlanVsActualChart(planData) {
        if (currentChartMode === 'date') {
            renderDailyTrendChart(planData);
        } else if (currentChartMode === 'money') { 
            renderFinancialTrendChart(planData);
        } else {
            renderItemChart(planData);
        }
    }

    function renderFinancialTrendChart(planData) {
        const chartWrapper = document.getElementById('planVsActualChartInnerWrapper');
        const ctx = planVsActualChartCanvas.getContext('2d');
        if (!planVsActualChartCanvas || !chartWrapper) return;

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
                
                // ★ คำนวณ Adjusted สดๆ
                const planQty = parseFloat(p.original_planned_quantity || 0) + parseFloat(p.carry_over_quantity || 0);
                const actQty = parseFloat(p.actual_quantity || 0);
                
                dateMap[d].planRev += (planQty * unitPrice);
                dateMap[d].actualRev += (actQty * unitPrice);
            }
        });

        const sortedDates = Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));
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
                    // ★★★ Target Trend (Blue Dashed) ★★★
                    {
                        type: 'line',
                        label: 'Target Trend',
                        data: planDataArr,
                        borderColor: 'rgb(54, 162, 235)', 
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderWidth: 2,
                        borderDash: [5, 5], // เส้นประ
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: false,
                        order: 0,
                        datalabels: { display: false }
                    },
                    {
                        type: 'line',
                        label: 'Actual Trend',
                        data: actualDataArr,
                        borderColor: 'rgb(75, 192, 192)', 
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        borderWidth: 0,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: false,
                        order: 0,
                        datalabels: { display: false }
                    },
                    {
                        label: 'Target Revenue',
                        data: planDataArr,
                        backgroundColor: 'rgba(255, 205, 86, 0.2)', 
                        borderColor: 'rgba(255, 205, 86, 0.6)',
                        borderWidth: 1,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8,
                        borderRadius: 0,
                        order: 2
                    },
                    {
                        label: 'Actual Revenue',
                        data: actualDataArr,
                        backgroundColor: (ctx) => {
                            const idx = ctx.dataIndex;
                            const p = planDataArr[idx];
                            const a = actualDataArr[idx];
                            return (a >= p && p > 0) ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)';
                        },
                        hoverBackgroundColor: (ctx) => {
                            const idx = ctx.dataIndex;
                            const p = planDataArr[idx];
                            const a = actualDataArr[idx];
                            return (a >= p && p > 0) ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
                        },
                        borderWidth: 0,
                        barPercentage: 0.6, 
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
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: { 
                        beginAtZero: true,
                        grid: { borderDash: [2, 2] },
                        title: { display: true, text: 'Revenue (THB)' },
                        ticks: { callback: function(val) { return val >= 1000000 ? (val/1000000).toFixed(1)+'M' : val >= 1000 ? (val/1000).toFixed(0)+'k' : val; } }
                    }
                },
                plugins: {
                    legend: { 
                        position: 'top', align: 'end',
                        labels: {
                            usePointStyle: true, boxWidth: 8, font: { size: 11 },
                            generateLabels: (chart) => [
                                { text: 'Target Trend', strokeStyle: 'rgb(54, 162, 235)', lineWidth: 2, borderDash: [5, 5], fillStyle: 'transparent' },
                                { text: 'Actual Trend', strokeStyle: 'rgb(75, 192, 192)', lineWidth: 2, fillStyle: 'transparent' },
                                { text: 'Target Rev.', fillStyle: 'rgba(255, 205, 86, 0.2)', strokeStyle: 'rgba(255, 205, 86, 0.6)', lineWidth: 1 },
                                { text: 'Actual (Hit)', fillStyle: 'rgba(75, 192, 192, 1)', strokeStyle: 'rgba(75, 192, 192, 1)', lineWidth: 0 },
                                { text: 'Actual (Miss)', fillStyle: 'rgba(255, 99, 132, 1)', strokeStyle: 'rgba(255, 99, 132, 1)', lineWidth: 0 }
                            ]
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => new Date(sortedDates[items[0].dataIndex].date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }),
                            label: (c) => (c.dataset.label||'') + ': ' + (c.parsed.y!==null ? new Intl.NumberFormat('th-TH', {style:'currency', currency:'THB'}).format(c.parsed.y) : '')
                        }
                    },
                    datalabels: { display: false }
                }
            },
            plugins: plugins
        });
        
        if (chartDateDisplay) chartDateDisplay.textContent = "Daily Financial Trend";
    }

    function renderDailyTrendChart(planData) {
        const chartWrapper = document.getElementById('planVsActualChartInnerWrapper');
        const ctx = planVsActualChartCanvas.getContext('2d');
        if (!planVsActualChartCanvas || !chartWrapper) return;

        const dateMap = {};
        let curr = new Date(startDateFilter.value);
        const end = new Date(endDateFilter.value);
        while (curr <= end) {
            const dStr = curr.toISOString().split('T')[0];
            dateMap[dStr] = { date: dStr, plan: 0, actual: 0 };
            curr.setDate(curr.getDate() + 1);
        }
        
        planData.forEach(p => {
            const d = p.plan_date; 
            if (dateMap[d]) {
                // ★ คำนวณ Adjusted สดๆ
                const planQty = parseFloat(p.original_planned_quantity || 0) + parseFloat(p.carry_over_quantity || 0);
                const actQty = parseFloat(p.actual_quantity || 0);
                
                dateMap[d].plan += planQty;
                dateMap[d].actual += actQty;
            }
        });

        const sortedDates = Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));
        const minWidthPerBar = 50; 
        const totalWidth = Math.max(chartWrapper.parentElement.clientWidth, sortedDates.length * minWidthPerBar);
        chartWrapper.style.width = `${totalWidth}px`;

        const labels = sortedDates.map(d => {
            const dateObj = new Date(d.date);
            return `${dateObj.getDate()}/${dateObj.getMonth()+1}`; 
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
                    // ★★★ Target Trend (Blue Dashed) ★★★
                    {
                        type: 'line',
                        label: 'Plan Trend',
                        data: planValues,
                        borderColor: 'rgb(54, 162, 235)', 
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: false,
                        order: 0,
                        datalabels: { display: false }
                    },
                    {
                        type: 'line',
                        label: 'Actual Trend',
                        data: actualValues,
                        borderColor: 'rgb(75, 192, 192)', 
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        borderWidth: 0,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: false,
                        order: 0,
                        datalabels: { display: false }
                    },
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
                        barPercentage: 0.6, 
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
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: { beginAtZero: true, grid: { borderDash: [2, 2] }, title: { display: true, text: 'Total Qty' } }
                },
                plugins: {
                    legend: { 
                        position: 'top', align: 'center',
                        labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => new Date(sortedDates[items[0].dataIndex].date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })
                        }
                    },
                    datalabels: { display: false }
                }
            },
            plugins: plugins
        });
        
        if (chartDateDisplay) chartDateDisplay.textContent = "Daily Trend";
    }

    // (ItemChart - No changes needed)
    function renderItemChart(planData) {
        const chartWrapper = document.getElementById('planVsActualChartInnerWrapper');
        const ctx = planVsActualChartCanvas.getContext('2d');
        if (!planVsActualChartCanvas || !chartWrapper) return;

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
            // ★ คำนวณ Adjusted สดๆ
            const original = parseFloat(p.original_planned_quantity || 0);
            const co = parseFloat(p.carry_over_quantity || 0);
            
            aggregatedData[itemId].totalAdjustedPlan += (original + co);
            aggregatedData[itemId].totalActualQty += parseFloat(p.actual_quantity || 0);
            aggregatedData[itemId].totalOriginalPlan += original;
            aggregatedData[itemId].totalCarryOver += co;
        });

        const aggregatedArray = Object.values(aggregatedData);
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
                    { label: 'Original Plan', data: totalOriginalPlanData, backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgba(54, 162, 235, 0.2)', borderWidth: 1, stack: 'plan', barPercentage: 0.7, categoryPercentage: 0.8, grouped: false, order: 2, borderRadius: 0 },
                    { label: 'Carry Over', data: totalCarryOverData, backgroundColor: 'rgba(255, 159, 64, 0.2)', borderColor: 'rgba(255, 159, 64, 0.2)', borderWidth: 1, stack: 'plan', barPercentage: 0.7, categoryPercentage: 0.8, grouped: false, order: 2, borderRadius: 0 },
                    { label: 'Actual (Met)', data: metPlanData, backgroundColor: 'rgba(75, 192, 192, 1)', hoverBackgroundColor: 'rgba(75, 192, 192, 0.8)', stack: 'actual', barPercentage: 0.7, categoryPercentage: 0.8, grouped: false, order: 1, borderRadius: 0 },
                    { label: 'Actual (Short)', data: shortfallData, backgroundColor: 'rgba(255, 99, 132, 1)', hoverBackgroundColor: 'rgba(255, 99, 132, 0.8)', stack: 'actual', barPercentage: 0.7, categoryPercentage: 0.8, grouped: false, order: 1, borderRadius: 0 },
                    { label: 'Actual (Unplanned)', data: unplannedData, backgroundColor: 'rgba(153, 102, 255, 1)', hoverBackgroundColor: 'rgba(153, 102, 255, 0.8)', stack: 'actual', barPercentage: 0.7, categoryPercentage: 0.8, grouped: false, order: 1, borderRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, layout: { padding: { top: 25, right: 10, left: 0, bottom: 0 } },
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { stacked: true, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, font: { size: 11, weight: '600' }, color: '#495057' }, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Quantity (Pcs)', font: { weight: 'bold', size: 12 }, color: '#6c757d' }, grid: { color: '#e9ecef', borderDash: [2, 2] }, border: { display: false } }
                },
                plugins: {
                    legend: { position: 'top', align: 'center', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
                    tooltip: { backgroundColor: 'rgba(255, 255, 255, 0.95)', titleColor: '#000', bodyColor: '#444', borderColor: '#ddd', borderWidth: 1, padding: 10 },
                    datalabels: {
                        formatter: (value, context) => { if (context.datasetIndex < 2) return null; return value > 0 ? value.toLocaleString() : null; },
                        color: '#fff', anchor: 'center', align: 'center', font: { size: 10, weight: 'bold' }, textShadowBlur: 2, textShadowColor: 'rgba(0,0,0,0.5)'
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    // =================================================================
    // SECTION 8: CALENDAR & MODAL (ส่วนที่หายไป)
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
                if(props.planData) openFinancialDetail(props.planData);
            },
            
            dateClick: (info) => {
                const clickedDate = info.dateStr;
                const plansOnDate = currentPlanData.filter(p => p.plan_date === clickedDate);

                if (plansOnDate.length > 0) {
                    let totalPlanQty = 0;
                    let totalActualQty = 0;
                    let totalPlanSales = 0;
                    let totalPlanCost = 0;

                    plansOnDate.forEach(p => {
                        const planQty = parseFloat(p.adjusted_planned_quantity || 0);
                        const actualQty = parseFloat(p.actual_quantity || 0);
                        
                        const priceUSD = parseFloat(p.price_usd || 0);
                        const priceTHB = parseFloat(p.standard_price || 0);
                        const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
                        const unitCost = parseFloat(p.cost_total || 0);

                        totalPlanQty += planQty;
                        totalActualQty += actualQty;
                        totalPlanSales += (planQty * unitPrice);
                        totalPlanCost += (planQty * unitCost);
                    });

                    const avgPrice = totalPlanQty > 0 ? (totalPlanSales / totalPlanQty) : 0;
                    const avgCost = totalPlanQty > 0 ? (totalPlanCost / totalPlanQty) : 0;

                    const displayData = {
                        plan_date: clickedDate,
                        line: planLineFilter.value ? planLineFilter.value : 'Multiple Lines',
                        part_no: 'Daily Summary', 
                        part_description: `Aggregated ${plansOnDate.length} Items`,
                        adjusted_planned_quantity: totalPlanQty,
                        actual_quantity: totalActualQty,
                        price_usd: 0, 
                        standard_price: avgPrice,
                        cost_total: avgCost,
                        updated_at: plansOnDate[0].updated_at
                    };
                    openFinancialDetail(displayData);
                } else {
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
            datesSet: (dateInfo) => { if (calendarTitle) calendarTitle.textContent = dateInfo.view.title; }
        });
        fullCalendarInstance.render();
    }

    async function fetchCalendarEvents(fetchInfo, successCallback, failureCallback, todayString) {
        const startDate = fetchInfo.startStr.substring(0, 10);
        const endDate = fetchInfo.endStr.substring(0, 10);
        const params = { startDate, endDate, line: planLineFilter.value || null, limit: -1 };
        
        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if(result.success) {
                const events = [];
                const dailyStats = {}; 

                result.data.forEach(p => {
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

                    if (!dailyStats[p.plan_date]) dailyStats[p.plan_date] = { planRevenue: 0, actualRevenue: 0 };
                    const priceUSD = parseFloat(p.price_usd || 0);
                    const priceTHB = parseFloat(p.standard_price || 0);
                    const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
                    const planQty = parseFloat(p.adjusted_planned_quantity || 0);
                    const actualQty = parseFloat(p.actual_quantity || 0);
                    dailyStats[p.plan_date].planRevenue += (planQty * unitPrice);
                    dailyStats[p.plan_date].actualRevenue += (actualQty * unitPrice);
                });

                Object.keys(dailyStats).forEach(date => {
                    if (date < todayString) {
                        const stat = dailyStats[date];
                        const isTargetMet = (stat.actualRevenue >= stat.planRevenue) && (stat.planRevenue > 0);
                        const color = isTargetMet ? 'rgba(75, 192, 192, 0.4)' : 'rgba(255, 99, 132, 0.4)'; 
                        events.push({ start: date, end: date, display: 'background', backgroundColor: color, allDay: true });
                    }
                });
                successCallback(events);
            }
        } catch(e) { failureCallback(e); }
    }

    function initializeApp() {
        setAllDefaultDates();
        
        startDateFilter?.addEventListener('change', fetchPlans);
        endDateFilter?.addEventListener('change', fetchPlans);
        planShiftFilter?.addEventListener('change', fetchPlans);

        planLineFilter?.addEventListener('change', () => { fetchPlans(); fullCalendarInstance?.refetchEvents(); });
        btnRefreshPlan?.addEventListener('click', () => { fetchPlans(); fullCalendarInstance?.refetchEvents(); });
        
        document.getElementById('calendar-prev-button')?.addEventListener('click', () => fullCalendarInstance?.prev());
        document.getElementById('calendar-next-button')?.addEventListener('click', () => fullCalendarInstance?.next());
        document.getElementById('calendar-today-button')?.addEventListener('click', () => fullCalendarInstance?.today());
        
        document.getElementById('calendar-month-view-button')?.addEventListener('click', () => fullCalendarInstance?.changeView('dayGridMonth'));
        document.getElementById('calendar-week-view-button')?.addEventListener('click', () => fullCalendarInstance?.changeView('timeGridWeek'));

        document.querySelectorAll('input[name="chartViewMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentChartMode = e.target.value;
                if (currentPlanData) renderPlanVsActualChart(currentPlanData);
            });
        });

        btnCalculateCarryOver?.addEventListener('click', async () => {
            if(!confirm("Calculate Carry Over for selected period?")) return;
            try {
                const res = await sendRequest(PLAN_API, 'calculate_carry_over', 'GET'); 
                if(res.success) { showToast('Carry Over Updated', 'var(--bs-success)'); fetchPlans(); fullCalendarInstance?.refetchEvents(); }
            } catch(e) { showToast('Error calculating C/O', 'var(--bs-danger)'); }
        });

        if (btnImportPlan && importPlanInput) {
            btnImportPlan.addEventListener('click', () => {
                importPlanInput.click(); // กดปุ่ม -> ไปกด input file
            });
            
            importPlanInput.addEventListener('change', handleFileImport); // เลือกไฟล์เสร็จ -> รันฟังก์ชัน
        }

        btnAddPlan?.addEventListener('click', () => openPlanModal(null));

        fetchDashboardLines()
            .then(fetchAllItemsForPlanning)
            .then(() => { initializeCalendar(); fetchPlans(); });
    }

    initializeApp();
});