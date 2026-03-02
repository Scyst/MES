<?php
// MES/page/management/api/planManage.php

// 1. Config Environment (เหมือน Manpower)
ignore_user_abort(true); 
set_time_limit(300); // 5 นาที
header('Content-Type: application/json');

// 2. 🔥 Auto-Sync Check (เช็คก่อน Include Auth!)
// ใช้ $_SERVER แทน getallheaders() เพื่อความชัวร์ 100%
$is_api_call = false;
if (isset($_SERVER['HTTP_X_API_KEY']) && $_SERVER['HTTP_X_API_KEY'] === 'MESKey2026') {
    $is_api_call = true;
}

// 3. Include DB & Config
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../config/config.php';

// 4. 🔥 Auth Check (ถ้าไม่ใช่ API Call ค่อยเช็คคน)
if (!$is_api_call) {
    // Include Auth เฉพาะตอนคนใช้งาน เพื่อกัน Node-RED โดน Redirect
    require_once __DIR__ . '/../../../auth/check_auth.php';
    
    if (!function_exists('hasRole') || !hasRole(['admin', 'creator', 'planner'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
}

// ถ้าเป็น Node-RED (API Call) ให้ปิด Session เพื่อลดภาระ
if ($is_api_call) {
    session_write_close();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true) ?? [];

$planTable = PRODUCTION_PLANS_TABLE;
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

            // --- 🚀 OPTIMIZATION START 🚀 ---
            // คำนวณช่วงเวลา (Timestamp) ของกะการผลิต (08:00 ถึง 07:59 ของอีกวัน)
            // เพื่อให้ Database ใช้ Index ของ transaction_timestamp ได้โดยตรง (SARGable)
            $startTs = date('Y-m-d 08:00:00', strtotime($startDate));
            $endTs   = date('Y-m-d 07:59:59', strtotime($endDate . ' +1 day'));

            // [SQL OPTIMIZATION]
            // เขียน Subquery ใหม่: กรองช่วงเวลาด้วย Timestamp และ Group By
            $actualsSubQuery = "
                SELECT 
                    CAST(DATEADD(HOUR, -8, transaction_timestamp) AS DATE) AS ActualDate,
                    l.production_line AS ActualLine,
                    CASE WHEN DATEPART(HOUR, DATEADD(HOUR, -8, transaction_timestamp)) < 12 THEN 'DAY' ELSE 'NIGHT' END AS ActualShift,
                    parameter_id AS ActualItemId,
                    SUM(quantity) as ActualQty
                FROM " . TRANSACTIONS_TABLE . " t
                JOIN " . LOCATIONS_TABLE . " l ON t.to_location_id = l.location_id
                WHERE t.transaction_type = 'PRODUCTION_FG'
                AND t.transaction_timestamp >= :startTs 
                AND t.transaction_timestamp <= :endTs
            ";

            // ถ้ามีการกรอง Line ให้กรองใน Subquery เลยเพื่อลดปริมาณข้อมูลก่อน Grouping
            if ($line) {
                $actualsSubQuery .= " AND l.production_line = :lineFilter ";
            }

            $actualsSubQuery .= " GROUP BY 
                CAST(DATEADD(HOUR, -8, transaction_timestamp) AS DATE),
                l.production_line,
                CASE WHEN DATEPART(HOUR, DATEADD(HOUR, -8, transaction_timestamp)) < 12 THEN 'DAY' ELSE 'NIGHT' END,
                parameter_id
            ";
            // --- 🚀 OPTIMIZATION END 🚀 ---

            $params = [];
            
            // Base Where Clause
            $whereClause = " AND (p.plan_date BETWEEN :start AND :end OR actual.ActualDate BETWEEN :start2 AND :end2)";
            
            $params[':start'] = $startDate;
            $params[':end'] = $endDate;
            $params[':start2'] = $startDate;
            $params[':end2'] = $endDate;
            
            // เพิ่ม Params ใหม่สำหรับการ Optimize
            $params[':startTs'] = $startTs;
            $params[':endTs'] = $endTs;

            if ($line) {
                $whereClause .= " AND (p.line = :line OR actual.ActualLine = :line2)";
                $params[':line'] = $line;
                $params[':line2'] = $line;
                $params[':lineFilter'] = $line; // สำหรับ Subquery
            }
            if ($shift) {
                $whereClause .= " AND (p.shift = :shift OR actual.ActualShift = :shift2)";
                $params[':shift'] = $shift;
                $params[':shift2'] = $shift;
            }

            // 1. [NEW] Summary Query (ยอดรวม Budget)
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

            // 2. Base Query
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

            // 3. Count Query
            $countSql = "SELECT COUNT(*) " . $baseQuery;
            $stmtCount = $pdo->prepare($countSql);
            // ข้อควรระวัง: ต้อง bind params ทั้งหมดที่เตรียมไว้
            foreach ($params as $key => $val) {
                if ($key !== ':offset' && $key !== ':limit') {
                    $stmtCount->bindValue($key, $val);
                }
            }
            $stmtCount->execute();
            $totalRecords = $stmtCount->fetchColumn();
            $totalPages = ($limit > 0) ? ceil($totalRecords / $limit) : 1;

            // 4. Data Query
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
                ORDER BY 
                    plan_date DESC,
                    CASE 
                        WHEN ISNULL(p.shift, actual.ActualShift) = 'NIGHT' THEN 1 
                        WHEN ISNULL(p.shift, actual.ActualShift) = 'DAY' THEN 2 
                        ELSE 3 
                    END ASC,
                    line ASC, 
                    i.part_no ASC
            ";

            if ($limit > 0) {
                $dataSql .= " OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY";
                $params[':offset'] = $offset;
                $params[':limit'] = $limit;
            }

            $stmt = $pdo->prepare($dataSql);
            foreach ($params as $key => $val) {
                if ($key === ':offset' || $key === ':limit') {
                    $stmt->bindValue($key, $val, PDO::PARAM_INT);
                } else {
                    $stmt->bindValue($key, $val);
                }
            }
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'data' => $result,
                'summary' => $summaryData,
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
                $sql = "INSERT INTO $planTable (
                            plan_date, line, shift, item_id, 
                            original_planned_quantity, 
                            carry_over_quantity,
                            note, updated_by
                        ) VALUES (
                            :date, :line, :shift, :item, 
                            :qty, 
                            :co,
                            :note, :user
                        )";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':date' => $plan_date, 
                    ':line' => $line, 
                    ':shift' => $shift, 
                    ':item' => $item_id, 
                    ':qty' => $qty, 
                    ':co' => $carry_over,
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
                set_time_limit(300); 
                try {
                    $pdo->setAttribute(PDO::ATTR_TIMEOUT, 300);
                } catch (Exception $ex) { /* Ignore if not supported */ }
                
                if (defined('PDO::SQLSRV_ATTR_QUERY_TIMEOUT')) {
                    try {
                        $pdo->setAttribute(PDO::SQLSRV_ATTR_QUERY_TIMEOUT, 300);
                    } catch (Exception $ex) { /* Ignore */ }
                }

                $startDate = date('Y-01-01'); 
                $endDate   = date('Y-m-d', strtotime('+30 days')); 
                
                if (!defined('SP_UPDATE_CARRYOVER')) {
                    throw new Exception("Config Error: SP_UPDATE_CARRYOVER is not defined.");
                }

                $spName = SP_UPDATE_CARRYOVER;
                $sql = "EXEC $spName @StartDate = :start, @EndDate = :end";
                $options = array();
                if (defined('PDO::SQLSRV_ATTR_QUERY_TIMEOUT')) {
                    $options[PDO::SQLSRV_ATTR_QUERY_TIMEOUT] = 300;
                } else {
                    $options[PDO::ATTR_TIMEOUT] = 300;
                }
                
                $stmt = $pdo->prepare($sql, $options);
                $stmt->execute([':start' => $startDate, ':end' => $endDate]);
                
                echo json_encode([
                    'success' => true, 
                    'message' => "Carry Over updated successfully (Year-to-Date: $startDate)."
                ]);

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Calculation Error: ' . $e->getMessage()]);
            }
            break;

        case 'import_plans_bulk':
            if ($method !== 'POST') throw new Exception("Invalid method");
            
            $plans = $data['plans'] ?? [];
            if (empty($plans)) throw new Exception("No data to import");

            $pdo->beginTransaction();
            try {
                $sqlFindSAP = "SELECT TOP 1 item_id FROM $itemTable WHERE sap_no = :code";
                $stmtFindSAP = $pdo->prepare($sqlFindSAP);

                $routesTable = ROUTES_TABLE;
                $sqlFindPart = "
                    SELECT TOP 1 i.item_id 
                    FROM $itemTable i
                    JOIN $routesTable r ON i.item_id = r.item_id
                    WHERE i.part_no = :code AND r.line = :line
                ";
                $stmtFindPart = $pdo->prepare($sqlFindPart);
                
                $sqlFindPartFallback = "SELECT TOP 1 item_id FROM $itemTable WHERE part_no = :code";
                $stmtFindPartFallback = $pdo->prepare($sqlFindPartFallback);

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
                    $targetLine = $row['line']; 
                    $itemId = null;

                    $stmtFindSAP->execute([':code' => $itemCode]);
                    $itemId = $stmtFindSAP->fetchColumn();

                    if (!$itemId) {
                        $stmtFindPart->execute([':code' => $itemCode, ':line' => $targetLine]);
                        $itemId = $stmtFindPart->fetchColumn();
                    }

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
            $carry_over = isset($data['carry_over_quantity']) ? floatval($data['carry_over_quantity']) : 0;
            $currentUser = $_SESSION['user']['username'] ?? 'System';

            if (!$plan_id) throw new Exception("Plan ID is required");

            $sql = "UPDATE $planTable SET 
                        carry_over_quantity = :co,
                        updated_by = :user,
                        updated_at = GETDATE()
                    WHERE plan_id = :id";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':co' => $carry_over,
                ':user' => $currentUser,
                ':id' => $plan_id
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Carry over updated successfully']);
            break;

        case 'auto_create_plan':
            if ($method !== 'POST') throw new Exception("Invalid method");
            
            $filterType = $data['filterType'] ?? 'DATE';
            $startDate = $data['startDate'] ?? '';
            $endDate   = $data['endDate'] ?? '';
            $startWeek = $data['startWeek'] ?? '';
            $endWeek   = $data['endWeek'] ?? '';
            
            $planStart = $data['planStartDate'] ?? date('Y-m-d');
            $planEnd   = $data['planEndDate'] ?? null;
            $planMode  = $data['planRangeMode'] ?? 'OPEN';
            $setupTime = isset($data['setupTime']) ? floatval($data['setupTime']) : 0;
            $otHours   = isset($data['otHours']) ? floatval($data['otHours']) : 0;

            $shiftMode = $data['shiftMode'] ?? 'DAY'; 
            $overwrite = isset($data['overwrite']) && $data['overwrite'] ? 1 : 0;
            $workOnSunday = isset($data['workOnSunday']) && $data['workOnSunday'] ? 1 : 0;
            $currentUser = $_SESSION['user']['username'] ?? 'System';

            $spName = SP_AUTO_GENERATE_PLAN;
            $sql = "EXEC $spName 
                    @FilterType = :ftype,
                    @StartDate = :start, 
                    @EndDate = :end, 
                    @StartWeek = :sweek,
                    @EndWeek = :eweek,
                    @PlanStartDate = :pstart,
                    @PlanEndDate = :pend,
                    @PlanRangeMode = :pmode,
                    @ShiftMode = :mode, 
                    @SetupTimeHrs = :setup,
                    @OTHours = :ot,
                    @WorkOnSunday = :sunday, -- 📌 [NEW] พารามิเตอร์ใน SQL
                    @Overwrite = :ow, 
                    @User = :usr";
                    
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':ftype' => $filterType,
                ':start' => $startDate === '' ? null : $startDate,
                ':end'   => $endDate === '' ? null : $endDate,
                ':sweek' => $startWeek === '' ? null : $startWeek,
                ':eweek' => $endWeek === '' ? null : $endWeek,
                ':pstart' => $planStart,
                ':pend' => $planEnd,
                ':pmode' => $planMode,
                ':mode' => $shiftMode,
                ':setup' => $setupTime,
                ':ot' => $otHours,
                ':sunday' => $workOnSunday,
                ':ow' => $overwrite,
                ':usr' => $currentUser
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result && $result['success'] == 1) {
                $unplanned = isset($result['unplanned_qty']) ? floatval($result['unplanned_qty']) : 0;
                echo json_encode([
                    'success' => true, 
                    'message' => $result['message'],
                    'unplanned_qty' => $unplanned
                ]);
            } else {
                throw new Exception("ไม่พบข้อมูลที่จะสร้าง หรือเกิดข้อผิดพลาด");
            }
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