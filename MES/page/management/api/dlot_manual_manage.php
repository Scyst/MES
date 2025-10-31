<?php
// (c) 2024-2025 MES | Dlot Manual Management API
// Author: MES (Your Assistant)
// Version: 1.1 (Corrected variable names and response format)

header('Content-Type: application/json');
ini_set('display_errors', 1); // แสดง Error (สำหรับ Debugging เท่านั้น, ปิดบน Production)
error_reporting(E_ALL);

// 1. เชื่อมต่อฐานข้อมูลและ Session
session_start();
require_once '../../../auth/check_auth.php'; // ตรวจสอบสิทธิ์และ Session
require_once '../../db.php'; // ไฟล์เชื่อมต่อฐานข้อมูล (ซึ่งจะ require config.php และสร้าง $pdo)

// 2. กำหนดตารางที่จะใช้งาน (จาก config.php)
// ตรวจสอบก่อนว่า Constant ถูก define ไว้จริงหรือไม่ (เผื่อกรณีไฟล์ config มีปัญหา)
if (!defined('MANUAL_COSTS_TABLE')) {
    echo json_encode(['success' => false, 'message' => 'Configuration Error: MANUAL_COSTS_TABLE is not defined.']);
    exit;
}
$tableName = '[dbo].[' . MANUAL_COSTS_TABLE . ']';

// 3. ตรวจสอบผู้ใช้งาน (สำหรับบันทึก updated_by)
$updated_by = isset($_SESSION['username']) ? $_SESSION['username'] : 'system';

// 4. อ่านข้อมูลที่ส่งมา (GET หรือ POST)
$method = $_SERVER['REQUEST_METHOD'];
$data = [];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
} elseif ($method === 'GET') {
    $data = $_GET; // สำหรับ Cost Summary
}

if (empty($data) || !isset($data['action'])) {
    // แก้ไข: ใช้ 'success' => false
    echo json_encode(['success' => false, 'message' => 'No action or data received.']);
    exit;
}

$action = $data['action'];

