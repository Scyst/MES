<?php
header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

// Hybrid Auth: checks permission code or fallback to administrative roles
if (!hasPermission('manage_locations') && !hasPermission('manage_system_settings') && !hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized Access.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (empty($_SERVER['HTTP_X_CSRF_TOKEN']) || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
$currentUser = $_SESSION['user'];

try {
    switch ($action) {
        case 'read':
        case 'get_locations':
            $sql = "
                SELECT 
                    location_id, location_name, location_description, 
                    production_line, location_type, is_active, zone_name
                FROM " . LOCATIONS_TABLE . " WITH (NOLOCK) 
                ORDER BY is_active DESC, location_name ASC
            ";
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'save':
        case 'save_location':
            $id = (int)($input['location_id'] ?? 0);
            $name = trim($input['location_name'] ?? '');
            $desc = trim($input['location_description'] ?? '');
            $line = trim($input['production_line'] ?? '');
            $type = trim($input['location_type'] ?? 'WIP');
            $zone = trim($input['zone_name'] ?? '');
            $is_active = isset($input['is_active']) ? (int)$input['is_active'] : 1;

            if (empty($name)) {
                throw new Exception("Location Name is required.");
            }

            $checkSql = "SELECT location_id FROM " . LOCATIONS_TABLE . " WITH (NOLOCK) WHERE location_name = ? AND location_id != ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$name, $id]);
            if ($checkStmt->fetchColumn()) {
                throw new Exception("ชื่อ Location นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น");
            }

            $pdo->beginTransaction();
            
            if ($id > 0) {
                $oldStmt = $pdo->prepare("SELECT * FROM " . LOCATIONS_TABLE . " WITH (NOLOCK) WHERE location_id = ?");
                $oldStmt->execute([$id]);
                $oldLocation = $oldStmt->fetch(PDO::FETCH_ASSOC);

                $sql = "UPDATE " . LOCATIONS_TABLE . " 
                        SET location_name = ?, location_description = ?, production_line = ?, 
                            location_type = ?, zone_name = ?, is_active = ? 
                        WHERE location_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$name, $desc, $line, $type, $zone, $is_active, $id]);
                
                writeLog($pdo, 'UPDATE_LOCATION', 'SYSTEM_SETTINGS', (string)$id, $oldLocation, $input, "Updated Location: $name");
                $msg = 'Location updated successfully.';
            } else {
                $sql = "INSERT INTO " . LOCATIONS_TABLE . " 
                        (location_name, location_description, production_line, location_type, zone_name, is_active) 
                        VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$name, $desc, $line, $type, $zone, $is_active]);
                $newId = $pdo->lastInsertId();
                
                writeLog($pdo, 'ADD_LOCATION', 'SYSTEM_SETTINGS', (string)$newId, null, $input, "Created Location: $name");
                $msg = 'Location created successfully.';
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => $msg]);
            break;

        case 'delete':
        case 'delete_location':
            $id = (int)($input['location_id'] ?? $_GET['location_id'] ?? 0);
            if ($id <= 0) {
                throw new Exception("Location ID is required.");
            }

            $oldStmt = $pdo->prepare("SELECT * FROM " . LOCATIONS_TABLE . " WITH (NOLOCK) WHERE location_id = ?");
            $oldStmt->execute([$id]);
            $oldLocation = $oldStmt->fetch(PDO::FETCH_ASSOC);

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE " . LOCATIONS_TABLE . " SET is_active = 0 WHERE location_id = ?");
            $stmt->execute([$id]);
            $locName = $oldLocation['location_name'] ?? $id;
            writeLog($pdo, 'DELETE_LOCATION', 'SYSTEM_SETTINGS', (string)$id, $oldLocation, ['is_active' => 0], "Deactivated Location: $locName");
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Location deactivated successfully.']);
            break;

        default:
            throw new Exception("Invalid Action requested.");
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
?>

