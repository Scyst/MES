<?php
// MES/auth/auto_logout.php
if (!isset($_SESSION['user'])) return;
?>

<div class="modal fade" id="inactivityModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-warning shadow-lg">
            <div class="modal-header bg-warning bg-opacity-10">
                <h5 class="modal-title fw-bold text-dark"><i class="fas fa-exclamation-triangle text-warning me-2"></i> Session Timeout Warning</h5>
            </div>
            <div class="modal-body text-center py-4">
                <p class="fs-5 mb-2">คุณไม่ได้ใช้งานระบบเป็นระยะเวลาหนึ่ง</p>
                <p class="text-muted mb-4">ระบบจะทำการออกจากระบบอัตโนมัติในอีก</p>
                <div class="display-1 fw-bold text-danger mb-3" id="logout-countdown">30</div>
                <p class="text-muted">วินาที</p>
            </div>
            <div class="modal-footer justify-content-center bg-light">
                <button type="button" class="btn btn-primary btn-lg px-5 shadow-sm" id="stay-logged-in-btn">
                    <i class="fas fa-mouse-pointer me-2"></i> ใช้งานต่อ
                </button>
            </div>
        </div>
    </div>
</div>

<script>
"use strict";
(function() {
    const INACTIVITY_TIMEOUT = 4.5 * 60 * 1000;
    const COUNTDOWN_SECONDS = 30;
    const LOGOUT_URL = "<?php echo (defined('BASE_URL') ? BASE_URL : '../..') . '/auth/logout.php?timeout=1'; ?>";

    let inactivityTimer, countdownTimer, countdownInterval;
    let inactivityModal, countdownElement, stayLoggedInBtn;

    function logoutNow() {
        localStorage.removeItem('pdTableFilters');
        localStorage.removeItem('inventoryUIFilters');
        window.location.href = LOGOUT_URL;
    }

    function startFinalCountdown() {
        if (!inactivityModal) return;
        inactivityModal.show();
        let secondsLeft = COUNTDOWN_SECONDS;
        if(countdownElement) countdownElement.textContent = secondsLeft;

        countdownInterval = setInterval(() => {
            secondsLeft--;
            if(countdownElement) countdownElement.textContent = secondsLeft;
            if (secondsLeft <= 0) clearInterval(countdownInterval);
        }, 1000);

        countdownTimer = setTimeout(logoutNow, COUNTDOWN_SECONDS * 1000);
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        clearTimeout(countdownTimer);
        clearInterval(countdownInterval);

        const modalEl = document.getElementById('inactivityModal');
        if (modalEl && modalEl.classList.contains('show') && inactivityModal) {
            inactivityModal.hide();
        }
        inactivityTimer = setTimeout(startFinalCountdown, INACTIVITY_TIMEOUT);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const modalEl = document.getElementById('inactivityModal');
        if (modalEl) {
            inactivityModal = new bootstrap.Modal(modalEl);
            countdownElement = document.getElementById('logout-countdown');
            stayLoggedInBtn = document.getElementById('stay-logged-in-btn');

            if(stayLoggedInBtn) stayLoggedInBtn.addEventListener('click', resetInactivityTimer);
            ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
                document.addEventListener(evt, resetInactivityTimer, { passive: true })
            );
            resetInactivityTimer();
        }
    });
})();
</script>