<?php
// MES/auth/check_auth.php

// 1. เริ่ม Session หากยังไม่ได้เริ่ม
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 2. ตรวจสอบการล็อกอิน
if (!isset($_SESSION['user'])) {
    $current_url = $_SERVER['REQUEST_URI'];
    
    // [FIXED] ใช้ BASE_URL เพื่อระบุตำแหน่งที่แน่นอน (Absolute Path)
    // config.php ถูกโหลดมาแล้วผ่าน init.php ดังนั้น BASE_URL ต้องมีค่าเสมอ
    if (defined('BASE_URL')) {
        $loginUrl = BASE_URL . '/auth/login_form.php';
    } else {
        // Fallback: กรณีฉุกเฉินถ้าหา BASE_URL ไม่เจอ (ไม่ควรเกิดขึ้น)
        $loginUrl = '../../auth/login_form.php'; 
    }
    
    header("Location: " . $loginUrl . "?redirect=" . urlencode($current_url));
    exit; // สำคัญมาก! ต้องหยุดการทำงานทันทีเพื่อป้องกันการหลุด
}

// 3. สร้าง CSRF Token
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); 
}

/**
 * ฟังก์ชันสำหรับตรวจสอบ Role ของผู้ใช้ที่ล็อกอินอยู่
 * @param string|array $roles - Role เดี่ยว หรือ Array ของ Role ที่อนุญาต
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

/**
 * ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้ปัจจุบันมีสิทธิ์ในไลน์การผลิตที่ระบุหรือไม่
 * @param string $requiredLine - ไลน์ที่ต้องการตรวจสอบ
 * @return bool
 */
function checkLinePermission($requiredLine): bool {
    // Admin และ Creator เข้าถึงได้ทุกไลน์
    if (hasRole(['admin', 'creator'])) {
        return true;
    }
    // Supervisor เข้าถึงได้เฉพาะไลน์ที่ตนเองสังกัด
    if (hasRole('supervisor')) {
        return isset($_SESSION['user']['line']) && ($_SESSION['user']['line'] === $requiredLine);
    }
    // Operator ไม่มีสิทธิ์จัดการระดับไลน์ (โดย default)
    return false;
}

/**
 * ฟังก์ชันสำหรับบังคับใช้สิทธิ์ของไลน์
 */
function enforceLinePermission($requiredLine) {
    if (!checkLinePermission($requiredLine)) {
        http_response_code(403); // Forbidden
        throw new Exception("Permission Denied: You can only manage data for your assigned line.");
    }
}

/**
 * ฟังก์ชันกลางสำหรับบังคับใช้สิทธิ์ในข้อมูลระดับแถว (Record-Level Permission)
 */
function enforceRecordPermission($pdo, $tableName, $recordId, $idColumn, $ownerColumn) {
    $currentUser = $_SESSION['user'];

    // Admin และ Creator แก้ไขได้ทุกข้อมูล
    if (hasRole(['admin', 'creator'])) {
        return;
    }

    // ดึงข้อมูลเจ้าของ Record จากฐานข้อมูล
    $stmt = $pdo->prepare("SELECT line, {$ownerColumn} FROM {$tableName} WHERE {$idColumn} = ?");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        http_response_code(404);
        throw new Exception("Record not found (ID: {$recordId} in table {$tableName}).");
    }

    // Supervisor แก้ไขได้ถ้าข้อมูลนั้นอยู่ในไลน์ที่ตนเองดูแล
    if (hasRole('supervisor')) {
        if (isset($currentUser['line']) && $currentUser['line'] === $record['line']) {
            return; 
        }
    }
    
    // Operator แก้ไขได้เฉพาะข้อมูลที่ตนเองเป็นคนสร้าง
    if (hasRole('operator')) {
        // ตรวจสอบว่าเป็น ID หรือ Username ที่ใช้เก็บความเป็นเจ้าของ
        $currentUserIdentifier = ($ownerColumn === 'operator_id') ? $currentUser['id'] : $currentUser['username'];
        $ownerIdentifierInDb = $record[$ownerColumn] ?? null;

        if ($ownerIdentifierInDb !== null && $ownerIdentifierInDb == $currentUserIdentifier) {
            return; // เป็นเจ้าของข้อมูลจริง
        }
    }

    // กรณีอื่นๆ ถือว่าไม่มีสิทธิ์
    http_response_code(403);
    throw new Exception("Permission Denied: You do not have permission to modify this record.");
}
?>