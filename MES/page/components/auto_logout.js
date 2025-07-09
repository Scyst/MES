// --- Auto Logout Logic ---

// กำหนดค่าต่างๆ
const INACTIVITY_TIMEOUT = 4.5 * 60 * 1000; // เวลาที่จะแสดงหน้าต่างเตือน (4.5 นาที)
const COUNTDOWN_SECONDS = 30; // เวลานับถอยหลังก่อน Logout จริง (30 วินาที)

// ตัวแปรสำหรับเก็บ Timer และ Instance ของ Modal
let inactivityTimer;
let countdownTimer;
let countdownInterval;
let inactivityModal;
let countdownElement;
let stayLoggedInBtn;

/**
 * ฟังก์ชันสำหรับ Logout ทันที
 */
function logoutNow() {
    window.location.href = "../../auth/logout.php?timeout=1";
}

/**
 * ฟังก์ชันสำหรับเริ่มนับถอยหลังและแสดง Modal
 */
function startFinalCountdown() {
    // แสดง Modal
    inactivityModal.show();
    
    let secondsLeft = COUNTDOWN_SECONDS;
    countdownElement.textContent = secondsLeft;

    // เริ่มนับถอยหลังทุก 1 วินาที
    countdownInterval = setInterval(() => {
        secondsLeft--;
        countdownElement.textContent = secondsLeft;
        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);

    // ตั้งเวลาสำหรับ Logout จริง
    countdownTimer = setTimeout(logoutNow, COUNTDOWN_SECONDS * 1000);
}

/**
 * ฟังก์ชันสำหรับรีเซ็ต Timer ทั้งหมด (เมื่อผู้ใช้มีการใช้งาน)
 */
function resetInactivityTimer() {
    // เคลียร์ Timer ทั้งหมดที่มีอยู่
    clearTimeout(inactivityTimer);
    clearTimeout(countdownTimer);
    clearInterval(countdownInterval);

    // ซ่อน Modal (หากแสดงอยู่)
    if (inactivityModal && bootstrap.Modal.getInstance(document.getElementById('inactivityModal'))) {
        inactivityModal.hide();
    }
    
    // ตั้งเวลาสำหรับแสดงหน้าต่างเตือนใหม่
    inactivityTimer = setTimeout(startFinalCountdown, INACTIVITY_TIMEOUT);
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // เตรียม Element ของ Modal เมื่อหน้าเว็บพร้อม
    const modalEl = document.getElementById('inactivityModal');
    if (modalEl) {
        inactivityModal = new bootstrap.Modal(modalEl);
        countdownElement = document.getElementById('logout-countdown');
        stayLoggedInBtn = document.getElementById('stay-logged-in-btn');

        // เพิ่ม Event Listener ให้กับปุ่ม "Stay Logged In"
        stayLoggedInBtn.addEventListener('click', resetInactivityTimer);

        // เพิ่ม Event Listener ให้กับกิจกรรมต่างๆ ของผู้ใช้
        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
            document.addEventListener(evt, resetInactivityTimer, { passive: true })
        );

        // เริ่มนับเวลาครั้งแรก
        resetInactivityTimer();
    }
});