<?php
/**
 * documentCenterAPI.php
 * Central Self-Contained API Endpoint for Toolbox Document Center
 * MES & IIoT Toolbox - SNC Former (B9)
 * Standard: Industrial Audit Trail Protocol (SYSTEM_LOGS) & Strict Security
 */

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

// Path resolver for upload directory across local dev & production FTP
function getDocumentUploadDir() {
    $candidates = [
        __DIR__ . '/../../../../uploads/documentCenter/',
        __DIR__ . '/../../../MES/MES/uploads/documentCenter/',
        __DIR__ . '/../../MES/MES/uploads/documentCenter/',
        __DIR__ . '/../MES/MES/uploads/documentCenter/',
        __DIR__ . '/../../uploads/documentCenter/'
    ];
    foreach ($candidates as $dir) {
        if (is_dir($dir)) {
            return realpath($dir) . DIRECTORY_SEPARATOR;
        }
    }
    // Fallback default create if missing
    $fallback = __DIR__ . '/../../../../uploads/documentCenter/';
    if (!is_dir($fallback)) {
        @mkdir($fallback, 0777, true);
    }
    return $fallback;
}

$action = $_REQUEST['action'] ?? '';
if (empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}

// CSRF check on state-mutating requests
$writeActions = ['upload', 'update', 'delete', 'revise', 'create_folder', 'rename'];
if (in_array($action, $writeActions)) {
    $csrfTokenHeader = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $csrfTokenHeader)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'CSRF token mismatch or missing. กรุณารีเฟรชหน้าจอแล้วลองใหม่อีกครั้ง'
        ]);
        exit;
    }
}

