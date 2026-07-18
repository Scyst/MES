<?php
require_once __DIR__ . '/../../components/init.php';
require_once __DIR__ . '/../../db.php';

header('Content-Type: application/json');
requirePermission(['view_dashboard']);

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $_REQUEST['action'] ?? $input['action'] ?? '';

try {
    switch ($action) {
        case 'save_map':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['map_data'])) {
                throw new Exception('No map data provided.');
            }
            
            $mapJson = $data['map_data'];
            $area_id = isset($data['area_id']) ? (int)$data['area_id'] : 1;
            $username = $_SESSION['user']['username'] ?? 'System';
            
            $stmt = $pdo->prepare("SELECT id FROM PE_IIOT_MAP_DATA WHERE id = ?");
            $stmt->execute([$area_id]);
            if ($stmt->fetch()) {
                $upd = $pdo->prepare("UPDATE PE_IIOT_MAP_DATA SET map_json = ?, updated_at = GETDATE(), updated_by = ? WHERE id = ?");
                $upd->execute([$mapJson, $username, $area_id]);
            } else {
                $ins = $pdo->prepare("INSERT INTO PE_IIOT_MAP_DATA (id, map_json, updated_by) VALUES (?, ?, ?)");
                $ins->execute([$area_id, $mapJson, $username]);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Map saved successfully.'
            ]);
            break;

        case 'load_map':
            $area_id = isset($_GET['area_id']) ? (int)$_GET['area_id'] : (isset($input['area_id']) ? (int)$input['area_id'] : 1);
            $stmt = $pdo->prepare("SELECT map_json FROM PE_IIOT_MAP_DATA WHERE id = ?");
            $stmt->execute([$area_id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($row) {
                echo json_encode([
                    'success' => true,
                    'map_data' => $row['map_json']
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Map data not found in database.',
                    'map_data' => null
                ]);
            }
            break;

        case 'get_inventory_balance':
            $loc_id = isset($_GET['location_id']) ? (int)$_GET['location_id'] : (isset($input['location_id']) ? (int)$input['location_id'] : 0);
            if ($loc_id <= 0) {
                echo json_encode(['success' => false, 'message' => 'Invalid location_id']);
                break;
            }
            $stmt = $pdo->prepare("SELECT SUM(quantity) as total_stock FROM INVENTORY_ONHAND WITH (NOLOCK) WHERE location_id = ?");
            $stmt->execute([$loc_id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $total_stock = $row ? (float)$row['total_stock'] : 0;
            
            echo json_encode(['success' => true, 'total_stock' => $total_stock]);
            break;

        case 'get_locations':
            $sql = "
                SELECT 
                    location_id, location_name, location_description, 
                    production_line, location_type, is_active
                FROM LOCATIONS WITH (NOLOCK) 
                ORDER BY is_active DESC, location_name ASC
            ";
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'save_location':
            // Require specific permissions for writing if necessary, or just rely on 'view_dashboard' up top
            $id = (int)($input['location_id'] ?? 0);
            $name = trim($input['location_name'] ?? '');
            $desc = trim($input['location_description'] ?? '');
            $line = trim($input['production_line'] ?? '');
            $type = trim($input['location_type'] ?? 'WIP');
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name)) {
                throw new Exception("Location Name is required.");
            }

            $checkSql = "SELECT location_id FROM LOCATIONS WITH (NOLOCK) WHERE location_name = ? AND location_id != ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$name, $id]);
            if ($checkStmt->fetchColumn()) {
                throw new Exception("ชื่อ Location นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น");
            }

            $pdo->beginTransaction();
            
            if ($id > 0) {
                $sql = "UPDATE LOCATIONS 
                        SET location_name = ?, location_description = ?, production_line = ?, 
                            location_type = ?, is_active = ? 
                        WHERE location_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$name, $desc, $line, $type, $is_active, $id]);
                $msg = 'Location updated successfully.';
            } else {
                $sql = "INSERT INTO LOCATIONS 
                        (location_name, location_description, production_line, location_type, is_active) 
                        VALUES (?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$name, $desc, $line, $type, $is_active]);
                $newId = $pdo->lastInsertId();
                $msg = 'Location created successfully.';
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => $msg]);
            break;

        default:
            throw new Exception("Unknown action: $action");
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
