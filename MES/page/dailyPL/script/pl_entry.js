"use strict";

let currentData = [];
let isSaving = false;
let currentWorkingDays = 26;

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('targetDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    loadEntryData();

    dateInput?.addEventListener('change', loadEntryData);
    document.getElementById('sectionFilter')?.addEventListener('change', loadEntryData);
});

// ========================================================
// 1. DATA LOADING
// ========================================================
async function loadEntryData() {
    const date = document.getElementById('targetDate').value;
    const section = document.getElementById('sectionFilter')?.value || 'Team 1';
    const tbody = document.getElementById('entryTableBody');
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center align-middle" style="height: 200px;">
                <div class="spinner-border text-primary mb-2" role="status"></div>
                <div class="text-muted small">Loading P&L Data...</div>
            </td>
        </tr>`;

    try {
        const response = await fetch(`api/manage_pl_entry.php?action=read&entry_date=${date}&section=${section}`);
        const res = await response.json();

        if (res.success) {
            currentData = res.data;
            renderEntryTable(res.data);
            runFormulaEngine(); 
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-5">${res.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

// ========================================================
// 2. RENDERING (Table UI) - With Targets & Diff
// ========================================================
function renderEntryTable(data) {
    const tbody = document.getElementById('entryTableBody');
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

        // Icons & Name
        let iconHtml = '';
        if (level === 0) iconHtml = `<i class="fas fa-folder text-primary me-2 fa-lg"></i>`;
        else if (level === 1) iconHtml = `<i class="far fa-folder-open text-secondary me-2"></i>`;
        else iconHtml = `<span class="text-muted opacity-25 me-1" style="font-family: monospace;">└─</span><i class="far fa-file-alt text-muted me-2"></i>`;

        // Badges
        let typeBadge = item.item_type === 'REVENUE' ? `<span class="badge-mini badge-type-rev" title="Revenue">R</span>` :
                        item.item_type === 'COGS' ? `<span class="badge-mini badge-type-cogs" title="Cost of Goods Sold">C</span>` :
                        `<span class="badge-mini badge-type-exp" title="Expense">E</span>`;

        let sourceBadge = isAuto ? `<span class="badge-mini badge-src-auto" title="Auto">A</span>` :
                          isCalc ? `<span class="badge-mini badge-src-calc" title="Formula">F</span>` :
                          `<span class="badge-mini badge-src-manual" title="Manual">M</span>`;

        // Values
        const actual = parseFloat(item.actual_amount) || 0;
        const target = parseFloat(item.daily_target) || 0;
        
        // 🔥 Diff Logic (Variance)
        let diffHtml = '<span class="text-muted opacity-25">-</span>';
        if (target > 0) {
            let diff = actual - target;
            let percent = (diff / target) * 100;
            
            // Color Logic
            let colorClass = 'text-muted';
            if (item.item_type === 'REVENUE') {
                // รายได้: มากกว่าเป้า = ดี (เขียว), น้อยกว่า = แย่ (แดง)
                if (diff < -0.01) colorClass = 'text-danger fw-bold'; 
                else if (diff > 0.01) colorClass = 'text-success fw-bold';
            } else {
                // รายจ่าย: มากกว่าเป้า = แย่ (แดง), น้อยกว่า = ดี (เขียว)
                if (diff > 0.01) colorClass = 'text-danger fw-bold'; 
                else if (diff < -0.01) colorClass = 'text-success fw-bold';
            }

            // Arrow Icon
            let arrow = diff > 0 ? '↑' : '↓';
            if (Math.abs(diff) < 0.01) arrow = '';

            diffHtml = `<span class="${colorClass}" style="font-size: 0.8rem;" title="Diff: ${formatNumber(diff)}">
                            ${arrow} ${Math.abs(percent).toFixed(0)}%
                        </span>`;
        }

        // Input Fields (Actual & Remark)
        const readonly = (isAuto || isCalc) ? 'readonly' : '';
        const inputColorClass = (isCalc || isAuto) ? 'text-primary fw-bold' : 'text-dark fw-semibold';

        const inputHtml = `
            <input type="text" class="input-seamless ${inputColorClass}" 
                value="${formatNumber(actual)}" 
                data-id="${item.item_id}" ${readonly}
                onfocus="removeCommas(this)" onblur="formatAndSave(this, ${item.item_id})"
                onkeydown="if(event.key==='Enter') this.blur()">
        `;

        const remarkHtml = `
            <input type="text" class="input-seamless text-end text-muted small" 
                   style="font-family: var(--bs-body-font-family); font-weight: normal;"
                   placeholder="..." value="${item.remark || ''}"
                   onblur="formatAndSave(this, ${item.item_id})"> 
        `;

        // 🔥 Build Row
        html += `
            <tr class="${rowClass}">
                <td style="${indentStyle}; white-space: nowrap;" class="${nameCellClass} pe-3">
                    <div class="d-flex align-items-center">
                        ${iconHtml} <span>${item.item_name}</span>
                    </div>
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
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function removeCommas(input) {
    if (input.readOnly) return;
    input.value = input.value.replace(/,/g, '');
    input.select();
}

async function formatAndSave(input, itemId) {
    const isRemark = input.getAttribute('placeholder') === '...';
    
    if (!isRemark) {
        if (input.readOnly) return;
        let rawValue = input.value.replace(/,/g, '');
        if(isNaN(rawValue) || rawValue === '') rawValue = 0;
        const floatVal = parseFloat(rawValue);
        input.value = formatNumber(floatVal);
        
        const dataIndex = currentData.findIndex(i => i.item_id == itemId);
        if (dataIndex > -1) {
            if(currentData[dataIndex].actual_amount == floatVal) return;
            currentData[dataIndex].actual_amount = floatVal;
            runFormulaEngine();
        }
        await saveToServer(itemId, floatVal, null, input);

    } else {
        const remarkVal = input.value.trim();
        const dataIndex = currentData.findIndex(i => i.item_id == itemId);
        if (dataIndex > -1) {
             if(currentData[dataIndex].remark === remarkVal) return;
             currentData[dataIndex].remark = remarkVal;
        }
        const currentAmount = currentData[dataIndex].actual_amount;
        await saveToServer(itemId, currentAmount, remarkVal, input);
    }
}

async function saveToServer(itemId, amount, remark, inputElement) {
    showSaveStatus(false);
    try {
        const date = document.getElementById('targetDate').value;
        const section = document.getElementById('sectionFilter').value;
        let itemObj = { item_id: itemId, amount: amount };
        if (remark !== null) itemObj.remark = remark;

        const formData = new FormData();
        formData.append('action', 'save');
        formData.append('entry_date', date);
        formData.append('section', section);
        formData.append('items', JSON.stringify([itemObj]));

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            showSaveStatus(true);
            if(inputElement) {
                inputElement.classList.add('is-valid');
                setTimeout(() => inputElement.classList.remove('is-valid'), 1000);
            }
        } else {
            if(inputElement) inputElement.classList.add('is-invalid');
        }
    } catch (err) {
        console.error(err);
    }
}

