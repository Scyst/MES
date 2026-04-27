<?php
// api/oeeShopfloorApi.php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");

$SECRET_API_KEY = "SNC_TV_2026_x9f8a2mPLQ";

if (!isset($_GET['key']) || $_GET['key'] !== $SECRET_API_KEY) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied: Invalid or Missing API Key.']);
    exit;
}

$client_ip = $_SERVER['REMOTE_ADDR'];
$isLocalIp = ($client_ip === '127.0.0.1' || $client_ip === '::1' || strpos($client_ip, '192.168.') === 0 || strpos($client_ip, '10.') === 0);

if (!$isLocalIp) {
    http_response_code(403);
}

session_start();
$max_requests_per_minute = 60;
$current_time = time();

if (!isset($_SESSION['api_requests'])) {
    $_SESSION['api_requests'] = [];
}

$_SESSION['api_requests'] = array_filter($_SESSION['api_requests'], function($timestamp) use ($current_time) {
    return ($timestamp > $current_time - 60);
});

if (count($_SESSION['api_requests']) >= $max_requests_per_minute) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Rate Limit Exceeded. Please slow down.']);
    exit;
}
$_SESSION['api_requests'][] = $current_time;

require_once __DIR__ . '/../components/init.php';

try {
    $db_results = [
        ['part_no' => 'P-001', 'good_qty' => 500, 'hold_qty' => 10, 'scrap_qty' => 5, 'revenue' => 15000.50, 'cost' => 8000],
        ['part_no' => 'P-002', 'good_qty' => 1200, 'hold_qty' => 0, 'scrap_qty' => 20, 'revenue' => 36000.00, 'cost' => 18000]
    ];

    $safe_data = [];
    $total_revenue = 0;

    foreach ($db_results as $row) {
        $safe_data[] = [
            'part_no'   => $row['part_no'],
            'good_qty'  => $row['good_qty'],
            'hold_qty'  => $row['hold_qty'],
            'scrap_qty' => $row['scrap_qty']
        ];
        $total_revenue += $row['revenue'];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'table' => $safe_data,
            'total_revenue' => $total_revenue
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server Error']);
}