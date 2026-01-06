<?php
// แก้ไข Path ให้ตรงกับโครงสร้างจริง
include_once("../../../auth/check_auth.php"); // MES/auth/check_auth.php
include_once("../../db.php");               // MES/page/db.php
include_once("../../../config/config.php");   // MES/config/config.php

header('Content-Type: application/json');

if (!hasRole(['admin', 'creator', 'planner'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true) ?? [];

$planTable = PRODUCTION_PLANS_TABLE;
// Subquery สำหรับดึงยอด Actual
$actualsSubQuery = "SELECT ActualDate, ActualLine, ActualShift, ActualItemId, SUM(ActualQty) as ActualQty FROM (
    SELECT 
        CAST(DATEADD(HOUR, -8, transaction_timestamp) AS DATE) AS ActualDate,
        l.production_line AS ActualLine,
        CASE WHEN DATEPART(HOUR, DATEADD(HOUR, -8, transaction_timestamp)) < 12 THEN 'DAY' ELSE 'NIGHT' END AS ActualShift,
        parameter_id AS ActualItemId,
        quantity AS ActualQty
    FROM " . TRANSACTIONS_TABLE . " t
    JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
    WHERE t.transaction_type = 'PRODUCTION_FG'
) sub GROUP BY ActualDate, ActualLine, ActualShift, ActualItemId";
$itemTable = ITEMS_TABLE;

try {
    switch ($action) {
        case 'get_plans':
            // 1. รับค่า Pagination Params
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = ($page - 1) * $limit;

            $startDate = $_GET['startDate'] ?? date('Y-m-d');
            $endDate = $_GET['endDate'] ?? date('Y-m-d');
            $line = $_GET['line'] ?? null;
            $shift = $_GET['shift'] ?? null;

            $params = [];
            // Base Where Clause
            $whereClause = " AND (p.plan_date BETWEEN :start AND :end OR actual.ActualDate BETWEEN :start2 AND :end2)";
            $params[':start'] = $startDate;
            $params[':end'] = $endDate;
            $params[':start2'] = $startDate;
            $params[':end2'] = $endDate;

            if ($line) {
                $whereClause .= " AND (p.line = :line OR actual.ActualLine = :line2)";
                $params[':line'] = $line;
                $params[':line2'] = $line;
            }
            if ($shift) {
                $whereClause .= " AND (p.shift = :shift OR actual.ActualShift = :shift2)";
                $params[':shift'] = $shift;
                $params[':shift2'] = $shift;
            }

            // 1. [NEW] Summary Query (คำนวณยอดรวมของ Plan ทั้งหมดในช่วงที่เลือก)
            // เราจะคำนวณจากแผน (Plan) เป็นหลัก เพื่อดู Budget ของแผน
            $summarySql = "
                SELECT 
                    SUM(ISNULL(p.adjusted_planned_quantity, 0) * ISNULL(i.Cost_Total, 0)) as total_plan_cost,
                    SUM(ISNULL(p.adjusted_planned_quantity, 0) * ISNULL(i.Price_USD, 0)) as total_plan_sale_usd,
                    SUM(ISNULL(p.adjusted_planned_quantity, 0) * ISNULL(i.StandardPrice, 0)) as total_plan_sale_thb
                FROM $planTable p
                JOIN $itemTable i ON p.item_id = i.item_id
                WHERE p.plan_date BETWEEN :start AND :end
            ";
            
            $summaryParams = [':start' => $startDate, ':end' => $endDate];
            if ($line) {
                $summarySql .= " AND p.line = :line";
                $summaryParams[':line'] = $line;
            }
            if ($shift) {
                $summarySql .= " AND p.shift = :shift";
                $summaryParams[':shift'] = $shift;
            }

            $stmtSum = $pdo->prepare($summarySql);
            $stmtSum->execute($summaryParams);
            $summaryData = $stmtSum->fetch(PDO::FETCH_ASSOC);

            // 2. Base Query (ใช้ร่วมกันทั้ง Count และ Data)
            $baseQuery = "
                FROM ($actualsSubQuery) AS actual
                FULL OUTER JOIN $planTable p ON 
                    p.plan_date = actual.ActualDate
                    AND p.line = actual.ActualLine
                    AND p.shift = actual.ActualShift
                    AND p.item_id = actual.ActualItemId
                JOIN $itemTable i ON i.item_id = ISNULL(p.item_id, actual.ActualItemId)
                WHERE 1=1 $whereClause
            ";

            // 3. Count Query (นับจำนวนทั้งหมดก่อน)
            $countSql = "SELECT COUNT(*) " . $baseQuery;
            $stmtCount = $pdo->prepare($countSql);
            $stmtCount->execute($params);
            $totalRecords = $stmtCount->fetchColumn();
            
            // คำนวณจำนวนหน้า
            $totalPages = ($limit > 0) ? ceil($totalRecords / $limit) : 1;

            // 4. Data Query (เพิ่ม standard_price)
            $dataSql = "
                SELECT
                    ISNULL(p.plan_id, 0) AS plan_id,
                    CONVERT(varchar, ISNULL(p.plan_date, actual.ActualDate), 23) as plan_date,
                    ISNULL(p.line, actual.ActualLine) AS line,
                    ISNULL(p.shift, actual.ActualShift) AS shift,
                    i.item_id,
                    i.sap_no,
                    i.part_no,
                    i.part_description,
                    ISNULL(i.Price_USD, 0) AS price_usd,
                    ISNULL(i.StandardPrice, 0) AS standard_price, 
                    ISNULL(i.Cost_Total, 0) AS cost_total,
                    (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0)) AS cost_rm,
                    ISNULL(i.Cost_DL, 0) AS cost_dl,
                    (ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + 
                     ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)) AS cost_oh,
                    ISNULL(p.original_planned_quantity, 0) AS original_planned_quantity,
                    ISNULL(p.carry_over_quantity, 0) AS carry_over_quantity,
                    ISNULL(p.adjusted_planned_quantity, 0) AS adjusted_planned_quantity,
                    p.note,
                    ISNULL(p.manpower_num, 0) AS manpower_num,
                    ISNULL(p.ot_hours, 0) AS ot_hours,
                    ISNULL(p.total_labor_cost, 0) AS total_labor_cost,
                    p.updated_at,
                    ISNULL(actual.ActualQty, 0) AS actual_quantity
                " . $baseQuery . "
                ORDER BY plan_date DESC, line, shift
            ";

            // เพิ่ม Pagination Logic (เฉพาะเมื่อ limit ไม่ใช่ -1)
            if ($limit > 0) {
                $dataSql .= " OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY";
                $params[':offset'] = $offset;
                $params[':limit'] = $limit;
            }

            $stmt = $pdo->prepare($dataSql);
            // Bind Params ที่อาจเพิ่มขึ้นมา (offset, limit ต้อง bind เป็น INT)
            foreach ($params as $key => $val) {
                if ($key === ':offset' || $key === ':limit') {
                    $stmt->bindValue($key, $val, PDO::PARAM_INT);
                } else {
                    $stmt->bindValue($key, $val);
                }
            }
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 5. ส่งคืนผลลัพธ์พร้อม Pagination Metadata และ Summary
            echo json_encode([
                'success' => true, 
                'data' => $result,
                'summary' => $summaryData, // [NEW] ส่งค่า Summary กลับไป
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_records' => $totalRecords,
                    'limit' => $limit
                ]
            ]);
            break;

        case 'save_plan':
            if ($method !== 'POST') throw new Exception("Invalid method");
            
            $plan_id = $data['plan_id'] ?? 0;
            $plan_date = $data['plan_date'];
            $line = $data['line'];
            $shift = $data['shift'];
            $item_id = $data['item_id'];
            $qty = $data['original_planned_quantity'];
            $note = $data['note'] ?? null;
            $currentUser = $_SESSION['user']['username'] ?? 'System';
            $carry_over = isset($data['carry_over_quantity']) ? floatval($data['carry_over_quantity']) : 0;

            if ($plan_id != 0) {
                // --- UPDATE Logic (เหมือนเดิม) ---
                $sql = "UPDATE $planTable SET 
                            original_planned_quantity = :qty, 
                            note = :note, 
                            updated_by = :user, 
                            updated_at = GETDATE() 
                        WHERE plan_id = :id";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':qty' => $qty, 
                    ':note' => $note, 
                    ':user' => $currentUser, 
                    ':id' => $plan_id
                ]);
            } else {
                // --- INSERT Logic (แก้ใหม่ให้บันทึก Carry Over ได้) ---
                $sql = "INSERT INTO $planTable (
                            plan_date, line, shift, item_id, 
                            original_planned_quantity, 
                            carry_over_quantity, /* ★ เพิ่ม Column นี้ */
                            note, updated_by
                        ) VALUES (
                            :date, :line, :shift, :item, 
                            :qty, 
                            :co, /* ★ เพิ่ม Value นี้ */
                            :note, :user
                        )";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':date' => $plan_date, 
                    ':line' => $line, 
                    ':shift' => $shift, 
                    ':item' => $item_id, 
                    ':qty' => $qty, 
                    ':co' => $carry_over, // ★ ส่งค่า C/O ไปบันทึก
                    ':note' => $note, 
                    ':user' => $currentUser
                ]);
            }
            echo json_encode(['success' => true, 'message' => 'Plan saved successfully']);
            break;

        case 'delete_plan':
            if ($method !== 'POST') throw new Exception("Invalid method");
            $plan_id = $data['plan_id'];
            $stmt = $pdo->prepare("DELETE FROM $planTable WHERE plan_id = ?");
            $stmt->execute([$plan_id]);
            echo json_encode(['success' => true, 'message' => 'Plan deleted']);
            break;

        case 'calculate_carry_over':
            try {
                // กำหนดช่วงเวลา (-30 วัน ถึง +30 วัน)
                $startDate = date('Y-m-d', strtotime('-7 days'));
                $endDate   = date('Y-m-d', strtotime('+30 days')); 
                
                // ตรวจสอบว่ามี Constant นี้หรือยัง (กันพลาด)
                if (!defined('SP_UPDATE_CARRYOVER')) {
                    throw new Exception("Config Error: SP_UPDATE_CARRYOVER is not defined.");
                }

                $spName = SP_UPDATE_CARRYOVER;
                
                // เรียก Stored Procedure
                $sql = "EXEC $spName @StartDate = :start, @EndDate = :end";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':start' => $startDate,
                    ':end' => $endDate
                ]);
                
                echo json_encode([
                    'success' => true, 
                    'message' => "Carry Over updated successfully (Range: -30 to +30 days)"
                ]);

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Calculation Error: ' . $e->getMessage()
                ]);
            }
            break;

        case 'import_plans_bulk':
            if ($method !== 'POST') throw new Exception("Invalid method");
            
            $plans = $data['plans'] ?? [];
            if (empty($plans)) throw new Exception("No data to import");

            $pdo->beginTransaction();
            try {
                // 1. เตรียม Query ค้นหา
                // Logic A: หาจาก SAP No. (แม่นยำ 100% เพราะไม่ซ้ำ)
                $sqlFindSAP = "SELECT TOP 1 item_id FROM $itemTable WHERE sap_no = :code";
                $stmtFindSAP = $pdo->prepare($sqlFindSAP);

                // Logic B: หาจาก Part No. + Line (กรองเฉพาะ Process ของ Line นี้)
                // ต้อง Join กับ Manufacturing Routes เพื่อดูว่าสินค้านี้ผลิตที่ Line ไหน
                $routesTable = ROUTES_TABLE; // ดึงชื่อตารางจาก config (MANUFACTURING_ROUTES)
                $sqlFindPart = "
                    SELECT TOP 1 i.item_id 
                    FROM $itemTable i
                    JOIN $routesTable r ON i.item_id = r.item_id
                    WHERE i.part_no = :code AND r.line = :line
                ";
                $stmtFindPart = $pdo->prepare($sqlFindPart);
                
                // Logic C: (สำรอง) ถ้าไม่มี Route ให้หา Part No. เฉยๆ (เสี่ยงหน่อยแต่ดีกว่าไม่เจอ)
                $sqlFindPartFallback = "SELECT TOP 1 item_id FROM $itemTable WHERE part_no = :code";
                $stmtFindPartFallback = $pdo->prepare($sqlFindPartFallback);

                // SQL Merge (เหมือนเดิม)
                $sqlMerge = "
                    MERGE INTO $planTable AS T
                    USING (VALUES (:plan_date, :line, :shift, :item_id, :qty, :user)) 
                    AS S (plan_date, line, shift, item_id, qty, user_Update)
                    ON (T.plan_date = S.plan_date AND T.line = S.line AND T.shift = S.shift AND T.item_id = S.item_id)
                    WHEN MATCHED THEN
                        UPDATE SET original_planned_quantity = S.qty, updated_by = S.user_Update, updated_at = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (plan_date, line, shift, item_id, original_planned_quantity, carry_over_quantity, updated_by)
                        VALUES (S.plan_date, S.line, S.shift, S.item_id, S.qty, 0, S.user_Update);
                ";
                $stmtMerge = $pdo->prepare($sqlMerge);
                
                $currentUser = $_SESSION['user']['username'] ?? 'System';
                $count = 0;
                $errors = [];

                foreach ($plans as $index => $row) {
                    $itemCode = trim($row['item_code']);
                    $targetLine = $row['line']; // Line ที่ user เลือกมา
                    $itemId = null;

                    // Step 1: ลองหาด้วย SAP No.
                    $stmtFindSAP->execute([':code' => $itemCode]);
                    $itemId = $stmtFindSAP->fetchColumn();

                    // Step 2: ถ้าไม่เจอ SAP ให้หาด้วย Part No. + Line
                    if (!$itemId) {
                        $stmtFindPart->execute([':code' => $itemCode, ':line' => $targetLine]);
                        $itemId = $stmtFindPart->fetchColumn();
                    }

                    // Step 3: ถ้ายังไม่เจออีก ลองหา Part No. เพียวๆ (กรณี Master Data ยังไม่ทำ Route)
                    if (!$itemId) {
                         $stmtFindPartFallback->execute([':code' => $itemCode]);
                         $itemId = $stmtFindPartFallback->fetchColumn();
                    }
                    
                    if ($itemId) {
                        $stmtMerge->execute([
                            ':plan_date' => $row['date'],
                            ':line' => $targetLine,
                            ':shift' => strtoupper($row['shift']),
                            ':item_id' => $itemId,
                            ':qty' => floatval($row['qty']),
                            ':user' => $currentUser
                        ]);
                        $count++;
                    } else {
                        // แจ้ง Error ชัดเจนว่าหาไม่เจอใน Line นี้
                        $errors[] = "Row " . ($index+1) . ": Item '$itemCode' not found for line '$targetLine'.";
                    }
                }
                $pdo->commit();
                
                $msg = "Imported $count plans successfully.";
                if(count($errors) > 0) $msg .= " (Skipped " . count($errors) . " rows)";
                echo json_encode(['success' => true, 'message' => $msg, 'errors' => $errors]);

            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex;
            }
            break;

        case 'update_carry_over':
            if ($method !== 'POST') throw new Exception("Invalid method");
            
            $plan_id = $data['plan_id'] ?? null;
            // รับค่า C/O ที่ส่งมา (แปลงเป็น float เพื่อความชัวร์)
            $carry_over = isset($data['carry_over_quantity']) ? floatval($data['carry_over_quantity']) : 0;
            $currentUser = $_SESSION['user']['username'] ?? 'System';

            if (!$plan_id) throw new Exception("Plan ID is required");

            $sql = "UPDATE $planTable SET 
                        carry_over_quantity = :co,
                        /* ลบบรรทัด adjusted_planned_quantity ทิ้ง */
                        updated_by = :user,
                        updated_at = GETDATE()
                    WHERE plan_id = :id";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':co' => $carry_over,
                /* ลบ :co_calc ออก */
                ':user' => $currentUser,
                ':id' => $plan_id
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Carry over updated successfully']);
            break;

        default:
            throw new Exception("Invalid action");
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>