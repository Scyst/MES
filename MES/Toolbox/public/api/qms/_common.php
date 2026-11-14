<?php
/**
 * Shared security, request parsing, validation, permission, and image storage
 * helpers for self-contained Toolbox QMS APIs (NCR, CAR 8D, Claims, Concession, QA Schedule).
 */

if (!defined('QMS_SKIP_JSON_HEADER')) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
}
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

date_default_timezone_set('Asia/Bangkok');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

/**
 * Emits standard API JSON success payload and stops execution.
 */
function qmsJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    $payload = array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/**
 * Emits standard API JSON error payload and stops execution.
 */
function qmsJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/**
 * Parses GET/POST/JSON inputs, authenticates user, enforces CSRF on mutating calls,
 * and returns [$action, $input, $currentUser].
 */
function parseQmsRequest(): array {
    $rawBody = file_get_contents('php://input');
    $jsonBody = [];
    if ($rawBody !== false && trim($rawBody) !== '') {
        $decoded = json_decode($rawBody, true);
        if (is_array($decoded)) {
            $jsonBody = $decoded;
        }
    }

    $input = array_merge($_GET, $_POST, $jsonBody);
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if ($method !== 'GET' && $method !== 'HEAD' && $method !== 'OPTIONS') {
        $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        if ($headerToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $headerToken)) {
            qmsJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        qmsJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? ''));
    return [$action, $input, $currentUser];
}

/**
 * Verifies user permissions or QA/QC/supervisor/manager/admin role membership.
 */
function requireQmsAccess(
    array $permissions = ['view_qms', 'manage_qms', 'view_production'],
    array $roles = ['admin', 'creator', 'manager', 'supervisor', 'qa', 'qc']
): void {
    if (hasRole($roles)) {
        return;
    }
    foreach ($permissions as $perm) {
        if (hasPermission($perm)) {
            return;
        }
    }
    qmsJsonError('คุณไม่มีสิทธิ์เข้าถึงระบบจัดการคุณภาพ (QMS)', 403);
}

/**
 * Validates positive integer ID.
 */
function parseQmsPositiveInt($value, string $label = 'รหัสอ้างอิง'): int {
    $intVal = filter_var($value, FILTER_VALIDATE_INT);
    if ($intVal === false || $intVal <= 0) {
        throw new InvalidArgumentException("กรุณาระบุ {$label} ที่ถูกต้อง");
    }
    return (int)$intVal;
}

/**
 * Parses YYYY-MM-DD date string or returns null when empty.
 */
function parseQmsDateOrNull(?string $rawDate): ?string {
    $trimmed = trim((string)$rawDate);
    if ($trimmed === '') {
        return null;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $trimmed);
    if (!$dt || $dt->format('Y-m-d') !== $trimmed) {
        throw new InvalidArgumentException('รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)');
    }
    return $trimmed;
}

/**
 * Parses bounded decimal input for manufacturing precision.
 */
function parseQmsBoundedFloat($value, string $label, float $min = 0, float $max = 9999999.999, bool $nullable = false): ?float {
    $trimmed = is_string($value) ? trim($value) : $value;
    if ($trimmed === null || $trimmed === '') {
        if ($nullable) {
            return null;
        }
        throw new InvalidArgumentException("{$label} ต้องระบุเป็นตัวเลข");
    }
    if (!is_numeric($trimmed)) {
        throw new InvalidArgumentException("{$label} ต้องเป็นตัวเลขที่ถูกต้อง");
    }
    $num = round((float)$trimmed, 4);
    if (!is_finite($num) || $num < $min || $num > $max) {
        throw new InvalidArgumentException("{$label} ต้องอยู่ระหว่าง {$min} ถึง {$max}");
    }
    return $num;
}

/**
 * Resolves the actor display name (Thai name preferred via MANPOWER_EMPLOYEES).
 */
function resolveQmsActorName(PDO $pdo, array $currentUser): string {
    $userId = (int)($currentUser['id'] ?? 0);
    if ($userId > 0) {
        try {
            $stmt = $pdo->prepare(
                "SELECT TOP 1 COALESCE(NULLIF(m.name_th, ''), NULLIF(u.fullname, ''), u.username) AS real_name
                 FROM dbo.USERS u WITH (NOLOCK)
                 LEFT JOIN dbo.MANPOWER_EMPLOYEES m WITH (NOLOCK) ON u.username = m.emp_id
                 WHERE u.id = ?"
            );
            $stmt->execute([$userId]);
            $name = trim((string)$stmt->fetchColumn());
            if ($name !== '') {
                return $name;
            }
        } catch (Throwable $e) {
            // Fall through to session fields cleanly
        }
    }
    $full = trim((string)($currentUser['fullname'] ?? ''));
    return $full !== '' ? $full : trim((string)($currentUser['username'] ?? 'SYSTEM'));
}

/**
 * Resolves shared MES uploads base directory across FTP & local layouts.
 */
