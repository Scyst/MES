<?php
// MES/auth/check_auth.php

// 1. Secure Session Setup
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']), // Auto-enable Secure if HTTPS
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// 2. Login Check & Redirect
if (!defined('ALLOW_GUEST_ACCESS') && !isset($_SESSION['user'])) {
    $current_url = $_SERVER['REQUEST_URI'];
    $baseUrl = defined('BASE_URL') ? BASE_URL : '../..';
    
    header("Location: {$baseUrl}/auth/login_form.php?redirect=" . urlencode($current_url));
    exit;
}

// 3. CSRF Token Generation
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); 
}

// --- Helper Functions ---

function hasRole($roles): bool {
    if (empty($_SESSION['user']['role'])) return false;
    $userRole = $_SESSION['user']['role'];
    
    if (is_array($roles)) return in_array($userRole, $roles);
    return $userRole === $roles;
}

function checkLinePermission($requiredLine): bool {
    if (hasRole(['admin', 'creator'])) return true;
    if (hasRole('supervisor')) {
        return isset($_SESSION['user']['line']) && ($_SESSION['user']['line'] === $requiredLine);
    }
    return false;
}

function enforceLinePermission($requiredLine) {
    if (!checkLinePermission($requiredLine)) {
        http_response_code(403);
        throw new Exception("Permission Denied: Line mismatch.");
    }
}

function enforceRecordPermission($pdo, $tableName, $recordId, $idColumn, $ownerColumn) {
    $currentUser = $_SESSION['user'];
    
    // Admin/Creator bypass check
    if (hasRole(['admin', 'creator'])) return;

    // 4. Security Whitelist (Prevent SQL Injection)
    $allowedTables = [
        'MANPOWER_DAILY_LOGS', 'MANPOWER_DAILY_LOGS_TEST',
        'MAINTENANCE_REQUESTS', 'MAINTENANCE_REQUESTS_TEST',
        'DOCUMENTS', 'DOCUMENTS_TEST',
        'OPERATOR_DAILY_LOGS', 'OPERATOR_DAILY_LOGS_TEST',
        'LOADING_REPORTS', 'LOADING_REPORTS_TEST'
    ];
    
    $allowedColumns = [
        'log_id', 'id', 'request_id', 'emp_id', 'operator_id', 
        'uploaded_by_user_id', 'created_by', 'user_id', 'created_by_user_id'
    ];

    if (!in_array($tableName, $allowedTables) || 
        !in_array($idColumn, $allowedColumns) || 
        !in_array($ownerColumn, $allowedColumns)) {
        
        http_response_code(500);
        throw new Exception("Security Violation: Invalid Table or Column access.");
    }

    // 5. Query Check
    $sql = "SELECT line, $ownerColumn FROM $tableName WHERE $idColumn = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$recordId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        http_response_code(404);
        throw new Exception("Record not found.");
    }

    // Supervisor Check (Line-based)
    if (hasRole('supervisor')) {
        if (isset($currentUser['line']) && isset($record['line']) && $currentUser['line'] === $record['line']) {
            return;
        }
    }
    
    // Operator Check (Owner-based)
    if (hasRole('operator')) {
        // Determine ID type (User ID vs Username) based on column name
        $useUserId = in_array($ownerColumn, ['operator_id', 'user_id', 'uploaded_by_user_id', 'created_by_user_id']);
        $currentUserIdentifier = $useUserId ? $currentUser['id'] : $currentUser['username'];
        
        $ownerInDb = $record[$ownerColumn] ?? null;
        
        if ($ownerInDb !== null && (string)$ownerInDb === (string)$currentUserIdentifier) {
            return;
        }
    }

    http_response_code(403);
    throw new Exception("Permission Denied: You do not own this record.");
}
?>