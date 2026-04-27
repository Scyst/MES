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
        // 1. เตรียมข้อมูล Context อัตโนมัติ (ไม่ต้องส่งมาให้เสียเวลา)
        $userId = $_SESSION['user']['id'] ?? 'SYSTEM'; // หรือ username แล้วแต่ระบบคุณ
        $username = $_SESSION['user']['username'] ?? 'SYSTEM';
        $role = $_SESSION['user']['role'] ?? 'system';
        
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN';

        // 2. แปลง Array ข้อมูลให้เป็น JSON String (นี่คือจุดที่ทำให้รองรับทุกโครงสร้าง!)
        // JSON_UNESCAPED_UNICODE เพื่อให้อ่านภาษาไทยรู้เรื่องใน Database
        $oldJson = $oldData ? json_encode($oldData, JSON_UNESCAPED_UNICODE) : null;
        $newJson = $newData ? json_encode($newData, JSON_UNESCAPED_UNICODE) : null;

        // 3. ยิง SQL ลงตาราง SYSTEM_LOGS
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
        // Silent Fail: ถ้า Log พัง อย่าให้ระบบหลักพังตาม
        // อาจจะเขียนลง Text File สำรองไว้ถ้าระบบซีเรียสมาก
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
        
        // เขียนลง PHP Error Log ด้วยเผื่อกรณี Database ล่ม (Hard Crash)
        error_log("[$module] SYSTEM_ERROR: " . $errorMessage);

    } catch (Exception $e) {
        error_log("Failed to write Error Log: " . $e->getMessage());
    }
}
?>