"use strict";

// ========================================================
// GLOBAL VARIABLES
// ========================================================
let currentData = [];
let currentMode = 'daily'; // 'daily' or 'report'
let isSaving = false;
let currentWorkingDays = 26;

// Calendar Instances
let calendarInstance = null;
let calendarModal = null;
let editorModal = null;
let targetModal = null;
let chartPerformance = null;
let chartStructure = null;

// ========================================================
// INITIALIZATION
// ========================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Set default date
    const dateInput = document.getElementById('targetDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    await loadSectionList();

    // Initial Load
    loadEntryData();

    // Event Listeners
    dateInput?.addEventListener('change', loadEntryData);
    document.getElementById('sectionFilter')?.addEventListener('change', handleSectionChange);
});

async function loadSectionList() {
    const select = document.getElementById('sectionFilter');
    if (!select) return;

    const savedSection = localStorage.getItem('last_selected_section');

    try {
        const res = await fetch('api/manage_pl_entry.php?action=get_active_lines');
        const json = await res.json();

        if (json.success && json.data.length > 0) {
            select.innerHTML = '';
            
            // เพิ่ม Option "All Lines"
            select.innerHTML += '<option value="ALL">-- All Lines --</option>';

            json.data.forEach(line => {
                const option = document.createElement('option');
                option.value = line;
                option.textContent = line;
                select.appendChild(option);
            });

            // คืนค่าที่เคยเลือกไว้ (ถ้ามีในรายการใหม่)
            if (savedSection && json.data.includes(savedSection)) {
                select.value = savedSection;
            } else {
                // [FIXED] ไม่ Fix ชื่อตายตัว ให้เลือกตัวแรกสุดของ List เสมอ
                if (json.data.length > 0) {
                    select.value = json.data[0]; 
                }
            }
        }
    } catch (e) {
        console.error("Failed to load sections:", e);
        // ถ้าโหลดไม่ได้ ให้คงค่า Team 1 ไว้เป็น Fallback
    }
}

// ========================================================
// 1. UNIFIED MODE SWITCHER
// ========================================================
function switchMode(mode) {
    currentMode = mode;
    
    // 1. จัดการ Picker Group
    document.getElementById('dailyPickerGroup').classList.add('d-none');
    document.getElementById('rangePickerGroup').classList.remove('d-flex');
    document.getElementById('rangePickerGroup').classList.add('d-none');
    
    const btnDashGo = document.getElementById('btnDashUpdate');
    if(btnDashGo) btnDashGo.classList.add('d-none');

    const btnSave = document.getElementById('btnSaveSnapshot');
    if (btnSave) {
        // ให้แสดงเฉพาะโหมด Daily เท่านั้น
        btnSave.style.display = (mode === 'daily') ? 'inline-block' : 'none';
    }

    // 2. จัดการ View Section
    document.getElementById('view-table').classList.remove('active');
    document.getElementById('view-dashboard').classList.remove('active');
    document.getElementById('btnSetBudgetWrapper').style.display = 'none';
    document.getElementById('saveStatus').style.visibility = 'hidden';

    if (mode === 'daily') {
        // --- Mode: Daily ---
        document.getElementById('dailyPickerGroup').classList.remove('d-none');
        document.getElementById('view-table').classList.add('active');
        document.getElementById('btnSetBudgetWrapper').style.display = 'block';
        document.getElementById('saveStatus').style.visibility = 'visible';
        loadEntryData();

    } else if (mode === 'dashboard') {
        // --- Mode: Dashboard ---
        const rangeGroup = document.getElementById('rangePickerGroup');
        rangeGroup.classList.remove('d-none');
        rangeGroup.classList.add('d-flex');
        
        if(btnDashGo) btnDashGo.classList.remove('d-none');
        
        document.getElementById('view-dashboard').classList.add('active');
        loadDashboardData();

    } else if (mode === 'report') {
        // --- Mode: Report ---
        const rangeGroup = document.getElementById('rangePickerGroup');
        rangeGroup.classList.remove('d-none');
        rangeGroup.classList.add('d-flex');

        document.getElementById('view-table').classList.add('active');
        loadEntryData();
    }
}

function handleSectionChange() {
    const section = document.getElementById('sectionFilter').value;
    localStorage.setItem('last_selected_section', section);
    
    if (currentMode === 'dashboard') loadDashboardData();
    else loadEntryData();
}

function refreshCurrentView() {
    if (currentMode === 'dashboard') loadDashboardData();
    else loadEntryData();
}

