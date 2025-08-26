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
// DEVELOPMENT SWITCH
$is_development = true; // <-- ตั้งค่าที่นี่: true เพื่อใช้ตาราง Test, false เพื่อใช้ตารางจริง
$locations_table = $is_development ? 'LOCATIONS_TEST' : 'LOCATIONS';
// =================================================================

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'get_locations':
            $stmt = $pdo->query("SELECT * FROM {$locations_table} ORDER BY location_name ASC");
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $locations]);
            break;

        case 'save_location':
            $id = $input['location_id'] ?? 0;
            $name = trim($input['location_name'] ?? '');
            $description = trim($input['location_description'] ?? '');
            $is_active = !empty($input['is_active']) ? 1 : 0;

            if (empty($name)) {
                throw new Exception("Location name is required.");
            }

            if ($id > 0) {
                // Update existing location
                $sql = "UPDATE {$locations_table} SET location_name = ?, location_description = ?, is_active = ? WHERE location_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$name, $description, $is_active, $id]);
                logAction($pdo, $currentUser['username'], 'UPDATE LOCATION', $id, "Name: {$name}");
                echo json_encode(['success' => true, 'message' => 'Location updated successfully.']);
            } else {
                // Create new location
                $sql = "INSERT INTO {$locations_table} (location_name, location_description, is_active) VALUES (?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$name, $description, $is_active]);
                $newId = $pdo->lastInsertId();
                logAction($pdo, $currentUser['username'], 'CREATE LOCATION', $newId, "Name: {$name}");
                echo json_encode(['success' => true, 'message' => 'Location created successfully.']);
            }
            break;

        case 'delete_location':
            $id = $input['location_id'] ?? 0;
            if (!$id) {
                throw new Exception("Location ID is required.");
            }

            // Optional: Check if location is in use before deleting
            // For now, we will just delete it.

            $sql = "DELETE FROM {$locations_table} WHERE location_id = ?";
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