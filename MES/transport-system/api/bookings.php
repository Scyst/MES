<?php
// transport-system/api/bookings.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

if ($method === 'GET') {
    try {
        $empId = $_GET['empId'] ?? '';
        $scheduleId = $_GET['scheduleId'] ?? '';
        
        $sql = "
            SELECT b.id, b.schedule_id as scheduledTripId, b.route_id as routeId, b.time_slot_id as timeSlotId, b.target_date as targetDate, b.emp_id as empId, b.emp_name as name, b.bu_id as bu, 
                   b.status, b.is_extra as isExtra, b.booked_at as bookedAt, b.boarded_at as boardedAt
            FROM TRANSPORT_BOOKINGS b
            WHERE 1=1
        ";
        
        $params = [];
        $id = $_GET['id'] ?? '';
        $routeId = $_GET['routeId'] ?? '';
        $timeSlotId = $_GET['timeSlotId'] ?? '';
        $targetDate = $_GET['targetDate'] ?? '';
        $unassigned = isset($_GET['unassigned']) && $_GET['unassigned'] == 'true';

        if ($id) {
            $sql .= " AND b.id = ?";
            $params[] = $id;
        }
        if ($empId) {
            $sql .= " AND b.emp_id = ?";
            $params[] = $empId;
        }
        if ($scheduleId) {
            $sql .= " AND b.schedule_id = ?";
            $params[] = $scheduleId;
        }
        if ($routeId) {
            $sql .= " AND b.route_id = ?";
            $params[] = $routeId;
        }
        if ($targetDate) {
            $sql .= " AND b.target_date = ?";
            $params[] = $targetDate;
        }
        if ($timeSlotId) {
            $sql .= " AND b.time_slot_id = ?";
            $params[] = $timeSlotId;
        }
        if ($unassigned) {
            $sql .= " AND b.schedule_id IS NULL";
        }
        
        $sql .= " ORDER BY b.booked_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        sendResponse(true, $stmt->fetchAll(), "ดึงข้อมูลการจองสำเร็จ");
    } catch (Exception $e) {
        sendResponse(false, null, $e->getMessage(), 500);
    }
} 
elseif ($method === 'POST') {
    $data = getJsonInput();
    
    // Create new booking (or walk-in)
    $id = uniqid('BK-');
    $isExtra = isset($data['isExtra']) && $data['isExtra'] ? 1 : 0;
    
    // Walk-ins are auto-boarded
    $status = $isExtra ? 'BOARDED' : 'BOOKED';
    $boardedAt = $isExtra ? date('Y-m-d H:i:s') : null;
    
    $scheduledTripId = $data['scheduledTripId'] ?? null;
    $routeId = $data['routeId'] ?? null;
    $timeSlotId = $data['timeSlotId'] ?? null;
    $targetDate = $data['targetDate'] ?? null;
    
    try {
        $pdo->beginTransaction();
        
        // Check capacity if booking into a specific schedule
        if (!$isExtra && $scheduledTripId) {
            $stmt = $pdo->prepare("
                SELECT f.capacity, (SELECT COUNT(*) FROM TRANSPORT_BOOKINGS b WHERE b.schedule_id = s.id AND b.status != 'CANCELLED') as currentCount
                FROM TRANSPORT_SCHEDULES s
                JOIN TRANSPORT_FLEET f ON s.vehicle_id = f.id
                WHERE s.id = ?
            ");
            $stmt->execute([$scheduledTripId]);
            $tripInfo = $stmt->fetch();
            
            if ($tripInfo && $tripInfo['currentCount'] >= $tripInfo['capacity']) {
                $pdo->rollBack();
                sendResponse(false, null, "ขออภัย รถรอบนี้เต็มแล้ว", 400);
            }
        }
        
        $sql = "INSERT INTO TRANSPORT_BOOKINGS (id, schedule_id, route_id, time_slot_id, target_date, emp_id, emp_name, bu_id, status, is_extra, boarded_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id, 
            $scheduledTripId, 
            $routeId,
            $timeSlotId,
            $targetDate,
            $data['empId'], 
            $data['name'], 
            $data['bu'] ?? null, 
            $status, 
            $isExtra,
            $boardedAt
        ]);
        
        $pdo->commit();
        sendResponse(true, ['id' => $id], "ทำการจองสำเร็จ");
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(false, null, $e->getMessage(), 500);
    }
}
elseif ($method === 'PUT') {
    $data = getJsonInput();
    $id = $data['id'] ?? '';
    $action = $data['action'] ?? ''; // 'CANCEL', 'BOARD'
    
    if (!$action) {
        sendResponse(false, null, "ไม่มี action", 400);
    }
    
    // Only CANCEL and BOARD require a single $id
    if (in_array($action, ['CANCEL', 'BOARD']) && !$id) {
        sendResponse(false, null, "ข้อมูลไม่ครบถ้วน", 400);
    }
    
    try {
        if ($action === 'CANCEL') {
            $stmt = $pdo->prepare("UPDATE TRANSPORT_BOOKINGS SET status = 'CANCELLED' WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(true, null, "ยกเลิกการจองสำเร็จ");
        } 
        elseif ($action === 'BOARD') {
            $stmt = $pdo->prepare("UPDATE TRANSPORT_BOOKINGS SET status = 'BOARDED', boarded_at = GETDATE() WHERE id = ? AND status != 'CANCELLED'");
            $stmt->execute([$id]);
            sendResponse(true, null, "เช็คอินสำเร็จ");
        }
        elseif ($action === 'ASSIGN_SCHEDULE') {
            $scheduleId = $data['scheduleId'] ?? '';
            $bookingIds = $data['bookingIds'] ?? []; // Array of booking IDs
            
            if (!$scheduleId || empty($bookingIds)) {
                sendResponse(false, null, "ข้อมูลไม่ครบถ้วนสำหรับการจัดรถ", 400);
            }
            
            // Build placeholders for IN clause
            $placeholders = str_repeat('?,', count($bookingIds) - 1) . '?';
            $params = array_merge([$scheduleId], $bookingIds);
            
            $stmt = $pdo->prepare("UPDATE TRANSPORT_BOOKINGS SET schedule_id = ? WHERE id IN ($placeholders) AND status != 'CANCELLED'");
            $stmt->execute($params);
            
            sendResponse(true, null, "จัดสรรผู้โดยสารลงรถสำเร็จ");
        }
        else {
            sendResponse(false, null, "Action ไม่ถูกต้อง", 400);
        }
    } catch (Exception $e) {
        sendResponse(false, null, $e->getMessage(), 500);
    }
}
else {
    sendResponse(false, null, "Method Not Allowed", 405);
}
?>
