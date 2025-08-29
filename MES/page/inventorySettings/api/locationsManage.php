<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

// =================================================================
// DEVELOPMENT SWITCH (ส่วนนี้ถูกลบออก)
// =================================================================

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'get_locations':
            $stmt = $pdo->query("SELECT location_id, location_name, location_description, is_active, production_line FROM " . LOCATIONS_TABLE . " ORDER BY location_name");
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $locations]);
            break;

        case 'save_location':
            $id = $input['location_id'] ?? 0;
            $name = trim($input['location_name'] ?? '');
            $desc = trim($input['location_description'] ?? '');
            $active = filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN);
            $prod_line = !empty($input['production_line']) ? trim($input['production_line']) : null;
            if (empty($name)) {
                throw new Exception("Location name is required.");
            }

            if ($id > 0) {
                $sql = "UPDATE " . LOCATIONS_TABLE . " SET location_name = ?, location_description = ?, is_active = ?, production_line = ? WHERE location_id = ?";
                $params = [$name, $desc, $active, $prod_line, $id];
                $message = 'Location updated successfully.';
                $logType = 'UPDATE LOCATION';
            } else {
                $sql = "INSERT INTO " . LOCATIONS_TABLE . " (location_name, location_description, is_active, production_line) VALUES (?, ?, ?, ?)";
                $params = [$name, $desc, $active, $prod_line];
                $message = 'Location added successfully.';
                $logType = 'ADD LOCATION';
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            if ($id == 0) $id = $pdo->lastInsertId();
            logAction($pdo, $currentUser['username'], $logType, $id, "Name: {$name}");
            echo json_encode(['success' => true, 'message' => $message]);
            break;

        case 'delete_location':
            $id = $input['location_id'] ?? 0;
            if (!$id) {
                throw new Exception("Location ID is required.");
            }
            // *** แก้ไข: เปลี่ยนมาใช้ค่าคงที่ LOCATIONS_TABLE ***
            $sql = "DELETE FROM " . LOCATIONS_TABLE . " WHERE location_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                logAction($pdo, $currentUser['username'], 'DELETE LOCATION', $id);
                echo json_encode(['success' => true, 'message' => 'Location deleted successfully.']);
            } else {
                throw new Exception("Location not found or could not be deleted.");
            }
            break;
            
        default:
            http_response_code(400);
            throw new Exception("Invalid action specified.");
    }
} catch (PDOException $e) {
    http_response_code(500);
    // Check for unique constraint violation
    if ($e->getCode() == '23000') {
        echo json_encode(['success' => false, 'message' => "Error: Location name '{$input['location_name']}' already exists."]);
    } else {
        echo json_encode(['success' => false, 'message' => "Database error: " . $e->getMessage()]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>