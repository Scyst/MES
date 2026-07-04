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
            $username = $_SESSION['user']['username'] ?? 'System';
            
            $stmt = $pdo->prepare("SELECT id FROM PE_IIOT_MAP_DATA WHERE id = 1");
            $stmt->execute();
            if ($stmt->fetch()) {
                $upd = $pdo->prepare("UPDATE PE_IIOT_MAP_DATA SET map_json = ?, updated_at = GETDATE(), updated_by = ? WHERE id = 1");
                $upd->execute([$mapJson, $username]);
            } else {
                $ins = $pdo->prepare("INSERT INTO PE_IIOT_MAP_DATA (id, map_json, updated_by) VALUES (1, ?, ?)");
                $ins->execute([$mapJson, $username]);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Map saved successfully.'
            ]);
            break;

        case 'load_map':
            $stmt = $pdo->prepare("SELECT map_json FROM PE_IIOT_MAP_DATA WHERE id = 1");
            $stmt->execute();
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