try {
    $documentsTable = defined('DOCUMENTS_TABLE') ? DOCUMENTS_TABLE : 'DOCUMENTS';
    $usersTable = defined('USERS_TABLE') ? USERS_TABLE : 'USERS';
    $manpowerEmployeesTable = defined('MANPOWER_EMPLOYEES_TABLE') ? MANPOWER_EMPLOYEES_TABLE : 'MANPOWER_EMPLOYEES';
    $currentUser = $_SESSION['user'] ?? null;

    $canManage = hasRole(['admin', 'creator', 'qc', 'supervisor']) || hasPermission('manage_documents');

    switch ($action) {
        // ==========================================
        // 1. GET DOCUMENTS & FOLDERS
        // ==========================================
        case 'get_documents':
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(10, min(100, (int)($_GET['limit'] ?? 30)));
            $offset = ($page - 1) * $limit;
            $searchTerm = trim($_GET['search'] ?? '');
            $folderPath = trim($_GET['folderPath'] ?? '');

            $foldersToReturn = [];

            // 1.1 Fetch explicit and implicit folders if not in global search mode
            if (empty($searchTerm)) {
                $sqlFolders = "
                    SELECT d.id, d.file_name, d.category, CONVERT(VARCHAR, d.created_at, 126) AS created_at,
                           COALESCE(NULLIF(LTRIM(RTRIM(u.fullname)), ''), NULLIF(LTRIM(RTRIM(m.name_th)), ''), u.username) AS uploaded_by,
                           u.username AS uploader_username,
                           u.profile_picture AS uploader_avatar
                    FROM dbo.{$documentsTable} d WITH (NOLOCK)
                    LEFT JOIN dbo.{$usersTable} u WITH (NOLOCK) ON d.uploaded_by_user_id = u.id
                    LEFT JOIN dbo.{$manpowerEmployeesTable} m WITH (NOLOCK) ON u.emp_id = m.emp_id
                    WHERE d.file_type = 'folder' AND d.category = ?
                    ORDER BY d.file_name ASC
                ";
                $stmtFolders = $pdo->prepare($sqlFolders);
                $stmtFolders->execute([$folderPath]);
                $explicitFolders = $stmtFolders->fetchAll(PDO::FETCH_ASSOC);

                $existingFolderNames = [];
                foreach ($explicitFolders as $f) {
                    $f['is_folder'] = true;
                    $foldersToReturn[] = $f;
                    $existingFolderNames[$f['file_name']] = true;
                }

                // Implicit folders discovered from categories of existing files
                $likeSearch = $folderPath === '' ? '%' : $folderPath . '/%';
                $sqlCat = "
                    SELECT DISTINCT category 
                    FROM dbo.{$documentsTable} WITH (NOLOCK) 
                    WHERE category LIKE ? AND (file_type != 'folder' OR file_type IS NULL)
                ";
                $stmtCat = $pdo->prepare($sqlCat);
                $stmtCat->execute([$likeSearch]);
                $categories = $stmtCat->fetchAll(PDO::FETCH_COLUMN, 0);

                foreach ($categories as $cat) {
                    if ($cat === $folderPath) continue;
                    $remainingPath = $folderPath === '' ? $cat : substr($cat, strlen($folderPath) + 1);
                    $parts = explode('/', $remainingPath);
                    $directChild = $parts[0] ?? '';
                    if (!empty($directChild) && !isset($existingFolderNames[$directChild])) {
                        $foldersToReturn[] = [
                            'id' => null,
                            'file_name' => $directChild,
                            'category' => $folderPath,
                            'created_at' => null,
                            'uploaded_by' => 'System',
                            'uploader_username' => 'System',
                            'uploader_avatar' => null,
                            'is_folder' => true
                        ];
                        $existingFolderNames[$directChild] = true;
                    }
                }

                usort($foldersToReturn, function ($a, $b) {
                    return strcasecmp($a['file_name'], $b['file_name']);
                });
            }

            // 1.2 Fetch Document records
            $whereClauses = ["(d.file_type != 'folder' OR d.file_type IS NULL)"];
            $params = [];

            if (!empty($searchTerm)) {
                $whereClauses[] = "(d.file_name LIKE ? OR d.file_description LIKE ? OR u.username LIKE ? OR u.fullname LIKE ? OR m.name_th LIKE ?)";
                $searchVal = "%{$searchTerm}%";
                array_push($params, $searchVal, $searchVal, $searchVal, $searchVal, $searchVal);
            } else {
                $whereClauses[] = "d.category = ?";
                $params[] = $folderPath;
            }

            // Non-administrative users see PDFs only
            if (!$canManage) {
                $whereClauses[] = "d.file_name LIKE '%.pdf'";
            }

            $finalWhereClause = 'WHERE ' . implode(' AND ', $whereClauses);

            $sqlDocs = "
                SELECT d.id, d.file_name, d.file_description, d.category, d.file_size, d.file_type,
                       CONVERT(VARCHAR, d.created_at, 126) AS created_at,
                       COALESCE(NULLIF(LTRIM(RTRIM(u.fullname)), ''), NULLIF(LTRIM(RTRIM(m.name_th)), ''), u.username) AS uploaded_by,
                       u.username AS uploader_username,
                       u.profile_picture AS uploader_avatar
                FROM dbo.{$documentsTable} d WITH (NOLOCK)
                LEFT JOIN dbo.{$usersTable} u WITH (NOLOCK) ON d.uploaded_by_user_id = u.id
                LEFT JOIN dbo.{$manpowerEmployeesTable} m WITH (NOLOCK) ON u.emp_id = m.emp_id
                {$finalWhereClause}
                ORDER BY d.created_at DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            ";

            $stmtDocs = $pdo->prepare($sqlDocs);
            $pIdx = 1;
            foreach ($params as $param) {
                $stmtDocs->bindValue($pIdx++, $param);
            }
            $stmtDocs->bindValue($pIdx++, $offset, PDO::PARAM_INT);
            $stmtDocs->bindValue($pIdx++, $limit, PDO::PARAM_INT);
            $stmtDocs->execute();
            $documentsToReturn = $stmtDocs->fetchAll(PDO::FETCH_ASSOC);

            // Check linked 3D models for each PDF document
            foreach ($documentsToReturn as &$doc) {
                $doc['is_folder'] = false;
                $doc['linked_3d_id'] = null;
                $doc['linked_3d_name'] = null;

                $ext = strtolower(pathinfo($doc['file_name'], PATHINFO_EXTENSION));
                if ($ext === 'pdf') {
                    $baseName = pathinfo($doc['file_name'], PATHINFO_FILENAME);
                    $sql3D = "
                        SELECT TOP 1 id, file_name 
                        FROM dbo.{$documentsTable} WITH (NOLOCK)
                        WHERE category = ? 
                        AND LOWER(file_name) IN (?, ?, ?, ?, ?, ?, ?, ?)
                    ";
                    $stmt3D = $pdo->prepare($sql3D);
                    $stmt3D->execute([
                        $doc['category'],
                        strtolower($baseName . '.step'),
                        strtolower($baseName . '.stp'),
                        strtolower($baseName . '.igs'),
                        strtolower($baseName . '.iges'),
                        strtolower($baseName . '.stl'),
                        strtolower($baseName . '.obj'),
                        strtolower($baseName . '.gltf'),
                        strtolower($baseName . '.glb')
                    ]);
                    $linked3D = $stmt3D->fetch(PDO::FETCH_ASSOC);
                    if ($linked3D) {
                        $doc['linked_3d_id'] = $linked3D['id'];
                        $doc['linked_3d_name'] = $linked3D['file_name'];
                    }
                }
            }

            // Total count
            $countSql = "
                SELECT COUNT(*) 
                FROM dbo.{$documentsTable} d WITH (NOLOCK)
                LEFT JOIN dbo.{$usersTable} u WITH (NOLOCK) ON d.uploaded_by_user_id = u.id
                LEFT JOIN dbo.{$manpowerEmployeesTable} m WITH (NOLOCK) ON u.emp_id = m.emp_id
                {$finalWhereClause}
            ";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetchColumn();

            $mergedData = array_merge($foldersToReturn, $documentsToReturn);

            echo json_encode([
                'success' => true,
                'data' => $mergedData,
                'pagination' => [
                    'currentPage' => $page,
                    'totalPages' => max(1, ceil($totalRecords / $limit)),
                    'totalRecords' => $totalRecords,
                    'limit' => $limit
                ]
            ]);
            break;

        // ==========================================
        // 2. GET FOLDER TREE (FOR PICKERS & MODALS)
        // ==========================================
        case 'get_folder_tree':
            $sqlAllFolders = "
                SELECT DISTINCT category 
                FROM dbo.{$documentsTable} WITH (NOLOCK) 
                WHERE category IS NOT NULL AND category != ''
                UNION
                SELECT CASE WHEN category = '' THEN file_name ELSE category + '/' + file_name END AS category
                FROM dbo.{$documentsTable} WITH (NOLOCK)
                WHERE file_type = 'folder'
            ";
            $stmtTree = $pdo->query($sqlAllFolders);
            $rawCategories = $stmtTree->fetchAll(PDO::FETCH_COLUMN, 0);

            $allUniquePaths = ['' => 'All Files (Root)'];
            foreach ($rawCategories as $path) {
                if (empty($path)) continue;
                $parts = explode('/', $path);
                $accum = '';
                foreach ($parts as $p) {
                    $accum = ($accum === '') ? $p : $accum . '/' . $p;
                    $allUniquePaths[$accum] = $accum;
                }
            }
            ksort($allUniquePaths);

            echo json_encode([
                'success' => true,
                'data' => array_values($allUniquePaths)
            ]);
            break;

        // ==========================================
        // 3. CREATE FOLDER
        // ==========================================
        case 'create_folder':
            if (!$canManage) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'ไม่มีสิทธิ์ในการสร้างโฟลเดอร์']);
                exit;
            }

            $inputData = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $folderName = trim($inputData['folder_name'] ?? '');
            $parentPath = trim($inputData['parent_path'] ?? '');

            if (empty($folderName)) {
                throw new Exception('กรุณาระบุชื่อโฟลเดอร์', 400);
            }
            if (preg_match('/[\\\\\\/:*?"<>|]/', $folderName)) {
                throw new Exception('ชื่อโฟลเดอร์ต้องไม่มีอักขระพิเศษ: \\ / : * ? " < > |', 400);
            }

            // Check duplicate
            $checkSql = "SELECT COUNT(*) FROM dbo.{$documentsTable} WHERE file_type = 'folder' AND file_name = ? AND category = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$folderName, $parentPath]);
            if ($checkStmt->fetchColumn() > 0) {
                throw new Exception('มีโฟลเดอร์ชื่อนี้อยู่แล้วในหมวดหมู่นี้', 400);
            }

            $sql = "INSERT INTO dbo.{$documentsTable} (file_name, file_type, category, uploaded_by_user_id, file_path, file_size) VALUES (?, 'folder', ?, ?, '', 0)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$folderName, $parentPath, $currentUser['id']]);
            $newFolderId = (int)$pdo->lastInsertId();

            // Audit Trail Logging
            writeLog(
                $pdo,
                'CREATE_FOLDER',
                'DOCUMENT_CENTER',
                $newFolderId ?: $folderName,
                null,
                ['folder_name' => $folderName, 'category' => $parentPath],
                "สร้างโฟลเดอร์ '{$folderName}' ในเส้นทาง '{$parentPath}'"
            );

            echo json_encode(['success' => true, 'message' => "สร้างโฟลเดอร์ '{$folderName}' เรียบร้อยแล้ว"]);
            break;

        // ==========================================
        // 4. UPLOAD DOCUMENT
        // ==========================================
        case 'upload':
            if (!$canManage) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'ไม่มีสิทธิ์ในการอัปโหลดเอกสาร']);
                exit;
            }
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
                exit;
            }
            if (!isset($_FILES['doc_file']) || $_FILES['doc_file']['error'] !== UPLOAD_ERR_OK) {
                $errCode = $_FILES['doc_file']['error'] ?? 'missing';
                $errMsg = 'ไม่พบไฟล์ที่อัปโหลด หรือเกิดข้อผิดพลาดในการส่งข้อมูล';
                if ($errCode === UPLOAD_ERR_INI_SIZE || $errCode === UPLOAD_ERR_FORM_SIZE) {
                    $errMsg = 'ขนาดไฟล์ใหญ่เกินขีดจำกัดที่เซิร์ฟเวอร์กำหนด (upload_max_filesize)';
                }
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => $errMsg]);
                exit;
            }

            $file = $_FILES['doc_file'];
            $maxFileSize = 50 * 1024 * 1024; // 50MB
            $originalFileName = basename($file['name']);
            $fileExtension = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
            $allowedExtensions = [
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 
                'zip', 'rar', '7z', 'txt', 'step', 'stp', 'igs', 'iges', 'stl', 'obj', 'gltf', 'glb'
            ];

            if ($file['size'] > $maxFileSize) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ขนาดไฟล์เกิน 50MB กรุณาย่อขนาดก่อนอัปโหลด']);
                exit;
            }
            if (!in_array($fileExtension, $allowedExtensions)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ประเภทไฟล์ไม่อยู่ในรายการที่อนุญาต (.pdf, .doc, .xls, .step, 3D, รูปภาพ, zip)']);
                exit;
            }

            $uploadDir = getDocumentUploadDir();
            $safeFileName = preg_replace("/[^A-Za-z0-9\\._-]/", '', pathinfo($originalFileName, PATHINFO_FILENAME));
            $newFileName = $safeFileName . '_' . uniqid() . '.' . $fileExtension;
            $destination = $uploadDir . $newFileName;

            if (move_uploaded_file($file['tmp_name'], $destination)) {
                $category = trim($_POST['category'] ?? '');
                $description = trim($_POST['file_description'] ?? '');

                $sql = "INSERT INTO dbo.{$documentsTable} (file_name, file_description, file_path, file_type, file_size, category, uploaded_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $originalFileName,
                    $description ?: null,
                    $newFileName,
                    $file['type'] ?: 'application/octet-stream',
                    $file['size'],
                    $category,
                    $currentUser['id']
                ]);
                $newDocId = (int)$pdo->lastInsertId();

                // Audit Trail Logging
                writeLog(
                    $pdo,
                    'UPLOAD_DOCUMENT',
                    'DOCUMENT_CENTER',
                    $newDocId ?: $originalFileName,
                    null,
                    [
                        'file_name' => $originalFileName,
                        'file_path' => $newFileName,
                        'category' => $category,
                        'size' => $file['size'],
                        'description' => $description
                    ],
                    "อัปโหลดเอกสาร '{$originalFileName}' ในโฟลเดอร์ '{$category}'"
                );

                echo json_encode(['success' => true, 'message' => "อัปโหลดเอกสาร '{$originalFileName}' สำเร็จแล้ว"]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'ไม่สามารถย้ายไฟล์เข้าสู่ที่จัดเก็บได้ ตรวจสอบสิทธิ์โฟลเดอร์']);
            }
            break;

        // ==========================================
        // 5. REVISE DOCUMENT
        // ==========================================
        case 'revise':
            if (!$canManage) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'ไม่มีสิทธิ์ในการปรับปรุงแก้ไขเอกสาร']);
                exit;
            }
            $documentId = (int)($_POST['document_id'] ?? 0);
            if (!$documentId) {
                throw new Exception('ไม่พบรหัสเอกสารที่ต้องการอัปเดตเวอร์ชัน', 400);
            }
            if (!isset($_FILES['doc_file']) || $_FILES['doc_file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('กรุณาเลือกไฟล์เวอร์ชันใหม่ที่ต้องการอัปโหลด', 400);
            }

            $file = $_FILES['doc_file'];
            $maxFileSize = 50 * 1024 * 1024;
            $originalFileName = basename($file['name']);
            $fileExtension = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
            $allowedExtensions = [
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 
                'zip', 'rar', '7z', 'txt', 'step', 'stp', 'igs', 'iges', 'stl', 'obj', 'gltf', 'glb'
            ];

            if ($file['size'] > $maxFileSize || !in_array($fileExtension, $allowedExtensions)) {
                throw new Exception('ไฟล์ไม่ถูกต้อง หรือมีขนาดเกิน 50MB', 400);
            }

            $stmtOld = $pdo->prepare("SELECT id, file_name, file_path, file_type, file_size, category FROM dbo.{$documentsTable} WHERE id = ?");
            $stmtOld->execute([$documentId]);
            $oldDoc = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldDoc) {
                throw new Exception('ไม่พบเอกสารในระบบ', 404);
            }

            $uploadDir = getDocumentUploadDir();
            $safeFileName = preg_replace("/[^A-Za-z0-9\\._-]/", '', pathinfo($originalFileName, PATHINFO_FILENAME));
            $newFileName = $safeFileName . '_rev_' . uniqid() . '.' . $fileExtension;
            $destination = $uploadDir . $newFileName;

            if (move_uploaded_file($file['tmp_name'], $destination)) {
                // Delete previous physical file if exists
                if (!empty($oldDoc['file_path'])) {
                    $oldFullPath = $uploadDir . $oldDoc['file_path'];
                    if (file_exists($oldFullPath)) {
                        @unlink($oldFullPath);
                    }
                }

                $sql = "UPDATE dbo.{$documentsTable} SET file_name = ?, file_path = ?, file_type = ?, file_size = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$originalFileName, $newFileName, $file['type'] ?: 'application/octet-stream', $file['size'], $documentId]);

                // Audit Trail Logging
                writeLog(
                    $pdo,
                    'REVISE_DOCUMENT',
                    'DOCUMENT_CENTER',
                    $documentId,
                    $oldDoc,
                    [
                        'file_name' => $originalFileName,
                        'file_path' => $newFileName,
                        'file_size' => $file['size']
                    ],
                    "อัปเดต Revision เอกสาร ID {$documentId} เป็นไฟล์ '{$originalFileName}'"
                );

                echo json_encode(['success' => true, 'message' => "อัปเดตเวอร์ชันเอกสาร '{$originalFileName}' สำเร็จแล้ว"]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการย้ายไฟล์เวอร์ชันใหม่']);
            }
            break;

        // ==========================================
        // 6. RENAME DOCUMENT OR FOLDER
        // ==========================================
        case 'rename':
            if (!$canManage) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'ไม่มีสิทธิ์ในการเปลี่ยนชื่อ']);
                exit;
            }
            $inputData = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $itemType = $inputData['item_type'] ?? 'document';
            $docId = !empty($inputData['id']) ? (int)$inputData['id'] : null;
            $oldName = trim($inputData['old_name'] ?? '');
            $newName = trim($inputData['new_name'] ?? '');
            $category = trim($inputData['category'] ?? '');

            if (empty($newName)) {
                throw new Exception('กรุณาระบุชื่อใหม่', 400);
            }
            if (preg_match('/[\\\\\\/:*?"<>|]/', $newName)) {
                throw new Exception('ชื่อต้องไม่มีอักขระพิเศษ: \\ / : * ? " < > |', 400);
            }

            if ($itemType === 'folder') {
                if (empty($oldName)) throw new Exception('ไม่พบชื่อโฟลเดอร์เดิม', 400);
                if ($oldName === $newName) {
                    echo json_encode(['success' => true, 'message' => 'ชื่อโฟลเดอร์ไม่มีการเปลี่ยนแปลง']);
                    exit;
                }

                $oldFullPath = ($category === '' ? $oldName : $category . '/' . $oldName);
                $newFullPath = ($category === '' ? $newName : $category . '/' . $newName);

                $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM dbo.{$documentsTable} WHERE category = ? AND file_name = ? AND file_type = 'folder'");
                $checkStmt->execute([$category, $newName]);
                if ($checkStmt->fetchColumn() > 0) {
                    throw new Exception("มีโฟลเดอร์ชื่อ '{$newName}' อยู่แล้วในตำแหน่งนี้", 400);
                }

                $pdo->beginTransaction();

                if ($docId) {
                    $stmtF = $pdo->prepare("UPDATE dbo.{$documentsTable} SET file_name = ? WHERE id = ? AND file_type = 'folder'");
                    $stmtF->execute([$newName, $docId]);
                } else {
                    $stmtCheckExp = $pdo->prepare("SELECT id FROM dbo.{$documentsTable} WHERE file_type = 'folder' AND file_name = ? AND category = ?");
                    $stmtCheckExp->execute([$oldName, $category]);
                    $expId = $stmtCheckExp->fetchColumn();
                    if ($expId) {
                        $stmtF = $pdo->prepare("UPDATE dbo.{$documentsTable} SET file_name = ? WHERE id = ?");
                        $stmtF->execute([$newName, $expId]);
                    } else {
                        $stmtF = $pdo->prepare("INSERT INTO dbo.{$documentsTable} (file_name, file_type, category, uploaded_by_user_id, file_path, file_size) VALUES (?, 'folder', ?, ?, '', 0)");
                        $stmtF->execute([$newName, $category, $currentUser['id']]);
                    }
                }

                // Cascade rename in children categories
                $stmtC1 = $pdo->prepare("UPDATE dbo.{$documentsTable} SET category = ? WHERE category = ?");
                $stmtC1->execute([$newFullPath, $oldFullPath]);

                $oldPrefix = $oldFullPath . '/';
                $stmtC2 = $pdo->prepare("
                    UPDATE dbo.{$documentsTable} 
                    SET category = STUFF(category, 1, LEN(?), ?)
                    WHERE category LIKE ? + '%'
                ");
                $stmtC2->execute([$oldFullPath, $newFullPath, $oldPrefix]);

                // Audit Trail Logging
                writeLog(
                    $pdo,
                    'RENAME_FOLDER',
                    'DOCUMENT_CENTER',
                    $docId ?: $newFullPath,
                    ['old_folder_path' => $oldFullPath],
                    ['new_folder_path' => $newFullPath],
                    "เปลี่ยนชื่อโฟลเดอร์จาก '{$oldFullPath}' เป็น '{$newFullPath}'"
                );

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'เปลี่ยนชื่อโฟลเดอร์สำเร็จ', 'new_name' => $newName]);
            } else {
                if (!$docId) throw new Exception('ไม่พบรหัสเอกสาร', 400);

                $stmtDoc = $pdo->prepare("SELECT id, file_name, category FROM dbo.{$documentsTable} WHERE id = ?");
                $stmtDoc->execute([$docId]);
                $doc = $stmtDoc->fetch(PDO::FETCH_ASSOC);
                if (!$doc) throw new Exception('ไม่พบเอกสารที่ระบุ', 404);

                $origExt = strtolower(pathinfo($doc['file_name'], PATHINFO_EXTENSION));
                $newExt = strtolower(pathinfo($newName, PATHINFO_EXTENSION));

                $finalName = $newName;
                if (empty($newExt) && !empty($origExt)) {
                    $finalName .= '.' . $origExt;
                }

                $checkDocStmt = $pdo->prepare("SELECT COUNT(*) FROM dbo.{$documentsTable} WHERE category = ? AND file_name = ? AND id != ? AND (file_type != 'folder' OR file_type IS NULL)");
                $checkDocStmt->execute([$doc['category'], $finalName, $docId]);
                if ($checkDocStmt->fetchColumn() > 0) {
                    throw new Exception("มีเอกสารชื่อ '{$finalName}' อยู่แล้วในโฟลเดอร์นี้", 400);
                }

                $stmtUpdateName = $pdo->prepare("UPDATE dbo.{$documentsTable} SET file_name = ? WHERE id = ?");
                $stmtUpdateName->execute([$finalName, $docId]);

                // Audit Trail Logging
                writeLog(
                    $pdo,
                    'RENAME_DOCUMENT',
                    'DOCUMENT_CENTER',
                    $docId,
                    ['file_name' => $doc['file_name']],
                    ['file_name' => $finalName],
                    "เปลี่ยนชื่อเอกสาร ID {$docId} จาก '{$doc['file_name']}' เป็น '{$finalName}'"
                );

                echo json_encode(['success' => true, 'message' => 'เปลี่ยนชื่อเอกสารสำเร็จ', 'new_name' => $finalName]);
            }
            break;

        // ==========================================
        // 7. UPDATE (MOVE OR EDIT DESCRIPTION)
        // ==========================================
        case 'update':
            if (!$canManage) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'ไม่มีสิทธิ์ในการย้ายหรือแก้ไขเอกสาร']);
                exit;
            }
            $inputData = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $documentId = (int)($inputData['document_id'] ?? 0);
            if (!$documentId) throw new Exception('Document ID is required.', 400);

            $stmtOld = $pdo->prepare("SELECT id, file_name, file_description, category FROM dbo.{$documentsTable} WHERE id = ?");
            $stmtOld->execute([$documentId]);
            $oldDoc = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldDoc) throw new Exception('ไม่พบเอกสารในระบบ', 404);

            $targetCategory = trim($inputData['category'] ?? '');
            $newDescription = trim($inputData['description'] ?? '');

            $sql = "UPDATE dbo.{$documentsTable} SET file_description = ?, category = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$newDescription ?: null, $targetCategory, $documentId]);

            // Audit Trail Logging
            writeLog(
                $pdo,
                'MOVE_DOCUMENT',
                'DOCUMENT_CENTER',
                $documentId,
                $oldDoc,
                ['category' => $targetCategory, 'file_description' => $newDescription],
                "ย้ายเอกสาร ID {$documentId} ('{$oldDoc['file_name']}') ไปยังโฟลเดอร์ '{$targetCategory}'"
            );

            echo json_encode(['success' => true, 'message' => 'ย้ายเอกสารไปยังหมวดหมู่เป้าหมายเรียบร้อยแล้ว']);
            break;

        // ==========================================
        // 8. DELETE DOCUMENTS & FOLDERS
        // ==========================================
        case 'delete':
            if (!$canManage) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'ไม่มีสิทธิ์ในการลบเอกสาร']);
                exit;
            }
            $inputData = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $docIds = $inputData['docIds'] ?? [];
            $password = $inputData['password'] ?? '';

            if (empty($docIds) || !is_array($docIds) || empty($password)) {
                throw new Exception('กรุณาระบุรหัสเอกสารและรหัสผ่านเพื่อยืนยันการลบ', 400);
            }

            // Verify admin password
            $stmtUser = $pdo->prepare("SELECT password FROM dbo.{$usersTable} WHERE id = ?");
            $stmtUser->execute([$currentUser['id']]);
            $userDb = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$userDb || !password_verify($password, $userDb['password'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'รหัสผ่านยืนยันไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง']);
                exit;
            }

            $pdo->beginTransaction();

            $placeholders = implode(',', array_fill(0, count($docIds), '?'));
            $uploadDir = getDocumentUploadDir();

            // Find files to delete physically
            $sqlSelect = "SELECT id, file_path, file_name, file_type, category FROM dbo.{$documentsTable} WHERE id IN ($placeholders)";
            $stmtSelect = $pdo->prepare($sqlSelect);
            $stmtSelect->execute($docIds);
            $itemsToDelete = $stmtSelect->fetchAll(PDO::FETCH_ASSOC);

            // Handle folders deletion and cascade delete contents
            $extraIdsToDelete = [];
            foreach ($itemsToDelete as $item) {
                if ($item['file_type'] === 'folder') {
                    $folderPath = ($item['category'] === '') ? $item['file_name'] : $item['category'] . '/' . $item['file_name'];
                    $sqlSub = "SELECT id, file_path, file_name FROM dbo.{$documentsTable} WHERE category = ? OR category LIKE ? + '/%'";
                    $stmtSub = $pdo->prepare($sqlSub);
                    $stmtSub->execute([$folderPath, $folderPath]);
                    $subItems = $stmtSub->fetchAll(PDO::FETCH_ASSOC);
                    foreach ($subItems as $sub) {
                        $extraIdsToDelete[] = $sub['id'];
                        if (!empty($sub['file_path'])) {
                            $fPath = $uploadDir . $sub['file_path'];
                            if (file_exists($fPath)) @unlink($fPath);
                        }
                    }
                }
            }

            $allIdsToDelete = array_unique(array_merge($docIds, $extraIdsToDelete));
            $allPlaceholders = implode(',', array_fill(0, count($allIdsToDelete), '?'));

            $sqlDelete = "DELETE FROM dbo.{$documentsTable} WHERE id IN ($allPlaceholders)";
            $stmtDelete = $pdo->prepare($sqlDelete);
            $stmtDelete->execute($allIdsToDelete);
            $deletedCount = $stmtDelete->rowCount();

            // Delete physical files
            foreach ($itemsToDelete as $item) {
                if (!empty($item['file_path'])) {
                    $fullPath = $uploadDir . $item['file_path'];
                    if (file_exists($fullPath)) {
                        @unlink($fullPath);
                    }
                }
            }

            // Audit Trail Logging
            writeLog(
                $pdo,
                'DELETE_DOCUMENT',
                'DOCUMENT_CENTER',
                implode(',', $allIdsToDelete),
                $itemsToDelete,
                null,
                "ลบเอกสาร/โฟลเดอร์ถาวรจำนวน {$deletedCount} รายการ (รหัส: " . implode(',', $allIdsToDelete) . ")"
            );

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => "ลบเอกสาร/โฟลเดอร์เรียบร้อยแล้วทั้งหมด {$deletedCount} รายการ"
            ]);
            break;

        default:
            throw new Exception("Invalid or unsupported action: {$action}", 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Structured error log
    if (isset($pdo)) {
        writeErrorLog($pdo, 'DOCUMENT_CENTER', $e->getMessage(), $_REQUEST);
    }
    $errorCode = (is_int($e->getCode()) && $e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
    http_response_code($errorCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
