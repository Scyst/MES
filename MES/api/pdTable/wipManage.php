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

            $checkSql = "SELECT COUNT(*) FROM PARAMETER WHERE part_no = ? AND model = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([strtoupper(trim($input['part_no'])), strtoupper(trim($input['model']))]);
            if ($checkStmt->fetchColumn() == 0) {
                throw new Exception("This Part No. does not exist for the specified Model in the PARAMETER table.");
            }

            $sql = "INSERT INTO WIP_ENTRIES (model, line, lot_no, part_no, quantity_in, operator, remark) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $params = [
                strtoupper(trim($input['model'])), 
                $line, 
                strtoupper(trim($input['lot_no'] ?? null)), 
                strtoupper(trim($input['part_no'])), 
                (int)$input['quantity_in'], 
                $currentUser['username'],
                $input['remark'] ?? null
            ];
            $stmt = $pdo->prepare($sql);
            
            if ($stmt->execute($params)) {
                $detail = "Model: {$input['model']}, Line: {$line}, Part: {$input['part_no']}, Qty: {$input['quantity_in']}";
                logAction($pdo, $currentUser['username'], 'WIP_ENTRY', $input['lot_no'], $detail);
                echo json_encode(['success' => true, 'message' => 'WIP entry logged successfully.']);
            } else {
                throw new Exception("Failed to log WIP entry.");
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

        case 'update_wip_entry':
            $required = ['entry_id', 'entry_time', 'model', 'line', 'part_no', 'quantity_in'];
            foreach ($required as $field) {
                if (empty($input[$field])) { throw new Exception("Missing required field: " . $field); }
            }

            $stmt = $pdo->prepare("SELECT line FROM WIP_ENTRIES WHERE entry_id = ?");
            $stmt->execute([$input['entry_id']]);
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
            
            $sql = "UPDATE WIP_ENTRIES SET entry_time = ?, model = ?, line = ?, part_no = ?, lot_no = ?, quantity_in = ?, remark = ? WHERE entry_id = ?";
            $params = [
                $formatted_entry_time,
                strtoupper(trim($input['model'])),
                strtoupper(trim($input['line'])), 
                strtoupper(trim($input['part_no'])), 
                strtoupper(trim($input['lot_no'] ?? null)), 
                (int)$input['quantity_in'], 
                $input['remark'] ?? null, 
                (int)$input['entry_id']
            ];
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute($params)) {
                logAction($pdo, $currentUser['username'], 'UPDATE WIP_ENTRY', $input['entry_id']);
                echo json_encode(['success' => true, 'message' => 'WIP Entry updated successfully.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'No changes made or entry not found.']);
            }
            break;

        case 'delete_wip_entry':
            if (empty($input['entry_id'])) { throw new Exception("Entry ID is required."); }
            $id = (int)$input['entry_id'];

            $stmt = $pdo->prepare("SELECT line FROM WIP_ENTRIES WHERE entry_id = ?");
            $stmt->execute([$id]);
            $entry = $stmt->fetch();
            if ($entry) {
                enforceLinePermission($entry['line']);
            } else {
                throw new Exception("WIP Entry not found.");
            }

            $sql = "DELETE FROM WIP_ENTRIES WHERE entry_id = ?";
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute([$id]) && $stmt->rowCount() > 0) {
                logAction($pdo, $currentUser['username'], 'DELETE WIP_ENTRY', $id);
                echo json_encode(['success' => true, 'message' => 'WIP Entry deleted successfully.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Entry not found or already deleted.']);
            }
            break;

        case 'get_stock_count':
            // สร้าง Array สำหรับเก็บเงื่อนไขและพารามิเตอร์แยกตามแต่ละตาราง
            $param_conditions = [];
            $param_params = [];

            $wip_conditions = [];
            $wip_params = [];

            $parts_conditions = [];
            $parts_params = [];

            // --- สร้างเงื่อนไขจาก Filter ---
            // 1. เงื่อนไขสำหรับ Line, Model, Part No. (ใช้กับทุกตาราง)
            if (!empty($_GET['line'])) {
                $param_conditions[] = "p.line = ?"; $param_params[] = $_GET['line'];
                $wip_conditions[] = "wip.line = ?"; $wip_params[] = $_GET['line'];
                $parts_conditions[] = "line = ?"; $parts_params[] = $_GET['line'];
            }
            if (!empty($_GET['part_no'])) {
                $param_conditions[] = "p.part_no LIKE ?"; $param_params[] = "%".$_GET['part_no']."%";
                $wip_conditions[] = "wip.part_no LIKE ?"; $wip_params[] = "%".$_GET['part_no']."%";
                $parts_conditions[] = "part_no LIKE ?"; $parts_params[] = "%".$_GET['part_no']."%";
            }
            if (!empty($_GET['model'])) {
                $param_conditions[] = "p.model LIKE ?"; $param_params[] = "%".$_GET['model']."%";
                $wip_conditions[] = "wip.model LIKE ?"; $wip_params[] = "%".$_GET['model']."%";
                $parts_conditions[] = "model LIKE ?"; $parts_params[] = "%".$_GET['model']."%";
            }
            
            // 2. เงื่อนไขสำหรับวันที่ (ใช้เฉพาะกับ WIP_ENTRIES และ PARTS)
            if (!empty($_GET['startDate'])) {
                $wip_conditions[] = "CAST(wip.entry_time AS DATE) >= ?"; $wip_params[] = $_GET['startDate'];
                $parts_conditions[] = "log_date >= ?"; $parts_params[] = $_GET['startDate'];
            }
            if (!empty($_GET['endDate'])) {
                $wip_conditions[] = "CAST(wip.entry_time AS DATE) <= ?"; $wip_params[] = $_GET['endDate'];
                $parts_conditions[] = "log_date <= ?"; $parts_params[] = $_GET['endDate'];
            }

            // สร้าง WHERE clause จากเงื่อนไข
            $paramWhereClause = !empty($param_conditions) ? "WHERE " . implode(" AND ", $param_conditions) : "";
            $wipWhereClause = !empty($wip_conditions) ? "WHERE " . implode(" AND ", $wip_conditions) : "";
            $partsWhereClause = !empty($parts_conditions) ? "WHERE " . implode(" AND ", $parts_conditions) : "";

            $sql = "
                WITH TotalIn AS (
                    SELECT line, model, part_no, SUM(ISNULL(quantity_in, 0)) as total_in
                    FROM WIP_ENTRIES wip
                    $wipWhereClause
                    GROUP BY line, model, part_no
                ), TotalOut AS (
                    SELECT line, model, part_no, SUM(ISNULL(count_value, 0)) as total_out
                    FROM PARTS
                    $partsWhereClause
                    GROUP BY line, model, part_no
                )
                SELECT
                    p.line, p.model, p.part_no,
                    ISNULL(tin.total_in, 0) AS total_in,
                    ISNULL(tout.total_out, 0) AS total_out,
                    (ISNULL(tin.total_in, 0) - ISNULL(tout.total_out, 0)) AS variance
                FROM PARAMETER p
                LEFT JOIN TotalIn tin ON p.line = tin.line AND p.model = tin.model AND p.part_no = tin.part_no
                LEFT JOIN TotalOut tout ON p.line = tout.line AND p.model = tout.model AND p.part_no = tout.part_no
                $paramWhereClause
                ORDER BY p.line, p.model, p.part_no;
            ";

            // --- ส่วนที่แก้ไขที่สำคัญที่สุด ---
            // รวมพารามิเตอร์ตามลำดับที่ '?' ปรากฏใน SQL Query
            // 1. จาก TotalIn (WIP) -> 2. จาก TotalOut (Parts) -> 3. จาก PARAMETER
            $executeParams = array_merge($wip_params, $parts_params, $param_params);

            $stmt = $pdo->prepare($sql);
            $stmt->execute($executeParams);
            $stock_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // เปลี่ยน Key กลับไปเป็น 'data' เพื่อให้ Frontend ทำงานได้ถูกต้อง
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