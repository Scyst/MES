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

$logFile = __DIR__ . '/debug_delete.log';
file_put_contents($logFile, date('Y-m-d H:i:s') . " Delete request for URL: $url\n", FILE_APPEND);
file_put_contents($logFile, date('Y-m-d H:i:s') . " Trying to delete: $filePath\n", FILE_APPEND);
file_put_contents($logFile, date('Y-m-d H:i:s') . " file_exists check: " . (file_exists($filePath) ? 'TRUE' : 'FALSE') . "\n", FILE_APPEND);

if (file_exists($filePath)) {
    if (unlink($filePath)) {
        file_put_contents($logFile, date('Y-m-d H:i:s') . " Successfully deleted: $filePath\n", FILE_APPEND);
        sendJson(['success' => true, 'message' => 'File deleted.']);
    } else {
        $error = error_get_last();
        file_put_contents($logFile, date('Y-m-d H:i:s') . " Failed to unlink: $filePath, Error: " . json_encode($error) . "\n", FILE_APPEND);
        sendJson(['error' => 'Failed to delete file from server.'], 500);
    }
} else {
    file_put_contents($logFile, date('Y-m-d H:i:s') . " File does not exist: $filePath\n", FILE_APPEND);
    sendJson(['success' => true, 'message' => 'File already deleted or not found.']);
}
?>
