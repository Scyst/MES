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
 * ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้ปัจจุบันมีสิทธิ์ในไลน์ที่ระบุหรือไม่
 * @param string $requiredLine - ไลน์ที่ต้องการตรวจสอบ
 * @return bool - คืนค่า true หากมีสิทธิ์, false หากไม่มี
 */
function checkLinePermission($requiredLine): bool {
    if (hasRole(['admin', 'creator'])) {
        return true;
    }
    if (hasRole('supervisor')) {
        return isset($_SESSION['user']['line']) && ($_SESSION['user']['line'] === $requiredLine);
    }
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

/**
 * --- NEW FUNCTION ---
 * ฟังก์ชันกลางสำหรับบังคับใช้สิทธิ์ในข้อมูล (Record-Level)
 * @param PDO $pdo - PDO connection object
 * @param string $tableName - ชื่อตาราง (e.g., 'PARTS_TEST')
 * @param int $recordId - ID ของข้อมูลที่ต้องการตรวจสอบ
 * @param string $idColumn - ชื่อคอลัมน์ Primary Key (e.g., 'id', 'entry_id')
 * @param string $ownerColumn - ชื่อคอลัมน์ที่เก็บข้อมูลผู้สร้าง (e.g., 'operator_id', 'operator')
 */
function enforceRecordPermission($pdo, $tableName, $recordId, $idColumn, $ownerColumn) {
    $currentUser = $_SESSION['user'];

    // Admins and Creators can do anything
    if (hasRole(['admin', 'creator'])) {
        return;
    }

    $stmt = $pdo->prepare("SELECT line, {$ownerColumn} FROM {$tableName} WHERE {$idColumn} = ?");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        http_response_code(404);
        throw new Exception("Record not found (ID: {$recordId} in table {$tableName}).");
    }

    // Supervisors have permission based on their assigned line
    if (hasRole('supervisor')) {
        if (isset($currentUser['line']) && $currentUser['line'] === $record['line']) {
            return; 
        }
    }
    
    // Operators have permission only if they are the owner of the record
    if (hasRole('operator')) {
        // Determine the correct identifier for the current user (ID or username)
        $currentUserIdentifier = ($ownerColumn === 'operator_id') ? $currentUser['id'] : $currentUser['username'];
        $ownerIdentifierInDb = $record[$ownerColumn] ?? null;

        if ($ownerIdentifierInDb !== null && $ownerIdentifierInDb == $currentUserIdentifier) {
            return; // Operator owns this record
        }
    }

    // Default deny for any other case
    http_response_code(403);
    throw new Exception("Permission Denied: You do not have permission to modify this record.");
}
?>