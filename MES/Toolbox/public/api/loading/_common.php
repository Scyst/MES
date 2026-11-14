<?php
/**
 * Shared helpers, C-TPAT 10-point checklists (operator & official A4 print),
 * upload directory resolver, auth/CSRF verification, and response helpers
 * for self-contained Toolbox Loading Report APIs.
 */

if (!defined('LOADING_SKIP_JSON_HEADER')) {
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

/** Emits standard JSON success envelope and stops execution. */
function ldJsonSuccess($data = null, string $message = 'OK', array $extra = []): void {
    echo json_encode(array_merge([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Emits standard JSON error envelope and stops execution. */
function ldJsonError(string $message, int $httpCode = 400, $data = null): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'data' => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Parses GET/POST/JSON body, verifies session, and enforces CSRF token on mutations. */
function parseLoadingRequest(string $defaultAction = ''): array {
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
        $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        if ($headerToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $headerToken)) {
            ldJsonError('การตรวจสอบความปลอดภัย (CSRF Token) ไม่ถูกต้อง กรุณารีเฟรชหน้าจอ', 403);
        }
    }

    $currentUser = $_SESSION['user'] ?? [];
    if (empty($currentUser['id'])) {
        ldJsonError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    }

    $action = trim((string)($input['action'] ?? $defaultAction));
    return [$action, $input, $currentUser];
}

/** Enforces access permissions for C-TPAT loading report operations. */
function requireLoadingAccess(bool $requireReopen = false): void {
    if ($requireReopen) {
        if (hasPermission('manage_warehouse') || hasPermission('manage_shipment') || hasRole(['creator', 'admin', 'manager', 'supervisor'])) {
            return;
        }
        ldJsonError('คุณไม่มีสิทธิ์ปลดล็อกรายงาน Loading Report ที่เสร็จสิ้นแล้ว', 403);
    }

    if (hasPermission('view_production') || hasPermission('view_warehouse') || hasPermission('view_sales') || hasRole(['creator', 'admin', 'manager', 'planner', 'supervisor', 'qc', 'operator'])) {
        return;
    }
    ldJsonError('คุณไม่มีสิทธิ์เข้าใช้งานระบบ Loading Report (C-TPAT)', 403);
}

/** Resolves ordered search paths for loading_reports image directory across FTP/local layouts. */
function resolveLoadingUploadSearchDirs(): array {
    $candidates = [
        dirname(__DIR__, 3) . '/MES/MES/uploads/loading_reports',
        dirname(__DIR__, 4) . '/MES/MES/uploads/loading_reports',
        dirname(__DIR__, 4) . '/uploads/loading_reports',
        dirname(__DIR__, 3) . '/uploads/loading_reports',
        dirname(__DIR__, 2) . '/uploads/loading_reports',
    ];
    $dirs = [];
    foreach ($candidates as $dir) {
        if (is_dir($dir)) {
            $real = realpath($dir);
            if ($real !== false && !in_array($real, $dirs, true)) {
                $dirs[] = $real;
            }
        }
    }
    return $dirs;
}

/** Resolves writable target directory for new C-TPAT photos outside web root where available. */
function resolveWritableLoadingUploadDir(): string {
    $candidates = [
        dirname(__DIR__, 3) . '/MES/MES/uploads/loading_reports',
        dirname(__DIR__, 4) . '/uploads/loading_reports',
        dirname(__DIR__, 3) . '/uploads/loading_reports',
    ];
    foreach ($candidates as $dir) {
        $parent = dirname($dir);
        if (is_dir($dir) && is_writable($dir)) {
            return realpath($dir) ?: $dir;
        }
        if (is_dir($parent) && is_writable($parent)) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
            if (is_dir($dir)) {
                return realpath($dir) ?: $dir;
            }
        }
    }
    $fallback = dirname(__DIR__, 3) . '/uploads/loading_reports';
    if (!is_dir($fallback)) {
        @mkdir($fallback, 0755, true);
    }
    return realpath($fallback) ?: $fallback;
}

/** Returns operator 10-point C-TPAT inspection checklist structure. */
function getToolboxCtpatChecklist(): array {
    return [
        1 => [
            'title' => 'Undercarriage (ใต้ท้องรถ)',
            'items' => [
                'Support beams are visible (คานรับน้ำหนักมองเห็นชัดเจน)',
                'Wheels and tires look normal (ล้อและยางดูปกติ)',
            ],
        ],
        2 => [
            'title' => 'Doors Inside/Outside (ประตู - ใน/นอก)',
            'items' => [
                'Ribs of doors are visible (ขอบประตูด้านในมองเห็นชัดเจน)',
                'Secure and reliable locking mechanisms (กลไกการล็อคแน่นหนา)',
                'Different color bonding material (วัสดุเชื่อม/หมุดย้ำ สีผิดปกติหรือไม่)',
                'Loose bolts (น็อตหรือเกลียวปล่อยหลวม/หาย)',
                'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
                'Rusty (มีสนิมเกาะกินโครงสร้าง)',
            ],
        ],
        3 => [
            'title' => 'Right Side (ผนังด้านขวา)',
            'items' => [
                'Repairs to walls visible on outside (รอยซ่อมจากด้านใน ต้องเห็นร่องรอยด้านนอก)',
                'Visible ribs on the interior side of each door (ผนังประตูด้านในแต่ละด้านควรมีตัวดาม)',
                'Tap side walls for hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)',
                'Unusual repairs to structural beams (การซ่อมแซมคานที่ดูผิดปกติ)',
                'Different color bonding material (วัสดุเชื่อมสีผิดปกติ)',
                'Loose bolts (น็อตหรือเกลียวปล่อยหลวม/หาย)',
                'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
                'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
                'Rusty (มีสนิม)',
            ],
        ],
        4 => [
            'title' => 'Left Side (ผนังด้านซ้าย)',
            'items' => [
                'Repairs to walls visible on outside (รอยซ่อมจากด้านใน ต้องเห็นร่องรอยด้านนอก)',
                'Visible ribs on the interior side of each door (ผนังประตูด้านในแต่ละด้านควรมีตัวดาม)',
                'Tap side walls for hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)',
                'Unusual repairs to structural beams (การซ่อมแซมคานที่ดูผิดปกติ)',
                'Different color bonding material (วัสดุเชื่อมสีผิดปกติ)',
                'Loose bolts (น็อตหรือเกลียวปล่อยหลวม/หาย)',
                'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
                'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
                'Rusty (มีสนิม)',
            ],
        ],
        5 => [
            'title' => 'Front Wall (ผนังด้านหน้า)',
            'items' => [
                'Use a measuring tape or string to determine the length of container (ใช้ตลับเมตรวัดความยาวตู้)',
                'Blocks and vents are visible (เห็นช่องระบายอากาศและบล็อกกันกระแทกชัดเจน)',
                'Tap front wall. Listen/feel for a hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)',
            ],
        ],
        6 => [
            'title' => 'Ceiling / Roof (เพดาน / หลังคา)',
            'note' => "False compartments are common in ceilings, beams, floors, doors and the front wall. If unable to see roof of container, use ladder or a mirror attached to a pole\nช่องลับมักพบได้ในเพดาน, คาน, พื้น, ประตู และผนังด้านหน้า หากไม่สามารถมองเห็นหลังคาของตู้คอนเทนเนอร์ได้ ให้ใช้บันไดหรือกระจกที่ติดปลายไม้",
            'items' => [
                'Ceiling is a certain height from floor (เพดานมีความสูงจากพื้นตามที่กำหนด)',
                'Repairs to the ceiling on the inside of the container must be visible on the outside (การซ่อมแซมรอยเชื่อมด้านในต้องเห็นด้านนอก)',
                'Blocks and vents are visible (บล็อคและช่องระบายอากาศสามารถมองเห็นได้)',
                'Support beams are visible (คานรองรับสามารถมองเห็นได้)',
                'Tap ceiling/roof. Listen/feel for a hollow sound (เคาะเพดานเช็คเสียงกลวง)',
                'Uncomfortable feeling inside (ด้านในคอนเทนเนอร์โปร่ง ไม่อับ)',
                'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
                'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
                'Rusty (มีสนิม)',
            ],
        ],
        7 => [
            'title' => 'Floor (พื้นตู้)',
            'note' => "Floor should be flat. Do not need to step up to get inside. พื้นควรเรียบเสมอกัน ไม่ควรมีพื้นยกระดับ",
            'items' => [
                'Floor a regulated height from ceiling (วัดความสูงระหว่างพื้นและเพดานปกติ)',
                'Clean (พื้นผิวสะอาดและเรียบร้อย)',
                'Dry (พื้นแห้ง ไม่มีรอยเปื้อนหรือคราบน้ำ)',
                'Different floor heights (พื้นเรียบเสมอกัน ไม่มีรอยนูน)',
                'Unusual repairs (ไม่มีรอยซ่อมพื้นผิดปกติ)',
                'Oil stain (ไม่มีคราบน้ำมัน)',
            ],
        ],
        8 => [
            'title' => 'Door Lock (การล็อคประตู)',
            'items' => [
                'Doors completely seal when closed (ประตูคอนเทนเนอร์ปิดสนิท)',
                'Hinges are secure and reliable (บานพับแน่นหนาและมั่นคง)',
                'Bar of each door is working properly (คานประตู/ตัวล็อค ทำงานได้ปกติ)',
                'Problems locking door (กลอนประตูไม่มีปัญหาในการล็อค)',
            ],
        ],
        9 => [
            'title' => 'Seal Verification (ตรวจสอบซีล)',
            'items' => [
                'Seal meets or exceeds PAS ISO 17712 (ซีลได้มาตรฐาน ISO 17712)',
                'Ensure Seal is not broken/damaged (ซีลไม่ชำรุดหรือเสียหาย)',
                'Verify seal number accuracy (เลขซีลตรงกับเอกสาร)',
                'Tug seal to make sure it is properly affixed (ดึงซีลเพื่อตรวจสอบความแน่นหนา)',
                'Twist and turn seal to make sure it does not unscrew (บิดหมุนซีลยืนยันว่าไม่คลาย)',
            ],
        ],
        10 => [
            'title' => 'Agricultural Contaminants (สิ่งปนเปื้อน)',
            'items' => [
                'No Visible agricultural contaminants such as insects, pests, dirt, plant, or animal matter (ไม่มีสิ่งปนเปื้อนทางการเกษตร แมลง ดิน พืช สัตว์)',
            ],
        ],
    ];
}
