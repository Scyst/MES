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

function renderAdminDashboard(dashboardData, factoryMood) {
    const btnOpen = document.getElementById('btnOpenAdminDash'); // ปุ่มกด
    const moodScoreEl = document.getElementById('factoryMoodScore');
    const moodEmojiEl = document.getElementById('factoryMoodEmoji');
    const listContainer = document.getElementById('teamLogList');
    const emojis = {1:'😤', 2:'😓', 3:'😐', 4:'🙂', 5:'🤩'};

    // 1. แสดงปุ่ม (เฉพาะ Admin/Sup ถึงจะเห็นปุ่มนี้)
    btnOpen.classList.remove('d-none');

    // 2. ใส่ข้อมูลลงใน Modal Elements (เหมือนเดิม)
    const avg = factoryMood.avg ? parseFloat(factoryMood.avg).toFixed(1) : 0;
    moodScoreEl.innerText = avg > 0 ? avg : "-";
    
    let moodInt = Math.round(avg);
    if(moodInt < 1) moodInt = 3; 
    moodEmojiEl.innerText = emojis[moodInt];

    // 3. Render List
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
                // 1. จัดการข้อความ Note (ป้องกันเครื่องหมายคำพูดทำ HTML พัง)
                const rawNote = hasLog.note || '';
                const safeNote = rawNote.replace(/"/g, '&quot;'); 
                
                // 2. สร้างข้อความที่จะโชว์ใน Tooltip
                // เช่น: "เช้า (Start): เครื่องจักรมีปัญหา" หรือแค่ "เช้า (Start)" ถ้าไม่มีโน๊ต
                const tooltipText = `${periodInfo[pid].label}${safeNote ? ': ' + safeNote : ''}`;

                // 3. ใส่ data-bs-toggle="tooltip" และ title
                statusDots += `
                    <span class="mx-1 position-relative" 
                          style="font-size:1.4rem; cursor:help;" 
                          data-bs-toggle="tooltip" 
                          data-bs-placement="top" 
                          title="${tooltipText}">
                        ${emojis[hasLog.mood_score]}
                        ${safeNote ? '<span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" style="width:8px; height:8px;"></span>' : ''}
                    </span>`;
                    // ^ บรรทัดบน: ผมแถมจุดแดงเล็กๆ (Notification dot) ให้ด้วย ถ้ามี Note จะได้รู้ว่าควรกดดู
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
    // 1. ปิด Modal รายการวัน (ถ้ามันเปิดค้างอยู่)
    dayManagerModal.hide();

    // 2. ใส่ค่าลงใน Hidden Input ของฟอร์ม (เพื่อเตรียมส่งไป Backend)
    document.getElementById('inputTargetDate').value = dateStr;
    document.getElementById('inputPeriodId').value = periodId;
    
    // 3. จัดการแสดงผล Label หัวข้อ Modal
    // แปลงวันที่ (YYYY-MM-DD) เป็นรูปแบบไทย (เช่น 28 พ.ย. 2025)
    const dateObj = new Date(dateStr);
    const dateTh = dateObj.toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
    
    // แสดงผล 2 บรรทัด: บรรทัดบนบอกวันที่ผลิต, บรรทัดล่างบอกช่วงเวลา (เริ่ม/พัก/เลิก)
    document.getElementById('formPeriodLabel').innerHTML = 
        `<small class="text-muted d-block" style="font-size: 0.85rem;">Production Date: ${dateTh}</small>` + 
        `<span class="fw-bold text-dark" style="font-size: 1.1rem;">${periodInfo[periodId].label}</span>`;
    
    // 4. รีเซ็ตฟอร์มให้ว่าง (Clearing Form)
    document.getElementById('inputMood').value = '';   // ล้างค่าอารมณ์
    document.getElementById('inputQty').value = '';    // ล้างยอดผลิต
    document.getElementById('inputNote').value = '';   // ล้างโน้ต
    
    // ล้างการเลือก Emoji (เอา class active ออกให้หมด)
    document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('active'));
    // ซ่อนข้อความ Error
    document.getElementById('moodError').classList.add('d-none');

    // 5. ตรวจสอบข้อมูลเก่า (Pre-fill Data)
    // ถ้าใน globalMonthlyData มีข้อมูลของวันที่นี้ และช่วงเวลานี้อยู่แล้ว แปลว่าเป็นการ "แก้ไข"
    if (globalMonthlyData[dateStr] && globalMonthlyData[dateStr][periodId]) {
        const logData = globalMonthlyData[dateStr][periodId];

        // 5.1 เลือก Emoji ตามค่าเดิม
        selectEmoji(logData.mood);

        // 5.2 ใส่ค่า Qty เดิม (แปลงเป็น Int หรือปล่อยว่างถ้าเป็น 0/null)
        document.getElementById('inputQty').value = logData.qty ? parseInt(logData.qty) : '';

        // 5.3 ใส่ Note เดิม
        document.getElementById('inputNote').value = logData.note || '';
    }

    // 6. สั่งเปิด Modal
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