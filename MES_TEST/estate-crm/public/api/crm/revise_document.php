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
    if (!isset($_FILES['file']) || !isset($_POST['documentId'])) {
        throw new Exception("Missing file or documentId");
    }

    $documentId = intval($_POST['documentId']);
    $file = $_FILES['file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("Upload error code: " . $file['error']);
    }

    // 1. Fetch current document details
    $sqlFetch = "SELECT * FROM CRM_DOCUMENTS WHERE id = :id";
    $stmtFetch = $pdo->prepare($sqlFetch);
    $stmtFetch->execute(['id' => $documentId]);
    $currentDoc = $stmtFetch->fetch(PDO::FETCH_ASSOC);

    if (!$currentDoc) {
        throw new Exception("Original document not found");
    }

    // 2. Insert current document into VERSIONS table
    $sqlInsertVersion = "INSERT INTO CRM_DOCUMENT_VERSIONS (documentId, fileName, filePath, fileSize, fileType, version, uploadedAt) 
                         VALUES (:documentId, :fileName, :filePath, :fileSize, :fileType, :version, :uploadedAt)";
    $stmtInsertVersion = $pdo->prepare($sqlInsertVersion);
    $stmtInsertVersion->execute([
        'documentId' => $currentDoc['id'],
        'fileName' => $currentDoc['fileName'],
        'filePath' => $currentDoc['filePath'],
        'fileSize' => $currentDoc['fileSize'],
        'fileType' => $currentDoc['fileType'],
        'version' => $currentDoc['version'],
        'uploadedAt' => $currentDoc['uploadedAt']
    ]);

    // 3. Upload new file
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
    $newFileName = $safeName . '_v' . ($currentDoc['version'] + 1) . '_' . time() . '.' . $extension;
    
    $uploadDir = __DIR__ . '/../../uploads/crm/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $destPath = $uploadDir . $newFileName;
    $publicPath = 'uploads/crm/' . $newFileName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        throw new Exception("Failed to save new file to destination");
    }

    // 4. Update current document with new file details and increment version
    $sqlUpdate = "UPDATE CRM_DOCUMENTS 
                  SET fileName = :fileName, filePath = :filePath, fileType = :fileType, 
                      fileSize = :fileSize, version = version + 1, uploadedAt = GETDATE()
                  WHERE id = :id";
    $stmtUpdate = $pdo->prepare($sqlUpdate);
    $stmtUpdate->execute([
        'fileName' => $file['name'],
        'filePath' => $publicPath,
        'fileType' => $file['type'],
        'fileSize' => $file['size'],
        'id' => $documentId
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Document revised successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
