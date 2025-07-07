<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../logger.php';
session_start();

// --- CSRF Protection & Input Handling (เหมือนไฟล์อื่นๆ) ---
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}
$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user']['username'] ?? 'system';

try {
    switch ($action) {
        case 'get_bom_components':
            $fg_part_no = $_GET['fg_part_no'] ?? '';
            if (empty($fg_part_no)) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $stmt = $pdo->prepare("SELECT * FROM PRODUCT_BOM WHERE fg_part_no = ? ORDER BY component_part_no");
            $stmt->execute([$fg_part_no]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'add_bom_component':
            $required = ['fg_part_no', 'component_part_no', 'quantity_required'];
            foreach($required as $field) {
                if (empty($input[$field])) throw new Exception("Missing field: $field");
            }
            $sql = "INSERT INTO PRODUCT_BOM (fg_part_no, component_part_no, quantity_required) VALUES (?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$input['fg_part_no'], $input['component_part_no'], (int)$input['quantity_required']]);
            echo json_encode(['success' => true, 'message' => 'Component added successfully.']);
            break;

        case 'delete_bom_component':
            $bom_id = $input['bom_id'] ?? 0;
            if (empty($bom_id)) throw new Exception("Missing bom_id.");
            $stmt = $pdo->prepare("DELETE FROM PRODUCT_BOM WHERE bom_id = ?");
            $stmt->execute([$bom_id]);
            echo json_encode(['success' => true, 'message' => 'Component deleted successfully.']);
            break;

        case 'get_all_fgs':
            // ดึงข้อมูล FG ที่มี BOM และ Line จากตาราง Parameter
            $sql = "
                SELECT
                    b.fg_part_no,
                    MAX(p.line) AS line,
                    NULL AS updated_by,
                    NULL AS updated_at
                FROM (SELECT DISTINCT fg_part_no FROM PRODUCT_BOM) b
                LEFT JOIN IOT_TOOLBOX_PARAMETER p ON b.fg_part_no = p.part_no
                GROUP BY b.fg_part_no
                ORDER BY b.fg_part_no;
            ";
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'delete_full_bom':
            $fg_part_no = $input['fg_part_no'] ?? '';
            if (empty($fg_part_no)) throw new Exception("Missing fg_part_no.");
            
            $stmt = $pdo->prepare("DELETE FROM PRODUCT_BOM WHERE fg_part_no = ?");
            $stmt->execute([$fg_part_no]);
            
            // Log การทำงาน
            logAction($pdo, $currentUser, 'DELETE FULL BOM', $fg_part_no);
            echo json_encode(['success' => true, 'message' => 'BOM for ' . $fg_part_no . ' has been deleted.']);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid BOM action.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("BOM Manager Error: " . $e->getMessage());
}
?>