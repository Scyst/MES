"use strict";

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('targetDate');
    
    // โหลดข้อมูลครั้งแรก
    loadEntryData();

    // Event Listener เมื่อเปลี่ยนวันที่
    dateInput.addEventListener('change', loadEntryData);
});

async function loadEntryData() {
    const date = document.getElementById('targetDate').value;
    const tbody = document.getElementById('entryTableBody');
    
    // Show Loading
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const response = await fetch(`api/manage_pl_entry.php?action=read&entry_date=${date}`);
        const res = await response.json();

        if (res.success) {
            renderTable(res.data);
            updateTotalDisplay(res.data);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('entryTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">ไม่พบรายการที่ต้องคีย์มือ</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td><code class="fw-bold text-primary">${item.account_code}</code></td>
            <td>${item.item_name}</td>
            <td><small class="badge bg-light text-dark border">${item.item_type}</small></td>
            <td>
                <input type="number" 
                    class="form-control form-control-sm text-end ms-auto pl-input" 
                    style="width: 160px; border: 1px solid #dee2e6;"
                    value="${item.actual_amount || ''}" 
                    step="0.01"
                    data-id="${item.item_id}"
                    onchange="saveValue(${item.item_id}, this.value)">
            </td>
            <td class="text-center" id="status-${item.item_id}">
                <i class="fas fa-check-circle text-success d-none"></i>
            </td>
        </tr>
    `).join('');
}

async function saveValue(itemId, value) {
    const date = document.getElementById('targetDate').value;
    const statusIcon = document.querySelector(`#status-${itemId} i`);

    const formData = new URLSearchParams();
    formData.append('action', 'update_cell');
    formData.append('item_id', itemId);
    formData.append('amount', value);
    formData.append('entry_date', date);
    formData.append('section', 'Team 1');

    try {
        const response = await fetch('api/manage_pl_entry.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        const res = await response.json();

        if (res.success) {
            // แสดง icon สำเร็จแวบหนึ่ง
            statusIcon.classList.remove('d-none');
            setTimeout(() => statusIcon.classList.add('d-none'), 1500);
            
            // อัปเดตยอดรวม Real-time
            calculateSummary();
        }
    } catch (error) {
        console.error('Save error:', error);
    }
}

function calculateSummary() {
    const inputs = document.querySelectorAll('.pl-input');
    let total = 0;
    inputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('sumManualExpense').textContent = total.toLocaleString('en-US', {minimumFractionDigits: 2});
}

function updateTotalDisplay(data) {
    const total = data.reduce((sum, item) => sum + (parseFloat(item.actual_amount) || 0), 0);
    document.getElementById('sumManualExpense').textContent = total.toLocaleString('en-US', {minimumFractionDigits: 2});
}

// เพิ่มฟังก์ชันโหลดสรุปยอดอัตโนมัติ
async function loadAutoSummary() {
    const date = document.getElementById('targetDate').value;
    // ดึงค่า Section จากหน้าจอ หรือ Session
    const section = 'Team 1'; 

    try {
        const response = await fetch(`api/manage_pl_entry.php?action=get_summary&entry_date=${date}&section=${section}`);
        const res = await response.json();

        if (res.success && res.summary) {
            const s = res.summary;
            // อัปเดต UI (สมมติว่าคุณเพิ่ม Element เหล่านี้ใน HTML)
            if(document.getElementById('autoRevenue')) {
                document.getElementById('autoRevenue').textContent = parseFloat(s.Revenue_Actual).toLocaleString();
            }
            if(document.getElementById('autoLabor')) {
                document.getElementById('autoLabor').textContent = parseFloat(s.Labor_Actual).toLocaleString();
            }
            
            // คำนวณ Net Profit เบื้องต้น (Revenue - Labor - Manual Expense)
            updateNetProfit(s.Revenue_Actual, s.Labor_Actual);
        }
    } catch (error) {
        console.error('Summary load error:', error);
    }
}

// แก้ไขฟังก์ชัน saveCell เพื่อป้องกันการกดซ้ำ (กฎข้อ 3C)
async function saveCell(itemId, value) {
    const date = document.getElementById('targetDate').value;
    const inputField = document.querySelector(`input[data-id="${itemId}"]`);
    const statusIcon = document.querySelector(`.status-icon[data-id="${itemId}"]`);

    // 1. Validation เบื้องต้น
    if (isNaN(value) || value < 0) {
        inputField.classList.add('is-invalid');
        return;
    }
    inputField.classList.remove('is-invalid');

    // 2. Disable Input ระหว่างรอบันทึก (Operator Proofing)
    inputField.disabled = true;

    const formData = new URLSearchParams();
    formData.append('action', 'update_cell');
    formData.append('item_id', itemId);
    formData.append('amount', value);
    formData.append('entry_date', date);

    try {
        const response = await fetch('api/manage_pl_entry.php', {
            method: 'POST',
            body: formData
        });
        const res = await response.json();

        if (res.success) {
            // Visual Feedback
            inputField.style.backgroundColor = '#d4edda'; // สีเขียวจางๆ
            setTimeout(() => inputField.style.backgroundColor = '', 1000);
            
            // โหลดสรุปยอดใหม่หลังจาก Save สำเร็จ
            loadAutoSummary(); 
            calculateSummary();
        }
    } catch (error) {
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อ Server ได้', 'error');
    } finally {
        inputField.disabled = false;
    }
}

// ผูกฟังก์ชันเข้ากับ loadEntryData เดิม
const originalLoadEntryData = loadEntryData;
loadEntryData = async function() {
    await originalLoadEntryData();
    await loadAutoSummary();
};

// เพิ่มฟังก์ชันนี้ใน pl_entry.js
async function refreshSummary() {
    const date = document.getElementById('targetDate').value;
    const section = 'Team 1'; // ควรดึงจาก Session หรือ Dropdown

    try {
        const response = await fetch(`api/manage_pl_entry.php?action=get_summary&entry_date=${date}&section=${section}`);
        const res = await response.json();

        if (res.success && res.summary) {
            const s = res.summary;
            
            // อัปเดตตัวเลขบน Card
            document.getElementById('autoRevenue').textContent = formatNumber(s.Revenue_Actual);
            document.getElementById('autoLabor').textContent = formatNumber(s.Labor_Actual);
            
            // คำนวณ GP เบื้องต้น: Revenue - Labor - Other Expenses
            const manualExp = parseFloat(document.getElementById('sumManualExpense').textContent.replace(/,/g, '')) || 0;
            const gp = s.Revenue_Actual - s.Labor_Actual - manualExp;
            
            document.getElementById('estGP').textContent = formatNumber(gp);
        }
    } catch (error) {
        console.error('Refresh Summary Error:', error);
    }
}

function formatNumber(num) {
    return parseFloat(num).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
