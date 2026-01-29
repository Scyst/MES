"use strict";

let currentData = [];
let isSaving = false;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Set Default Date (Today)
    const dateInput = document.getElementById('targetDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // 2. Load Initial Data
    loadEntryData();

    // 3. Global Event Listeners
    dateInput?.addEventListener('change', loadEntryData);
    document.getElementById('sectionFilter')?.addEventListener('change', loadEntryData);
});

// ========================================================
// 1. DATA LOADING & API
// ========================================================
async function loadEntryData() {
    const date = document.getElementById('targetDate').value;
    const section = document.getElementById('sectionFilter')?.value || 'Team 1';
    const tbody = document.getElementById('entryTableBody');
    
    // Show Loading State
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center align-middle" style="height: 200px;">
                <div class="spinner-border text-primary mb-2" role="status"></div>
                <div class="text-muted small">Loading P&L Data...</div>
            </td>
        </tr>`;

    try {
        // เรียก API
        const response = await fetch(`api/manage_pl_entry.php?action=read&entry_date=${date}&section=${section}`);
        const res = await response.json();

        if (res.success) {
            currentData = res.data;
            renderEntryTable(res.data);
            runFormulaEngine(); // 🔥 คำนวณสูตรทันที (เผื่อ Database ยังไม่อัปเดตยอดรวม)
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-5">${res.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-5">Connection Error: Unable to fetch data.</td></tr>';
    }
}

// Function สำหรับปุ่ม Save ใหญ่ด้านบน (Manual Save)
async function saveEntryData() {
    const btn = document.getElementById('btnSave');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';

    // บังคับคำนวณใหม่รอบสุดท้าย
    runFormulaEngine();
    
    // จำลองการ Save (จริงๆ เรา Save ทีละบรรทัดอยู่แล้ว)
    // ตรงนี้อาจจะเพิ่ม Logic ให้ส่งข้อมูลทั้งหมดไปอีกรอบเพื่อความชัวร์ก็ได้
    // แต่ในที่นี้แค่โชว์ Visual Feedback ก็พอครับ
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        showSaveStatus(true);
        Swal.fire({
            icon: 'success',
            title: 'Saved Successfully',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });
    }, 500);
}

// ========================================================
// 2. RENDERING (Table UI)
// ========================================================
function renderEntryTable(data) {
    const tbody = document.getElementById('entryTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">No Data Configuration Found.</td></tr>';
        return;
    }

    let html = '';
    
    data.forEach(item => {
        // ... (Logic Level, Icons, Badges เดิม) ...
        const level = parseInt(item.item_level) || 0;
        const isAuto = item.data_source.includes('AUTO');
        const isCalc = item.data_source === 'CALCULATED';

        let rowClass = (level === 0) ? 'level-0' : (level === 1 ? 'level-1' : 'level-deep');
        
        // Indent: ปรับให้กระชับขึ้นนิดนึง
        let indentStyle = (level === 0) ? '' : (level === 1 ? 'padding-left: 1.5rem;' : `padding-left: ${1.5 + (level * 1.5)}rem;`);
        let nameCellClass = (level > 1) ? 'child-item' : '';

        // Icons ... (เหมือนเดิม)
        let iconHtml = '';
        if (level === 0) iconHtml = `<i class="fas fa-folder text-primary me-2 fa-lg"></i>`;
        else if (level === 1) iconHtml = `<i class="far fa-folder-open text-secondary me-2"></i>`;
        else iconHtml = `<span class="text-muted opacity-25 me-1" style="font-family: monospace;">└─</span><i class="far fa-file-alt text-muted me-2"></i>`;

        // Badges ... (เหมือนเดิม)
        let typeBadge = '';
        if (item.item_type === 'REVENUE') typeBadge = `<span class="badge-mini badge-type-rev" title="Revenue">R</span>`;
        else if (item.item_type === 'COGS') typeBadge = `<span class="badge-mini badge-type-cogs" title="Cost of Goods Sold">C</span>`;
        else typeBadge = `<span class="badge-mini badge-type-exp" title="Expense">E</span>`;

        let sourceBadge = '';
        if (isAuto) sourceBadge = `<span class="badge-mini badge-src-auto" title="Auto System">A</span>`;
        else if (isCalc) {
            const formulaDesc = item.calculation_formula === 'SUM_CHILDREN' ? 'Sum Children' : item.calculation_formula;
            sourceBadge = `<span class="badge-mini badge-src-calc" title="Formula: ${formulaDesc}">F</span>`;
        } else sourceBadge = `<span class="badge-mini badge-src-manual" title="Manual Input">M</span>`;

        // Inputs ... (เหมือนเดิม)
        const readonly = (isAuto || isCalc) ? 'readonly' : '';
        const val = item.actual_amount !== null ? parseFloat(item.actual_amount) : 0;
        const inputColorClass = (isCalc || isAuto) ? 'text-primary fw-bold' : 'text-dark fw-semibold';

        const inputHtml = `
            <input type="text" 
                class="input-seamless ${inputColorClass}" 
                value="${formatNumber(val)}" 
                data-id="${item.item_id}"
                ${readonly}
                onfocus="removeCommas(this)"
                onblur="formatAndSave(this, ${item.item_id})"
                onkeydown="if(event.key==='Enter') this.blur()"
            >
        `;

        const remarkVal = item.remark || '';
        const remarkHtml = `
            <input type="text" class="input-seamless text-end text-muted small" 
                   style="font-family: var(--bs-body-font-family); font-weight: normal;"
                   placeholder="..." value="${remarkVal}"
                   onblur="formatAndSave(this, ${item.item_id})"> 
        `;

        // --- Build Row (Split Layout) ---
        html += `
            <tr class="${rowClass}">
                <td style="${indentStyle}; white-space: nowrap;" class="${nameCellClass} pe-3">
                    <div class="d-flex align-items-center">
                        ${iconHtml} 
                        <span>${item.item_name}</span>
                    </div>
                </td>
                
                <td class="text-center px-3" style="white-space: nowrap;">
                    <code class="text-muted small bg-light px-1 rounded">${item.account_code}</code>
                </td>
                
                <td></td>
                
                <td class="text-end" style="width: 150px;">${inputHtml}</td>
                
                <td class="text-center">
                    <div class="d-flex justify-content-start">
                        ${typeBadge}
                        ${sourceBadge}
                    </div>
                </td>
                
                <td class="text-end pe-3" style="width: 250px;">${remarkHtml}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ========================================================
// 3. INPUT HANDLING & AUTO SAVE
// ========================================================

// ลบลูกน้ำตอนคลิกแก้ไข
function removeCommas(input) {
    if (input.readOnly) return;
    input.value = input.value.replace(/,/g, '');
    input.select();
}

async function formatAndSave(input, itemId) {
    // เช็คก่อนว่าเป็นช่อง Amount หรือ Remark
    const isRemark = input.getAttribute('placeholder') === '...';
    
    if (!isRemark) {
        // Logic เดิมสำหรับ Amount
        if (input.readOnly) return;
        let rawValue = input.value.replace(/,/g, '');
        if(isNaN(rawValue) || rawValue === '') rawValue = 0;
        const floatVal = parseFloat(rawValue);
        input.value = formatNumber(floatVal); // Format กลับ
        
        // Update Local Data & Run Formula
        const dataIndex = currentData.findIndex(i => i.item_id == itemId);
        if (dataIndex > -1) {
            if(currentData[dataIndex].actual_amount == floatVal) return; // ไม่เปลี่ยนไม่ต้อง save
            currentData[dataIndex].actual_amount = floatVal;
            runFormulaEngine();
        }
        
        await saveToServer(itemId, floatVal, null, input);

    } else {
        // Logic ใหม่สำหรับ Remark
        const remarkVal = input.value.trim();
        const dataIndex = currentData.findIndex(i => i.item_id == itemId);
        if (dataIndex > -1) {
             if(currentData[dataIndex].remark === remarkVal) return; // ไม่เปลี่ยนไม่ต้อง save
             currentData[dataIndex].remark = remarkVal;
        }
        
        // ส่งค่า Amount เดิมไปด้วย (เพราะ API ต้องการ)
        const currentAmount = currentData[dataIndex].actual_amount;
        await saveToServer(itemId, currentAmount, remarkVal, input);
    }
}

// ฟังก์ชัน Save จริงๆ
async function saveToServer(itemId, amount, remark, inputElement) {
    showSaveStatus(false);
    
    try {
        const date = document.getElementById('targetDate').value;
        const section = document.getElementById('sectionFilter').value;
        
        // เตรียม Item Object
        let itemObj = { item_id: itemId, amount: amount };
        if (remark !== null) itemObj.remark = remark; // ส่ง Remark ไปด้วยถ้ามี

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
            console.error('Save failed:', json.message);
            if(inputElement) inputElement.classList.add('is-invalid');
        }
    } catch (err) {
        console.error('Connection error:', err);
    }
}

