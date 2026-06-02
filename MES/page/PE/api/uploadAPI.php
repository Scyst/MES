<?php
// MES/page/PE/api/uploadAPI.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

requirePermission(['view_maintenance', 'view_production', 'view_dashboard']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

try {
    // Determine target directory
    $targetDir = __DIR__ . '/../../../uploads/pe_images/';
    if (!file_exists($targetDir)) {
        mkdir($targetDir, 0777, true);
    }

    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("No file uploaded or upload error.");
    }

    $fileInfo = pathinfo($_FILES['image']['name']);
    $ext = strtolower($fileInfo['extension']);
    $allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!in_array($ext, $allowedExts)) {
        throw new Exception("Invalid file type. Only JPG, PNG, and WebP are allowed.");
    }

    if ($_FILES['image']['size'] > 5 * 1024 * 1024) { // 5MB max
        throw new Exception("File is too large. Maximum size is 5MB.");
    }

    $prefix = $_POST['prefix'] ?? 'IMG';
    $fileName = $prefix . '_' . date('Ymd_His') . '_' . rand(1000, 9999) . '.' . $ext;
    $targetFile = $targetDir . $fileName;

    if (!move_uploaded_file($_FILES['image']['tmp_name'], $targetFile)) {
        throw new Exception("Failed to move uploaded file.");
    }

    // Return the relative path from the root of the PE module
    // The PE module is at /page/PE, and images are at /uploads/pe_images
    // The relative path from the root url perspective would be 'uploads/pe_images/'
    $relativePath = 'uploads/pe_images/' . $fileName;

    echo json_encode(['success' => true, 'path' => $relativePath]);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
