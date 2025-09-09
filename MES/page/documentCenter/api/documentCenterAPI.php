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
$writeActions = ['upload', 'update', 'delete'];
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
        //  GET DOCUMENTS
        //==================================
        case 'get_documents':
            if (!hasRole(['admin', 'creator', 'supervisor', 'operator'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Permission denied']);
                exit;
            }

            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = 30;
            $offset = ($page - 1) * $limit;
            $searchTerm = isset($_GET['search']) ? $_GET['search'] : '';
            $categoryFilter = isset($_GET['category']) ? trim($_GET['category']) : '';

            $whereClauses = [];
            $params = [];

            if (!hasRole(['admin', 'creator'])) {
                $whereClauses[] = "d.file_name LIKE '%.pdf'";
            }

            if (!empty($searchTerm)) {
                $whereClauses[] = "(d.file_name LIKE ? OR d.file_description LIKE ? OR d.category LIKE ? OR u.username LIKE ?)";
                $searchValue = "%{$searchTerm}%";
                array_push($params, $searchValue, $searchValue, $searchValue, $searchValue);
            }

            if (!empty($categoryFilter)) {
                $whereClauses[] = "d.category LIKE ?";
                $params[] = $categoryFilter . '%';
            }

            $finalWhereClause = '';
            if (!empty($whereClauses)) {
                $finalWhereClause = 'WHERE ' . implode(' AND ', $whereClauses);
            }
            
            $sql = "
                SELECT d.id, d.file_name, d.file_description, d.category,
                       CONVERT(VARCHAR, d.created_at, 126) AS created_at, 
                       u.username AS uploaded_by
                FROM dbo.{$documentsTable} d
                LEFT JOIN dbo.{$usersTable} u ON d.uploaded_by_user_id = u.id
                {$finalWhereClause}
                ORDER BY d.created_at DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";
            
            $stmt = $pdo->prepare($sql);
            
            $paramIndex = 1;
            foreach ($params as $param) {
                $stmt->bindValue($paramIndex++, $param);
            }
            $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
            $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
            
            $stmt->execute();
            $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $countSql = "SELECT COUNT(*) FROM dbo.{$documentsTable} d LEFT JOIN dbo.{$usersTable} u ON d.uploaded_by_user_id = u.id {$finalWhereClause}";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = $countStmt->fetchColumn();

            echo json_encode([
                'success' => true,
                'data' => $documents,
                'pagination' => [ 'currentPage' => $page, 'totalPages' => ceil($totalRecords / $limit), 'totalRecords' => (int)$totalRecords ]
            ]);
            break;

        //==================================
        //  GET CATEGORIES
        //==================================
        case 'get_categories':
            $sql = "SELECT DISTINCT category FROM dbo.{$documentsTable} WHERE category IS NOT NULL AND category != '' ORDER BY category ASC";
            $stmt = $pdo->query($sql);
            $categories = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
            echo json_encode(['success' => true, 'data' => $categories]);
            break;

        //==================================
        //  UPLOAD DOCUMENT
        //==================================
        case 'upload':
            if (!hasRole(['admin', 'creator'])) {
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
            $allowedMimeTypes = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png'];

            if ($file['size'] > $maxFileSize) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'File is too large. Maximum size is 20MB.']);
                exit;
            }
            if (!in_array($file['type'], $allowedMimeTypes)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid file type. Supported formats: PDF, Word, Excel, JPG, PNG.']);
                exit;
            }
            try {
                $uploadDir = __DIR__ . '/../../../documents/';
                $originalFileName = basename($file['name']);
                $fileExtension = pathinfo($originalFileName, PATHINFO_EXTENSION);
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
        //  UPDATE DOCUMENT
        //==================================
        case 'update':
            if (!hasRole(['admin', 'creator'])) {
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
            if (!hasRole(['admin', 'creator'])) {
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
                    $fullPath = __DIR__ . '/../../../documents/' . $filePath;
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