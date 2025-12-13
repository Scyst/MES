<?php
// ไฟล์: MES/page/management/api/planManage.php
// API สำหรับจัดการข้อมูล Production Plan

header('Content-Type: application/json');
ini_set('display_errors', 1); // แสดง Error (สำหรับ Debugging)
error_reporting(E_ALL);

// 1. Include dependencies
session_start();
require_once '../../../auth/check_auth.php'; // ตรวจสอบสิทธิ์
require_once '../../db.php'; // เชื่อมต่อฐานข้อมูล ($pdo) และ Config

// 2. ตรวจสอบสิทธิ์ (ปรับตาม Role ที่ต้องการ)
if (!hasRole(['admin', 'creator', 'planner'])) {
    http_response_code(403); // Forbidden
    echo json_encode(['success' => false, 'message' => 'คุณไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้']);
    exit;
}

// 3. กำหนดชื่อตารางจาก Config
if (!defined('PRODUCTION_PLANS_TABLE') || !defined('ITEMS_TABLE')) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Configuration Error: Table constants are not defined.']);
    exit;
}
$planTable = '[dbo].[' . PRODUCTION_PLANS_TABLE . ']';
$itemTable = '[dbo].[' . ITEMS_TABLE . ']';
$transTable = '[dbo].[' . TRANSACTIONS_TABLE . ']';
$locTable = '[dbo].[' . LOCATIONS_TABLE . ']';

// 4. อ่านข้อมูล Request (GET สำหรับดึง, POST สำหรับ CUD)
$method = $_SERVER['REQUEST_METHOD'];
$data = [];
$action = '';

if ($method === 'GET') {
    $data = $_GET;
    $action = $data['action'] ?? '';
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
}

if (empty($action)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'No action specified.']);
    exit;
}

// 5. เตรียมข้อมูล User
$currentUser = $_SESSION['username'] ?? 'system';

