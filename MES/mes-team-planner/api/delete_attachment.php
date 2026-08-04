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

$data = json_decode(file_get_contents('php://input'), true);
$url = $data['url'] ?? '';

if (empty($url)) {
    sendJson(['error' => 'No URL provided.'], 400);
}

// Security: Prevent directory traversal
$basename = basename($url);
$filePath = __DIR__ . '/uploads/planner/' . $basename;

if (file_exists($filePath)) {
    if (unlink($filePath)) {
        sendJson(['success' => true, 'message' => 'File deleted.']);
    } else {
        sendJson(['error' => 'Failed to delete file from server.'], 500);
    }
} else {
    sendJson(['success' => true, 'message' => 'File already deleted or not found.']);
}
?>
