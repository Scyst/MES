<?php
session_start();
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
$allowed_origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (in_array($origin, $allowed_origins) || true) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_once __DIR__ . '/../../db.php';
if (!defined('TRANSACTIONS_TABLE')) {
    require_once __DIR__ . '/../../config/config.php';
}

try {
    // Shift Time Logic (08:00:00 to 07:59:59)
    $currentTime = new DateTime('now', new DateTimeZone('Asia/Bangkok'));
    $hour = (int)$currentTime->format('H');
    
    if ($hour >= 8) {
        $startDate = $currentTime->format('Y-m-d 08:00:00');
        $endDate = (clone $currentTime)->modify('+1 day')->format('Y-m-d 07:59:59');
    } else {
        $startDate = (clone $currentTime)->modify('-1 day')->format('Y-m-d 08:00:00');
        $endDate = $currentTime->format('Y-m-d 07:59:59');
    }

    $userFilter = "";
    if (!empty($_GET['user_ids'])) {
        // Sanitize to only allow numbers and commas
        $userIds = preg_replace('/[^0-9,]/', '', $_GET['user_ids']);
        if (!empty($userIds)) {
            $userFilter = " AND created_by_user_id IN ($userIds)";
        }
    }

    // Get today's summary: Total FG, Total Hold, Total Scrap
    $sql = "
        SELECT 
            SUM(CASE WHEN transaction_type = 'PRODUCTION_FG' THEN quantity ELSE 0 END) as total_fg,
            SUM(CASE WHEN transaction_type = 'PRODUCTION_HOLD' THEN quantity ELSE 0 END) as total_hold,
            SUM(CASE WHEN transaction_type = 'PRODUCTION_SCRAP' THEN quantity ELSE 0 END) as total_scrap
        FROM " . TRANSACTIONS_TABLE . "
        WHERE transaction_timestamp BETWEEN '$startDate' AND '$endDate'
          AND transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
          $userFilter
    ";
    
    $stmt = $pdo->query($sql);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);

    // Get Active Machines (Count of machines that have logged something today)
    $sqlActive = "
        SELECT COUNT(DISTINCT machine_id) as active_machines
        FROM " . TRANSACTIONS_TABLE . "
        WHERE transaction_timestamp BETWEEN '$startDate' AND '$endDate'
          AND machine_id IS NOT NULL
          $userFilter
    ";
    $stmtActive = $pdo->query($sqlActive);
    $activeMachines = $stmtActive->fetchColumn() ?: 0;

    // Get machines currently on HOLD
    $sqlHold = "
        SELECT COUNT(*) as hold_machines
        FROM PE_MACHINES
        WHERE status = 'Hold'
    ";
    // Check if PE_MACHINES exists
    $holdMachines = 0;
    try {
        $stmtHold = $pdo->query($sqlHold);
        $holdMachines = $stmtHold->fetchColumn() ?: 0;
    } catch (Exception $e) {
        // PE_MACHINES might not exist or the config is different, ignore error for this stat
    }

    echo json_encode([
        'success' => true, 
        'data' => [
            'total_fg' => (float)($summary['total_fg'] ?? 0),
            'total_hold' => (float)($summary['total_hold'] ?? 0),
            'total_scrap' => (float)($summary['total_scrap'] ?? 0),
            'active_machines' => (int)$activeMachines,
            'hold_machines' => (int)$holdMachines
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
