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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">No Data Found. Please check settings.</td></tr>';
        return;
    }

    let html = '';
    data.forEach(item => {
        const isParent = !item.parent_id; 
        const isSection = item.data_source === 'SECTION';
        const isAuto = item.data_source.includes('AUTO');
        
        let rowClass = isSection ? 'row-section bg-light' : '';
        let nameStyle = isSection ? 'fw-bold text-uppercase text-secondary ls-1' : (isParent ? 'fw-bold text-dark' : 'child-item');
        let codeStyle = isSection ? '' : 'font-monospace text-muted small bg-light px-2 py-1 rounded';

        // --- Badges (Soft UI Style) ---
        let typeBadge = '';
        if(!isSection){
            if (item.item_type === 'REVENUE') typeBadge = '<span class="badge badge-soft-success">REV</span>';
            else if (item.item_type === 'COGS') typeBadge = '<span class="badge badge-soft-warning">COGS</span>';
            else typeBadge = '<span class="badge badge-soft-danger">EXP</span>';
        }

        let sourceBadge = '';
        if (isSection) {
            sourceBadge = ''; 
        } else if (isAuto) {
            sourceBadge = '<span class="badge badge-soft-info"><i class="fas fa-robot me-1"></i>AUTO</span>';
        } else {
            sourceBadge = '<span class="badge badge-soft-secondary">MANUAL</span>';
        }

        // --- Input Field (Seamless Style) ---
        let inputHtml = '';
        if (isSection) {
            inputHtml = '';
        } else {
            const readonly = isAuto ? 'readonly' : '';
            const val = item.actual_amount !== null ? parseFloat(item.actual_amount) : 0;
            
            // ใช้ input-seamless แทน input-group แบบเก่า
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

        html += `
            <tr class="${rowClass}">
                <td class="text-center"><span class="${codeStyle}">${item.account_code}</span></td>
                <td class="${nameStyle}">${item.item_name}</td>
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

async function handleAutoSave(itemId, value, inputElement) {
    const date = document.getElementById('targetDate').value;
    const section = document.getElementById('sectionFilter')?.value || 'Team 1';

    // Update Local Data
    const dataIndex = currentData.findIndex(i => i.item_id == itemId);
    if (dataIndex > -1) {
        currentData[dataIndex].actual_amount = value;
    }
    
    calculateSummary();

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