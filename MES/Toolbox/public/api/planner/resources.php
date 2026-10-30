<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        // GET: List files
        case 'GET':
            $category = isset($_GET['category']) ? trim($_GET['category']) : '';
            if ($category && $category !== 'all') {
                $stmt = $pdo->prepare(
                    "SELECT Id, Name, StoredName, Url, MimeType, SizeBytes, Category, Description, UploadedBy, CreatedAt
                     FROM TeamPlanner_Files WHERE Category = ? ORDER BY CreatedAt DESC"
                );
                $stmt->execute([$category]);
            } else {
                $stmt = $pdo->query(
                    "SELECT Id, Name, StoredName, Url, MimeType, SizeBytes, Category, Description, UploadedBy, CreatedAt
                     FROM TeamPlanner_Files ORDER BY CreatedAt DESC"
                );
            }
            $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $catStmt = $pdo->query("SELECT DISTINCT Category FROM TeamPlanner_Files ORDER BY Category");
            $categories = array_column($catStmt->fetchAll(PDO::FETCH_ASSOC), 'Category');
            sendJson(['success' => true, 'data' => $files, 'categories' => $categories]);
            break;

        // POST: Register uploaded file metadata
        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true);
            if (!$body) $body = $_POST;

            $name        = trim($body['name']        ?? '');
            $storedName  = trim($body['storedName']  ?? '');
            $url         = trim($body['url']         ?? '');
            $mimeType    = trim($body['mimeType']    ?? 'application/octet-stream');
            $sizeBytes   = intval($body['sizeBytes'] ?? 0);
            $category    = trim($body['category']    ?? 'General');
            $description = trim($body['description'] ?? '');
            $uploadedBy  = $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'Unknown';

            if (!$name || !$storedName || !$url) {
                sendJson(['success' => false, 'message' => 'Missing required fields'], 400);
            }

            $stmt = $pdo->prepare(
                "INSERT INTO TeamPlanner_Files (Name, StoredName, Url, MimeType, SizeBytes, Category, Description, UploadedBy)
                 OUTPUT INSERTED.Id, INSERTED.CreatedAt VALUES (?,?,?,?,?,?,?,?)"
            );
            $stmt->execute([$name, $storedName, $url, $mimeType, $sizeBytes, $category, $description, $uploadedBy]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            logActivity($pdo, "อัปโหลดไฟล์: {$name} (หมวด: {$category}) โดย {$uploadedBy}");

            sendJson(['success' => true, 'data' => [
                'Id' => $row['Id'], 'Name' => $name, 'StoredName' => $storedName,
                'Url' => $url, 'MimeType' => $mimeType, 'SizeBytes' => $sizeBytes,
                'Category' => $category, 'Description' => $description,
                'UploadedBy' => $uploadedBy, 'CreatedAt' => $row['CreatedAt'],
            ]]);
            break;

        // PUT: Update file metadata
        case 'PUT':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) sendJson(['success' => false, 'message' => 'Missing file ID'], 400);

            $body = json_decode(file_get_contents('php://input'), true);
            if (!$body) sendJson(['success' => false, 'message' => 'Invalid JSON body'], 400);

            $name        = trim($body['name'] ?? '');
            $category    = trim($body['category'] ?? '');
            $description = trim($body['description'] ?? '');

            if (!$name || !$category) {
                sendJson(['success' => false, 'message' => 'Missing required fields'], 400);
            }

            $stmt = $pdo->prepare("SELECT UploadedBy FROM TeamPlanner_Files WHERE Id = ?");
            $stmt->execute([$id]);
            $file = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$file) sendJson(['success' => false, 'message' => 'File not found'], 404);

            $currentUser = $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? '';
            if (!isAdminOrManager() && strtolower($file['UploadedBy']) !== strtolower($currentUser)) {
                sendJson(['success' => false, 'message' => 'Permission denied'], 403);
            }

            $stmt = $pdo->prepare("UPDATE TeamPlanner_Files SET Name = ?, Category = ?, Description = ? WHERE Id = ?");
            $stmt->execute([$name, $category, $description, $id]);

            logActivity($pdo, "แก้ไขข้อมูลไฟล์: {$name} โดย {$currentUser}");

            sendJson(['success' => true, 'message' => 'File updated']);
            break;

        // DELETE: Remove file record + physical file
        case 'DELETE':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) sendJson(['success' => false, 'message' => 'Missing file ID'], 400);

            $stmt = $pdo->prepare("SELECT Name, StoredName, UploadedBy FROM TeamPlanner_Files WHERE Id = ?");
            $stmt->execute([$id]);
            $file = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$file) sendJson(['success' => false, 'message' => 'File not found'], 404);

            $currentUser = $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? '';
            if (!isAdminOrManager() && strtolower($file['UploadedBy']) !== strtolower($currentUser)) {
                sendJson(['success' => false, 'message' => 'Permission denied'], 403);
            }

            $physicalPath = __DIR__ . '/uploads/planner/' . $file['StoredName'];
            if (file_exists($physicalPath)) @unlink($physicalPath);

            $stmt = $pdo->prepare("DELETE FROM TeamPlanner_Files WHERE Id = ?");
            $stmt->execute([$id]);

            logActivity($pdo, "ลบไฟล์: {$file['Name']} โดย {$currentUser}");
            sendJson(['success' => true, 'message' => 'File deleted']);
            break;

        default:
            sendJson(['success' => false, 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log('[resources.php] ' . $e->getMessage());
    sendJson(['success' => false, 'message' => 'Server error'], 500);
}
?>
