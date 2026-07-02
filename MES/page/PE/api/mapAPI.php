<?php
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json');
requirePermission(['view_dashboard']);

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$uploadDir = __DIR__ . '/../uploads/pe_maps/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$mapFile = $uploadDir . 'floorplan.json';

try {
    switch ($action) {
        case 'save_map':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['map_data'])) {
                throw new Exception('No map data provided.');
            }
            
            // Save the JSON string
            file_put_contents($mapFile, $data['map_data']);
            
            echo json_encode([
                'success' => true,
                'message' => 'Map saved successfully.'
            ]);
            break;

        case 'load_map':
            if (file_exists($mapFile)) {
                $mapData = file_get_contents($mapFile);
                echo json_encode([
                    'success' => true,
                    'map_data' => $mapData
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Map file not found.',
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
