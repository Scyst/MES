<?php
// page/pl_daily/api/manage_pl_dashboard.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

$year    = $_GET['year'] ?? date('Y');
$month   = $_GET['month'] ?? date('n');
$section = $_GET['section'] ?? $_SESSION['user']['line'] ?? 'Team 1';

try {
    // กฎข้อ 3A: ใช้ Stored Procedure ที่เราสร้างไว้เพื่อความเร็วและลดภาระ PHP
    $stmt = $pdo->prepare("EXEC sp_GetMonthlyPLDashboard :year, :month, :section");
    $stmt->execute([
        ':year'    => $year,
        ':month'   => $month,
        ':section' => $section
    ]);
    
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $results]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}