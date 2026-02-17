<?php
// MES/page/management/api/get_utility_dashboard.php
include_once("../../../auth/check_auth.php");
include_once("../../db.php");

header('Content-Type: application/json');
error_reporting(E_ALL); 
ini_set('display_errors', 0);

try {
    $date = $_GET['date'] ?? date('Y-m-d');
    $elecRate = isset($_GET['elecRate']) ? floatval($_GET['elecRate']) : 4.5; // ค่าไฟต่อหน่วย (บาท)
    $lpgRate = isset($_GET['lpgRate']) ? floatval($_GET['lpgRate']) : 25.0;  // ค่าแก๊สต่อหน่วย (บาท)

    // 1. ดึงข้อมูล Real-time Status ของมิเตอร์ทุกตัว
    $sqlRealtime = "EXEC dbo.sp_GetUtilityRealtimeStatus";
    $stmtRT = $pdo->prepare($sqlRealtime);
    $stmtRT->execute();
    $realtimeData = $stmtRT->fetchAll(PDO::FETCH_ASSOC);

    // 2. ดึงข้อมูล Hourly Trend สำหรับวาดกราฟ (ไฟฟ้า)
    $sqlHourlyElec = "EXEC dbo.sp_GetUtilityHourlyConsumption @TargetDate = :date, @UtilityType = 'ELECTRIC'";
    $stmtHE = $pdo->prepare($sqlHourlyElec);
    $stmtHE->execute([':date' => $date]);
    $hourlyElec = $stmtHE->fetchAll(PDO::FETCH_ASSOC);

    // คำนวณสรุปผล (Summary) สำหรับ KPI Cards
    $summary = [
        'total_kw' => 0,
        'total_kwh_today' => 0,
        'est_elec_cost' => 0,
        'total_lpg_flow' => 0,
        'avg_pf' => 0,
        'pf_count' => 0,
        'online_meters' => 0,
        'total_meters' => count($realtimeData)
    ];

    $meters = [];

    foreach ($realtimeData as $row) {
        $meters[] = $row;
        if ($row['status'] === 'ONLINE') $summary['online_meters']++;

        if ($row['utility_type'] === 'ELECTRIC') {
            $summary['total_kw'] += floatval($row['power_kw']);
            if (floatval($row['power_factor']) > 0) {
                $summary['avg_pf'] += floatval($row['power_factor']);
                $summary['pf_count']++;
            }
        } elseif ($row['utility_type'] === 'LPG') {
            $summary['total_lpg_flow'] += floatval($row['flow_rate']);
        }
    }

    // หาค่าไฟรวมวันนี้จาก Hourly Trend
    foreach ($hourlyElec as $hr) {
        $summary['total_kwh_today'] += floatval($hr['ConsumptionUsed']);
    }

    $summary['est_elec_cost'] = $summary['total_kwh_today'] * $elecRate;
    if ($summary['pf_count'] > 0) {
        $summary['avg_pf'] = $summary['avg_pf'] / $summary['pf_count'];
    }

    echo json_encode([
        'success' => true,
        'summary' => $summary,
        'meters' => $meters,
        'trend_elec' => $hourlyElec
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>