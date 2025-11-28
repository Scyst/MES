// MES/page/dailyLog/script/dailyLog.js
"use strict";

const API_URL = 'api/dailyLogManage.php';
let globalMonthlyData = {};
let globalTodayDate = new Date().toISOString().split('T')[0];

const periodInfo = {
    1: { label: 'เช้า (Start)', icon: 'fa-sun', color: '#ffc107' },
    2: { label: 'บ่าย (Mid)', icon: 'fa-utensils', color: '#fd7e14' },
    3: { label: 'เย็น (End)', icon: 'fa-moon', color: '#6f42c1' }
};

const dayManagerModal = new bootstrap.Modal(document.getElementById('dayManagerModal'));
const logModal = new bootstrap.Modal(document.getElementById('logModal'));

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    fetchData();
}

async function fetchData() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_initial_data');
        
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const res = await response.json();

        if (res.success) {
            globalMonthlyData = res.data.monthlyData;
            renderTodayCards(res.data.todayLogs);
            renderCalendar(globalMonthlyData);
            
            // ถ้ามี Dashboard Data (สำหรับ Admin)
            if (res.data.dashboardData && Object.keys(res.data.dashboardData).length > 0) {
                // คุณอาจต้องสร้างฟังก์ชัน renderDashboardGrid() เพิ่มถ้าต้องการให้มัน Dynamic
                // แต่ในเวอร์ชันนี้เรา Render HTML จาก PHP ไปก่อนก็ได้ หรือจะย้ายมา JS ก็ได้
                // *เพื่อความง่าย: ส่วน Grid ของ Admin ยังคงใช้ PHP Render ใน UI ได้ 
                // หรือจะให้ผมเขียน JS Render Grid ให้ด้วยบอกได้เลยครับ
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function renderTodayCards(todayLogs) {
    const container = document.getElementById('todayCardsContainer');
    container.innerHTML = '';
    const emojis = {1:'😤', 2:'😓', 3:'😐', 4:'🙂', 5:'🤩'};

    [1, 2, 3].forEach(pid => {
        const pinfo = periodInfo[pid];
        const isDone = todayLogs[pid] ? true : false;
        const moodScore = isDone ? todayLogs[pid].mood : 0;
        const cardClass = isDone ? 'done' : 'pending';

        let contentHtml = '';
        if (isDone) {
            contentHtml = `
                <div class="mt-2">
                    <span style="font-size: 1.8rem; line-height: 1;">${emojis[moodScore]}</span>
                    <div class="text-success" style="font-size: 0.6rem; margin-top: 4px;">บันทึกแล้ว</div>
                </div>`;
        } else {
            contentHtml = `
                <i class="fas fa-plus-circle text-muted opacity-25" style="font-size: 1.5rem; margin: 5px 0;"></i>
                <div class="text-muted" style="font-size: 0.6rem;">กดบันทึก</div>`;
        }

        const html = `
            <div>
                <div class="pulse-card ${cardClass}" onclick="openLogModal('${globalTodayDate}', ${pid})">
                    <div class="text-muted small fw-bold mb-1">${pinfo.label}</div>
                    ${contentHtml}
                </div>
            </div>`;
        container.innerHTML += html;
    });
}

function renderCalendar(data) {
    const container = document.getElementById('calendarGrid');
    container.innerHTML = '';
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    
    // Logic หาจำนวนวันและวันเริ่มต้นเหมือน PHP
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    // Blank days
    for (let i = 0; i < firstDayOfWeek; i++) {
        container.innerHTML += '<div class="snc-cal-day empty"></div>';
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = (dateStr === globalTodayDate) ? 'today' : '';
        
        let dotsHtml = '';
        for (let p = 1; p <= 3; p++) {
            const isDone = (data[dateStr] && data[dateStr][p]) ? 'done' : '';
            dotsHtml += `<div class='c-dot ${isDone}'></div>`;
        }

        const html = `
            <div class='snc-cal-day ${isToday}' onclick="openDayManager('${dateStr}')">
                <span>${day}</span>
                <div class='cal-dots'>${dotsHtml}</div>
            </div>`;
        container.innerHTML += html;
    }
}

// --- Interaction Functions ---

window.openDayManager = function(dateStr) {
    document.getElementById('dayManagerDateTitle').innerText = formatDateTH(dateStr);
    const list = document.getElementById('dayManagerList');
    list.innerHTML = '';
    
    const logs = globalMonthlyData[dateStr] || {};
    [1, 2, 3].forEach(pid => {
        const isDone = logs[pid] ? true : false;
        const color = isDone ? 'text-success' : 'text-muted opacity-25';
        list.innerHTML += `
            <div class="d-flex align-items-center justify-content-between p-2 border rounded mb-2 cursor-pointer hover-bg-light" onclick="openLogModal('${dateStr}', ${pid})">
                <div class="d-flex align-items-center gap-2">
                    <i class="fas fa-circle ${color}"></i> <span>${periodInfo[pid].label}</span>
                </div>
                <i class="fas fa-chevron-right text-muted small"></i>
            </div>`;
    });
    dayManagerModal.show();
}

window.openLogModal = function(dateStr, periodId) {
    dayManagerModal.hide();
    document.getElementById('inputTargetDate').value = dateStr;
    document.getElementById('inputPeriodId').value = periodId;
    document.getElementById('formPeriodLabel').innerText = dateStr + " : " + periodInfo[periodId].label;
    
    // Reset Form
    document.getElementById('inputMood').value = '';
    document.getElementById('inputQty').value = '';
    document.getElementById('inputNote').value = '';
    document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('active'));
    document.getElementById('moodError').classList.add('d-none');

    // Pre-fill
    if (globalMonthlyData[dateStr] && globalMonthlyData[dateStr][periodId]) {
        const l = globalMonthlyData[dateStr][periodId];
        selectEmoji(l.mood);
        document.getElementById('inputQty').value = l.qty ? parseInt(l.qty) : '';
        document.getElementById('inputNote').value = l.note || '';
    }
    logModal.show();
}

function selectEmoji(val) {
    document.getElementById('inputMood').value = val;
    document.querySelectorAll('.emoji-option').forEach(el => {
        if (el.dataset.val == val) el.classList.add('active');
        else el.classList.remove('active');
    });
    document.getElementById('moodError').classList.add('d-none');
}

function setupEventListeners() {
    document.querySelectorAll('.emoji-option').forEach(el => {
        el.addEventListener('click', function() { selectEmoji(this.dataset.val); });
    });

    document.getElementById('logForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        if(!document.getElementById('inputMood').value) {
            document.getElementById('moodError').classList.remove('d-none');
            return;
        }

        const formData = new FormData(this);
        try {
            const response = await fetch(API_URL, { method: 'POST', body: formData });
            const res = await response.json();
            
            if (res.success) {
                // alert(res.message); // หรือใช้ Toast
                logModal.hide();
                fetchData(); // Reload data to update UI
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error(error);
            alert("Error saving data");
        }
    });
}

function formatDateTH(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}