<?php
//-- เริ่ม Session หากยังไม่ได้เริ่ม --
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

//-- ตรวจสอบการล็อกอิน: หากยังไม่ได้ล็อกอิน ให้ Redirect ไปยังหน้า login --
if (!isset($_SESSION['user'])) {
    //-- สร้าง URL ปลายทางสำหรับ Redirect กลับมาหลังล็อกอินสำเร็จ --
    $redirect_url = str_replace('/oee_dashboard/oee_dashboard-main/OEE_Dashboard', '', $_SERVER['REQUEST_URI']);
    header("Location: ../../auth/login_form.php?redirect=" . urlencode($redirect_url));
    exit;
}

//-- ฟังก์ชันสำหรับตรวจสอบ Role ของผู้ใช้ที่ล็อกอินอยู่ --
function hasRole($roles): bool {
    //-- ถ้าไม่มี Role ใน Session ให้คืนค่า false --
    if (empty($_SESSION['user']['role'])) {
        return false;
    }

    $userRole = $_SESSION['user']['role'];
    
    //-- กรณีตรวจสอบกับหลาย Role (Array) --
    if (is_array($roles)) {
        return in_array($userRole, $roles);
    }
    
    //-- กรณีตรวจสอบกับ Role เดียว (String) --
    return $userRole === $roles;
}

/**
 * ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้ปัจจุบันมีสิทธิ์ในไลน์ที่ระบุหรือไม่
 * @param string $requiredLine - ไลน์ที่ต้องการตรวจสอบ
 * @return bool - คืนค่า true หากมีสิทธิ์, false หากไม่มี
 */
function checkLinePermission($requiredLine): bool {
    // Admin และ Creator มีสิทธิ์ในทุกไลน์เสมอ
    if (hasRole(['admin', 'creator'])) {
        return true;
    }
    // Supervisor จะมีสิทธิ์ก็ต่อเมื่อไลน์ตรงกับของตัวเอง
    if ($_SESSION['user']['role'] === 'supervisor') {
        return isset($_SESSION['user']['line']) && ($_SESSION['user']['line'] === $requiredLine);
    }
    // Role อื่นๆ ไม่มีสิทธิ์
    return false;
}

/**
 * ฟังก์ชันสำหรับบังคับใช้สิทธิ์ของไลน์ หากไม่มีสิทธิ์จะโยน Exception
 * @param string $requiredLine - ไลน์ที่ต้องการบังคับใช้สิทธิ์
 */
function enforceLinePermission($requiredLine) {
    if (!checkLinePermission($requiredLine)) {
        http_response_code(403); // Forbidden
        throw new Exception("Permission Denied: You can only manage data for your assigned line.");
    }
}
?>