async function loadEntryData() {
    const tbody = document.getElementById('entryTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center align-middle" style="height: 200px;">
                <div class="spinner-border text-primary mb-2" role="status"></div>
                <div class="text-muted small">Loading P&L Data...</div>
            </td>
        </tr>`;

    const section = document.getElementById('sectionFilter')?.value || 'Team 1';
    let url = '';

    if (currentMode === 'daily') {
        const date = document.getElementById('targetDate').value;
        url = `api/manage_pl_entry.php?action=read&entry_date=${date}&section=${section}`;
        if(typeof fetchWorkingDays === 'function') fetchWorkingDays(); 
    } else {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        url = `api/manage_pl_entry.php?action=report_range&start_date=${start}&end_date=${end}&section=${section}`;
    }

    try {
        const response = await fetch(url);
        const res = await response.json();

        if (res.success) {
            currentData = res.data;
            renderEntryTable(res.data);

            if(typeof updateCharts === 'function') updateCharts(currentData);
            if(typeof calculateSummary === 'function') calculateSummary(currentData);
            
            // รันสูตรเฉพาะโหมด Daily
            if (currentMode === 'daily') runFormulaEngine(); 
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-5">${res.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

function calculateSummary(data) {
    let totalRevenue = 0;
    let totalExpense = 0;

    data.forEach(item => {
        if (parseInt(item.item_level) === 0) {
            let amount = parseFloat(item.actual_amount) || 0;
            if (item.item_type === 'REVENUE') {
                totalRevenue += amount;
            } else {
                totalExpense += amount;
            }
        }
    });

    let netProfit = totalRevenue - totalExpense;
    let margin = (totalRevenue > 0) ? (netProfit / totalRevenue * 100) : 0;

    updateCardValue('cardRevenue', totalRevenue);
    updateCardValue('cardExpense', totalExpense);

    const elProfit = document.getElementById('cardProfit');
    if (elProfit) {
        elProfit.innerText = formatNumber(netProfit);
        elProfit.className = `mb-0 fw-bold ${netProfit >= 0 ? 'text-success' : 'text-danger'}`;
        elProfit.closest('.card').className = `card border-0 shadow-sm h-100 border-start border-4 ${netProfit >= 0 ? 'border-success' : 'border-danger'}`;
    }

    const elMargin = document.getElementById('cardProfitMargin');
    if (elMargin) {
        elMargin.innerText = formatNumber(margin) + '%';
        elMargin.className = `mb-0 fw-bold ${margin >= 0 ? 'text-info' : 'text-danger'}`;
    }
}

function updateCardValue(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = formatNumber(value);
}

// ========================================================
// 2. RENDERING (Table UI) - 🔥 UPDATED LOGIC
// ========================================================
function renderEntryTable(data) {
    const tbody = document.getElementById('entryTableBody');
    
    const targetHeader = document.querySelector('th.text-uppercase'); 
    if(targetHeader) {
        targetHeader.innerText = (currentMode === 'daily') ? 'Daily Target' : 'Period Target';
    }

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">No Data Configuration Found.</td></tr>';
        return;
    }

    let html = '';
    
    data.forEach(item => {
        const level = parseInt(item.item_level) || 0;
        const isAuto = item.data_source.includes('AUTO'); // AUTO_STOCK, AUTO_LABOR
        const isCalc = item.data_source === 'CALCULATED';

        // Row Styling
        let rowClass = (level === 0) ? 'level-0' : (level === 1 ? 'level-1' : 'level-deep');
        let indentStyle = (level === 0) ? '' : (level === 1 ? 'padding-left: 1.5rem;' : `padding-left: ${1.5 + (level * 1.5)}rem;`);
        let nameCellClass = (level > 1) ? 'child-item' : '';

        // Icons
        let iconHtml = '';
        if (level === 0) iconHtml = `<i class="fas fa-folder text-primary me-2 fa-lg"></i>`;
        else if (level === 1) iconHtml = `<i class="far fa-folder-open text-secondary me-2"></i>`;
        else iconHtml = `<span class="text-muted opacity-25 me-1" style="font-family: monospace;">└─</span><i class="far fa-file-alt text-muted me-2"></i>`;

        // Badges & Status
        let typeBadge = item.item_type === 'REVENUE' ? `<span class="badge-mini badge-type-rev">R</span>` :
                        item.item_type === 'COGS' ? `<span class="badge-mini badge-type-cogs">C</span>` :
                        `<span class="badge-mini badge-type-exp">E</span>`;

        let sourceBadge = '';
        if (isAuto) {
            sourceBadge = `<span class="badge-mini badge-src-auto" title="Auto System (Read-Only)" data-bs-toggle="tooltip">A</span>`;
        } else if (isCalc) {
            sourceBadge = `<span class="badge-mini badge-src-calc" title="Formula: ${item.calculation_formula || ''}" data-bs-toggle="tooltip" style="cursor:help;">F</span>`;
        } else {
            sourceBadge = `<span class="badge-mini badge-src-manual" title="Manual Input" data-bs-toggle="tooltip">M</span>`;
        }

        // Values
        const actual = parseFloat(item.actual_amount) || 0;
        const target = parseFloat(item.daily_target) || 0;
        
        // Diff Logic
        let diffHtml = '<span class="text-muted opacity-25">-</span>';
        if (target > 0) {
            let diff = actual - target;
            let percent = (diff / target) * 100;
            let colorClass = 'text-muted';
            if (item.item_type === 'REVENUE') {
                if (diff < -0.01) colorClass = 'text-danger fw-bold'; else if (diff > 0.01) colorClass = 'text-success fw-bold';
            } else {
                if (diff > 0.01) colorClass = 'text-danger fw-bold'; else if (diff < -0.01) colorClass = 'text-success fw-bold';
            }
            let arrow = diff > 0 ? '↑' : '↓'; if (Math.abs(diff) < 0.01) arrow = '';
            diffHtml = `<span class="${colorClass}" style="font-size: 0.8rem;" title="Diff: ${formatNumber(diff)}">${arrow} ${Math.abs(percent).toFixed(0)}%</span>`;
        }

        // --- Input Logic (Highlighting) ---
        let inputHtml = '';
        let remarkHtml = '';

        if (currentMode === 'report') {
            inputHtml = `<span class="fw-bold text-dark">${formatNumber(actual)}</span>`;
            remarkHtml = `<span class="text-muted small">-</span>`;
        } else {
            const readonlyAttr = (isAuto || isCalc) ? 'readonly' : '';
            
            // 🔥 Logic สี Input
            let inputClass = 'input-seamless fw-semibold ';
            if (isAuto) {
                // สีเทา สำหรับ Auto System
                inputClass += 'text-secondary bg-secondary bg-opacity-10 cursor-not-allowed'; 
            } else if (isCalc) {
                // สีฟ้า สำหรับ Formula
                inputClass += 'text-primary bg-info bg-opacity-10 cursor-default'; 
            } else {
                // สีปกติ สำหรับ Manual
                inputClass += 'text-dark bg-white'; 
            }

            inputHtml = `
                <input type="text" class="${inputClass}" 
                    value="${formatNumber(actual)}" 
                    data-id="${item.item_id}" ${readonlyAttr}
                    inputmode="decimal" 
                    oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\\..*)\\./g, '$1');"
                    onfocus="removeCommas(this)" 
                    onblur="formatAndSave(this, ${item.item_id})"
                    onkeydown="if(event.key==='Enter') this.blur()">`;
            
            // Remark (Auto System ไม่ควรให้แก้ Remark หรือเปล่า? ปกติให้แก้ได้ แต่ถ้าจะปิดก็เพิ่ม readonly ได้)
            remarkHtml = `
                <input type="text" class="input-seamless text-end text-muted small" 
                       style="font-family: var(--bs-body-font-family); font-weight: normal;"
                       placeholder="..." value="${item.remark || ''}"
                       onblur="formatAndSave(this, ${item.item_id})">`;
        }

        html += `
            <tr class="${rowClass}">
                <td style="${indentStyle}; white-space: nowrap;" class="${nameCellClass} pe-3">
                    <div class="d-flex align-items-center">${iconHtml} <span>${item.item_name}</span></div>
                </td>
                <td class="text-center px-3" style="white-space: nowrap;">
                    <code class="text-muted small bg-light px-1 rounded">${item.account_code}</code>
                </td>

                <td></td> <td class="text-end text-secondary small align-middle" style="font-family: monospace;">
                    ${target > 0 ? formatNumber(target) : '-'}
                </td>

                <td class="text-end" style="width: 140px;">${inputHtml}</td>
                <td class="text-center align-middle">${diffHtml}</td>

                <td class="text-center px-3">
                    <div class="d-flex justify-content-center">${typeBadge}${sourceBadge}</div>
                </td>

                <td class="text-end pe-4" style="width: 200px;">${remarkHtml}</td>
            </tr>`;
    });

    tbody.innerHTML = html;

    /*if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }*/
}

// ========================================================
// 3. INPUT HANDLING, AUTO-SAVE & FORMULA
// ========================================================

function removeCommas(input) {
    if (input.readOnly) return;
    input.value = input.value.replace(/,/g, '');
    input.select();
}

function formatNumber(num) {
    return (parseFloat(num) || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function formatAndSave(input, itemId) {
    // 1. Safety Check
    if (input.readOnly) return;
    if (isSaving) return; // ป้องกันการส่งซ้ำรัวๆ

    // 2. จัดรูปแบบตัวเลขใน Input ให้สวยงาม (ใส่ลูกน้ำ)
    const isRemarkField = input.getAttribute('placeholder') === '...';
    let val = input.value.replace(/,/g, '');
    if (val === '' || isNaN(val)) val = 0;
    const floatVal = parseFloat(val);
    
    if (!isRemarkField) {
        input.value = formatNumber(floatVal);
        
        // 🔥 อัปเดตค่าลงใน currentData (ตัวแปรกลาง) ทันที เพื่อให้พร้อมส่ง
        const itemIndex = currentData.findIndex(d => d.item_id == itemId);
        if (itemIndex > -1) {
            currentData[itemIndex].actual_amount = floatVal;
        }
        
        // รันสูตรคำนวณใหม่ทันที (เพื่อให้ยอดรวมเปลี่ยนก่อน Save)
        runFormulaEngine();
    } else {
        // กรณีแก้ Remark
        const itemIndex = currentData.findIndex(d => d.item_id == itemId);
        if (itemIndex > -1) {
            currentData[itemIndex].remark = input.value;
        }
    }

    // 3. แสดงสถานะ "กำลังบันทึก..." (แบบเงียบๆ ไม่รกตา)
    const statusEl = document.getElementById('saveStatus');
    statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin text-primary me-1"></i> Saving...';
    statusEl.classList.remove('opacity-0');
    statusEl.style.visibility = 'visible';
    isSaving = true;

    // ========================================================
    // 🔥 CORE LOGIC: ส่งข้อมูล "ทั้งหน้า" (Snapshot) ไป Save
    // ========================================================
    try {
        // เตรียม Payload เหมือนปุ่ม Save Day เป๊ะๆ
        const payload = currentData.map(item => ({
            item_id: item.item_id,
            amount: parseFloat(item.actual_amount) || 0,
            remark: item.remark || ''
        }));

        const formData = new FormData();
        formData.append('action', 'save');
        formData.append('entry_date', document.getElementById('targetDate').value);
        formData.append('section', document.getElementById('sectionFilter').value);
        formData.append('items', JSON.stringify(payload));

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            // หน่วงเวลาโชว์คำว่า Saved นิดนึง
            setTimeout(() => {
                statusEl.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i> <span class="text-success fw-bold">Auto Saved</span>';
                // ซ่อนสถานะเมื่อผ่านไป 2 วิ
                setTimeout(() => { 
                    statusEl.classList.add('opacity-0'); 
                }, 2000);
            }, 500);
        } else {
            throw new Error(json.message);
        }
    } catch (err) {
        console.error(err);
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-1"></i> Save Failed';
    } finally {
        isSaving = false;
    }
}

function runFormulaEngine() {
    let hasChanged = false;
    let maxLoop = 5;
    for (let i = 0; i < maxLoop; i++) {
        hasChanged = false;
        currentData.forEach(item => {
            if (item.data_source === 'CALCULATED') {
                const oldVal = parseFloat(item.actual_amount) || 0;
                let newVal = 0;
                try {
                    if (item.calculation_formula && item.calculation_formula.trim().toUpperCase() === 'SUM_CHILDREN') {
                        const children = currentData.filter(child => child.parent_id == item.item_id);
                        newVal = children.reduce((sum, child) => sum + (parseFloat(child.actual_amount) || 0), 0);
                    } else if (item.calculation_formula) {
                        let formula = item.calculation_formula;
                        const matches = formula.match(/\[(.*?)\]/g);
                        if (matches) {
                            matches.forEach(token => {
                                const code = token.replace('[', '').replace(']', '');
                                const refItem = currentData.find(d => d.account_code === code);
                                const refVal = refItem ? (parseFloat(refItem.actual_amount) || 0) : 0;
                                formula = formula.replace(token, refVal);
                            });
                        }
                        const safeFormula = formula.replace(/[^0-9+\-*/(). ]/g, ''); 
                        if (safeFormula.trim() !== '') {
                            newVal = new Function('return ' + safeFormula)();
                        }
                    }
                } catch (e) { newVal = 0; }
                
                if (!isFinite(newVal) || isNaN(newVal)) newVal = 0;
                
                if (Math.abs(newVal - oldVal) > 0.001) {
                    item.actual_amount = newVal;
                    hasChanged = true;
                    // Update DOM
                    const inputEl = document.querySelector(`input[data-id="${item.item_id}"]`);
                    if (inputEl) {
                        inputEl.value = formatNumber(newVal);
                        inputEl.parentElement.classList.add('bg-warning', 'bg-opacity-25');
                        setTimeout(() => inputEl.parentElement.classList.remove('bg-warning', 'bg-opacity-25'), 500);
                    }
                }
            }
        });
        if (!hasChanged) break;
    }
    // Update Top Cards after formula
    calculateSummary(currentData);
}

// ========================================================
// 4. BUDGET MODAL & CALENDAR LOGIC
// ========================================================
function openTargetModal() {
    const modalEl = document.getElementById('targetModal');
    modalEl.removeAttribute('tabindex');
    if (!targetModal) targetModal = new bootstrap.Modal(document.getElementById('targetModal'));
    
    const mainDate = document.getElementById('targetDate').value;
    const monthInput = document.getElementById('budgetMonth');
    monthInput.value = mainDate.slice(0, 7); 

    renderTargetStructure(); 
    monthInput.onchange = loadModalData;
    
    loadModalData(); 
    loadContainerRate(); 
    
    if (!document.getElementById('budgetMonth').value) {
        document.getElementById('budgetMonth').value = new Date().toISOString().slice(0, 7);
    }

    targetModal.show();
}

// Event Listener สำหรับเปลี่ยนเดือน
document.getElementById('budgetMonth').addEventListener('change', () => {
    loadModalData();
    loadContainerRate();
});

async function loadModalData() {
    await Promise.all([ 
        fetchWorkingDays(), 
        fetchMonthlyBudgets(),
        fetchCurrentRate()
    ]);
}

async function fetchCurrentRate() {
    const monthStr = document.getElementById('budgetMonth')?.value;
    if(!monthStr) return;
    const [year, month] = monthStr.split('-');
    
    const displayEl = document.getElementById('currentRateDisplay');
    if(!displayEl) return;

    try {
        const res = await fetch(`api/manage_pl_entry.php?action=get_exchange_rate&year=${year}&month=${month}`);
        const json = await res.json();
        if(json.success) {
            displayEl.value = json.rate.toFixed(2); // แสดงทศนิยม 2 ตำแหน่ง
        } else {
            displayEl.value = '32.00'; // Default
        }
    } catch(e) {
        console.error(e);
        displayEl.value = 'Err';
    }
}

async function fetchWorkingDays() {
    const monthStr = document.getElementById('budgetMonth')?.value;
    if(!monthStr) return;

    const [year, month] = monthStr.split('-');
    const badge = document.getElementById('workingDaysBadge');
    
    if(!badge) return;

    badge.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Counting...';
    badge.className = 'badge bg-secondary text-white shadow-sm user-select-none position-relative';
    
    try {
        const res = await fetch(`api/manage_pl_entry.php?action=get_working_days&year=${year}&month=${month}`);
        const json = await res.json();
        if (json.success) {
            currentWorkingDays = json.days;
            badge.className = 'badge bg-success text-white shadow-sm user-select-none position-relative';
            badge.innerHTML = `
                <i class="far fa-calendar-check me-1"></i>Working Days: ${currentWorkingDays} 
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning border border-light" style="font-size: 0.5rem; padding: 0.3em 0.5em;">
                    <i class="fas fa-pen"></i>
                </span>
            `;
            document.querySelectorAll('.budget-input').forEach(inp => calcPreview(inp));
        }
    } catch (e) { 
        console.error(e);
        badge.innerHTML = 'Error';
    }
}

async function fetchMonthlyBudgets() {
    const monthStr = document.getElementById('budgetMonth').value;
    const [year, month] = monthStr.split('-');
    const section = document.getElementById('sectionFilter').value;

    try {
        const res = await fetch(`api/manage_pl_entry.php?action=get_target_data&year=${year}&month=${month}&section=${section}`);
        const json = await res.json();
        if (json.success) {
            const budgetMap = json.data;
            document.querySelectorAll('.budget-input').forEach(input => {
                const itemId = input.getAttribute('data-id');
                const val = budgetMap[itemId];
                input.value = (val !== undefined && val !== null) ? val : '';
                calcPreview(input);
            });
        }
    } catch (e) { console.error(e); }
}

function renderTargetStructure() {
    const tbody = document.getElementById('budgetTableBody');
    const items = currentData; 
    let html = '';
    
    items.forEach(item => {
        const level = parseInt(item.item_level) || 0;
        const isCalc = item.data_source === 'CALCULATED'; 
        
        let rowClass = '', nameStyle = '', iconHtml = '';
        if (level === 0) {
            rowClass = 'table-info bg-opacity-10'; nameStyle = 'font-weight: 800; color: #055160;'; iconHtml = '<i class="fas fa-folder me-2"></i>';
        } else if (level === 1) {
            rowClass = 'table-light'; nameStyle = 'font-weight: 700; color: #495057; padding-left: 20px;'; iconHtml = '<i class="far fa-folder-open me-2"></i>';
        } else {
            rowClass = ''; let indent = level * 20; nameStyle = `padding-left: ${indent}px; color: #212529;`; iconHtml = '<span class="text-muted opacity-25 me-1" style="font-family: monospace;">└─</span>';
        }

        let inputHtml = isCalc ? `<span class="text-muted small fst-italic">Sum of children</span>` :
            `<input type="number" class="form-control form-control-sm text-end fw-bold text-primary budget-input border-0 bg-white shadow-sm" 
               data-id="${item.item_id}" value="" placeholder="0.00" oninput="calcPreview(this)">`;
        
        let dailyPreview = isCalc ? `<span class="text-muted opacity-25">-</span>` : '-';

        html += `<tr class="${rowClass}">
            <td class="align-middle text-nowrap"><div style="${nameStyle}">${iconHtml} <span class="text-truncate">${item.item_name}</span></div></td>
            <td class="align-middle">${inputHtml}</td>
            <td class="text-end text-muted small align-middle daily-preview pe-4">${dailyPreview}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function calcPreview(input) {
    const val = parseFloat(input.value) || 0;
    const daily = currentWorkingDays > 0 ? (val / currentWorkingDays) : 0; 
    const row = input.closest('tr');
    if(row) row.querySelector('.daily-preview').innerText = formatNumber(daily);
}

async function saveTarget() {
    const inputs = document.querySelectorAll('.budget-input');
    const payload = [];
    inputs.forEach(inp => {
        const val = parseFloat(inp.value);
        if (!isNaN(val)) payload.push({ item_id: inp.getAttribute('data-id'), amount: val });
    });

    const monthStr = document.getElementById('budgetMonth').value; 
    const [year, month] = monthStr.split('-');
    const section = document.getElementById('sectionFilter').value;

    try {
        const formData = new FormData();
        formData.append('action', 'save_target');
        formData.append('year', year); formData.append('month', month);
        formData.append('section', section); formData.append('items', JSON.stringify(payload));

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Budget Saved', timer: 1500, showConfirmButton: false });
            targetModal.hide();
            if(currentMode === 'daily') loadEntryData();
        } else {
            Swal.fire('Error', json.message, 'error');
        }
    } catch (err) { console.error(err); Swal.fire('Error', 'Connection Failed', 'error'); }
}

// ========================================================
// [เพิ่ม] CONTAINER RATE LOGIC
// ========================================================

// 1. ฟังก์ชันโหลดราคาตู้ (เรียกเมื่อเปิด Target Modal หรือเปลี่ยนเดือน)
async function loadContainerRate() {
    const monthInput = document.getElementById('budgetMonth').value; // format: YYYY-MM
    if (!monthInput) return;

    const [year, month] = monthInput.split('-');
    const inputEl = document.getElementById('targetContainerRate');

    // ใส่ Loading ชั่วคราว
    inputEl.value = '';
    inputEl.placeholder = 'Loading...';
    inputEl.disabled = true;

    try {
        const res = await fetch(`api/manage_pl_entry.php?action=get_container_rate&year=${year}&month=${month}`);
        const json = await res.json();

        if (json.success) {
            inputEl.value = parseFloat(json.rate).toFixed(2);
        }
    } catch (err) {
        console.error("Load Container Rate Error:", err);
    } finally {
        inputEl.disabled = false;
        inputEl.placeholder = '0.00';
    }
}

// 2. ฟังก์ชันบันทึกราคาตู้ (เรียกเมื่อพิมพ์เสร็จแล้วกด Enter หรือคลิกออก)
async function saveContainerRate() {
    const monthInput = document.getElementById('budgetMonth').value;
    const rateVal = document.getElementById('targetContainerRate').value;
    const [year, month] = monthInput.split('-');

    if (!rateVal) return;

    try {
        const res = await fetch('api/manage_pl_entry.php?action=save_container_rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                year: year,
                month: month,
                rate: rateVal
            })
        });
        const json = await res.json();
        
        if (json.success) {
            // แสดง Toast เล็กๆ ว่าบันทึกแล้ว (Optional)
            const Toast = Swal.mixin({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
                didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
            });
            Toast.fire({ icon: 'success', title: 'Container Rate Saved' });
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Cannot save container rate', 'error');
    }
}

// ========================================================
// 5. CALENDAR (FullCalendar)
// ========================================================

function openCalendarModal() {
    if (!calendarModal) calendarModal = new bootstrap.Modal(document.getElementById('calendarModal'));
    calendarModal.show();
    
    setTimeout(() => {
        if (!calendarInstance) {
            const el = document.getElementById('fullCalendarEl');
            calendarInstance = new FullCalendar.Calendar(el, {
                initialView: 'dayGridMonth',
                height: '100%',
                headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
                initialDate: document.getElementById('budgetMonth').value + '-01', 
                events: 'api/manage_pl_entry.php?action=calendar_read',
                dateClick: (info) => openHolidayEditor(info.dateStr, null),
                eventClick: (info) => { info.jsEvent.preventDefault(); openHolidayEditor(info.event.startStr, info.event); }
            });
            calendarInstance.render();
        } else {
            calendarInstance.gotoDate(document.getElementById('budgetMonth').value + '-01');
            calendarInstance.render();
        }
    }, 200);

    document.getElementById('calendarModal').addEventListener('hidden.bs.modal', () => {
        fetchWorkingDays(); 
    });
}

function openHolidayEditor(dateStr, eventObj) {
    if (!editorModal) editorModal = new bootstrap.Modal(document.getElementById('holidayEditorModal'));
    
    document.getElementById('hDate').value = dateStr;
    document.getElementById('hDateDisplay').innerText = dateStr;
    document.getElementById('holidayForm').reset();
    
    const btnDelete = document.getElementById('btnDeleteHoliday');

    if (eventObj) {
        document.getElementById('editorTitle').innerText = 'Edit Holiday';
        document.getElementById('hDesc').value = eventObj.title;
        document.getElementById('hType').value = eventObj.extendedProps.day_type;
        document.getElementById('hWorkRate').value = eventObj.extendedProps.work_rate;
        document.getElementById('hOtRate').value = eventObj.extendedProps.ot_rate;
        btnDelete.style.display = 'block';
        btnDelete.onclick = () => deleteHoliday(dateStr);
    } else {
        document.getElementById('editorTitle').innerText = 'Add New Holiday';
        document.getElementById('hWorkRate').value = 2.0;
        document.getElementById('hOtRate').value = 3.0;
        btnDelete.style.display = 'none';
    }
    editorModal.show();
}

async function saveHoliday() {
    const dateVal = document.getElementById('hDate').value;
    const typeVal = document.getElementById('hType').value;
    
    if (typeVal === 'NORMAL') {
        await apiCalendarAction('calendar_delete', {date: dateVal});
        return;
    }

    const payload = {
        date: dateVal, description: document.getElementById('hDesc').value, day_type: typeVal,
        work_rate: document.getElementById('hWorkRate').value, ot_rate: document.getElementById('hOtRate').value
    };
    if (!payload.description) return Swal.fire('Warning', 'Please enter description', 'warning');
    
    await apiCalendarAction('calendar_save', payload);
}

async function deleteHoliday(dateStr) {
    if (!await Swal.fire({title: 'Delete Holiday?', icon: 'warning', showCancelButton: true}).then(r=>r.isConfirmed)) return;
    await apiCalendarAction('calendar_delete', {date: dateStr});
}

async function apiCalendarAction(action, payload) {
    try {
        const res = await fetch(`api/manage_pl_entry.php?action=${action}`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            editorModal.hide();
            calendarInstance.refetchEvents();
        } else { Swal.fire('Error', json.message, 'error'); }
    } catch (e) { console.error(e); }
}

// ========================================================
// 6. EXPORT LOGIC (Client-Side SheetJS)
// ========================================================
async function exportPLToExcel() {
    // 1. เตรียม Parameter
    const section = document.getElementById('sectionFilter').value;
    let url = '';
    let filename = '';

    // สร้างชื่อไฟล์ให้สวยงาม
    const timestamp = new Date().toISOString().slice(0,19).replace(/[-:]/g,"").replace("T","_");
    const safeSection = section.replace(/[^a-zA-Z0-9]/g, "_");

    // เช็ค Mode ว่าจะเอา Daily หรือ Report Range
    if (currentMode === 'daily') {
        const date = document.getElementById('targetDate').value;
        url = `api/manage_pl_entry.php?action=read&entry_date=${date}&section=${section}`;
        filename = `PL_Daily_${date}_${safeSection}_${timestamp}.xlsx`;
    } else {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        url = `api/manage_pl_entry.php?action=report_range&start_date=${start}&end_date=${end}&section=${section}`;
        filename = `PL_Report_${start}_to_${end}_${safeSection}_${timestamp}.xlsx`;
    }

    // Show Loading
    Swal.fire({
        title: 'Generating Excel...',
        html: 'Please wait while we process the data.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // 2. ดึงข้อมูล JSON จาก API
        const response = await fetch(url);
        const json = await response.json();

        if (!json.success || !json.data || json.data.length === 0) {
            Swal.fire('No Data', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info');
            return;
        }

        // 3. จัดเตรียมข้อมูลลง Excel Rows
        const excelRows = [
            ["Item Name", "Account Code", "Target", "Actual", "Diff", "Note", "Source"] // Header Row
        ];

        json.data.forEach(item => {
            // ย่อหน้าชื่อตาม Level (Visual Indent)
            let indent = "    ".repeat(parseInt(item.item_level) || 0);
            
            // คำนวณ Diff
            const target = parseFloat(item.daily_target) || 0;
            const actual = parseFloat(item.actual_amount) || 0;
            const diff = actual - target;

            excelRows.push([
                indent + item.item_name,    // A
                item.account_code,          // B
                target,                     // C
                actual,                     // D
                diff,                       // E
                item.remark || "",          // F
                item.data_source            // G
            ]);
        });

        // 4. สร้าง Workbook
        const worksheet = XLSX.utils.aoa_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "PL_Data");

        // จัดความกว้างคอลัมน์
        worksheet['!cols'] = [
            { wch: 40 }, // Name
            { wch: 15 }, // Code
            { wch: 15 }, // Target
            { wch: 15 }, // Actual
            { wch: 15 }, // Diff
            { wch: 30 }, // Note
            { wch: 20 }  // Source
        ];

        // 5. ดาวน์โหลด
        XLSX.writeFile(workbook, filename);
        
        Swal.close(); // ปิด Loading

    } catch (error) {
        console.error("Export Error:", error);
        Swal.fire('Export Failed', error.message, 'error');
    }
}

// ========================================================
// 7. DASHBOARD CHARTS
// ========================================================
function updateDashboardCharts(data) {
    if (typeof Chart === 'undefined') return;

    let revenue = { actual: 0, target: 0 };
    let cogs = { actual: 0, target: 0 };
    let expense = { actual: 0, target: 0 };

    data.forEach(item => {
        let act = parseFloat(item.actual_mtd) || 0;
        let tgt = parseFloat(item.target_monthly) || 0;

        if (item.item_type === 'REVENUE') {
            revenue.actual += act; revenue.target += tgt;
        } else if (item.item_type === 'COGS') {
            cogs.actual += act; cogs.target += tgt;
        } else { 
            expense.actual += act; expense.target += tgt;
        }
    });

    const netProfit = revenue.actual - cogs.actual - expense.actual;
    const netProfitTarget = revenue.target - cogs.target - expense.target;

    const ctxBar = document.getElementById('chartPerformance');
    if(ctxBar) {
        if (chartPerformance) chartPerformance.destroy();
        chartPerformance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Revenue', 'COGS', 'Expense', 'Net Profit'],
                datasets: [
                    {
                        label: 'Target (Month)',
                        data: [revenue.target, cogs.target, expense.target, netProfitTarget],
                        backgroundColor: 'rgba(200, 200, 200, 0.3)',
                        borderColor: 'rgba(150, 150, 150, 1)',
                        borderWidth: 1,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Actual (MTD)',
                        data: [revenue.actual, cogs.actual, expense.actual, netProfit],
                        backgroundColor: [
                            'rgba(13, 110, 253, 0.8)',
                            'rgba(255, 193, 7, 0.8)',
                            'rgba(220, 53, 69, 0.8)',
                            (netProfit >= 0 ? 'rgba(25, 135, 84, 0.8)' : 'rgba(220, 53, 69, 0.8)')
                        ],
                        borderWidth: 0,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    datalabels: {
                        anchor: 'end', align: 'top',
                        formatter: (val) => val === 0 ? '' : formatNumberShort(val),
                        font: { size: 11, weight: 'bold' }
                    }
                },
                scales: { y: { beginAtZero: true, grid: { display: false } } }
            },
            plugins: [ChartDataLabels]
        });
    }

    const ctxPie = document.getElementById('chartStructure');
    if(ctxPie) {
        if (chartStructure) chartStructure.destroy();
        chartStructure = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['COGS', 'Expense', 'Profit'],
                datasets: [{
                    data: [cogs.actual, expense.actual, (netProfit > 0 ? netProfit : 0)],
                    backgroundColor: ['#ffc107', '#dc3545', '#198754'],
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12 } },
                    datalabels: {
                        color: '#fff',
                        formatter: (val, ctx) => {
                            let sum = 0;
                            ctx.chart.data.datasets[0].data.map(d => sum += d);
                            if(sum === 0) return '';
                            let pct = (val*100 / sum).toFixed(0) + "%";
                            return pct === '0%' ? '' : pct;
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }
}

function renderDashboardCards(data) {
    const grid = document.getElementById('dashboardGrid');
    if (!data || data.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5">No Data Found</div>';
        return;
    }

    grid.innerHTML = data.map(item => {
        const pct = parseFloat(item.progress_percent);
        const isRev = item.item_type === 'REVENUE';
        
        let colorClass = 'bg-primary';
        let textClass = 'text-primary';

        if (isRev) {
            if (pct >= 100) { colorClass = 'bg-success'; textClass = 'text-success'; }
            else if (pct >= 80) { colorClass = 'bg-warning'; textClass = 'text-warning'; }
            else { colorClass = 'bg-danger'; textClass = 'text-danger'; }
        } else {
            if (pct > 100) { colorClass = 'bg-danger'; textClass = 'text-danger'; }
            else { colorClass = 'bg-success'; textClass = 'text-success'; }
        }

        return `
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="card border-0 shadow-sm p-3 dashboard-card h-100">
                    <div class="progress-label">
                        <span class="text-truncate" title="${item.item_name}">${item.item_name}</span>
                        <span class="${textClass}">${pct.toFixed(0)}%</span>
                    </div>
                    
                    <div class="d-flex align-items-end justify-content-between mb-2">
                         <div class="value-mtd text-dark">${formatNumberShort(item.actual_mtd)}</div>
                         <div class="text-target small">Target: ${formatNumberShort(item.target_monthly)}</div>
                    </div>
                    
                    <div class="progress bg-light">
                        <div class="progress-bar ${colorClass}" role="progressbar" style="width: ${Math.min(pct, 100)}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function formatNumberShort(num) {
    num = parseFloat(num) || 0; 
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function openRateModal() {
    const dateVal = document.getElementById('targetDate').value;
    const [year, month] = dateVal.split('-');
    
    let currentRate = 32.0;
    try {
        const res = await fetch(`api/manage_pl_entry.php?action=get_exchange_rate&year=${year}&month=${month}`);
        const json = await res.json();
        if(json.success) currentRate = json.rate;
    } catch(e) {}

    // 2. เปิด Popup
    const { value: newRate } = await Swal.fire({
        title: `Exchange Rate (${month}/${year})`,
        text: "กำหนดอัตราแลกเปลี่ยน (USD -> THB)",
        input: 'number',
        inputValue: currentRate,
        
        target: document.getElementById('targetModal'), 
        didOpen: () => document.querySelector('.swal2-input')?.focus(),

        showCancelButton: true,
        confirmButtonText: 'Save Rate',
        confirmButtonColor: '#ffc107',
        inputValidator: (value) => {
            if (!value || value <= 0) return 'กรุณาระบุตัวเลขที่ถูกต้อง';
        }
    });

    // 3. บันทึก
    if (newRate) {
        try {
            const res = await fetch('api/manage_pl_entry.php?action=save_exchange_rate', {
                method: 'POST',
                body: JSON.stringify({ year, month, rate: newRate })
            });
            const json = await res.json();
            if(json.success) {
                Swal.fire('Saved', `Exchange Rate: ${newRate} THB/USD`, 'success');
                loadEntryData();
                fetchCurrentRate();
            }
        } catch(e) {
            Swal.fire('Error', 'Connection failed', 'error');
        }
    }
}

