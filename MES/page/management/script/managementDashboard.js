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
    // SECTION: UTILITY FOR THAI DATES
    // =================================================================
    const THAI_MONTHS = {
        "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3, "พ.ค.": 4, "มิ.ย.": 5,
        "ก.ค.": 6, "ส.ค.": 7, "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11
    };

    const UNIVERSAL_MONTHS = {
        // --- ภาษาไทย (ตัวย่อ) ---
        "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3, "พ.ค.": 4, "มิ.ย.": 5,
        "ก.ค.": 6, "ส.ค.": 7, "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11,
        // --- ภาษาไทย (ตัวเต็ม - เผื่อหลุดมา) ---
        "มกราคม": 0, "กุมภาพันธ์": 1, "มีนาคม": 2, "เมษายน": 3, "พฤษภาคม": 4, "มิถุนายน": 5,
        "กรกฎาคม": 6, "สิงหาคม": 7, "กันยายน": 8, "ตุลาคม": 9, "พฤศจิกายน": 10, "ธันวาคม": 11,
        // --- English (Short) ---
        "jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5,
        "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11,
        // --- English (Full) ---
        "january": 0, "february": 1, "march": 2, "april": 3, "june": 5,
        "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11
    };

    function parseThaiDateHeader(headerStr, baseYear) {
        // Input ex: "1-ธ.ค." or "01-ธ.ค."
        try {
            const parts = headerStr.split('-');
            if (parts.length !== 2) return null;
            
            const day = parseInt(parts[0], 10);
            const monthStr = parts[1].trim();
            const monthIndex = THAI_MONTHS[monthStr];
            
            if (isNaN(day) || monthIndex === undefined) return null;

            // คำนวณปี: ถ้าเดือนเป็น ม.ค. (0) แต่ base month เป็น ธ.ค. (11) แสดงว่าข้ามปีแล้ว
            let year = baseYear;
            // Logic ง่ายๆ: ถ้าเดือนที่อ่านได้ น้อยกว่าเดือนปัจจุบันมากๆ อาจจะเป็นปีหน้า
            // แต่เพื่อความแม่นยำ ควรใช้ปีจาก Filter หน้าเว็บเป็นตัวตั้งต้น
            
            const d = new Date(year, monthIndex, day);
            // ปรับ timezone offset ให้เป็น Local date string แบบ YYYY-MM-DD
            const yearStr = d.getFullYear();
            const mStr = String(d.getMonth() + 1).padStart(2, '0');
            const dStr = String(d.getDate()).padStart(2, '0');
            return `${yearStr}-${mStr}-${dStr}`;
        } catch (e) {
            return null;
        }
    }

    function parseFlexibleDateHeader(input, baseYear) {
        if (input === null || input === undefined || input === '') return null;

        // 1. Excel Serial Date check
        if (typeof input === 'number' && input > 20000) {
            const dateInfo = new Date((input - (25567 + 2)) * 86400 * 1000); 
            const y = dateInfo.getFullYear();
            const m = String(dateInfo.getMonth() + 1).padStart(2, '0');
            const d = String(dateInfo.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        let cleanStr = String(input).trim();

        // 2. ISO Date check (2025-12-19)
        if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(cleanStr)) {
            try {
                const d = new Date(cleanStr);
                if (!isNaN(d.getTime())) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                }
            } catch (e) { /* ignore */ }
        }

        // 3. Text Month Logic (Fixed for Thai Dots)
        try {
            cleanStr = cleanStr.toLowerCase();
            
            // ★ แก้ไขตรงนี้: ลองตัดด้วย ขีด(-), ทับ(/), หรือ เว้นวรรค ก่อน (เก็บจุด . ไว้)
            // เพื่อให้ "พ.ย." ยังอยู่ครบเป็นก้อนเดียว
            let parts = cleanStr.split(/[-/\s]+/); 

            // กรณีเจอรูปแบบ 01.12.2025 (ใช้จุดคั่น) Array จะยาวแค่ 1 ก้อน -> ให้ลองตัดด้วยจุดเพิ่ม
            if (parts.length < 2) {
                parts = cleanStr.split(/[-/.\s]+/);
            }

            if (parts.length < 2) return null;

            const day = parseInt(parts[0], 10);
            let monthStr = parts[1];
            
            // ตรวจสอบในพจนานุกรม
            let monthIndex = UNIVERSAL_MONTHS[monthStr]; 
            
            // ถ้าไม่เจอ ลองลบจุดออก (เผื่อ Dec. -> Dec)
            if (monthIndex === undefined && monthStr.endsWith('.')) {
                monthIndex = UNIVERSAL_MONTHS[monthStr.replace('.', '')];
            }
            // ถ้าไม่เจออีก ลองมองเป็นตัวเลข (เผื่อ 01/12)
            if (monthIndex === undefined && !isNaN(monthStr)) {
                monthIndex = parseInt(monthStr) - 1;
            }

            if (isNaN(day) || monthIndex === undefined) return null;

            const d = new Date(baseYear, monthIndex, day);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dayStr}`;
        } catch (e) {
            return null;
        }
    }

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

    /* script/managementDashboard.js (Updated: Export with Description) */

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
        
        // ★ แก้ไข 1: เพิ่ม Header "Description"
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

        // Group by Line
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
                        // ★ แก้ไข 2: เก็บชื่อสินค้า (ใช้ part_name หรือ description)
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
                // ★ แก้ไข 3: ใส่ Description ในคอลัมน์ที่ 2
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

    // =================================================================
    // SECTION: IMPORT FUNCTION (Final Fix for CSV & Mixed Dates)
    // =================================================================
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

                // Helper: ตรวจสอบว่าเป็นบรรทัด Header วันที่หรือไม่
                const isDateHeader = (row) => {
                    if (!Array.isArray(row)) return false;
                    return row.some(cell => {
                        // Check 1: Excel Serial Number (e.g., 45645)
                        if (typeof cell === 'number' && cell > 35000) return true;
                        
                        if (typeof cell === 'string') {
                            const val = cell.trim();
                            // Check 2: Text Month (1-ธ.ค.) or ISO (2025-...)
                            return /\d+[-/\s.]+[a-zA-Zก-๙]+/.test(val) || /^\d{4}[-/.]\d{1,2}/.test(val);
                        }
                        return false;
                    });
                };

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    // header:1 จะคืนค่าเป็น Raw data (ถ้าเป็น xlsx วันที่จะเป็น Number)
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (rows.length < 2) return; 

                    // --- 1. กำหนดชื่อ Line ---
                    let currentLine = sheetName.replace(/Plan\s+/i, '').trim();
                    const isGenericSheet = currentLine.toLowerCase().startsWith('sheet') || currentLine.toLowerCase() === 'csv';

                    if (isGenericSheet) {
                        const fileName = file.name; 
                        // ตัดนามสกุลไฟล์ออก (.csv, .xlsx)
                        const cleanName = fileName.replace(/\.(csv|xlsx|xls)$/i, '');
                        
                        let potentialLine = '';

                        // ★★★ Logic ใหม่: แกะชื่อจากวงเล็บ (ASSEMBLY) ★★★
                        // Regex: มองหา (...) ที่อยู่ท้ายชื่อไฟล์
                        const parenMatch = cleanName.match(/\(([^)]+)\)$/);
                        
                        // ถ้าเจอวงเล็บ และข้างในไม่ใช่ตัวเลขล้วน (ป้องกันพวก (1), (2) ที่เป็นเลข version ไฟล์)
                        if (parenMatch && isNaN(parenMatch[1])) {
                            potentialLine = parenMatch[1].trim();
                        } else {
                            // Fallback: ถ้าไม่เจอวงเล็บ ให้ใช้ขีด (-) เหมือนเดิม
                            const parts = cleanName.split('-');
                            potentialLine = parts[parts.length - 1].trim();
                        }
                        
                        // กรองความยาวและตัวเลข (เหมือนเดิม)
                        if (potentialLine.length > 2 && !/^\d+$/.test(potentialLine)) { 
                            currentLine = potentialLine;
                        } else if (planLineFilter.value) {
                            currentLine = planLineFilter.value;
                        }
                    }

                    // --- 2. หา Header วันที่ ---
                    let dateHeaderRowIndex = -1;
                    const validDateMap = {}; 
                    const filterYear = new Date(startDateFilter.value).getFullYear(); 
                    let currentYear = filterYear;
                    let lastMonthIndex = -1;

                    for(let r=0; r<Math.min(rows.length, 10); r++) {
                        if (isDateHeader(rows[r])) {
                            dateHeaderRowIndex = r;
                            break;
                        }
                    }

                    if (dateHeaderRowIndex === -1) return; 

                    // --- Parse Date Headers ---
                    const dateHeaders = rows[dateHeaderRowIndex];
                    dateHeaders.forEach((cell, index) => {
                        // ส่ง Raw Cell ไปให้ parseFlexibleDateHeader จัดการ (มันฉลาดพอที่จะรู้ว่าเป็น Number หรือ String)
                        const parsedDate = parseFlexibleDateHeader(cell, currentYear);
                        
                        if (parsedDate) {
                            // ถ้าเจอวันที่แบบ ISO หรือ Serial ที่แปลงแล้วมีปีครบถ้วน -> อัปเดตปีปัจจุบัน
                            if (/^\d{4}-/.test(parsedDate)) {
                                validDateMap[index] = parsedDate;
                                currentYear = parseInt(parsedDate.split('-')[0]);
                            } else {
                                // Logic เดือนไทย (คำนวณข้ามปี)
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

                    // --- 3. Loop อ่านข้อมูลสินค้า ---
                    let countInSheet = 0;
                    for (let i = dateHeaderRowIndex + 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.length === 0) continue;

                        const firstCol = row[0]; 
                        // ต้องเป็น String หรือ Number (เผื่อ Item Code เป็นตัวเลขล้วน)
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
                    
                    if (countInSheet > 0) {
                        processedLines.push(currentLine);
                    }
                });

                if (allMappedPlans.length === 0) {
                    showToast('ไม่พบข้อมูลแผนผลิต (ตรวจสอบรูปแบบวันที่ในไฟล์)', 'var(--bs-warning)');
                    return;
                }

                const uniqueLines = [...new Set(processedLines)].join(', ');
                const confirmMsg = `
                    พบข้อมูลแผนผลิต: ${allMappedPlans.length} รายการ
                    ----------------------------
                    Lines Detected: ${uniqueLines}
                    Shift: ${defaultShift} (Auto)
                    ----------------------------
                    ยืนยันการนำเข้า?
                `;

                if(!confirm(confirmMsg)) return;

                showSpinner();
                const res = await sendRequest(PLAN_API, 'import_plans_bulk', 'POST', { plans: allMappedPlans });
                
                if (res.success) {
                    // 1. แจ้งเตือนว่า Import สำเร็จ
                    showToast(`${res.message} - Recalculating C/O...`, 'var(--bs-success)');
                    
                    // 2. ★★★ เพิ่มตรงนี้: สั่งคำนวณ C/O ต่อทันที (Auto Trigger) ★★★
                    try {
                        const coRes = await sendRequest(PLAN_API, 'calculate_carry_over', 'GET');
                        if(coRes.success) {
                            showToast('Carry Over Updated Automatically!', 'var(--bs-success)');
                        }
                    } catch(e) {
                        console.error("Auto Calc C/O failed", e);
                        showToast('Import success, but Auto C/O failed. Please press the yellow button.', 'var(--bs-warning)');
                    }

                    // 3. โหลดข้อมูลใหม่แสดงบนตาราง
                    fetchPlans(); 
                    if(fullCalendarInstance) fullCalendarInstance.refetchEvents();

                } else {
                    alert("Import Error:\n" + res.message);
                }

            } catch (err) {
                console.error(err);
                showToast('Error processing file: ' + err.message, 'var(--bs-danger)');
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
        
        // วันแรกของเดือน (วันที่ 1)
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // วันสุดท้ายของเดือน (วันที่ 0 ของเดือนถัดไป)
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
            
            // ใช้ Original Plan คิด Est Sales เพื่อความ Make Sense ของภาพรวมเดือน
            totalEstSale += (original * unitPrice); 
            totalActualSale += (act * unitPrice);

            // Logic Backlog
            if (!latestItemStatus[p.item_id] || p.plan_date >= latestItemStatus[p.item_id].date) {
                latestItemStatus[p.item_id] = {
                    date: p.plan_date,
                    balance: adjusted - act 
                };
            }
        });

        let totalBacklog = 0;
        Object.values(latestItemStatus).forEach(status => {
            totalBacklog += status.balance;
        });

        // แสดงผล
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

    // =================================================================
    // SECTION 5: RENDERING TABLE (FIXED CALCULATION)
    // =================================================================
    function renderPlanTable(data) {
        productionPlanTableBody.innerHTML = '';

        // 1. [ใหม่] กรองข้อมูลก่อนเริ่มวาดตาราง
        // ตัดแถวที่ Original Plan, Carry Over และ Actual เป็น 0 ทั้งหมดออก
        const filteredData = data ? data.filter(plan => {
            const op = parseFloat(plan.original_planned_quantity || 0);
            const co = parseFloat(plan.carry_over_quantity || 0);
            const aq = parseFloat(plan.actual_quantity || 0);
            // จะเก็บไว้ก็ต่อเมื่อมีค่าอย่างใดอย่างหนึ่ง (ไม่เป็น 0 พร้อมกันหมด)
            return (op !== 0 || co !== 0 || aq !== 0);
        }) : [];

        // 2. เช็คว่าหลังจากกรองแล้ว เหลือข้อมูลไหม
        if (filteredData.length === 0) {
            productionPlanTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-muted py-5">No active plans found.</td></tr>`;
            return;
        }

        // 3. วนลูปสร้างตารางจากข้อมูลที่กรองแล้ว (เปลี่ยนจาก data.forEach เป็น filteredData.forEach)
        filteredData.forEach(plan => {
            const originalPlan = parseFloat(plan.original_planned_quantity || 0);
            const carryOver = parseFloat(plan.carry_over_quantity || 0);
            const adjPlan = originalPlan + carryOver;
            const actualQty = parseFloat(plan.actual_quantity || 0);

            const priceUSD = parseFloat(plan.price_usd || 0);
            const priceTHB = parseFloat(plan.standard_price || 0);
            let unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;

            const totalPlanSale = adjPlan * unitPrice;
            const totalActualSale = actualQty * unitPrice;
            const diffMoney = totalActualSale - totalPlanSale;

            const tr = document.createElement('tr');
            tr.dataset.planId = plan.plan_id;
            tr.dataset.planData = JSON.stringify(plan);

            // Logic สี Actual
            let progressClass = 'text-dark';
            if (adjPlan > 0) {
                if (actualQty >= adjPlan) progressClass = 'text-success fw-bold';
                else if (actualQty > 0) progressClass = 'text-primary';
            }

            // Logic สี Diff
            let diffClass = '';
            let diffText = '';

            // กรณีที่ 1: แผนเป็น 0 และ ผลิตจริงเป็น 0 (ไม่มี Activity) -> ให้โชว์ขีด "-" สีจางๆ
            if (adjPlan === 0 && actualQty === 0) {
                diffClass = 'text-end text-muted opacity-50'; // เพิ่ม opacity ให้จางลงอีกนิด
                diffText = '-';
            }
            // กรณีที่ 2: กำไร หรือ เท่าทุน (>= 0) -> ให้เป็นสีเขียวตามที่ขอ
            else if (diffMoney >= 0) {
                diffClass = 'text-end text-success fw-bold';
                // ถ้ามากกว่า 0 ใส่เครื่องหมาย +, ถ้าเท่ากับ 0 ไม่ต้องใส่
                diffText = (diffMoney > 0 ? '+' : '') + formatCurrency(diffMoney);
            }
            // กรณีที่ 3: ขาดทุน -> สีแดง
            else {
                diffClass = 'text-end text-danger fw-bold';
                diffText = formatCurrency(diffMoney);
            }

            tr.innerHTML = `
                <td class="text-secondary">${plan.plan_date}</td>
                <td class="text-center"><span class="badge bg-light text-dark border">${plan.line}</span></td>
                <td class="text-center"><span class="badge ${plan.shift === 'DAY' ? 'bg-warning text-dark' : 'bg-dark text-white'} border">${(plan.shift || '-').substring(0, 1)}</span></td>
                <td>
                    <span class="fw-bold text-dark">${plan.sap_no || '-'}</span>
                    <span class="text-muted mx-1">/</span>
                    <span class="text-secondary">${plan.part_no || '-'}</span>
                    <div class="text-muted text-truncate" style="max-width: 250px; font-size: 0.85em;">${plan.part_description || ''}</div>
                </td>
                <td class="text-end">
                    <span class="editable-plan fw-bold text-dark" contenteditable="true" data-id="${plan.plan_id}" data-field="original_plan" style="cursor: pointer; border-bottom: 1px dashed #ccc; display:inline-block; min-width: 50px;">${originalPlan.toLocaleString()}</span>
                </td>
                <td class="text-end">
                    <span class="editable-plan ${carryOver !== 0 ? 'text-warning fw-bold' : 'text-muted opacity-50'}" contenteditable="true" data-id="${plan.plan_id}" data-field="carry_over" style="cursor: pointer; border-bottom: 1px dashed #ccc;">${carryOver.toLocaleString()}</span>
                </td>

                <td class="text-end fw-bold text-primary" data-field="adjusted_plan">${adjPlan.toLocaleString()}</td>
                <td class="text-end ${progressClass}" data-field="actual_quantity">${actualQty.toLocaleString()}</td>

                <td class="text-end text-secondary fw-bold">${formatCurrency(totalPlanSale)}</td>

                <td class="text-end text-success fw-bold">${formatCurrency(totalActualSale)}</td>

                <td class="${diffClass}" data-field="diff_money">${diffText}</td>

                <td class="text-center">
                    <span class="editable-plan d-inline-block text-truncate text-secondary" style="max-width: 180px; cursor: pointer; border-bottom: 1px dashed #ccc;" contenteditable="true" data-id="${plan.plan_id}" data-field="note">${plan.note || '<span class="opacity-25">...</span>'}</span>
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
        } else if (planSales <= 0 && actualSales > 0) {
            // ถ้าเป้าเป็น 0 หรือติดลบ (เพราะ C/O ช่วยไว้เยอะ) แต่เรายังขายได้ -> ถือว่าทะลุเป้า 100%
            progress = 100;
        } else {
            // เป้า 0 และไม่ได้ขาย -> 0%
            progress = 0;
        }
        progress = Math.min(progress, 100);
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

    function updateRowCalculationUI(row, field, newVal) {
        const data = JSON.parse(row.dataset.planData);
        let plan = parseFloat(data.original_planned_quantity || 0);
        let co = parseFloat(data.carry_over_quantity || 0);

        if (field === 'original_plan') plan = newVal;
        if (field === 'carry_over') co = newVal;

        const newTarget = plan + co;

        // 1. อัปเดต Target
        const targetEl = row.querySelector('[data-field="adjusted_plan"]');
        if (targetEl) targetEl.innerText = newTarget.toLocaleString();

        const priceUSD = parseFloat(data.price_usd || 0);
        const priceTHB = parseFloat(data.standard_price || 0);
        const unitPrice = priceUSD > 0 ? (priceUSD * 34.0) : priceTHB;

        // 2. อัปเดต Est. Sales (ตอนนี้อยู่ Index 8)
        const newTotalSale = newTarget * unitPrice;
        if (row.children[8]) row.children[8].innerText = formatCurrency(newTotalSale);

        // 3. อัปเดต Diff Money (คำนวณใหม่ Act - NewTarget)
        const actualQty = parseFloat(data.actual_quantity || 0);
        const actualSale = actualQty * unitPrice;
        const newDiffMoney = actualSale - newTotalSale;

        const diffEl = row.querySelector('[data-field="diff_money"]'); // Index 10
        if (diffEl) {
            // กรณีที่ 1: แผนเป็น 0 และ ผลิตจริงเป็น 0 (ไม่มี Activity) -> ให้โชว์ขีด "-" สีจางๆ
            if (newTarget === 0 && actualQty === 0) {
                diffEl.className = 'text-end text-muted';
                diffEl.innerText = '-';
            }
            // กรณีที่ 2: กำไร หรือ เท่าทุน (>= 0) -> ให้เป็นสีเขียว
            else if (newDiffMoney >= 0) {
                diffEl.className = 'text-end text-success fw-bold';
                diffEl.innerText = (newDiffMoney > 0 ? '+' : '') + formatCurrency(newDiffMoney);
            }
            // กรณีที่ 3: ขาดทุน -> สีแดง
            else {
                diffEl.className = 'text-end text-danger fw-bold';
                diffEl.innerText = formatCurrency(newDiffMoney);
            }
        }

        // 4. อัปเดตสี Actual
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

        // 1. เตรียมข้อมูล
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
                
                // คำนวณรายได้จาก (Original + C/O)
                const planQty = parseFloat(p.original_planned_quantity || 0) + parseFloat(p.carry_over_quantity || 0);
                const actQty = parseFloat(p.actual_quantity || 0);
                
                dateMap[d].planRev += (planQty * unitPrice);
                dateMap[d].actualRev += (actQty * unitPrice);
            }
        });

        const sortedDates = Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));

        // CSS: เต็มจอ
        chartWrapper.style.width = '100%';
        chartWrapper.style.height = '100%';

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
                    // --- 1. เส้น Target Trend (ที่หายไป) ---
                    {
                        type: 'line',
                        label: 'Target Trend',
                        data: planDataArr, // ใช้ข้อมูลเดียวกับแท่ง Target
                        borderColor: 'rgb(54, 162, 235)', // สีฟ้า
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5], // เส้นประ
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: false,
                        order: 0, // อยู่บนสุด
                        datalabels: { display: false }
                    },

                    // --- 2. Target Revenue (Background) ---
                    {
                        label: 'Target Revenue',
                        data: planDataArr,
                        backgroundColor: 'rgba(255, 205, 86, 0.5)', // สีเหลืองทอง
                        hoverBackgroundColor: 'rgba(255, 205, 86, 0.8)',
                        order: 2, // อยู่ข้างหลัง
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        grouped: false
                    },
                    
                    // --- 3. Actual Revenue (Foreground) ---
                    {
                        label: 'Actual Revenue',
                        data: actualDataArr,
                        backgroundColor: (ctx) => {
                            const idx = ctx.dataIndex;
                            const p = planDataArr[idx];
                            const a = actualDataArr[idx];
                            return (a >= p && p > 0) ? 'rgba(75, 192, 192, 0.9)' : 'rgba(255, 99, 132, 0.9)';
                        },
                        hoverBackgroundColor: (ctx) => {
                            const idx = ctx.dataIndex;
                            const p = planDataArr[idx];
                            const a = actualDataArr[idx];
                            return (a >= p && p > 0) ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
                        },
                        order: 1, // อยู่ข้างหน้า
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        grouped: false
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
                        ticks: { 
                            font: { size: 10 },
                            autoSkip: true, 
                            maxTicksLimit: 15,
                            maxRotation: 0 
                        } 
                    },
                    y: { 
                        beginAtZero: true,
                        grid: { borderDash: [2, 2] },
                        title: { display: true, text: 'Revenue (THB)' },
                        ticks: { callback: function(val) { return val >= 1000000 ? (val/1000000).toFixed(1)+'M' : val >= 1000 ? (val/1000).toFixed(0)+'k' : val; } }
                    }
                },
                plugins: {
                    legend: { position: 'top', align: 'center', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            title: (items) => new Date(sortedDates[items[0].dataIndex].date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }),
                            label: (c) => (c.dataset.label||'') + ': ' + (c.parsed.y!==null ? new Intl.NumberFormat('th-TH', {style:'currency', currency:'THB'}).format(c.parsed.y) : '')
                        }
                    },
                    datalabels: { display: false },
                    zoom: {
                        pan: { enabled: true, mode: 'x' },
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                    }
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

        // 1. เตรียมข้อมูล
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
                dateMap[d].carryOver += parseFloat(p.carry_over_quantity || 0);
                dateMap[d].actual += parseFloat(p.actual_quantity || 0);
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

        if (planVsActualChartInstance) planVsActualChartInstance.destroy();
        const plugins = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];

        planVsActualChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    // --- 1. เส้น Trend (เป้ารวม) ---
                    {
                        type: 'line',
                        label: 'Total Target Trend',
                        data: totalTargetValues,
                        borderColor: 'rgb(54, 162, 235)', 
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: false,
                        order: 0, // อยู่บนสุด
                        datalabels: { display: false }
                    },
                    
                    // --- 2. Actual (แท่งหน้า) ---
                    {
                        label: 'Actual',
                        data: actualValues,
                        stack: 'ActualStack', // ★ แยก Stack ชื่อนี้ไว้
                        backgroundColor: (ctx) => {
                            const idx = ctx.dataIndex;
                            const target = totalTargetValues[idx];
                            const act = actualValues[idx];
                            return (act >= target && target > 0) ? 'rgba(75, 192, 192, 0.9)' : 'rgba(255, 99, 132, 0.9)';
                        },
                        hoverBackgroundColor: (ctx) => {
                             const idx = ctx.dataIndex;
                            const target = totalTargetValues[idx];
                            const act = actualValues[idx];
                            return (act >= target && target > 0) ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
                        },
                        order: 1, // Layer หน้า (Z-Index สูงกว่า)
                        barPercentage: 0.7, // ★ ปรับให้ผอมกว่าแท่งหลังนิดหน่อย จะได้ดูมีมิติ
                        categoryPercentage: 0.8,
                        grouped: false // ★ อนุญาตให้ลอยทับตำแหน่งเดียวกัน
                    },

                    // --- 3. Original Plan (แท่งหลัง - ส่วนล่าง) ---
                    // ★ สำคัญ: ต้องใส่อันนี้ก่อน Carry Over เพื่อให้อยู่ข้างล่าง
                    {
                        label: 'Original Plan',
                        data: originalValues,
                        stack: 'PlanStack', // ★ ชื่อ Stack ต้องเหมือนกับ C/O
                        backgroundColor: 'rgba(54, 162, 235, 0.4)', 
                        hoverBackgroundColor: 'rgba(54, 162, 235, 0.7)',
                        order: 2, // Layer หลัง
                        barPercentage: 0.7, // ★ แท่งอ้วนกว่า
                        categoryPercentage: 0.8,
                        grouped: false
                    },

                    // --- 4. Carry Over (แท่งหลัง - ส่วนบน) ---
                    // ★ ใส่ทีหลัง จะไปต่ออยู่บนหัว Original
                    {
                        label: 'Carry Over',
                        data: carryOverValues,
                        stack: 'PlanStack', // ★ ชื่อ Stack ต้องเหมือนกับ Original
                        backgroundColor: 'rgba(255, 159, 64, 0.6)', 
                        hoverBackgroundColor: 'rgba(255, 159, 64, 0.8)',
                        order: 2, // Layer หลัง
                        barPercentage: 0.7, // ★ แท่งอ้วนกว่า
                        categoryPercentage: 0.8,
                        grouped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { 
                        stacked: true, // ★ ต้องเปิด Stack แกน X
                        grid: { display: false }, 
                        ticks: { 
                            font: { size: 10 },
                            autoSkip: true,
                            maxTicksLimit: 15, 
                            maxRotation: 0
                        } 
                    },
                    y: { 
                        stacked: true, // ★ ต้องเปิด Stack แกน Y เพื่อให้ PlanGroup บวกกัน
                        beginAtZero: true, 
                        grid: { borderDash: [2, 2] }, 
                        title: { display: true, text: 'Quantity (Pcs)' } 
                    }
                },
                plugins: {
                    legend: { 
                        position: 'top', align: 'center',
                        labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => new Date(sortedDates[items[0].dataIndex].date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }),
                            footer: (items) => {
                                const idx = items[0].dataIndex;
                                const total = totalTargetValues[idx];
                                return 'Total Target: ' + parseInt(total).toLocaleString();
                            }
                        }
                    },
                    datalabels: { display: false },
                    zoom: {
                        pan: { enabled: true, mode: 'x' },
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                    }
                }
            },
            plugins: plugins
        });
        
        if (chartDateDisplay) chartDateDisplay.textContent = "Plan Composition vs Actual";
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