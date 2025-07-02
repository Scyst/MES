<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ตรวจสอบว่ามีการล็อกอินหรือยัง
if (!isset($_SESSION['user'])) {
    $redirect_url = str_replace('/oee_dashboard/oee_dashboard-main/OEE_Dashboard', '', $_SERVER['REQUEST_URI']);
    header("Location: ../../auth/login_form.php?redirect=" . urlencode($redirect_url));
    exit;
}

/**
 * @param array|string $roles 
 * @return bool
 */
function hasRole($roles): bool {
    if (empty($_SESSION['user']['role'])) {
        return false;
    }

    $userRole = $_SESSION['user']['role'];
    
    if (is_array($roles)) {
        return in_array($userRole, $roles);
    }
    
    return $userRole === $roles;
}
?>