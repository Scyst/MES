/**
 * แสดง Loading Spinner และ Overlay
 */
function showSpinner() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('visible');
    }
}

/**
 * ซ่อน Loading Spinner และ Overlay
 */
function hideSpinner() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
}