<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../logger.php';

//-- ป้องกัน CSRF สำหรับ Request ที่ไม่ใช่ GET --
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

// =================================================================
// DEVELOPMENT SWITCH
$is_development = true; 
$parts_table = $is_development ? 'PARTS_TEST' : 'PARTS';
$param_table = $is_development ? 'PARAMETER_TEST' : 'PARAMETER';
$wip_table = 'WIP_ENTRIES'; 

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'log_wip_entry':
            // This case remains unchanged from the original
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

            $checkSql = "SELECT COUNT(*) FROM {$param_table} WHERE part_no = ? AND model = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$part_no, $model]);
            if ($checkStmt->fetchColumn() == 0) {
                throw new Exception("This Part No. does not exist for the specified Model in the PARAMETER table.");
            }

            $sql = "INSERT INTO {$wip_table} (model, line, lot_no, part_no, quantity_in, operator, remark) VALUES (?, ?, ?, ?, ?, ?, ?)";
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
                $detail = "Model: {$model}, Part: {$part_no}, Lot No: {$lot_no}, Qty: {$quantity_in}";
                logAction($pdo, $currentUser['username'], 'WIP_IN', $line, $detail);
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

            // --- MODIFICATION START ---
            // Replace the old, custom permission logic with the new central function.
            // Note that the owner column is 'operator' (username), not 'operator_id'.
            enforceRecordPermission($pdo, $wip_table, $entry_id, 'entry_id', 'operator');
            // --- MODIFICATION END ---

            // Secondary check for supervisors changing the line
            if (hasRole(['supervisor', 'admin', 'creator'])) {
                $stmt = $pdo->prepare("SELECT line FROM {$wip_table} WHERE entry_id = ?");
                $stmt->execute([$entry_id]);
                $entry = $stmt->fetch();
                if ($entry && $input['line'] !== $entry['line']) {
                    enforceLinePermission($input['line']);
                }
            }
            
            $entry_time_obj = new DateTime($input['entry_time']);
            $formatted_entry_time = $entry_time_obj->format('Y-m-d H:i:s');
            
            $sql = "UPDATE {$wip_table} SET entry_time = ?, model = ?, line = ?, part_no = ?, lot_no = ?, quantity_in = ?, remark = ? WHERE entry_id = ?";
            $params = [
                $formatted_entry_time,
                strtoupper(trim($input['model'])),
                strtoupper(trim($input['line'])),
                strtoupper(trim($input['part_no'])),
                strtoupper(trim($input['lot_no'] ?? null)),
                (int)$input['quantity_in'],
                $input['remark'] ?? null,
                $entry_id
            ];
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute($params)) {
                $detail = "Updated WIP ID: {$entry_id} by {$currentUser['username']}";
                logAction($pdo, $currentUser['username'], 'UPDATE_WIP', $input['line'], $detail);
                echo json_encode(['success' => true, 'message' => 'WIP Entry updated successfully.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'No changes made or entry not found.']);
            }
            break;

        case 'delete_wip_entry':
            if (empty($input['entry_id'])) { throw new Exception("Entry ID is required."); }
            $id = (int)$input['entry_id'];

            // --- MODIFICATION START ---
            // Use the central permission function here as well.
            enforceRecordPermission($pdo, $wip_table, $id, 'entry_id', 'operator');
            // --- MODIFICATION END ---

            $stmt = $pdo->prepare("SELECT * FROM {$wip_table} WHERE entry_id = ?");
            $stmt->execute([$id]);
            $entryToDelete = $stmt->fetch();
            if (!$entryToDelete) {
                throw new Exception("WIP Entry not found after permission check.");
            }

            $sql = "DELETE FROM {$wip_table} WHERE entry_id = ?";
            $stmt = $pdo->prepare($sql);
            if ($stmt->execute([$id]) && $stmt->rowCount() > 0) {
                $detail = "Deleted WIP ID: {$id} | Model: {$entryToDelete['model']}, Part: {$entryToDelete['part_no']}";
                logAction($pdo, $currentUser['username'], 'DELETE_WIP', $entryToDelete['line'], $detail);
                echo json_encode(['success' => true, 'message' => 'WIP Entry deleted successfully.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Entry not found or already deleted.']);
            }
            break;

        case 'get_wip_report':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;

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

            $countSql = "
                SELECT COUNT(*) FROM (
                    SELECT ISNULL(tin.part_no, tout.part_no) AS part_no
                    FROM 
                        (SELECT DISTINCT part_no, line, model FROM {$wip_table} wip $wipWhereClause) tin 
                    FULL JOIN 
                        (SELECT DISTINCT part_no, line, model FROM {$parts_table} $partsWhereClause) tout 
                        ON tin.part_no = tout.part_no AND tin.line = tout.line AND tin.model = tout.model
                ) AS FullData
            ";
            $totalStmt = $pdo->prepare($countSql);
            $totalStmt->execute(array_merge($params, $parts_params));
            $total = (int)$totalStmt->fetchColumn();
            
            $dataSql = "
                WITH TotalIn AS (
                    SELECT part_no, line, model, SUM(quantity_in) AS total_in FROM {$wip_table} wip $wipWhereClause GROUP BY part_no, line, model
                ), TotalOut AS (
                    SELECT part_no, line, model, SUM(count_value) AS total_out FROM {$parts_table} $partsWhereClause AND count_type <> 'BOM-ISSUE' GROUP BY part_no, line, model
                ), FullData AS (
                    SELECT 
                        ISNULL(tin.part_no, tout.part_no) AS part_no, 
                        ISNULL(tin.line, tout.line) AS line, 
                        ISNULL(tin.model, tout.model) as model,
                        p.part_description, 
                        ISNULL(tin.total_in, 0) AS total_in, 
                        ISNULL(tout.total_out, 0) AS total_out
                    FROM TotalIn tin 
                    FULL JOIN TotalOut tout ON tin.part_no = tout.part_no AND tin.line = tout.line AND tin.model = tout.model
                    LEFT JOIN {$param_table} p ON ISNULL(tin.line, tout.line) = p.line AND ISNULL(tin.model, tout.model) = p.model AND ISNULL(tin.part_no, tout.part_no) = p.part_no
                ), NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY line, model, part_no) as RowNum
                    FROM FullData
                )
                SELECT part_no, line, model, part_description, total_in, total_out, (total_out - total_in) as variance
                FROM NumberedRows
                WHERE RowNum > ? AND RowNum <= ?;
            ";

            $paginationParams = array_merge($params, $parts_params, [$startRow, $startRow + $limit]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $report_data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'page' => $page, 'limit' => $limit, 'total' => $total, 'data' => $report_data]);
            break;

        case 'get_wip_report_by_lot':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;

            $params = [];
            $conditions = [];
            
            if ($currentUser['role'] === 'supervisor') {
                $conditions[] = "MasterLots.line = ?";
                $params[] = $currentUser['line'];
            }

            if (!empty($_GET['line'])) { $conditions[] = "MasterLots.line = ?"; $params[] = $_GET['line']; }
            if (!empty($_GET['part_no'])) { $conditions[] = "MasterLots.part_no = ?"; $params[] = $_GET['part_no']; }
            if (!empty($_GET['model'])) { $conditions[] = "MasterLots.model = ?"; $params[] = $_GET['model']; }
            if (!empty($_GET['lot_no'])) { $conditions[] = "MasterLots.lot_no LIKE ?"; $params[] = "%".$_GET['lot_no']."%"; }
            
            $date_params_wip = [];
            if (!empty($_GET['startDate'])) { $date_params_wip[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $date_params_wip[] = $_GET['endDate']; }
            
            $date_params_parts = [];
            if (!empty($_GET['startDate'])) { $date_params_parts[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $date_params_parts[] = $_GET['endDate']; }

            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";
            $wipDateWhere = !empty($_GET['startDate']) || !empty($_GET['endDate']) ? "WHERE " . implode(" AND ", array_merge(
                !empty($_GET['startDate']) ? ["CAST(entry_time AS DATE) >= ?"] : [],
                !empty($_GET['endDate']) ? ["CAST(entry_time AS DATE) <= ?"] : []
            )) : "";
            $partsDateWhere = !empty($_GET['startDate']) || !empty($_GET['endDate']) ? "WHERE " . implode(" AND ", array_merge(
                !empty($_GET['startDate']) ? ["log_date >= ?"] : [],
                !empty($_GET['endDate']) ? ["log_date <= ?"] : []
            )) : "";

            // ===== SQL ที่แก้ไขใหม่ทั้งหมด =====
            
            // 1. SQL สำหรับนับจำนวนทั้งหมด
            $countSql = "
                WITH 
                MasterLots AS (
                    SELECT DISTINCT line, model, part_no, lot_no FROM WIP_ENTRIES
                    UNION
                    SELECT DISTINCT line, model, part_no, 
                        CASE WHEN PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) > 0 THEN LEFT(lot_no, PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) - 1) ELSE lot_no END 
                    FROM PARTS WHERE lot_no IS NOT NULL AND lot_no != ''
                ),
                TotalIn AS (
                    SELECT line, model, part_no, lot_no, SUM(ISNULL(quantity_in, 0)) as total_in
                    FROM WIP_ENTRIES $wipDateWhere GROUP BY line, model, part_no, lot_no
                ),
                TotalOut AS (
                    SELECT line, model, part_no,
                        CASE WHEN PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) > 0 THEN LEFT(lot_no, PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) - 1) ELSE lot_no END AS base_lot_no,
                        SUM(ISNULL(count_value, 0)) as total_out
                    FROM PARTS $partsDateWhere GROUP BY line, model, part_no, CASE WHEN PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) > 0 THEN LEFT(lot_no, PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) - 1) ELSE lot_no END
                ),
                FinalResult AS (
                    SELECT 
                        MasterLots.lot_no,
                        (ISNULL(to_out.total_out, 0) - ISNULL(ti.total_in, 0)) as variance,
                        ISNULL(ti.total_in, 0) as total_in,
                        ISNULL(to_out.total_out, 0) as total_out
                    FROM MasterLots
                    LEFT JOIN TotalIn ti ON MasterLots.line = ti.line AND MasterLots.model = ti.model AND MasterLots.part_no = ti.part_no AND MasterLots.lot_no = ti.lot_no
                    LEFT JOIN TotalOut to_out ON MasterLots.line = to_out.line AND MasterLots.model = to_out.model AND MasterLots.part_no = to_out.part_no AND MasterLots.lot_no = to_out.base_lot_no
                    $whereClause
                )
                SELECT COUNT(*) FROM FinalResult WHERE variance != 0 OR total_in != 0 OR total_out != 0
            ";
            $totalStmt = $pdo->prepare($countSql);
            $totalStmt->execute(array_merge($date_params_wip, $date_params_parts, $params));
            $total = (int)$totalStmt->fetchColumn();

            // 2. SQL สำหรับดึงข้อมูลแบบแบ่งหน้า
            $dataSql = "
                WITH 
                MasterLots AS (
                    SELECT DISTINCT line, model, part_no, lot_no FROM WIP_ENTRIES
                    UNION
                    SELECT DISTINCT line, model, part_no, 
                        CASE WHEN PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) > 0 THEN LEFT(lot_no, PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) - 1) ELSE lot_no END 
                    FROM PARTS WHERE lot_no IS NOT NULL AND lot_no != ''
                ),
                TotalIn AS (
                    SELECT line, model, part_no, lot_no, SUM(ISNULL(quantity_in, 0)) as total_in
                    FROM WIP_ENTRIES $wipDateWhere GROUP BY line, model, part_no, lot_no
                ),
                TotalOut AS (
                    SELECT line, model, part_no,
                        CASE WHEN PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) > 0 THEN LEFT(lot_no, PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) - 1) ELSE lot_no END AS base_lot_no,
                        SUM(ISNULL(count_value, 0)) as total_out
                    FROM PARTS $partsDateWhere GROUP BY line, model, part_no, CASE WHEN PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) > 0 THEN LEFT(lot_no, PATINDEX('%-[0-9][0-9][0-9][0-9][0-9][0-9]-%', lot_no) - 1) ELSE lot_no END
                ),
                FinalResult AS (
                    SELECT 
                        MasterLots.line, MasterLots.model, MasterLots.part_no, MasterLots.lot_no,
                        p.part_description,
                        ISNULL(ti.total_in, 0) as total_in, 
                        ISNULL(to_out.total_out, 0) as total_out,
                        -- ========== แก้ไขสูตรการคำนวณ Variance ==========
                        (ISNULL(to_out.total_out, 0) - ISNULL(ti.total_in, 0)) as variance
                    FROM MasterLots
                    LEFT JOIN TotalIn ti ON MasterLots.line = ti.line AND MasterLots.model = ti.model AND MasterLots.part_no = ti.part_no AND MasterLots.lot_no = ti.lot_no
                    LEFT JOIN TotalOut to_out ON MasterLots.line = to_out.line AND MasterLots.model = to_out.model AND MasterLots.part_no = to_out.part_no AND MasterLots.lot_no = to_out.base_lot_no
                    LEFT JOIN PARAMETER p ON MasterLots.line = p.line AND MasterLots.model = p.model AND MasterLots.part_no = p.part_no
                    $whereClause
                ),
                NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY line, model, part_no, lot_no) as RowNum
                    FROM FinalResult
                    WHERE variance != 0 OR total_in != 0 OR total_out != 0
                )
                SELECT * FROM NumberedRows WHERE RowNum > ? AND RowNum <= ?;
            ";

            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute(array_merge($date_params_wip, $date_params_parts, $params, [$startRow, $startRow + $limit]));
            $report_data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'page' => $page, 'limit' => $limit, 'total' => $total, 'data' => $report_data]);
            break;
            
        case 'get_wip_history':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;
            
            $params = [];
            $wip_conditions = [];
            if ($currentUser['role'] === 'supervisor') {
                $wip_conditions[] = "line = ?";
                $params[] = $currentUser['line'];
            }

            if (!empty($_GET['line'])) { $wip_conditions[] = "line = ?"; $params[] = $_GET['line']; }
            if (!empty($_GET['part_no'])) { $wip_conditions[] = "part_no = ?"; $params[] = $_GET['part_no']; }
            if (!empty($_GET['model'])) { $wip_conditions[] = "model = ?"; $params[] = $_GET['model']; }
            if (!empty($_GET['lot_no'])) { $wip_conditions[] = "lot_no = ?"; $params[] = $_GET['lot_no']; }
            if (!empty($_GET['startDate'])) { $wip_conditions[] = "CAST(entry_time AS DATE) >= ?"; $params[] = $_GET['startDate']; }
            if (!empty($_GET['endDate'])) { $wip_conditions[] = "CAST(entry_time AS DATE) <= ?"; $params[] = $_GET['endDate']; }
            
            $whereClause = $wip_conditions ? "WHERE " . implode(" AND ", $wip_conditions) : "";
            
            // 1. นับจำนวนทั้งหมด
            $totalSql = "SELECT COUNT(*) FROM WIP_ENTRIES $whereClause";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetchColumn();

            // 2. ดึงข้อมูลแบบแบ่งหน้า
            $dataSql = "
                SELECT * FROM (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY entry_time DESC, entry_id DESC) as RowNum
                    FROM WIP_ENTRIES
                    $whereClause
                ) AS NumberedRows 
                WHERE RowNum > ? AND RowNum <= ?
            ";
            $paginationParams = array_merge($params, [$startRow, $startRow + $limit]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $history_data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            // 3. ดึงข้อมูลสรุป (ส่วนนี้ไม่แบ่งหน้า)
            $summary_sql = "SELECT line, model, part_no, SUM(quantity_in) as total_quantity_in FROM WIP_ENTRIES wip $whereClause GROUP BY line, model, part_no ORDER BY line, model, part_no";
            $summary_stmt = $pdo->prepare($summary_sql);
            $summary_stmt->execute($params);
            $summary_data = $summary_stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'page' => $page, 'limit' => $limit, 'total' => $total, 'data' => $history_data, 'history_summary' => $summary_data]);
            break;

        case 'adjust_stock':
            // This action writes to the PARTS table, so it needs modification.
            $pdo->beginTransaction();
            try {
                $required = ['part_no', 'line', 'model', 'system_count', 'physical_count'];
                foreach ($required as $field) {
                    if (!isset($input[$field])) { throw new Exception("Missing required field: " . $field); }
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
                    echo json_encode(['success' => true, 'message' => 'No adjustment needed.']);
                    $pdo->commit();
                    exit;
                }

                $adjustment_type = $variance > 0 ? 'ADJUST-IN' : 'ADJUST-OUT';
                $adjustment_value = abs($variance);

                // --- MODIFIED: Insert into the correct parts table ---
                $sql = "INSERT INTO {$parts_table} (log_date, log_time, line, model, part_no, count_type, count_value, note, operator_id) VALUES (GETDATE(), GETDATE(), ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $params = [
                    $line, $model, $part_no,
                    $adjustment_type, $adjustment_value, $note,
                    $currentUser['id'] // Also log who did the adjustment
                ];
                
                $stmt->execute($params);
                $log_detail = "Part: {$part_no}, Model: {$model}, System: {$system_count}, Physical: {$physical_count}, Var: {$variance}";
                logAction($pdo, $currentUser['username'], 'STOCK_ADJUST', $line, $log_detail);
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Stock adjusted successfully.']);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) { $pdo->rollBack(); }
                throw $e;
            }
            break;

        case 'get_stock_count':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startRow = ($page - 1) * $limit;

            $param_conditions = [];
            $param_params = [];
            if (!empty($_GET['line'])) { $param_conditions[] = "p.line = ?"; $param_params[] = $_GET['line']; }
            if (!empty($_GET['part_no'])) { $param_conditions[] = "p.part_no LIKE ?"; $param_params[] = "%".$_GET['part_no']."%"; }
            if (!empty($_GET['model'])) { $param_conditions[] = "p.model LIKE ?"; $param_params[] = "%".$_GET['model']."%"; }
            $paramWhereClause = !empty($param_conditions) ? "WHERE " . implode(" AND ", $param_conditions) : "";
            
            $countSql = "SELECT COUNT(*) FROM {$param_table} p $paramWhereClause";
            $totalStmt = $pdo->prepare($countSql);
            $totalStmt->execute($param_params);
            $total = (int)$totalStmt->fetchColumn();

            $dataSql = "
                WITH 
                TotalWipIn AS (
                    SELECT line, model, part_no, SUM(ISNULL(quantity_in, 0)) as total FROM {$wip_table} GROUP BY line, model, part_no
                ),
                TotalAdjustIn AS (
                    SELECT line, model, part_no, SUM(ISNULL(count_value, 0)) as total FROM {$parts_table} WHERE count_type = 'ADJUST-IN' GROUP BY line, model, part_no
                ),
                TotalAdjustOut AS (
                    SELECT line, model, part_no, SUM(ISNULL(count_value, 0)) as total FROM {$parts_table} WHERE count_type = 'ADJUST-OUT' GROUP BY line, model, part_no
                ),
                TotalProductionOut AS (
                    SELECT line, model, part_no, SUM(ISNULL(count_value, 0)) as total FROM {$parts_table} WHERE count_type NOT LIKE 'ADJUST%' GROUP BY line, model, part_no
                ),
                FinalResult AS (
                    SELECT
                        p.line, p.model, p.part_no, p.part_description,
                        (ISNULL(wip_in.total, 0) + ISNULL(adj_in.total, 0)) AS total_in,
                        (ISNULL(prod_out.total, 0) + ISNULL(adj_out.total, 0)) AS total_out
                    FROM {$param_table} p
                    LEFT JOIN TotalWipIn wip_in ON p.line = wip_in.line AND p.model = wip_in.model AND p.part_no = wip_in.part_no
                    LEFT JOIN TotalAdjustIn adj_in ON p.line = adj_in.line AND p.model = adj_in.model AND p.part_no = adj_in.part_no
                    LEFT JOIN TotalAdjustOut adj_out ON p.line = adj_out.line AND p.model = adj_out.model AND p.part_no = adj_out.part_no
                    LEFT JOIN TotalProductionOut prod_out ON p.line = prod_out.line AND p.model = prod_out.model AND p.part_no = prod_out.part_no
                    $paramWhereClause
                ),
                NumberedRows AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY line, model, part_no) as RowNum
                    FROM FinalResult
                )
                SELECT line, model, part_no, part_description, total_in, total_out, (total_in - total_out) AS variance 
                FROM NumberedRows 
                WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $paginationParams = array_merge($param_params, [$startRow, $startRow + $limit]);
            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $stock_data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'page' => $page, 'limit' => $limit, 'total' => $total, 'data' => $stock_data]);
            break;

        case 'get_wip_drilldown_details':
            // 1. รับค่า Parameter ที่จำเป็นจาก Frontend (เหมือนเดิม)
            $line = $_GET['line'] ?? '';
            $model = $_GET['model'] ?? '';
            $part_no = $_GET['part_no'] ?? '';
            $lot_no = $_GET['lot_no'] ?? null;
            $startDate = $_GET['startDate'] ?? null;
            $endDate = $_GET['endDate'] ?? null;

            if (empty($line) || empty($model) || empty($part_no)) {
                throw new Exception("Line, Model, and Part No. are required for drill-down.");
            }
            
            enforceLinePermission($line);

            // 2. ดึงข้อมูลฝั่งขาเข้า (IN) จากตาราง WIP_ENTRIES (โค้ดส่วนนี้ถูกต้องแล้ว)
            $in_sql = "
                SELECT entry_time, lot_no, quantity_in, operator 
                FROM WIP_ENTRIES 
                WHERE line = ? AND model = ? AND part_no = ?
            ";
            $in_params = [$line, $model, $part_no];
            
            if (!empty($lot_no)) {
                $in_sql .= " AND lot_no = ?";
                $in_params[] = $lot_no;
            }
            if (!empty($startDate)) {
                $in_sql .= " AND CAST(entry_time AS DATE) >= ?";
                $in_params[] = $startDate;
            }
            if (!empty($endDate)) {
                $in_sql .= " AND CAST(entry_time AS DATE) <= ?";
                $in_params[] = $endDate;
            }
            $in_sql .= " ORDER BY entry_time DESC";
            $in_stmt = $pdo->prepare($in_sql);
            $in_stmt->execute($in_params);
            $in_records = $in_stmt->fetchAll(PDO::FETCH_ASSOC);
            // 3. ดึงข้อมูลฝั่งขาออก (OUT) จากตาราง PARTS (โค้ดชุดเดียวที่ถูกต้อง)
            $out_sql = "
                SELECT log_date, CONVERT(varchar(8), log_time, 108) AS log_time, lot_no, count_value, count_type 
                FROM PARTS 
                WHERE line = ? AND model = ? AND part_no = ? AND count_type <> 'ADJUST-IN'
            ";
            $out_params = [$line, $model, $part_no];
            
            if (!empty($lot_no)) {
                $out_sql .= " AND (lot_no = ? OR lot_no LIKE ?)";
                $out_params[] = $lot_no;
                $out_params[] = $lot_no . '-%';
            }
            if (!empty($startDate)) {
                $out_sql .= " AND log_date >= ?";
                $out_params[] = $startDate;
            }
            if (!empty($endDate)) {
                $out_sql .= " AND log_date <= ?";
                $out_params[] = $endDate;
            }
            $out_sql .= " ORDER BY log_date DESC, log_time DESC";

            $out_stmt = $pdo->prepare($out_sql);
            $out_stmt->execute($out_params);
            $out_records = $out_stmt->fetchAll(PDO::FETCH_ASSOC);

            // 4. ส่งข้อมูลทั้งหมดกลับไปเป็น JSON (เหมือนเดิม)
            echo json_encode([
                'success' => true,
                'data' => [
                    'in_records' => $in_records,
                    'out_records' => $out_records
                ]
            ]);
            break;

        case 'search_active_lots':
            $part_no = $_GET['part_no'] ?? '';
            $line = $_GET['line'] ?? '';
            $term = $_GET['term'] ?? '';

            if (empty($part_no) || empty($line)) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }

            $params = [$part_no, $line];
            $lot_condition = "";
            if (!empty($term)) {
                $lot_condition = " AND wip.lot_no LIKE ?";
                $params[] = '%' . $term . '%';
            }

            $sql = "
                WITH TotalOutByLot AS (
                    SELECT 
                        lot_no, 
                        SUM(ISNULL(count_value, 0)) as total_out
                    FROM PARTS
                    WHERE lot_no IS NOT NULL AND lot_no != ''
                    GROUP BY lot_no
                )
                SELECT TOP 20 wip.lot_no 
                FROM WIP_ENTRIES wip
                LEFT JOIN TotalOutByLot o ON wip.lot_no = o.lot_no
                WHERE 
                    wip.part_no = ? 
                    AND wip.line = ?
                    AND (wip.quantity_in - ISNULL(o.total_out, 0)) > 0
                    $lot_condition
                GROUP BY wip.lot_no
                ORDER BY wip.lot_no;
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $lots = $stmt->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode(['success' => true, 'data' => $lots]);
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