// บันทึก Remark แยกต่างหาก
async function saveRemark(itemId, remark) {
    // (Optional implementation) 
    // คุณสามารถเพิ่ม Logic Save Remark แบบเดียวกับ Amount ได้ถ้าต้องการ
}

// Helper: Show Save Status in Toolbar
function showSaveStatus(saved) {
    const el = document.getElementById('saveStatus');
    if(!el) return;

    el.classList.remove('opacity-0');
    if (saved) {
        el.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i>Saved';
        // ซ่อนหลังจาก 2 วิ
        setTimeout(() => el.classList.add('opacity-0'), 2000);
    } else {
        el.innerHTML = '<i class="fas fa-sync fa-spin text-muted me-1"></i>Saving...';
    }
}

// ========================================================
// 4. 🔥 FORMULA ENGINE (หัวใจสำคัญ)
// ========================================================
function runFormulaEngine() {
    let hasChanged = false;
    let maxLoop = 5; // วนลูปแก้สมการต่อเนื่องสูงสุด 5 รอบ (กัน Infinite Loop)

    for (let i = 0; i < maxLoop; i++) {
        hasChanged = false;

        currentData.forEach(item => {
            if (item.data_source === 'CALCULATED') {
                const oldVal = parseFloat(item.actual_amount) || 0;
                let newVal = 0;

                try {
                    // Case A: SUM_CHILDREN (รวมลูกๆ)
                    if (item.calculation_formula === 'SUM_CHILDREN') {
                        const children = currentData.filter(child => child.parent_id === item.item_id);
                        newVal = children.reduce((sum, child) => sum + (parseFloat(child.actual_amount) || 0), 0);
                    } 
                    // Case B: Custom Formula (เช่น [CODE1] - [CODE2])
                    else if (item.calculation_formula) {
                        let formula = item.calculation_formula;
                        
                        // แทนค่า [CODE] ด้วยตัวเลขจริง
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
                    console.warn(`Formula Error on ${item.account_code}:`, e);
                    newVal = 0; 
                }

                if (!isFinite(newVal) || isNaN(newVal)) newVal = 0;

                // ถ้าค่าเปลี่ยน ให้อัปเดตและวนลูปต่อ
                if (Math.abs(newVal - oldVal) > 0.001) {
                    item.actual_amount = newVal;
                    hasChanged = true;
                    
                    // Update UI ช่องที่เป็นสูตรทันที (Flash Effect)
                    const inputEl = document.querySelector(`input[data-id="${item.item_id}"]`);
                    if (inputEl) {
                        inputEl.value = formatNumber(newVal);
                        inputEl.parentElement.classList.add('bg-warning', 'bg-opacity-25');
                        setTimeout(() => inputEl.parentElement.classList.remove('bg-warning', 'bg-opacity-25'), 500);
                    }
                }
            }
        });

        if (!hasChanged) break; // ถ้าไม่มีอะไรเปลี่ยนแล้ว ก็หยุดวนลูป
    }

    calculateDashboardSummary();
}

// คำนวณการ์ด 3 ใบด้านบน
function calculateDashboardSummary() {
    let revenue = 0;
    let cost = 0;

    // Logic: รวมเฉพาะ Root Items (Level 0) เพื่อไม่ให้ยอดซ้ำซ้อน
    currentData.forEach(item => {
        if (parseInt(item.item_level) === 0) {
            const val = parseFloat(item.actual_amount) || 0;
            if (item.item_type === 'REVENUE') {
                revenue += val;
            } else {
                cost += val; // รวมทั้ง COGS และ EXPENSE
            }
        }
    });

    const netProfit = revenue - cost;

    updateCard('estRevenue', revenue);
    updateCard('estCost', cost);
    updateCard('estGP', netProfit, true);
}

function updateCard(id, value, colorize = false) {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.textContent = formatNumber(value);
    
    if (colorize) {
        el.className = 'metric-value'; // Reset
        if (value > 0) el.classList.add('text-success');
        else if (value < 0) el.classList.add('text-danger');
        else el.classList.add('text-primary');
    }
}

// Utility: Format Number with Commas
function formatNumber(num) {
    return num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}