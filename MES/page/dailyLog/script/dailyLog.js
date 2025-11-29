// MES/page/dailyLog/script/dailyLog.js
"use strict";

const API_URL = 'api/dailyLogManage.php';
let globalMonthlyData = {};
let globalTodayDate = getProductionDate();

function getProductionDate() {
    const now = new Date();
    const hour = now.getHours();

    // ถ้าเวลาน้อยกว่า 08:00 น. (เช่น 01:00, 07:59) ให้ถือว่าเป็น "เมื่อวาน"
    if (hour < 8) {
        now.setDate(now.getDate() - 1);
    }
    
    // แปลงเป็น String YYYY-MM-DD
    return now.toISOString().split('T')[0];
}

const periodInfo = {
    1: { 
        label: 'เริ่มงาน (Start)', 
        icon: 'fa-sign-in-alt',
        color: '#0d6efd'
    },
    2: { 
        label: 'พักเบรก (Break)', 
        icon: 'fa-mug-hot',
        color: '#fd7e14'
    },
    3: { 
        label: 'เลิกงาน (End)', 
        icon: 'fa-flag-checkered',
        color: '#198754'
    }
};

// Initialize Modals
const dayManagerModal = new bootstrap.Modal(document.getElementById('dayManagerModal'));
const logModal = new bootstrap.Modal(document.getElementById('logModal'));
window.adminDashboardModal = new bootstrap.Modal(document.getElementById('adminDashboardModal'));

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
            
            const userRole = res.data.userRole;
            // เช็คว่าเป็นบทบาทที่ดูได้หรือไม่
            if (['admin', 'creator'].includes(userRole)) {
                renderAdminDashboard(res.data.dashboardData, res.data.factoryMood);
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function showLockedAlert(menuName) {
    Swal.fire({
        icon: 'warning',
        title: 'ไม่มีสิทธิ์เข้าถึง',
        text: `คุณไม่มีสิทธิ์ใช้งานเมนู "${menuName}" \nกรุณาติดต่อผู้ดูแลระบบ หรือเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์`,
        confirmButtonText: 'เข้าใจแล้ว',
        confirmButtonColor: '#6c757d'
    });
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

        // เช็ค Login จากตัวแปร global ที่ประกาศใน PHP
        const clickAction = IS_LOGGED_IN 
            ? `openLogModal('${globalTodayDate}', ${pid})` 
            : `showLoginPrompt()`;

        const html = `
            <div>
                <div class="pulse-card ${cardClass}" onclick="${clickAction}">
                    <div class="text-muted small fw-bold mb-1">${pinfo.label}</div>
                    ${contentHtml}
                </div>
            </div>`;
        container.innerHTML += html;
    });
}

function showLoginPrompt() {
    Swal.fire({
        icon: 'info',
        title: 'กรุณาเข้าสู่ระบบ',
        text: 'คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถบันทึกข้อมูลประจำวันได้',
        showCancelButton: true,
        confirmButtonText: 'ไปหน้า Login',
        cancelButtonText: 'ปิด',
        confirmButtonColor: '#0d6efd'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '../../auth/login_form.php?redirect=' + encodeURIComponent(window.location.pathname);
        }
    });
}

function renderCalendar(data) {
    const container = document.getElementById('calendarGrid');
    container.innerHTML = '';
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    
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

    // === [ADDED] Logic ปรับ Row Grid ให้ยืดเต็มจอ ===
    const totalSlots = firstDayOfWeek + daysInMonth;
    const rowCount = Math.ceil(totalSlots / 7);
    const calendarParent = container.parentElement; 
    if(calendarParent && calendarParent.classList.contains('snc-calendar')) {
        calendarParent.style.gridTemplateRows = `35px repeat(${rowCount}, 1fr)`;
    }
}

