<?php
/**
 * Global Enterprise Audit & Error Logging Utility
 * Project: MES Toolbox OS
 * Standard: Industrial Audit Trail Protocol (SYSTEM_LOGS)
 */

if (!function_exists('formatAuditData')) {
    /**
     * Safely format audit data to JSON string without double-encoding.
     */
    function formatAuditData($data) {
        if ($data === null || $data === '') return null;
        if (is_array($data) || is_object($data)) {
            return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        if (is_string($data)) {
            $trimmed = trim($data);
            if (($trimmed[0] === '{' && substr($trimmed, -1) === '}') ||
                ($trimmed[0] === '[' && substr($trimmed, -1) === ']')) {
                json_decode($trimmed);
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $trimmed;
                }
            }
            return json_encode(['value' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        return json_encode(['value' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

if (!function_exists('getClientIpAddress')) {
    /**
     * Resolve actual client IP address behind reverse proxies and CDN.
     */
    function getClientIpAddress() {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        }
        return $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
    }
}

if (!function_exists('writeLog')) {
    /**
     * Global Audit Log Function (Writes to dbo.SYSTEM_LOGS)
     *
     * @param PDO         $pdo       Database Connection
     * @param string      $action    Action type (CREATE, UPDATE, DELETE, UNLOCK, LOGIN, RESET_PASSWORD)
     * @param string      $module    Module name (USER_MANAGE, SYSTEM_SETTINGS, PROFILE, PAINT_CHEM)
     * @param string|int  $refId     Primary Reference ID (e.g. item_id, user_id, report_id)
     * @param mixed|null  $oldData   State before mutation (Array, Object, or JSON)
     * @param mixed|null  $newData   State after mutation (Array, Object, or JSON)
     * @param string      $remark    Human-readable description or business rationale
     */
    function writeLog($pdo, $action, $module, $refId, $oldData = null, $newData = null, $remark = '') {
        try {
            $user = $_SESSION['user'] ?? $_SESSION['auth_user'] ?? $GLOBALS['currentUser'] ?? [];
            $userId = !empty($user['id']) ? (string)$user['id'] : (!empty($user['emp_id']) ? (string)$user['emp_id'] : 'SYSTEM');
            $username = !empty($user['username']) ? (string)$user['username'] : 'SYSTEM';
            $role = !empty($user['role']) ? (string)$user['role'] : 'system';

            $ip = getClientIpAddress();
            $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN', 0, 255);

            $oldJson = formatAuditData($oldData);
            $newJson = formatAuditData($newData);
            $refIdStr = (string)($refId ?? '0');
            $remarkStr = substr((string)$remark, 0, 255);

            $sql = "INSERT INTO dbo.SYSTEM_LOGS 
                    (user_id, username, role, action, module, ref_id, old_value, new_value, remark, ip_address, user_agent, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $userId,
                $username,
                $role,
                $action,
                $module,
                $refIdStr,
                $oldJson,
                $newJson,
                $remarkStr,
                $ip,
                $userAgent
            ]);
            return true;
        } catch (Throwable $e) {
            error_log("[AUDIT_LOG_ERROR] " . $e->getMessage());
            return false;
        }
    }
}

if (!function_exists('writeAuditLog')) {
    /**
     * Alias for writeLog adhering to naming standards.
     */
    function writeAuditLog($pdo, $action, $module, $refId, $oldData = null, $newData = null, $remark = '') {
        return writeLog($pdo, $action, $module, $refId, $oldData, $newData, $remark);
    }
}

if (!function_exists('writeErrorLog')) {
    /**
     * Global Error Log Function
     */
    function writeErrorLog($pdo, $module, $errorMessage, $payloadData = null) {
        try {
            $user = $_SESSION['user'] ?? $_SESSION['auth_user'] ?? $GLOBALS['currentUser'] ?? [];
            $userId = !empty($user['id']) ? (string)$user['id'] : 'SYSTEM';
            $username = !empty($user['username']) ? (string)$user['username'] : 'SYSTEM';
            $ip = getClientIpAddress();
            $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN', 0, 255);

            $payloadJson = formatAuditData($payloadData);
            $errRemark = substr((string)$errorMessage, 0, 255);

            $sql = "INSERT INTO dbo.SYSTEM_LOGS 
                    (user_id, username, role, action, module, ref_id, old_value, new_value, remark, ip_address, user_agent, created_at) 
                    VALUES (?, ?, 'system', 'SYSTEM_ERROR', ?, 'ERROR', ?, NULL, ?, ?, ?, GETDATE())";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $userId,
                $username,
                $module,
                $payloadJson,
                $errRemark,
                $ip,
                $userAgent
            ]);

            error_log("[$module] SYSTEM_ERROR: " . $errorMessage);
            return true;
        } catch (Throwable $e) {
            error_log("Failed to write Error Log: " . $e->getMessage());
            return false;
        }
    }
}

if (!function_exists('translateSqlErrorMessage')) {
    /**
     * Converts raw SQL Server/ODBC error messages into actionable Thai user guidance
     * while preserving genuine Thai business errors raised from application logic or SPs.
     */
    function translateSqlErrorMessage(string $fullErrorMessage): string {
        $clean = $fullErrorMessage;
        if (strpos($fullErrorMessage, '[SQL Server]') !== false) {
            $parts = explode('[SQL Server]', $fullErrorMessage);
            $clean = trim(end($parts));
        }
        $lower = strtolower($fullErrorMessage);

        if (strpos($lower, 'deadlock') !== false || strpos($lower, 'sqlstate[40001]') !== false) {
            return 'มีผู้ใช้งานอื่นกำลังทำรายการเดียวกันพร้อมกัน ระบบยกเลิกชั่วคราวเพื่อป้องกันข้อมูลชนกัน กรุณากดยืนยันใหม่อีกครั้ง';
        }
        if (strpos($lower, 'unique key') !== false || strpos($lower, 'primary key') !== false || strpos($lower, 'duplicate key') !== false) {
            return 'ข้อมูลซ้ำกับรายการที่มีอยู่ในระบบแล้ว กรุณาตรวจสอบรหัส/เลขที่เอกสารและลองใหม่อีกครั้ง';
        }
        if (strpos($lower, 'reference constraint') !== false || strpos($lower, 'foreign key') !== false) {
            return 'ไม่สามารถลบหรือแก้ไขข้อมูลนี้ได้ เนื่องจากถูกอ้างอิงใช้งานอยู่ในรายการอื่นแล้ว';
        }
        if (strpos($lower, 'sqlstate[22007]') !== false || strpos($lower, 'converting date') !== false || strpos($lower, 'out-of-range value') !== false) {
            return 'รูปแบบวันที่หรือเวลาไม่ถูกต้อง กรุณาระบุปี ค.ศ. 4 หลักที่ถูกต้อง (เช่น 2026)';
        }
        if (strpos($lower, 'sqlstate[22001]') !== false || strpos($lower, 'truncated') !== false) {
            return 'ข้อมูลที่กรอกยาวเกินขนาดที่ระบบรองรับ กรุณาย่อข้อความและลองใหม่อีกครั้ง';
        }
        // Keep deliberate Thai business errors (e.g. from Stored Procedure RAISERROR)
        if (preg_match('/[\x{0E00}-\x{0E7F}]/u', $clean)) {
            return $clean;
        }
        if (strpos($lower, 'sqlstate[') !== false || strpos($lower, '[sql server]') !== false || strpos($lower, 'odbc driver') !== false) {
            return 'ระบบฐานข้อมูลขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ';
        }
        return $clean;
    }
}

if (!function_exists('handleApiError')) {
    /**
     * Global API Error Handler
     */
    function handleApiError(Throwable $e, $pdo = null, $payload = null) {
        if ($pdo !== null && $pdo->inTransaction()) {
            $pdo->rollBack();
        }

        $fullErrorMessage = $e->getMessage();
        $displayMessage = translateSqlErrorMessage($fullErrorMessage);
        $httpCode = 400;

        if ($pdo !== null) {
            try {
                $user = $_SESSION['user'] ?? $_SESSION['auth_user'] ?? $GLOBALS['currentUser'] ?? [];
                $userId = !empty($user['id']) ? (string)$user['id'] : 'SYSTEM';
                $username = !empty($user['username']) ? (string)$user['username'] : 'SYSTEM';
                $role = !empty($user['role']) ? (string)$user['role'] : 'SYSTEM';
                $uri = $_SERVER['REQUEST_URI'] ?? 'Unknown URI';
                $payloadData = formatAuditData($payload);
                $moduleName = basename($_SERVER['PHP_SELF']);

                $logStmt = $pdo->prepare("
                    INSERT INTO dbo.SYSTEM_LOGS 
                    (user_id, username, role, action, module, ref_id, old_value, new_value, remark, ip_address, user_agent, created_at) 
                    VALUES (?, ?, ?, 'API_ERROR', ?, '500', ?, ?, ?, ?, ?, GETDATE())
                ");
                $logStmt->execute([
                    $userId,
                    $username,
                    $role,
                    $moduleName,
                    $payloadData,
                    $fullErrorMessage,
                    substr($uri, 0, 255),
                    getClientIpAddress(),
                    substr($_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN', 0, 255)
                ]);
            } catch (Throwable $logEx) {
                error_log("Failed to write to SYSTEM_LOGS: " . $logEx->getMessage() . " | Original Error: " . $fullErrorMessage);
            }
        }

        header('Content-Type: application/json; charset=utf-8');
        http_response_code($httpCode);
        echo json_encode([
            'success' => false,
            'data' => null,
            'message' => $displayMessage
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}