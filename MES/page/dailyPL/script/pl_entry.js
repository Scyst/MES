"use strict";

let currentData = [];

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('targetDate');
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    loadEntryData();

    dateInput.addEventListener('change', loadEntryData);
    document.getElementById('sectionFilter')?.addEventListener('change', loadEntryData);
});

async function loadEntryData() {
    const date = document.getElementById('targetDate').value;
    const section = document.getElementById('sectionFilter')?.value || 'Team 1';
    const tbody = document.getElementById('entryTableBody');
    
    // Spinner สวยๆ ตรงกลางตาราง
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
            runFormulaEngine(); // 🔥 คำนวณสูตร
            calculateSummary(); 
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-5">${res.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-5">Connection Error</td></tr>';
    }
}

function renderEntryTable(data) {
    const tbody = document.getElementById('entryTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">No Data Found</td></tr>';
        return;
    }

    let html = '';
    data.forEach(item => {
        // --- 1. Identify Attributes ---
        const level = parseInt(item.item_level) || 0;
        const isSection = item.data_source === 'SECTION';
        const isAuto = item.data_source.includes('AUTO');
        
        // --- 2. Dynamic Style based on Level ---
        // Level 0 = ตัวหนา, Level 1,2,3... = ย่อหน้า
        let rowClass = '';
        let nameStyle = '';
        
        if (isSection) {
            rowClass = 'row-section bg-light text-secondary';
            nameStyle = 'fw-bold text-uppercase ls-1 ps-2';
        } else if (level === 0) {
            rowClass = 'fw-bold bg-body-tertiary'; // หัวข้อใหญ่ที่ไม่ใช่ Section
            nameStyle = 'text-dark ps-2';
        } else {
            // คำนวณ Indent: 1.5rem + (level * 1.5rem)
            // เช่น Level 1 = 3rem, Level 2 = 4.5rem
            const indent = 1.5 + (level * 1.5); 
            nameStyle = `position: relative; padding-left: ${indent}rem;`;
        }

        // --- 3. Connector Icon (สำหรับลูก) ---
        let iconHtml = '';
        if (level > 0 && !isSection) {
            // เส้น L-shape ด้วย CSS หรือ Icon
            // แบบใช้ Icon ง่ายๆ แต่ดูดี
            iconHtml = `<i class="fas fa-level-up-alt fa-rotate-90 text-muted me-2 opacity-50" style="transform: rotate(90deg) scaleY(-1);"></i>`;
        }

        // --- 4. Badges & Input (เหมือนเดิม) ---
        let typeBadge = '';
        if(!isSection){
            if (item.item_type === 'REVENUE') typeBadge = '<span class="badge badge-soft-success">REV</span>';
            else if (item.item_type === 'COGS') typeBadge = '<span class="badge badge-soft-warning">COGS</span>';
            else typeBadge = '<span class="badge badge-soft-danger">EXP</span>';
        }

        let sourceBadge = '';
        if (!isSection) {
            if (isAuto) sourceBadge = '<span class="badge badge-soft-info"><i class="fas fa-robot me-1"></i>AUTO</span>';
            else sourceBadge = '<span class="badge badge-soft-secondary">MANUAL</span>';
        }
        if (isSection) {
            sourceBadge = ''; 
        } else if (isAuto) {
            sourceBadge = '<span class="badge badge-soft-info"><i class="fas fa-robot me-1"></i>AUTO</span>';
        } else if (item.data_source === 'CALCULATED') {
            // 🔥 Badge สำหรับสูตร
            sourceBadge = '<span class="badge badge-soft-primary"><i class="fas fa-calculator me-1"></i>FORMULA</span>';
        } else {
            sourceBadge = '<span class="badge badge-soft-secondary">MANUAL</span>';
        }

        let inputHtml = '';
        if (!isSection) {
            const readonly = isAuto ? 'readonly' : '';
            const val = item.actual_amount !== null ? parseFloat(item.actual_amount) : 0;
            inputHtml = `
                <input type="text" 
                    class="input-seamless text-end" 
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

        // --- 5. Render Row ---
        html += `
            <tr class="${rowClass}">
                <td class="text-center"><span class="font-monospace text-muted small bg-light px-2 py-1 rounded">${item.account_code}</span></td>
                <td style="${!isSection ? nameStyle : ''}">
                    <div class="${isSection ? nameStyle : ''}">
                        ${iconHtml} ${item.item_name}
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

// Helper: ถอด Commas ตอน Focus
function removeCommas(input) {
    if (input.readOnly) return;
    input.value = input.value.replace(/,/g, '');
    input.select();
}

// Helper: ใส่ Commas และ Save ตอน Blur
async function formatAndSave(input, itemId) {
    if (input.readOnly) return;
    
    let rawValue = input.value.replace(/,/g, '');
    if(isNaN(rawValue) || rawValue === '') rawValue = 0;
    
    const floatVal = parseFloat(rawValue);
    
    // Format กลับเป็น 0,000.00
    input.value = floatVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // Update Data & Save
    handleAutoSave(itemId, floatVal, input);
}

// เรียกฟังก์ชันนี้ทุกครั้งที่โหลดข้อมูลเสร็จ หรือมีการแก้ไขค่า
function runFormulaEngine() {
    let hasChanged = false;
    let maxLoop = 5; // ป้องกัน Loop นรก (Circular Dependency)

    for (let i = 0; i < maxLoop; i++) {
        hasChanged = false;

        currentData.forEach(item => {
            // ทำเฉพาะรายการที่เป็น CALCULATED
            if (item.data_source === 'CALCULATED') {
                const oldVal = parseFloat(item.actual_amount) || 0;
                let newVal = 0;

                try {
                    // กรณี 1: SUM_CHILDREN (รวมลูก)
                    if (item.calculation_formula === 'SUM_CHILDREN') {
                        const children = currentData.filter(child => child.parent_id === item.item_id);
                        newVal = children.reduce((sum, child) => sum + (parseFloat(child.actual_amount) || 0), 0);
                    } 
                    // กรณี 2: สูตรคณิตศาสตร์ (เช่น [4001] + [4002])
                    else if (item.calculation_formula) {
                        let formula = item.calculation_formula;

                        // ขั้นที่ 1: แทนค่า [CODE] ด้วยตัวเลขจริง
                        // (ถ้า User พิมพ์มั่วเป็นรหัสที่ไม่มีจริง จะได้ค่า 0)
                        const matches = formula.match(/\[(.*?)\]/g);
                        if (matches) {
                            matches.forEach(token => {
                                const code = token.replace('[', '').replace(']', '');
                                const refItem = currentData.find(d => d.account_code === code);
                                const refVal = refItem ? (parseFloat(refItem.actual_amount) || 0) : 0;
                                
                                // แทนที่ [CODE] ด้วยตัวเลข
                                formula = formula.replace(token, refVal);
                            });
                        }

                        // 🔥 ขั้นที่ 2: SECURITY CHECK (สำคัญมาก!)
                        // ล้างบางทุกอย่างที่ไม่ใช่ ตัวเลข, จุดทศนิยม, วงเล็บ, และเครื่องหมาย + - * /
                        // ถ้าแฮกเกอร์พิมพ์ alert('hack') มา มันจะโดนลบเกลี้ยงเหลือแต่วงเล็บเปล่าๆ
                        const safeFormula = formula.replace(/[^0-9+\-*/(). ]/g, ''); 

                        // ขั้นที่ 3: ตรวจสอบความสมบูรณ์ก่อนคำนวณ
                        if (safeFormula.trim() === '') {
                            newVal = 0;
                        } else {
                            // ใช้ Function constructor เพื่อคำนวณ (ปลอดภัยแล้วเพราะผ่าน Regex ข้างบน)
                            newVal = new Function('return ' + safeFormula)();
                        }
                    }
                } catch (e) {
                    // 🔥 ERROR HANDLING: ถ้าสูตรผิด (เช่น หาร 0 หรือวงเล็บไม่ครบ)
                    // ให้เงียบไว้แล้วตั้งค่าเป็น 0 (หรือจะ console.warn ก็ได้ถ้าอยาก debug)
                    // console.warn(`Formula Error in ${item.account_code}:`, e);
                    newVal = 0;
                }

                // ป้องกันค่า Infinity หรือ NaN (เช่น กรณีหารด้วย 0)
                if (!isFinite(newVal) || isNaN(newVal)) {
                    newVal = 0;
                }

                // ถ้าค่าเปลี่ยน ให้อัปเดตและบอกว่ามีการเปลี่ยนแปลง
                if (Math.abs(newVal - oldVal) > 0.001) {
                    item.actual_amount = newVal;
                    hasChanged = true;
                    
                    // UI Feedback
                    const inputEl = document.querySelector(`input[data-id="${item.item_id}"]`);
                    if (inputEl) {
                        inputEl.value = newVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        inputEl.classList.add('text-primary', 'fw-bold'); // ทำให้เด่นหน่อยว่าเป็นค่าคำนวณ
                    }
                }
            }
        });

        if (!hasChanged) break;
    }
    
    calculateSummary();
}

async function handleAutoSave(itemId, value, inputElement) {
    const date = document.getElementById('targetDate').value;
    const section = document.getElementById('sectionFilter')?.value || 'Team 1';

    // Update Local Data
    const dataIndex = currentData.findIndex(i => i.item_id == itemId);
    if (dataIndex > -1) {
        currentData[dataIndex].actual_amount = value;
    }
    
    calculateSummary();
    runFormulaEngine();

    // Visual Feedback (สีเขียววูบที่ Input)
    inputElement.classList.add('is-valid');
    
    try {
        const payload = JSON.stringify([{ item_id: itemId, amount: value }]);
        const formData = new FormData();
        formData.append('action', 'save');
        formData.append('entry_date', date);
        formData.append('section', section);
        formData.append('items', payload);

        const res = await fetch('api/manage_pl_entry.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (!json.success) {
            inputElement.classList.remove('is-valid');
            inputElement.classList.add('is-invalid'); // แดงถ้า Error
        } else {
            setTimeout(() => inputElement.classList.remove('is-valid'), 1500);
        }
    } catch (err) {
        console.error(err);
        inputElement.classList.remove('is-valid');
        inputElement.classList.add('is-invalid');
    }
}

function calculateSummary() {
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalExpense = 0;

    currentData.forEach(item => {
        if (item.data_source === 'SECTION') return;
        const val = parseFloat(item.actual_amount) || 0;

        if (item.item_type === 'REVENUE') totalRevenue += val;
        else if (item.item_type === 'COGS') totalCogs += val;
        else if (item.item_type === 'EXPENSE') totalExpense += val;
    });

    const netProfit = totalRevenue - totalCogs - totalExpense;

    updateCard('estRevenue', totalRevenue);
    updateCard('estCost', totalCogs + totalExpense);
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
        else el.classList.add('text-primary'); // กรณีเป็น 0
    }
}