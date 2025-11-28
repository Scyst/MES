<?php
// MES/auth/check_auth.php

// 1. เริ่ม Session หากยังไม่ได้เริ่ม
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 2. ตรวจสอบการล็อกอิน: หากยังไม่ได้ล็อกอิน ให้ Redirect ไปยังหน้า login
if (!isset($_SESSION['user'])) {
    // เก็บ URL หน้าปัจจุบันที่ผู้ใช้พยายามจะเข้า (เช่น พยายามเข้าหน้า Store Request)
    // เพื่อให้หลังจาก Login เสร็จ ระบบจะส่งกลับมาหน้านี้ได้ถูกต้อง
    $current_url = $_SERVER['REQUEST_URI'];
    
    // ส่งไปหน้า Login Form พร้อมแนบ Link หน้าเดิมไปด้วย (Redirect Back)
    // หมายเหตุ: Path ../../auth/login_form.php อ้างอิงจากตำแหน่งไฟล์ที่เรียกใช้ check_auth (ส่วนใหญ่จะอยู่ใน page/xyz/)
    header("Location: ../../auth/login_form.php?redirect=" . urlencode($current_url));
    exit;
}

// 3. สร้าง CSRF Token หากยังไม่มี (เพื่อป้องกันการโจมตีแบบ Cross-Site Request Forgery)
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
 * @return bool - คืนค่า true หากมีสิทธิ์, false หากไม่มี
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
 * ฟังก์ชันสำหรับบังคับใช้สิทธิ์ของไลน์ หากไม่มีสิทธิ์จะหยุดการทำงานและแจ้ง Error 403
 * @param string $requiredLine - ไลน์ที่ต้องการบังคับใช้สิทธิ์
 */
function enforceLinePermission($requiredLine) {
    if (!checkLinePermission($requiredLine)) {
        http_response_code(403); // Forbidden
        throw new Exception("Permission Denied: You can only manage data for your assigned line.");
    }
}

/**
 * ฟังก์ชันกลางสำหรับบังคับใช้สิทธิ์ในข้อมูลระดับแถว (Record-Level Permission)
 * ใช้สำหรับตรวจสอบว่า User เป็นเจ้าของข้อมูลนั้นๆ หรือไม่
 * * @param PDO $pdo - Object การเชื่อมต่อฐานข้อมูล
 * @param string $tableName - ชื่อตาราง (e.g., 'PARTS_TEST')
 * @param int $recordId - ID ของข้อมูลที่ต้องการตรวจสอบ
 * @param string $idColumn - ชื่อคอลัมน์ Primary Key (e.g., 'id', 'entry_id')
 * @param string $ownerColumn - ชื่อคอลัมน์ที่เก็บข้อมูลผู้สร้าง (e.g., 'operator_id', 'operator')
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