// MES/page/dailyLog/script/dailyLog.js
"use strict";

const API_URL = 'api/dailyLogManage.php';
let globalMonthlyData = {};
let globalTodayDate = getProductionDate();
let globalUnreadDates = [];

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
// ตรวจสอบก่อนเรียกใช้ เพราะบางหน้าที่ไม่มี Modal นี้อาจจะ Error
const adminDashEl = document.getElementById('adminDashboardModal');
if(adminDashEl) window.adminDashboardModal = new bootstrap.Modal(adminDashEl);

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
            globalUnreadDates = res.data.unreadDates || [];

            renderTodayCards(res.data.todayLogs);
            renderCalendar(globalMonthlyData);
            renderNotifications(res.data.replyCount);
            
            const userRole = res.data.userRole;
            // เช็คว่าเป็นบทบาทที่ดูได้หรือไม่
            if (['admin', 'creator', 'supervisor'].includes(userRole)) {
                // ถ้ามีฟังก์ชัน renderAdminDashboard (และมีสิทธิ์) ให้ทำงาน
                if (typeof renderAdminDashboard === 'function') {
                    renderAdminDashboard(res.data.dashboardData, res.data.factoryMood);
                }
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// [NEW] Functions for Notification
function renderNotifications(count) {
    const wrapper = document.getElementById('notificationWrapper');
    const badge = document.getElementById('notificationBadge');
    
    if (count > 0) {
        if(wrapper) wrapper.classList.remove('d-none'); // แสดงปุ่ม
        if(badge) {
            badge.innerText = count;
            badge.classList.add('animate__animated', 'animate__heartBeat'); // เพิ่มลูกเล่นเด้งดึ๋ง (ถ้ามี animate.css)
        }
        
        // Optional: เด้ง SweetAlert เตือนเล็กๆ มุมขวาบน
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        
        // เช็คว่าเคยแจ้งเตือน session นี้หรือยัง (เพื่อไม่ให้รำคาญ)
        if (!sessionStorage.getItem('notified_reply')) {
            Toast.fire({
                icon: 'info',
                title: `คุณมี ${count} ข้อความตอบกลับใหม่`
            });
            sessionStorage.setItem('notified_reply', 'true');
        }

    } else {
        if(wrapper) wrapper.classList.add('d-none'); // ซ่อนถ้าไม่มี
    }
}

function scrollToCalendar() {
    const cal = document.getElementById('calendarGrid');
    if(cal) {
        cal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        globalUnreadDates.forEach(dateStr => {
            const dayEl = document.getElementById(`cal-day-${dateStr}`);
            if(dayEl) {
                dayEl.classList.add('animate__animated', 'animate__flash');
                setTimeout(() => dayEl.classList.remove('animate__animated', 'animate__flash'), 2000);
            }
        });
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
    if (!container) return; // ป้องกัน Error ถ้าหน้าจอไม่มี element นี้

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

        // เช็ค Login จากตัวแปร global ที่ประกาศใน PHP (Init.php หรือ dailyLogUI.php)
        // ถ้าไม่มีให้ถือว่า Login แล้ว (เผื่อกรณี Test)
        const isLoggedIn = (typeof IS_LOGGED_IN !== 'undefined') ? IS_LOGGED_IN : true;
        const clickAction = isLoggedIn 
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
    if (!container) return;

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
        
        const hasUnread = globalUnreadDates.includes(dateStr);
        const unreadClass = hasUnread ? 'unread-pulse' : '';
        
        let dotsHtml = '';
        for (let p = 1; p <= 3; p++) {
            // เช็คว่ามีข้อมูลไหม
            const isDone = (data[dateStr] && data[dateStr][p]) ? 'done' : '';
            dotsHtml += `<div class='c-dot ${isDone}'></div>`;
        }

        const html = `
            <div class='snc-cal-day ${isToday} ${unreadClass}' id='cal-day-${dateStr}' onclick="openDayManager('${dateStr}')">
                <div class="d-flex justify-content-between">
                    <span>${day}</span>
                    ${hasUnread ? '<span class="badge bg-danger rounded-circle p-1" style="width:8px; height:8px;"></span>' : ''}
                </div>
                <div class='cal-dots'>${dotsHtml}</div>
            </div>`;
        container.innerHTML += html;
    }

    // Logic ปรับ Row Grid ให้ยืดเต็มจอ
    const totalSlots = firstDayOfWeek + daysInMonth;
    const rowCount = Math.ceil(totalSlots / 7);
    const calendarParent = container.parentElement; 
    if(calendarParent && calendarParent.classList.contains('snc-calendar')) {
        calendarParent.style.gridTemplateRows = `35px repeat(${rowCount}, 1fr)`;
    }
}

// Admin Dashboard Renderer (แยกส่วนไว้เพื่อให้ Code อ่านง่าย)
function renderAdminDashboard(dashboardData, factoryMood) {
    const btnOpen = document.getElementById('btnOpenAdminDash'); 
    const moodScoreEl = document.getElementById('factoryMoodScore');
    const moodEmojiEl = document.getElementById('factoryMoodEmoji');
    const listContainer = document.getElementById('teamLogList');
    const emojis = {1:'😤', 2:'😓', 3:'😐', 4:'🙂', 5:'🤩'};

    if(btnOpen) btnOpen.classList.remove('d-none');

    if(moodScoreEl) {
        const avg = factoryMood.avg ? parseFloat(factoryMood.avg).toFixed(1) : 0;
        moodScoreEl.innerText = avg > 0 ? avg : "-";
        
        let moodInt = Math.round(avg);
        if(moodInt < 1) moodInt = 3; 
        if(moodEmojiEl) moodEmojiEl.innerText = emojis[moodInt];
    }

    if(listContainer) {
        listContainer.innerHTML = '';
        
        if (!dashboardData || Object.keys(dashboardData).length === 0) {
            listContainer.innerHTML = '<div class="text-center text-muted py-4">วันนี้ยังไม่มีข้อมูล</div>';
            return;
        }
        
        Object.entries(dashboardData).forEach(([username, data]) => {
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

        // Initialize Tooltips
        const tooltipTriggerList = listContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }
}

// --- Interaction Functions ---

window.openDayManager = function(dateStr) {
    document.getElementById('dayManagerDateTitle').innerText = formatDateTH(dateStr);
    const list = document.getElementById('dayManagerList');
    list.innerHTML = '';
    
    const logs = globalMonthlyData[dateStr] || {};
    [1, 2, 3].forEach(pid => {
        const logData = logs[pid]; // ดึงข้อมูลของ period นั้นๆ
        const isDone = logData ? true : false;
        const color = isDone ? 'text-success' : 'text-muted opacity-25';
        
        // [UPDATED] เพิ่ม Badge ตอบกลับ ถ้ามี reply_message
        let replyBadge = '';
        if (isDone && logData.reply_message) {
            replyBadge = `
                <span class="badge bg-success bg-opacity-10 text-success border border-success ms-2 px-2" style="font-size: 0.7rem;">
                    <i class="fas fa-reply me-1"></i>ตอบกลับ
                </span>`;
        }

        list.innerHTML += `
            <div class="d-flex align-items-center justify-content-between p-2 border rounded mb-2 cursor-pointer hover-bg-light" onclick="openLogModal('${dateStr}', ${pid})">
                <div class="d-flex align-items-center gap-2">
                    <i class="fas fa-circle ${color}"></i> 
                    <span>${periodInfo[pid].label}</span>
                    ${replyBadge}
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
    
    // Set Form Header Info
    const dateObj = new Date(dateStr);
    const dateTh = dateObj.toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
    
    document.getElementById('formPeriodLabel').innerHTML = 
        `<small class="text-muted d-block" style="font-size: 0.85rem;">Production Date: ${dateTh}</small>` + 
        `<span class="fw-bold text-dark" style="font-size: 1.1rem;">${periodInfo[periodId].label}</span>`;
    
    // Reset Form Fields
    document.getElementById('inputMood').value = '';   
    document.getElementById('inputQty').value = '';    
    document.getElementById('inputNote').value = '';   
    document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('active'));
    document.getElementById('moodError').classList.add('d-none');

    const oldReply = document.getElementById('logReplyAlert');
    if(oldReply) oldReply.remove();

    // Fill Data if exists
    if (globalMonthlyData[dateStr] && globalMonthlyData[dateStr][periodId]) {
        const logData = globalMonthlyData[dateStr][periodId];
        
        selectEmoji(logData.mood);
        document.getElementById('inputQty').value = logData.qty ? parseInt(logData.qty) : '';
        document.getElementById('inputNote').value = logData.note || '';

        if (logData.reply_message) {
            const replyBox = document.createElement('div');
            replyBox.id = 'logReplyAlert';
            replyBox.className = 'alert alert-success bg-opacity-10 border-success text-start mt-3 mb-0 shadow-sm';
            
            replyBox.innerHTML = `
                <div class="d-flex align-items-center text-success fw-bold small mb-1">
                    <i class="fas fa-user-tie me-2"></i>ข้อความจากหัวหน้า (${logData.reply_by || 'Manager'}):
                </div>
                <div class="text-dark small text-break fst-italic ps-4 border-start border-success border-3 border-opacity-25">
                    "${logData.reply_message}"
                </div>
            `;
            
            // แทรกต่อท้ายช่อง Note (inputNote อยู่ใน div.form-floating)
            const noteInput = document.getElementById('inputNote');
            if(noteInput && noteInput.parentElement) {
                noteInput.parentElement.insertAdjacentElement('afterend', replyBox);
            }
            if (logData.is_read == 0) {
                markAsRead(dateStr, periodId);
            }
        }
    }
    logModal.show();
}

window.openNotificationModal = function() {
    const listBody = document.getElementById('notificationListBody');
    const modal = new bootstrap.Modal(document.getElementById('notificationListModal'));
    
    listBody.innerHTML = '';
    let count = 0;

    // 1. วนลูปหาข้อความที่ยังไม่อ่านจาก globalUnreadDates
    globalUnreadDates.forEach(dateStr => {
        // ใน 1 วัน อาจมีหลายช่วงเวลา (1, 2, 3) ต้องเช็คให้หมด
        [1, 2, 3].forEach(pid => {
            const log = globalMonthlyData[dateStr] && globalMonthlyData[dateStr][pid];
            
            // เงื่อนไข: มีข้อมูล + มีข้อความตอบกลับ + ยังไม่ได้อ่าน (is_read == 0)
            if (log && log.reply_message && log.is_read == 0) {
                count++;
                
                // สร้างรายการ HTML
                const item = document.createElement('button');
                item.className = 'list-group-item list-group-item-action p-3 border-bottom';
                item.onclick = function() {
                    // กดแล้วเปิด Modal อ่าน + ปิด Modal รายการนี้
                    modal.hide();
                    setTimeout(() => openLogModal(dateStr, pid), 300); // delay นิดนึงให้ modal เก่าปิดทัน
                };

                const dateTh = new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                
                item.innerHTML = `
                    <div class="d-flex w-100 justify-content-between align-items-center mb-1">
                        <small class="text-muted fw-bold">
                            <i class="far fa-calendar-alt me-1"></i>${dateTh} (${periodInfo[pid].label})
                        </small>
                        <span class="badge bg-danger rounded-circle p-1" style="width:8px; height:8px;"></span>
                    </div>
                    <div class="d-flex align-items-start">
                        <div class="me-2 text-secondary"><i class="fas fa-reply fa-flip-horizontal"></i></div>
                        <div class="text-truncate small text-dark" style="max-width: 200px;">
                            <span class="fw-bold text-success">${log.reply_by || 'Admin'}:</span> 
                            ${log.reply_message}
                        </div>
                    </div>
                `;
                listBody.appendChild(item);
            }
        });
    });

    if (count === 0) {
        listBody.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="far fa-bell-slash fa-2x mb-2 opacity-50"></i><br>
                ไม่มีการแจ้งเตือนใหม่
            </div>`;
    }

    modal.show();
}

async function markAsRead(dateStr, periodId) {
    const formData = new FormData();
    formData.append('action', 'mark_as_read');
    formData.append('log_date', dateStr);
    formData.append('period_id', periodId);
    
    // ยิงแบบเงียบๆ ไม่ต้องรอ response
    fetch(API_URL, { method: 'POST', body: formData });

    // อัปเดต Frontend ทันที (ให้ User รู้สึกว่าระบบเร็ว)
    // 1. ลบออกจาก globalUnreadDates
    globalUnreadDates = globalUnreadDates.filter(d => d !== dateStr);
    
    // 2. อัปเดตใน globalMonthlyData
    if(globalMonthlyData[dateStr] && globalMonthlyData[dateStr][periodId]) {
        globalMonthlyData[dateStr][periodId].is_read = 1;
    }

    // 3. ลดเลข Badge ลง 1
    const badge = document.getElementById('notificationBadge');
    if(badge) {
        let count = parseInt(badge.innerText) || 0;
        if(count > 0) {
            count--;
            badge.innerText = count;
            if(count === 0) document.getElementById('notificationWrapper').classList.add('d-none');
        }
    }

    // 4. เอาจุดแดงออกจากปฏิทิน (ถ้าวันนี้ไม่มี unread อื่นแล้ว)
    const dayEl = document.getElementById(`cal-day-${dateStr}`);
    if(dayEl) {
        const stillUnreadToday = [1,2,3].some(pid => {
            const l = globalMonthlyData[dateStr][pid];
            return l && l.reply_message && l.is_read == 0 && pid != periodId;
        });
        
        if(!stillUnreadToday) {
            dayEl.classList.remove('unread-pulse');
            const redDot = dayEl.querySelector('.badge.bg-danger');
            if(redDot) redDot.remove();
        }
    }
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
                fetchData(); // Reload ข้อมูลใหม่
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ',
                    timer: 1500,
                    showConfirmButton: false,
                    backdrop: `rgba(0,0,0,0.4)`
                });
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error(error);
            alert("Error saving data");
        }
    });
    
    // Theme Switcher Logic
    const themeBtn = document.getElementById('portal-theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

function formatDateTH(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}