async function saveEntryData() {
    const btn = document.getElementById('btnSave');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    runFormulaEngine();
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        showSaveStatus(true);
    }, 500);
}

function showSaveStatus(saved) {
    const el = document.getElementById('saveStatus');
    if(!el) return;
    el.classList.remove('opacity-0');
    if (saved) {
        el.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i>Saved';
        setTimeout(() => el.classList.add('opacity-0'), 2000);
    } else {
        el.innerHTML = '<i class="fas fa-sync fa-spin text-muted me-1"></i>Saving...';
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
    calculateDashboardSummary();
}

function calculateDashboardSummary() {
    let revenue = 0, cost = 0;
    currentData.forEach(item => {
        if (parseInt(item.item_level) === 0) {
            const val = parseFloat(item.actual_amount) || 0;
            if (item.item_type === 'REVENUE') revenue += val;
            else cost += val;
        }
    });
    updateCard('estRevenue', revenue);
    updateCard('estCost', cost);
    updateCard('estGP', revenue - cost, true);
}

function updateCard(id, value, colorize = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = formatNumber(value);
    if (colorize) {
        el.className = 'metric-value';
        if (value > 0) el.classList.add('text-success');
        else if (value < 0) el.classList.add('text-danger');
        else el.classList.add('text-primary');
    }
}

function formatNumber(num) {
    return num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ========================================================
// 3. TARGET MODAL LOGIC (New)
// ========================================================
let targetModal = null;

function openTargetModal() {
    if (!targetModal) targetModal = new bootstrap.Modal(document.getElementById('targetModal'));
    
    // ตั้งค่าเดือนเริ่มต้น
    const mainDate = document.getElementById('targetDate').value;
    const monthInput = document.getElementById('budgetMonth');
    monthInput.value = mainDate.slice(0, 7); // YYYY-MM
    monthInput.onchange = fetchWorkingDays;

    // โหลดวันทำงานครั้งแรก แล้วค่อย Render ตาราง
    fetchWorkingDays(); 
    
    targetModal.show();
}

async function fetchWorkingDays() {
    const monthStr = document.getElementById('budgetMonth').value; // YYYY-MM
    const [year, month] = monthStr.split('-');
    const badge = document.getElementById('workingDaysBadge');

    // Show Loading state
    badge.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Counting...';
    badge.className = 'badge bg-secondary text-white shadow-sm';

    try {
        const res = await fetch(`api/manage_pl_entry.php?action=get_working_days&year=${year}&month=${month}`);
        const json = await res.json();

        if (json.success) {
            currentWorkingDays = json.days; // อัปเดตตัวแปร Global
            
            // Update Badge UI
            badge.innerHTML = `<i class="far fa-calendar-check me-1"></i>Working Days: ${currentWorkingDays}`;
            badge.className = 'badge bg-success text-white shadow-sm';

            // 🔥 Re-render ตาราง หรือ Recalculate Preview ใหม่
            // (ถ้ามีข้อมูลใน Input อยู่แล้ว ให้คำนวณใหม่เลย)
            const inputs = document.querySelectorAll('.budget-input');
            if (inputs.length > 0) {
                inputs.forEach(inp => calcPreview(inp)); // คำนวณใหม่ทุกช่อง
            } else {
                renderTargetRows(); // ถ้ายังไม่สร้างตาราง ให้สร้างใหม่
            }
        }
    } catch (err) {
        console.error(err);
        badge.innerHTML = 'Error';
    }
}

function renderTargetRows() {
    const tbody = document.getElementById('budgetTableBody');
    const items = currentData; 

    let html = '';
    items.forEach(item => {
        const level = parseInt(item.item_level) || 0;
        const isCalc = item.data_source === 'CALCULATED'; 
        const budget = parseFloat(item.monthly_budget) || 0;
        
        let rowClass = '';
        let nameStyle = '';
        let iconHtml = '';
        if (level === 0) {
            rowClass = 'table-info bg-opacity-10'; nameStyle = 'font-weight: 800; color: #055160;'; iconHtml = '<i class="fas fa-folder me-2"></i>';
        } else if (level === 1) {
            rowClass = 'table-light'; nameStyle = 'font-weight: 700; color: #495057; padding-left: 20px;'; iconHtml = '<i class="far fa-folder-open me-2"></i>';
        } else {
            rowClass = ''; let indent = level * 20; nameStyle = `padding-left: ${indent}px; color: #212529;`; iconHtml = '<span class="text-muted opacity-25 me-1" style="font-family: monospace;">└─</span>';
        }

        // Input Logic
        let inputHtml = '';
        let dailyPreview = '';

        if (isCalc) {
            inputHtml = `<span class="text-muted small fst-italic">Sum of children</span>`;
            dailyPreview = `<span class="text-muted opacity-25">-</span>`;
        } else {
            // 🔥 แก้ไข: ใช้ตัวแปร currentWorkingDays ในการคำนวณ
            const estDaily = currentWorkingDays > 0 ? (budget / currentWorkingDays) : 0; 
            
            inputHtml = `
                <input type="number" class="form-control form-control-sm text-end fw-bold text-primary budget-input border-0 bg-white shadow-sm" 
                       data-id="${item.item_id}" 
                       value="${budget > 0 ? budget : ''}" 
                       placeholder="0.00"
                       oninput="calcPreview(this)">
            `;
            dailyPreview = formatNumber(estDaily);
        }

        html += `
            <tr class="${rowClass}">
                <td class="align-middle text-nowrap">
                    <div style="${nameStyle}">
                        ${iconHtml} <span class="text-truncate">${item.item_name}</span>
                    </div>
                </td>
                <td class="align-middle">
                    ${inputHtml}
                </td>
                <td class="text-end text-muted small align-middle daily-preview pe-4">
                    ${dailyPreview}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function calcPreview(input) {
    const val = parseFloat(input.value) || 0;
    const daily = currentWorkingDays > 0 ? (val / currentWorkingDays) : 0; 
    const row = input.closest('tr');
    row.querySelector('.daily-preview').innerText = formatNumber(daily);
}

async function saveTarget() {
    const inputs = document.querySelectorAll('.budget-input');
    const payload = [];
    
    inputs.forEach(inp => {
        const val = parseFloat(inp.value);
        if (!isNaN(val)) { // ส่งไปแม้จะเป็น 0 (เพื่อ Clear ค่า)
            payload.push({
                item_id: inp.getAttribute('data-id'),
                amount: val
            });
        }
    });

    const monthStr = document.getElementById('budgetMonth').value; // YYYY-MM
    const [year, month] = monthStr.split('-');
    const section = document.getElementById('sectionFilter').value;

    try {
        const formData = new FormData();
        formData.append('action', 'save_target');
        formData.append('year', year);
        formData.append('month', month);
        formData.append('section', section);
        formData.append('items', JSON.stringify(payload));

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Budget Saved', text: `Working Days Used: ${json.working_days}`, timer: 2000 });
            targetModal.hide();
            loadEntryData(); // Reload หน้าจอหลักเพื่ออัปเดต Target Bar
        } else {
            Swal.fire('Error', json.message, 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Connection Failed', 'error');
    }
}