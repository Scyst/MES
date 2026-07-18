<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php'; 

if (session_status() === PHP_SESSION_NONE) session_start();
if (!isset($_SESSION['user'])) { echo json_encode(['status' => false, 'message' => 'Unauthorized']); exit; }

$action = $_POST['action'] ?? '';

try {
    // 1. Get Dashboard
    if ($action === 'get_dashboard') {
        $stmt = $pdo->query("SELECT * FROM " . FORKLIFTS_TABLE . " ORDER BY code ASC");
        $forklifts = $stmt->fetchAll();

        $stmt2 = $pdo->query("SELECT forklift_id, booking_id, user_name, start_time, end_time_est 
                              FROM " . FORKLIFT_BOOKINGS_TABLE . " WHERE status = 'ACTIVE'");
        $active_bookings = $stmt2->fetchAll(PDO::FETCH_GROUP | PDO::FETCH_UNIQUE); 

        foreach ($forklifts as &$fl) {
            $fid = $fl['id'];
            $fl['current_driver'] = '-';
            $fl['active_booking_id'] = null;

            // [FIX 1] ถ้ามี Active Booking ให้บังคับสถานะเป็น IN_USE เสมอ (Override DB)
            if (isset($active_bookings[$fid])) {
                $fl['status'] = 'IN_USE'; // <--- เพิ่มบรรทัดนี้
                $fl['current_driver'] = $active_bookings[$fid]['user_name'];
                $fl['active_booking_id'] = $active_bookings[$fid]['booking_id'];
                $fl['start_time'] = $active_bookings[$fid]['start_time'];
                $fl['end_time_est'] = $active_bookings[$fid]['end_time_est'];
            }
            
            // [FIX 2] แก้ไขค่า NULL ให้เป็นค่า Default เพื่อความสวยงาม
            if(empty($fl['status'])) $fl['status'] = 'AVAILABLE';
            if($fl['current_battery'] === null) $fl['current_battery'] = 100;
        }

        echo json_encode(['status' => true, 'data' => $forklifts]);
    }

    // 2. Booking & Instant Start (รวมกันในนี้)
    else if ($action === 'book_forklift') {
        $forklift_id = $_POST['forklift_id'];
        $user_id = $_SESSION['user']['id'];
        $user_name = $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'];
        
        $start = date('Y-m-d H:i:s', strtotime($_POST['start_time']));
        $end_est = date('Y-m-d H:i:s', strtotime($_POST['end_time_est']));
        $detail = $_POST['usage_details'];

        // [NEW] รับค่าเพิ่มเติมสำหรับโหมด Walk-in (Instant)
        $type = $_POST['booking_type'] ?? 'RESERVE'; 
        $location = $_POST['location'] ?? null; 
        $start_batt = isset($_POST['start_battery']) ? $_POST['start_battery'] : null;

        // Validation: Check Overlap
        $chk = $pdo->prepare("SELECT COUNT(*) FROM " . FORKLIFT_BOOKINGS_TABLE . " 
            WHERE forklift_id = ? AND status IN ('ACTIVE', 'BOOKED')
            AND ( (start_time < ? AND end_time_est > ?) )");
        $chk->execute([$forklift_id, $end_est, $start]);
        
        if ($chk->fetchColumn() > 0) throw new Exception("รถคันนี้ไม่ว่างในช่วงเวลาดังกล่าว");

        $pdo->beginTransaction();

        // [FIX] กำหนดสถานะตาม Type
        // ถ้า INSTANT -> สถานะเป็น ACTIVE (ใช้งานเลย)
        // ถ้า RESERVE -> สถานะเป็น BOOKED (จองไว้ก่อน)
        $status = ($type === 'INSTANT') ? 'ACTIVE' : 'BOOKED';

        // Insert Booking
        $stmt = $pdo->prepare("INSERT INTO " . FORKLIFT_BOOKINGS_TABLE . " 
            (forklift_id, user_id, user_name, booking_type, start_time, end_time_est, usage_details, status, start_battery)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$forklift_id, $user_id, $user_name, $type, $start, $end_est, $detail, $status, $start_batt]);

        // [FIX] ถ้าเป็น INSTANT ต้องอัปเดตสถานะรถเป็น IN_USE ทันที!
        if ($type === 'INSTANT') {
            // ถ้าไม่ส่งแบตมา ให้ default เป็น 100 ไว้ก่อน (กัน error)
            $batt_val = $start_batt !== null ? $start_batt : 100;
            $loc_val = $location !== null ? $location : '-';

            $upd = $pdo->prepare("UPDATE " . FORKLIFTS_TABLE . " 
                SET status = 'IN_USE', last_location = ?, current_battery = ? 
                WHERE id = ?");
            $upd->execute([$loc_val, $batt_val, $forklift_id]);
        }

        $pdo->commit();
        echo json_encode(['status' => true, 'message' => 'Success']);
    }

    else if ($action === 'start_job') {
        $booking_id = $_POST['booking_id'];
        $forklift_id = $_POST['forklift_id'];
        $location = $_POST['location'];
        $usage = $_POST['usage_details'];
        
        // [NEW] รับค่า Start Battery
        $start_batt = isset($_POST['start_battery']) ? $_POST['start_battery'] : null;

        $pdo->beginTransaction();

        // Update Booking: ใส่ start_battery ด้วย
        $stmt = $pdo->prepare("UPDATE " . FORKLIFT_BOOKINGS_TABLE . " 
            SET status = 'ACTIVE', usage_details = ?, start_battery = ?
            WHERE booking_id = ?");
        $stmt->execute([$usage, $start_batt, $booking_id]);

        // Update Forklift: Update แบตล่าสุดที่ตัวรถด้วย เผื่อมีการแก้ไข
        $upd = $pdo->prepare("UPDATE " . FORKLIFTS_TABLE . " 
            SET status = 'IN_USE', last_location = ?, current_battery = ?
            WHERE id = ?");
        $upd->execute([$location, $start_batt, $forklift_id]);

        $pdo->commit();
        echo json_encode(['status' => true]);
    }

    else if ($action === 'return_forklift') {
        $booking_id = $_POST['booking_id'];
        $forklift_id = $_POST['forklift_id'];
        $battery = $_POST['end_battery'];
        $location = $_POST['location'];

        $pdo->beginTransaction();
        $pdo->prepare("UPDATE " . FORKLIFT_BOOKINGS_TABLE . " SET status = 'COMPLETED', end_time_actual = GETDATE(), end_battery = ? WHERE booking_id = ?")->execute([$battery, $booking_id]);
        
        $fl_status = ($battery < 20) ? 'CHARGING' : 'AVAILABLE';
        $pdo->prepare("UPDATE " . FORKLIFTS_TABLE . " SET status = ?, current_battery = ?, last_location = ? WHERE id = ?")->execute([$fl_status, $battery, $location, $forklift_id]);
        
        $pdo->commit();
        echo json_encode(['status' => true]);
    }

    else if ($action === 'add_forklift') {
        $status = $_POST['status'] ?? 'AVAILABLE';
        $stmt = $pdo->prepare("INSERT INTO " . FORKLIFTS_TABLE . " (code, name, last_location, status, current_battery) VALUES (?, ?, ?, ?, 100)");
        $stmt->execute([$_POST['code'], $_POST['name'], $_POST['last_location'], $status]);
        echo json_encode(['status' => true]);
    }

    else if ($action === 'edit_forklift') {
        $status = $_POST['status'];
        $stmt = $pdo->prepare("UPDATE " . FORKLIFTS_TABLE . " SET code = ?, name = ?, last_location = ?, status = ? WHERE id = ?");
        $stmt->execute([$_POST['code'], $_POST['name'], $_POST['last_location'], $status, $_POST['id']]);
        echo json_encode(['status' => true]);
    }

    else if ($action === 'delete_forklift') {
        $pdo->prepare("DELETE FROM " . FORKLIFTS_TABLE . " WHERE id = ?")->execute([$_POST['id']]);
        echo json_encode(['status' => true]);
    }

    else if ($action === 'get_history') {
        $stmt = $pdo->query("SELECT TOP 200 b.*, f.code as forklift_code, f.last_location 
            FROM " . FORKLIFT_BOOKINGS_TABLE . " b
            JOIN " . FORKLIFTS_TABLE . " f ON b.forklift_id = f.id
            WHERE b.status = 'COMPLETED'
            ORDER BY b.end_time_actual DESC");
        echo json_encode(['status' => true, 'data' => $stmt->fetchAll()]);
    }

    else if ($action === 'get_timeline') {
        $stmt = $pdo->query("SELECT b.*, f.code as forklift_code FROM " . FORKLIFT_BOOKINGS_TABLE . " b JOIN " . FORKLIFTS_TABLE . " f ON b.forklift_id = f.id WHERE (b.status IN ('ACTIVE', 'BOOKED')) OR (b.status = 'COMPLETED' AND b.end_time_actual >= CAST(GETDATE() AS DATE)) ORDER BY b.start_time ASC");
        echo json_encode(['status' => true, 'data' => $stmt->fetchAll()]);
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['status' => false, 'message' => $e->getMessage()]);
}
?>