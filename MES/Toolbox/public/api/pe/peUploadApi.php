<?php
/**
 * PE Enterprise Image Upload & Secure Reader Endpoint
 * Handles both binary multipart/base64 image uploads and authenticated viewing of shared PE images.
 */

if (($_GET['action'] ?? $_REQUEST['action'] ?? '') === 'view_image') {
    define('PE_SKIP_JSON_HEADER', true);
}

require_once __DIR__ . '/_common.php';

try {
    [$action, $input, $currentUser] = parsePeRequest();

    if ($action === 'view_image') {
        $rawPath = str_replace('\\', '/', trim((string)($input['path'] ?? '')));
        // Normalize leading relative prefixes if stored by legacy callers
        $cleanPath = preg_replace('#^(\.\./)+#', '', $rawPath);
        $cleanPath = ltrim($cleanPath, '/');

        if (!preg_match('#^uploads/(pe_images|spare_parts)/[A-Za-z0-9._-]+$#', $cleanPath) &&
            !preg_match('#^uploads/iiot-map-bg\.(jpg|jpeg|png|webp)$#i', $cleanPath)) {
            http_response_code(400);
            exit('Invalid image path');
        }

        $relUnderUploads = substr($cleanPath, strlen('uploads/'));
        $foundFile = null;
        foreach (resolvePeUploadSearchDirs() as $baseDir) {
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

    requirePeAccess();

    if ($action === 'upload_image') {
        $subFolder = trim((string)($input['folder'] ?? 'pe_images'));
        if (!in_array($subFolder, ['pe_images', 'spare_parts'], true)) {
            $subFolder = 'pe_images';
        }
        $prefix = trim((string)($input['prefix'] ?? ($subFolder === 'spare_parts' ? 'SP_' : 'PE_')));

        if (!empty($_FILES['image']) && ($_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $file = $_FILES['image'];
            if ((int)$file['size'] > 5 * 1024 * 1024) {
                peJsonError('ขนาดรูปภาพต้องไม่เกิน 5 MB', 400);
            }
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($file['tmp_name']);
            $extMap = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
            ];
            if (!isset($extMap[$mime])) {
                peJsonError('รองรับเฉพาะไฟล์ภาพ JPG, PNG หรือ WebP เท่านั้น', 400);
            }

            $baseUploads = resolvePeUploadsBaseDir();
            $targetDir = $baseUploads . DIRECTORY_SEPARATOR . $subFolder;
            if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) {
                throw new RuntimeException('ไม่สามารถสร้างโฟลเดอร์จัดเก็บรูปภาพได้');
            }

            $safePrefix = preg_replace('/[^A-Za-z0-9_-]/', '_', $prefix);
            $filename = $safePrefix . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extMap[$mime];
            $destPath = $targetDir . DIRECTORY_SEPARATOR . $filename;
            if (!move_uploaded_file($file['tmp_name'], $destPath)) {
                throw new RuntimeException('ไม่สามารถย้ายไฟล์ภาพที่อัปโหลดได้');
            }
            $relPath = 'uploads/' . $subFolder . '/' . $filename;
        } elseif (!empty($input['image_base64'])) {
            $relPath = savePeBase64Image((string)$input['image_base64'], $subFolder, $prefix);
        } else {
            peJsonError('กรุณาแนบไฟล์รูปภาพที่ต้องการอัปโหลด', 400);
        }

        peJsonSuccess([
            'path' => $relPath,
            'url' => 'api/pe/peUploadApi.php?action=view_image&path=' . rawurlencode((string)$relPath),
        ], 'อัปโหลดรูปภาพสำเร็จ');
    }

    peJsonError('Invalid action requested', 400);
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
