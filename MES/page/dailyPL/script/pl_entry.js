"use strict";

// ========================================================
// GLOBAL VARIABLES
// ========================================================
let currentData = [];
let currentMode = 'daily'; // 'daily' or 'report'
let isSaving = false;
let isPeriodLocked = false;
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
    const dateInput = document.getElementById('targetDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    await loadSectionList();
    loadEntryData();

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
            
            select.innerHTML += '<option value="ALL">-- All Lines --</option>';

            json.data.forEach(line => {
                const option = document.createElement('option');
                option.value = line;
                option.textContent = line;
                select.appendChild(option);
            });

            if (savedSection && json.data.includes(savedSection)) {
                select.value = savedSection;
            } else {
                if (json.data.length > 0) {
                    select.value = json.data[0]; 
                }
            }
        }
    } catch (e) {
        console.error("Failed to load sections:", e);
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
        btnSave.style.display = (mode === 'daily') ? 'inline-block' : 'none';
    }

    const viewExec = document.getElementById('view-executive');
    if (viewExec) viewExec.classList.remove('active');

    // 2. เคลียร์คลาส Active ออกจาก View ทุกหน้า
    document.getElementById('view-table').classList.remove('active');
    document.getElementById('view-dashboard').classList.remove('active');
    const viewStatement = document.getElementById('view-statement');
    if (viewStatement) viewStatement.classList.remove('active'); // บังคับซ่อน

    document.getElementById('btnSetBudgetWrapper').style.display = 'none';
    document.getElementById('saveStatus').style.visibility = 'hidden';

    // 3. แสดงเฉพาะหน้าที่เลือก
    if (mode === 'daily') {
        document.getElementById('dailyPickerGroup').classList.remove('d-none');
        document.getElementById('view-table').classList.add('active');
        document.getElementById('btnSetBudgetWrapper').style.display = 'block';
        document.getElementById('saveStatus').style.visibility = 'visible';
        loadEntryData();

    } else if (mode === 'dashboard') {
        const rangeGroup = document.getElementById('rangePickerGroup');
        rangeGroup.classList.remove('d-none');
        rangeGroup.classList.add('d-flex');
        if(btnDashGo) btnDashGo.classList.remove('d-none');
        
        document.getElementById('view-dashboard').classList.add('active');
        loadDashboardData();

    } else if (mode === 'report') {
        const rangeGroup = document.getElementById('rangePickerGroup');
        rangeGroup.classList.remove('d-none');
        rangeGroup.classList.add('d-flex');
        
        document.getElementById('view-table').classList.add('active');
        loadEntryData();

    } else if (mode === 'statement') {
        if (viewStatement) viewStatement.classList.add('active');
        loadStatementData();

    } else if (mode === 'executive') {
        if (viewExec) viewExec.classList.add('active');
        document.getElementById('view-executive').style.display = 'flex';
        loadExecutiveData();
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
// 2. RENDERING (Table UI)
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

        let inputHtml = '';
        let remarkHtml = '';

        if (currentMode === 'report') {
            inputHtml = `<span class="fw-bold text-dark">${formatNumber(actual)}</span>`;
            remarkHtml = `<span class="text-muted small">-</span>`;
        } else {
            const readonlyAttr = (isAuto || isCalc) ? 'readonly' : '';
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
            
            remarkHtml = `
                <input type="text" class="input-seamless text-end text-muted small" 
                    style="font-family: var(--bs-body-font-family); font-weight: normal;"
                    placeholder="..." value="${item.remark || ''}"
                    maxlength="255"
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
    if (input.readOnly) return;
    if (isSaving) return;

    const isRemarkField = input.getAttribute('placeholder') === '...';
    let val = input.value.replace(/,/g, '');
    if (val === '' || isNaN(val)) val = 0;
    const floatVal = parseFloat(val);
    
    if (!isRemarkField) {
        input.value = formatNumber(floatVal);
        const itemIndex = currentData.findIndex(d => d.item_id == itemId);
        if (itemIndex > -1) {
            currentData[itemIndex].actual_amount = floatVal;
        }
        runFormulaEngine();
    } else {
        const itemIndex = currentData.findIndex(d => d.item_id == itemId);
        if (itemIndex > -1) {
            currentData[itemIndex].remark = input.value;
        }
    }

    const statusEl = document.getElementById('saveStatus');
    statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin text-primary me-1"></i> Saving...';
    statusEl.classList.remove('opacity-0');
    statusEl.style.visibility = 'visible';
    isSaving = true;

    try {
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
            setTimeout(() => {
                statusEl.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i> <span class="text-success fw-bold">Auto Saved</span>';
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
                            try {
                                newVal = new Function('return ' + safeFormula)();
                            } catch(e) {
                                newVal = 0;
                                console.warn(`Formula Error on Code ${item.account_code}:`, e);
                            }
                        }
                    }
                } catch (e) { newVal = 0; }
                
                if (!isFinite(newVal) || isNaN(newVal)) newVal = 0;
                
                if (Math.abs(newVal - oldVal) > 0.001) {
                    item.actual_amount = newVal;
                    hasChanged = true;
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
            displayEl.value = json.rate.toFixed(2);
        } else {
            displayEl.value = '32.00';
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
                
                eventContent: function(info) {
                    let title = info.event.title || info.event.extendedProps.day_type;
                    let exRate = info.event.extendedProps.ex_rate;
                    let ctnRate = info.event.extendedProps.ctn_rate;
                    
                    // บรรทัดแรก: ชื่อวัน 
                    let html = `<div class="text-truncate fw-bold" style="font-size: 0.8rem;">${title}</div>`;
                    
                    // บรรทัดที่สอง: นำ Ex และ Ctn มาเรียงต่อกันในบรรทัดเดียว
                    if (exRate || ctnRate) {
                        let details = [];
                        if (exRate) {
                            details.push(`<i class="fas fa-dollar-sign"></i> ${parseFloat(exRate).toFixed(2)}`);
                        }
                        if (ctnRate) {
                            // ย่อตัวเลข Ctn ให้สั้นลง (เช่น 15500 -> 15.5k) เพื่อประหยัดพื้นที่
                            let ctnFmt = parseFloat(ctnRate);
                            ctnFmt = ctnFmt >= 1000 ? (ctnFmt/1000).toFixed(1) + 'k' : ctnFmt.toString();
                            details.push(`<i class="fas fa-truck"></i> ${ctnFmt}`);
                        }
                  
                        html += `<div style="font-size: 0.7rem; opacity: 0.85; margin-top: 2px;">${details.join(' &nbsp;|&nbsp; ')}</div>`;
                    }
                    
                    return { html: `<div class="p-1" style="line-height: 1.1;">${html}</div>` };
                },

                // (โค้ดลงสีเดิม)
                eventDidMount: function(info) {
                    const type = info.event.extendedProps.day_type;
                    if (type === 'HOLIDAY') {
                        info.el.style.backgroundColor = 'var(--bs-danger)';
                        info.el.style.borderColor = 'var(--bs-danger)';
                        info.el.style.color = '#fff';
                    } else if (type === 'OFFDAY') {
                        info.el.style.backgroundColor = 'var(--bs-warning)';
                        info.el.style.borderColor = 'var(--bs-warning)';
                        info.el.style.color = '#000';
                    } else if (type === 'SUNDAY') {
                        info.el.style.backgroundColor = 'var(--bs-secondary)';
                        info.el.style.borderColor = 'var(--bs-secondary)';
                        info.el.style.color = '#fff';
                    } else if (type === 'NORMAL') {
                        info.el.style.backgroundColor = 'var(--bs-success)';
                        info.el.style.borderColor = 'var(--bs-success)';
                        info.el.style.color = '#fff';
                    }
                },

                dateClick: (info) => {
                    const existingEvent = calendarInstance.getEvents().find(e => e.startStr === info.dateStr);
                    openHolidayEditor(info.dateStr, existingEvent || null);
                },
                eventClick: (info) => { 
                    info.jsEvent.preventDefault(); 
                    openHolidayEditor(info.event.startStr, info.event); 
                }
            });
            calendarInstance.render();
        } else {
            calendarInstance.gotoDate(document.getElementById('budgetMonth').value + '-01');
            calendarInstance.refetchEvents(); // 🔥 เพิ่มการ Refetch ดึงข้อมูลใหม่มาอัปเดตทุกครั้งที่เปิด Modal
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
    
    const hType = document.getElementById('hType');
    if (!Array.from(hType.options).some(opt => opt.value === 'SUNDAY')) {
        hType.add(new Option('⚪ Sunday (วันอาทิตย์)', 'SUNDAY'));
    }
    
    const btnDelete = document.getElementById('btnDeleteHoliday');

    if (eventObj) {
        document.getElementById('editorTitle').innerText = 'Edit Date: ' + dateStr;
        document.getElementById('hDesc').value = eventObj.title || '';
        document.getElementById('hType').value = eventObj.extendedProps.day_type || 'NORMAL';
        document.getElementById('hWorkRate').value = eventObj.extendedProps.work_rate;
        document.getElementById('hOtRate').value = eventObj.extendedProps.ot_rate;
        
        // 🔥 โค้ดที่เพิ่มใหม่: เช็ค Null ถ้าไม่มีให้แสดง "-"
        let exRate = eventObj.extendedProps.ex_rate;
        let ctnRate = eventObj.extendedProps.ctn_rate;
        document.getElementById('hExRate').value = (exRate !== null && exRate !== "") ? parseFloat(exRate).toFixed(2) : "-";
        document.getElementById('hCtnRate').value = (ctnRate !== null && ctnRate !== "") ? parseFloat(ctnRate).toFixed(2) : "-";

        if(eventObj.extendedProps.day_type === 'NORMAL') {
            btnDelete.style.display = 'none';
        } else {
            btnDelete.style.display = 'block';
            btnDelete.onclick = () => deleteHoliday(dateStr);
        }
        
    } else {
        document.getElementById('editorTitle').innerText = 'Add Config: ' + dateStr;
        document.getElementById('hType').value = 'HOLIDAY';
        document.getElementById('hWorkRate').value = 2.0;
        document.getElementById('hOtRate').value = 3.0;
        
        // 🔥 โค้ดที่เพิ่มใหม่: วันใหม่ที่ไม่เคยมีในระบบ
        document.getElementById('hExRate').value = "-";
        document.getElementById('hCtnRate').value = "-";

        btnDelete.style.display = 'none';
    }
    editorModal.show();
}
async function saveHoliday() {
    const dateVal = document.getElementById('hDate').value;
    const typeVal = document.getElementById('hType').value;

    let workRate = document.getElementById('hWorkRate').value;
    let otRate = document.getElementById('hOtRate').value;
    let desc = document.getElementById('hDesc').value;

    if (typeVal === 'NORMAL') {
        workRate = 1.0;
        otRate = 1.5;
        if (!desc) desc = 'Normal Working Day';
    } else {
        if (!desc) return Swal.fire('Warning', 'Please enter description', 'warning');
    }

    const payload = {
        date: dateVal, 
        description: desc, 
        day_type: typeVal,
        work_rate: workRate, 
        ot_rate: otRate
    };
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
    const section = document.getElementById('sectionFilter').value;
    let url = '';
    let filename = '';
    const timestamp = new Date().toISOString().slice(0,19).replace(/[-:]/g,"").replace("T","_");
    const safeSection = section.replace(/[^a-zA-Z0-9]/g, "_");

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
    Swal.fire({
        title: 'Generating Excel...',
        html: 'Please wait while we process the data.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const response = await fetch(url);
        const json = await response.json();

        if (!json.success || !json.data || json.data.length === 0) {
            Swal.fire('No Data', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info');
            return;
        }

        const excelRows = [
            ["Item Name", "Account Code", "Target", "Actual", "Diff", "Note", "Source"]
        ];

        json.data.forEach(item => {
            let indent = "    ".repeat(parseInt(item.item_level) || 0);
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
        const worksheet = XLSX.utils.aoa_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "PL_Data");
        worksheet['!cols'] = [
            { wch: 40 }, // Name
            { wch: 15 }, // Code
            { wch: 15 }, // Target
            { wch: 15 }, // Actual
            { wch: 15 }, // Diff
            { wch: 30 }, // Note
            { wch: 20 }  // Source
        ];
        XLSX.writeFile(workbook, filename);
        Swal.close();
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
        } else if (item.item_type === 'EXPENSE') { // <-- ล็อคเงื่อนไข ป้องกันการเอาหัวข้อกำไรไปบวกในค่าใช้จ่าย
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

async function saveDailySnapshot(silent = false) {
    if (currentMode !== 'daily') return;
    if (isPeriodLocked) return; // ล็อคแล้วห้ามเซฟ
    if (isSaving) return; // กัน Double Submit
    isSaving = true;

    const result = await Swal.fire({
        title: 'Confirm Daily Snapshot?',
        text: "ระบบจะบันทึกค่าทุกช่อง (ทั้ง Manual และ Auto) ณ เวลานี้เก็บไว้ เพื่อป้องกันตัวเลขเปลี่ยนในอนาคต",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        confirmButtonText: '<i class="fas fa-save"></i> Confirm Save',
        cancelButtonText: 'Cancel'
    });

    // ถ้ากดยกเลิก ต้องปลด isSaving เพื่อให้กดใหม่ได้
    if (!result.isConfirmed) {
        isSaving = false;
        return;
    }

    const btnSave = document.getElementById('btnSaveSnapshot');
    if(btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
    }

    const payload = currentData.map(item => ({
        item_id: item.item_id,
        amount: parseFloat(item.actual_amount) || 0,
        remark: item.remark || ''
    }));

    const statusEl = document.getElementById('saveStatus');
    statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin text-primary me-1"></i> Saving Snapshot...';
    statusEl.classList.remove('opacity-0');

    // ดึงค่าวันที่และแผนกจากหน้าจอโดยตรง (แก้บั๊ก ReferenceError)
    const targetDate = document.getElementById('targetDate').value;
    const targetSection = document.getElementById('sectionFilter').value;

    try {
        const formData = new FormData();
        formData.append('action', 'save_batch');
        formData.append('entry_date', targetDate);
        formData.append('section', targetSection);
        formData.append('items', JSON.stringify(payload));

        const response = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        const res = await response.json();

        if (res.success) {
            if (!silent) Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: 'success', title: 'Snapshot Saved!' });
            // ถ้า save สำเร็จ ไม่จำเป็นต้องโหลดหน้าใหม่ทั้งหมด แต่ให้คำนวณสูตรซ้ำเพื่อความชัวร์
            runFormulaEngine(); 
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Failed to save', 'error');
    } finally {
        isSaving = false; // คืนค่าปลดล็อคให้ปุ่มกดต่อได้
        if(btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-save me-1"></i> Save Day';
        }
    }
}

// ========================================================
// [NEW] DASHBOARD DATA LOADER (HEADLESS FORMULA ENGINE)
// ========================================================
async function loadDashboardData() {
    const grid = document.getElementById('dashboardGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2 text-muted small fw-bold">Loading Dashboard Metrics...</div>
            </div>`;
    }

    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const section = document.getElementById('sectionFilter').value;

    try {
        const response = await fetch(`api/manage_pl_entry.php?action=dashboard_stats&start_date=${start}&end_date=${end}&section=${section}`);
        const json = await response.json();

        if (json.success) {
            let currentData = json.data;
            
            // ---------------------------------------------------------
            // 🔥 ADVANCED IN-MEMORY FORMULA ENGINE (รองรับ SUM_CHILDREN)
            // ---------------------------------------------------------
            let mapAct = {};
            let mapTgt = {};
            
            // 1. โหลดค่าดิบตั้งต้นลง Map
            currentData.forEach(item => {
                mapAct[item.account_code] = parseFloat(item.actual_mtd) || 0;
                mapTgt[item.account_code] = parseFloat(item.target_monthly) || 0;
            });

            // 2. ฟังก์ชันช่วย: หาผลรวมของลูก (SUM_CHILDREN)
            function sumChildren(parentId, type) {
                let total = 0;
                const children = currentData.filter(c => parseInt(c.parent_id) === parseInt(parentId));
                children.forEach(c => {
                    total += (type === 'act') ? (mapAct[c.account_code] || 0) : (mapTgt[c.account_code] || 0);
                });
                return total;
            }

            // 3. กรองเฉพาะช่องที่ต้องคำนวณสูตร และเรียงจากลูกไปหาแม่ (Bottom-Up)
            // เพื่อให้ลูกถูกคำนวณเสร็จก่อน แล้วค่อยเอาผลลัพธ์ของลูกไปคำนวณแม่
            let calcItems = currentData.filter(item => item.data_source === 'CALCULATED');
            calcItems.sort((a, b) => parseInt(b.item_level) - parseInt(a.item_level));

            // 4. วนลูปคำนวณ (ทำซ้ำ 3 รอบเผื่อกรณีมีสูตรซ้อนสูตร)
            for(let i = 0; i < 3; i++) {
                let changed = false;
                calcItems.forEach(item => {
                    let formula = (item.calculation_formula || "").trim();
                    let newAct = mapAct[item.account_code];
                    let newTgt = mapTgt[item.account_code];

                    if (formula === "SUM_CHILDREN") {
                        newAct = sumChildren(item.item_id, 'act');
                        newTgt = sumChildren(item.item_id, 'tgt');
                    } 
                    else if (formula !== "") {
                        let fAct = formula;
                        let fTgt = formula;
                        
                        let matches = formula.match(/\[(.*?)\]/g);
                        if (matches) {
                            matches.forEach(m => {
                                let code = m.replace('[', '').replace(']', '');
                                fAct = fAct.replace(m, mapAct[code] || 0);
                                fTgt = fTgt.replace(m, mapTgt[code] || 0);
                            });
                            
                            try {
                                newAct = new Function('return ' + fAct)();
                                newTgt = new Function('return ' + fTgt)();
                            } catch(e) {}
                        }
                    }

                    if (!isFinite(newAct) || isNaN(newAct)) newAct = 0;
                    if (!isFinite(newTgt) || isNaN(newTgt)) newTgt = 0;

                    if (mapAct[item.account_code] !== newAct || mapTgt[item.account_code] !== newTgt) {
                        mapAct[item.account_code] = newAct;
                        mapTgt[item.account_code] = newTgt;
                        changed = true;
                    }
                });
                if (!changed) break; // ถ้านิ่งแล้วหยุดลูปเลย
            }

            // 5. ส่งค่าที่คำนวณเสร็จกลับเข้า Array หลัก
            currentData.forEach(item => {
                item.actual_mtd = mapAct[item.account_code] || 0;
                item.target_monthly = mapTgt[item.account_code] || 0;
                
                const tgt = parseFloat(item.target_monthly);
                const act = parseFloat(item.actual_mtd);
                item.progress_percent = (tgt > 0) ? (act / tgt * 100) : 0;
            });
            // ---------------------------------------------------------

            // 6. กรองเอาเฉพาะข้อมูลแม่สุด (Level 0 / ไม่มี Parent) ไปสร้างการ์ดและกราฟ
            const rootItems = currentData.filter(item => !item.parent_id || parseInt(item.parent_id) === 0);

            if (typeof renderDashboardCards === 'function') renderDashboardCards(rootItems);
            if (typeof updateDashboardCharts === 'function') updateDashboardCharts(rootItems);
            
        } else {
            if (grid) grid.innerHTML = `<div class="col-12 text-center text-danger py-5 fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>${json.message}</div>`;
        }
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        if (grid) grid.innerHTML = '<div class="col-12 text-center text-danger py-5 fw-bold"><i class="fas fa-wifi me-2"></i>Connection Error</div>';
    }
}

