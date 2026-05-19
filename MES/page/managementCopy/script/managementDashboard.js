"use strict";

document.addEventListener('DOMContentLoaded', () => {
    let allPlanningItems = [];
    let currentPlanData = [];
    let selectedPlanItem = null;
    let currentChartMode = 'date'; 
    let planVsActualChartInstance = null;
    let fullCalendarInstance = null;
    let saveDebounceTimer;

    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const planLineFilter = document.getElementById('planLineFilter');
    const planShiftFilter = document.getElementById('planShiftFilter');
    const btnRefreshPlan = document.getElementById('btn-refresh-plan');
    const btnAddPlan = document.getElementById('btnAddPlan');
    const btnCalculateCarryOver = document.getElementById('btnCalculateCarryOver');
    const btnExportPlan = document.getElementById('btnExportPlan'); 
    const tableSearchInput = document.getElementById('tableSearchInput');
    const planVsActualChartCanvas = document.getElementById('planVsActualChart');
    const planningCalendarContainer = document.getElementById('planningCalendarContainer');
    const calendarTitle = document.getElementById('calendar-title');
    const productionPlanTableBody = document.getElementById('productionPlanTableBody');
    const chartDateDisplay = document.getElementById('chartDateDisplay'); 
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

    const THAI_MONTHS = {
        "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3, "พ.ค.": 4, "มิ.ย.": 5,
        "ก.ค.": 6, "ส.ค.": 7, "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11
    };

    const UNIVERSAL_MONTHS = {
        "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3, "พ.ค.": 4, "มิ.ย.": 5,
        "ก.ค.": 6, "ส.ค.": 7, "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11,
        "jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5,
        "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11
    };

    function parseFlexibleDateHeader(input, baseYear) {
        if (input === null || input === undefined || input === '') return null;
        if (typeof input === 'number' && input > 20000) {
            const dateInfo = new Date((input - (25567 + 2)) * 86400 * 1000); 
            const y = dateInfo.getFullYear();
            const m = String(dateInfo.getMonth() + 1).padStart(2, '0');
            const d = String(dateInfo.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        let cleanStr = String(input).trim();
        if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(cleanStr)) {
            try {
                const d = new Date(cleanStr);
                if (!isNaN(d.getTime())) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                }
            } catch (e) {}
        }
        try {
            cleanStr = cleanStr.toLowerCase();
            let parts = cleanStr.split(/[-/\s]+/); 
            if (parts.length < 2) parts = cleanStr.split(/[-/.\s]+/);
            if (parts.length < 2) return null;
            const day = parseInt(parts[0], 10);
            let monthStr = parts[1];
            let monthIndex = UNIVERSAL_MONTHS[monthStr]; 
            if (monthIndex === undefined && monthStr.endsWith('.')) {
                monthIndex = UNIVERSAL_MONTHS[monthStr.replace('.', '')];
            }
            if (monthIndex === undefined && !isNaN(monthStr)) {
                monthIndex = parseInt(monthStr) - 1;
            }
            if (isNaN(day) || monthIndex === undefined) return null;
            const d = new Date(baseYear, monthIndex, day);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dayStr}`;
        } catch (e) { return null; }
    }

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

    function formatDate(dateStr) {
        if (!dateStr || dateStr === '' || dateStr === '0000-00-00') {
            return '<span class="text-muted fw-light">-</span>'; 
        }
        let datePart = String(dateStr).split(' ')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts;
            return `${d}/${m}/${y}`;
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return new Intl.DateTimeFormat('en-GB').format(d);
    }

    function handleTableSearch(e) {
        const term = e.target.value.toLowerCase().trim();
        if (!currentPlanData || currentPlanData.length === 0) return;
        if (term === '') {
            renderPlanTable(currentPlanData);
            updateFooterSummaryClientSide(currentPlanData);
            return;
        }
        const filteredData = currentPlanData.filter(item => {
            const searchableStr = `
                ${item.sap_no || ''} 
                ${item.part_no || ''} 
                ${item.part_description || ''} 
                ${item.line || ''} 
                ${item.note || ''}
            `.toLowerCase();
            return searchableStr.includes(term);
        });
        renderPlanTable(filteredData);
        updateFooterSummaryClientSide(filteredData); 
    }

    window.exportToExcel = function() {
        if (!currentPlanData || currentPlanData.length === 0) {
            showToast('No data to export', 'var(--bs-warning)');
            return;
        }
        const startDate = new Date(startDateFilter.value);
        const endDate = new Date(endDateFilter.value);
        const dateList = [];
        let curr = new Date(startDate);
        while (curr <= endDate) {
            dateList.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }
        const thaiMonthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const headerRow = ['Item Code', 'Description']; 
        const dateKeys = []; 
        dateList.forEach(d => {
            const day = d.getDate();
            const monthName = thaiMonthNames[d.getMonth()];
            headerRow.push(`${day}-${monthName}`); 
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            dateKeys.push(`${y}-${m}-${da}`);
        });
        const linesMap = {};
        currentPlanData.forEach(p => {
            const lineName = p.line || 'Unknown Line';
            if (!linesMap[lineName]) linesMap[lineName] = [];
            linesMap[lineName].push(p);
        });
        const wb = XLSX.utils.book_new();
        Object.keys(linesMap).forEach(lineName => {
            const plans = linesMap[lineName];
            const itemMap = {}; 
            plans.forEach(p => {
                const itemKey = p.sap_no ? p.sap_no : p.part_no; 
                if (!itemKey) return;
                if (!itemMap[itemKey]) {
                    itemMap[itemKey] = {
                        code: itemKey,
                        desc: p.part_name || p.part_description || '', 
                        quantities: {}
                    };
                }
                const dateKey = p.plan_date; 
                const qty = parseFloat(p.original_planned_quantity || 0);
                if (!itemMap[itemKey].quantities[dateKey]) itemMap[itemKey].quantities[dateKey] = 0;
                itemMap[itemKey].quantities[dateKey] += qty;
            });
            const dataRows = [];
            Object.keys(itemMap).sort().forEach(key => {
                const item = itemMap[key];
                const row = [item.code, item.desc]; 
                dateKeys.forEach(dateKey => {
                    const qty = item.quantities[dateKey];
                    row.push(qty ? qty : ''); 
                });
                dataRows.push(row);
            });
            const wsData = [headerRow, ...dataRows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            let safeSheetName = lineName.replace(/[\\/?*[\]]/g, ' ').substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        });
        const filename = `Production_Plan_${startDateFilter.value}_to_${endDateFilter.value}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    async function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        event.target.value = ''; 
        const defaultShift = 'DAY'; 
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const allMappedPlans = [];
                const processedLines = [];
                const isDateHeader = (row) => {
                    if (!Array.isArray(row)) return false;
                    return row.some(cell => {
                        if (typeof cell === 'number' && cell > 35000) return true;
                        if (typeof cell === 'string') {
                            const val = cell.trim();
                            return /\d+[-/\s.]+[a-zA-Zก-๙]+/.test(val) || /^\d{4}[-/.]\d{1,2}/.test(val);
                        }
                        return false;
                    });
                };
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    if (rows.length < 2) return; 
                    let currentLine = sheetName.replace(/Plan\s+/i, '').trim();
                    const isGenericSheet = currentLine.toLowerCase().startsWith('sheet') || currentLine.toLowerCase() === 'csv';
                    if (isGenericSheet) {
                        const fileName = file.name; 
                        const cleanName = fileName.replace(/\.(csv|xlsx|xls)$/i, '');
                        let potentialLine = '';
                        const parenMatch = cleanName.match(/\(([^)]+)\)$/);
                        if (parenMatch && isNaN(parenMatch[1])) {
                            potentialLine = parenMatch[1].trim();
                        } else {
                            const parts = cleanName.split('-');
                            potentialLine = parts[parts.length - 1].trim();
                        }
                        if (potentialLine.length > 2 && !/^\d+$/.test(potentialLine)) { 
                            currentLine = potentialLine;
                        } else if (planLineFilter.value) {
                            currentLine = planLineFilter.value;
                        }
                    }
                    let dateHeaderRowIndex = -1;
                    const validDateMap = {}; 
                    const filterYear = new Date(startDateFilter.value).getFullYear(); 
                    let currentYear = filterYear;
                    let lastMonthIndex = -1;
                    for(let r=0; r<Math.min(rows.length, 10); r++) {
                        if (isDateHeader(rows[r])) { dateHeaderRowIndex = r; break; }
                    }
                    if (dateHeaderRowIndex === -1) return; 
                    const dateHeaders = rows[dateHeaderRowIndex];
                    dateHeaders.forEach((cell, index) => {
                        const parsedDate = parseFlexibleDateHeader(cell, currentYear);
                        if (parsedDate) {
                            if (/^\d{4}-/.test(parsedDate)) {
                                validDateMap[index] = parsedDate;
                                currentYear = parseInt(parsedDate.split('-')[0]);
                            } else {
                                const mStr = parsedDate.split('-')[1];
                                const mIndex = parseInt(mStr) - 1;
                                if (lastMonthIndex === 11 && mIndex === 0) {
                                    currentYear++;
                                    validDateMap[index] = parseFlexibleDateHeader(cell, currentYear);
                                } else {
                                    validDateMap[index] = parsedDate;
                                }
                                lastMonthIndex = mIndex;
                            }
                        }
                    });
                    let countInSheet = 0;
                    for (let i = dateHeaderRowIndex + 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.length === 0) continue;
                        const firstCol = row[0]; 
                        if (firstCol === undefined || firstCol === null) continue;
                        const itemCodeStr = String(firstCol).trim();
                        if (itemCodeStr === 'Date' || itemCodeStr.toLowerCase().includes('plan') || itemCodeStr === 'Item Code') continue;
                        Object.keys(validDateMap).forEach(colIndex => {
                            const qty = row[colIndex];
                            if (qty && !isNaN(qty) && parseFloat(qty) > 0) {
                                allMappedPlans.push({
                                    date: validDateMap[colIndex],
                                    line: currentLine,   
                                    shift: defaultShift,
                                    item_code: itemCodeStr,
                                    qty: parseFloat(qty),
                                    note: `Imported File`
                                });
                                countInSheet++;
                            }
                        });
                    }
                    if (countInSheet > 0) processedLines.push(currentLine);
                });
                if (allMappedPlans.length === 0) {
                    showToast('ไม่พบข้อมูลแผนผลิต (ตรวจสอบรูปแบบวันที่ในไฟล์)', 'var(--bs-warning)');
                    return;
                }
                const uniqueLines = [...new Set(processedLines)].join(', ');
                if(!confirm(`พบข้อมูลแผนผลิต: ${allMappedPlans.length} รายการ\nLines: ${uniqueLines}\nยืนยันการนำเข้า?`)) return;
                showSpinner();
                const res = await sendRequest(PLAN_API, 'import_plans_bulk', 'POST', { plans: allMappedPlans });
                if (res.success) {
                    showToast(`${res.message}`, 'var(--bs-success)');
                    try {
                        const coRes = await sendRequest(PLAN_API, 'calculate_carry_over', 'GET');
                        if(coRes.success) showToast('Carry Over Updated Automatically!', 'var(--bs-success)');
                    } catch(e) { console.error(e); }
                    fetchPlans(); 
                    if(fullCalendarInstance) fullCalendarInstance.refetchEvents();
                } else {
                    alert("Import Error:\n" + res.message);
                }
            } catch (err) {
                showToast('Error processing file: ' + err.message, 'var(--bs-danger)');
            } finally {
                hideSpinner();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function setAllDefaultDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        if(startDateFilter) startDateFilter.value = formatDateForInput(firstDay);
        if(endDateFilter) endDateFilter.value = formatDateForInput(lastDay);
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

    async function fetchPlans() {
        showSpinner();
        productionPlanTableBody.innerHTML = `<tr><td colspan="12" class="text-center py-5 text-muted">Loading data...</td></tr>`;
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
                productionPlanTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-muted py-5">No plans found.</td></tr>`;
                renderPlanVsActualChart([]); 
            }
        } catch (error) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-danger py-5">Error loading data.</td></tr>`;
            console.error(error);
        } finally {
            hideSpinner();
        }
    }

    function updateFooterSummaryClientSide(data) {
        let totalOriginal = 0;
        let totalActual = 0;
        let totalEstSale = 0; 
        let totalActualSale = 0; 
        const latestItemStatus = {}; 
        data.forEach(p => {
            const original = parseFloat(p.original_planned_quantity || 0);
            const co = parseFloat(p.carry_over_quantity || 0);
            const adjusted = original + co; 
            const act = parseFloat(p.actual_quantity || 0);
            const priceUSD = parseFloat(p.price_usd || 0);
            const priceTHB = parseFloat(p.standard_price || 0);
            let unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
            totalOriginal += original;
            totalActual += act;
            totalEstSale += (original * unitPrice); 
            totalActualSale += (act * unitPrice);
            if (!latestItemStatus[p.item_id] || p.plan_date >= latestItemStatus[p.item_id].date) {
                latestItemStatus[p.item_id] = { date: p.plan_date, balance: adjusted - act };
            }
        });
        let totalBacklog = 0;
        Object.values(latestItemStatus).forEach(status => { totalBacklog += status.balance; });
        document.getElementById('footer-total-qty').innerText = totalOriginal.toLocaleString();
        document.getElementById('footer-total-actual').innerText = totalActual.toLocaleString();
        document.getElementById('footer-total-sale').innerText = formatCurrency(totalEstSale);
        document.getElementById('footer-total-actual-sale').innerText = formatCurrency(totalActualSale);
        const backlogEl = document.getElementById('footer-total-backlog');
        if(backlogEl) {
            backlogEl.innerText = totalBacklog.toLocaleString();
            backlogEl.style.color = totalBacklog > 0 ? '#fd7e14' : '#198754';
        }
        const totalDiff = totalActualSale - totalEstSale;
        const diffFooterEl = document.getElementById('footer-total-diff-sale');
        if (diffFooterEl) {
            diffFooterEl.innerText = (totalDiff > 0 ? '+' : '') + formatCurrency(totalDiff);
            diffFooterEl.className = 'footer-value fw-bold ' + (totalDiff >= 0 ? 'text-success' : 'text-danger');
        }
    }

    function renderPlanTable(data) {
        const tbody = document.getElementById('productionPlanTableBody');
        if (!tbody) return;

        const isDailyView = document.getElementById('toggleDailyView')?.checked;
        let displayData = data;

        if (isDailyView) {
            const groupedObj = {};
            data.forEach(row => {
                const key = `${row.plan_date}_${row.line}_${row.item_id}`;
                if (!groupedObj[key]) {
                    groupedObj[key] = { ...row };
                    groupedObj[key].shift = 'ALL'; 
                    groupedObj[key].original_planned_quantity = parseFloat(row.original_planned_quantity || 0);
                    groupedObj[key].carry_over_quantity = parseFloat(row.carry_over_quantity || 0);
                    groupedObj[key].actual_quantity = parseFloat(row.actual_quantity || 0);
                    groupedObj[key].ot_hours = parseFloat(row.ot_hours || 0);
                } else {
                    groupedObj[key].original_planned_quantity += parseFloat(row.original_planned_quantity || 0);
                    groupedObj[key].carry_over_quantity += parseFloat(row.carry_over_quantity || 0);
                    groupedObj[key].actual_quantity += parseFloat(row.actual_quantity || 0);
                    groupedObj[key].ot_hours += parseFloat(row.ot_hours || 0);
                    if (row.note && !groupedObj[key].note.includes(row.note)) {
                        groupedObj[key].note += (groupedObj[key].note ? ' | ' : '') + row.note;
                    }
                }
            });
            displayData = Object.values(groupedObj);
        }

        displayData.sort((a, b) => {
            if (a.plan_date !== b.plan_date) return a.plan_date > b.plan_date ? 1 : -1;
            if (a.line !== b.line) return a.line > b.line ? 1 : -1;
            return a.shift > b.shift ? 1 : -1;
        });

        if (displayData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="13" class="text-center py-4 text-muted">ไม่พบข้อมูลแผนการผลิต</td></tr>`;
            return;
        }

        tbody.innerHTML = displayData.map((row) => {
            const plan = parseFloat(row.original_planned_quantity || 0);
            const co = parseFloat(row.carry_over_quantity || 0);
            const target = plan + co;
            const actual = parseFloat(row.actual_quantity || 0);
            const ot = parseFloat(row.ot_hours || 0);

            const priceUSD = parseFloat(row.price_usd || 0);
            const priceTHB = parseFloat(row.standard_price || 0);
            const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;

            const estSales = target * unitPrice;
            const actSales = actual * unitPrice;
            const diffSales = actSales - estSales;

            const diffClass = diffSales >= 0 ? 'text-success' : 'text-danger';
            const diffText = (diffSales > 0 ? '+' : '') + formatCurrency(diffSales);

            let actualClass = 'text-dark';
            if (target > 0) {
                if (actual >= target) actualClass = 'text-success fw-bold';
                else if (actual > 0) actualClass = 'text-primary';
            }

            const editableAttr = isDailyView ? '' : 'contenteditable="true"';
            const editableClass = isDailyView ? '' : 'editable-plan';
            const rowDataJson = JSON.stringify(row).replace(/'/g, "&apos;");

            return `
                <tr data-plan-data='${rowDataJson}'>
                    <td class="text-center">${formatDate(row.plan_date)}</td>
                    <td class="text-center fw-bold">${row.line || '-'}</td>
                    <td class="text-center ${isDailyView ? 'text-primary fw-bold' : ''}">
                        ${isDailyView ? '<i class="fas fa-compress-arrows-alt me-1"></i>ALL' : (row.shift || '-')}
                    </td>
                    <td>
                        <div class="fw-bold text-primary">${row.sap_no || row.part_no || '-'}</div>
                        <div class="small text-muted text-truncate" style="max-width: 200px;" title="${row.part_description || ''}">
                            ${row.part_description || ''}
                        </div>
                    </td>
                    <td class="text-end fw-bold text-primary bg-primary bg-opacity-10 ${editableClass}" data-id="${row.plan_id}" data-field="original_plan" ${editableAttr} style="${isDailyView ? 'cursor: not-allowed; opacity:0.8;' : 'cursor: text;'}">
                        ${plan.toLocaleString()}
                    </td>
                    <td class="text-end text-warning bg-warning bg-opacity-10 ${editableClass}" data-id="${row.plan_id}" data-field="carry_over" ${editableAttr} style="${isDailyView ? 'cursor: not-allowed; opacity:0.8;' : 'cursor: text;'}">
                        ${co.toLocaleString()}
                    </td>
                    <td class="text-end fw-bold bg-light" data-field="adjusted_plan">${target.toLocaleString()}</td>
                    <td class="text-end ${actualClass}" data-field="actual_quantity">${actual.toLocaleString()}</td>
                    <td class="text-center text-warning ${editableClass}" data-id="${row.plan_id}" data-field="ot_hours" ${editableAttr} style="${isDailyView ? 'cursor: not-allowed;' : 'cursor: text;'}">
                        ${ot > 0 ? ot.toFixed(1) : '-'}
                    </td>
                    <td class="text-end text-secondary">${formatCurrency(estSales)}</td>
                    <td class="text-end text-success fw-bold">${formatCurrency(actSales)}</td>
                    <td class="text-end fw-bold ${diffClass}" data-field="diff_money">${diffText}</td>
                    <td class="text-start ${editableClass}" data-id="${row.plan_id}" data-field="note" ${editableAttr} style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${isDailyView ? 'cursor: not-allowed;' : 'cursor: text;'}" title="${row.note || ''}">
                        ${row.note || (isDailyView ? '' : '...')}
                    </td>
                </tr>
            `;
        }).join('');
    }

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
            if (s === 'DAY') document.getElementById('shiftDay').checked = true;
            else document.getElementById('shiftNight').checked = true;
            if (planModalItemId) planModalItemId.value = data.item_id;
            if (planModalItemSearch) {
                planModalItemSearch.value = `${data.sap_no} / ${data.part_no}`;
                planModalItemSearch.classList.add('is-valid');
                planModalItemSearch.disabled = true; 
                planModalItemSearch.style.backgroundColor = '#e9ecef';
            }
            if (planModalSelectedItem) planModalSelectedItem.textContent = data.part_description;
            if (document.getElementById('selectedItemContainer')) document.getElementById('selectedItemContainer').classList.remove('d-none');
            if (deletePlanButton) deletePlanButton.style.display = 'inline-block';
        } else {
            if (planModalLabel) planModalLabel.innerHTML = 'เพิ่มแผนการผลิตใหม่ (Add New Plan)';
            if (deletePlanButton) deletePlanButton.style.display = 'none';
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
            planModalItemSearch.disabled = false;
            planModalItemSearch.style.backgroundColor = '';
        }
        if (planModalDate && endDateFilter) planModalDate.value = endDateFilter.value || new Date().toISOString().split('T')[0];
        if (planModalLine && planLineFilter) planModalLine.value = planLineFilter.value || "";
        const shiftDayBtn = document.getElementById('shiftDay');
        if (shiftDayBtn) shiftDayBtn.checked = true;
    }

    function openFinancialDetail(data) {
        if (!dlotModal) return;
        let planQty = parseFloat(data.adjusted_planned_quantity || 0);
        if (planQty === 0) {
            const original = parseFloat(data.original_planned_quantity || 0);
            const carryOver = parseFloat(data.carry_over_quantity || 0);
            if (original !== 0 || carryOver !== 0) {
                planQty = original + carryOver;
            }
        }
        const actualQty = parseFloat(data.actual_quantity || 0);
        const priceUSD = parseFloat(data.price_usd || 0);
        const priceTHB = parseFloat(data.standard_price || 0);
        const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
        const planSales = planQty * unitPrice;
        const actualSales = actualQty * unitPrice;
        const diffSales = actualSales - planSales; 
        let dateStr = '-';
        if (data.plan_date) {
            const dateObj = new Date(data.plan_date);
            if (!isNaN(dateObj)) {
                dateStr = dateObj.toLocaleDateString('en-GB');
            } else {
                dateStr = data.plan_date;
            }
        }
        document.getElementById('financialModalSubtitle').textContent = `${dateStr} | ${data.line || '-'} | ${data.part_no || '-'}`;
        const titleLabel = document.querySelector('#dlotModal .text-uppercase');
        if(titleLabel) titleLabel.textContent = 'Sales Difference (Act vs Target)';
        const diffEl = document.getElementById('finActualProfit'); 
        diffEl.textContent = (diffSales > 0 ? '+' : '') + formatCurrency(diffSales);
        diffEl.className = 'fw-bold mb-0 ' + (diffSales >= 0 ? 'text-success' : 'text-danger');
        document.getElementById('finPlanProfitCompare').textContent = `Target Sales: ${formatCurrency(planSales)}`;
        document.getElementById('finPlanQty').textContent = planQty.toLocaleString();
        document.getElementById('finActualQty').textContent = actualQty.toLocaleString();
        document.getElementById('finPlanSales').textContent = formatCurrency(planSales);
        document.getElementById('finActualSales').textContent = formatCurrency(actualSales);
        const costLabel = document.querySelector('#dlotModal tbody tr:last-child td:first-child');
        if(costLabel) costLabel.textContent = 'Difference';
        const planCostEl = document.getElementById('finPlanCost');
        if(planCostEl) planCostEl.textContent = '-'; 
        const actCostEl = document.getElementById('finActualCost');
        if(actCostEl) {
            actCostEl.textContent = (diffSales > 0 ? '+' : '') + formatCurrency(diffSales);
            actCostEl.className = 'text-end pe-3 fw-bold ' + (diffSales >= 0 ? 'text-success' : 'text-danger');
        }
        let progress = 0;
        if (planSales > 0) {
            progress = (actualSales / planSales) * 100;
        } else if (planSales <= 0 && actualSales > 0) {
            progress = 100; 
        } else {
            progress = 0;
        }
        progress = Math.min(progress, 100);
        document.getElementById('finProgressText').textContent = progress.toFixed(1) + '%';
        const barEl = document.getElementById('finProgressBar');
        barEl.style.width = progress + '%';
        if (progress < 50) barEl.className = 'progress-bar bg-danger';
        else if (progress < 100) barEl.className = 'progress-bar bg-warning';
        else barEl.className = 'progress-bar bg-success';
        document.getElementById('finUnitPrice').textContent = formatCurrency(unitPrice);
        document.getElementById('finUnitCost').textContent = data.part_description || '-';
        dlotModal.show();
    }

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

    function updateRowCalculationUI(row, field, newVal) {
        const data = JSON.parse(row.dataset.planData);
        let plan = parseFloat(data.original_planned_quantity || 0);
        let co = parseFloat(data.carry_over_quantity || 0);
        if (field === 'original_plan') plan = newVal;
        if (field === 'carry_over') co = newVal;
        const newTarget = plan + co;
        const targetEl = row.querySelector('[data-field="adjusted_plan"]');
        if (targetEl) targetEl.innerText = newTarget.toLocaleString();
        const priceUSD = parseFloat(data.price_usd || 0);
        const priceTHB = parseFloat(data.standard_price || 0);
        const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
        const newTotalSale = newTarget * unitPrice;
        if (row.children[8]) row.children[8].innerText = formatCurrency(newTotalSale);
        const actualQty = parseFloat(data.actual_quantity || 0);
        const actualSale = actualQty * unitPrice;
        const newDiffMoney = actualSale - newTotalSale;
        const diffEl = row.querySelector('[data-field="diff_money"]');
        if (diffEl) {
            if (newTarget === 0 && actualQty === 0) {
                diffEl.className = 'text-end text-muted';
                diffEl.innerText = '-';
            } else if (newDiffMoney >= 0) {
                diffEl.className = 'text-end text-success fw-bold';
                diffEl.innerText = (newDiffMoney > 0 ? '+' : '') + formatCurrency(newDiffMoney);
            } else {
                diffEl.className = 'text-end text-danger fw-bold';
                diffEl.innerText = formatCurrency(newDiffMoney);
            }
        }
        const actualEl = row.querySelector('[data-field="actual_quantity"]');
        if (actualEl) {
            actualEl.className = 'text-end';
            if (newTarget > 0) {
                if (actualQty >= newTarget) actualEl.classList.add('text-success', 'fw-bold');
                else if (actualQty > 0) actualEl.classList.add('text-primary');
                else actualEl.classList.add('text-dark');
            } else {
                actualEl.classList.add('text-dark');
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

    const apsModalEl = document.getElementById('autoPlanModal');
    const apsModal = apsModalEl ? new bootstrap.Modal(apsModalEl) : null;
    document.querySelectorAll('input[name="apsFilterType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'DATE') {
                document.getElementById('zoneDateFilter').classList.remove('d-none');
                document.getElementById('zoneWeekFilter').classList.add('d-none');
            } else {
                document.getElementById('zoneDateFilter').classList.add('d-none');
                document.getElementById('zoneWeekFilter').classList.remove('d-none');
            }
        });
    });

    if (apsModalEl) {
        document.getElementById('apsRangeMode').addEventListener('change', function() {
            const endInput = document.getElementById('apsPlanEnd');
            if (this.value === 'CLOSED') {
                endInput.disabled = false;
                endInput.classList.remove('bg-light');
                endInput.required = true;
            } else {
                endInput.disabled = true;
                endInput.classList.add('bg-light');
                endInput.value = '';
                endInput.required = false;
            }
        });

        document.getElementById('btnExecuteAps').addEventListener('click', async function() {
            const filterType = document.querySelector('input[name="apsFilterType"]:checked').value;
            const soStart = document.getElementById('apsSoStart').value;
            const soEnd = document.getElementById('apsSoEnd').value;
            const weekStart = document.getElementById('apsWeekStart').value;
            const weekEnd = document.getElementById('apsWeekEnd').value;
            const pStart = document.getElementById('apsPlanStart').value;
            const pMode = document.getElementById('apsRangeMode').value;
            const pEnd = document.getElementById('apsPlanEnd').value;

            if (filterType === 'DATE' && (!soStart || !soEnd)) {
                showToast('กรุณาระบุวันที่ SO ให้ครบถ้วน', 'var(--bs-danger)');
                return;
            }
            if (filterType === 'WEEK' && (!weekStart || !weekEnd)) {
                showToast('กรุณาระบุ Shipping Week ให้ครบถ้วน (ตัวอย่าง 9.26)', 'var(--bs-danger)');
                return;
            }
            if (!pStart) {
                showToast('กรุณาระบุวันที่เริ่มจัดแผน', 'var(--bs-danger)');
                return;
            }
            if (pMode === 'CLOSED' && !pEnd) {
                showToast('โหมด Timebox จำเป็นต้องระบุวันสิ้นสุด (Cut-off)', 'var(--bs-danger)');
                return;
            }

            // 🔴 [NEW] ดึงค่าจาก Checkbox ว่าเลือกวันไหนบ้าง (คั่นด้วยลูกน้ำ)
            const allowedOTDays = Array.from(document.querySelectorAll('.aps-ot-day:checked'))
                                       .map(cb => cb.value)
                                       .join(',');

            // ถ้ามี OT แต่ไม่ได้เลือกวันเลย ให้เตือน
            if (parseFloat(document.getElementById('apsOtHours').value) > 0 && allowedOTDays === '') {
                showToast('คุณระบุชั่วโมง OT แต่ไม่ได้เลือกวันที่อนุญาตให้ทำ OT!', 'var(--bs-danger)');
                return;
            }

            const payload = {
                filterType: filterType,
                startDate: filterType === 'DATE' ? soStart : null,
                endDate: filterType === 'DATE' ? soEnd : null,
                startWeek: filterType === 'WEEK' ? weekStart : null,
                endWeek: filterType === 'WEEK' ? weekEnd : null,
                planStartDate: pStart,
                planEndDate: pEnd || null,
                planRangeMode: pMode,
                shiftMode: document.getElementById('apsShiftMode').value,
                setupTime: document.getElementById('apsSetupTime').value,
                otHours: document.getElementById('apsOtHours').value,
                allowedOTDays: allowedOTDays, // 🔴 [NEW] ส่งตัวแปรไปยัง Backend
                overwrite: document.getElementById('apsOverwrite').checked,
                workOnSunday: document.getElementById('apsWorkOnSunday').checked ? 1 : 0
            };

            await executeAutoPlan(payload, this);
        });
    }

    window.openAutoPlanWizard = function() {
        if (!apsModal) return;
        document.getElementById('apsSoStart').value = startDateFilter.value;
        document.getElementById('apsSoEnd').value = endDateFilter.value;
        document.getElementById('apsPlanStart').value = new Date().toISOString().split('T')[0];
        document.getElementById('apsOverwrite').checked = false;
        document.getElementById('apsOtHours').value = '0';
        
        // บังคับให้หน้าต่างกลับมาแสดงแท็บ Week เป็นค่าเริ่มต้นเสมอเมื่อเปิดใหม่
        document.getElementById('filterTypeWeek').checked = true;
        document.getElementById('zoneDateFilter').classList.add('d-none');
        document.getElementById('zoneWeekFilter').classList.remove('d-none');
        
        apsModal.show();
    };

    window.clearAllPlans = async function() {
        const result = await Swal.fire({
            title: 'ยืนยันการล้างข้อมูล?',
            text: "ข้อมูลแผนการผลิตทั้งหมดในโหมด Sandbox จะถูกลบออกถาวร! (ไม่กระทบข้อมูลจริง)",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ใช่, ลบทั้งหมด',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            showSpinner();
            try {
                const res = await sendRequest(PLAN_API, 'clear_all_plans', 'POST');
                if (res.success) {
                    await Swal.fire({
                        title: 'สำเร็จ!',
                        text: res.message,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    if (typeof fetchPlans === 'function') fetchPlans();
                    if (fullCalendarInstance) fullCalendarInstance.refetchEvents();
                } else {
                    throw new Error(res.message);
                }
            } catch (error) {
                console.error("Clear All Error:", error);
                Swal.fire('ข้อผิดพลาด', error.message || 'ไม่สามารถลบข้อมูลได้', 'error');
            } finally {
                hideSpinner();
            }
        }
    };

    async function executeAutoPlan(payload, btnElement) {
        const originalBtnText = btnElement.innerHTML;
        btnElement.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>กำลังประมวลผล...`;
        btnElement.disabled = true;

        try {
            const res = await sendRequest(PLAN_API, 'auto_create_plan', 'POST', payload);
            if (res.success) {
                apsModal.hide();
                const hasUnplanned = res.unplanned_qty && res.unplanned_qty > 0;
                let alertHtml = res.message;
                let hasDelay = false;

                // --- ส่วนที่ 1: สรุปออเดอร์ตกแผน (Delayed Details) ---
                if (res.delayed_details_json && res.delayed_details_json !== '[]') {
                    try {
                        const delayedItems = JSON.parse(res.delayed_details_json);
                        if (delayedItems.length > 0) {
                            hasDelay = true;
                            const totalQty = delayedItems.reduce((sum, item) => sum + Number(item.DelayedQty), 0);
                            const totalHours = delayedItems.reduce((sum, item) => sum + Number(item.ExtraHoursNeeded), 0);
                            const uniquePOs = new Set(delayedItems.map(item => item.po_number)).size;

                            let tableHtml = `
                                <div class="alert alert-warning border-warning bg-warning bg-opacity-10 mb-3 text-start px-3 py-2">
                                    <div class="fw-bold text-dark mb-1" style="font-size: 0.95rem;">
                                        <i class="fas fa-exclamation-circle text-warning me-2"></i>สรุปรายการที่จัดลงแผนไม่ทัน
                                    </div>
                                    <div class="row g-2 small text-dark">
                                        <div class="col-4"><strong>ออเดอร์รวม:</strong> ${uniquePOs} POs</div>
                                        <div class="col-4"><strong>ยอดช้าสะสม:</strong> ${totalQty.toLocaleString()} pcs</div>
                                        <div class="col-4 text-danger"><strong>OT ที่ต้องการ:</strong> ${totalHours.toFixed(2)} ชม.</div>
                                    </div>
                                </div>
                                <div class="table-responsive" style="max-height: 300px; border: 1px solid #dee2e6; border-radius: 0.375rem;">
                                    <table class="table table-sm table-hover align-middle mb-0 text-start" style="font-size: 0.85rem;">
                                        <thead class="table-light sticky-top" style="z-index: 2;">
                                            <tr>
                                                <th class="ps-3">PO Number</th>
                                                <th class="text-center">% ช้า</th>
                                                <th class="text-end">ยอด Delay</th>
                                                <th class="text-end pe-3">ต้องการเวลาเพิ่ม</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                            `;

                            const groupedByWeek = delayedItems.reduce((acc, item) => {
                                if (!acc[item.target_week]) acc[item.target_week] = { items: [], subQty: 0, subHours: 0 };
                                acc[item.target_week].items.push(item);
                                acc[item.target_week].subQty += Number(item.DelayedQty);
                                acc[item.target_week].subHours += Number(item.ExtraHoursNeeded);
                                return acc;
                            }, {});

                            Object.keys(groupedByWeek).sort().forEach(week => {
                                const group = groupedByWeek[week];
                                tableHtml += `
                                    <tr class="table-secondary bg-opacity-50">
                                        <td colspan="2" class="fw-bold text-dark ps-3"><i class="fas fa-calendar-week text-muted me-1"></i> Week: ${week}</td>
                                        <td class="text-end fw-bold text-dark">${group.subQty.toLocaleString()} pcs</td>
                                        <td class="text-end fw-bold text-danger pe-3">${group.subHours.toFixed(2)} ชม.</td>
                                    </tr>
                                `;
                                group.items.forEach(item => {
                                    tableHtml += `
                                        <tr>
                                            <td class="ps-4 text-muted">${item.po_number}</td>
                                            <td class="text-center text-danger" style="font-size: 0.75rem;">${item.DelayedPercent}%</td>
                                            <td class="text-end">${Number(item.DelayedQty).toLocaleString()}</td>
                                            <td class="text-end text-danger pe-3">${Number(item.ExtraHoursNeeded).toFixed(2)} ชม.</td>
                                        </tr>
                                    `;
                                });
                            });
                            tableHtml += `</tbody></table></div>`;
                            alertHtml += tableHtml; 
                        }
                    } catch (e) { console.error('Error parsing delayed JSON:', e); }
                }

                // --- ส่วนที่ 2: สรุป OT (ถ้ามีการอนุมัติ OT) ---
                if (res.ot_summary_json && res.ot_summary_json !== '[]') {
                    try {
                        const otItems = JSON.parse(res.ot_summary_json);
                        if (otItems.length > 0) {
                            let otHtml = `
                                <div class="mt-4 text-start">
                                    <h6 class="text-success fw-bold"><i class="fas fa-clock me-1"></i> สรุปการอนุมัติ Smart OT (รายวัน)</h6>
                                </div>
                                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 0.375rem;">
                                    <table class="table table-sm table-hover mb-0 text-start" style="font-size: 0.85rem;">
                                        <thead class="table-success" style="position: sticky; top: 0; z-index: 2;">
                                            <tr>
                                                <th class="ps-3">วันที่ระบบเปิด OT ให้</th>
                                                <th class="text-end pe-3">ชั่วโมง OT / กะ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                            `;
                            otItems.forEach(item => {
                                otHtml += `
                                    <tr>
                                        <td class="ps-3 fw-bold text-dark"><i class="far fa-calendar-check text-success me-2"></i> ${item.plan_date}</td>
                                        <td class="text-end text-success fw-bold pe-3">+${Number(item.ot_hours).toFixed(2)} ชม.</td>
                                    </tr>
                                `;
                            });
                            otHtml += `</tbody></table></div>`;
                            alertHtml += otHtml;
                        }
                    } catch (e) { console.error('Error parsing OT JSON:', e); }
                }

                // --- ส่วนที่ 3: แสดง Popup (ทำแค่ครั้งเดียว) ---
                const showOtTable = (res.ot_summary_json && res.ot_summary_json !== '[]');
                const swalResult = await Swal.fire({
                    title: (hasUnplanned || hasDelay) ? 'APS จัดแผนเสร็จสิ้น (พบประเด็น)' : 'APS จัดแผนสำเร็จ!',
                    html: alertHtml, 
                    icon: (hasUnplanned || hasDelay) ? 'warning' : 'success',
                    width: (hasDelay || showOtTable) ? '750px' : undefined,
                    showConfirmButton: true,
                    showDenyButton: hasDelay,
                    confirmButtonText: (hasUnplanned || hasDelay) ? 'ใช้แผนนี้' : 'ตกลง',
                    denyButtonText: '<i class="fas fa-magic"></i> Auto-Fix',
                    confirmButtonColor: (hasUnplanned || hasDelay) ? '#6c757d' : '#28a745',
                    denyButtonColor: '#0dcaf0',
                    allowOutsideClick: false
                });

                // --- ส่วนที่ 4: การตั้งค่า Auto-Fix (Smart OT) ---
                if (swalResult.isDenied) {
                    const delayedItems = JSON.parse(res.delayed_details_json);
                    const neededHours = delayedItems.reduce((sum, item) => sum + Number(item.ExtraHoursNeeded), 0);
                    const defaultOtBudget = Math.ceil(neededHours);

                    const { value: formValues } = await Swal.fire({
                        title: 'ตั้งค่า Smart OT (แบบกำหนดเอง)',
                        html: `
                            <div class="text-start" style="font-size: 0.95rem;">
                                <div class="alert alert-warning py-2 mb-3">
                                    <i class="fas fa-info-circle"></i> ระบบประเมินว่าต้องใช้ OT รวม <b>${neededHours.toFixed(1)} ชม.</b> เพื่อเคลียร์ของที่ช้าทั้งหมด
                                </div>
                                <label class="fw-bold text-primary mb-1">1. ให้ทำ OT วันละกี่ชั่วโมง? (ต่อกะ)</label>
                                <input type="number" id="swalOtPerDay" class="form-control mb-3" value="2.5" step="0.5" min="0.5">
                                
                                <label class="fw-bold text-primary mb-1">2. เลือกวันที่อนุญาตให้ทำ OT</label>
                                <div class="d-flex flex-wrap gap-2 mb-3">
                                    <div class="form-check"><input type="checkbox" class="form-check-input ot-day-cb" value="1" id="cb-mon" checked><label class="form-check-label" for="cb-mon">จ.</label></div>
                                    <div class="form-check"><input type="checkbox" class="form-check-input ot-day-cb" value="2" id="cb-tue" checked><label class="form-check-label" for="cb-tue">อ.</label></div>
                                    <div class="form-check"><input type="checkbox" class="form-check-input ot-day-cb" value="3" id="cb-wed" checked><label class="form-check-label" for="cb-wed">พ.</label></div>
                                    <div class="form-check"><input type="checkbox" class="form-check-input ot-day-cb" value="4" id="cb-thu" checked><label class="form-check-label" for="cb-thu">พฤ.</label></div>
                                    <div class="form-check"><input type="checkbox" class="form-check-input ot-day-cb" value="5" id="cb-fri" checked><label class="form-check-label" for="cb-fri">ศ.</label></div>
                                    <div class="form-check"><input type="checkbox" class="form-check-input ot-day-cb" value="6" id="cb-sat"><label class="form-check-label text-danger" for="cb-sat">ส.</label></div>
                                    <div class="form-check"><input type="checkbox" class="form-check-input ot-day-cb" value="7" id="cb-sun"><label class="form-check-label text-danger" for="cb-sun">อา.</label></div>
                                </div>

                                <label class="fw-bold text-danger mb-1">3. งบประมาณ OT สูงสุด (ชั่วโมง)</label>
                                <input type="number" id="swalOtBudget" class="form-control" value="${defaultOtBudget}" step="1" min="1">
                                <small class="text-muted mt-1 d-block">
                                    * เมื่อหัก OT ครบตามงบประมาณนี้ ระบบจะหยุดแทรก OT โดยอัตโนมัติ
                                </small>
                            </div>
                        `,
                        focusConfirm: false,
                        showCancelButton: true,
                        confirmButtonText: 'เริ่มจัดแผนใหม่ <i class="fas fa-play ms-1"></i>',
                        cancelButtonText: 'ยกเลิก',
                        confirmButtonColor: '#0dcaf0',
                        preConfirm: () => {
                            const otPerDay = document.getElementById('swalOtPerDay').value;
                            const otBudget = document.getElementById('swalOtBudget').value;
                            const otDays = Array.from(document.querySelectorAll('.ot-day-cb:checked')).map(cb => cb.value).join(',');
                            
                            if (!otPerDay || !otBudget) {
                                Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                                return false;
                            }
                            if (otDays === '') {
                                Swal.showValidationMessage('กรุณาเลือกวันทำ OT อย่างน้อย 1 วัน');
                                return false;
                            }
                            return { otPerDay: parseFloat(otPerDay), otBudget: parseFloat(otBudget), otDays: otDays };
                        }
                    });

                    if (formValues) {
                        const newPayload = { 
                            ...payload, 
                            otHours: formValues.otPerDay, 
                            totalOTBudget: formValues.otBudget,
                            allowedOTDays: formValues.otDays,
                            overwrite: true 
                        };
                        await executeAutoPlan(newPayload, btnElement); 
                        return; // ยกเลิกการรันโค้ดด้านล่างเพื่อไม่ให้อัปเดตซ้ำซ้อน
                    }
                }
                
                // ถ้ายืนยันใช้แผน หรือยกเลิก Auto-Fix ให้ดึงข้อมูลตารางใหม่
                fetchPlans(); 
                if (fullCalendarInstance) fullCalendarInstance.refetchEvents();
            } else {
                throw new Error(res.message || 'Unknown error');
            }
        } catch (error) {
            console.error("APS Error:", error);
            Swal.fire('ข้อผิดพลาด', error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        } finally {
            btnElement.innerHTML = originalBtnText;
            btnElement.disabled = false;
        }
    }

    function renderPlanVsActualChart(planData) {
        if (currentChartMode === 'date') renderDailyTrendChart(planData);
        else if (currentChartMode === 'money') renderFinancialTrendChart(planData);
        else renderItemChart(planData);
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
            dateMap[dStr] = { date: dStr, originalRev: 0, carryOverRev: 0, actualRev: 0 };
            curr.setDate(curr.getDate() + 1);
        }

        planData.forEach(p => {
            const d = p.plan_date;
            if (dateMap[d]) {
                const priceUSD = parseFloat(p.price_usd || 0);
                const priceTHB = parseFloat(p.standard_price || 0);
                const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
                
                const originalQty = parseFloat(p.original_planned_quantity || 0);
                const carryOverQty = parseFloat(p.carry_over_quantity || 0);
                const actQty = parseFloat(p.actual_quantity || 0);

                dateMap[d].originalRev += (originalQty * unitPrice);
                dateMap[d].actualRev += (actQty * unitPrice);
                if (p.shift === 'DAY') {
                    dateMap[d].carryOverRev += (carryOverQty * unitPrice);
                }
            }
        });

        const sortedDates = Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));
        chartWrapper.style.width = '100%';
        chartWrapper.style.height = '100%';

        const labels = sortedDates.map(d => {
            const dateObj = new Date(d.date);
            return `${dateObj.getDate()}/${dateObj.getMonth()+1}`;
        });
        
        const originalRevData = sortedDates.map(d => d.originalRev);
        const carryOverRevData = sortedDates.map(d => d.carryOverRev);
        const actualRevData = sortedDates.map(d => d.actualRev);
        const totalTargetRevData = sortedDates.map(d => d.originalRev + d.carryOverRev);

        const actualColors = sortedDates.map(d => {
            const totalTarget = d.originalRev + d.carryOverRev;
            return (d.actualRev >= totalTarget && totalTarget > 0) 
                ? 'rgba(75, 192, 192, 0.7)' 
                : 'rgba(255, 99, 132, 0.7)';
        });
        
        const actualHoverColors = sortedDates.map(d => {
            const totalTarget = d.originalRev + d.carryOverRev;
            return (d.actualRev >= totalTarget && totalTarget > 0) 
                ? 'rgba(75, 192, 192, 1)' 
                : 'rgba(255, 99, 132, 1)';
        });

        if (planVsActualChartInstance) planVsActualChartInstance.destroy();
        const plugins = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];

        planVsActualChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { 
                        type: 'line', label: 'Total Target Trend', data: totalTargetRevData, borderColor: 'rgba(54, 162, 235, 0.8)', backgroundColor: 'rgba(54, 162, 235, 0.1)', borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 0, pointHoverRadius: 4, fill: false, order: 0, datalabels: { display: false } 
                    },
                    { 
                        label: 'Actual Revenue', data: actualRevData, stack: 'ActualStack', backgroundColor: actualColors, hoverBackgroundColor: actualHoverColors, order: 1, barPercentage: 0.7, categoryPercentage: 0.8, grouped: false 
                    },
                    { 
                        label: 'Original Plan Rev', data: originalRevData, stack: 'PlanStack', backgroundColor: 'rgba(54, 162, 235, 0.5)', hoverBackgroundColor: 'rgba(54, 162, 235, 0.8)', order: 2, barPercentage: 0.7, categoryPercentage: 0.8, grouped: false 
                    },
                    { 
                        label: 'Carry Over Rev', data: carryOverRevData, stack: 'PlanStack', backgroundColor: 'rgba(255, 159, 64, 0.6)', hoverBackgroundColor: 'rgba(255, 159, 64, 0.9)', order: 2, barPercentage: 0.7, categoryPercentage: 0.8, grouped: false 
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, autoSkip: true, maxTicksLimit: 15, maxRotation: 0 } },
                    y: { stacked: true, beginAtZero: true, grid: { borderDash: [2, 2] }, title: { display: true, text: 'Revenue (THB)' }, ticks: { callback: function(val) { return val >= 1000000 ? (val/1000000).toFixed(1)+'M' : val >= 1000 ? (val/1000).toFixed(0)+'k' : val; } } }
                },
                plugins: {
                    legend: { position: 'top', align: 'center', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
                    tooltip: { callbacks: { title: (items) => new Date(sortedDates[items[0].dataIndex].date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }), label: (c) => (c.dataset.label||'') + ': ' + (c.parsed.y!==null ? new Intl.NumberFormat('th-TH', {style:'currency', currency:'THB'}).format(c.parsed.y) : ''), footer: (items) => { const idx = items[0].dataIndex; const total = totalTargetRevData[idx]; return 'Total Target: ' + new Intl.NumberFormat('th-TH', {style:'currency', currency:'THB'}).format(total); } } },
                    datalabels: { display: false },
                    zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
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
            dateMap[dStr] = { date: dStr, original: 0, carryOver: 0, actual: 0 };
            curr.setDate(curr.getDate() + 1);
        }
       
        planData.forEach(p => {
            const d = p.plan_date; 
            if (dateMap[d]) {
                dateMap[d].original += parseFloat(p.original_planned_quantity || 0);
                dateMap[d].actual += parseFloat(p.actual_quantity || 0);
                if (p.shift === 'DAY') {
                    dateMap[d].carryOver += parseFloat(p.carry_over_quantity || 0);
                }
            }
        });

        const sortedDates = Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));
        chartWrapper.style.width = '100%';
        chartWrapper.style.height = '100%';

        const labels = sortedDates.map(d => {
            const dateObj = new Date(d.date);
            return `${dateObj.getDate()}/${dateObj.getMonth()+1}`; 
        });
        
        const originalValues = sortedDates.map(d => d.original);
        const carryOverValues = sortedDates.map(d => d.carryOver);
        const actualValues = sortedDates.map(d => d.actual);
        const totalTargetValues = sortedDates.map(d => d.original + d.carryOver);

        const actualColors = sortedDates.map(d => {
            return (d.actual >= (d.original + d.carryOver) && (d.original + d.carryOver) > 0) 
                ? 'rgba(75, 192, 192, 0.7)'
                : 'rgba(255, 99, 132, 0.7)';
        });
        
        const actualHoverColors = sortedDates.map(d => {
            return (d.actual >= (d.original + d.carryOver) && (d.original + d.carryOver) > 0) 
                ? 'rgba(75, 192, 192, 1)' 
                : 'rgba(255, 99, 132, 1)';
        });

        if (planVsActualChartInstance) planVsActualChartInstance.destroy();
        const plugins = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];

        planVsActualChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { type: 'line', label: 'Total Target Trend', data: totalTargetValues, borderColor: 'rgba(54, 162, 235, 0.8)', backgroundColor: 'rgba(54, 162, 235, 0.1)', borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 0, pointHoverRadius: 4, fill: false, order: 0, datalabels: { display: false } },
                    { label: 'Actual', data: actualValues, stack: 'ActualStack', backgroundColor: actualColors, hoverBackgroundColor: actualHoverColors, order: 1, barPercentage: 0.7, categoryPercentage: 0.8, grouped: false },
                    { label: 'Original Plan', data: originalValues, stack: 'PlanStack', backgroundColor: 'rgba(54, 162, 235, 0.5)', hoverBackgroundColor: 'rgba(54, 162, 235, 0.8)', order: 2, barPercentage: 0.7, categoryPercentage: 0.8, grouped: false },
                    { label: 'Carry Over', data: carryOverValues, stack: 'PlanStack', backgroundColor: 'rgba(255, 159, 64, 0.6)', hoverBackgroundColor: 'rgba(255, 159, 64, 0.9)', order: 2, barPercentage: 0.7, categoryPercentage: 0.8, grouped: false }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, autoSkip: true, maxTicksLimit: 15, maxRotation: 0 } },
                    y: { stacked: true, beginAtZero: true, grid: { borderDash: [2, 2] }, title: { display: true, text: 'Quantity (Pcs)' } }
                },
                plugins: {
                    legend: { position: 'top', align: 'center', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
                    tooltip: { callbacks: { title: (items) => new Date(sortedDates[items[0].dataIndex].date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }), footer: (items) => { const idx = items[0].dataIndex; const total = totalTargetValues[idx]; return 'Total Target: ' + parseInt(total).toLocaleString(); } } },
                    datalabels: { display: false },
                    zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
                }
            },
            plugins: plugins
        });
        if (chartDateDisplay) chartDateDisplay.textContent = "Plan Composition vs Actual";
    }

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
                    label: identifier, part_description: p.part_description,
                    totalAdjustedPlan: 0, totalActualQty: 0, totalOriginalPlan: 0, totalCarryOver: 0
                };
            }
            const original = parseFloat(p.original_planned_quantity || 0);
            const co = parseFloat(p.carry_over_quantity || 0);
            
            aggregatedData[itemId].totalOriginalPlan += original;
            aggregatedData[itemId].totalActualQty += parseFloat(p.actual_quantity || 0);
            
            if (p.shift === 'DAY') {
                aggregatedData[itemId].totalCarryOver += co;
            }
            const coToAdd = (p.shift === 'DAY') ? co : 0;
            aggregatedData[itemId].totalAdjustedPlan += (original + coToAdd);
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

    function initializeCalendar() {
        if (!planningCalendarContainer) return;
        const todayString = formatDateForInput(new Date());
        planningCalendarContainer.innerHTML = '';
        
        fullCalendarInstance = new FullCalendar.Calendar(planningCalendarContainer, {
            initialView: 'dayGridMonth', 
            headerToolbar: false, 
            editable: false, 
            dayMaxEvents: 3, 
            height: '100%',
            eventOrder: 'displayOrder', 
            events: (info, sc, fc) => fetchCalendarEvents(info, sc, fc, todayString),
            eventClick: (info) => { if(info.event.extendedProps.planData) openFinancialDetail(info.event.extendedProps.planData); },
            dateClick: (info) => {
                const clickedDate = info.dateStr;
                const plansOnDate = currentPlanData.filter(p => p.plan_date === clickedDate);
                
                if (plansOnDate.length > 0) {
                    let totalPlanQty = 0; let totalActualQty = 0; let totalPlanSales = 0; let totalPlanCost = 0;
                    plansOnDate.forEach(p => {
                        const planQty = parseFloat(p.adjusted_planned_quantity || 0);
                        const actualQty = parseFloat(p.actual_quantity || 0);
                        const priceUSD = parseFloat(p.price_usd || 0);
                        const priceTHB = parseFloat(p.standard_price || 0);
                        const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
                        const unitCost = parseFloat(p.cost_total || 0);
                        totalPlanQty += planQty; totalActualQty += actualQty; totalPlanSales += (planQty * unitPrice); totalPlanCost += (planQty * unitCost);
                    });
                    const avgPrice = totalPlanQty > 0 ? (totalPlanSales / totalPlanQty) : 0;
                    const avgCost = totalPlanQty > 0 ? (totalPlanCost / totalPlanQty) : 0;
                    openFinancialDetail({
                        plan_date: clickedDate, line: planLineFilter.value ? planLineFilter.value : 'Multiple Lines', part_no: 'Daily Summary', 
                        part_description: `Aggregated ${plansOnDate.length} Items`, adjusted_planned_quantity: totalPlanQty, actual_quantity: totalActualQty, 
                        price_usd: 0, standard_price: avgPrice, cost_total: avgCost
                    });
                } else {
                    openFinancialDetail({ plan_date: clickedDate, line: planLineFilter.value || '-', part_no: '-', part_description: 'No production plan', adjusted_planned_quantity: 0, actual_quantity: 0, price_usd: 0, standard_price: 0, cost_total: 0 });
                }
            },
            datesSet: (dateInfo) => { if (calendarTitle) calendarTitle.textContent = dateInfo.view.title; }
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
            limit: -1 
        };
        
        try {
            const result = await sendRequest(PLAN_API, 'get_plans', 'GET', null, params);
            if(result.success) {
                const events = [];
                const dailyStats = {};
                const itemAggregator = {};
                const dailyOT = {}; 

                result.data.forEach(p => {
                    const original = parseFloat(p.original_planned_quantity || 0);
                    const co = parseFloat(p.carry_over_quantity || 0);
                    const act = parseFloat(p.actual_quantity || 0);
                    const adj = original + co;

                    const ot = parseFloat(p.ot_hours || 0);
                    if (ot > 0) {
                        if (!dailyOT[p.plan_date] || ot > dailyOT[p.plan_date]) {
                            dailyOT[p.plan_date] = ot;
                        }
                    }

                    if (original === 0 && co === 0 && act === 0) return;

                    const key = `${p.plan_date}_${p.line}_${p.item_id}`;

                    if (!itemAggregator[key]) {
                        itemAggregator[key] = {
                            ...p,
                            aggr_original: 0,
                            aggr_co: 0,
                            aggr_adj: 0,
                            aggr_act: 0
                        };
                    }

                    itemAggregator[key].aggr_original += original;
                    itemAggregator[key].aggr_co += co;
                    itemAggregator[key].aggr_adj += adj;
                    itemAggregator[key].aggr_act += act;

                    if (!dailyStats[p.plan_date]) dailyStats[p.plan_date] = { planRevenue: 0, actualRevenue: 0 };
                    const priceUSD = parseFloat(p.price_usd || 0);
                    const priceTHB = parseFloat(p.standard_price || 0);
                    const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;
                    dailyStats[p.plan_date].planRevenue += (adj * unitPrice);
                    dailyStats[p.plan_date].actualRevenue += (act * unitPrice);
                });

                Object.keys(dailyOT).forEach(date => {
                    events.push({
                        title: `⏰ OT: +${dailyOT[date].toFixed(1)} ชม.`,
                        start: date,
                        allDay: true,
                        backgroundColor: '#6f42c1',
                        borderColor: '#5a32a3',
                        textColor: '#fff',
                        displayOrder: 0, 
                        className: 'fw-bold'
                    });
                });

                Object.values(itemAggregator).forEach(item => {
                    const target = item.aggr_adj;
                    const actual = item.aggr_act;

                    let bgColor, bdColor, orderPriority;

                    if (actual >= target && actual > 0) { 
                        bgColor = 'rgba(75, 192, 192, 0.7)'; bdColor = 'rgba(75, 192, 192, 1)'; orderPriority = 1; 
                    }
                    else if (target <= 0 && actual > 0) { 
                        bgColor = 'rgba(153, 102, 255, 0.7)'; bdColor = 'rgba(153, 102, 255, 1)'; orderPriority = 2; 
                    }
                    else if (actual < target && item.plan_date >= todayString) { 
                        bgColor = 'rgba(54, 162, 235, 0.6)'; bdColor = 'rgba(54, 162, 235, 1)'; orderPriority = 3; 
                    }
                    else { 
                        bgColor = 'rgba(255, 99, 132, 0.7)'; bdColor = 'rgba(255, 99, 132, 1)'; orderPriority = 4; 
                    }

                    if (target <= 0 && actual === 0) return;

                    item.adjusted_planned_quantity = target;
                    item.original_planned_quantity = item.aggr_original;
                    item.carry_over_quantity = item.aggr_co;
                    item.actual_quantity = actual;

                    events.push({ 
                        id: `cal_${item.plan_id}_${item.item_id}`, 
                        title: `${item.sap_no} (${parseInt(actual)}/${parseInt(target)})`, 
                        start: item.plan_date, 
                        backgroundColor: bgColor, 
                        borderColor: bdColor, 
                        textColor: '#fff', 
                        displayOrder: orderPriority,
                        extendedProps: { planData: item } 
                    });
                });

                Object.keys(dailyStats).forEach(date => {
                    const stat = dailyStats[date];
                    if (stat.planRevenue > 0) {
                        const isTargetMet = stat.actualRevenue >= stat.planRevenue;
                        const color = isTargetMet ? 'rgba(75, 192, 192, 0.15)' : 'rgba(255, 99, 132, 0.15)'; 
                        events.push({ start: date, end: date, display: 'background', backgroundColor: color, allDay: true });
                    }
                });

                successCallback(events);
            }
        } catch(e) { 
            console.error(e);
            failureCallback(e); 
        }
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
            btnImportPlan.addEventListener('click', () => { importPlanInput.click(); });
            importPlanInput.addEventListener('change', handleFileImport);
        }

        if (btnExportPlan) {
            btnExportPlan.addEventListener('click', exportToExcel);
        }

        if (tableSearchInput) {
            tableSearchInput.addEventListener('keyup', handleTableSearch);
            tableSearchInput.addEventListener('search', handleTableSearch);
        }
        
        const toggleDailyView = document.getElementById('toggleDailyView');
        if (toggleDailyView) {
            toggleDailyView.addEventListener('change', () => {
                renderPlanTable(currentPlanData); 
            });
        }

        // ฟังก์ชันลบแผนแบบช่วงเวลา
        const btnDeletePlanRange = document.getElementById('btnDeletePlanRange');
        if (btnDeletePlanRange) {
            btnDeletePlanRange.addEventListener('click', async () => {
                // ดึงรายการ Line จาก Filter ด้านบนมาใส่ใน Dropdown ของ Modal
                const lineOptions = Array.from(document.getElementById('planLineFilter').options)
                                         .map(opt => `<option value="${opt.value}">${opt.text}</option>`)
                                         .join('');

                const { value: formValues } = await Swal.fire({
                    title: 'ลบแผนการผลิต (ตามช่วงเวลา)',
                    html: `
                        <div class="text-start" style="font-size: 0.9rem;">
                            <div class="alert alert-danger py-2 px-3 mb-3">
                                <i class="fas fa-exclamation-triangle me-2"></i> ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้
                            </div>
                            <div class="row g-2 mb-3">
                                <div class="col-6">
                                    <label class="form-label fw-bold mb-1">ตั้งแต่ (Start Date)</label>
                                    <input type="date" id="swalDelStart" class="form-control form-control-sm" value="${document.getElementById('startDateFilter').value}">
                                </div>
                                <div class="col-6">
                                    <label class="form-label fw-bold mb-1">ถึง (End Date)</label>
                                    <input type="date" id="swalDelEnd" class="form-control form-control-sm" value="${document.getElementById('endDateFilter').value}">
                                </div>
                            </div>
                            <label class="form-label fw-bold mb-1">ไลน์ผลิต (Line)</label>
                            <select id="swalDelLine" class="form-select form-select-sm">
                                ${lineOptions}
                            </select>
                        </div>
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: '<i class="fas fa-trash-alt me-1"></i> ยืนยันการลบ',
                    confirmButtonColor: '#dc3545',
                    cancelButtonText: 'ยกเลิก',
                    preConfirm: () => {
                        const start = document.getElementById('swalDelStart').value;
                        const end = document.getElementById('swalDelEnd').value;
                        const line = document.getElementById('swalDelLine').value;
                        if (!start || !end) {
                            Swal.showValidationMessage('กรุณาระบุวันที่ให้ครบถ้วน');
                            return false;
                        }
                        if (start > end) {
                            Swal.showValidationMessage('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
                            return false;
                        }
                        return { startDate: start, endDate: end, line: line };
                    }
                });

                if (formValues) {
                    // Double Confirm เพื่อความชัวร์
                    const lineText = formValues.line === 'ALL' ? 'ทุกไลน์การผลิต' : `ไลน์ ${formValues.line}`;
                    const confirmRes = await Swal.fire({
                        title: 'ยืนยันรหัสผ่าน / Confirm?',
                        text: `คุณกำลังจะลบแผนตั้งแต่ ${formValues.startDate} ถึง ${formValues.endDate} ของ "${lineText}"`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#dc3545',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'ใช่, ดำเนินการลบ!'
                    });

                    if (confirmRes.isConfirmed) {
                        try {
                            const res = await sendRequest(PLAN_API, 'delete_plans_by_range', 'POST', formValues);
                            if (res.success) {
                                Swal.fire('สำเร็จ!', res.message, 'success');
                                fetchPlans(); // โหลดตารางใหม่
                                fullCalendarInstance?.refetchEvents(); // โหลดปฏิทินใหม่
                            } else {
                                Swal.fire('ล้มเหลว', res.message, 'error');
                            }
                        } catch (e) {
                            Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
                        }
                    }
                }
            });
        }

        btnAddPlan?.addEventListener('click', () => openPlanModal(null));

        fetchDashboardLines()
            .then(fetchAllItemsForPlanning)
            .then(() => { initializeCalendar(); fetchPlans(); });
    }

    initializeApp();
});