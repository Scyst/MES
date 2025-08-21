// --- Auto Logout Logic ---

const INACTIVITY_TIMEOUT = 4.5 * 60 * 1000;
const COUNTDOWN_SECONDS = 30;

let inactivityTimer, countdownTimer, countdownInterval;
let inactivityModal, countdownElement, stayLoggedInBtn;

function logoutNow() {
    console.log('Auto-logout initiated. Clearing filters...');
    localStorage.removeItem('pdTableFilters');
    localStorage.removeItem('inventoryUIFilters');
    window.location.href = "../../auth/logout.php?timeout=1";
}

function startFinalCountdown() {
    if (!inactivityModal) return;
    inactivityModal.show();
    
    let secondsLeft = COUNTDOWN_SECONDS;
    if(countdownElement) countdownElement.textContent = secondsLeft;

    countdownInterval = setInterval(() => {
        secondsLeft--;
        if(countdownElement) countdownElement.textContent = secondsLeft;
        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);

    countdownTimer = setTimeout(logoutNow, COUNTDOWN_SECONDS * 1000);
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    clearTimeout(countdownTimer);
    clearInterval(countdownInterval);

    const modalInstance = document.getElementById('inactivityModal');
    if (inactivityModal && modalInstance && bootstrap.Modal.getInstance(modalInstance)) {
        inactivityModal.hide();
    }
    
    inactivityTimer = setTimeout(startFinalCountdown, INACTIVITY_TIMEOUT);
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // ไฟล์นี้จะจัดการเฉพาะ Auto Logout เท่านั้น
    const modalEl = document.getElementById('inactivityModal');
    if (modalEl) {
        inactivityModal = new bootstrap.Modal(modalEl);
        countdownElement = document.getElementById('logout-countdown');
        stayLoggedInBtn = document.getElementById('stay-logged-in-btn');

        if(stayLoggedInBtn) {
            stayLoggedInBtn.addEventListener('click', resetInactivityTimer);
        }

        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
            document.addEventListener(evt, resetInactivityTimer, { passive: true })
        );

        resetInactivityTimer();
    }
});