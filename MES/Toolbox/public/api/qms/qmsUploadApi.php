<?php
/**
 * QMS Authenticated Image Upload & Secure Media Reader Endpoint
 * Reads legacy and SPA attachments stored under uploads/qms_files/ and uploads/concessions/.
 */

if (($_GET['action'] ?? $_REQUEST['action'] ?? '') === 'view_image') {
    define('QMS_SKIP_JSON_HEADER', true);
}

require_once __DIR__ . '/_common.php';

try {
    [$action, $input, $currentUser] = parseQmsRequest();

    if ($action === 'view_image') {
        $rawPath = str_replace('\\', '/', trim((string)($input['path'] ?? '')));
        $cleanPath = preg_replace('#^(\.\./)+#', '', $rawPath);
        $cleanPath = ltrim($cleanPath, '/');

        if (!preg_match('#^uploads/(qms_files|concessions)/[A-Za-z0-9._-]+$#', $cleanPath)) {
            http_response_code(400);
            exit('Invalid image path');
        }

        $relUnderUploads = substr($cleanPath, strlen('uploads/'));
        $foundFile = null;
        foreach (resolveQmsUploadSearchDirs() as $baseDir) {
            $candidate = realpath($baseDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relUnderUploads));
            if ($candidate !== false && strpos($candidate, $baseDir) === 0 && is_file($candidate)) {
                $foundFile = $candidate;
                break;
            }
        }

        if ($foundFile === null) {
            http_response_code(404);
            exit('Image not found');
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($foundFile) ?: 'application/octet-stream';
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
            http_response_code(403);
            exit('Unsupported media type');
        }

        header('Content-Type: ' . $mime);
        header('Content-Length: ' . (string)filesize($foundFile));
        header('Cache-Control: private, max-age=3600');
        readfile($foundFile);
        exit;
    }

    requireQmsAccess();

    if ($action === 'upload_case_files') {
        $caseId = parseQmsPositiveInt($input['case_id'] ?? null, 'รหัสเคส QMS');
        $docStage = strtoupper(trim((string)($input['doc_stage'] ?? 'NCR')));
        if (!in_array($docStage, ['NCR', 'CAR', 'CLAIM'], true)) {
            $docStage = 'NCR';
        }

        $filesField = $_FILES['files'] ?? ($_FILES['ncr_images'] ?? []);
        $saved = saveQmsUploadedFiles($filesField, 'qms_files', "car_{$caseId}_", 5);
        if (empty($saved)) {
            qmsJsonError('กรุณาแนบไฟล์รูปภาพที่ต้องการอัปโหลด', 400);
        }

        $userId = (int)$currentUser['id'];
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            "INSERT INTO dbo.QMS_FILE (case_id, doc_stage, file_name, file_path, uploaded_by, uploaded_at)
             VALUES (?, ?, ?, ?, ?, GETDATE())"
        );
        foreach ($saved as $file) {
            $stmt->execute([$caseId, $docStage, $file['name'], $file['path'], $userId]);
        }
        $pdo->commit();

        writeLog($pdo, 'CREATE', 'QMS_FILE', $caseId, null, $saved, "Uploaded {$docStage} attachment(s)");
        qmsJsonSuccess(['files' => $saved], 'อัปโหลดรูปภาพเรียบร้อยแล้ว');
    }

    qmsJsonError('ไม่พบ Action ที่ระบุ', 400);
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    qmsJsonError($e->getMessage(), 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (defined('QMS_SKIP_JSON_HEADER')) {
        http_response_code(500);
        exit('Unable to load media');
    }
    if (isset($pdo)) {
        writeErrorLog($pdo, 'QMS_UPLOAD', $e->getMessage(), $input ?? null);
    }
    qmsJsonError('เกิดข้อผิดพลาดในการจัดการไฟล์แนบ QMS', 500);
}