function renderAdminDashboard(dashboardData, factoryMood) {
    const btnOpen = document.getElementById('btnOpenAdminDash'); 
    const moodScoreEl = document.getElementById('factoryMoodScore');
    const moodEmojiEl = document.getElementById('factoryMoodEmoji');
    const listContainer = document.getElementById('teamLogList');
    const emojis = {1:'😤', 2:'😓', 3:'😐', 4:'🙂', 5:'🤩'};

    btnOpen.classList.remove('d-none');

    const avg = factoryMood.avg ? parseFloat(factoryMood.avg).toFixed(1) : 0;
    moodScoreEl.innerText = avg > 0 ? avg : "-";
    
    let moodInt = Math.round(avg);
    if(moodInt < 1) moodInt = 3; 
    moodEmojiEl.innerText = emojis[moodInt];

    listContainer.innerHTML = '';
    
    if (Object.keys(dashboardData).length === 0) {
        listContainer.innerHTML = '<div class="text-center text-muted py-4">วันนี้ยังไม่มีข้อมูล</div>';
        return;
    }
    
    Object.entries(dashboardData).forEach(([username, data]) => {
        const empId = data.info.emp_id || '-';
        const line = data.info.line || 'N/A';
        const logs = data.logs || {};

        let statusDots = '';
        [1, 2, 3].forEach(pid => {
            const hasLog = logs[pid];
            if(hasLog) {
                const rawNote = hasLog.note || '';
                const safeNote = rawNote.replace(/"/g, '&quot;'); 
                const tooltipText = `${periodInfo[pid].label}${safeNote ? ': ' + safeNote : ''}`;

                statusDots += `
                    <span class="mx-1 position-relative" 
                          style="font-size:1.4rem; cursor:help;" 
                          data-bs-toggle="tooltip" 
                          data-bs-placement="top" 
                          title="${tooltipText}">
                        ${emojis[hasLog.mood_score]}
                        ${safeNote ? '<span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" style="width:8px; height:8px;"></span>' : ''}
                    </span>`;
            } else {
                statusDots += `<span class="text-light bg-secondary bg-opacity-25 rounded-circle mx-1" style="width:10px; height:10px; display:inline-block;"></span>`;
            }
        });

        const html = `
            <div class="list-group-item d-flex align-items-center justify-content-between py-3 px-3 border-bottom-0 border-top">
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle bg-white border d-flex align-items-center justify-content-center text-primary fw-bold shadow-sm" 
                         style="width: 45px; height: 45px; font-size: 1rem;">
                        ${username.substring(0, 2).toUpperCase()}
                    </div>
                    <div style="line-height: 1.3;">
                        <div class="fw-bold text-dark">${username}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">
                            <span class="badge bg-light text-secondary border">Line: ${line}</span>
                        </div>
                    </div>
                </div>
                <div class="d-flex align-items-center bg-light rounded-pill px-2 py-1">
                    ${statusDots}
                </div>
            </div>
        `;
        listContainer.innerHTML += html;
    });

    const tooltipTriggerList = listContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
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
    
    const dateObj = new Date(dateStr);
    const dateTh = dateObj.toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
    
    document.getElementById('formPeriodLabel').innerHTML = 
        `<small class="text-muted d-block" style="font-size: 0.85rem;">Production Date: ${dateTh}</small>` + 
        `<span class="fw-bold text-dark" style="font-size: 1.1rem;">${periodInfo[periodId].label}</span>`;
    
    document.getElementById('inputMood').value = '';   
    document.getElementById('inputQty').value = '';    
    document.getElementById('inputNote').value = '';   
    
    document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('active'));
    document.getElementById('moodError').classList.add('d-none');

    if (globalMonthlyData[dateStr] && globalMonthlyData[dateStr][periodId]) {
        const logData = globalMonthlyData[dateStr][periodId];
        selectEmoji(logData.mood);
        document.getElementById('inputQty').value = logData.qty ? parseInt(logData.qty) : '';
        document.getElementById('inputNote').value = logData.note || '';
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
                logModal.hide();
                fetchData();
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error(error);
            alert("Error saving data");
        }
    });
    
    const themeBtn = document.getElementById('portal-theme-btn');
    
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            console.log("Theme button clicked!"); // [DEBUG] เช็คว่ากดติดไหม

            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            // 1. เปลี่ยน Attribute ที่ <html>
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            
            // 2. จำค่าลง LocalStorage
            localStorage.setItem('theme', newTheme);
        });
    } else {
        console.error("Theme button not found!"); // [DEBUG] แจ้งเตือนถ้าหาปุ่มไม่เจอ
    }
}

function formatDateTH(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}