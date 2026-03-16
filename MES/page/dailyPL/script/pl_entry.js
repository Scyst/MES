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
let autoSaveTimer = null;

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
            
            // วนลูปสร้าง Option จาก Database ล้วนๆ
            json.data.forEach(line => {
                const option = document.createElement('option');
                option.value = line;
                
                // หากเจอค่า ALL ให้เปลี่ยนข้อความแสดงผลให้เป็นจุดสังเกตง่ายๆ
                if (line.toUpperCase() === 'ALL') {
                    option.textContent = '-- All Lines --';
                } else {
                    option.textContent = line;
                }
                
                select.appendChild(option);
            });

            // จำค่าล่าสุดที่เคยเลือกไว้
            if (savedSection && json.data.includes(savedSection)) {
                select.value = savedSection;
            } else {
                select.value = json.data[0]; 
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

    document.getElementById('view-table').classList.remove('active');
    const viewStatement = document.getElementById('view-statement');
    if (viewStatement) viewStatement.classList.remove('active'); 

    const btnBudget = document.getElementById('btnSetBudgetWrapper');
    if(btnBudget) btnBudget.style.display = 'none';
    
    const saveStat = document.getElementById('saveStatus');
    if(saveStat) saveStat.style.visibility = 'hidden';

    if (mode === 'daily') {
        document.getElementById('dailyPickerGroup').classList.remove('d-none');
        document.getElementById('view-table').classList.add('active');
        if(btnBudget) btnBudget.style.display = 'block';
        if(saveStat) saveStat.style.visibility = 'visible';
        loadEntryData();

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
    refreshCurrentView();
}

function refreshCurrentView() {
    if (currentMode === 'statement') {
        loadStatementData();
    } else if (currentMode === 'executive') {
        loadExecutiveData();
    } else {
        loadEntryData();
    }
}
function calculateSummary(data) {
    // 1. ดึงยอดจาก Account Code บรรทัดสุทธิโดยตรง
    const revItem = data.find(d => d.account_code === 'REVENUES');
    const netItem = data.find(d => d.account_code === 'NET_PF');
    
    const totalRevAct = revItem ? (parseFloat(revItem.actual_amount) || 0) : 0;
    const netProfitAct = netItem ? (parseFloat(netItem.actual_amount) || 0) : 0;
    
    // 2. คำนวณค่าใช้จ่ายรวม (ยอดรายได้ หักลบ ยอดกำไร)
    const totalExpAct = totalRevAct - netProfitAct; 
    
    // 3. คำนวณ % Net Margin
    const margin = totalRevAct > 0 ? (netProfitAct / totalRevAct) * 100 : 0;

    // --- Render ขึ้น DOM ---
    const revEl = document.getElementById('cardRevenue');
    if (revEl) revEl.innerText = formatNumber(totalRevAct);
    
    const expEl = document.getElementById('cardExpense');
    if (expEl) expEl.innerText = formatNumber(totalExpAct);
    
    const pfEl = document.getElementById('cardProfit');
    if (pfEl) {
        pfEl.innerText = formatNumber(netProfitAct);
        pfEl.className = netProfitAct >= 0 ? 'mb-0 fw-bold text-success' : 'mb-0 fw-bold text-danger';
        pfEl.parentElement.querySelector('i').className = netProfitAct >= 0 ? 'fas fa-chart-line text-success opacity-50' : 'fas fa-chart-line text-danger opacity-50';
    }
    
    const marginEl = document.getElementById('cardProfitMargin');
    if (marginEl) {
        marginEl.innerText = margin.toFixed(2) + '%';
        marginEl.className = margin >= 0 ? 'mb-0 fw-bold text-success' : 'mb-0 fw-bold text-danger';
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
        const isAuto = item.data_source.includes('AUTO'); 
        const isCalc = item.data_source === 'CALCULATED';

        let rowClass = (level === 0) ? 'level-0' : (level === 1 ? 'level-1' : 'level-deep');
        let indentStyle = (level === 0) ? '' : (level === 1 ? 'padding-left: 1.5rem;' : `padding-left: ${1.5 + (level * 1.5)}rem;`);
        let nameCellClass = (level > 1) ? 'child-item' : '';

        let iconHtml = '';
        if (level === 0) iconHtml = `<i class="fas fa-folder text-primary me-2 fa-lg"></i>`;
        else if (level === 1) iconHtml = `<i class="far fa-folder-open text-secondary me-2"></i>`;
        else iconHtml = `<span class="text-muted opacity-25 me-1" style="font-family: monospace;">└─</span><i class="far fa-file-alt text-muted me-2"></i>`;

        let typeBadge = item.item_type === 'REVENUE' ? `<span class="badge-mini badge-type-rev">R</span>` :
                        item.item_type === 'COGS' ? `<span class="badge-mini badge-type-cogs">C</span>` :
                        `<span class="badge-mini badge-type-exp">E</span>`;

        let sourceBadge = '';
        if (isAuto) sourceBadge = `<span class="badge-mini badge-src-auto" title="Auto System (Read-Only)">A</span>`;
        else if (isCalc) sourceBadge = `<span class="badge-mini badge-src-calc" title="Formula: ${item.calculation_formula || ''}">F</span>`;
        else sourceBadge = `<span class="badge-mini badge-src-manual" title="Manual Input">M</span>`;

        const actual = parseFloat(item.actual_amount) || 0;
        const target = parseFloat(item.daily_target) || 0;
        
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
            if (isAuto) inputClass += 'text-secondary bg-secondary bg-opacity-10 cursor-not-allowed'; 
            else if (isCalc) inputClass += 'text-primary bg-info bg-opacity-10 cursor-default'; 
            else inputClass += 'text-dark bg-white'; 

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
                    placeholder="..." value="${item.remark || ''}" maxlength="255"
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

                <td></td> 
                <td class="text-end text-secondary small align-middle target-cell" data-tgt-id="${item.item_id}" style="font-family: monospace;">
                    ${target > 0 ? formatNumber(target) : '-'}
                </td>

                <td class="text-end" style="width: 140px;">${inputHtml}</td>
                <td class="text-center align-middle diff-cell" data-diff-id="${item.item_id}">${diffHtml}</td>

                <td class="text-center px-3">
                    <div class="d-flex justify-content-center">${typeBadge}${sourceBadge}</div>
                </td>

                <td class="text-end pe-4" style="width: 200px;">${remarkHtml}</td>
            </tr>`;
    });

    tbody.innerHTML = html;
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

    const isRemarkField = input.getAttribute('placeholder') === '...';
    let val = input.value.replace(/,/g, '');
    if (val === '' || isNaN(val)) val = 0;
    const floatVal = parseFloat(val);
    
    // อัปเดตค่าลงใน currentData ทันทีเพื่อให้ UI ตอบสนองเร็ว
    const itemIndex = currentData.findIndex(d => d.item_id == itemId);
    if (itemIndex > -1) {
        if (!isRemarkField) {
            input.value = formatNumber(floatVal);
            currentData[itemIndex].actual_amount = floatVal;
            runFormulaEngine(currentData); // คำนวณสูตรบนหน้าจอทันที
        } else {
            currentData[itemIndex].remark = input.value;
        }
    }

    const statusEl = document.getElementById('saveStatus');
    statusEl.innerHTML = '<i class="fas fa-ellipsis-h text-muted me-1"></i> Waiting to save...';
    statusEl.classList.remove('opacity-0');
    statusEl.style.visibility = 'visible';

    // หน่วงเวลา 800ms หากมีการกด Tab หรือพิมพ์รัวๆ จะรีเซ็ตเวลาใหม่ (ยิง API แค่รอบเดียวตอนจบ)
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
        if (isSaving) return;
        isSaving = true;
        
        statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin text-primary me-1"></i> Saving...';

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
                statusEl.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i> <span class="text-success fw-bold">Auto Saved</span>';
                setTimeout(() => { statusEl.classList.add('opacity-0'); }, 2000);
            } else {
                throw new Error(json.message);
            }
        } catch (err) {
            console.error(err);
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-1"></i> Save Failed';
        } finally {
            isSaving = false;
        }
    }, 800);
}

function runFormulaEngine(dataset = currentData) {
    let hasChanged = false;
    let maxLoop = 15;
    for (let i = 0; i < maxLoop; i++) {
        hasChanged = false;
        dataset.forEach(item => {
            if (item.data_source === 'CALCULATED') {
                const oldValAct = parseFloat(item.actual_amount) || 0;
                const oldValTgt = parseFloat(item.daily_target) || 0;
                let newValAct = 0;
                let newValTgt = 0; 
                
                try {
                    // ดึงสูตรมาแปลงเป็นตัวพิมพ์ใหญ่และตัดช่องว่างทิ้ง เพื่อให้เช็คเงื่อนไขง่ายขึ้น
                    const formulaStr = (item.calculation_formula || '').trim().toUpperCase();
                    
                    if (formulaStr === 'SUM_CHILDREN') {
                        const children = dataset.filter(child => child.parent_id == item.item_id);
                        newValAct = children.reduce((sum, child) => sum + (parseFloat(child.actual_amount) || 0), 0);
                        newValTgt = children.reduce((sum, child) => sum + (parseFloat(child.daily_target) || 0), 0);
                        
                    // 🔥 [NEW FEATURE] ถ้าสูตรคือ USE_TARGET ให้ก็อปปี้ Target มาใส่ Actual เลย
                    } else if (formulaStr === 'USE_TARGET') {
                        newValAct = parseFloat(item.daily_target) || 0;
                        newValTgt = parseFloat(item.daily_target) || 0;
                        
                    } else if (item.calculation_formula) {
                        let formulaAct = item.calculation_formula;
                        let formulaTgt = item.calculation_formula;
                        
                        const matches = formulaAct.match(/\[(.*?)\]/g);
                        if (matches) {
                            matches.forEach(token => {
                                const code = token.replace('[', '').replace(']', '');
                                const refItem = dataset.find(d => d.account_code === code);
                                
                                const refValAct = refItem ? (parseFloat(refItem.actual_amount) || 0) : 0;
                                const refValTgt = refItem ? (parseFloat(refItem.daily_target) || 0) : 0;
                                
                                formulaAct = formulaAct.replace(token, `(${refValAct})`);
                                formulaTgt = formulaTgt.replace(token, `(${refValTgt})`);
                            });
                        }
                        
                        const safeFormulaAct = formulaAct.replace(/[^0-9+\-*/(). ]/g, ''); 
                        const safeFormulaTgt = formulaTgt.replace(/[^0-9+\-*/(). ]/g, '');
                        
                        if (safeFormulaAct.trim() !== '') {
                            try { newValAct = new Function('return ' + safeFormulaAct)(); } catch(e) { newValAct = 0; }
                        }
                        if (safeFormulaTgt.trim() !== '') {
                            try { newValTgt = new Function('return ' + safeFormulaTgt)(); } catch(e) { newValTgt = 0; }
                        }
                    }
                } catch (e) { newValAct = 0; newValTgt = 0; }
                
                if (!isFinite(newValAct) || isNaN(newValAct)) newValAct = 0;
                if (!isFinite(newValTgt) || isNaN(newValTgt)) newValTgt = 0;
                
                if (Math.abs(newValAct - oldValAct) > 0.001 || Math.abs(newValTgt - oldValTgt) > 0.001) {
                    item.actual_amount = newValAct;
                    item.daily_target = newValTgt; 
                    hasChanged = true;
                    
                    // อัปเดต UI เฉพาะกรณีที่เป็นข้อมูลชุดหลัก (currentData)
                    if (dataset === currentData) {
                        const inputEl = document.querySelector(`input[data-id="${item.item_id}"]`);
                        if (inputEl) {
                            inputEl.value = formatNumber(newValAct);
                            inputEl.parentElement.classList.add('bg-warning', 'bg-opacity-25');
                            setTimeout(() => inputEl.parentElement.classList.remove('bg-warning', 'bg-opacity-25'), 500);
                        }

                        const tgtEl = document.querySelector(`.target-cell[data-tgt-id="${item.item_id}"]`);
                        if (tgtEl) tgtEl.innerText = newValTgt > 0 ? formatNumber(newValTgt) : '-';
                        
                        const diffEl = document.querySelector(`.diff-cell[data-diff-id="${item.item_id}"]`);
                        if (diffEl) {
                            if (newValTgt > 0) {
                                let diff = newValAct - newValTgt;
                                let percent = (diff / newValTgt) * 100;
                                let colorClass = 'text-muted';
                                if (item.item_type === 'REVENUE') {
                                    if (diff < -0.01) colorClass = 'text-danger fw-bold'; else if (diff > 0.01) colorClass = 'text-success fw-bold';
                                } else {
                                    if (diff > 0.01) colorClass = 'text-danger fw-bold'; else if (diff < -0.01) colorClass = 'text-success fw-bold';
                                }
                                let arrow = diff > 0 ? '↑' : '↓'; if (Math.abs(diff) < 0.01) arrow = '';
                                diffEl.innerHTML = `<span class="${colorClass}" style="font-size: 0.8rem;" title="Diff: ${formatNumber(diff)}">${arrow} ${Math.abs(percent).toFixed(0)}%</span>`;
                            } else {
                                diffEl.innerHTML = '<span class="text-muted opacity-25">-</span>';
                            }
                        }
                    }
                }
            }
        });
        if (!hasChanged) break;
    }
    if (dataset === currentData) calculateSummary(dataset);
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

// 1. แก้ไขให้เข้ารหัสชื่อ Section ป้องกัน URL Request พัง
async function fetchMonthlyBudgets() {
    const monthStr = document.getElementById('budgetMonth').value;
    const [year, month] = monthStr.split('-');
    const section = document.getElementById('sectionFilter').value;

    try {
        // เพิ่ม encodeURIComponent เพื่อจัดการอักขระพิเศษและเว้นวรรค
        const res = await fetch(`api/manage_pl_entry.php?action=get_target_data&year=${year}&month=${month}&section=${encodeURIComponent(section)}`);
        const json = await res.json();
        
        if (json.success) {
            const budgetMap = json.data;
            document.querySelectorAll('.budget-input').forEach(input => {
                const itemId = input.getAttribute('data-id');
                const val = budgetMap[itemId];
                // โหลดค่ามาใส่ ถ้าหาไม่เจอให้เป็นช่องว่าง
                input.value = (val !== undefined && val !== null) ? val : '';
                calcPreview(input);
            });
        }
    } catch (e) { 
        console.error("Fetch Budget Error:", e); 
    }
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
    const btnSave = document.querySelector('#targetModal .btn-primary'); // ปุ่ม Save ใน Modal
    if (isSaving) return;

    const inputs = document.querySelectorAll('.budget-input');
    const payload = [];
    
    inputs.forEach(inp => {
        let val = parseFloat(inp.value);
        if (isNaN(val)) val = 0; // แปลงค่าว่างให้เป็น 0
        
        let itemId = parseInt(inp.getAttribute('data-id'));
        if (!isNaN(itemId)) {
            payload.push({ item_id: itemId, amount: val });
        }
    });

    if (payload.length === 0) {
        Swal.fire('Warning', 'No budget inputs found to save.', 'warning');
        return;
    }

    const monthStr = document.getElementById('budgetMonth').value; 
    const [year, month] = monthStr.split('-');
    const section = document.getElementById('sectionFilter').value;

    try {
        isSaving = true;
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const formData = new FormData();
        formData.append('action', 'save_target');
        formData.append('year', parseInt(year)); 
        formData.append('month', parseInt(month));
        formData.append('section', section); 
        formData.append('items', JSON.stringify(payload));

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        
        // ดัก Error ระดับ Network (HTTP 500)
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const json = await res.json();

        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Budget Saved', timer: 1500, showConfirmButton: false });
            targetModal.hide();
            if(currentMode === 'daily') loadEntryData();
        } else {
            Swal.fire('Error', json.message, 'error');
        }
    } catch (err) { 
        console.error(err); 
        Swal.fire('Error', 'Connection Failed or Server Error', 'error'); 
    } finally {
        isSaving = false;
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = 'Save Target';
        }
    }
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
// 6. MASTER EXPORT (1-Click All Sheets)
// ========================================================
async function exportMasterExcel() {
    const section = document.getElementById('sectionFilter')?.value || 'ALL';
    const date = document.getElementById('targetDate')?.value || new Date().toISOString().split('T')[0];
    const year = date.split('-')[0];
    const safeSection = section.replace(/[^a-zA-Z0-9]/g, "_");
    
    Swal.fire({
        title: 'Generating Master Report...',
        html: 'ระบบกำลังประมวลผลข้อมูล กรุณารอสักครู่',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const [resDaily, resYearly] = await Promise.all([
            fetch(`api/manage_pl_entry.php?action=read&entry_date=${date}&section=${encodeURIComponent(section)}`),
            fetch(`api/manage_pl_entry.php?action=statement_yearly&year=${year}&section=${encodeURIComponent(section)}`)
        ]);
        
        const jsonDaily = await resDaily.json();
        const jsonYearly = await resYearly.json();

        if (!jsonDaily.success || !jsonYearly.success) throw new Error("Failed to fetch data");

        let entryData = jsonDaily.data;
        runFormulaEngine(entryData);

        let stmtData = jsonYearly.data;
        calculateStatementFormulas(stmtData, 'yearly');

        const wb = XLSX.utils.book_new();
        const ws1_rows = [["Account Name", "Code", "Target", "Actual", "Diff", "Note", "Source"]];
        entryData.forEach(item => {
            let indent = "    ".repeat(parseInt(item.item_level) || 0);
            let tgt = parseFloat(item.daily_target) || 0;
            let act = parseFloat(item.actual_amount) || 0;
            ws1_rows.push([
                indent + item.item_name, item.account_code, 
                tgt, act, act - tgt, item.remark || "", item.data_source
            ]);
        });
        const ws1 = XLSX.utils.aoa_to_sheet(ws1_rows);
        ws1['!cols'] = [{ wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws1, `Daily_Entry_${date}`);

        const ws2_rows = buildYearlyAOA(stmtData, year, false);
        const ws2 = XLSX.utils.aoa_to_sheet(ws2_rows);
        ws2['!cols'] = [{ wch: 45 }]; for(let i=0; i<70; i++) ws2['!cols'].push({wch: 13});
        XLSX.utils.book_append_sheet(wb, ws2, `Statement_Y${year}`);

        const ws3_rows = buildYearlyAOA(stmtData, year, true);
        const ws3 = XLSX.utils.aoa_to_sheet(ws3_rows);
        ws3['!cols'] = [{ wch: 45 }]; for(let i=0; i<70; i++) ws3['!cols'].push({wch: 13});
        XLSX.utils.book_append_sheet(wb, ws3, `Executive_Y${year}`);

        XLSX.writeFile(wb, `Master_PL_${year}_${safeSection}.xlsx`);
        Swal.close();

    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Failed to generate Master Excel', 'error');
    }
}

function buildYearlyAOA(data, year, isExecutive) {
    let aoa = [];
    const months = ['Jan','Feb','Mar','Q1','Apr','May','Jun','Q2','Jul','Aug','Sep','Q3','Oct','Nov','Dec','Q4','YTD'];
    
    let h1 = ["Account Name"];
    months.forEach(m => { h1.push(`${m} ${!m.startsWith('Q') && m !== 'YTD' ? year : ''}`, "", "", ""); });
    aoa.push(h1);

    let h2 = [""];
    months.forEach(() => { h2.push("Target", "%", "Actual", "%"); });
    aoa.push(h2);

    let base = { act: Array(13).fill(0), tgt: Array(13).fill(0) };
    const getAct = (code, m) => { const item = data.find(d => d.account_code === code); return item ? (parseFloat(item[`m${m}_act`]) || 0) : 0; };
    const getTgt = (code, m) => { const item = data.find(d => d.account_code === code); return item ? (parseFloat(item[`m${m}_tgt`]) || 0) : 0; };

    for(let m=1; m<=12; m++) {
        base.act[m] = getAct("REVENUES", m);
        base.tgt[m] = getTgt("REVENUES", m);
    }
    
    const getBaseQ = (q, type) => base[type][q*3-2] + base[type][q*3-1] + base[type][q*3];
    const getBaseY = (type) => getBaseQ(1, type) + getBaseQ(2, type) + getBaseQ(3, type) + getBaseQ(4, type);

    const genVals = (act, tgt, bAct, bTgt) => {
        let aPct = bAct ? (act/bAct*100).toFixed(2)+"%" : "-";
        let tPct = bTgt ? (tgt/bTgt*100).toFixed(2)+"%" : "-";
        return [tgt, tPct, act, aPct]; 
    };

    if (!isExecutive) {
        data.forEach(item => {
            let row = ["    ".repeat(parseInt(item.item_level)||0) + item.item_name];
            let yAct=0, yTgt=0;
            for (let q=1; q<=4; q++) {
                let qAct=0, qTgt=0;
                for(let m=(q*3)-2; m<=q*3; m++){
                    let act = parseFloat(item[`m${m}_act`])||0;
                    let tgt = parseFloat(item[`m${m}_tgt`])||0;
                    qAct += act; qTgt += tgt;
                    row.push(...genVals(act, tgt, base.act[m], base.tgt[m]));
                }
                yAct += qAct; yTgt += qTgt;
                row.push(...genVals(qAct, qTgt, getBaseQ(q,'act'), getBaseQ(q,'tgt')));
            }
            row.push(...genVals(yAct, yTgt, getBaseY('act'), getBaseY('tgt')));
            aoa.push(row);
        });
    } else {
        const template = getExecTemplate(getAct, getTgt);
        template.forEach(tRow => {
            let row = ["    ".repeat(tRow.indent||0) + tRow.label];
            let yAct=0, yTgt=0;
            for(let q=1; q<=4; q++){
                let qAct=0, qTgt=0;
                for(let m=(q*3)-2; m<=q*3; m++){
                    let act = tRow.calcAct ? tRow.calcAct(m) : getAct(tRow.code, m);
                    let tgt = tRow.calcTgt ? tRow.calcTgt(m) : getTgt(tRow.code, m);
                    qAct+=act; qTgt+=tgt;
                    row.push(...genVals(act, tgt, base.act[m], base.tgt[m]));
                }
                yAct += qAct; yTgt += qTgt;
                row.push(...genVals(qAct, qTgt, getBaseQ(q,'act'), getBaseQ(q,'tgt')));
            }
            row.push(...genVals(yAct, yTgt, getBaseY('act'), getBaseY('tgt')));
            aoa.push(row);
        });
    }
    return aoa;
}

// ========================================================
// 7. DASHBOARD CHARTS
// ========================================================
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
        
        // ลบ target: document.getElementById('targetModal') ออกจากตรงนี้
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
                fetchCurrentRate(); // โหลดค่าใหม่ถ้าเกิดกำลังเปิดหน้า Target Modal อยู่
            }
        } catch(e) {
            Swal.fire('Error', 'Connection failed', 'error');
        }
    }
}

// ========================================================
// 8. SNAPSHOT LOGIC (SAVE ALL)
// ========================================================
async function loadStatementData() {
    const tbody = document.getElementById('statementTableBody');
    const section = document.getElementById('sectionFilter')?.value || 'ALL';
    tbody.innerHTML = '<tr><td class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        let res, json;
        if (currentStatementView === 'yearly') {
            const year = document.getElementById('statementYear')?.value || new Date().getFullYear();
            res = await fetch(`api/manage_pl_entry.php?action=statement_yearly&year=${year}&section=${encodeURIComponent(section)}`);
            json = await res.json();
            if (json.success) {
                calculateStatementFormulas(json.data, 'yearly');
                renderStatementTableYearly(json.data, year); 
            }
        } else {
            const monthStr = document.getElementById('statementMonth')?.value || new Date().toISOString().slice(0,7);
            const [year, month] = monthStr.split('-');
            res = await fetch(`api/manage_pl_entry.php?action=statement_daily&year=${year}&month=${month}&section=${encodeURIComponent(section)}`);
            json = await res.json();
            if (json.success) {
                calculateStatementFormulas(json.data, 'daily');
                renderStatementTableDaily(json.data, year, month, json.locked_days || []);
            }
        }
        if (!json.success) tbody.innerHTML = `<tr><td class="text-center text-danger py-5">${json.message}</td></tr>`;
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

function calculateStatementFormulas(data, mode) {
    let maxLoop = 15; 
    let limit = (mode === 'yearly') ? 12 : 31;
    let prefix = (mode === 'yearly') ? 'm' : 'd';

    for (let loop = 0; loop < maxLoop; loop++) {
        let hasChanged = false;
        data.forEach(item => {
            if (item.data_source === 'CALCULATED') {
                for (let i = 1; i <= limit; i++) {
                    let oldValAct = parseFloat(item[`${prefix}${i}_act`]) || 0;
                    let newValAct = 0;
                    
                    let oldValTgt = parseFloat(item[`${prefix}${i}_tgt`]) || 0;
                    let newValTgt = 0; 
                    
                    try {
                        const formulaStr = (item.calculation_formula || '').trim().toUpperCase();
                        
                        if (formulaStr === 'SUM_CHILDREN') {
                            const children = data.filter(child => child.parent_id == item.item_id);
                            newValAct = children.reduce((sum, child) => sum + (parseFloat(child[`${prefix}${i}_act`]) || 0), 0);
                            newValTgt = children.reduce((sum, child) => sum + (parseFloat(child[`${prefix}${i}_tgt`]) || 0), 0);
                            
                        // 🔥 [NEW FEATURE] คัดลอก Target ของเดือน/วัน นั้นๆ มาใส่ Actual
                        } else if (formulaStr === 'USE_TARGET') {
                            newValAct = parseFloat(item[`${prefix}${i}_tgt`]) || 0;
                            newValTgt = parseFloat(item[`${prefix}${i}_tgt`]) || 0;
                            
                        } else if (item.calculation_formula) {
                            let formulaAct = item.calculation_formula;
                            let formulaTgt = item.calculation_formula;
                            
                            const matches = formulaAct.match(/\[(.*?)\]/g);
                            if (matches) {
                                matches.forEach(token => {
                                    const code = token.replace('[', '').replace(']', '');
                                    const refItem = data.find(d => d.account_code === code);
                                    
                                    const refValAct = refItem ? (parseFloat(refItem[`${prefix}${i}_act`]) || 0) : 0;
                                    const refValTgt = refItem ? (parseFloat(refItem[`${prefix}${i}_tgt`]) || 0) : 0;
                                    
                                    formulaAct = formulaAct.replace(token, `(${refValAct})`);
                                    formulaTgt = formulaTgt.replace(token, `(${refValTgt})`);
                                });
                            }
                            
                            const safeFormulaAct = formulaAct.replace(/[^0-9+\-*/(). ]/g, ''); 
                            const safeFormulaTgt = formulaTgt.replace(/[^0-9+\-*/(). ]/g, ''); 
                            
                            if (safeFormulaAct.trim() !== '') {
                                try { newValAct = new Function('return ' + safeFormulaAct)(); } 
                                catch (e) { newValAct = 0; }
                            }
                            
                            if (safeFormulaTgt.trim() !== '') {
                                try { newValTgt = new Function('return ' + safeFormulaTgt)(); } 
                                catch (e) { newValTgt = 0; }
                            }
                        }
                    } catch (e) { 
                        newValAct = 0; 
                        newValTgt = 0; 
                    }
                    
                    if (!isFinite(newValAct) || isNaN(newValAct)) newValAct = 0;
                    if (!isFinite(newValTgt) || isNaN(newValTgt)) newValTgt = 0;
                    
                    if (Math.abs(newValAct - oldValAct) > 0.001 || Math.abs(newValTgt - oldValTgt) > 0.001) {
                        item[`${prefix}${i}_act`] = newValAct;
                        item[`${prefix}${i}_tgt`] = newValTgt;
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

function renderStatementTableDaily(data, year, month, lockedDays = []) {
    const thead = document.getElementById('statementThead');
    const tbody = document.getElementById('statementTableBody');
    const daysInMonth = new Date(year, month, 0).getDate();

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

    let headRow1 = `<tr><th rowspan="2" class="align-middle text-start ps-3">Account Name</th>`;
    let headRow2 = `<tr>`;

    for (let d = 1; d <= daysInMonth; d++) {
        // 🔥 ถ้าวันไหนมีใน Array lockedDays ให้แสดงไอคอนแม่กุญแจ 🔒 สีแดง
        let lockIcon = lockedDays.includes(d) ? ' <i class="fas fa-lock text-danger ms-1" title="Locked"></i>' : '';
        headRow1 += `<th colspan="4" class="border-bottom-0">Day ${d}${lockIcon}</th>`;
        headRow2 += `
            <th class="text-muted fw-normal">Target</th>
            <th class="text-muted fw-normal">%</th>
            <th class="text-primary">Actual</th>
            <th class="text-info">%</th>
        `;
    }
    
    headRow1 += `<th colspan="4" class="bg-year border-bottom-0">MTD (Total)</th></tr>`;
    headRow2 += `
        <th class="bg-year text-muted fw-normal">Target</th>
        <th class="bg-year text-muted fw-normal">%</th>
        <th class="bg-year text-primary">Actual</th>
        <th class="bg-year text-info">%</th></tr>
    `;
    
    thead.innerHTML = headRow1 + headRow2;

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
    const section = document.getElementById('sectionFilter')?.value || 'ALL';
    tbody.innerHTML = '<tr><td class="text-center py-5"><div class="spinner-border text-dark"></div></td></tr>';

    try {
        let res, json;
        if (currentExecMode === 'yearly') {
            const year = document.getElementById('execYear')?.value || new Date().getFullYear();
            res = await fetch(`api/manage_pl_entry.php?action=statement_yearly&year=${year}&section=${encodeURIComponent(section)}`);
            json = await res.json();
            if (json.success) {
                calculateStatementFormulas(json.data, 'yearly');
                renderExecutiveTableYearly(json.data, year);
            }
        } else {
            const monthStr = document.getElementById('execMonth')?.value || new Date().toISOString().slice(0,7);
            const [year, month] = monthStr.split('-');
            res = await fetch(`api/manage_pl_entry.php?action=statement_daily&year=${year}&month=${month}&section=${encodeURIComponent(section)}`);
            json = await res.json();
            if (json.success) {
                calculateStatementFormulas(json.data, 'daily');
                renderExecutiveTableDaily(json.data, year, month, json.locked_days || []);
            }
        }
        if (!json.success) tbody.innerHTML = `<tr><td class="text-center text-danger py-5">${json.message}</td></tr>`;
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

const getExecTemplate = (getAct, getTgt) => {
    // Helper Functions สำหรับคำนวณยอดรวมหลัก
    const getGrossAct = (p) => getAct("REVENUES", p) - getAct("COGS", p);
    const getGrossTgt = (p) => getTgt("REVENUES", p) - getTgt("COGS", p);
    
    const getSgaAct = (p) => getAct("SELL_EXP", p) + getAct("ADMIN_FC", p);
    const getSgaTgt = (p) => getTgt("SELL_EXP", p) + getTgt("ADMIN_FC", p);

    // กำไรจากการดำเนินงาน (Profit) = GP - SG&A
    const getProfitAct = (p) => getGrossAct(p) - getSgaAct(p);
    const getProfitTgt = (p) => getGrossTgt(p) - getSgaTgt(p);

    // EBIT = Profit + รายได้อื่น - ค่าใช้จ่ายพิเศษ/โบนัส (สมมติว่า EX คือผลรวม Extra แล้ว)
    const getEbitAct = (p) => getProfitAct(p) + getAct("OT_IC", p) - getAct("EX", p);
    const getEbitTgt = (p) => getProfitTgt(p) + getTgt("OT_IC", p) - getTgt("EX", p);

    return [
        { label: "SALE", code: "REVENUES", isBold: true, bg: "#e7f1ff", isBase: true },
        
        { label: "RM", isBold: true, calcAct: (p) => getAct("GRP_RM", p) + getAct("CR_R", p), calcTgt: (p) => getTgt("GRP_RM", p) + getTgt("CR_R", p) },
        
        { label: "DLOT", code: "GRP_DL", isBold: true },
        { label: "DL", indent: 1, calcAct: (p) => getAct("522001", p) + getAct("522003", p) + getAct("DL_SCAN", p), calcTgt: (p) => getTgt("522001", p) + getTgt("522003", p) + getTgt("DL_SCAN", p) },
        { label: "OT", indent: 1, calcAct: (p) => getAct("522002", p) + getAct("522004", p) + getAct("OT_SCAN", p), calcTgt: (p) => getTgt("522002", p) + getTgt("522004", p) + getTgt("OT_SCAN", p) },
        
        { label: "OH", isBold: true, calcAct: (p) => getAct("OH_FC", p) + getAct("OH_VC", p), calcTgt: (p) => getTgt("OH_FC", p) + getTgt("OH_VC", p) },
        
        { label: "OH FC", code: "OH_FC", isBold: true },
        { label: "Staff expenses", indent: 1, code: "GRP_STF" },
        { label: "Depreciation", indent: 1, code: "GRP_DEP" },
        { label: "Rental expense", indent: 1, code: "GRP_RT" },
        
        { label: "OH VC", code: "OH_VC", isBold: true },
        { label: "Utilities", indent: 1, code: "GRP_UTIL" },
        { label: "Subcontract", indent: 1, code: "GRP_SUB" },
        { label: "Accessories", indent: 1, code: "GRP_AC" },
        { label: "Repair", indent: 1, code: "GRP_REP" },
        { label: "Others", indent: 1, calcAct: (p) => getAct("GRP_TRV", p) + getAct("GRP_OT", p) + getAct("GRP_OTR", p), calcTgt: (p) => getTgt("GRP_TRV", p) + getTgt("GRP_OT", p) + getTgt("GRP_OTR", p) },
        
        { label: "Total CoGS", code: "COGS", isBold: true, text: "danger", bg: "#fff3cd" },
        
        { label: "Gross Profit", isBold: true, text: "success", bg: "#d1e7dd", calcAct: (p) => getGrossAct(p), calcTgt: (p) => getGrossTgt(p) },
        
        { label: "Selling VC", code: "SELL_EXP", isBold: true },
        { label: "Transportation", indent: 1, code: "542006" }, // แก้ชื่อให้ตรง Excel (เดิมคือ Export Exp.)
        { label: "Selling VC others", indent: 1, calcAct: (p) => getAct("SELL_EXP", p) - getAct("542006", p), calcTgt: (p) => getTgt("SELL_EXP", p) - getTgt("542006", p) },
        
        { label: "Admin FC", code: "ADMIN_FC", isBold: true },
        { label: "Staff expenses", indent: 1, calcAct: (p) => getAct("GRP_AD_STF", p) + getAct("GRP_AD_ST", p), calcTgt: (p) => getTgt("GRP_AD_STF", p) + getTgt("GRP_AD_ST", p) },
        { label: "Service fee", indent: 1, code: "GRP_SVF" },
        { label: "Rental expenses", indent: 1, code: "GRP_AD_RT" },
        { label: "Depreciation", indent: 1, code: "GRP_AD_DSP" },
        // ดึง Utilities ของ Admin มารวมใน Others ให้ตรงกับ Excel ที่มีแค่บรรทัด Others ปิดท้าย
        { label: "Others", indent: 1, calcAct: (p) => getAct("GRP_OFF", p) + getAct("GRP_AD_OT", p) + getAct("GRP_AD_UTL", p), calcTgt: (p) => getTgt("GRP_OFF", p) + getTgt("GRP_AD_OT", p) + getTgt("GRP_AD_UTL", p) },
        
        { label: "SG&A", isBold: true, text: "danger", bg: "#fff3cd", calcAct: (p) => getSgaAct(p), calcTgt: (p) => getSgaTgt(p) },
        
        { label: "Profit", isBold: true, bg: "#f8f9fa", calcAct: (p) => getProfitAct(p), calcTgt: (p) => getProfitTgt(p) },
        
        { label: "Other income", code: "OT_IC", isBold: true },
        { label: "Bonus OH & Admin", indent: 1, calcAct: (p) => getAct("541014", p) + getAct("541015_1", p), calcTgt: (p) => getTgt("541014", p) + getTgt("541015_1", p) },
        { label: "Management bonus", indent: 1, code: "541015_2" },
        { label: "Extra", indent: 1, calcAct: (p) => getAct("541015_3", p) + (getAct("EX", p) - (getAct("541014", p) + getAct("541015_1", p) + getAct("541015_2", p) + getAct("541015_3", p))), calcTgt: (p) => getTgt("541015_3", p) + (getTgt("EX", p) - (getTgt("541014", p) + getTgt("541015_1", p) + getTgt("541015_2", p) + getTgt("541015_3", p))) }, 
        
        { label: "EBIT", isBold: true, bg: "#e0f8f1", calcAct: (p) => getEbitAct(p), calcTgt: (p) => getEbitTgt(p) },
        
        { label: "Interest expense", code: "ITR_C" },
        { label: "Tax", code: "TAX" },
        
        { label: "EAT", isBold: true, bg: "#e0f8f1", calcAct: (p) => getEbitAct(p) - getAct("ITR_C", p) - getAct("TAX", p), calcTgt: (p) => getEbitTgt(p) - getTgt("ITR_C", p) - getTgt("TAX", p) },
        
        { label: "Depreciation", text: "muted", calcAct: (p) => getAct("GRP_DEP", p) + getAct("GRP_AD_DSP", p), calcTgt: (p) => getTgt("GRP_DEP", p) + getTgt("GRP_AD_DSP", p) },
        { label: "Interest expense", text: "muted", code: "ITR_C" },
        { label: "Tax", text: "muted", code: "TAX" },
        
        { label: "EBITDA", isBold: true, text: "primary", bg: "#e7f1ff", calcAct: (p) => getEbitAct(p) + getAct("GRP_DEP", p) + getAct("GRP_AD_DSP", p), calcTgt: (p) => getEbitTgt(p) + getTgt("GRP_DEP", p) + getTgt("GRP_AD_DSP", p) }
    ];
};

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
function renderExecutiveTableDaily(data, year, month, lockedDays = []) {
    const thead = document.getElementById('execThead');
    const tbody = document.getElementById('execTableBody');
    const daysInMonth = new Date(year, month, 0).getDate();

    const getAct = (code, d) => { const item = data.find(x => x.account_code === code); return item ? (parseFloat(item[`d${d}_act`]) || 0) : 0; };
    const getTgt = (code, d) => { const item = data.find(x => x.account_code === code); return item ? (parseFloat(item[`d${d}_tgt`]) || 0) : 0; };
    const template = getExecTemplate(getAct, getTgt);

    let headRow1 = `<tr><th rowspan="2" class="align-middle text-start ps-4" style="min-width: 250px;">Account Name</th>`;
    let headRow2 = `<tr>`;

    for (let d = 1; d <= daysInMonth; d++) {
        // 🔥 เพิ่มไอคอนแม่กุญแจ
        let lockIcon = lockedDays.includes(d) ? ' <i class="fas fa-lock text-danger ms-1" title="Locked"></i>' : '';
        headRow1 += `<th colspan="4" class="border-bottom-0">Day ${d}${lockIcon}</th>`;
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

async function loadEntryData() {
    const tbody = document.getElementById('entryTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center align-middle" style="height: 200px;">
                <div class="spinner-border text-primary mb-2" role="status"></div>
                <div class="text-muted small">Loading P&L Data...</div>
            </td>
        </tr>`;

    const section = document.getElementById('sectionFilter')?.value || 'ALL';
    const todayStr = new Date().toISOString().split('T')[0];
    let url = '';

    if (currentMode === 'daily') {
        const date = document.getElementById('targetDate')?.value || todayStr;
        url = `api/manage_pl_entry.php?action=read&entry_date=${date}&section=${encodeURIComponent(section)}`;
        if (typeof fetchWorkingDays === 'function') fetchWorkingDays(); 
    } else {
        const start = document.getElementById('startDate')?.value || todayStr;
        const end = document.getElementById('endDate')?.value || todayStr;
        url = `api/manage_pl_entry.php?action=report_range&start_date=${start}&end_date=${end}&section=${encodeURIComponent(section)}`;
    }

    try {
        const response = await fetch(url);
        const res = await response.json();

        if (res.success) {
            currentData = res.data;
            isPeriodLocked = false; 
            if (currentMode === 'daily' && res.is_locked === 1) {
                isPeriodLocked = true;
            }

            const btnLock = document.getElementById('btnToggleLock');
            const iconLock = document.getElementById('iconLock');
            const textLock = document.getElementById('textLock');
            
            if (btnLock) {
                btnLock.classList.remove('btn-outline-danger', 'btn-danger');
                if (isPeriodLocked) {
                    btnLock.classList.add('btn-danger');
                    if (iconLock) iconLock.className = 'fas fa-lock me-1';
                    if (textLock) textLock.innerText = 'Unlock Day';
                } else {
                    btnLock.classList.add('btn-outline-danger');
                    if (iconLock) iconLock.className = 'fas fa-lock-open me-1';
                    if (textLock) textLock.innerText = 'Lock Day';
                }
            }

            if (typeof runFormulaEngine === 'function') runFormulaEngine(); 
            renderEntryTable(currentData);
            if(typeof calculateSummary === 'function') calculateSummary(currentData);

            const saveBtn = document.getElementById('btnSaveSnapshot');
            if (isPeriodLocked) {
                const allInputs = tbody.querySelectorAll('input');
                allInputs.forEach(inp => {
                    inp.disabled = true;
                    inp.classList.add('bg-light'); 
                });
                if(saveBtn) saveBtn.style.display = 'none';
            } else {
                if(saveBtn) saveBtn.style.display = 'inline-block';
            }
            
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-5">${res.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Load Data Error:", error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

async function togglePeriodLock() {
    const btn = document.getElementById('btnToggleLock');
    if (btn) {
        if (btn.disabled || isSaving) return;
        btn.disabled = true;
    }

    const start = document.getElementById('targetDate')?.value || new Date().toISOString().split('T')[0];
    const section = document.getElementById('sectionFilter')?.value || 'ALL';

    clearTimeout(autoSaveTimer);

    try {
        isSaving = true;
        const isCurrentlyLocked = btn.classList.contains('btn-danger');
        
        if (!isCurrentlyLocked) {
            const payload = currentData.map(item => ({
                item_id: item.item_id,
                amount: parseFloat(item.actual_amount) || 0,
                remark: item.remark || ''
            }));
            
            const formData = new FormData();
            formData.append('action', 'save_batch');
            formData.append('entry_date', start);
            formData.append('section', section);
            formData.append('items', JSON.stringify(payload));
            
            const saveRes = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
            if (!saveRes.ok) throw new Error(`HTTP Error on save: ${saveRes.status}`);
            
            const saveJson = await saveRes.json();
            if (!saveJson.success) throw new Error("Save before lock failed: " + saveJson.message);
        }

        const fd = new FormData();
        fd.append('action', 'toggle_lock');
        fd.append('entry_date', start);
        fd.append('section', section);

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(`HTTP Error on lock: ${res.status}`);
        
        const json = await res.json();
        
        if (json.success) {
            await loadEntryData(); 
            
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                icon: json.is_locked ? 'success' : 'info',
                title: json.is_locked ? 'Period Locked 🔒' : 'Period Unlocked 🔓'
            });
        } else {
            throw new Error(json.message);
        }
    } catch(e) {
        console.error("Lock Error:", e);
        Swal.fire('Error', e.message || 'Connection Failed', 'error');
    } finally {
        isSaving = false;
        if (btn) btn.disabled = false;
    }
}

async function saveDailySnapshot(silent = false) {
    if (currentMode !== 'daily' || isPeriodLocked || isSaving) return; 
    
    const btnSave = document.getElementById('btnSaveSnapshot');
    if (btnSave && btnSave.disabled) return;

    if (!silent) {
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
    }

    try {
        isSaving = true;
        clearTimeout(autoSaveTimer);

        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
        }

        const statusEl = document.getElementById('saveStatus');
        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin text-primary me-1"></i> Saving Snapshot...';
            statusEl.classList.remove('opacity-0');
            statusEl.style.visibility = 'visible';
        }

        const payload = currentData.map(item => ({
            item_id: item.item_id,
            amount: parseFloat(item.actual_amount) || 0,
            remark: item.remark || ''
        }));

        const targetDate = document.getElementById('targetDate')?.value || new Date().toISOString().split('T')[0];
        const targetSection = document.getElementById('sectionFilter')?.value || 'ALL';

        const formData = new FormData();
        formData.append('action', 'save_batch');
        formData.append('entry_date', targetDate);
        formData.append('section', targetSection);
        formData.append('items', JSON.stringify(payload));

        const response = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        
        // ดัก Error ระดับ Network ป้องกัน JSON Parse Error
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const res = await response.json();

        if (res.success) {
            if (!silent) Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: 'success', title: 'Snapshot Saved!' });
            runFormulaEngine(); 
            
            if (statusEl) {
                statusEl.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i> <span class="text-success fw-bold">Saved</span>';
                setTimeout(() => { if(!isSaving) statusEl.classList.add('opacity-0'); }, 2000);
            }
        } else {
            Swal.fire('Error', res.message, 'error');
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-times-circle text-danger me-1"></i> Save Failed';
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Failed to connect to server', 'error');
        const statusEl = document.getElementById('saveStatus');
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-times-circle text-danger me-1"></i> Network Error';
    } finally {
        isSaving = false; 
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-save"></i> <span class="d-none d-md-inline ms-1">Save Day</span>';
        }
    }
}