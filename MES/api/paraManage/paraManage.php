<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../logger.php'; 
session_start(); 

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (
        !isset($_SERVER['HTTP_X_CSRF_TOKEN']) ||
        !isset($_SESSION['csrf_token']) ||
        !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])
    ) {
        http_response_code(403); // Forbidden
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed. Request rejected.']);
        exit;
    }
}

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);

try {
    $currentUser = $_SESSION['user']['username'] ?? 'system'; 

    switch ($action) {
        case 'read':
            $stmt = $pdo->query("SELECT * FROM IOT_TOOLBOX_PARAMETER ORDER BY updated_at DESC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$row) {
                if ($row['updated_at']) {
                    $row['updated_at'] = (new DateTime($row['updated_at']))->format('Y-m-d H:i:s');
                }
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'create':
            $sql = "INSERT INTO IOT_TOOLBOX_PARAMETER (line, model, part_no, sap_no, planned_output, updated_at) VALUES (?, ?, ?, ?, ?, GETDATE())";
            $params = [
                strtoupper($input['line']),
                strtoupper($input['model']),
                strtoupper($input['part_no']),
                strtoupper($input['sap_no'] ?? ''),
                (int)$input['planned_output']
            ];
            $stmt = $pdo->prepare($sql);
            $success = $stmt->execute($params);

            if ($success) {
                $detail = "{$params[0]}-{$params[1]}-{$params[2]}";
                logAction($pdo, $currentUser, 'CREATE PARAMETER', null, $detail);
            }

            echo json_encode(['success' => $success, 'message' => 'Parameter created.']);
            break;

        case 'update':
            $id = $input['id'] ?? null;
            if (!$id) throw new Exception("Missing ID");
            
            $stmt = $pdo->prepare("SELECT * FROM IOT_TOOLBOX_PARAMETER WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) throw new Exception("Parameter not found");

            $line = strtoupper($input['line'] ?? $row['line']);
            $model = strtoupper($input['model'] ?? $row['model']);
            $part_no = strtoupper($input['part_no'] ?? $row['part_no']);
            $sap_no = strtoupper($input['sap_no'] ?? $row['sap_no']);
            $planned_output = isset($input['planned_output']) ? (int)$input['planned_output'] : (int)$row['planned_output'];

            $updateSql = "UPDATE IOT_TOOLBOX_PARAMETER SET line = ?, model = ?, part_no = ?, sap_no = ?, planned_output = ?, updated_at = GETDATE() WHERE id = ?";
            $params = [$line, $model, $part_no, $sap_no, $planned_output, $id];
            $stmt = $pdo->prepare($updateSql);
            $success = $stmt->execute($params);

            if ($success) {
                $detail = "ID: $id, Data: {$line}-{$model}-{$part_no}";
                logAction($pdo, $currentUser, 'UPDATE PARAMETER', $id, $detail);
            }

            echo json_encode(["success" => $success, 'message' => 'Parameter updated.']);
            break;

        case 'delete':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing ID");

            $stmt = $pdo->prepare("DELETE FROM IOT_TOOLBOX_PARAMETER WHERE id = ?");
            $success = $stmt->execute([(int)$id]);
            
            if ($success && $stmt->rowCount() > 0) {
                 logAction($pdo, $currentUser, 'DELETE PARAMETER', $id);
            }

            echo json_encode(["success" => $success, 'message' => 'Parameter deleted.']);
            break;

        case 'bulk_import':
            // This logic remains correct.
            if (!is_array($input) || empty($input)) throw new Exception("Invalid data");
            
            $pdo->beginTransaction();
            
            $checkSql = "SELECT id FROM IOT_TOOLBOX_PARAMETER WHERE line = ? AND model = ? AND part_no = ?";
            $checkStmt = $pdo->prepare($checkSql);

            $updateSql = "UPDATE IOT_TOOLBOX_PARAMETER SET sap_no = ?, planned_output = ?, updated_at = GETDATE() WHERE id = ?";
            $updateStmt = $pdo->prepare($updateSql);

            $insertSql = "INSERT INTO IOT_TOOLBOX_PARAMETER (line, model, part_no, sap_no, planned_output, updated_at) VALUES (?, ?, ?, ?, ?, GETDATE())";
            $insertStmt = $pdo->prepare($insertSql);

            $imported = 0;
            foreach ($input as $row) {
                $line = strtoupper(trim($row['line'] ?? ''));
                $model = strtoupper(trim($row['model'] ?? ''));
                $part_no = strtoupper(trim($row['part_no'] ?? ''));
                $sap_no = strtoupper(trim($row['sap_no'] ?? ''));
                $planned_output = (int)($row['planned_output'] ?? 0);

                if (empty($line) || empty($model) || empty($part_no)) continue;

                $checkStmt->execute([$line, $model, $part_no]);
                $existing = $checkStmt->fetch();

                if ($existing) {
                    $updateStmt->execute([$sap_no, $planned_output, $existing['id']]);
                } else {
                    $insertStmt->execute([$line, $model, $part_no, $sap_no, $planned_output]);
                }
                $imported++;
            }

            $pdo->commit();
            logAction($pdo, $currentUser, 'BULK IMPORT PARAMETER', null, "Imported $imported rows");

            echo json_encode(["success" => true, "imported" => $imported, "message" => "Imported $imported row(s) successfully."]);
            break;

        case 'read_schedules':
            $stmt = $pdo->prepare("EXEC dbo.sp_GetSchedules");
            $stmt->execute();
            $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $schedules]);
            break;

        case 'save_schedule':
            $stmt = $pdo->prepare("EXEC dbo.sp_SaveSchedule @id=?, @line=?, @shift_name=?, @start_time=?, @end_time=?, @planned_break_minutes=?, @is_active=?");
            $success = $stmt->execute([
                $input['id'] ?? 0,
                $input['line'],
                $input['shift_name'],
                $input['start_time'],
                $input['end_time'],
                $input['planned_break_minutes'],
                $input['is_active']
            ]);
            
            if ($success) {
                $actionType = ($input['id'] ?? 0) > 0 ? 'UPDATE SCHEDULE' : 'CREATE SCHEDULE';
                logAction($pdo, $currentUser, $actionType, $input['id'] ?? null, "{$input['line']}-{$input['shift_name']}");
            }
            
            echo json_encode(['success' => $success, 'message' => 'Schedule saved successfully.']);
            break;

        case 'delete_schedule':
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Missing Schedule ID");

            $stmt = $pdo->prepare("EXEC dbo.sp_DeleteSchedule @id=?");
            $success = $stmt->execute([(int)$id]);
            
            if ($success && $stmt->rowCount() > 0) {
                 logAction($pdo, $currentUser, 'DELETE SCHEDULE', $id);
            }
            
            echo json_encode(['success' => $success, 'message' => 'Schedule deleted.']);
            break;

        case 'health_check_parameters':
            // REVERTED LOGIC: Call the simple SP and return all data at once.
            $stmt = $pdo->prepare("EXEC dbo.sp_GetMissingParameters");
            $stmt->execute();
            $missingParams = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $missingParams]);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid action specified.");
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    error_log("Error in paraManage.php (Unified API): " . $e->getMessage());
}
?>