// 6. ประมวลผลตาม Action
try {
    switch ($action) {
        // ===================================
        // ACTION: get_plans
        // ===================================
        case 'get_plans':
            if ($method !== 'GET') {
                throw new Exception("Invalid request method for get_plans.");
            }

            $startDate = $data['startDate'] ?? null;
            $endDate = $data['endDate'] ?? null;
            $line = $data['line'] ?? null;
            $shift = $data['shift'] ?? null;

            $actualsSubQuery = "
                SELECT
                    CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) AS ActualDate,
                    l.production_line AS ActualLine,
                    CASE
                        WHEN DATEPART(hour, DATEADD(HOUR, -8, t.transaction_timestamp)) >= 0 AND DATEPART(hour, DATEADD(HOUR, -8, t.transaction_timestamp)) < 12 THEN 'DAY'
                        ELSE 'NIGHT'
                    END AS ActualShift,
                    t.parameter_id AS ActualItemId,
                    SUM(t.quantity) AS ActualQty
                FROM $transTable t
                INNER JOIN $locTable l ON t.to_location_id = l.location_id
                WHERE t.transaction_type = 'PRODUCTION_FG'
                GROUP BY
                    CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE),
                    l.production_line,
                    CASE
                        WHEN DATEPART(hour, DATEADD(HOUR, -8, t.transaction_timestamp)) >= 0 AND DATEPART(hour, DATEADD(HOUR, -8, t.transaction_timestamp)) < 12 THEN 'DAY'
                        ELSE 'NIGHT'
                    END,
                    t.parameter_id
            ";
            
            $sql = "
                SELECT
                    ISNULL(p.plan_id, 0) AS plan_id,
                    CONVERT(varchar, ISNULL(p.plan_date, actual.ActualDate), 23) as plan_date,
                    ISNULL(p.line, actual.ActualLine) AS line,
                    ISNULL(p.shift, actual.ActualShift) AS shift,
                    i.item_id,
                    i.sap_no,
                    i.part_no,
                    i.part_description,
                    ISNULL(i.StandardPrice, 0) AS std_price,      -- <== เพิ่ม
                    ISNULL(i.Cost_Total, 0) AS std_cost,          -- <== เพิ่ม
                    ISNULL(p.original_planned_quantity, 0) AS original_planned_quantity,
                    ISNULL(p.carry_over_quantity, 0) AS carry_over_quantity,
                    ISNULL(p.adjusted_planned_quantity, 0) AS adjusted_planned_quantity,
                    p.note,
                    ISNULL(actual.ActualQty, 0) AS actual_quantity
                
                FROM ($actualsSubQuery) AS actual
                FULL OUTER JOIN $planTable p ON 
                    p.plan_date = actual.ActualDate
                    AND p.line = actual.ActualLine
                    AND p.shift = actual.ActualShift
                    AND p.item_id = actual.ActualItemId
                JOIN $itemTable i ON i.item_id = ISNULL(p.item_id, actual.ActualItemId)
                WHERE 1=1 
            ";

            $params = [];

            if (!empty($startDate) && !empty($endDate)) {
                if (!preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $startDate) ||
                    !preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $endDate)) {
                    throw new Exception("Invalid date format. Use YYYY-MM-DD.");
                }
                if ($startDate > $endDate) {
                    throw new Exception("Start date cannot be after end date.");
                }
                $sql .= " AND ISNULL(p.plan_date, actual.ActualDate) BETWEEN :startDate AND :endDate";
                $params[':startDate'] = $startDate;
                $params[':endDate'] = $endDate;
            } elseif (!empty($startDate)) {
                if (!preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $startDate)) {
                    throw new Exception("Invalid start date format. Use YYYY-MM-DD.");
                }
                $sql .= " AND ISNULL(p.plan_date, actual.ActualDate) >= :startDate";
                $params[':startDate'] = $startDate;
            } elseif (!empty($endDate)) {
                if (!preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $endDate)) {
                    throw new Exception("Invalid end date format. Use YYYY-MM-DD.");
                }
                $sql .= " AND ISNULL(p.plan_date, actual.ActualDate) <= :endDate";
                $params[':endDate'] = $endDate;
            } else {
                $today = date('Y-m-d');
                $sql .= " AND ISNULL(p.plan_date, actual.ActualDate) = :today";
                $params[':today'] = $today;
            }

            if (!empty($line)) {
                $sql .= " AND ISNULL(p.line, actual.ActualLine) = :line";
                $params[':line'] = $line;
            }
            if (!empty($shift)) {
                $sql .= " AND ISNULL(p.shift, actual.ActualShift) = :shift";
                $params[':shift'] = $shift;
            }

            $sql .= " ORDER BY plan_date DESC, line, shift, i.sap_no";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $plans]);
            break;

        // ===================================
        // ACTION: save_plan (Handles Insert & Update)
        // ===================================
        case 'save_plan':
            if ($method !== 'POST') throw new Exception("Invalid request method for save_plan.");

            // Validate required fields
            $requiredFields = ['plan_date', 'line', 'shift', 'item_id', 'original_planned_quantity'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || ($field !== 'original_planned_quantity' && empty($data[$field]))) {
                     throw new Exception("Missing or empty required field: " . $field);
                }
                 // Allow 0 for quantity
                if ($field === 'original_planned_quantity' && !is_numeric($data[$field])) {
                     throw new Exception("Planned quantity must be a number.");
                }
            }

            $planId = isset($data['plan_id']) ? (int)$data['plan_id'] : 0;
            $planDate = $data['plan_date'];
            $line = $data['line'];
            $shift = $data['shift'];
            $itemId = (int)$data['item_id'];
            $originalQuantity = (float)$data['original_planned_quantity'];
            $note = $data['note'] ?? null;

             // Ensure item_id is valid before saving
             $itemCheckStmt = $pdo->prepare("SELECT COUNT(*) FROM $itemTable WHERE item_id = ?");
             $itemCheckStmt->execute([$itemId]);
             if ($itemCheckStmt->fetchColumn() == 0) {
                 throw new Exception("Invalid Item ID provided.");
             }


            if ($planId > 0) {
                // --- UPDATE ---
                // Note: We only update original_planned_quantity and note.
                // carry_over_quantity is updated by a separate process.
                $sql = "UPDATE $planTable SET
                            plan_date = :plan_date,
                            line = :line,
                            shift = :shift,
                            item_id = :item_id,
                            original_planned_quantity = :original_planned_quantity,
                            note = :note,
                            updated_at = GETDATE(), -- Let the trigger handle this ideally
                            updated_by = :updated_by
                        WHERE plan_id = :plan_id";
                $params = [
                    ':plan_date' => $planDate,
                    ':line' => $line,
                    ':shift' => $shift,
                    ':item_id' => $itemId,
                    ':original_planned_quantity' => $originalQuantity,
                    ':note' => $note,
                    ':updated_by' => $currentUser,
                    ':plan_id' => $planId
                ];
                $message = 'Production plan updated successfully.';

            } else {
                // --- INSERT ---
                // We only insert the original plan. Carry-over starts at 0.
                $sql = "INSERT INTO $planTable
                            (plan_date, line, shift, item_id, original_planned_quantity, note, updated_by)
                        VALUES
                            (:plan_date, :line, :shift, :item_id, :original_planned_quantity, :note, :updated_by)";
                 $params = [
                    ':plan_date' => $planDate,
                    ':line' => $line,
                    ':shift' => $shift,
                    ':item_id' => $itemId,
                    ':original_planned_quantity' => $originalQuantity,
                    ':note' => $note,
                    ':updated_by' => $currentUser
                ];
                $message = 'Production plan added successfully.';
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['success' => true, 'message' => $message]);
            break;

        // ===================================
        // ACTION: delete_plan
        // ===================================
        case 'delete_plan':
             if ($method !== 'POST') throw new Exception("Invalid request method for delete_plan.");

             $planId = isset($data['plan_id']) ? (int)$data['plan_id'] : 0;
             if ($planId <= 0) {
                 throw new Exception("Invalid Plan ID for deletion.");
             }

             $sql = "DELETE FROM $planTable WHERE plan_id = :plan_id";
             $stmt = $pdo->prepare($sql);
             $stmt->execute([':plan_id' => $planId]);

             $rowCount = $stmt->rowCount();
             if ($rowCount > 0) {
                echo json_encode(['success' => true, 'message' => 'Production plan deleted successfully.']);
             } else {
                 // Might happen if the ID doesn't exist or was already deleted
                 echo json_encode(['success' => false, 'message' => 'Plan not found or could not be deleted.']);
             }
             break;

        case 'update_carry_over':
            if ($method !== 'POST') throw new Exception("Invalid request method for update_carry_over.");

            $planId = isset($data['plan_id']) ? (int)$data['plan_id'] : 0;
            // ตรวจสอบว่าค่าที่ส่งมาเป็นตัวเลขหรือไม่ และไม่ติดลบ
            if (!isset($data['carry_over_quantity']) || !is_numeric($data['carry_over_quantity']) || $data['carry_over_quantity'] < 0) {
                 throw new Exception("Invalid or missing Carry Over Quantity provided. It must be a non-negative number.");
            }
             $newCarryOverQuantity = (float)$data['carry_over_quantity'];


            if ($planId <= 0) {
                throw new Exception("Invalid Plan ID for updating carry-over.");
            }

            // สร้าง SQL UPDATE เฉพาะคอลัมน์ carry_over_quantity และ updated_by
            // updated_at จะถูกอัปเดตโดย Trigger ที่เราสร้างไว้
            $sql = "UPDATE $planTable SET
                        carry_over_quantity = :carry_over_quantity,
                        updated_by = :updated_by
                    WHERE plan_id = :plan_id";

            $params = [
                ':carry_over_quantity' => $newCarryOverQuantity,
                ':updated_by' => $currentUser,
                ':plan_id' => $planId
            ];

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            if ($stmt->rowCount() > 0) {
                 echo json_encode(['success' => true, 'message' => 'Carry-over quantity updated successfully.']);
            } else {
                 // อาจจะหา plan_id ไม่เจอ
                 http_response_code(404); // Not Found
                 echo json_encode(['success' => false, 'message' => 'Plan not found or carry-over value was the same.']);
            }
            break;

        case 'calculate_carry_over':
            // ใช้ POST หรือ GET ก็ได้
            $endDate = $data['endDate'] ?? date('Y-m-d'); // วันสิ้นสุด (Default เป็นวันนี้)
            $startDate = $data['startDate'] ?? null;     // วันเริ่มต้น (Optional)

            // ตรวจสอบ Format endDate
            if (!preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $endDate)) {
                 throw new Exception("Invalid End Date format provided. Use YYYY-MM-DD.");
            }

            // --- หา StartDate อัตโนมัติ ถ้าไม่ได้ระบุมา ---
            if (empty($startDate)) {
                // หา plan_date แรกสุด ที่ carry_over ยังเป็น 0 และ adjusted_plan > 0 (แสดงว่ายังไม่เคยถูกคำนวณ หรือถูก Reset)
                // หรืออาจจะหา MAX(plan_date) ที่ updated_at เก่าที่สุด? --> ซับซ้อนและอาจไม่แม่นยำ
                // วิธีที่ง่ายกว่า: หา MIN(plan_date) ที่เก่าที่สุดที่อาจจะต้องคำนวณ
                // หรือ เริ่มจาก X วันก่อนหน้า endDate (เช่น 30 วัน) เพื่อความปลอดภัย
                // ลองเริ่มจาก 30 วันก่อนหน้า endDate ก่อน เพื่อความง่าย
                 $potentialStartDate = date('Y-m-d', strtotime('-30 days', strtotime($endDate)));

                 // หรือจะ Query หา MIN(plan_date) จริงๆ?
                 $minDateSql = "SELECT MIN(plan_date) FROM $planTable WHERE plan_date <= :endDate";
                 $minStmt = $pdo->prepare($minDateSql);
                 $minStmt->execute([':endDate' => $endDate]);
                 $minPlanDate = $minStmt->fetchColumn();

                 // ใช้ค่าที่ใหม่กว่าระหว่าง 30 วันก่อน หรือ วันแรกที่มีแผน
                 if ($minPlanDate && $minPlanDate > $potentialStartDate) {
                     $startDate = $minPlanDate;
                 } else {
                     $startDate = $potentialStartDate;
                 }
                 // อาจจะต้องมี Logic เพิ่มเติมเพื่อหา "วันที่ยังไม่ได้คำนวณ" จริงๆ
                 // แต่การเริ่มจาก 30 วันก่อน หรือวันแรกที่มีแผน น่าจะครอบคลุมกรณีส่วนใหญ่
                 // *** หมายเหตุ: การคำนวณย้อนหลังเยอะๆ อาจใช้เวลา ***
            } else {
                 // ตรวจสอบ Format startDate ถ้าส่งมา
                 if (!preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $startDate)) {
                      throw new Exception("Invalid Start Date format provided. Use YYYY-MM-DD.");
                 }
                 if ($startDate > $endDate) {
                     throw new Exception("StartDate cannot be after EndDate.");
                 }
            }


            // เลือก Stored Procedure ตาม Environment
            $spName = IS_DEVELOPMENT
                        ? '[dbo].[sp_UpdatePlanCarryOver_TEST]'
                        : '[dbo].[sp_UpdatePlanCarryOver]';

            // เตรียมและ Execute Stored Procedure
            $stmt = $pdo->prepare("EXEC {$spName} @StartDate = ?, @EndDate = ?"); // ส่ง Parameter 2 ตัว
            $stmt->bindParam(1, $startDate, PDO::PARAM_STR);
            $stmt->bindParam(2, $endDate, PDO::PARAM_STR);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Carry-over calculation triggered successfully from ' . $startDate . ' to ' . $endDate
            ]);
            break;

        case 'import_plans_bulk':
            if ($method !== 'POST') throw new Exception("Invalid method");
            
            $plans = $data['plans'] ?? [];
            if (empty($plans)) throw new Exception("No data to import");

            $pdo->beginTransaction();
            try {
                // เตรียม Statement เช็ค Item
                $checkItem = $pdo->prepare("SELECT item_id FROM $itemTable WHERE sap_no = ? OR part_no = ?");
                
                // เตรียม Statement บันทึก Plan (ใช้ MERGE เพื่อ Insert หรือ Update ถ้ามีอยู่แล้ว)
                $sqlMerge = "
                    MERGE INTO $planTable AS T
                    USING (VALUES (:plan_date, :line, :shift, :item_id, :qty, :user)) 
                    AS S (plan_date, line, shift, item_id, qty, user_Update)
                    ON (T.plan_date = S.plan_date AND T.line = S.line AND T.shift = S.shift AND T.item_id = S.item_id)
                    WHEN MATCHED THEN
                        UPDATE SET original_planned_quantity = S.qty, updated_by = S.user_Update, updated_at = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (plan_date, line, shift, item_id, original_planned_quantity, updated_by)
                        VALUES (S.plan_date, S.line, S.shift, S.item_id, S.qty, S.user_Update);
                ";
                $stmtMerge = $pdo->prepare($sqlMerge);

                $count = 0;
                foreach ($plans as $row) {
                    // 1. หา Item ID จาก SAP หรือ Part No
                    $checkItem->execute([$row['item_code'], $row['item_code']]);
                    $itemId = $checkItem->fetchColumn();
                    
                    if ($itemId) {
                        // 2. บันทึกลง DB
                        $stmtMerge->execute([
                            ':plan_date' => $row['date'],
                            ':line' => $row['line'],
                            ':shift' => $row['shift'],
                            ':item_id' => $itemId,
                            ':qty' => floatval($row['qty']),
                            ':user' => $currentUser
                        ]);
                        $count++;
                    }
                }
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "Imported $count plans successfully."]);
            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex;
            }
            break;

        case 'calc_dlot_auto':
            $entry_date = $data['entry_date'];
            $line = isset($data['line']) ? $data['line'] : 'ALL';

            if (empty($entry_date)) throw new Exception("Entry date is required.");

            // 1. กำหนดตัวแปรค่าแรง (สมมติ) - ในระบบจริงควรดึงจาก Config หรือ Table Wage
            $standard_daily_wage = 450; // ค่าแรงขั้นต่ำต่อวัน (8 ชม.)
            $ot_hourly_rate = 85;       // ค่า OT ต่อชั่วโมง (1.5 เท่า)

            // 2. Query ดึงยอดคนและชั่วโมง OT จากตาราง MANPOWER
            // (Join ระหว่าง Logs, Employees และ Shifts เพื่อคำนวณเวลา)
            $sql = "
                SELECT 
                    COUNT(DISTINCT l.emp_id) AS total_headcount,
                    SUM(
                        CASE 
                            WHEN l.scan_out_time IS NOT NULL AND s.end_time IS NOT NULL THEN
                                -- คำนวณ OT: ถ้า Scan Out หลัง Shift End เกิน 30 นาที
                                CASE 
                                    WHEN DATEDIFF(MINUTE, CAST(CONCAT(l.log_date, ' ', s.end_time) AS DATETIME), l.scan_out_time) > 30 
                                    THEN DATEDIFF(MINUTE, CAST(CONCAT(l.log_date, ' ', s.end_time) AS DATETIME), l.scan_out_time) / 60.0
                                    ELSE 0 
                                END
                            ELSE 0
                        END
                    ) AS total_ot_hours
                FROM " . MANPOWER_DAILY_LOGS_TABLE . " l
                JOIN " . MANPOWER_EMPLOYEES_TABLE . " e ON l.emp_id = e.emp_id
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " s ON e.default_shift_id = s.shift_id
                WHERE l.log_date = :log_date
                  AND l.status IN ('PRESENT', 'LATE') -- นับเฉพาะคนที่มา
                  AND (:line = 'ALL' OR e.line = :line)
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([':log_date' => $entry_date, ':line' => $line]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $headcount = (int)($result['total_headcount'] ?? 0);
            $ot_hours = (float)($result['total_ot_hours'] ?? 0);

            // 3. คำนวณเป็นตัวเงิน
            $dl_cost = $headcount * $standard_daily_wage;
            $ot_cost = $ot_hours * $ot_hourly_rate;

            echo json_encode([
                'success' => true,
                'data' => [
                    'headcount' => $headcount,
                    'dl_cost' => round($dl_cost, 2),
                    'ot_cost' => round($ot_cost, 2),
                    'ot_hours' => round($ot_hours, 1) // ส่งกลับไปเผื่อ debug
                ],
                'message' => "Calculated from $headcount employees."
            ]);
            break;

        default:
            http_response_code(400); // Bad Request
            echo json_encode(['success' => false, 'message' => 'Invalid action specified.']);
            break;
    }

} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    error_log("Database Error in planManage.php: Action '{$action}' - " . $e->getMessage()); // Log detailed error
    echo json_encode(['success' => false, 'message' => 'A database error occurred. Please check logs.']); // Generic message to user
} catch (Exception $e) {
    http_response_code(400); // Bad Request (usually for validation errors) or 500 for others
    error_log("General Error in planManage.php: Action '{$action}' - " . $e->getMessage()); // Log detailed error
    echo json_encode(['success' => false, 'message' => $e->getMessage()]); // Show specific error message (can be refined)
}

?>