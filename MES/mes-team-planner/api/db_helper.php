<?php
// Resolve paths for local vs sandbox
$authPath1 = __DIR__ . '/../../auth/check_auth.php'; // Local
$authPath2 = __DIR__ . '/../../../MES/MES/auth/check_auth.php'; // Sandbox Server

if (file_exists($authPath1)) require_once $authPath1;
elseif (file_exists($authPath2)) require_once $authPath2;
else die(json_encode(['error' => 'Auth file not found.']));

$dbPath1 = __DIR__ . '/../../page/db.php';
$dbPath2 = __DIR__ . '/../../../MES/MES/page/db.php';

if (file_exists($dbPath1)) require_once $dbPath1;
elseif (file_exists($dbPath2)) require_once $dbPath2;
else die(json_encode(['error' => 'DB config not found.']));

// The above db.php provides $pdo
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

function logActivity($pdo, $message) {
    try {
        $stmt = $pdo->prepare("INSERT INTO TeamPlanner_Activities (Message) VALUES (?)");
        $stmt->execute([$message]);
    } catch (Exception $e) {
        error_log('Failed to log activity: ' . $e->getMessage());
    }
}

function formatDate($dateString) {
    if (!$dateString) return null;
    $d = new DateTime($dateString);
    return $d->format('Y-m-d');
}

function getNextDate($currentDateStr, $recurrence) {
    if (!$currentDateStr) return null;
    $d = new DateTime($currentDateStr);
    if ($recurrence === 'daily') $d->modify('+1 day');
    elseif ($recurrence === 'weekly') $d->modify('+7 days');
    elseif ($recurrence === 'monthly') $d->modify('+1 month');
    return $d->format('Y-m-d');
}

function sendJson($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// ==========================================
// Shared Permission Helpers (BUG-010)
// ==========================================

/**
 * ตรวจสอบว่า session user เป็น Admin/Manager หรือไม่
 */
function isAdminOrManager() {
    $role = $_SESSION['user_role'] ?? ($_SESSION['user']['role'] ?? '');
    if (empty($role)) return false;
    $role = strtolower($role);
    return in_array($role, ['admin', 'manager', 'supervisor', 'creator']);
}

/**
 * ตรวจสอบว่า session user เป็นเจ้าของงานหรือ creator หรือไม่
 * รองรับ AKA ที่ดึงมาจาก DB โดยตรง
 */
function isTaskOwnerBySession($taskAssignee, $taskCreatedBy = '', $pdo = null) {
    $uname = strtolower($_SESSION['username'] ?? ($_SESSION['user']['username'] ?? ''));
    $fname = strtolower($_SESSION['fullname'] ?? ($_SESSION['user']['fullname'] ?? ''));

    // ดึง AKA จาก DB เสมอ (AKA ไม่ได้ถูกเก็บใน Session)
    $akaList = [];
    if ($pdo && $uname) {
        try {
            $s = $pdo->prepare("SELECT aka FROM USERS WHERE username = ?");
            $s->execute([$uname]);
            $row = $s->fetch(PDO::FETCH_ASSOC);
            if ($row && !empty($row['aka'])) {
                $akaList = array_filter(array_map('trim', array_map('strtolower', explode(',', $row['aka']))));
            }
        } catch (Exception $e) { /* ไม่บล็อคถ้า query fail */ }
    }

    if (!$uname && !$fname && empty($akaList)) return false;

    $assigneeStr = strtolower($taskAssignee ?? '');
    $creatorStr  = strtolower($taskCreatedBy ?? '');

    $matchNames = function($str) use ($uname, $fname, $akaList) {
        $tokens = array_filter(array_map('trim', explode(',', $str)));
        if ($uname && in_array($uname, $tokens, true)) return true;
        if ($fname && in_array($fname, $tokens, true)) return true;
        foreach ($akaList as $aka) {
            if (!empty($aka) && in_array($aka, $tokens, true)) return true;
        }
        return false;
    };

    return $matchNames($assigneeStr) || $matchNames($creatorStr);
}

/**
 * ตรวจสอบว่า session user เป็นเจ้าของโปรเจ็คหรือไม่
 * ดึง AKA จาก DB โดยตรง เพราะ AKA ไม่ได้ถูกเก็บใน Session ตอน Login
 */
function isProjectOwnerBySession($projectAssignee, $projectCreatedBy = '', $pdo = null) {
    $uname = strtolower(trim($_SESSION['username'] ?? ($_SESSION['user']['username'] ?? '')));
    $fname = strtolower(trim($_SESSION['fullname'] ?? ($_SESSION['user']['fullname'] ?? '')));

    // ดึง AKA จาก DB เสมอ (AKA ไม่ได้ถูกเก็บใน Session)
    $akaList = [];
    if ($pdo && $uname) {
        try {
            $s = $pdo->prepare("SELECT aka FROM USERS WHERE username = ?");
            $s->execute([$uname]);
            $row = $s->fetch(PDO::FETCH_ASSOC);
            if ($row && !empty($row['aka'])) {
                $akaList = array_filter(array_map('trim', array_map('strtolower', explode(',', $row['aka']))));
            }
        } catch (Exception $e) { /* ไม่บล็อคถ้า query fail */ }
    }

    if (!$uname && !$fname && empty($akaList)) return false;

    $assigneeStr = strtolower($projectAssignee ?? '');
    $creatorStr  = strtolower($projectCreatedBy ?? '');

    $matchNames = function($str) use ($uname, $fname, $akaList) {
        $tokens = array_filter(array_map('trim', explode(',', $str)));
        if ($uname && in_array($uname, $tokens, true)) return true;
        if ($fname && in_array($fname, $tokens, true)) return true;
        foreach ($akaList as $aka) {
            if (!empty($aka) && in_array($aka, $tokens, true)) return true;
        }
        return false;
    };

    return $matchNames($assigneeStr) || $matchNames($creatorStr);
}

// Ensure $_SESSION['user'] exists
if (!isset($_SESSION['user'])) {
    sendJson(['error' => 'Unauthorized'], 401);
}
?>
