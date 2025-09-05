<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

// ตรวจสอบสิทธิ์ - อนุญาตให้ผู้มีบทบาทที่เหมาะสมเท่านั้น
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// ตรวจสอบ CSRF Token สำหรับ request ที่ไม่ใช่ GET
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
        case 'get_details':
            $job_order_id = $_GET['job_order_id'] ?? 0;
            if (!$job_order_id) {
                throw new Exception("Job Order ID is required.");
            }

            $sql = "SELECT jo.*, i.part_no FROM " . JOB_ORDERS_TABLE . " jo 
                    LEFT JOIN " . ITEMS_TABLE . " i ON jo.item_id = i.item_id
                    WHERE jo.job_order_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$job_order_id]);
            $details = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $details]);
            break;

        case 'update_status':
            $job_order_id = $input['job_order_id'] ?? 0;
            $status = $input['status'] ?? '';

            if (!$job_order_id || !in_array($status, ['COMPLETED', 'CANCELLED'])) {
                throw new Exception("Invalid Job Order ID or Status provided.");
            }

            $pdo->beginTransaction();

            // ตั้งค่า completed_at เฉพาะเมื่อสถานะเป็น COMPLETED
            $completed_at_sql = ($status === 'COMPLETED') ? ", completed_at = GETDATE()" : "";

            $sql = "UPDATE " . JOB_ORDERS_TABLE . " SET status = ? {$completed_at_sql} WHERE job_order_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status, $job_order_id]);

            logAction($pdo, $currentUser['username'], 'UPDATE JOB ORDER STATUS', $job_order_id, "New status: {$status}");
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Job Order status updated successfully.']);
            break;

        case 'create_job_order':
            // 1. ตรวจสอบข้อมูลที่รับเข้ามา
            $item_id = $input['item_id'] ?? 0;
            $quantity = $input['quantity'] ?? 0;
            $due_date = $input['due_date'] ?? null;
        
            if (empty($item_id) || !is_numeric($quantity) || $quantity <= 0) {
                throw new Exception("Item ID and a valid quantity are required.");
            }
        
            // 2. สร้างหมายเลขใบสั่งงานที่ไม่ซ้ำกัน
            $prefix = 'JO-' . date('Ymd') . '-';
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM " . JOB_ORDERS_TABLE . " WHERE job_order_number LIKE ?");
            $stmt->execute([$prefix . '%']);
            $count = $stmt->fetchColumn();
            $job_order_number = $prefix . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            
            // 3. เริ่ม Transaction และบันทึกข้อมูล
            $pdo->beginTransaction();
        
            $sql = "INSERT INTO " . JOB_ORDERS_TABLE . " (job_order_number, item_id, quantity_required, due_date, status) VALUES (?, ?, ?, ?, 'PENDING')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $job_order_number,
                $item_id,
                $quantity,
                empty($due_date) ? null : $due_date
            ]);
            
            $newId = $pdo->lastInsertId();
            logAction($pdo, $currentUser['username'], 'CREATE JOB ORDER', $newId, $job_order_number);
        
            $pdo->commit();
        
            echo json_encode(['success' => true, 'message' => 'Job Order created successfully: ' . $job_order_number]);
            break;

        case 'get_history':
            $status_filter = $_GET['status'] ?? '';
        
            $sql = "SELECT jo.job_order_number, jo.status, jo.completed_at, i.part_no 
                    FROM " . JOB_ORDERS_TABLE . " jo
                    LEFT JOIN " . ITEMS_TABLE . " i ON jo.item_id = i.item_id
                    WHERE jo.status IN ('COMPLETED', 'CANCELLED')";
            
            $params = [];
            if (!empty($status_filter)) {
                $sql .= " AND jo.status = ?";
                $params[] = $status_firter; // แก้ไขตัวแปรตรงนี้
            }
        
            // แก้ไข ORDER BY ให้มีประสิทธิภาพมากขึ้น
            $sql .= " ORDER BY jo.created_at DESC";
        
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
            echo json_encode(['success' => true, 'data' => $history]);
            break;
            
        default:
            throw new Exception("Invalid action for Job Order management.");
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>