let logoutTimer;

function resetLogoutTimer() {
clearTimeout(logoutTimer);
logoutTimer = setTimeout(() => {
    alert("You were inactive for 5 minutes. Logging out...");
    window.location.href = "../../auth/logout.php?redirect=1";
}, 5 * 60 * 1000); // 5 minutes
}

['click', 'mousemove', 'keydown', 'scroll'].forEach(evt =>
document.addEventListener(evt, resetLogoutTimer)
);

resetLogoutTimer(); // Start on load