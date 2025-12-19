<?php
// MES/page/manpower/api/clear_daily_manpower.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// อันตราย! ให้เฉพาะ Admin / Creator เท่านั้น
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$date = $input['date'] ?? '';
$line = $input['line'] ?? ''; // ถ้าส่งมาจะลบเฉพาะ Line นั้น ถ้าไม่ส่งจะลบทั้งหมดของวันนั้น

if (empty($date)) {
    echo json_encode(['success' => false, 'message' => 'Date is required']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. สร้างเงื่อนไขการลบ
    $sqlDeleteLog = "DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_date = ?";
    $params = [$date];

    // ถ้าระบุ Line มาด้วย ให้ Join ไปเช็ค Line ในตารางพนักงาน
    if (!empty($line) && $line !== 'ALL') {
        // SQL Server Syntax สำหรับ Delete แบบ Join
        $sqlDeleteLog = "
            DELETE L
            FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
            INNER JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
            WHERE L.log_date = ? AND E.line = ?
        ";
        $params[] = $line;
    }

    $stmt = $pdo->prepare($sqlDeleteLog);
    $stmt->execute($params);
    $deletedRows = $stmt->rowCount();

    // 2. ลบข้อมูลยอดเงิน (Cost) ด้วย เพื่อให้คำนวณใหม่
    // (Cost เก็บแยกบรรทัดตาม Line อยู่แล้ว ลบง่าย)
    $sqlDeleteCost = "DELETE FROM " . MANUAL_COSTS_TABLE . " WHERE entry_date = ?";
    $costParams = [$date];
    
    if (!empty($line) && $line !== 'ALL') {
        $sqlDeleteCost .= " AND line = ?";
        $costParams[] = $line;
    }
    
    $stmtCost = $pdo->prepare($sqlDeleteCost);
    $stmtCost->execute($costParams);

    $pdo->commit();

    echo json_encode([
        'success' => true, 
        'message' => "ล้างข้อมูลวันที่ $date เรียบร้อยแล้ว ($deletedRows รายการ)",
        'deleted' => $deletedRows
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>