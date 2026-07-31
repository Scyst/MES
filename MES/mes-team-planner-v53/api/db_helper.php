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

// Ensure $_SESSION['user'] exists
if (!isset($_SESSION['user'])) {
    sendJson(['error' => 'Unauthorized'], 401);
}
?>