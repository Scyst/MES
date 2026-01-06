<?php
// MES/auth/check_auth.php

// 1. เริ่ม Session หากยังไม่ได้เริ่ม
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ----------------------------------------------------------------------
// 2. ตรวจสอบการล็อกอิน
// ----------------------------------------------------------------------
if (!defined('ALLOW_GUEST_ACCESS') && !isset($_SESSION['user'])) {
    
    $current_url = $_SERVER['REQUEST_URI'];
    
    // [CORRECTED] ต้องชี้ไปที่ login_form.php (หน้าจอ) ไม่ใช่ login.php (ตัว process)
    if (defined('BASE_URL')) {
        $loginUrl = BASE_URL . '/auth/login_form.php';
    } else {
        // Fallback: ถอย 2 ชั้นจาก page/sales/.. ไปหา auth/login_form.php
        $loginUrl = '../../auth/login_form.php'; 
    }
    
    header("Location: " . $loginUrl . "?redirect=" . urlencode($current_url));
    exit;
}

// 3. สร้าง CSRF Token
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); 
}

function hasRole($roles): bool {
    if (empty($_SESSION['user']['role'])) return false;
    $userRole = $_SESSION['user']['role'];
    if (is_array($roles)) return in_array($userRole, $roles);
    return $userRole === $roles;
}

function checkLinePermission($requiredLine): bool {
    if (hasRole(['admin', 'creator'])) return true;
    if (hasRole('supervisor')) return isset($_SESSION['user']['line']) && ($_SESSION['user']['line'] === $requiredLine);
    return false;
}

function enforceLinePermission($requiredLine) {
    if (!checkLinePermission($requiredLine)) {
        http_response_code(403);
        throw new Exception("Permission Denied.");
    }
}

function enforceRecordPermission($pdo, $tableName, $recordId, $idColumn, $ownerColumn) {
    $currentUser = $_SESSION['user'];
    if (hasRole(['admin', 'creator'])) return;

    $stmt = $pdo->prepare("SELECT line, {$ownerColumn} FROM {$tableName} WHERE {$idColumn} = ?");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        http_response_code(404);
        throw new Exception("Record not found.");
    }

    if (hasRole('supervisor')) {
        if (isset($currentUser['line']) && $currentUser['line'] === $record['line']) return; 
    }
    
    if (hasRole('operator')) {
        $currentUserIdentifier = ($ownerColumn === 'operator_id') ? $currentUser['id'] : $currentUser['username'];
        $ownerIdentifierInDb = $record[$ownerColumn] ?? null;
        if ($ownerIdentifierInDb !== null && $ownerIdentifierInDb == $currentUserIdentifier) return;
    }

    http_response_code(403);
    throw new Exception("Permission Denied.");
}
?>