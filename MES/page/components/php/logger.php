<?php
// page/components/php/logger.php

/**
 * Global Audit Log Function
 * รองรับทุกหน้าจอด้วยการแปลง Data เป็น JSON
 * * @param PDO    $pdo       Database Connection
 * @param string $action    การกระทำ (UPDATE, DELETE, UNLOCK, LOGIN)
 * @param string $module    ชื่อโมดูล (LOADING, USER, MAINTENANCE)
 * @param string $refId     ID ของรายการ (เช่น report_id)
 * @param array|null $oldData  ข้อมูลก่อนแก้ (Array)
 * @param array|null $newData  ข้อมูลหลังแก้ (Array)
 * @param string $remark    เหตุผล (ถ้ามี)
 */
function writeLog($pdo, $action, $module, $refId, $oldData = null, $newData = null, $remark = '') {
    try {
        $userId = $_SESSION['user']['id'] ?? 'SYSTEM';
        $username = $_SESSION['user']['username'] ?? 'SYSTEM';
        $role = $_SESSION['user']['role'] ?? 'system';
        
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN';
        $oldJson = $oldData ? json_encode($oldData, JSON_UNESCAPED_UNICODE) : null;
        $newJson = $newData ? json_encode($newData, JSON_UNESCAPED_UNICODE) : null;
        $sql = "INSERT INTO SYSTEM_LOGS 
                (user_id, username, role, action, module, ref_id, old_value, new_value, remark, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $userId, $username, $role, 
            $action, $module, $refId, 
            $oldJson, $newJson, $remark, 
            $ip, $userAgent
        ]);

    } catch (Exception $e) {
        error_log("Audit Log Error: " . $e->getMessage());
    }
}
/**
 * Global Error Log Function
 * ใช้สำหรับบันทึก Exception หรือ DB Error โดยไม่เปิดเผยให้ User เห็น
 */
function writeErrorLog($pdo, $module, $errorMessage, $payloadData = null) {
    try {
        $userId = $_SESSION['user']['id'] ?? 'SYSTEM';
        $username = $_SESSION['user']['username'] ?? 'SYSTEM';
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN';
        
        $payloadJson = $payloadData ? json_encode($payloadData, JSON_UNESCAPED_UNICODE) : null;

        $sql = "INSERT INTO SYSTEM_LOGS 
                (user_id, username, role, action, module, ref_id, old_value, new_value, remark, ip_address, user_agent) 
                VALUES (?, ?, 'system', 'SYSTEM_ERROR', ?, 'ERROR', ?, NULL, ?, ?, ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $userId, $username, $module, 
            $payloadJson, $errorMessage, 
            $ip, $userAgent
        ]);
        
        error_log("[$module] SYSTEM_ERROR: " . $errorMessage);

    } catch (Exception $e) {
        error_log("Failed to write Error Log: " . $e->getMessage());
    }
}

/**
 * Global API Error Handler
 * ใช้สำหรับดักจับ Error ทั้งระบบ (รวมถึงตัดข้อความ [SQL Server] อัตโนมัติ)
 */
function handleApiError(Throwable $e, $pdo = null, $payload = null) {
    if ($pdo !== null && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    $fullErrorMessage = $e->getMessage();
    $displayMessage = $fullErrorMessage;
    $httpCode = 400;
    if (strpos($fullErrorMessage, '[SQL Server]') !== false) {
        $parts = explode('[SQL Server]', $fullErrorMessage);
        $displayMessage = trim(end($parts));
    }

    if ($pdo !== null) {
        try {
            $userId = $_SESSION['user']['id'] ?? 'SYSTEM';
            $username = $_SESSION['user']['username'] ?? 'SYSTEM';
            $role = $_SESSION['user']['role'] ?? 'SYSTEM';
            $uri = $_SERVER['REQUEST_URI'] ?? 'Unknown URI';
            $payloadData = $payload ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null;
            $moduleName = basename($_SERVER['PHP_SELF']);

            $logStmt = $pdo->prepare("
                INSERT INTO dbo.SYSTEM_LOGS 
                (user_id, username, role, action, module, ref_id, old_value, new_value, remark) 
                VALUES (?, ?, ?, 'API_ERROR', ?, '500', ?, ?, ?)
            ");
            $logStmt->execute([$userId, $username, $role, $moduleName, $payloadData, $fullErrorMessage, $uri]);
        } catch (Throwable $logEx) {
            error_log("Failed to write to SYSTEM_LOGS: " . $logEx->getMessage() . " | Original Error: " . $fullErrorMessage);
        }
    }

    header('Content-Type: application/json; charset=utf-8');
    http_response_code($httpCode);
    echo json_encode([
        'success' => false, 
        'message' => $displayMessage
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
?>