<?php
// MES/page/documentCenter/api/delete_document.php

header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

try {
    if (!hasRole(['admin', 'creator'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Permission Denied.']);
        exit;
    }
    
    // รับข้อมูลเป็น JSON จาก request body
    $input = json_decode(file_get_contents('php://input'), true);
    $docId = $input['document_id'] ?? null;

    if (!$docId) {
        http_response_code(400);
        echo json_encode(['error' => 'Document ID is required.']);
        exit;
    }

    // --- เริ่ม Transaction ---
    $pdo->beginTransaction();

    // 1. ดึงข้อมูล file_path ก่อนที่จะลบออกจาก DB
    $stmt = $pdo->prepare("SELECT file_path FROM dbo.DOCUMENTS WHERE id = ?");
    $stmt->execute([$docId]);
    $document = $stmt->fetch();

    if (!$document) {
        throw new Exception('Document not found.');
    }

    // 2. ลบข้อมูลออกจากฐานข้อมูล
    $deleteStmt = $pdo->prepare("DELETE FROM dbo.DOCUMENTS WHERE id = ?");
    $deleteStmt->execute([$docId]);

    // 3. ลบไฟล์จริงออกจาก Server
    $filePath = __DIR__ . '/../../../documents/' . $document['file_path'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    // --- Commit Transaction ---
    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Document deleted successfully.']);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'error' => 'An internal server error occurred during deletion.',
        'debug_message' => $e->getMessage()
    ]);
}
?>