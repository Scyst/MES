<?php
// เรายังคงเปิดการแสดง Error ไว้เพื่อตรวจสอบในขั้นสุดท้าย
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../logger.php';
session_start();

// --- CSRF Protection & Input Handling ---
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
        // ** FIXED: แก้ไข case นี้ให้กลับไปทำหน้าที่ 'อ่าน' ข้อมูลเหมือนเดิม **
        case 'get_bom_components':
            $fg_part_no = $_GET['fg_part_no'] ?? '';
            if (empty($fg_part_no)) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $stmt = $pdo->prepare("SELECT * FROM PRODUCT_BOM WHERE fg_part_no = ? ORDER BY component_part_no");
            $stmt->execute([$fg_part_no]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // ** FIXED: โค้ดส่วน 'เพิ่ม' ข้อมูลกลับมาอยู่ที่ case นี้ **
        case 'add_bom_component':
            $fg_part_no = $input['fg_part_no'] ?? '';
            $component_part_no = $input['component_part_no'] ?? '';
            $quantity_required = $input['quantity_required'] ?? 0;

            if (empty($fg_part_no) || empty($component_part_no) || empty($quantity_required)) {
                throw new Exception("Missing required fields.");
            }
            if ($fg_part_no === $component_part_no) {
                throw new Exception("Finished Good and Component cannot be the same part.");
            }

            // Validation (โค้ดส่วนนี้ถูกต้องแล้ว)
            $validationSql = "SELECT (SELECT model FROM PARAMETER WHERE part_no = ?) AS fg_model, (SELECT model FROM PARAMETER WHERE part_no = ?) AS component_model";
            $valStmt = $pdo->prepare($validationSql);
            $valStmt->execute([$fg_part_no, $component_part_no]);
            $models = $valStmt->fetch(PDO::FETCH_ASSOC);

            if (!$models['fg_model']) throw new Exception("Finished Good part ($fg_part_no) does not exist in Standard Parameters.");
            if (!$models['component_model']) throw new Exception("Component part ($component_part_no) does not exist in Standard Parameters.");
            if ($models['fg_model'] !== $models['component_model']) throw new Exception("Component's model ({$models['component_model']}) does not match FG's model ({$models['fg_model']}).");

            // Check for duplicates before inserting
            $checkSql = "SELECT COUNT(*) FROM PRODUCT_BOM WHERE fg_part_no = ? AND component_part_no = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$fg_part_no, $component_part_no]);
            if ($checkStmt->fetchColumn() > 0) {
                throw new Exception("This component ('$component_part_no') already exists in the BOM.");
            }

            // Insert data
            $sql = "INSERT INTO PRODUCT_BOM (fg_part_no, component_part_no, quantity_required) VALUES (?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$fg_part_no, $component_part_no, (int)$quantity_required]);
            
            logAction($pdo, $currentUser, 'ADD BOM COMPONENT', $fg_part_no, "Component: $component_part_no");
            echo json_encode(['success' => true, 'message' => 'Component added successfully.']);
            break;

        case 'delete_bom_component':
            $bom_id = $input['bom_id'] ?? 0;
            if (empty($bom_id)) throw new Exception("Missing bom_id.");
            $stmt = $pdo->prepare("DELETE FROM PRODUCT_BOM WHERE bom_id = ?");
            $stmt->execute([$bom_id]);
            logAction($pdo, $currentUser, 'DELETE BOM COMPONENT', "BOM_ID: $bom_id");
            echo json_encode(['success' => true, 'message' => 'Component deleted successfully.']);
            break;

        case 'get_all_fgs':
            $sql = "SELECT b.fg_part_no, MAX(p.line) AS line, NULL AS updated_by, NULL AS updated_at FROM (SELECT DISTINCT fg_part_no FROM PRODUCT_BOM) b LEFT JOIN PARAMETER p ON b.fg_part_no = p.part_no GROUP BY b.fg_part_no ORDER BY b.fg_part_no;";
            $stmt = $pdo->query($sql);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'delete_full_bom':
            $fg_part_no = $input['fg_part_no'] ?? '';
            if (empty($fg_part_no)) throw new Exception("Missing fg_part_no.");
            $stmt = $pdo->prepare("DELETE FROM PRODUCT_BOM WHERE fg_part_no = ?");
            $stmt->execute([$fg_part_no]);
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