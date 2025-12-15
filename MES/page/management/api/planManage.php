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

            // 2. Base Query (ใช้ร่วมกันทั้ง Count และ Data)
            // หมายเหตุ: ใช้ CTE หรือ Subquery เพื่อความ Clean ในการนับและดึงข้อมูล
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

            // 4. Data Query (ดึงข้อมูลจริงพร้อม Pagination)
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
                    ISNULL(i.Cost_Total, 0) AS cost_total,
                    (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0)) AS cost_rm,
                    ISNULL(i.Cost_DL, 0) AS cost_dl,
                    (ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + 
                     ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)) AS cost_oh,
                    ISNULL(p.original_planned_quantity, 0) AS original_planned_quantity,
                    ISNULL(p.carry_over_quantity, 0) AS carry_over_quantity,
                    ISNULL(p.adjusted_planned_quantity, 0) AS adjusted_planned_quantity,
                    p.note,
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

            // 5. ส่งคืนผลลัพธ์พร้อม Pagination Metadata
            echo json_encode([
                'success' => true, 
                'data' => $result,
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

            if ($plan_id != 0) {
                $sql = "UPDATE $planTable SET original_planned_quantity = :qty, note = :note, updated_by = :user, updated_at = GETDATE() WHERE plan_id = :id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':qty' => $qty, ':note' => $note, ':user' => $currentUser, ':id' => $plan_id]);
            } else {
                $sql = "INSERT INTO $planTable (plan_date, line, shift, item_id, original_planned_quantity, note, created_by) VALUES (:date, :line, :shift, :item, :qty, :note, :user)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':date' => $plan_date, ':line' => $line, ':shift' => $shift, ':item' => $item_id, ':qty' => $qty, ':note' => $note, ':user' => $currentUser]);
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
            $currentUser = $_SESSION['user']['username'] ?? 'System';
            $sql = "
                UPDATE p
                SET p.carry_over_quantity = ISNULL((
                    SELECT SUM(ISNULL(prev.adjusted_planned_quantity, 0) - ISNULL(act.ActualQty, 0))
                    FROM $planTable prev
                    LEFT JOIN ($actualsSubQuery) act ON prev.plan_date = act.ActualDate AND prev.line = act.ActualLine AND prev.shift = act.ActualShift AND prev.item_id = act.ActualItemId
                    WHERE prev.plan_date < p.plan_date 
                    AND prev.line = p.line 
                    AND prev.item_id = p.item_id
                    AND (prev.adjusted_planned_quantity - ISNULL(act.ActualQty, 0)) > 0
                ), 0)
                FROM $planTable p
                WHERE p.plan_date >= CAST(GETDATE() AS DATE)
            ";
            $pdo->exec($sql);
            echo json_encode(['success' => true, 'message' => 'Carry over calculated']);
            break;

        case 'import_plans_bulk':
            if ($method !== 'POST') throw new Exception("Invalid method");
            
            $plans = $data['plans'] ?? [];
            if (empty($plans)) throw new Exception("No data to import");

            $pdo->beginTransaction();
            try {
                $checkItem = $pdo->prepare("SELECT TOP 1 item_id FROM $itemTable WHERE sap_no = ? OR part_no = ?");
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
                $currentUser = $_SESSION['user']['username'] ?? 'System';

                $count = 0;
                $errors = [];
                foreach ($plans as $index => $row) {
                    $itemCode = trim($row['item_code']);
                    $checkItem->execute([$itemCode, $itemCode]);
                    $itemId = $checkItem->fetchColumn();
                    
                    if ($itemId) {
                        $stmtMerge->execute([
                            ':plan_date' => $row['date'],
                            ':line' => $row['line'],
                            ':shift' => strtoupper($row['shift']),
                            ':item_id' => $itemId,
                            ':qty' => floatval($row['qty']),
                            ':user' => $currentUser
                        ]);
                        $count++;
                    } else {
                        $errors[] = "Row " . ($index+1) . ": Item '$itemCode' not found.";
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

        default:
            throw new Exception("Invalid action");
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>