function resolveQmsUploadsBaseDir(): string {
    $candidates = [
        dirname(__DIR__, 3) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/uploads',
        dirname(__DIR__, 3) . '/uploads',
        dirname(__DIR__, 2) . '/uploads',
    ];
    foreach ($candidates as $dir) {
        if (is_dir($dir)) {
            $real = realpath($dir);
            return $real !== false ? $real : $dir;
        }
    }
    $fallback = dirname(__DIR__, 4) . '/uploads';
    if (!is_dir($fallback)) {
        @mkdir($fallback, 0755, true);
    }
    $real = realpath($fallback);
    return $real !== false ? $real : $fallback;
}

/**
 * Returns ordered candidate directories when locating existing QMS/Concession files.
 */
function resolveQmsUploadSearchDirs(): array {
    $dirs = [];
    $candidates = [
        resolveQmsUploadsBaseDir(),
        dirname(__DIR__, 3) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/MES/MES/uploads',
        dirname(__DIR__, 4) . '/uploads',
        dirname(__DIR__, 3) . '/uploads',
        dirname(__DIR__, 2) . '/uploads',
    ];
    foreach ($candidates as $dir) {
        $real = realpath($dir);
        if ($real !== false && is_dir($real) && !in_array($real, $dirs, true)) {
            $dirs[] = $real;
        }
    }
    return $dirs;
}

/**
 * Validates and persists multipart uploaded image files safely into shared uploads/.
 * Returns array of ['name' => originalName, 'path' => 'uploads/<subFolder>/<filename>'].
 */
function saveQmsUploadedFiles(array $fileField, string $subFolder, string $prefix, int $maxCount = 5): array {
    if (empty($fileField['name'])) {
        return [];
    }

    $names = is_array($fileField['name']) ? $fileField['name'] : [$fileField['name']];
    $tmps = is_array($fileField['tmp_name']) ? $fileField['tmp_name'] : [$fileField['tmp_name']];
    $errors = is_array($fileField['error']) ? $fileField['error'] : [$fileField['error']];
    $sizes = is_array($fileField['size']) ? $fileField['size'] : [$fileField['size']];

    $allowedFolders = ['qms_files', 'concessions'];
    if (!in_array($subFolder, $allowedFolders, true)) {
        $subFolder = 'qms_files';
    }

    $extMap = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    $baseUploads = resolveQmsUploadsBaseDir();
    $targetDir = $baseUploads . DIRECTORY_SEPARATOR . $subFolder;
    if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) {
        throw new RuntimeException('ไม่สามารถสร้างโฟลเดอร์จัดเก็บรูปภาพได้');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $saved = [];

    foreach ($names as $idx => $origName) {
        if (count($saved) >= $maxCount) {
            break;
        }
        if ((int)($errors[$idx] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }
        $tmpPath = $tmps[$idx] ?? '';
        if ($tmpPath === '' || !is_uploaded_file($tmpPath) && !is_file($tmpPath)) {
            continue;
        }
        if ((int)($sizes[$idx] ?? 0) > 5 * 1024 * 1024) {
            throw new InvalidArgumentException('ขนาดรูปภาพแต่ละไฟล์ต้องไม่เกิน 5 MB');
        }
        $mime = $finfo->file($tmpPath);
        if (!isset($extMap[$mime])) {
            throw new InvalidArgumentException('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WebP เท่านั้น');
        }

        $safePrefix = preg_replace('/[^A-Za-z0-9_-]/', '_', $prefix);
        $newFilename = $safePrefix . time() . '_' . $idx . '_' . bin2hex(random_bytes(3)) . '.' . $extMap[$mime];
        $destPath = $targetDir . DIRECTORY_SEPARATOR . $newFilename;

        if (!move_uploaded_file($tmpPath, $destPath)) {
            if (!@copy($tmpPath, $destPath)) {
                throw new RuntimeException('ไม่สามารถบันทึกไฟล์รูปภาพที่อัปโหลดได้');
            }
        }

        $saved[] = [
            'name' => basename((string)$origName),
            'path' => 'uploads/' . $subFolder . '/' . $newFilename,
        ];
    }

    return $saved;
}

/**
 * Appends a status transition entry into QMS_AUDIT_LOGS.
 */
function insertQmsCaseAuditLog(
    PDO $pdo,
    int $caseId,
    string $actionType,
    ?string $oldStatus,
    ?string $newStatus,
    string $actorName
): void {
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO dbo.QMS_AUDIT_LOGS (case_id, action_type, old_status, new_status, updated_by, updated_at)
             VALUES (?, ?, ?, ?, ?, GETDATE())"
        );
        $stmt->execute([$caseId, $actionType, $oldStatus, $newStatus, mb_substr($actorName, 0, 100)]);
    } catch (Throwable $e) {
        error_log('[QMS_AUDIT_LOGS] ' . $e->getMessage());
    }
}
