"use strict";

let currentData = [];

document.addEventListener('DOMContentLoaded', () => {
    // ตั้งค่า Default Date เป็นวันนี้
    const dateInput = document.getElementById('targetDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    loadEntryData();

    // Event Listeners
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
    
    // Loading State
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center align-middle" style="height: 200px;">
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
            runFormulaEngine(); // 🔥 คำนวณสูตรทันทีที่โหลดเสร็จ
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-5">${res.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

// ========================================================
// 2. RENDERING (Table UI)
// ========================================================
function renderEntryTable(data) {
    const tbody = document.getElementById('entryTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">No Data Configuration Found</td></tr>';
        return;
    }

    let html = '';
    data.forEach(item => {
        const level = parseInt(item.item_level) || 0;
        const isSection = item.data_source === 'SECTION';
        const isAuto = item.data_source.includes('AUTO');
        const isCalc = item.data_source === 'CALCULATED';

        // --- 2.1 Color & Style Logic (ให้เหมือนหน้า Setting) ---
        let rowClass = '';
        let nameStyle = ''; 

        if (level === 0) {
            // Level 0: Root Header (ใหญ่สุด)
            rowClass = 'level-0'; 
            nameStyle = 'ps-2';
        } else if (level === 1) {
            // Level 1: Sub-Group
            rowClass = 'level-1';
            nameStyle = `padding-left: 1.5rem;`;
        } else {
            // Level 2+: Items
            rowClass = 'level-deep';
            const indent = level * 1.5;
            nameStyle = `padding-left: ${indent}rem;`;
        }

        // --- 2.2 Icons ---
        let iconHtml = '';
        if (level === 0) {
            iconHtml = `<i class="fas fa-folder text-primary me-2"></i>`;
        } else if (isSection) {
            iconHtml = `<i class="fas fa-folder-open text-secondary me-2"></i>`;
        } else if (isCalc) {
            iconHtml = `<i class="fas fa-calculator text-primary me-2 opacity-75"></i>`;
        } else {
            // Connector line logic
            iconHtml = `<span class="text-muted opacity-25 me-2" style="font-family: monospace;">└─</span>`;
        }

        // --- 2.3 Badges ---
        let typeBadge = '';
        if (!isSection) {
            if(item.item_type === 'REVENUE') typeBadge = '<span class="text-success fw-bold small">REV</span>';
            else if(item.item_type === 'COGS') typeBadge = '<span class="text-warning fw-bold small">COGS</span>';
            else typeBadge = '<span class="text-danger fw-bold small">EXP</span>';
        }

        let sourceBadge = '';
        if (!isSection) {
            if (isAuto) sourceBadge = '<span class="badge badge-soft-info"><i class="fas fa-robot me-1"></i> AUTO</span>';
            else if (isCalc) sourceBadge = '<span class="badge badge-soft-primary"><i class="fas fa-calculator me-1"></i> TOTAL</span>';
            else sourceBadge = '<span class="badge badge-soft-secondary">MANUAL</span>';
        }

        // --- 2.4 Input Field ---
        let inputHtml = '';
        if (!isSection) {
            const readonly = (isAuto || isCalc) ? 'readonly' : '';
            const val = item.actual_amount !== null ? parseFloat(item.actual_amount) : 0;
            
            // ถ้าเป็น Formula/Auto ให้ตัวเลขเป็นสีน้ำเงิน/เข้ม
            const textClass = (isCalc || isAuto) ? 'fw-bold text-primary' : 'text-dark';

            inputHtml = `
                <input type="text" 
                    class="input-seamless text-end ${textClass}" 
                    value="${val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}" 
                    data-id="${item.item_id}"
                    data-type="${item.item_type}" 
                    data-source="${item.data_source}"
                    ${readonly}
                    onfocus="removeCommas(this)"
                    onblur="formatAndSave(this, ${item.item_id})"
                    onkeydown="if(event.key==='Enter') this.blur()"
                >
            `;
        }

        // --- 2.5 Build Row ---
        html += `
            <tr class="${rowClass}">
                <td class="text-center"><span class="font-monospace text-muted small bg-white bg-opacity-50 px-2 py-1 rounded border">${item.account_code}</span></td>
                <td style="${nameStyle}">
                    <div class="d-flex align-items-center">
                        ${iconHtml} <span class="${isSection ? 'fw-bold' : ''}">${item.item_name}</span>
                    </div>
                </td>
                <td class="text-center">${typeBadge}</td>
                <td class="text-center">${sourceBadge}</td>
                <td style="width: 180px;">${inputHtml}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ========================================================
// 3. INPUT HANDLING
// ========================================================
function removeCommas(input) {
    if (input.readOnly) return;
    input.value = input.value.replace(/,/g, '');
    input.select();
}

async function formatAndSave(input, itemId) {
    if (input.readOnly) return;
    
    let rawValue = input.value.replace(/,/g, '');
    if(isNaN(rawValue) || rawValue === '') rawValue = 0;
    
    const floatVal = parseFloat(rawValue);
    
    // Update UI กลับเป็น Format
    input.value = floatVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // Save
    await handleAutoSave(itemId, floatVal, input);
}

async function handleAutoSave(itemId, value, inputElement) {
    // 1. Update Local Data
    const dataIndex = currentData.findIndex(i => i.item_id == itemId);
    if (dataIndex > -1) {
        currentData[dataIndex].actual_amount = value;
    }
    
    // 2. 🔥 Run Formula Engine (คำนวณลูกระนาด)
    runFormulaEngine();

    // 3. Save to Server
    inputElement.classList.add('is-valid'); // Visual feedback
    
    try {
        const date = document.getElementById('targetDate').value;
        const section = document.getElementById('sectionFilter').value;
        
        const payload = JSON.stringify([{ item_id: itemId, amount: value }]);
        const formData = new FormData();
        formData.append('action', 'save');
        formData.append('entry_date', date);
        formData.append('section', section);
        formData.append('items', payload);

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (!json.success) {
            inputElement.classList.add('is-invalid');
        } else {
            setTimeout(() => inputElement.classList.remove('is-valid'), 1000);
        }
    } catch (err) {
        console.error(err);
        inputElement.classList.add('is-invalid');
    }
}

// ========================================================
// 4. 🔥 FORMULA ENGINE (Safe & Robust)
// ========================================================
function runFormulaEngine() {
    let hasChanged = false;
    let maxLoop = 5; // กัน Infinite Loop

    for (let i = 0; i < maxLoop; i++) {
        hasChanged = false;

        currentData.forEach(item => {
            if (item.data_source === 'CALCULATED') {
                const oldVal = parseFloat(item.actual_amount) || 0;
                let newVal = 0;

                try {
                    // Case 1: Sum Children
                    if (item.calculation_formula === 'SUM_CHILDREN') {
                        const children = currentData.filter(child => child.parent_id === item.item_id);
                        newVal = children.reduce((sum, child) => sum + (parseFloat(child.actual_amount) || 0), 0);
                    } 
                    // Case 2: Custom Formula
                    else if (item.calculation_formula) {
                        let formula = item.calculation_formula;
                        
                        // Replace [CODE] with values
                        const matches = formula.match(/\[(.*?)\]/g);
                        if (matches) {
                            matches.forEach(token => {
                                const code = token.replace('[', '').replace(']', '');
                                const refItem = currentData.find(d => d.account_code === code);
                                const refVal = refItem ? (parseFloat(refItem.actual_amount) || 0) : 0;
                                formula = formula.replace(token, refVal);
                            });
                        }

                        // Sanitize & Execute
                        const safeFormula = formula.replace(/[^0-9+\-*/(). ]/g, ''); 
                        if (safeFormula.trim() !== '') {
                            newVal = new Function('return ' + safeFormula)();
                        }
                    }
                } catch (e) {
                    newVal = 0; // Error fallback
                }

                if (!isFinite(newVal) || isNaN(newVal)) newVal = 0;

                // Update if Changed
                if (Math.abs(newVal - oldVal) > 0.001) {
                    item.actual_amount = newVal;
                    hasChanged = true;
                    
                    // Update UI Input directly
                    const inputEl = document.querySelector(`input[data-id="${item.item_id}"]`);
                    if (inputEl) {
                        inputEl.value = newVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        // Highlight change
                        inputEl.classList.add('bg-warning', 'bg-opacity-10');
                        setTimeout(() => inputEl.classList.remove('bg-warning', 'bg-opacity-10'), 600);
                    }
                }
            }
        });

        if (!hasChanged) break;
    }

    calculateDashboardSummary();
}

function calculateDashboardSummary() {
    // หาค่าจาก Account Code มาตรฐาน (ถ้ามี) หรือคำนวณรวม
    // ปรับ Logic นี้ตาม Account Code จริงของคุณ
    
    // ตัวอย่าง: ดึงค่าจากบรรทัดที่เป็นยอดรวมใหญ่ (Level 0)
    let revenue = 0, costs = 0;

    currentData.forEach(item => {
        // เฉพาะ Level 0 (Root)
        if (parseInt(item.item_level) === 0) {
            const val = parseFloat(item.actual_amount) || 0;
            if (item.item_type === 'REVENUE') revenue += val;
            else costs += val; // COGS + EXPENSE
        }
    });

    const netProfit = revenue - costs;

    updateCard('estRevenue', revenue);
    updateCard('estCost', costs);
    updateCard('estGP', netProfit, true);
}

function updateCard(id, value, isColored = false) {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.textContent = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    if (isColored) {
        el.classList.remove('text-success', 'text-danger', 'text-primary');
        if (value > 0) el.classList.add('text-success');
        else if (value < 0) el.classList.add('text-danger');
        else el.classList.add('text-primary');
    }
}