<?php
require_once 'db_helper.php';

// Check authorization
if (!isset($_SESSION['user'])) {
    sendJson(['error' => 'Unauthorized'], 401);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    sendJson(['error' => 'Method Not Allowed'], 405);
}

if (!isset($_FILES['file'])) {
    sendJson(['error' => 'No file uploaded.'], 400);
}

if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    sendJson(['error' => 'Upload error code: ' . $_FILES['file']['error']], 400);
}

$file = $_FILES['file'];
$fileName = basename($file['name']);
$fileSize = $file['size'];
$fileTmpPath = $file['tmp_name'];
$fileMimeType = mime_content_type($fileTmpPath);

// Validate file size (e.g., max 2MB to match PHP ini defaults)
$maxSize = 2 * 1024 * 1024;
if ($fileSize > $maxSize) {
    sendJson(['error' => 'File size exceeds 2MB limit.'], 400);
}

// Validate file type
$allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
];

if (!in_array($fileMimeType, $allowedMimeTypes)) {
    sendJson(['error' => 'Invalid file type.'], 400);
}

// Ensure upload directory exists
$uploadDir = __DIR__ . '/uploads/planner/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Generate unique file name
$ext = pathinfo($fileName, PATHINFO_EXTENSION);
$uniqueName = uniqid('attach_') . '_' . time() . '.' . $ext;
$destination = $uploadDir . $uniqueName;

if (move_uploaded_file($fileTmpPath, $destination)) {
    $url = 'api/uploads/planner/' . $uniqueName;
    sendJson([
        'id' => uniqid(),
        'name' => $fileName,
        'url' => $url,
        'size' => $fileSize,
        'type' => $fileMimeType
    ]);
} else {
    sendJson(['error' => 'Failed to save uploaded file.'], 500);
}
?>
