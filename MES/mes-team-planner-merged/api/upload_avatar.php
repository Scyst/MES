<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $currentUsername = $_SESSION['user']['username'] ?? '';
    if (!$currentUsername) {
        sendJson(['error' => 'Unauthorized'], 401);
    }

    if ($method === 'POST') {
        if (!isset($_FILES['avatar'])) {
            sendJson(['error' => 'No file uploaded'], 400);
        }

        $file = $_FILES['avatar'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            sendJson(['error' => 'Upload failed with error code ' . $file['error']], 400);
        }

        $maxSize = 5 * 1024 * 1024; // 5MB
        if ($file['size'] > $maxSize) {
            sendJson(['error' => 'File too large (max 5MB)'], 400);
        }

        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        $imageInfo = @getimagesize($file['tmp_name']);
        
        if ($imageInfo === false) {
            sendJson(['error' => 'Invalid image file.'], 400);
        }

        $mimeType = $imageInfo['mime'];

        if (!in_array($mimeType, $allowedTypes)) {
            sendJson(['error' => 'Invalid file type. Only JPG, PNG, and WebP are allowed.'], 400);
        }

        $uploadDir = __DIR__ . '/uploads/avatars/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        // Always save as jpg for consistency, but keep original extension if preferred.
        // Actually, we can just save it as username.jpg and rely on the browser to infer the image type,
        // or we can save it as username.png. Let's just use username.jpg as the canonical name.
        $destPath = $uploadDir . $currentUsername . '.jpg';

        // Move the file
        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            sendJson(['success' => true, 'message' => 'Avatar uploaded successfully']);
        } else {
            sendJson(['error' => 'Failed to move uploaded file'], 500);
        }

    } else {
        sendJson(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    sendJson(['error' => $e->getMessage()], 500);
}
?>
