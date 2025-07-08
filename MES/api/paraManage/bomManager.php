<?php
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
        // ** UPDATED: เพิ่มเงื่อนไข line และ model ในการค้นหา **
        case 'get_bom_components':
            $fg_part_no = $_GET['fg_part_no'] ?? '';
            $line = $_GET['line'] ?? '';
            $model = $_GET['model'] ?? '';

            if (empty($fg_part_no) || empty($line) || empty($model)) {
                throw new Exception("FG Part No, Line, and Model are required to get components.");
            }

            $stmt = $pdo->prepare("SELECT * FROM PRODUCT_BOM WHERE fg_part_no = ? AND line = ? AND model = ? ORDER BY component_part_no");
            $stmt->execute([$fg_part_no, $line, $model]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // ** UPDATED: เพิ่ม line, model, และ updated_by/at ในการบันทึก **
        case 'add_bom_component':
            $fg_part_no = $input['fg_part_no'] ?? '';
            $line = $input['line'] ?? '';
            $model = $input['model'] ?? '';
            $component_part_no = $input['component_part_no'] ?? '';
            $quantity_required = $input['quantity_required'] ?? 0;

            if (empty($fg_part_no) || empty($line) || empty($model) || empty($component_part_no) || empty($quantity_required)) {
                throw new Exception("Missing required fields.");
            }
            if ($fg_part_no === $component_part_no) {
                throw new Exception("Finished Good and Component cannot be the same part.");
            }

            // Validation: ตรวจสอบว่า Component อยู่ใน Model เดียวกันกับ FG
            $compCheckSql = "SELECT COUNT(*) FROM PARAMETER WHERE part_no = ? AND model = ?";
            $compCheckStmt = $pdo->prepare($compCheckSql);
            $compCheckStmt->execute([$component_part_no, $model]);
            if ($compCheckStmt->fetchColumn() == 0) {
                throw new Exception("Component part ($component_part_no) does not exist in model '$model'.");
            }
            
            // Insert data
            $sql = "INSERT INTO PRODUCT_BOM (fg_part_no, line, model, component_part_no, quantity_required, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, GETDATE())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$fg_part_no, $line, $model, $component_part_no, (int)$quantity_required, $currentUser]);
            
            logAction($pdo, $currentUser, 'ADD BOM COMPONENT', "$fg_part_no ($line/$model)", "Component: $component_part_no");
            echo json_encode(['success' => true, 'message' => 'Component added successfully.']);
            break;

        case 'delete_bom_component':
            $bom_id = $input['bom_id'] ?? 0;
            if (empty($bom_id)) {
                throw new Exception("Missing bom_id.");
            }

            // 1. ก่อนลบ ให้ค้นหาข้อมูลของ BOM group (part, line, model) เพื่อใช้อัปเดต timestamp
            $findSql = "SELECT fg_part_no, line, model FROM PRODUCT_BOM WHERE bom_id = ?";
            $findStmt = $pdo->prepare($findSql);
            $findStmt->execute([$bom_id]);
            $bom_group = $findStmt->fetch(PDO::FETCH_ASSOC);

            // 2. ทำการลบ Component ที่ต้องการ
            $deleteStmt = $pdo->prepare("DELETE FROM PRODUCT_BOM WHERE bom_id = ?");
            $deleteStmt->execute([$bom_id]);

            // 3. ตรวจสอบว่าการลบสำเร็จหรือไม่ ก่อนอัปเดต timestamp
            if ($deleteStmt->rowCount() > 0) {
                // อัปเดต timestamp ของ component ที่เหลือใน BOM group เดียวกัน
                if ($bom_group) {
                    $updateSql = "UPDATE PRODUCT_BOM SET updated_at = GETDATE(), updated_by = ? WHERE fg_part_no = ? AND line = ? AND model = ?";
                    $updateStmt = $pdo->prepare($updateSql);
                    $updateStmt->execute([$currentUser, $bom_group['fg_part_no'], $bom_group['line'], $bom_group['model']]);
                }
                
                // 4. บันทึก Log และส่งผลลัพธ์
                logAction($pdo, $currentUser, 'DELETE BOM COMPONENT', "BOM_ID: $bom_id");
                echo json_encode(['success' => true, 'message' => 'Component deleted successfully.']);
            } else {
                throw new Exception("Component with BOM ID $bom_id not found or could not be deleted.");
            }
            break;

        // ** UPDATED: แก้ไข SQL Query ให้ GROUP BY ครบทุก key และดึงข้อมูลล่าสุด **
        case 'get_all_fgs':
            $sql = "
                WITH RankedBOMs AS (
                    SELECT
                        fg_part_no, line, model, updated_at, updated_by,
                        ROW_NUMBER() OVER(PARTITION BY fg_part_no, line, model ORDER BY updated_at DESC) as rn
                    FROM PRODUCT_BOM
                )
                SELECT DISTINCT
                    b.fg_part_no,
                    b.line,
                    b.model,
                    p.sap_no,
                    rb.updated_by,
                    rb.updated_at
                FROM 
                    PRODUCT_BOM b
                LEFT JOIN 
                    PARAMETER p ON b.fg_part_no = p.part_no AND b.line = p.line AND b.model = p.model
                LEFT JOIN 
                    RankedBOMs rb ON b.fg_part_no = rb.fg_part_no AND b.line = rb.line AND b.model = rb.model AND rb.rn = 1
                ORDER BY b.fg_part_no, b.line, b.model;
            ";
            $stmt = $pdo->query($sql);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$row) {
                if ($row['updated_at']) {
                    $row['updated_at'] = (new DateTime($row['updated_at']))->format('Y-m-d H:i:s');
                }
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        // ** UPDATED: เพิ่มเงื่อนไข line และ model ในการลบ **
        case 'delete_full_bom':
            $fg_part_no = $input['fg_part_no'] ?? '';
            $line = $input['line'] ?? '';
            $model = $input['model'] ?? '';

            if (empty($fg_part_no) || empty($line) || empty($model)) {
                throw new Exception("FG Part No, Line, and Model are required to delete a BOM.");
            }
            
            $stmt = $pdo->prepare("DELETE FROM PRODUCT_BOM WHERE fg_part_no = ? AND line = ? AND model = ?");
            $stmt->execute([$fg_part_no, $line, $model]);
            
            logAction($pdo, $currentUser, 'DELETE FULL BOM', "$fg_part_no ($line/$model)");
            echo json_encode(['success' => true, 'message' => 'BOM has been deleted.']);
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