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

// ========================================================
// INITIALIZATION
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Set default date
    const dateInput = document.getElementById('targetDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Initial Load
    loadEntryData();

    // Event Listeners
    dateInput?.addEventListener('change', loadEntryData);
    document.getElementById('sectionFilter')?.addEventListener('change', loadEntryData);
});

// ========================================================
// 1. DATA LOADING & MODE SWITCHING
// ========================================================

function switchMode(mode) {
    currentMode = mode;
    
    const dailyGroup = document.getElementById('dailyPickerGroup');
    const rangeGroup = document.getElementById('rangePickerGroup');
    const saveStatus = document.getElementById('saveStatus');
    const btnBudget = document.getElementById('btnSetBudgetWrapper'); // ปุ่มหน้าหลัก

    if (mode === 'daily') {
        // Show Daily UI
        dailyGroup.classList.remove('d-none');
        rangeGroup.classList.add('d-none');
        rangeGroup.classList.remove('d-flex');
        
        saveStatus.style.visibility = 'visible'; // Show Save Status
        if(btnBudget) btnBudget.style.display = 'block'; // Show Budget Button
    } else {
        // Show Report UI
        dailyGroup.classList.add('d-none');
        rangeGroup.classList.remove('d-none');
        rangeGroup.classList.add('d-flex');
        
        saveStatus.style.visibility = 'hidden';  // Hide Save Status
        if(btnBudget) btnBudget.style.display = 'none'; // Hide Budget Button (Report Mode แก้เป้าไม่ได้)
    }

    loadEntryData(); // Reload Data
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

    // Prepare Parameters
    const section = document.getElementById('sectionFilter')?.value || 'Team 1';
    let url = '';

    if (currentMode === 'daily') {
        const date = document.getElementById('targetDate').value;
        url = `api/manage_pl_entry.php?action=read&entry_date=${date}&section=${section}`;
        
        // ถ้ามีฟังก์ชันนี้ ให้เรียกเพื่ออัปเดต Badge ใน Modal (ถ้า Modal เปิดอยู่)
        // แต่จะไม่ไปยุ่งกับปุ่มหน้าหลัก
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
            
            // ถ้ามีฟังก์ชันคำนวณ Card summary (Top Cards) ให้เรียกใช้
            if(typeof calculateSummary === 'function') calculateSummary(currentData);
            
            // Run Formula (เฉพาะ Daily Mode)
            if (currentMode === 'daily') runFormulaEngine(); 

        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-5">${res.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

// Function เสริมสำหรับคำนวณ Top Cards (ถ้ามี HTML รองรับ)
function calculateSummary(data) {
    let totalRevenue = 0;
    data.forEach(item => {
        // สมมติ: นับยอดรวมจาก item ที่เป็น REVENUE และ Level 0
        if (item.item_type === 'REVENUE' && parseInt(item.item_level) === 0) {
             totalRevenue += parseFloat(item.actual_amount) || 0;
        }
    });
    const cardEl = document.getElementById('cardRevenue');
    if(cardEl) cardEl.innerText = formatNumber(totalRevenue);
}

// ========================================================
// 2. RENDERING (Table UI)
// ========================================================
function renderEntryTable(data) {
    const tbody = document.getElementById('entryTableBody');
    
    // Update Header Text
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
        const isAuto = item.data_source.includes('AUTO');
        const isCalc = item.data_source === 'CALCULATED';

        let rowClass = (level === 0) ? 'level-0' : (level === 1 ? 'level-1' : 'level-deep');
        let indentStyle = (level === 0) ? '' : (level === 1 ? 'padding-left: 1.5rem;' : `padding-left: ${1.5 + (level * 1.5)}rem;`);
        let nameCellClass = (level > 1) ? 'child-item' : '';

        // Icons
        let iconHtml = '';
        if (level === 0) iconHtml = `<i class="fas fa-folder text-primary me-2 fa-lg"></i>`;
        else if (level === 1) iconHtml = `<i class="far fa-folder-open text-secondary me-2"></i>`;
        else iconHtml = `<span class="text-muted opacity-25 me-1" style="font-family: monospace;">└─</span><i class="far fa-file-alt text-muted me-2"></i>`;

        // Badges
        let typeBadge = item.item_type === 'REVENUE' ? `<span class="badge-mini badge-type-rev">R</span>` :
                        item.item_type === 'COGS' ? `<span class="badge-mini badge-type-cogs">C</span>` :
                        `<span class="badge-mini badge-type-exp">E</span>`;

        // 🔥 FIX Tooltip: เพิ่ม title และ data-bs-toggle
        let sourceBadge = '';
        if (isAuto) {
            sourceBadge = `<span class="badge-mini badge-src-auto" title="Auto (Sum Children)" data-bs-toggle="tooltip">A</span>`;
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

        // Input Logic (Mode Check)
        let inputHtml = '';
        let remarkHtml = '';

        if (currentMode === 'report') {
            // Report Mode: Read-only Text
            inputHtml = `<span class="fw-bold text-dark">${formatNumber(actual)}</span>`;
            remarkHtml = `<span class="text-muted small">-</span>`;
        } else {
            // Daily Mode: Inputs
            const readonly = (isAuto || isCalc) ? 'readonly' : '';
            const inputColorClass = (isCalc || isAuto) ? 'text-primary fw-bold' : 'text-dark fw-semibold';

            inputHtml = `
                <input type="text" class="input-seamless ${inputColorClass}" 
                    value="${formatNumber(actual)}" 
                    data-id="${item.item_id}" ${readonly}
                    onfocus="removeCommas(this)" onblur="formatAndSave(this, ${item.item_id})"
                    onkeydown="if(event.key==='Enter') this.blur()">`;
            
            remarkHtml = `
                <input type="text" class="input-seamless text-end text-muted small" 
                       style="font-family: var(--bs-body-font-family); font-weight: normal;"
                       placeholder="..." value="${item.remark || ''}"
                       onblur="formatAndSave(this, ${item.item_id})">`;
        }

        // 🔥 FIX Code Column: เพิ่ม style="white-space: nowrap;"
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

    // 🔥 FIX: Initialize Tooltips (สำคัญมากสำหรับ Bootstrap 5)
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
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
    return num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

async function formatAndSave(input, itemId) {
    const isRemarkField = input.getAttribute('placeholder') === '...';
    const row = input.closest('tr');
    const amountInput = row.querySelector('input:not([placeholder="..."])');
    const remarkInput = row.querySelector('input[placeholder="..."]');

    let rawAmount = amountInput.value.replace(/,/g, '');
    if (rawAmount === '' || isNaN(rawAmount)) rawAmount = 0;
    const floatAmount = parseFloat(rawAmount);

    if (!isRemarkField) input.value = formatNumber(floatAmount);

    const remarkValue = remarkInput ? remarkInput.value.trim() : '';
    
    // Update UI Status
    const statusEl = document.getElementById('saveStatus');
    statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin text-primary me-1"></i> <span class="text-primary">Saving...</span>';
    statusEl.classList.remove('opacity-0');

    try {
        const payload = { item_id: itemId, amount: floatAmount, remark: remarkValue };
        const formData = new FormData();
        formData.append('action', 'save');
        formData.append('entry_date', document.getElementById('targetDate').value);
        formData.append('section', document.getElementById('sectionFilter').value);
        formData.append('items', JSON.stringify([payload]));

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            setTimeout(() => {
                statusEl.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i> <span class="text-muted">All changes saved</span>';
            }, 500);
            
            // Re-run formula locally to update UI immediately
            if(!isRemarkField) runFormulaEngine(); 

        } else { throw new Error(json.message); }
    } catch (err) {
        console.error(err);
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-1"></i> <span class="text-danger">Save Failed!</span>';
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
                    if (item.calculation_formula === 'SUM_CHILDREN') {
                        const children = currentData.filter(child => child.parent_id === item.item_id);
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
    if (!targetModal) targetModal = new bootstrap.Modal(document.getElementById('targetModal'));
    
    // Sync Month
    const mainDate = document.getElementById('targetDate').value;
    const monthInput = document.getElementById('budgetMonth');
    monthInput.value = mainDate.slice(0, 7); 

    // Render & Load
    renderTargetStructure(); 
    monthInput.onchange = loadModalData;
    loadModalData(); 
    
    targetModal.show();
}

async function loadModalData() {
    await Promise.all([ fetchWorkingDays(), fetchMonthlyBudgets() ]);
}

async function fetchWorkingDays() {
    const monthStr = document.getElementById('budgetMonth')?.value;
    if(!monthStr) return;

    const [year, month] = monthStr.split('-');
    const badge = document.getElementById('workingDaysBadge'); // 🔥 Badge นี้อยู่ใน Modal (plEntryModal.php)
    
    if(!badge) return; // ถ้าไม่เจอ Badge (กรณี Modal ยังไม่โหลด) ก็จบ

    badge.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Counting...';
    badge.className = 'badge bg-secondary text-white shadow-sm user-select-none position-relative';
    
    try {
        const res = await fetch(`api/manage_pl_entry.php?action=get_working_days&year=${year}&month=${month}`);
        const json = await res.json();
        if (json.success) {
            currentWorkingDays = json.days;
            badge.className = 'badge bg-success text-white shadow-sm user-select-none position-relative';
            // Render Badge HTML (Green)
            badge.innerHTML = `
                <i class="far fa-calendar-check me-1"></i>Working Days: ${currentWorkingDays} 
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning border border-light" style="font-size: 0.5rem; padding: 0.3em 0.5em;">
                    <i class="fas fa-pen"></i>
                </span>
            `;
            // Recalculate Previews in Modal
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
        fetchWorkingDays(); // Refresh Badge in Modal
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
    
    // Check Normal Day -> Delete
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