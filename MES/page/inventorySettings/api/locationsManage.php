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
            // ⭐️ 1. แก้ไข: เพิ่ม location_type
            $stmt = $pdo->query("SELECT location_id, location_name, location_description, is_active, production_line, location_type FROM " . LOCATIONS_TABLE . " ORDER BY location_name");
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $locations]);
            break;

        case 'save_location':
            $id = $input['location_id'] ?? 0;
            $name = trim($input['location_name'] ?? '');
            $desc = trim($input['location_description'] ?? '');
            $active = filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN);
            $prod_line = !empty($input['production_line']) ? trim($input['production_line']) : null;
            
            // ⭐️ 2. แก้ไข: รับค่า location_type และตั้งค่า Default
            $location_type = !empty($input['location_type']) ? trim($input['location_type']) : 'WIP'; // ตั้งค่า Default เป็น 'WIP'

            if (empty($name)) {
                throw new Exception("Location name is required.");
            }
            
            // ⭐️ 3. แก้ไข: ตรวจสอบค่า location_type ที่อนุญาต (ทางเลือก แต่แนะนำ)
            $allowed_types = ['WIP', 'STORE', 'WAREHOUSE', 'SHIPPING'];
            if (!in_array($location_type, $allowed_types)) {
                throw new Exception("Invalid Location Type specified. Allowed types are: " . implode(', ', $allowed_types));
            }

            if ($id > 0) {
                // ⭐️ 4. แก้ไข: เพิ่ม location_type ใน SQL UPDATE
                $sql = "UPDATE " . LOCATIONS_TABLE . " SET location_name = ?, location_description = ?, is_active = ?, production_line = ?, location_type = ? WHERE location_id = ?";
                $params = [$name, $desc, $active, $prod_line, $location_type, $id];
                $message = 'Location updated successfully.';
                $logType = 'UPDATE LOCATION';
            } else {
                // ⭐️ 5. แก้ไข: เพิ่ม location_type ใน SQL INSERT
                $sql = "INSERT INTO " . LOCATIONS_TABLE . " (location_name, location_description, is_active, production_line, location_type) VALUES (?, ?, ?, ?, ?)";
                $params = [$name, $desc, $active, $prod_line, $location_type];
                $message = 'Location added successfully.';
                $logType = 'ADD LOCATION';
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            if ($id == 0) $id = $pdo->lastInsertId();
            logAction($pdo, $currentUser['username'], $logType, $id, "Name: {$name}, Type: {$location_type}");
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