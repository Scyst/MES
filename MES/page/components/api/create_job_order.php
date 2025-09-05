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

// ตรวจสอบ CSRF Token
if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

try {
    // 1. ตรวจสอบข้อมูลที่รับเข้ามา
    $item_id = $input['item_id'] ?? 0;
    $quantity = $input['quantity'] ?? 0;
    $due_date = $input['due_date'] ?? null;

    if (empty($item_id) || !is_numeric($quantity) || $quantity <= 0) {
        throw new Exception("Item ID and a valid quantity are required.");
    }

    // 2. สร้างหมายเลขใบสั่งงานที่ไม่ซ้ำกัน (ตัวอย่าง: JO-20250905-XXXX)
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

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>