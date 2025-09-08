<?php
// MES/page/documentCenter/api/get_documents.php (Role-based file visibility)

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

    // ### ส่วนที่แก้ไข: สร้างเงื่อนไข WHERE clause เพิ่มเติมตาม Role ###
    $whereClauses = [];
    $params = [];

    // 1. เงื่อนไขการมองเห็นไฟล์
    if (!hasRole(['admin', 'creator'])) {
        $whereClauses[] = "d.file_name LIKE '%.pdf'";
    }

    // 2. เงื่อนไขการค้นหา
    if (!empty($searchTerm)) {
        $whereClauses[] = "(d.file_name LIKE ? OR d.file_description LIKE ? OR d.category LIKE ?)";
        $searchValue = "%{$searchTerm}%";
        $params = [$searchValue, $searchValue, $searchValue];
    }

    $finalWhereClause = '';
    if (!empty($whereClauses)) {
        $finalWhereClause = 'WHERE ' . implode(' AND ', $whereClauses);
    }
    // ###############################################################

    $usersTable = USERS_TABLE;
    $sql = "
        SELECT 
            d.id, d.file_name, d.file_description, d.category,
            CONVERT(VARCHAR, d.created_at, 126) AS created_at, 
            u.username AS uploaded_by
        FROM dbo.DOCUMENTS d
        LEFT JOIN dbo.{$usersTable} u ON d.uploaded_by_user_id = u.id
        {$finalWhereClause}
        ORDER BY d.created_at DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    ";
    
    $stmt = $pdo->prepare($sql);
    
    // Bind parameters
    $paramIndex = 1;
    foreach ($params as $param) {
        $stmt->bindValue($paramIndex++, $param);
    }
    $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
    $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
    
    $stmt->execute();
    $documents = $stmt->fetchAll();

    // Query นับจำนวน (ต้องใช้ WHERE clause เดียวกัน)
    $countSql = "SELECT COUNT(*) FROM dbo.DOCUMENTS d {$finalWhereClause}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params); // ใช้ params เดิม (ไม่มี offset/limit)
    $totalRecords = $countStmt->fetchColumn();

    echo json_encode([
        'data' => $documents,
        'pagination' => [ 'currentPage' => $page, 'totalPages' => ceil($totalRecords / $limit), 'totalRecords' => $totalRecords ]
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'An internal server error occurred.', 'debug_message' => $e->getMessage()]);
}
?>