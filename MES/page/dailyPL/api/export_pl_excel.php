<?php
// page/pl_daily/api/export_pl_excel.php

// 1. Setup & Auth
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// Check Permission
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    die("Access Denied");
}

// 2. Prepare Inputs
$mode = $_GET['mode'] ?? 'daily';
$sectionRaw = $_GET['section'] ?? 'Team 1';
$sectionSafe = preg_replace('/[^a-zA-Z0-9_\- ]/', '', $sectionRaw); // Sanitize filename

try {
    // 3. Fetch Data (Re-use Logic form Stored Procedures)
    if ($mode === 'daily') {
        $date = $_GET['entry_date'] ?? date('Y-m-d');
        $filename = "PL_Daily_{$date}_{$sectionSafe}.csv";
        
        $stmt = $pdo->prepare("EXEC dbo." . SP_GET_PL_ENTRY . " :date, :section");
        $stmt->execute([':date' => $date, ':section' => $sectionRaw]);
        
    } else {
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-d');
        $filename = "PL_Report_{$startDate}_{$endDate}_{$sectionSafe}.csv";
        
        $stmt = $pdo->prepare("EXEC dbo." . SP_GET_PL_REPORT_RANGE . " :start, :end, :section");
        $stmt->execute([':start' => $startDate, ':end' => $endDate, ':section' => $sectionRaw]);
    }
    
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($data)) {
        die("No data found.");
    }

} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}

// 4. Output as CSV
// Clear buffer
if (ob_get_level()) ob_end_clean();

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

// Open Output Stream
$output = fopen('php://output', 'w');

// 🔥 Write BOM for Thai Language Support (Excel needs this)
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

// Write Header
fputcsv($output, ['Item Name', 'Account Code', 'Target', 'Actual', 'Diff', 'Source', 'Note']);

// Write Rows
foreach ($data as $row) {
    $indent = str_repeat("    ", (int)$row['item_level']); // Add visual indent
    $target = (float)($row['daily_target'] ?? 0);
    $actual = (float)$row['actual_amount'];
    $diff = $actual - $target;

    fputcsv($output, [
        $indent . $row['item_name'],
        $row['account_code'],
        $target,
        $actual,
        $diff,
        $row['data_source'],
        $row['remark'] ?? ''
    ]);
}

fclose($output);
exit;
?>