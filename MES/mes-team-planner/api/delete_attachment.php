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

$canDelete = isAdminOrManager();

if (!$canDelete) {
    $stmt = $pdo->prepare("SELECT Assignee, CreatedBy FROM TeamPlanner_Tasks WHERE Attachments LIKE ?");
    $stmt->execute(['%' . $basename . '%']);
    $task = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($task) {
        if (isTaskOwnerBySession($task['Assignee'], $task['CreatedBy'], $pdo)) {
            $canDelete = true;
        }
    } else {
        $pStmt = $pdo->prepare("SELECT Assignee, CreatedBy FROM TeamPlanner_Projects WHERE Attachments LIKE ?");
        $pStmt->execute(['%' . $basename . '%']);
        $project = $pStmt->fetch(PDO::FETCH_ASSOC);
        if ($project) {
            if (isProjectOwnerBySession($project['Assignee'], $project['CreatedBy'] ?? '', $pdo)) {
                $canDelete = true;
            }
        }
    }
}

if (!$canDelete) {
    sendJson(['error' => 'Permission denied: You do not have permission to delete this attachment.'], 403);
}

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
