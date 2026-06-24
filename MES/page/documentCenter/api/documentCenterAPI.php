<?php
/**
  * Central API Endpoint for Document Center
  * Handles all actions except file viewing.
  * Last Updated: Replaced hardcoded table names with config variables.
  */

header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// Determine the action from the request
$action = $_REQUEST['action'] ?? '';
if (empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}

// Centralized CSRF check for all write actions.
$writeActions = ['upload', 'update', 'delete', 'revise', 'create_folder'];
if (in_array($action, $writeActions)) {
    $csrfTokenHeader = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $csrfTokenHeader)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'CSRF token mismatch or missing. Please refresh the page.']);
        exit;
    }
}

try {
    // ดึงชื่อตารางจาก config มาใส่ในตัวแปรเพื่อง่ายต่อการใช้งาน
    $documentsTable = DOCUMENTS_TABLE;
    $usersTable = USERS_TABLE;

    switch ($action) {
        //==================================
        //  GET DOCUMENTS & FOLDERS
        //==================================
        case 'get_documents':
            if (!hasRole(['admin', 'creator', 'supervisor', 'operator', 'qc'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Permission denied']);
                exit;
            }

            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = 30;
            $offset = ($page - 1) * $limit;
            $searchTerm = isset($_GET['search']) ? $_GET['search'] : '';
            $folderPath = isset($_GET['folderPath']) ? trim($_GET['folderPath']) : '';

            // 1. Get explicit folders (only if not searching, or if search term matches)
            $explicitFolders = [];
            if (empty($searchTerm)) {
                $sqlFolders = "SELECT d.id, d.file_name, d.category, CONVERT(VARCHAR, d.created_at, 126) AS created_at, u.username AS uploaded_by 
                               FROM dbo.{$documentsTable} d 
                               LEFT JOIN dbo.{$usersTable} u ON d.uploaded_by_user_id = u.id 
                               WHERE d.file_type = 'folder' AND d.category = ?";
                $stmtFolders = $pdo->prepare($sqlFolders);
                $stmtFolders->execute([$folderPath]);
                $explicitFolders = $stmtFolders->fetchAll(PDO::FETCH_ASSOC);
            }

            // 2. Get implicit folders from document categories (only if not searching)
            $implicitFolders = [];
            if (empty($searchTerm)) {
                $likeSearch = $folderPath === '' ? '%' : $folderPath . '/%';
                $sqlCategories = "SELECT DISTINCT category FROM dbo.{$documentsTable} WHERE category LIKE ? AND (file_type != 'folder' OR file_type IS NULL)";
                $stmtCat = $pdo->prepare($sqlCategories);
                $stmtCat->execute([$likeSearch]);
                $categories = $stmtCat->fetchAll(PDO::FETCH_COLUMN, 0);

                foreach ($categories as $cat) {
                    if ($cat === $folderPath) continue;
                    $remainingPath = $folderPath === '' ? $cat : substr($cat, strlen($folderPath) + 1);
                    $parts = explode('/', $remainingPath);
                    $directChild = $parts[0];
                    if (!empty($directChild)) {
                        $implicitFolders[$directChild] = true;
                    }
                }
            }

            $foldersToReturn = [];
            $existingExplicitFolderNames = [];
            foreach ($explicitFolders as $f) {
                $f['is_folder'] = true;
                $foldersToReturn[] = $f;
                $existingExplicitFolderNames[$f['file_name']] = true;
            }
            
            foreach ($implicitFolders as $folderName => $val) {
                if (!isset($existingExplicitFolderNames[$folderName])) {
                    $foldersToReturn[] = [
                        'id' => null,
                        'file_name' => $folderName,
                        'category' => $folderPath,
                        'created_at' => null,
                        'uploaded_by' => 'System',
                        'is_folder' => true
                    ];
                }
            }
            
            usort($foldersToReturn, function($a, $b) {
                return strcasecmp($a['file_name'], $b['file_name']);
            });

            // 3. Get Documents
            $whereClauses = ["(d.file_type != 'folder' OR d.file_type IS NULL)"];
            $params = [];

            if (!empty($searchTerm)) {
                // If searching, ignore folderPath and search globally
                $whereClauses[] = "(d.file_name LIKE ? OR d.file_description LIKE ? OR u.username LIKE ?)";
                $searchValue = "%{$searchTerm}%";
                array_push($params, $searchValue, $searchValue, $searchValue);
            } else {
                $whereClauses[] = "d.category = ?";
                $params[] = $folderPath;
            }

            if (!hasRole(['admin', 'creator', 'qc'])) {
                $whereClauses[] = "d.file_name LIKE '%.pdf'";
            }

            $finalWhereClause = 'WHERE ' . implode(' AND ', $whereClauses);
            
            $sqlDocs = "
                SELECT d.id, d.file_name, d.file_description, d.category, d.file_size,
                      CONVERT(VARCHAR, d.created_at, 126) AS created_at, 
                      u.username AS uploaded_by
                FROM dbo.{$documentsTable} d
                LEFT JOIN dbo.{$usersTable} u ON d.uploaded_by_user_id = u.id
                {$finalWhereClause}
                ORDER BY d.created_at DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";
            
            $stmtDocs = $pdo->prepare($sqlDocs);
            $paramIndex = 1;
            foreach ($params as $param) {
                $stmtDocs->bindValue($paramIndex++, $param);
            }
            $stmtDocs->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
            $stmtDocs->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
            $stmtDocs->execute();
            $documentsToReturn = $stmtDocs->fetchAll(PDO::FETCH_ASSOC);

            foreach ($documentsToReturn as &$doc) {
                $doc['is_folder'] = false;
            }

            // Combine: Folders first, then documents
            $data = array_merge($foldersToReturn, $documentsToReturn);

            $countSql = "SELECT COUNT(*) FROM dbo.{$documentsTable} d LEFT JOIN dbo.{$usersTable} u ON d.uploaded_by_user_id = u.id {$finalWhereClause}";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = $countStmt->fetchColumn();

            echo json_encode([
                'success' => true,
                'data' => $data,
                'pagination' => [ 'currentPage' => $page, 'totalPages' => ceil($totalRecords / $limit), 'totalRecords' => (int)$totalRecords ]
            ]);
            break;

        //==================================
        //  CREATE FOLDER
        //==================================
        case 'create_folder':
            if (!hasRole(['admin', 'creator', 'qc'])) {
                throw new Exception('Permission denied.', 403);
            }
            $inputData = json_decode(file_get_contents('php://input'), true);
            $folderName = trim($inputData['folder_name'] ?? '');
            $parentPath = trim($inputData['parent_path'] ?? '');
            
            if (empty($folderName)) {
                throw new Exception('Folder name is required.', 400);
            }
            
            try {
                $sql = "INSERT INTO dbo.{$documentsTable} (file_name, file_type, category, uploaded_by_user_id, file_path, file_size) VALUES (?, 'folder', ?, ?, '', 0)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$folderName, $parentPath, $_SESSION['user']['id']]);
                
                echo json_encode(['success' => true, 'message' => 'Folder created successfully.']);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
            }
            break;

        //==================================
        //  UPLOAD DOCUMENT
        //==================================
        case 'upload':
            if (!hasRole(['admin', 'creator', 'qc'])) {
                http_response_code(403);
                echo json_encode(['error' => 'Permission Denied. You do not have rights to upload documents.']);
                exit;
            }
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }
            if (!isset($_FILES['doc_file']) || $_FILES['doc_file']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No file uploaded or an upload error occurred.']);
                exit;
            }
            $file = $_FILES['doc_file'];
            $maxFileSize = 20 * 1024 * 1024;
            $originalFileName = basename($file['name']);
            $fileExtension = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
            $allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'rar', '7z', 'txt', 'step', 'stp', 'igs', 'iges', 'stl', 'obj', 'gltf', 'glb'];

            if ($file['size'] > $maxFileSize) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'File is too large. Maximum size is 20MB.']);
                exit;
            }
            if (!in_array($fileExtension, $allowedExtensions)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid file type. Please check supported formats.']);
                exit;
            }
            try {
                $uploadDir = __DIR__ . '/../../../uploads/documentCenter/';
                $safeFileName = preg_replace("/[^A-Za-z0-9\\._-]/", '', pathinfo($originalFileName, PATHINFO_FILENAME));
                $newFileName = $safeFileName . '_' . uniqid() . '.' . $fileExtension;
                $destination = $uploadDir . $newFileName;

                if (move_uploaded_file($file['tmp_name'], $destination)) {
                    $sql = "INSERT INTO dbo.{$documentsTable} (file_name, file_description, file_path, file_type, file_size, category, uploaded_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([ $originalFileName, $_POST['file_description'] ?? null, $newFileName, $file['type'], $file['size'], $_POST['category'] ?? null, $_SESSION['user']['id'] ]);
                    echo json_encode(['success' => true, 'message' => 'File uploaded successfully.']);
                } else {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file. Check folder permissions.']);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
            }
            exit;

        //==================================
        //  REVISE DOCUMENT
        //==================================
        case 'revise':
            if (!hasRole(['admin', 'creator', 'qc'])) {
                http_response_code(403);
                echo json_encode(['error' => 'Permission Denied. You do not have rights to revise documents.']);
                exit;
            }
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }
            $documentId = $_POST['document_id'] ?? null;
            if (!$documentId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Document ID is required.']);
                exit;
            }
            if (!isset($_FILES['doc_file']) || $_FILES['doc_file']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No file uploaded or an upload error occurred.']);
                exit;
            }
            $file = $_FILES['doc_file'];
            $maxFileSize = 20 * 1024 * 1024;
            $originalFileName = basename($file['name']);
            $fileExtension = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
            $allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'rar', '7z', 'txt', 'step', 'stp', 'igs', 'iges', 'stl', 'obj', 'gltf', 'glb'];

            if ($file['size'] > $maxFileSize) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'File is too large. Maximum size is 20MB.']);
                exit;
            }
            if (!in_array($fileExtension, $allowedExtensions)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid file type. Please check supported formats.']);
                exit;
            }
            try {
                // Get old file info to delete it
                $stmt = $pdo->prepare("SELECT file_path FROM dbo.{$documentsTable} WHERE id = ?");
                $stmt->execute([$documentId]);
                $oldFile = $stmt->fetchColumn();

                $uploadDir = __DIR__ . '/../../../uploads/documentCenter/';
                $safeFileName = preg_replace("/[^A-Za-z0-9\\._-]/", '', pathinfo($originalFileName, PATHINFO_FILENAME));
                $newFileName = $safeFileName . '_rev_' . uniqid() . '.' . $fileExtension;
                $destination = $uploadDir . $newFileName;

                if (move_uploaded_file($file['tmp_name'], $destination)) {
                    if ($oldFile) {
                        $oldFullPath = $uploadDir . $oldFile;
                        if (file_exists($oldFullPath)) {
                            unlink($oldFullPath);
                        }
                    }

                    $sql = "UPDATE dbo.{$documentsTable} SET file_name = ?, file_path = ?, file_type = ?, file_size = ? WHERE id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$originalFileName, $newFileName, $file['type'], $file['size'], $documentId]);
                    
                    echo json_encode(['success' => true, 'message' => 'Document revised successfully.']);
                } else {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file. Check folder permissions.']);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
            }
            exit;

        //==================================
        //  UPDATE DOCUMENT
        //==================================
        case 'update':
            if (!hasRole(['admin', 'creator', 'qc'])) {
                throw new Exception('Permission denied.', 403);
            }
            $inputData = json_decode(file_get_contents('php://input'), true);
            $documentId = $inputData['document_id'] ?? null;
            if (!$documentId) {
                throw new Exception('Document ID is required.', 400);
            }

            $sql = "UPDATE dbo.{$documentsTable} SET file_description = ?, category = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$inputData['description'] ?? null, $inputData['category'] ?? null, $documentId]);
            echo json_encode(['success' => true, 'message' => 'Document updated successfully.']);
            break;
            
        //==================================
        //  DELETE DOCUMENTS
        //==================================
        case 'delete':
            if (!hasRole(['admin', 'creator', 'qc'])) {
                throw new Exception('Permission Denied.', 403);
            }
            $inputData = json_decode(file_get_contents('php://input'), true);
            $docIds = $inputData['docIds'] ?? [];
            $password = $inputData['password'] ?? '';
            
            if (empty($docIds) || !is_array($docIds) || empty($password)) {
                throw new Exception('Document IDs (an array) and password are required.', 400);
            }

            $stmt = $pdo->prepare("SELECT password FROM dbo.{$usersTable} WHERE id = ?");
            $stmt->execute([$_SESSION['user']['id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user || !password_verify($password, $user['password'])) {
                throw new Exception('Invalid password for deletion confirmation.', 401);
            }
            
            $pdo->beginTransaction();

            $placeholders = implode(',', array_fill(0, count($docIds), '?'));
            
            $sqlSelect = "SELECT file_path FROM dbo.{$documentsTable} WHERE id IN ($placeholders)";
            $stmtSelect = $pdo->prepare($sqlSelect);
            $stmtSelect->execute($docIds);
            $filesToDelete = $stmtSelect->fetchAll(PDO::FETCH_COLUMN, 0);

            $sqlDelete = "DELETE FROM dbo.{$documentsTable} WHERE id IN ($placeholders)";
            $stmtDelete = $pdo->prepare($sqlDelete);
            $stmtDelete->execute($docIds);
            $deletedCount = $stmtDelete->rowCount();

            foreach ($filesToDelete as $filePath) {
                if ($filePath) {
                    $fullPath = __DIR__ . '/../../../uploads/documentCenter/' . $filePath;
                    if (file_exists($fullPath)) {
                        unlink($fullPath);
                    }
                }
            }
            
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => "Successfully deleted {$deletedCount} document(s)."]);
            break;

        //==================================
        //  DEFAULT
        //==================================
        default:
            throw new Exception('Invalid action specified.', 400);
            break;
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $errorCode = is_int($e->getCode()) && $e->getCode() >= 400 ? $e->getCode() : 500;
    http_response_code($errorCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