try {
    // 5. แยกการทำงานตาม 'action'
    switch ($action) {

        // ==========================================================
        // ACTION: 'get_daily_costs'
        // หน้าที่: ดึงข้อมูลที่เคยกรอกไว้ของวันที่เลือก
        // ==========================================================
        case 'get_daily_costs':
            $entry_date = $data['entry_date'];
            $line = isset($data['line']) ? $data['line'] : 'ALL';

            // ใช้ PIVOT Query เพื่อ 'หมุน' ข้อมูล EAV 3 แถว กลับมาเป็น 1 Object
            $sql_get = "
                SELECT
                    MAX(CASE WHEN cost_type = 'HEAD_COUNT' THEN cost_value ELSE 0 END) AS headcount,
                    MAX(CASE WHEN cost_type = 'DIRECT_LABOR' THEN cost_value ELSE 0 END) AS dl_cost,
                    MAX(CASE WHEN cost_type = 'OVERTIME' THEN cost_value ELSE 0 END) AS ot_cost
                FROM
                    $tableName
                WHERE
                    entry_date = ? AND line = ? AND cost_category = 'LABOR'
            ";

            // แก้ไข: ใช้ $pdo
            $stmt_get = $pdo->prepare($sql_get);
            $stmt_get->execute([$entry_date, $line]);
            $result = $stmt_get->fetch(PDO::FETCH_ASSOC);

            // แก้ไข: ใช้ 'success' => true
            echo json_encode(['success' => true, 'data' => $result ?: []]); // ส่ง object ว่าง ถ้าไม่เจอข้อมูล
            break;

        // ==========================================================
        // ACTION: 'save_daily_costs'
        // หน้าที่: บันทึก (Insert หรือ Update) ข้อมูล 3 รายการ
        // ==========================================================
        case 'save_daily_costs':
            $entry_date = $data['entry_date'];
            $line = isset($data['line']) ? $data['line'] : 'ALL';
            $headcount = isset($data['headcount']) ? (float)$data['headcount'] : 0;
            $dl_cost = isset($data['dl_cost']) ? (float)$data['dl_cost'] : 0;
            $ot_cost = isset($data['ot_cost']) ? (float)$data['ot_cost'] : 0;

            // ตรวจสอบค่าเบื้องต้น
            if (empty($entry_date)) {
                 throw new Exception("Entry date is required.");
            }

            // เตรียมข้อมูล 3 แถว (EAV) ที่จะบันทึก
            $costs_to_save = [
                ['LABOR', 'HEAD_COUNT', $headcount, 'People'],
                ['LABOR', 'DIRECT_LABOR', $dl_cost, 'THB'],
                ['LABOR', 'OVERTIME', $ot_cost, 'THB']
            ];

            // ใช้ SQL 'MERGE'
            $sql_merge = "
                MERGE INTO $tableName AS T
                USING (VALUES (?, ?, ?, ?, ?, ?))
                      AS S (entry_date, line, cost_category, cost_type, cost_value, unit)
                ON (T.entry_date = S.entry_date AND T.line = S.line AND T.cost_type = S.cost_type)

                WHEN MATCHED THEN
                    UPDATE SET
                        T.cost_value = S.cost_value,
                        T.unit = S.unit,
                        T.updated_at = GETDATE(),
                        T.updated_by = ?

                WHEN NOT MATCHED BY TARGET THEN
                    INSERT (entry_date, line, cost_category, cost_type, cost_value, unit, updated_by)
                    VALUES (S.entry_date, S.line, S.cost_category, S.cost_type, S.cost_value, S.unit, ?);
            ";

            // แก้ไข: ใช้ $pdo
            $stmt_merge = $pdo->prepare($sql_merge);

            // เริ่ม Transaction
            // แก้ไข: ใช้ $pdo
            $pdo->beginTransaction();

            // วนลูปบันทึกข้อมูล 3 รอบ
            foreach ($costs_to_save as $cost_item) {
                list($category, $type, $value, $unit) = $cost_item;

                $stmt_merge->execute([
                    $entry_date,
                    $line,
                    $category,
                    $type,
                    $value,
                    $unit,
                    $updated_by, // สำหรับ WHEN MATCHED
                    $updated_by  // สำหรับ WHEN NOT MATCHED
                ]);
            }

            // ถ้าสำเร็จทั้งหมด
            // แก้ไข: ใช้ $pdo
            $pdo->commit();

            // แก้ไข: ใช้ 'success' => true
            echo json_encode(['success' => true, 'message' => 'บันทึกข้อมูลต้นทุนจริงสำเร็จ']);
            break;

        // ==========================================================
        // ACTION: 'get_cost_summary'
        // หน้าที่: ดึงข้อมูลสรุป Standard DL และ Actual DLOT
        // ==========================================================
        case 'get_cost_summary':
            $startDate = $data['startDate'];
            $endDate = $data['endDate'];
            $line = isset($data['line']) && $data['line'] !== 'ALL' ? $data['line'] : null; // SP รับ NULL

            // ตรวจสอบค่าวันที่เบื้องต้น
             if (empty($startDate) || empty($endDate)) {
                 throw new Exception("Start date and end date are required for summary.");
             }

            // ตรวจสอบ Constant ของ SP
            if (!defined('SP_CALC_STD_COST') || !defined('SP_CALC_ACTUAL_COST')) {
                 echo json_encode(['success' => false, 'message' => 'Configuration Error: Stored Procedure constants are not defined.']);
                 exit;
             }

            $response = [
                'standard' => null,
                'actual' => null
            ];

            // 1. Get Standard Cost (from OEE_Dashboard SP)
            // แก้ไข: ใช้ Constant ใหม่ และ $pdo
            $sp_std = '[dbo].[' . SP_CALC_STD_COST . ']';
            $stmt_std = $pdo->prepare("EXEC $sp_std @StartDate = ?, @EndDate = ?, @Line = ?, @Model = NULL");
            $stmt_std->execute([$startDate, $endDate, $line]);
            $response['standard'] = $stmt_std->fetch(PDO::FETCH_ASSOC);
            $stmt_std->closeCursor(); // ปิด cursor เสมอเมื่อเรียก SP

            // 2. Get Actual Cost (from our new SP)
            // แก้ไข: ใช้ Constant ใหม่ และ $pdo
            $sp_actual = '[dbo].[' . SP_CALC_ACTUAL_COST . ']';
            $stmt_actual = $pdo->prepare("EXEC $sp_actual @StartDate = ?, @EndDate = ?, @Line = ?");
            $stmt_actual->execute([$startDate, $endDate, $line]);
            $response['actual'] = $stmt_actual->fetch(PDO::FETCH_ASSOC);
            $stmt_actual->closeCursor(); // ปิด cursor

            // แก้ไข: ใช้ 'success' => true
            echo json_encode(['success' => true, 'data' => $response]);
            break;

        case 'get_dlot_dates':
            if ($method !== 'GET') {
                throw new Exception("Invalid request method for get_dlot_dates.");
            }
            
            $startDate = $data['startDate'] ?? null;
            $endDate = $data['endDate'] ?? null;
            $line = isset($data['line']) && $data['line'] !== 'ALL' ? $data['line'] : 'ALL'; 

            if (empty($startDate) || empty($endDate)) {
                 throw new Exception("Start date and end date are required for dlot dates.");
            }

            $sql_get_dates = "
                SELECT DISTINCT
                    CONVERT(varchar, entry_date, 23) as entry_date
                FROM
                    $tableName
                WHERE
                    entry_date BETWEEN ? AND ?
                    AND line = ?
                    AND cost_category = 'LABOR'
                    AND cost_type IN ('DIRECT_LABOR', 'OVERTIME')
                    AND cost_value > 0
            ";
            
            $stmt_get_dates = $pdo->prepare($sql_get_dates);
            $stmt_get_dates->execute([$startDate, $endDate, $line]);
            
            $dates = $stmt_get_dates->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode(['success' => true, 'data' => $dates ?: []]);
            break;

        default:
            // แก้ไข: ใช้ 'success' => false
            echo json_encode(['success' => false, 'message' => 'Invalid action specified.']);
            break;
    }

} catch (PDOException $e) {
    // ถ้าระหว่าง Transaction เกิด Error ให้ Rollback
    // แก้ไข: ใช้ $pdo
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // แก้ไข: ใช้ 'success' => false
    // แสดง Error ที่ละเอียดขึ้น (สำหรับ Debugging)
    echo json_encode(['success' => false, 'message' => 'Database Error: ' . $e->getMessage(), 'trace' => $e->getTraceAsString()]);
} catch (Exception $e) {
    // แก้ไข: ใช้ 'success' => false
    echo json_encode(['success' => false, 'message' => 'General Error: ' . $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}

?>