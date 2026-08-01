<?php
// transport-system/api/master.php
require_once '../../auth/check_auth.php';
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? ''; // e.g., ?type=fleet, ?type=routes, ?type=time-slots, ?type=departments

$pdo = getDB();

if ($method === 'GET') {
    try {
        switch ($type) {
            case 'fleet':
                $stmt = $pdo->query("SELECT id, license_plate as licensePlate, vehicle_type as type, capacity, driver_emp_id as driverEmpId, driver_name as driverName, driver_phone as driverPhone, is_active, created_at, updated_at FROM TRANSPORT_FLEET ORDER BY created_at DESC");
                sendResponse(true, $stmt->fetchAll(), "ดึงข้อมูลยานพาหนะสำเร็จ");
                break;
            case 'routes':
                $stmt = $pdo->query("SELECT * FROM TRANSPORT_ROUTES ORDER BY created_at DESC");
                $routes = $stmt->fetchAll();
                // Decode JSON stops
                foreach ($routes as &$r) {
                    $r['stops'] = json_decode($r['stops_json'], true) ?: [];
                    unset($r['stops_json']);
                }
                sendResponse(true, $routes, "ดึงข้อมูลเส้นทางสำเร็จ");
                break;
            case 'time-slots':
                $stmt = $pdo->query("SELECT id, name, time_start as time, created_at, updated_at FROM TRANSPORT_TIME_SLOTS ORDER BY time_start ASC");
                sendResponse(true, $stmt->fetchAll(), "ดึงข้อมูลช่วงเวลาสำเร็จ");
                break;
            case 'departments':
                $stmt = $pdo->query("SELECT * FROM TRANSPORT_DEPARTMENTS ORDER BY name ASC");
                sendResponse(true, $stmt->fetchAll(), "ดึงข้อมูลแผนกสำเร็จ");
                break;
            default:
                sendResponse(false, null, "ไม่พบประเภทข้อมูล Master Data ที่ระบุ", 400);
        }
    } catch (Exception $e) {
        sendResponse(false, null, $e->getMessage(), 500);
    }
} 
elseif ($method === 'POST') {
    $data = getJsonInput();
    
    try {
        $pdo->beginTransaction();
        
        switch ($type) {
            case 'fleet':
                $id = $data['id'] ?? null;
                if ($id) {
                    $sql = "UPDATE TRANSPORT_FLEET SET license_plate=?, vehicle_type=?, capacity=?, driver_emp_id=?, driver_name=?, driver_phone=?, updated_at=GETDATE() WHERE id=?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $data['licensePlate'], $data['type'], $data['capacity'], 
                        $data['driverEmpId'] ?? null, $data['driverName'] ?? null, $data['driverPhone'] ?? null, $id
                    ]);
                } else {
                    $id = uniqid('FLT-');
                    $sql = "INSERT INTO TRANSPORT_FLEET (id, license_plate, vehicle_type, capacity, driver_emp_id, driver_name, driver_phone) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $id, $data['licensePlate'], $data['type'], $data['capacity'], 
                        $data['driverEmpId'] ?? null, $data['driverName'] ?? null, $data['driverPhone'] ?? null
                    ]);
                }
                break;
                
            case 'routes':
                $id = $data['id'] ?? null;
                if ($id) {
                    $sql = "UPDATE TRANSPORT_ROUTES SET name=?, stops_json=?, updated_at=GETDATE() WHERE id=?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$data['name'], json_encode($data['stops'] ?? []), $id]);
                } else {
                    $id = uniqid('RT-');
                    $sql = "INSERT INTO TRANSPORT_ROUTES (id, name, stops_json) VALUES (?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$id, $data['name'], json_encode($data['stops'] ?? [])]);
                }
                break;
                
            case 'time-slots':
                $id = $data['id'] ?? null;
                if ($id) {
                    $sql = "UPDATE TRANSPORT_TIME_SLOTS SET name=?, time_start=?, updated_at=GETDATE() WHERE id=?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$data['name'], $data['time'], $id]);
                } else {
                    $id = uniqid('TS-');
                    $sql = "INSERT INTO TRANSPORT_TIME_SLOTS (id, name, time_start) VALUES (?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$id, $data['name'], $data['time']]);
                }
                break;
                
            case 'departments':
                $id = $data['id'] ?? null;
                if ($id) {
                    $sql = "UPDATE TRANSPORT_DEPARTMENTS SET code=?, name=?, updated_at=GETDATE() WHERE id=?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$data['code'], $data['name'], $id]);
                } else {
                    $id = uniqid('DEP-');
                    $sql = "INSERT INTO TRANSPORT_DEPARTMENTS (id, code, name) VALUES (?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$id, $data['code'], $data['name']]);
                }
                break;
                
            default:
                $pdo->rollBack();
                sendResponse(false, null, "ไม่พบประเภทข้อมูล Master Data ที่ระบุ", 400);
        }
        
        $pdo->commit();
        sendResponse(true, ['id' => $id], "บันทึกข้อมูลสำเร็จ");
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(false, null, $e->getMessage(), 500);
    }
} 
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) {
        sendResponse(false, null, "ไม่ได้ระบุ ID", 400);
    }
    
    try {
        switch ($type) {
            case 'fleet': $table = 'TRANSPORT_FLEET'; break;
            case 'routes': $table = 'TRANSPORT_ROUTES'; break;
            case 'time-slots': $table = 'TRANSPORT_TIME_SLOTS'; break;
            case 'departments': $table = 'TRANSPORT_DEPARTMENTS'; break;
            default: sendResponse(false, null, "ไม่พบประเภทข้อมูล", 400);
        }
        
        $stmt = $pdo->prepare("DELETE FROM $table WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(true, null, "ลบข้อมูลสำเร็จ");
        
    } catch (Exception $e) {
        // Handle FK constraints
        sendResponse(false, null, "ไม่สามารถลบข้อมูลได้ อาจมีการถูกใช้งานอยู่ ($e->getMessage())", 500);
    }
}
else {
    sendResponse(false, null, "Method Not Allowed", 405);
}
?>
