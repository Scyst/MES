<?php
// MES/page/documentCenter/api/get_documents.php (เวอร์ชันสมบูรณ์ แก้ไขแล้ว)

header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

try {
    if (!hasRole(['admin', 'creator', 'supervisor', 'operator'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Permission denied']);
        exit;
    }

    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = 15;
    $offset = ($page - 1) * $limit;
    $searchTerm = isset($_GET['search']) ? $_GET['search'] : '';

    $searchWhereClause = '';
    $searchParams = [];
    if (!empty($searchTerm)) {
        $searchWhereClause = "WHERE d.file_name LIKE ? OR d.file_description LIKE ? OR d.category LIKE ?";
        $searchValue = "%{$searchTerm}%";
        $searchParams = [$searchValue, $searchValue, $searchValue];
    }

    $usersTable = USERS_TABLE;

    $sql = "
        SELECT 
            d.id,
            d.file_name,
            d.file_description,
            d.category,
            d.created_at,
            u.username AS uploaded_by
        FROM 
            dbo.DOCUMENTS d
        LEFT JOIN 
            dbo.{$usersTable} u ON d.uploaded_by_user_id = u.id
        {$searchWhereClause}
        ORDER BY 
            d.created_at DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    ";
    
    $stmt = $pdo->prepare($sql);
    
    // --- ส่วนที่แก้ไข: เปลี่ยนมาใช้ bindValue() เพื่อความแม่นยำ ---
    $paramIndex = 1;
    // 1. Bind search parameters (ถ้ามี)
    foreach ($searchParams as $param) {
        $stmt->bindValue($paramIndex++, $param); // ไม่ต้องระบุชนิดข้อมูล, PDO จะจัดการเป็น string
    }
    // 2. Bind pagination parameters โดยระบุชนิดข้อมูลเป็น Integer
    $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
    $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
    
    $stmt->execute();
    $documents = $stmt->fetchAll();

    // Query นับจำนวนทั้งหมด (ส่วนนี้ยังใช้ execute แบบเดิมได้เพราะไม่มี OFFSET/FETCH)
    $countSql = "SELECT COUNT(*) FROM dbo.DOCUMENTS d {$searchWhereClause}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($searchParams);
    $totalRecords = $countStmt->fetchColumn();

    echo json_encode([
        'data' => $documents,
        'pagination' => [
            'currentPage' => $page,
            'totalPages' => ceil($totalRecords / $limit),
            'totalRecords' => $totalRecords
        ]
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'An internal server error occurred.',
        'debug_message' => $e->getMessage()
    ]);
}
?>