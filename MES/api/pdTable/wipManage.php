<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../logger.php';

// session_start() ถูกเรียกแล้วใน check_auth.php

//-- ป้องกัน CSRF สำหรับ Request ที่ไม่ใช่ GET --
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'log_wip_entry':
            $required_fields = ['model', 'line', 'part_no', 'quantity_in'];
            foreach ($required_fields as $field) {
                if (empty($input[$field])) { throw new Exception("Missing required field: " . $field); }
            }
            
            $line = strtoupper(trim($input['line']));
            enforceLinePermission($line);

            $model = strtoupper(trim($input['model']));
            $part_no = strtoupper(trim($input['part_no']));
            $lot_no = strtoupper(trim($input['lot_no'] ?? null));
            $quantity_in = (int)$input['quantity_in'];

            $checkSql = "SELECT COUNT(*) FROM PARAMETER WHERE part_no = ? AND model = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$part_no, $model]);
            if ($checkStmt->fetchColumn() == 0) {
                throw new Exception("This Part No. does not exist for the specified Model in the PARAMETER table.");
            }

            $sql = "INSERT INTO WIP_ENTRIES (model, line, lot_no, part_no, quantity_in, operator, remark) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $params = [
                $model, 
                $line, 
                $lot_no, 
                $part_no, 
                $quantity_in, 
                $currentUser['username'],
                $input['remark'] ?? null
            ];
            $stmt = $pdo->prepare($sql);
            
            if ($stmt->execute($params)) {
                // ===== LOG ACTION (WIP_IN) - START =====
                $detail = "Model: {$model}, Part: {$part_no}, Lot No: {$lot_no}, Qty: {$quantity_in}";
                logAction($pdo, $currentUser['username'], 'WIP_IN', $line, $detail);
                // ===== LOG ACTION (WIP_IN) - END =====
                echo json_encode(['success' => true, 'message' => 'WIP entry logged successfully.']);
            } else {
                throw new Exception("Failed to log WIP entry.");
            }
            break;

        case 'update_wip_entry':
            $required = ['entry_id', 'entry_time', 'model', 'line', 'part_no', 'quantity_in'];
            foreach ($required as $field) {
                if (empty($input[$field])) { throw new Exception("Missing required field: " . $field); }
            }
            
            $entry_id = (int)$input['entry_id'];

            $stmt = $pdo->prepare("SELECT line FROM WIP_ENTRIES WHERE entry_id = ?");
            $stmt->execute([$entry_id]);
            $entry = $stmt->fetch();
            if ($entry) {
                enforceLinePermission($entry['line']);
                if ($input['line'] !== $entry['line']) {
                    enforceLinePermission($input['line']);
                }
            } else {
                throw new Exception("WIP Entry not found.");
            }
            
            $entry_time_obj = new DateTime($input['entry_time']);
            $formatted_entry_time = $entry_time_obj->format('Y-m-d H:i:s');
            
            $line = strtoupper(trim($input['line']));
            $model = strtoupper(trim($input['model']));
            $part_no = strtoupper(trim($input['part_no']));
            $lot_no = strtoupper(trim($input['lot_no'] ?? null));
            $quantity_in = (int)$input['quantity_in'];
            
            $sql = "UPDATE WIP_ENTRIES SET entry_time = ?, model = ?, line = ?, part_no = ?, lot_no = ?, quantity_in = ?, remark = ? WHERE entry_id = ?";
            $params = [
                $formatted_entry_time,
                $model,
                $line, 
                $part_no, 
                $lot_no, 
                $quantity_in, 
                $input['remark'] ?? null, 
                $entry_id
            ];
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute($params)) {
                // ===== LOG ACTION (UPDATE_WIP) - START =====
                $detail = "ID: {$entry_id}, Model: {$model}, Part: {$part_no}, Lot No: {$lot_no}, Qty: {$quantity_in}";
                logAction($pdo, $currentUser['username'], 'UPDATE_WIP', $line, $detail);
                // ===== LOG ACTION (UPDATE_WIP) - END =====
                echo json_encode(['success' => true, 'message' => 'WIP Entry updated successfully.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'No changes made or entry not found.']);
            }
            break;

        case 'delete_wip_entry':
            if (empty($input['entry_id'])) { throw new Exception("Entry ID is required."); }
            $id = (int)$input['entry_id'];

            // --- ดึงข้อมูลก่อนลบเพื่อใช้ใน Log ---
            $stmt = $pdo->prepare("SELECT * FROM WIP_ENTRIES WHERE entry_id = ?");
            $stmt->execute([$id]);
            $entryToDelete = $stmt->fetch();
            
            if ($entryToDelete) {
                enforceLinePermission($entryToDelete['line']);
            } else {
                throw new Exception("WIP Entry not found.");
            }

            $sql = "DELETE FROM WIP_ENTRIES WHERE entry_id = ?";
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute([$id]) && $stmt->rowCount() > 0) {
                // ===== LOG ACTION (DELETE_WIP) - START =====
                $detail = "Deleted WIP ID: {$id} | Model: {$entryToDelete['model']}, Part: {$entryToDelete['part_no']}, Lot No: {$entryToDelete['lot_no']}, Qty: {$entryToDelete['quantity_in']}";
                logAction($pdo, $currentUser['username'], 'DELETE_WIP', $entryToDelete['line'], $detail);
                // ===== LOG ACTION (DELETE_WIP) - END =====
                echo json_encode(['success' => true, 'message' => 'WIP Entry deleted successfully.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Entry not found or already deleted.']);
            }
            break;

        case 'get_wip_report':
            $params = [];
            $parts_params = [];
            $wip_conditions = [];
            $parts_conditions = [];

            if ($currentUser['role'] === 'supervisor') {
                $wip_conditions[] = "wip.line = ?";
                $params[] = $currentUser['line'];
                $parts_conditions[] = "line = ?";
                $parts_params[] = $currentUser['line'];
            }

            if (!empty($_GET['line'])) { $wip_conditions[] = "wip.line = ?"; $params[] = $_GET['line']; $parts_conditions[] = "line = ?"; $parts_params[] = $_GET['line']; }
            if (!empty($_GET['part_no'])) { $wip_conditions[] = "wip.part_no = ?"; $params[] = $_GET['part_no']; $parts_conditions[] = "part_no = ?"; $parts_params[] = $_GET['part_no']; }
            if (!empty($_GET['model'])) { $wip_conditions[] = "wip.model = ?"; $params[] = $_GET['model']; $parts_conditions[] = "model = ?"; $parts_params[] = $_GET['model']; }
            if (!empty($_GET['startDate'])) { $wip_conditions[] = "CAST(wip.entry_time AS DATE) >= ?"; $params[] = $_GET['startDate']; $parts_conditions[] = "log_date >= ?"; $parts_params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $wip_conditions[] = "CAST(wip.entry_time AS DATE) <= ?"; $params[] = $_GET['endDate']; $parts_conditions[] = "log_date <= ?"; $parts_params[] = $_GET['endDate']; }

            $wipWhereClause = $wip_conditions ? "WHERE " . implode(" AND ", $wip_conditions) : "";
            $partsWhereClause = $parts_conditions ? "WHERE " . implode(" AND ", $parts_conditions) : "";

            $sql = "
                WITH TotalIn AS (
                    SELECT part_no, line, model, SUM(quantity_in) AS total_in 
                    FROM WIP_ENTRIES wip 
                    $wipWhereClause 
                    GROUP BY part_no, line, model
                ), 
                TotalOut AS (
                    SELECT part_no, line, model, SUM(count_value) AS total_out 
                    FROM PARTS 
                    $partsWhereClause 
                    GROUP BY part_no, line, model
                ) 
                SELECT 
                    ISNULL(tin.part_no, tout.part_no) AS part_no, 
                    ISNULL(tin.line, tout.line) AS line, 
                    ISNULL(tin.model, tout.model) as model, 
                    ISNULL(tin.total_in, 0) AS total_in, 
                    ISNULL(tout.total_out, 0) AS total_out, 
                    (ISNULL(tin.total_in, 0) - ISNULL(tout.total_out, 0)) AS variance 
                FROM TotalIn tin 
                FULL JOIN TotalOut tout ON tin.part_no = tout.part_no AND tin.line = tout.line AND tin.model = tout.model 
                ORDER BY line, model, part_no;
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_merge($params, $parts_params));
            $report_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'report' => $report_data]);
            break;

        case 'get_wip_report_by_lot':
            $params = [];
            $conditions = [];

            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "wip.line = ?";
                $params[] = $currentUser['line'];
            }

            if (!empty($_GET['line'])) { $conditions[] = "wip.line = ?"; $params[] = $_GET['line']; }
            if (!empty($_GET['part_no'])) { $conditions[] = "wip.part_no = ?"; $params[] = $_GET['part_no']; }
            if (!empty($_GET['model'])) { $conditions[] = "wip.model = ?"; $params[] = $_GET['model']; }
            if (!empty($_GET['lot_no'])) { $conditions[] = "wip.lot_no LIKE ?"; $params[] = "%".$_GET['lot_no']."%"; }
            if (!empty($_GET['startDate'])) { $conditions[] = "CAST(wip.entry_time AS DATE) >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $conditions[] = "CAST(wip.entry_time AS DATE) <= ?"; $params[] = $_GET['endDate']; }

            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";

            $sql = "
                WITH 
                WipLots AS (
                    SELECT 
                        wip.lot_no, wip.part_no, wip.line, wip.model, wip.quantity_in
                    FROM WIP_ENTRIES wip
                    $whereClause
                ),
                TotalOutByLot AS (
                    SELECT 
                        lot_no, SUM(ISNULL(count_value, 0)) as total_out
                    FROM PARTS
                    WHERE lot_no IS NOT NULL AND lot_no != ''
                    GROUP BY lot_no
                )
                SELECT 
                    w.lot_no, w.part_no, w.line, w.model,
                    w.quantity_in AS total_in,
                    ISNULL(o.total_out, 0) AS total_out,
                    (w.quantity_in - ISNULL(o.total_out, 0)) AS variance
                FROM WipLots w
                LEFT JOIN TotalOutByLot o ON w.lot_no = o.lot_no
                WHERE (w.quantity_in - ISNULL(o.total_out, 0)) != 0 
                ORDER BY w.line, w.model, w.part_no, w.lot_no;
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $report_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'report' => $report_data]);
            break;
            
        case 'get_wip_history':
            $params = [];
            $wip_conditions = [];

            if ($currentUser['role'] === 'supervisor') {
                $wip_conditions[] = "wip.line = ?";
                $params[] = $currentUser['line'];
            }

            if (!empty($_GET['line'])) { $wip_conditions[] = "wip.line = ?"; $params[] = $_GET['line']; }
            if (!empty($_GET['part_no'])) { $wip_conditions[] = "wip.part_no = ?"; $params[] = $_GET['part_no']; }
            if (!empty($_GET['model'])) { $wip_conditions[] = "wip.model = ?"; $params[] = $_GET['model']; }
            if (!empty($_GET['lot_no'])) { $wip_conditions[] = "wip.lot_no = ?"; $params[] = $_GET['lot_no']; }
            if (!empty($_GET['startDate'])) { $wip_conditions[] = "CAST(wip.entry_time AS DATE) >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $wip_conditions[] = "CAST(wip.entry_time AS DATE) <= ?"; $params[] = $_GET['endDate']; }
            
            $wipWhereClause = $wip_conditions ? "WHERE " . implode(" AND ", $wip_conditions) : "";
            
            $history_sql = "SELECT * FROM WIP_ENTRIES AS wip $wipWhereClause ORDER BY entry_time DESC";
            $history_stmt = $pdo->prepare($history_sql);
            $history_stmt->execute($params);
            $history_data = $history_stmt->fetchAll(PDO::FETCH_ASSOC);

            $summary_sql = "SELECT line, model, part_no, SUM(quantity_in) as total_quantity_in FROM WIP_ENTRIES wip $wipWhereClause GROUP BY line, model, part_no ORDER BY line, model, part_no";
            $summary_stmt = $pdo->prepare($summary_sql);
            $summary_stmt->execute($params);
            $summary_data = $summary_stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'history' => $history_data, 'history_summary' => $summary_data]);
            break;

        case 'adjust_stock':
            $pdo->beginTransaction();
            try {
                $required = ['part_no', 'line', 'model', 'system_count', 'physical_count'];
                foreach ($required as $field) {
                    if (!isset($input[$field])) {
                        throw new Exception("Missing required field: " . $field);
                    }
                }

                $line = strtoupper(trim($input['line']));
                enforceLinePermission($line);

                $part_no = strtoupper(trim($input['part_no']));
                $model = strtoupper(trim($input['model']));
                $system_count = (int)$input['system_count'];
                $physical_count = (int)$input['physical_count'];
                $note = trim($input['note'] ?? 'Stock Adjustment');

                $variance = $physical_count - $system_count;

                if ($variance == 0) {
                    echo json_encode(['success' => true, 'message' => 'No adjustment needed. Stock count is already correct.']);
                    $pdo->commit();
                    exit;
                }

                $adjustment_type = $variance > 0 ? 'ADJUST-IN' : 'ADJUST-OUT';
                $adjustment_value = abs($variance); // ค่าที่บันทึกต้องเป็นบวกเสมอ

                $sql = "INSERT INTO PARTS (log_date, log_time, line, model, part_no, count_type, count_value, note) VALUES (GETDATE(), GETDATE(), ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $params = [
                    $line,
                    $model,
                    $part_no,
                    $adjustment_type,
                    $adjustment_value,
                    $note
                ];
                
                $stmt->execute($params);

                // Log การกระทำ
                $log_detail = "Part: {$part_no}, Model: {$model}, System: {$system_count}, Physical: {$physical_count}, Variance: {$variance}, Type: {$adjustment_type}";
                logAction($pdo, $currentUser['username'], 'STOCK_ADJUST', $line, $log_detail);

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Stock adjusted successfully.']);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e; // ส่งต่อไปให้ catch block ด้านนอก
            }
            break;

        case 'get_stock_count':
            $param_conditions = [];
            $param_params = [];

            if (!empty($_GET['line'])) {
                $param_conditions[] = "p.line = ?"; $param_params[] = $_GET['line'];
            }
            if (!empty($_GET['part_no'])) {
                $param_conditions[] = "p.part_no LIKE ?"; $param_params[] = "%".$_GET['part_no']."%";
            }
            if (!empty($_GET['model'])) {
                $param_conditions[] = "p.model LIKE ?"; $param_params[] = "%".$_GET['model']."%";
            }
            
            $paramWhereClause = !empty($param_conditions) ? "WHERE " . implode(" AND ", $param_conditions) : "";
            
            // ===== SQL ที่แก้ไขใหม่ทั้งหมด =====
            $sql = "
                WITH 
                -- 1. ยอดนำเข้าทั้งหมด (จาก WIP_ENTRIES)
                TotalWipIn AS (
                    SELECT line, model, part_no, SUM(ISNULL(quantity_in, 0)) as total
                    FROM WIP_ENTRIES
                    GROUP BY line, model, part_no
                ),
                -- 2. ยอดปรับปรุงเข้า (จาก PARTS)
                TotalAdjustIn AS (
                    SELECT line, model, part_no, SUM(ISNULL(count_value, 0)) as total
                    FROM PARTS
                    WHERE count_type = 'ADJUST-IN'
                    GROUP BY line, model, part_no
                ),
                -- 3. ยอดปรับปรุงออก (จาก PARTS)
                TotalAdjustOut AS (
                    SELECT line, model, part_no, SUM(ISNULL(count_value, 0)) as total
                    FROM PARTS
                    WHERE count_type = 'ADJUST-OUT'
                    GROUP BY line, model, part_no
                ),
                -- 4. ยอดผลิตออกทั้งหมด (ไม่รวมรายการปรับปรุง)
                TotalProductionOut AS (
                    SELECT line, model, part_no, SUM(ISNULL(count_value, 0)) as total
                    FROM PARTS
                    WHERE count_type NOT LIKE 'ADJUST%' 
                    GROUP BY line, model, part_no
                )
                -- 5. รวมผลลัพธ์ทั้งหมด
                SELECT
                    p.line, p.model, p.part_no,
                    (ISNULL(wip_in.total, 0) + ISNULL(adj_in.total, 0)) AS total_in,
                    (ISNULL(prod_out.total, 0) + ISNULL(adj_out.total, 0)) AS total_out,
                    -- สูตรคำนวณ Variance ที่ถูกต้อง
                    (ISNULL(wip_in.total, 0) + ISNULL(adj_in.total, 0)) - (ISNULL(prod_out.total, 0) + ISNULL(adj_out.total, 0)) AS variance
                FROM 
                    PARAMETER p
                LEFT JOIN TotalWipIn wip_in ON p.line = wip_in.line AND p.model = wip_in.model AND p.part_no = wip_in.part_no
                LEFT JOIN TotalAdjustIn adj_in ON p.line = adj_in.line AND p.model = adj_in.model AND p.part_no = adj_in.part_no
                LEFT JOIN TotalAdjustOut adj_out ON p.line = adj_out.line AND p.model = adj_out.model AND p.part_no = adj_out.part_no
                LEFT JOIN TotalProductionOut prod_out ON p.line = prod_out.line AND p.model = prod_out.model AND p.part_no = prod_out.part_no
                $paramWhereClause
                ORDER BY p.line, p.model, p.part_no;
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($param_params);
            $stock_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $stock_data]);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid action specified.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Error in wipManage.php: " . $e->getMessage());
}
?>