<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    if (!isset($_FILES['file'])) {
        throw new Exception("No file uploaded");
    }

    $file = $_FILES['file'];
    $category = $_POST['category'] ?? 'general';
    $dealId = isset($_POST['dealId']) && $_POST['dealId'] !== 'null' ? intval($_POST['dealId']) : null;
    $folderId = isset($_POST['folderId']) && $_POST['folderId'] !== 'null' ? intval($_POST['folderId']) : null;
    
    // Validate file
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("Upload error code: " . $file['error']);
    }

    // Generate unique filename to prevent overwrites
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
    $newFileName = $safeName . '_' . time() . '.' . $extension;
    
    $uploadDir = __DIR__ . '/../../uploads/crm/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $destPath = $uploadDir . $newFileName;
    $publicPath = 'uploads/crm/' . $newFileName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        throw new Exception("Failed to save file to destination");
    }

    $sql = "INSERT INTO CRM_DOCUMENTS (dealId, folderId, fileName, filePath, fileType, fileSize, category) 
            VALUES (:dealId, :folderId, :fileName, :filePath, :fileType, :fileSize, :category)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'dealId' => $dealId,
        'folderId' => $folderId,
        'fileName' => $file['name'], // Store original name for display
        'filePath' => $publicPath,
        'fileType' => $file['type'],
        'fileSize' => $file['size'],
        'category' => $category
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Document uploaded successfully',
        'id' => $pdo->lastInsertId(),
        'filePath' => $publicPath
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