async function loadStatementData() {
    const tbody = document.getElementById('statementTableBody');
    const section = document.getElementById('sectionFilter').value;

    tbody.innerHTML = '<tr><td class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        let res, json;
        if (currentStatementView === 'yearly') {
            const year = document.getElementById('statementYear').value;
            res = await fetch(`api/manage_pl_entry.php?action=statement_yearly&year=${year}&section=${section}`);
            json = await res.json();
            if (json.success) {
                calculateStatementFormulas(json.data, 'yearly');
                renderStatementTableYearly(json.data, year); // เปลี่ยนชื่อฟังก์ชันเดิมเป็น renderStatementTableYearly
            }
        } else {
            const monthStr = document.getElementById('statementMonth').value;
            const [year, month] = monthStr.split('-');
            res = await fetch(`api/manage_pl_entry.php?action=statement_daily&year=${year}&month=${month}&section=${section}`);
            json = await res.json();
            if (json.success) {
                calculateStatementFormulas(json.data, 'daily');
                renderStatementTableDaily(json.data, year, month);
            }
        }
        
        if (!json.success) tbody.innerHTML = `<tr><td class="text-center text-danger py-5">${json.message}</td></tr>`;
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

function calculateStatementFormulas(data, mode) {
    let maxLoop = 5;
    let limit = (mode === 'yearly') ? 12 : 31;
    let prefix = (mode === 'yearly') ? 'm' : 'd';

    for (let loop = 0; loop < maxLoop; loop++) {
        let hasChanged = false;
        data.forEach(item => {
            if (item.data_source === 'CALCULATED') {
                for (let i = 1; i <= limit; i++) {
                    let oldValAct = parseFloat(item[`${prefix}${i}_act`]) || 0;
                    let newValAct = 0;
                    
                    try {
                        if (item.calculation_formula && item.calculation_formula.trim().toUpperCase() === 'SUM_CHILDREN') {
                            const children = data.filter(child => child.parent_id == item.item_id);
                            newValAct = children.reduce((sum, child) => sum + (parseFloat(child[`${prefix}${i}_act`]) || 0), 0);
                        } else if (item.calculation_formula) {
                            let formula = item.calculation_formula;
                            const matches = formula.match(/\[(.*?)\]/g);
                            if (matches) {
                                matches.forEach(token => {
                                    const code = token.replace('[', '').replace(']', '');
                                    const refItem = data.find(d => d.account_code === code);
                                    const refValAct = refItem ? (parseFloat(refItem[`${prefix}${i}_act`]) || 0) : 0;
                                    formula = formula.replace(token, refValAct);
                                });
                            }
                            const safeFormula = formula.replace(/[^0-9+\-*/(). ]/g, ''); 
                            if (safeFormula.trim() !== '') {
                                newValAct = new Function('return ' + safeFormula)();
                            }
                        }
                    } catch (e) { newValAct = 0; }
                    
                    if (!isFinite(newValAct) || isNaN(newValAct)) newValAct = 0;
                    
                    if (Math.abs(newValAct - oldValAct) > 0.001) {
                        item[`${prefix}${i}_act`] = newValAct;
                        hasChanged = true;
                    }
                }
            }
        });
        if (!hasChanged) break;
    }
}

function renderStatementTableYearly(data, year) {
    const thead = document.getElementById('statementThead');
    const tbody = document.getElementById('statementTableBody');

    // 1. หา Base Revenue รวม (เพื่อนำไปเป็นฐาน 100% ให้การคำนวณ %)
    let base = { act: Array(13).fill(0), tgt: Array(13).fill(0) };
    data.forEach(item => {
        if (item.item_level === 0 && item.item_type === 'REVENUE') { // ยึดรายได้หลักเป็นฐาน
            for (let i = 1; i <= 12; i++) {
                base.act[i] += parseFloat(item[`m${i}_act`]) || 0;
                base.tgt[i] += parseFloat(item[`m${i}_tgt`]) || 0;
            }
        }
    });

    // ฟังก์ชันคำนวณไตรมาสสำหรับ Base
    const getBaseQ = (q, type) => base[type][q*3-2] + base[type][q*3-1] + base[type][q*3];
    const getBaseY = (type) => getBaseQ(1, type) + getBaseQ(2, type) + getBaseQ(3, type) + getBaseQ(4, type);

    // 2. สร้าง Header 2 ชั้น
    const months = ['Jan','Feb','Mar','Q1','Apr','May','Jun','Q2','Jul','Aug','Sep','Q3','Oct','Nov','Dec','Q4','YTD'];
    
    let headRow1 = `<tr><th rowspan="2" class="align-middle text-start ps-3">Account Name</th>`;
    let headRow2 = `<tr>`;

    months.forEach(m => {
        let bgClass = m.startsWith('Q') ? 'bg-quarter' : (m === 'YTD' ? 'bg-year' : '');
        headRow1 += `<th colspan="4" class="${bgClass} border-bottom-0">${m} ${m !== 'YTD' && !m.startsWith('Q') ? year : ''}</th>`;
        headRow2 += `
            <th class="${bgClass} text-muted fw-normal">Target</th>
            <th class="${bgClass} text-muted fw-normal">%</th>
            <th class="${bgClass} text-primary">Actual</th>
            <th class="${bgClass} text-info">%</th>
        `;
    });
    headRow1 += `</tr>`; headRow2 += `</tr>`;
    thead.innerHTML = headRow1 + headRow2;

    // 3. สร้าง Body (คำนวณสด)
    let html = '';
    
    // ฟังก์ชันช่วยสร้าง `<td>` 4 ช่อง (Target, %, Actual, %)
    const genCols = (act, tgt, baseAct, baseTgt, isSubtotal) => {
        let actPct = baseAct ? (act / baseAct * 100) : 0;
        let tgtPct = baseTgt ? (tgt / baseTgt * 100) : 0;
        let bg = isSubtotal ? 'bg-subtotal' : '';
        return `
            <td class="col-target ${bg}">${formatNumber(tgt)}</td>
            <td class="col-percent ${bg}">${tgtPct === 0 ? '-' : tgtPct.toFixed(2)+'%'}</td>
            <td class="col-actual ${bg}">${formatNumber(act)}</td>
            <td class="col-percent text-primary ${bg}">${actPct === 0 ? '-' : actPct.toFixed(2)+'%'}</td>
        `;
    };

    data.forEach(item => {
        let level = parseInt(item.item_level) || 0;
        let indent = level * 1.5;
        let isTopLevel = (level === 0);
        let nameStyle = isTopLevel ? 'font-weight: 800; color: #000;' : `padding-left: ${indent}rem; color: #495057;`;
        
        let rowHtml = `<tr><td style="${nameStyle}">${isTopLevel ? '<i class="fas fa-folder me-2 text-primary"></i>' : ''}${item.item_name}</td>`;

        let yAct = 0, yTgt = 0;

        // วนลูปรายเดือนและไตรมาส
        for (let q = 1; q <= 4; q++) {
            let qAct = 0, qTgt = 0;
            
            // 3 เดือนในไตรมาสนั้น
            for (let m = (q*3)-2; m <= q*3; m++) {
                let act = parseFloat(item[`m${m}_act`]) || 0;
                let tgt = parseFloat(item[`m${m}_tgt`]) || 0;
                qAct += act; qTgt += tgt;
                
                rowHtml += genCols(act, tgt, base.act[m], base.tgt[m], false);
            }
            // ยอดรวมไตรมาส (Q)
            yAct += qAct; yTgt += qTgt;
            rowHtml += genCols(qAct, qTgt, getBaseQ(q, 'act'), getBaseQ(q, 'tgt'), true);
        }
        
        // ยอดรวมทั้งปี (YTD)
        rowHtml += genCols(yAct, yTgt, getBaseY('act'), getBaseY('tgt'), true);
        rowHtml += `</tr>`;
        html += rowHtml;
    });

    tbody.innerHTML = html;
}

async function exportStatementExcel() {
    const year = document.getElementById('statementYear').value;
    const section = document.getElementById('sectionFilter').value;
    
    Swal.fire({
        title: 'Generating Statement...',
        text: 'กรุณารอสักครู่ ระบบกำลังจัดรูปแบบโครงสร้างบัญชี',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const table = document.querySelector('.statement-table');
        const wb = XLSX.utils.table_to_book(table, { 
            sheet: "P&L_Statement",
            raw: true
        });
        
        const safeSection = section.replace(/[^a-zA-Z0-9]/g, "_");
        const filename = `PL_Statement_Y${year}_${safeSection}.xlsx`;
        XLSX.writeFile(wb, filename);
        Swal.close();
        
    } catch (e) {
        console.error("Export Statement Error:", e);
        Swal.fire('Export Failed', 'เกิดข้อผิดพลาดในการสร้างไฟล์ Excel', 'error');
    }
}

let currentStatementView = 'yearly'; // 'yearly' หรือ 'daily'

function changeStatementView(view) {
    currentStatementView = view;
    if (view === 'yearly') {
        document.getElementById('statementYear').classList.remove('d-none');
        document.getElementById('statementMonth').classList.add('d-none');
    } else {
        document.getElementById('statementYear').classList.add('d-none');
        document.getElementById('statementMonth').classList.remove('d-none');
    }
    loadStatementData();
}

function renderStatementTableDaily(data, year, month) {
    const thead = document.getElementById('statementThead');
    const tbody = document.getElementById('statementTableBody');

    // หาจำนวนวันในเดือนนั้น (เช่น ก.พ. มี 28 หรือ 29)
    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. หา Base Revenue
    let base = { act: Array(32).fill(0), tgt: Array(32).fill(0) };
    data.forEach(item => {
        if (item.item_level === 0 && item.item_type === 'REVENUE') {
            for (let i = 1; i <= daysInMonth; i++) {
                base.act[i] += parseFloat(item[`d${i}_act`]) || 0;
                base.tgt[i] += parseFloat(item[`d${i}_tgt`]) || 0;
            }
        }
    });

    const getBaseMTD = (type) => base[type].reduce((a, b) => a + b, 0);

    // 2. สร้าง Header (Day 1 - Day 31 + MTD)
    let headRow1 = `<tr><th rowspan="2" class="align-middle text-start ps-3">Account Name</th>`;
    let headRow2 = `<tr>`;

    for (let d = 1; d <= daysInMonth; d++) {
        headRow1 += `<th colspan="4" class="border-bottom-0">Day ${d}</th>`;
        headRow2 += `
            <th class="text-muted fw-normal">Target</th>
            <th class="text-muted fw-normal">%</th>
            <th class="text-primary">Actual</th>
            <th class="text-info">%</th>
        `;
    }
    
    // MTD Column
    headRow1 += `<th colspan="4" class="bg-year border-bottom-0">MTD (Total)</th></tr>`;
    headRow2 += `
        <th class="bg-year text-muted fw-normal">Target</th>
        <th class="bg-year text-muted fw-normal">%</th>
        <th class="bg-year text-primary">Actual</th>
        <th class="bg-year text-info">%</th></tr>
    `;
    
    thead.innerHTML = headRow1 + headRow2;

    // 3. สร้าง Body
    let html = '';
    const genCols = (act, tgt, baseAct, baseTgt, isSubtotal) => {
        let actPct = baseAct ? (act / baseAct * 100) : 0;
        let tgtPct = baseTgt ? (tgt / baseTgt * 100) : 0;
        let bg = isSubtotal ? 'bg-year' : '';
        return `
            <td class="col-target ${bg}">${formatNumber(tgt)}</td>
            <td class="col-percent ${bg}">${tgtPct === 0 ? '-' : tgtPct.toFixed(2)+'%'}</td>
            <td class="col-actual ${bg}">${formatNumber(act)}</td>
            <td class="col-percent text-primary ${bg}">${actPct === 0 ? '-' : actPct.toFixed(2)+'%'}</td>
        `;
    };

    data.forEach(item => {
        let level = parseInt(item.item_level) || 0;
        let isTopLevel = (level === 0);
        let nameStyle = isTopLevel ? 'font-weight: 800; color: #000;' : `padding-left: ${level * 1.5}rem; color: #495057;`;
        
        let rowHtml = `<tr><td style="${nameStyle}">${isTopLevel ? '<i class="fas fa-folder me-2 text-primary"></i>' : ''}${item.item_name}</td>`;

        let mtdAct = 0, mtdTgt = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            let act = parseFloat(item[`d${d}_act`]) || 0;
            let tgt = parseFloat(item[`d${d}_tgt`]) || 0;
            mtdAct += act; mtdTgt += tgt;
            
            rowHtml += genCols(act, tgt, base.act[d], base.tgt[d], false);
        }
        
        rowHtml += genCols(mtdAct, mtdTgt, getBaseMTD('act'), getBaseMTD('tgt'), true);
        rowHtml += `</tr>`;
        html += rowHtml;
    });

    tbody.innerHTML = html;
}

// ========================================================
// [NEW] EXECUTIVE SUMMARY LOGIC (Custom Mapping + Daily/Yearly)
// ========================================================
let currentExecMode = 'yearly';

function changeExecView(view) {
    currentExecMode = view;
    if (view === 'yearly') {
        document.getElementById('execYear').classList.remove('d-none');
        document.getElementById('execMonth').classList.add('d-none');
    } else {
        document.getElementById('execYear').classList.add('d-none');
        document.getElementById('execMonth').classList.remove('d-none');
    }
    loadExecutiveData();
}

async function loadExecutiveData() {
    const tbody = document.getElementById('execTableBody');
    const section = document.getElementById('sectionFilter').value;

    tbody.innerHTML = '<tr><td class="text-center py-5"><div class="spinner-border text-dark"></div></td></tr>';

    try {
        let res, json;
        if (currentExecMode === 'yearly') {
            const year = document.getElementById('execYear').value;
            res = await fetch(`api/manage_pl_entry.php?action=statement_yearly&year=${year}&section=${section}`);
            json = await res.json();
            if (json.success) {
                calculateStatementFormulas(json.data, 'yearly');
                renderExecutiveTableYearly(json.data, year);
            }
        } else {
            const monthStr = document.getElementById('execMonth').value;
            const [year, month] = monthStr.split('-');
            res = await fetch(`api/manage_pl_entry.php?action=statement_daily&year=${year}&month=${month}&section=${section}`);
            json = await res.json();
            if (json.success) {
                calculateStatementFormulas(json.data, 'daily');
                renderExecutiveTableDaily(json.data, year, month);
            }
        }
        
        if (!json.success) tbody.innerHTML = `<tr><td class="text-center text-danger py-5">${json.message}</td></tr>`;
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

// --------------------------------------------------------
// โครงสร้าง Template ที่ใช้เหมือนกันทั้ง Yearly และ Daily
// --------------------------------------------------------
const getExecTemplate = (getAct, getTgt) => [
    { label: "Sale", code: "REVENUES", isBold: true, bg: "#e7f1ff", isBase: true },
    { label: "RM", isBold: true, calcAct: (p) => getAct("GRP_RM", p) + getAct("CR_R", p), calcTgt: (p) => getTgt("GRP_RM", p) + getTgt("CR_R", p) },
    { label: "RM", indent: 1, code: "GRP_RM" },
    { label: "CR", indent: 1, code: "CR_R" },
    { label: "DL,OT", code: "GRP_DL", isBold: true },
    { label: "DL", indent: 1, calcAct: (p) => getAct("522001+3", p) + getAct("DL_SCAN", p), calcTgt: (p) => getTgt("522001+3", p) + getTgt("DL_SCAN", p) },
    { label: "OT", indent: 1, calcAct: (p) => getAct("522002+4", p) + getAct("OT_SCAN", p), calcTgt: (p) => getTgt("522002+4", p) + getTgt("OT_SCAN", p) },
    { label: "OH", isBold: true, calcAct: (p) => getAct("OH_FC", p) + getAct("OH_VC", p), calcTgt: (p) => getTgt("OH_FC", p) + getTgt("OH_VC", p) },
    { label: "OH FC", code: "OH_FC", isBold: true },
    { label: "Staff exp. (Production)", indent: 1, code: "GRP_STF" },
    { label: "Depre", indent: 1, code: "GRP_DEP" },
    { label: "Rent", indent: 1, code: "GRP_RT" },
    { label: "OH VC", code: "OH_VC", isBold: true },
    { label: "Utilities", indent: 1, code: "GRP_UTIL" },
    { label: "Subcontract", indent: 1, code: "GRP_SUB" },
    { label: "Accessories", indent: 1, code: "GRP _ AC" },
    { label: "Repair", indent: 1, code: "GRP_REP" },
    { label: "Other", indent: 1, calcAct: (p) => getAct("GRP_TRV", p) + getAct("GRP _ OT", p) + getAct("GRP_OTR", p), calcTgt: (p) => getTgt("GRP_TRV", p) + getTgt("GRP _ OT", p) + getTgt("GRP_OTR", p) },
    { label: "COGS", code: "COGS", isBold: true, text: "danger", bg: "#fff3cd" },
    { label: "Gross Profit", isBold: true, text: "success", bg: "#d1e7dd", calcAct: (p) => getAct("REVENUES", p) - getAct("COGS", p), calcTgt: (p) => getTgt("REVENUES", p) - getTgt("COGS", p) },
    { label: "Selling VC", code: "SELL_EXP", isBold: true },
    { label: "Export Exp.", indent: 1, code: "542006" },
    { label: "Selling VC Other", indent: 1, calcAct: (p) => getAct("SELL_EXP", p) - getAct("542006", p), calcTgt: (p) => getTgt("SELL_EXP", p) - getTgt("542006", p) },
    { label: "Admin FC other", code: "ADMIN_FC", isBold: true },
    { label: "Staff exp. (support)", indent: 1, calcAct: (p) => getAct("GRP_AD_STF", p) + getAct("GRP_AD_ST", p), calcTgt: (p) => getTgt("GRP_AD_STF", p) + getTgt("GRP_AD_ST", p) },
    { label: "Utilities", indent: 1, code: "GRP_AD_UTL" },
    { label: "service", indent: 1, code: "GRP_SVF" },
    { label: "rental", indent: 1, code: "GRP_AD_RT" },
    { label: "depre", indent: 1, code: "GRP_AD_DSP" },
    { label: "other", indent: 1, calcAct: (p) => getAct("GRP_OFF", p) + getAct("GRP_AD_OT", p), calcTgt: (p) => getTgt("GRP_OFF", p) + getTgt("GRP_AD_OT", p) },
    { label: "SG&A", isBold: true, text: "danger", bg: "#fff3cd", calcAct: (p) => getAct("SELL_EXP", p) + getAct("ADMIN_FC", p), calcTgt: (p) => getTgt("SELL_EXP", p) + getTgt("ADMIN_FC", p) },
    { label: "Profit", isBold: true, bg: "#f8f9fa", calcAct: (p) => (getAct("REVENUES", p) - getAct("COGS", p)) - (getAct("SELL_EXP", p) + getAct("ADMIN_FC", p)), calcTgt: (p) => (getTgt("REVENUES", p) - getTgt("COGS", p)) - (getTgt("SELL_EXP", p) + getTgt("ADMIN_FC", p)) },
    { label: "Other income", code: "OT_IC", isBold: true },
    { label: "Extra Reorganize", indent: 1, code: "541015_3" },
    { label: "Bonus - OH & Admin", indent: 1, calcAct: (p) => getAct("541014", p) + getAct("541015_1", p), calcTgt: (p) => getTgt("541014", p) + getTgt("541015_1", p) },
    { label: "Bonus - Mgt", indent: 1, code: "541015_2" },
    { label: "Extra", code: "EX", isBold: true, text: "danger" },
    { label: "EBIT", isBold: true, bg: "#e0f8f1", calcAct: (p) => ((getAct("REVENUES", p) - getAct("COGS", p)) - (getAct("SELL_EXP", p) + getAct("ADMIN_FC", p))) + getAct("OT_IC", p) - getAct("EX", p), calcTgt: (p) => ((getTgt("REVENUES", p) - getTgt("COGS", p)) - (getTgt("SELL_EXP", p) + getTgt("ADMIN_FC", p))) + getTgt("OT_IC", p) - getTgt("EX", p) },
    { label: "Interest", code: "ITR_C" },
    { label: "Tax", code: "TAX" },
    { label: "EAT", isBold: true, bg: "#e0f8f1", calcAct: (p) => (((getAct("REVENUES", p) - getAct("COGS", p)) - (getAct("SELL_EXP", p) + getAct("ADMIN_FC", p))) + getAct("OT_IC", p) - getAct("EX", p)) - getAct("ITR_C", p) - getAct("TAX", p), calcTgt: (p) => (((getTgt("REVENUES", p) - getTgt("COGS", p)) - (getTgt("SELL_EXP", p) + getTgt("ADMIN_FC", p))) + getTgt("OT_IC", p) - getTgt("EX", p)) - getTgt("ITR_C", p) - getTgt("TAX", p) },
    { label: "depre", text: "muted", calcAct: (p) => getAct("GRP_DEP", p) + getAct("GRP_AD_DSP", p), calcTgt: (p) => getTgt("GRP_DEP", p) + getTgt("GRP_AD_DSP", p) },
    { label: "Interest", text: "muted", code: "ITR_C" },
    { label: "Tax", text: "muted", code: "TAX" },
    { label: "EBITDA", isBold: true, text: "primary", bg: "#e7f1ff", calcAct: (p) => (((getAct("REVENUES", p) - getAct("COGS", p)) - (getAct("SELL_EXP", p) + getAct("ADMIN_FC", p))) + getAct("OT_IC", p) - getAct("EX", p)) + (getAct("GRP_DEP", p) + getAct("GRP_AD_DSP", p)), calcTgt: (p) => (((getTgt("REVENUES", p) - getTgt("COGS", p)) - (getTgt("SELL_EXP", p) + getTgt("ADMIN_FC", p))) + getTgt("OT_IC", p) - getTgt("EX", p)) + (getTgt("GRP_DEP", p) + getTgt("GRP_AD_DSP", p)) }
];

const execGenCols = (act, tgt, baseAct, baseTgt, isSubtotal) => {
    let actPct = baseAct ? (act / baseAct * 100) : 0;
    let tgtPct = baseTgt ? (tgt / baseTgt * 100) : 0;
    let bg = isSubtotal ? 'bg-year' : '';
    return `
        <td class="col-target text-end ${bg}">${formatNumberShort(tgt)}</td>
        <td class="col-percent text-end text-muted ${bg}">${tgtPct === 0 ? '-' : tgtPct.toFixed(1)+'%'}</td>
        <td class="col-actual text-end ${bg}">${formatNumberShort(act)}</td>
        <td class="col-percent text-end text-primary ${bg}">${actPct === 0 ? '-' : actPct.toFixed(1)+'%'}</td>
    `;
};

// --------------------------------------------------------
// 1. RENDER YEARLY VIEW (12 Months + Q1-Q4 + YTD)
// --------------------------------------------------------
function renderExecutiveTableYearly(data, year) {
    const thead = document.getElementById('execThead');
    const tbody = document.getElementById('execTableBody');

    const getAct = (code, m) => { const item = data.find(d => d.account_code === code); return item ? (parseFloat(item[`m${m}_act`]) || 0) : 0; };
    const getTgt = (code, m) => { const item = data.find(d => d.account_code === code); return item ? (parseFloat(item[`m${m}_tgt`]) || 0) : 0; };
    const template = getExecTemplate(getAct, getTgt);

    const months = ['Jan','Feb','Mar','Q1','Apr','May','Jun','Q2','Jul','Aug','Sep','Q3','Oct','Nov','Dec','Q4','YTD'];
    let headRow1 = `<tr><th rowspan="2" class="align-middle text-start ps-4" style="min-width: 250px;">Account Name</th>`;
    let headRow2 = `<tr>`;

    months.forEach(m => {
        let bgClass = m.startsWith('Q') ? 'bg-quarter' : (m === 'YTD' ? 'bg-year' : '');
        headRow1 += `<th colspan="4" class="${bgClass} border-bottom-0">${m} ${m !== 'YTD' && !m.startsWith('Q') ? year : ''}</th>`;
        headRow2 += `
            <th class="${bgClass} text-muted fw-normal" style="width: 80px;">Target</th>
            <th class="${bgClass} text-muted" style="width: 50px;">%</th>
            <th class="${bgClass} text-dark" style="width: 80px;">Actual</th>
            <th class="${bgClass} text-primary" style="width: 50px;">%</th>
        `;
    });
    headRow1 += `</tr>`; headRow2 += `</tr>`;
    thead.innerHTML = headRow1 + headRow2;

    let baseRev = { act: Array(13).fill(0), tgt: Array(13).fill(0) };
    for (let m = 1; m <= 12; m++) { baseRev.act[m] = getAct("REVENUES", m); baseRev.tgt[m] = getTgt("REVENUES", m); }
    const getBaseQ = (q, type) => baseRev[type][q*3-2] + baseRev[type][q*3-1] + baseRev[type][q*3];
    const getBaseY = (type) => getBaseQ(1, type) + getBaseQ(2, type) + getBaseQ(3, type) + getBaseQ(4, type);

    let html = '';
    template.forEach(row => {
        let styleStr = row.isBold ? 'font-weight: 800; ' : '';
        if (row.bg) styleStr += `background-color: ${row.bg} !important; `;
        let textClass = row.text ? `text-${row.text}` : 'text-dark';
        
        // 🔥 [FIXED] แก้ไขสมการย่อหน้า (บวกเพิ่มระดับละ 1.5rem)
        let paddingVal = 1.5 + ((row.indent || 0) * 1.5);
        let indentStyle = `padding-left: ${paddingVal}rem !important;`;

        let rowHtml = `<tr style="${styleStr}"><td class="${textClass}" style="${indentStyle}">${row.label}</td>`;
        let yAct = 0, yTgt = 0;

        for (let q = 1; q <= 4; q++) {
            let qAct = 0, qTgt = 0;
            for (let m = (q*3)-2; m <= q*3; m++) {
                let act = row.calcAct ? row.calcAct(m) : getAct(row.code, m);
                let tgt = row.calcTgt ? row.calcTgt(m) : getTgt(row.code, m);
                qAct += act; qTgt += tgt;
                rowHtml += execGenCols(act, tgt, baseRev.act[m], baseRev.tgt[m], false);
            }
            yAct += qAct; yTgt += qTgt;
            rowHtml += execGenCols(qAct, qTgt, getBaseQ(q, 'act'), getBaseQ(q, 'tgt'), true);
        }
        rowHtml += execGenCols(yAct, yTgt, getBaseY('act'), getBaseY('tgt'), true);
        rowHtml += `</tr>`;
        html += rowHtml;
    });
    tbody.innerHTML = html;
}

// --------------------------------------------------------
// 2. RENDER DAILY VIEW (Day 1 - 31 + MTD)
// --------------------------------------------------------
function renderExecutiveTableDaily(data, year, month) {
    const thead = document.getElementById('execThead');
    const tbody = document.getElementById('execTableBody');
    const daysInMonth = new Date(year, month, 0).getDate();

    const getAct = (code, d) => { const item = data.find(x => x.account_code === code); return item ? (parseFloat(item[`d${d}_act`]) || 0) : 0; };
    const getTgt = (code, d) => { const item = data.find(x => x.account_code === code); return item ? (parseFloat(item[`d${d}_tgt`]) || 0) : 0; };
    const template = getExecTemplate(getAct, getTgt);

    let headRow1 = `<tr><th rowspan="2" class="align-middle text-start ps-4" style="min-width: 250px;">Account Name</th>`;
    let headRow2 = `<tr>`;

    for (let d = 1; d <= daysInMonth; d++) {
        headRow1 += `<th colspan="4" class="border-bottom-0">Day ${d}</th>`;
        headRow2 += `
            <th class="text-muted fw-normal" style="width: 80px;">Target</th>
            <th class="text-muted" style="width: 50px;">%</th>
            <th class="text-dark" style="width: 80px;">Actual</th>
            <th class="text-primary" style="width: 50px;">%</th>
        `;
    }
    headRow1 += `<th colspan="4" class="bg-year border-bottom-0">MTD (Total)</th></tr>`;
    headRow2 += `
        <th class="bg-year text-muted fw-normal" style="width: 90px;">Target</th>
        <th class="bg-year text-muted" style="width: 60px;">%</th>
        <th class="bg-year text-dark" style="width: 90px;">Actual</th>
        <th class="bg-year text-primary" style="width: 60px;">%</th>
    </tr>`;
    thead.innerHTML = headRow1 + headRow2;

    let baseRev = { act: Array(32).fill(0), tgt: Array(32).fill(0) };
    for (let d = 1; d <= daysInMonth; d++) { baseRev.act[d] = getAct("REVENUES", d); baseRev.tgt[d] = getTgt("REVENUES", d); }
    const getBaseMTD = (type) => baseRev[type].reduce((a, b) => a + b, 0);

    let html = '';
    template.forEach(row => {
        let styleStr = row.isBold ? 'font-weight: 800; ' : '';
        if (row.bg) styleStr += `background-color: ${row.bg} !important; `;
        let textClass = row.text ? `text-${row.text}` : 'text-dark';
        
        // 🔥 [FIXED] แก้ไขสมการย่อหน้าให้ตรงกัน
        let paddingVal = 1.5 + ((row.indent || 0) * 1.5);
        let indentStyle = `padding-left: ${paddingVal}rem !important;`;

        let rowHtml = `<tr style="${styleStr}"><td class="${textClass}" style="${indentStyle}">${row.label}</td>`;
        let mtdAct = 0, mtdTgt = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            let act = row.calcAct ? row.calcAct(d) : getAct(row.code, d);
            let tgt = row.calcTgt ? row.calcTgt(d) : getTgt(row.code, d);
            mtdAct += act; mtdTgt += tgt;
            rowHtml += execGenCols(act, tgt, baseRev.act[d], baseRev.tgt[d], false);
        }
        rowHtml += execGenCols(mtdAct, mtdTgt, getBaseMTD('act'), getBaseMTD('tgt'), true);
        rowHtml += `</tr>`;
        html += rowHtml;
    });
    tbody.innerHTML = html;
}

function exportExecutiveExcel() {
    const section = document.getElementById('sectionFilter').value;
    const safeSection = section.replace(/[^a-zA-Z0-9]/g, "_");
    let filename = '';

    if (currentExecMode === 'yearly') {
        const year = document.getElementById('execYear').value;
        filename = `Executive_PL_Y${year}_${safeSection}.xlsx`;
    } else {
        const month = document.getElementById('execMonth').value;
        filename = `Executive_PL_${month}_${safeSection}.xlsx`;
    }
    
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const table = document.querySelector('#execTableWrapper table');
        const wb = XLSX.utils.table_to_book(table, { sheet: "Executive_PL", raw: true });
        XLSX.writeFile(wb, filename);
        Swal.close();
    } catch (e) {
        Swal.fire('Error', 'Export Failed', 'error');
    }
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

            // ---------------------------------------------------------
            // 🔥 1. เช็คสถานะ Lock จากข้อมูล Backend (ทำเฉพาะโหมด Daily)
            // ---------------------------------------------------------
            isPeriodLocked = false; 
            if (currentMode === 'daily' && currentData.length > 0 && currentData[0].is_locked === 1) {
                isPeriodLocked = true;
            }

            // 🔥 2. ปรับ UI ปุ่ม Lock/Unlock ให้ตรงกับสถานะ
            const btnLock = document.getElementById('btnToggleLock');
            const iconLock = document.getElementById('iconLock');
            const textLock = document.getElementById('textLock');
            
            if (btnLock) {
                if (isPeriodLocked) {
                    btnLock.classList.replace('btn-outline-danger', 'btn-danger');
                    if (iconLock) iconLock.className = 'fas fa-lock me-1';
                    if (textLock) textLock.innerText = 'Unlock Day';
                } else {
                    btnLock.classList.replace('btn-danger', 'btn-outline-danger');
                    if (iconLock) iconLock.className = 'fas fa-lock-open me-1';
                    if (textLock) textLock.innerText = 'Lock Day';
                }
            }

            // 3. คำนวณสูตรและวาดตารางตามปกติ
            if (typeof runFormulaEngine === 'function') {
                runFormulaEngine(); 
            }
            renderEntryTable(currentData);
            
            if(typeof updateCharts === 'function') {
                updateCharts(currentData);
            }
            if(typeof calculateSummary === 'function') {
                calculateSummary(currentData);
            }

            // ---------------------------------------------------------
            // 🔥 4. ล็อคช่องกรอกข้อมูลและซ่อนปุ่ม Save ถ้าระบบถูก Lock แล้ว
            // ต้องทำหลังจาก renderEntryTable() สร้าง HTML เสร็จแล้วเท่านั้น
            // ---------------------------------------------------------
            const saveBtn = document.querySelector('button[onclick^="saveDailySnapshot"]'); // หาปุ่ม Save

            if (isPeriodLocked) {
                // ปิดไม่ให้กรอกช่อง input ทั้งหมดในตาราง
                const allInputs = tbody.querySelectorAll('input');
                allInputs.forEach(inp => {
                    inp.disabled = true;
                    inp.classList.add('bg-light'); // ทำให้ดูเป็นสีเทาๆ
                });
                // ซ่อนปุ่ม Save
                if(saveBtn) saveBtn.style.display = 'none';
            } else {
                // เปิดปุ่ม Save คืนมา
                if(saveBtn) saveBtn.style.display = 'inline-block';
            }
            
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-5">${res.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

async function togglePeriodLock() {
    const start = document.getElementById('targetDate').value;
    const section = document.getElementById('sectionFilter').value;

    // ถ้ากำลังจะล็อค ให้บังคับเซฟ Snapshot 1 รอบก่อน เพื่อให้ค่าล่าสุดลง DB ชัวร์ๆ
    if (!isPeriodLocked) {
        await saveDailySnapshot(true); // true = แบบเงียบๆ ไม่เด้ง Alert
    }

    const btn = document.getElementById('btnToggleLock');
    btn.disabled = true;

    try {
        const fd = new FormData();
        fd.append('action', 'toggle_lock');
        fd.append('entry_date', start);
        fd.append('section', section);

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: fd });
        const json = await res.json();
        
        if (json.success) {
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                icon: json.is_locked ? 'success' : 'info',
                title: json.is_locked ? 'Period Locked 🔒' : 'Period Unlocked 🔓'
            });
            loadEntryData(); // โหลดหน้าใหม่เพื่อให้ UI เปลี่ยนสถานะ
        } else {
            Swal.fire('Error', json.message, 'error');
        }
    } catch(e) {
        Swal.fire('Error', 'Connection Failed', 'error');
    } finally {
        btn.disabled = false;
    }
}