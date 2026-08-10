<?php
// transport-system/api/reports/dashboard.php
require_once dirname(__DIR__) . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    sendResponse(false, null, "Method Not Allowed", 405);
    exit;
}

$pdo = getDB();
$targetDate = $_GET['targetDate'] ?? date('Y-m-d');

try {
    // 1. Get Today's Trips with Capacity
    $stmt = $pdo->prepare("
        SELECT s.id, s.trip_date as tripDate, s.departure_time as departureTime, s.base_cost as baseCost,
               r.name as route, f.capacity, f.license_plate as vehicleName
        FROM TRANSPORT_SCHEDULES s
        JOIN TRANSPORT_ROUTES r ON s.route_id = r.id
        JOIN TRANSPORT_FLEET f ON s.vehicle_id = f.id
        WHERE s.trip_date = ?
    ");
    $stmt->execute([$targetDate]);
    $trips = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Get All Bookings for Today
    $stmt = $pdo->prepare("
        SELECT b.id, b.schedule_id as scheduledTripId, b.emp_id as empId, b.emp_name as name, b.bu_id as bu,
               b.status, b.is_extra as isExtra
        FROM TRANSPORT_BOOKINGS b
        WHERE b.target_date = ? AND b.status != 'CANCELLED'
    ");
    $stmt->execute([$targetDate]);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Process Aggregations in PHP
    $totalBookingsToday = count($bookings);
    $totalScansToday = 0;
    
    $unscannedBookings = [];
    $pendingAssignmentBookings = [];
    
    $tripStats = [];
    foreach ($trips as $trip) {
        $tripStats[$trip['id']] = [
            'id' => $trip['id'],
            'route' => $trip['route'],
            'vehicleName' => $trip['vehicleName'],
            'departureTime' => $trip['departureTime'],
            'capacity' => $trip['capacity'],
            'baseCost' => (float)$trip['baseCost'],
            'bookedCount' => 0,
            'boardedCount' => 0,
            'boardedList' => [] // for billing
        ];
    }

    foreach ($bookings as $b) {
        if ($b['status'] === 'BOARDED') {
            $totalScansToday++;
        }
        
        if ($b['status'] === 'BOOKED') {
            if (!$b['scheduledTripId']) {
                $pendingAssignmentBookings[] = $b;
            }
            $unscannedBookings[] = $b;
        }

        if ($b['scheduledTripId'] && isset($tripStats[$b['scheduledTripId']])) {
            $tripStats[$b['scheduledTripId']]['bookedCount']++;
            if ($b['status'] === 'BOARDED') {
                $tripStats[$b['scheduledTripId']]['boardedCount']++;
                $tripStats[$b['scheduledTripId']]['boardedList'][] = $b['bu'] ?? 'Unknown';
            }
        }
    }

    // Process BU Billing
    $buBillingRaw = [];
    $now = new DateTime();

    foreach ($tripStats as $tripId => $t) {
        if ($t['boardedCount'] > 0) {
            $costPerHead = $t['baseCost'] / $t['boardedCount'];
            foreach ($t['boardedList'] as $bu) {
                if (!isset($buBillingRaw[$bu])) {
                    $buBillingRaw[$bu] = ['amount' => 0, 'count' => 0];
                }
                $buBillingRaw[$bu]['amount'] += $costPerHead;
                $buBillingRaw[$bu]['count'] += 1;
            }
        } else {
            // No one boarded
            $depTime = new DateTime($t['departureTime']);
            $targetDt = new DateTime($targetDate);
            $todayDt = new DateTime(date('Y-m-d'));
            
            $isPast = $depTime < $now || $targetDt < $todayDt;
            if ($isPast) {
                $centralKey = 'ส่วนกลาง (รถเปล่า)';
                if (!isset($buBillingRaw[$centralKey])) {
                    $buBillingRaw[$centralKey] = ['amount' => 0, 'count' => 0];
                }
                $buBillingRaw[$centralKey]['amount'] += $t['baseCost'];
            }
        }
    }

    $billingData = [];
    foreach ($buBillingRaw as $bu => $data) {
        $billingData[] = [
            'name' => $bu,
            'amount' => round($data['amount']),
            'count' => $data['count']
        ];
    }
    // Sort descending by amount
    usort($billingData, function($a, $b) {
        return $b['amount'] <=> $a['amount'];
    });

    $response = [
        'trips' => array_values($tripStats), // Include trip details with booked/boarded counts
        'totalBookingsToday' => $totalBookingsToday,
        'totalScansToday' => $totalScansToday,
        'unscannedCount' => count($unscannedBookings),
        'pendingAssignmentCount' => count($pendingAssignmentBookings),
        'unscannedBookings' => $unscannedBookings, // Need details for the checklist
        'pendingAssignmentBookings' => $pendingAssignmentBookings, // Not explicitly used but good to have
        'billingData' => $billingData
    ];

    sendResponse(true, $response, "ดึงข้อมูล Dashboard สำเร็จ");
} catch (Exception $e) {
    sendResponse(false, null, $e->getMessage(), 500);
}
?>
