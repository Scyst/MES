<?php
// transport-system/api/schedules.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

if ($method === 'GET') {
    try {
        // ดึงข้อมูลรอบรถทั้งหมด พร้อม Join กับตาราง Routes และ Fleet
        $sql = "
            SELECT 
                s.id, s.trip_date as date, s.departure_time as departureTime, s.base_cost as baseCost, s.status,
                r.id as routeId, r.name as route,
                f.id as vehicleId, f.license_plate as vehicleName, f.license_plate as licensePlate, f.driver_name as driverName, f.capacity,
                (SELECT COUNT(*) FROM TRANSPORT_BOOKINGS b WHERE b.schedule_id = s.id AND b.status != 'CANCELLED') as bookedCount
            FROM TRANSPORT_SCHEDULES s
            LEFT JOIN TRANSPORT_ROUTES r ON s.route_id = r.id
            LEFT JOIN TRANSPORT_FLEET f ON s.vehicle_id = f.id
            ORDER BY s.departure_time DESC
        ";
        
        $stmt = $pdo->query($sql);
        sendResponse(true, $stmt->fetchAll(), "ดึงข้อมูลรอบรถสำเร็จ");
    } catch (Exception $e) {
        sendResponse(false, null, $e->getMessage(), 500);
    }
} 
elseif ($method === 'POST') {
    $data = getJsonInput();
    
    $tripDate = $data['date']; // YYYY-MM-DD
    $timeStr = $data['time'];  // HH:MM
    $departureTime = $tripDate . ' ' . $timeStr . ':00';
    $baseCost = isset($data['baseCost']) ? floatval($data['baseCost']) : 0;
    
    try {
        if (!empty($data['id'])) {
            // Update
            $sql = "UPDATE TRANSPORT_SCHEDULES 
                    SET trip_date = ?, departure_time = ?, route_id = ?, vehicle_id = ?, base_cost = ?
                    WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $tripDate, $departureTime, $data['routeId'], $data['vehicleId'], $baseCost, $data['id']
            ]);
            sendResponse(true, ['id' => $data['id']], "อัพเดตรอบรถสำเร็จ");
        } else {
            // Insert
            $id = uniqid('TRP-');
            $sql = "INSERT INTO TRANSPORT_SCHEDULES (id, trip_date, departure_time, route_id, vehicle_id, base_cost) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $id, $tripDate, $departureTime, $data['routeId'], $data['vehicleId'], $baseCost
            ]);
            sendResponse(true, ['id' => $id], "สร้างรอบรถสำเร็จ");
        }
    } catch (Exception $e) {
        sendResponse(false, null, $e->getMessage(), 500);
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) {
        sendResponse(false, null, "ไม่ได้ระบุ ID", 400);
    }
    
    try {
        // Can only delete if no bookings (or delete bookings first if cascading)
        $pdo->beginTransaction();
        
        // Check bookings
        $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM TRANSPORT_BOOKINGS WHERE schedule_id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row['cnt'] > 0) {
            $pdo->rollBack();
            sendResponse(false, null, "ไม่สามารถลบได้ เนื่องจากมีการจองในรอบรถนี้แล้ว", 400);
        }
        
        $stmt = $pdo->prepare("DELETE FROM TRANSPORT_SCHEDULES WHERE id = ?");
        $stmt->execute([$id]);
        
        $pdo->commit();
        sendResponse(true, null, "ลบข้อมูลสำเร็จ");
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(false, null, $e->getMessage(), 500);
    }
}
else {
    sendResponse(false, null, "Method Not Allowed", 405);
}
?>