// ========================================================
// 8. SNAPSHOT LOGIC (SAVE ALL)
// ========================================================

async function saveDailySnapshot() {
    if (currentMode !== 'daily') return;

    // 1. ถามยืนยันก่อน (เผื่อมือกดพลาด)
    const result = await Swal.fire({
        title: 'Confirm Daily Snapshot?',
        text: "ระบบจะบันทึกค่าทุกช่อง (ทั้ง Manual และ Auto) ณ เวลานี้เก็บไว้ เพื่อป้องกันตัวเลขเปลี่ยนในอนาคต",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        confirmButtonText: '<i class="fas fa-save"></i> Confirm Save',
        cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    // 2. เตรียมข้อมูล (ดึงจาก currentData ซึ่งมีค่าล่าสุดที่คำนวณแล้ว)
    const payload = currentData.map(item => ({
        item_id: item.item_id,
        amount: parseFloat(item.actual_amount) || 0, // เอาค่าที่โชว์อยู่ตอนนี้
        remark: item.remark || ''
    }));

    // 3. แสดงสถานะกำลังบันทึก
    const statusEl = document.getElementById('saveStatus');
    statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin text-primary me-1"></i> Saving Snapshot...';
    statusEl.classList.remove('opacity-0');
    isSaving = true;

    try {
        const formData = new FormData();
        formData.append('action', 'save');
        formData.append('entry_date', document.getElementById('targetDate').value);
        formData.append('section', document.getElementById('sectionFilter').value);
        formData.append('items', JSON.stringify(payload));

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            Swal.fire({
                icon: 'success',
                title: 'Snapshot Saved!',
                text: 'บันทึกข้อมูลประจำวันเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });
            statusEl.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i> <span class="text-success fw-bold">Snapshot Saved</span>';
            
            // โหลดข้อมูลใหม่เพื่อให้มั่นใจว่าดึงจาก DB มาโชว์
            loadEntryData(); 
        } else {
            throw new Error(json.message);
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Save Failed', err.message, 'error');
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-1"></i> Save Failed';
    } finally {
        isSaving = false;
    }
}