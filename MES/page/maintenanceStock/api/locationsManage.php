<?php
// page/inventorySettings/api/locationsManage.php

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

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

        case 'get_locations':
            $searchTerm = $_GET['search'] ?? '';
            $params = [];
            $whereClause = '';
            if (!empty($searchTerm)) {
                $whereClause = "WHERE location_name LIKE ? OR location_description LIKE ?";
                $params = ['%' . $searchTerm . '%', '%' . $searchTerm . '%'];
            }
            $sql = "SELECT * FROM " . LOCATIONS_TABLE . " {$whereClause} ORDER BY location_name ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $locations]);
            break;

        case 'save_location':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");
            $id = $input['location_id'] ?? 0;
            $is_active = isset($input['is_active']) && $input['is_active'] === 'on' ? 1 : 0;

            if ($id > 0) { // Update
                $sql = "UPDATE " . LOCATIONS_TABLE . " SET location_name = ?, location_description = ?, production_line = ?, is_active = ? WHERE location_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['location_name'], $input['location_description'], $input['production_line'], $is_active, $id]);
                $message = 'Location updated successfully.';
            } else { // Insert
                $sql = "INSERT INTO " . LOCATIONS_TABLE . " (location_name, location_description, production_line, is_active) VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['location_name'], $input['location_description'], $input['production_line'], $is_active]);
                $message = 'Location created successfully.';
            }
            logAction($pdo, $currentUser['username'], $id > 0 ? 'UPDATE_LOCATION' : 'CREATE_LOCATION', $id ?: $pdo->lastInsertId());
            echo json_encode(['success' => true, 'message' => $message]);
            break;
            
        case 'delete_location':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");
            $id = $input['location_id'] ?? 0;
            if (!$id) throw new Exception("Location ID is required.");
            
            // Soft delete
            $sql = "UPDATE " . LOCATIONS_TABLE . " SET is_active = 0 WHERE location_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            
            logAction($pdo, $currentUser['username'], 'DEACTIVATE_LOCATION', $id);
            echo json_encode(['success' => true, 'message' => 'Location has been deactivated.']);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Invalid action specified."]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>