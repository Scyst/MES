<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../logger.php';
session_start();

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
$currentUser = $_SESSION['user']['username'] ?? 'system';

try {
    switch ($action) {
        case 'log_wip_entry':
            $required_fields = ['line', 'part_no', 'quantity_in'];
            foreach ($required_fields as $field) {
                if (empty($input[$field])) { throw new Exception("Missing required field: " . $field); }
            }
            $sql = "INSERT INTO WIP_ENTRIES (line, lot_no, part_no, quantity_in, operator, remark) VALUES (?, ?, ?, ?, ?, ?)";
            $params = [$input['line'], $input['lot_no'] ?? null, $input['part_no'], (int)$input['quantity_in'], $currentUser, $input['remark'] ?? null];
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute($params)) {
                $detail = "Line: {$input['line']}, Part: {$input['part_no']}, Qty: {$input['quantity_in']}";
                logAction($pdo, $currentUser, 'WIP_ENTRY', $input['lot_no'], $detail);
                echo json_encode(['success' => true, 'message' => 'WIP entry logged successfully.']);
            } else {
                throw new Exception("Failed to log WIP entry.");
            }
            break;

        case 'get_wip_report':
            $params = []; $parts_params = []; $wip_conditions = []; $parts_conditions = [];
            if (!empty($_GET['line'])) { $wip_conditions[] = "line = ?"; $params[] = $_GET['line']; $parts_conditions[] = "line = ?"; $parts_params[] = $_GET['line']; }
            if (!empty($_GET['part_no'])) { $wip_conditions[] = "part_no = ?"; $params[] = $_GET['part_no']; $parts_conditions[] = "part_no = ?"; $parts_params[] = $_GET['part_no']; }
            if (!empty($_GET['lot_no'])) { $wip_conditions[] = "lot_no = ?"; $params[] = $_GET['lot_no']; $parts_conditions[] = "lot_no = ?"; $parts_params[] = $_GET['lot_no']; }
            if (!empty($_GET['startDate'])) { $wip_conditions[] = "CAST(entry_time AS DATE) >= ?"; $params[] = $_GET['startDate']; $parts_conditions[] = "log_date >= ?"; $parts_params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $wip_conditions[] = "CAST(entry_time AS DATE) <= ?"; $params[] = $_GET['endDate']; $parts_conditions[] = "log_date <= ?"; $parts_params[] = $_GET['endDate']; }

            $wipWhereClause = $wip_conditions ? "WHERE " . implode(" AND ", $wip_conditions) : "";
            $partsWhereClause = $parts_conditions ? "WHERE " . implode(" AND ", $parts_conditions) : "";

            $sql = "WITH TotalIn AS (SELECT part_no, line, SUM(quantity_in) AS total_in FROM WIP_ENTRIES $wipWhereClause GROUP BY part_no, line), TotalOut AS (SELECT part_no, line, SUM(count_value) AS total_out FROM PARTS " . ($partsWhereClause ? $partsWhereClause . " AND count_type = 'FG'" : "WHERE count_type = 'FG'") . " GROUP BY part_no, line) SELECT ISNULL(tin.part_no, tout.part_no) AS part_no, ISNULL(tin.line, tout.line) AS line, ISNULL(tin.total_in, 0) AS total_in, ISNULL(tout.total_out, 0) AS total_out, (ISNULL(tout.total_out, 0) - ISNULL(tin.total_in, 0)) AS variance FROM TotalIn tin FULL JOIN TotalOut tout ON tin.part_no = tout.part_no AND tin.line = tout.line ORDER BY part_no, line;";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_merge($params, $parts_params));
            $report_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'report' => $report_data]);
            break;
            
        case 'get_wip_history':
            $params = []; $wip_conditions = [];
            if (!empty($_GET['line'])) { $wip_conditions[] = "line = ?"; $params[] = $_GET['line']; }
            if (!empty($_GET['part_no'])) { $wip_conditions[] = "part_no = ?"; $params[] = $_GET['part_no']; }
            if (!empty($_GET['lot_no'])) { $wip_conditions[] = "lot_no = ?"; $params[] = $_GET['lot_no']; }
            if (!empty($_GET['startDate'])) { $wip_conditions[] = "CAST(entry_time AS DATE) >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $wip_conditions[] = "CAST(entry_time AS DATE) <= ?"; $params[] = $_GET['endDate']; }
            
            $wipWhereClause = $wip_conditions ? "WHERE " . implode(" AND ", $wip_conditions) : "";
            $history_sql = "SELECT * FROM WIP_ENTRIES AS wip $wipWhereClause ORDER BY entry_time DESC";
            $history_stmt = $pdo->prepare($history_sql);
            $history_stmt->execute($params);
            $history_data = $history_stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'history' => $history_data]);
            break;

        case 'update_wip_entry':
            $required = ['entry_id', 'entry_time', 'line', 'part_no', 'quantity_in'];
            foreach ($required as $field) {
                if (empty($input[$field])) { throw new Exception("Missing required field: " . $field); }
            }

            // --- ส่วนที่เพิ่มเข้ามา ---
            // 1. สร้าง Object DateTime จาก String ที่รับมา
            $entry_time_obj = new DateTime($input['entry_time']);
            // 2. แปลง Format ให้เป็น 'YYYY-MM-DD HH:mm:ss' ที่ SQL Server เข้าใจ
            $formatted_entry_time = $entry_time_obj->format('Y-m-d H:i:s');
            // -------------------------

            $sql = "UPDATE WIP_ENTRIES SET entry_time = ?, line = ?, part_no = ?, lot_no = ?, quantity_in = ?, remark = ? WHERE entry_id = ?";
            $params = [
                $formatted_entry_time, // ใช้ตัวแปรที่แปลง Format แล้ว
                $input['line'], 
                $input['part_no'], 
                $input['lot_no'] ?? null, 
                (int)$input['quantity_in'], 
                $input['remark'] ?? null, 
                (int)$input['entry_id']
            ];
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute($params) && $stmt->rowCount() > 0) {
                logAction($pdo, $currentUser, 'UPDATE WIP_ENTRY', $input['entry_id']);
                echo json_encode(['success' => true, 'message' => 'WIP Entry updated successfully.']);
            } else {
                echo json_encode(['success' => true, 'message' => 'No changes made or entry not found.']);
            }
            break;

        case 'delete_wip_entry':
            if (empty($input['entry_id'])) { throw new Exception("Entry ID is required."); }
            $id = (int)$input['entry_id'];
            $sql = "DELETE FROM WIP_ENTRIES WHERE entry_id = ?";
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute([$id]) && $stmt->rowCount() > 0) {
                logAction($pdo, $currentUser, 'DELETE WIP_ENTRY', $id);
                echo json_encode(['success' => true, 'message' => 'WIP Entry deleted successfully.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Entry not found or already deleted.']);
            }
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