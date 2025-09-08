<?php
// MES/page/documentCenter/api/upload_document.php

header('Content-Type: application/json');

require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// --- 1. ตรวจสอบสิทธิ์: เฉพาะ admin และ creator เท่านั้นที่อัปโหลดได้ ---
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Permission Denied. You do not have rights to upload documents.']);
    exit;
}

// --- 2. ตรวจสอบว่าเป็น Method POST และมีไฟล์ส่งมาหรือไม่ ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

if (!isset($_FILES['doc_file']) || $_FILES['doc_file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or an upload error occurred.']);
    exit;
}

// --- 3. การตั้งค่าและตรวจสอบไฟล์ ---
$file = $_FILES['doc_file'];
$maxFileSize = 20 * 1024 * 1024; // 20 MB
$allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
];

if ($file['size'] > $maxFileSize) {
    http_response_code(400);
    echo json_encode(['error' => 'File is too large. Maximum size is 20MB.']);
    exit;
}

if (!in_array($file['type'], $allowedMimeTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Supported formats: PDF, Word, Excel, JPG, PNG.']);
    exit;
}

// --- 4. จัดการไฟล์และเตรียมบันทึกลงฐานข้อมูล ---
try {
    $uploadDir = __DIR__ . '/../../../documents/';
    
    // สร้างชื่อไฟล์ใหม่ที่ไม่ซ้ำกันเพื่อป้องกันการเขียนทับ
    $originalFileName = basename($file['name']);
    $fileExtension = pathinfo($originalFileName, PATHINFO_EXTENSION);
    $safeFileName = preg_replace("/[^A-Za-z0-9\._-]/", '', pathinfo($originalFileName, PATHINFO_FILENAME));
    $newFileName = $safeFileName . '_' . uniqid() . '.' . $fileExtension;
    $destination = $uploadDir . $newFileName;

    // ย้ายไฟล์ไปยังโฟลเดอร์ documents
    if (move_uploaded_file($file['tmp_name'], $destination)) {
        
        // --- 5. บันทึกข้อมูลลงฐานข้อมูล ---
        $sql = "INSERT INTO dbo.DOCUMENTS (file_name, file_description, file_path, file_type, file_size, category, uploaded_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $originalFileName,
            $_POST['file_description'] ?? null,
            $newFileName, // เก็บเฉพาะชื่อไฟล์ใหม่, ไม่ใช่ full path
            $file['type'],
            $file['size'],
            $_POST['category'] ?? null,
            $_SESSION['user']['id']
        ]);

        echo json_encode(['success' => true, 'message' => 'File uploaded successfully.']);

    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to move uploaded file. Check folder permissions.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>