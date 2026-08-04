<?php
// transport-system/api/schedules/billing.php
require_once '../../auth/check_auth.php';
require_once '../db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $scheduleId = $_GET['scheduleId'] ?? '';
    
    if (!$scheduleId) {
        sendResponse(false, null, "ไม่ได้ระบุรหัสรอบรถ (scheduleId)", 400);
    }
    
    $pdo = getDB();
    try {
        // 1. Get Schedule base cost
        $stmt = $pdo->prepare("SELECT base_cost, trip_date, departure_time, route_id, vehicle_id FROM TRANSPORT_SCHEDULES WHERE id = ?");
        $stmt->execute([$scheduleId]);
        $schedule = $stmt->fetch();
        
        if (!$schedule) {
            sendResponse(false, null, "ไม่พบข้อมูลรอบรถนี้", 404);
        }
        
        $baseCost = floatval($schedule['base_cost'] ?? 0);
        
        if ($baseCost <= 0) {
            sendResponse(true, [
                'schedule' => $schedule,
                'total_cost' => 0,
                'total_passengers' => 0,
                'billing_by_bu' => []
            ], "รอบรถนี้ไม่มีการกำหนดต้นทุน");
        }
        
        // 2. Get boarded passengers grouped by BU
        $stmt = $pdo->prepare("
            SELECT bu_id, COUNT(*) as passenger_count
            FROM TRANSPORT_BOOKINGS
            WHERE schedule_id = ? AND status = 'BOARDED'
            GROUP BY bu_id
        ");
        $stmt->execute([$scheduleId]);
        $boardedByBU = $stmt->fetchAll();
        
        $totalPassengers = 0;
        foreach ($boardedByBU as $row) {
            $totalPassengers += intval($row['passenger_count']);
        }
        
        // 3. Calculate fair billing
        $billing = [];
        if ($totalPassengers > 0) {
            $costPerHead = $baseCost / $totalPassengers;
            foreach ($boardedByBU as $row) {
                $count = intval($row['passenger_count']);
                $billing[] = [
                    'bu_id' => $row['bu_id'],
                    'passenger_count' => $count,
                    'cost' => round($count * $costPerHead, 2)
                ];
            }
        }
        
        sendResponse(true, [
            'schedule' => $schedule,
            'total_cost' => $baseCost,
            'total_passengers' => $totalPassengers,
            'billing_by_bu' => $billing
        ], "ดึงข้อมูลบิลลิ่งสำเร็จ");
        
    } catch (Exception $e) {
        sendResponse(false, null, $e->getMessage(), 500);
    }
} else {
    sendResponse(false, null, "Method Not Allowed", 405);
}
?>
