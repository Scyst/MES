<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// (CSRF Token and variable setup)
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
        
        // ===== Schedules Management =====
        case 'read_schedules':
            $stmt = $pdo->prepare("EXEC dbo.sp_GetSchedules");
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'save_schedule':
             $stmt = $pdo->prepare("EXEC dbo.sp_SaveSchedule @id=?, @line=?, @shift_name=?, @start_time=?, @end_time=?, @planned_break_minutes=?, @is_active=?");
             $stmt->execute([
                 $input['id'] ?? 0,
                 $input['line'],
                 $input['shift_name'],
                 $input['start_time'],
                 $input['end_time'],
                 $input['planned_break_minutes'],
                 $input['is_active']
             ]);
             echo json_encode(['success' => true, 'message' => 'Schedule saved.']);
             break;

        case 'delete_schedule':
            $stmt = $pdo->prepare("EXEC dbo.sp_DeleteSchedule @id=?");
            $stmt->execute([$input['id'] ?? 0]);
            echo json_encode(['success' => true, 'message' => 'Schedule deleted.']);
            break;

        // ===== Data Health Check =====
        case 'health_check_parameters':
            // This case uses the new logic already, no change needed.
            if (defined('USE_NEW_OEE_CALCULATION') && USE_NEW_OEE_CALCULATION === true) {
                $sql = "
                    SELECT DISTINCT i.sap_no, i.part_no, i.part_description
                    FROM " . TRANSACTIONS_TABLE . " t
                    JOIN " . ITEMS_TABLE . " i ON t.parameter_id = i.item_id
                    WHERE t.transaction_type LIKE 'PRODUCTION_%' AND (i.planned_output IS NULL OR i.planned_output <= 0)
                    ORDER BY i.sap_no";
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
            } else {
                $stmt = $pdo->prepare("EXEC dbo.sp_GetMissingParameters");
                $stmt->execute();
            }
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid action specified in paraManage API.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    error_log("Error in paraManage.php: " . $e->getMessage());
}
?>