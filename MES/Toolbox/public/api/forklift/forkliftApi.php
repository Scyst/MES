<?php
/**
 * forkliftApi.php
 * Central Self-Contained Backend API for Toolbox Forklift Booking & Fleet Management
 * MES & IIoT Toolbox - SNC Former (B9 & B10)
 * Standard: Industrial Audit Trail Protocol & Unified Session Security
 */

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';

function sendJson($success, $data = null, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        sendJson(false, null, 'Unauthorized Access: Please log in');
    }

    $currentUser = $_SESSION['user'];
    $role = strtolower($currentUser['role'] ?? 'guest');
    $canManage = in_array($role, ['admin', 'creator', 'supervisor', 'manager']);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $jsonPayload = json_decode(file_get_contents('php://input'), true);
        if (is_array($jsonPayload)) {
            $_POST = array_merge($_POST, $jsonPayload);
        }
    }

    $action = $_REQUEST['action'] ?? '';

    switch ($action) {
        // ----------------------------------------------------
        // 1. GET DASHBOARD & FLEET STATUS
        // ----------------------------------------------------
        case 'get_dashboard': {
            $stmt = $pdo->query("SELECT id, code, name, status, current_battery, last_location, 
                                        is_active, lat, lng, indoor_x, indoor_y, location_type, last_updated 
                                 FROM dbo.FORKLIFTS 
                                 WHERE is_active = 1 OR is_active IS NULL 
                                 ORDER BY code ASC");
            $forklifts = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            // Fetch current active & booked reservations
            $stmtBookings = $pdo->query("SELECT booking_id, forklift_id, user_id, user_name, booking_type, 
                                                start_time, end_time_est, usage_details, status, start_battery 
                                         FROM dbo.FORKLIFT_BOOKINGS 
                                         WHERE status IN ('ACTIVE', 'BOOKED')");
            $activeList = $stmtBookings->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $activeMap = [];
            $bookedMap = [];
            foreach ($activeList as $b) {
                $fid = $b['forklift_id'];
                if ($b['status'] === 'ACTIVE') {
                    $activeMap[$fid] = $b;
                } else if ($b['status'] === 'BOOKED') {
                    if (!isset($bookedMap[$fid])) {
                        $bookedMap[$fid] = [];
                    }
                    $bookedMap[$fid][] = $b;
                }
            }

            $stats = [
                'total' => count($forklifts),
                'available' => 0,
                'in_use' => 0,
                'charging' => 0,
                'maintenance' => 0,
                'avg_battery' => 0
            ];
            $totalBatt = 0;

            foreach ($forklifts as &$fl) {
                $fid = $fl['id'];
                $fl['current_driver'] = '-';
                $fl['active_booking'] = null;
                $fl['upcoming_bookings'] = $bookedMap[$fid] ?? [];

                if (isset($activeMap[$fid])) {
                    $fl['status'] = 'IN_USE';
                    $fl['current_driver'] = $activeMap[$fid]['user_name'];
                    $fl['active_booking'] = $activeMap[$fid];
                }

                if (empty($fl['status'])) $fl['status'] = 'AVAILABLE';
                if ($fl['current_battery'] === null) $fl['current_battery'] = 100;
                $fl['current_battery'] = intval($fl['current_battery']);

                $statusKey = strtolower($fl['status']);
                if (isset($stats[$statusKey])) {
                    $stats[$statusKey]++;
                }

                $totalBatt += $fl['current_battery'];
            }

            if ($stats['total'] > 0) {
                $stats['avg_battery'] = round($totalBatt / $stats['total'], 1);
            }

            sendJson(true, [
                'forklifts' => $forklifts,
                'stats' => $stats
            ], 'Forklift fleet data loaded successfully');
            break;
        }

        // ----------------------------------------------------
        // 2. BOOK FORKLIFT (INSTANT OR RESERVE)
        // ----------------------------------------------------
        case 'book_forklift': {
            $forkliftId = intval($_POST['forklift_id'] ?? 0);
            if ($forkliftId <= 0) {
                sendJson(false, null, 'กรุณาระบุรหัสรถโฟล์คลิฟท์');
            }

            $userId = $currentUser['id'] ?? 0;
            $userName = $currentUser['fullname'] ?? $currentUser['username'] ?? 'User';
            $type = strtoupper($_POST['booking_type'] ?? 'RESERVE');
            $location = trim($_POST['location'] ?? 'จุดชาร์จ');
            $detail = trim($_POST['usage_details'] ?? '');
            $startBattery = isset($_POST['start_battery']) ? intval($_POST['start_battery']) : 100;

            if ($type === 'INSTANT') {
                $start = date('Y-m-d H:i:s');
                $estHours = max(1, min(12, intval($_POST['duration_hours'] ?? 2)));
                $endEst = date('Y-m-d H:i:s', strtotime("+{$estHours} hours"));
                $status = 'ACTIVE';
            } else {
                if (empty($_POST['start_time']) || empty($_POST['end_time_est'])) {
                    sendJson(false, null, 'กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด');
                }
                $start = date('Y-m-d H:i:s', strtotime($_POST['start_time']));
                $endEst = date('Y-m-d H:i:s', strtotime($_POST['end_time_est']));
                if ($endEst <= $start) {
                    sendJson(false, null, 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
                }
                $status = 'BOOKED';
            }

            // Check Collision Overlap
            $chk = $pdo->prepare("SELECT COUNT(*) FROM dbo.FORKLIFT_BOOKINGS 
                                 WHERE forklift_id = ? AND status IN ('ACTIVE', 'BOOKED')
                                 AND ((start_time < ? AND end_time_est > ?))");
            $chk->execute([$forkliftId, $endEst, $start]);
            if ($chk->fetchColumn() > 0) {
                sendJson(false, null, 'รถคันนี้มีการจองหรือกำลังใช้งานในช่วงเวลาดังกล่าวแล้ว');
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("INSERT INTO dbo.FORKLIFT_BOOKINGS 
                                    (forklift_id, user_id, user_name, booking_type, start_time, end_time_est, usage_details, status, start_battery)
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$forkliftId, $userId, $userName, $type, $start, $endEst, $detail, $status, $startBattery]);
            $newBookingId = $pdo->lastInsertId();

            if ($type === 'INSTANT') {
                $upd = $pdo->prepare("UPDATE dbo.FORKLIFTS 
                                     SET status = 'IN_USE', last_location = ?, current_battery = ?, last_updated = GETDATE() 
                                     WHERE id = ?");
                $upd->execute([$location, $startBattery, $forkliftId]);
            }

            $pdo->commit();
            sendJson(true, ['booking_id' => $newBookingId], $type === 'INSTANT' ? 'เริ่มใช้งานรถโฟล์คลิฟท์เรียบร้อยแล้ว' : 'บันทึกการจองล่วงหน้าเรียบร้อยแล้ว');
            break;
        }

        // ----------------------------------------------------
        // 3. START BOOKED JOB
        // ----------------------------------------------------
        case 'start_job': {
            $bookingId = intval($_POST['booking_id'] ?? 0);
            $forkliftId = intval($_POST['forklift_id'] ?? 0);
            $location = trim($_POST['location'] ?? 'จุดปฏิบัติงาน');
            $usage = trim($_POST['usage_details'] ?? '');
            $startBattery = isset($_POST['start_battery']) ? intval($_POST['start_battery']) : 100;

            if ($bookingId <= 0 || $forkliftId <= 0) {
                sendJson(false, null, 'ข้อมูลการเริ่มงานไม่ถูกต้อง');
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE dbo.FORKLIFT_BOOKINGS 
                                   SET status = 'ACTIVE', usage_details = ?, start_battery = ?, start_time = GETDATE()
                                   WHERE booking_id = ?");
            $stmt->execute([$usage, $startBattery, $bookingId]);

            $upd = $pdo->prepare("UPDATE dbo.FORKLIFTS 
                                 SET status = 'IN_USE', last_location = ?, current_battery = ?, last_updated = GETDATE()
                                 WHERE id = ?");
            $upd->execute([$location, $startBattery, $forkliftId]);

            $pdo->commit();
            sendJson(true, null, 'เริ่มใช้งานรถโฟล์คลิฟท์เรียบร้อยแล้ว');
            break;
        }

        // ----------------------------------------------------
        // 4. RETURN FORKLIFT (คืนรถ)
        // ----------------------------------------------------
        case 'return_forklift': {
            $bookingId = intval($_POST['booking_id'] ?? 0);
            $forkliftId = intval($_POST['forklift_id'] ?? 0);
            $battery = isset($_POST['end_battery']) ? intval($_POST['end_battery']) : 100;
            $location = trim($_POST['location'] ?? 'จุดชาร์จ');

            if ($bookingId <= 0 || $forkliftId <= 0) {
                sendJson(false, null, 'ข้อมูลการคืนรถไม่ครบถ้วน');
            }

            $battery = max(0, min(100, $battery));
            $pdo->beginTransaction();

            $pdo->prepare("UPDATE dbo.FORKLIFT_BOOKINGS 
                           SET status = 'COMPLETED', end_time_actual = GETDATE(), end_battery = ? 
                           WHERE booking_id = ?")->execute([$battery, $bookingId]);

            // Auto set to CHARGING if battery is low (< 20%), otherwise AVAILABLE
            $flStatus = ($battery < 20) ? 'CHARGING' : 'AVAILABLE';
            $pdo->prepare("UPDATE dbo.FORKLIFTS 
                           SET status = ?, current_battery = ?, last_location = ?, last_updated = GETDATE() 
                           WHERE id = ?")->execute([$flStatus, $battery, $location, $forkliftId]);

            $pdo->commit();
            sendJson(true, null, 'คืนรถโฟล์คลิฟท์เรียบร้อยแล้ว');
            break;
        }

        // ----------------------------------------------------
        // 5. 24-HOUR TIMELINE SCHEDULE
        // ----------------------------------------------------
        case 'get_timeline': {
            $stmt = $pdo->query("SELECT b.booking_id, b.forklift_id, b.user_id, b.user_name, 
                                        b.booking_type, b.start_time, b.end_time_est, b.end_time_actual, 
                                        b.usage_details, b.status, b.start_battery, b.end_battery,
                                        f.code as forklift_code, f.name as forklift_name
                                 FROM dbo.FORKLIFT_BOOKINGS b 
                                 JOIN dbo.FORKLIFTS f ON b.forklift_id = f.id 
                                 WHERE (b.status IN ('ACTIVE', 'BOOKED')) 
                                    OR (b.status = 'COMPLETED' AND b.end_time_actual >= CAST(GETDATE() AS DATE))
                                 ORDER BY b.start_time ASC");
            $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            sendJson(true, $timeline, 'Timeline schedule loaded');
            break;
        }

        // ----------------------------------------------------
        // 6. BOOKING HISTORY
        // ----------------------------------------------------
        case 'get_history': {
            $limit = min(300, max(20, intval($_REQUEST['limit'] ?? 100)));
            $stmt = $pdo->query("SELECT TOP {$limit} b.*, f.code as forklift_code, f.name as forklift_name, f.last_location 
                                 FROM dbo.FORKLIFT_BOOKINGS b
                                 JOIN dbo.FORKLIFTS f ON b.forklift_id = f.id
                                 WHERE b.status = 'COMPLETED'
                                 ORDER BY b.end_time_actual DESC");
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            sendJson(true, $history, 'Booking history loaded');
            break;
        }

        // ----------------------------------------------------
        // 7. FLEET MANAGEMENT (ADD / EDIT / DELETE)
        // ----------------------------------------------------
        case 'save_forklift': {
            if (!$canManage) {
                sendJson(false, null, 'ไม่มีสิทธิ์ในการจัดการรถโฟล์คลิฟท์');
            }

            $id = intval($_POST['id'] ?? 0);
            $code = trim($_POST['code'] ?? '');
            $name = trim($_POST['name'] ?? '');
            $location = trim($_POST['last_location'] ?? 'จุดชาร์จ');
            $status = strtoupper($_POST['status'] ?? 'AVAILABLE');
            $battery = intval($_POST['current_battery'] ?? 100);

            if (empty($code)) {
                sendJson(false, null, 'กรุณาระบุรหัสรถ (Code)');
            }

            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE dbo.FORKLIFTS 
                                       SET code = ?, name = ?, last_location = ?, status = ?, current_battery = ?, last_updated = GETDATE() 
                                       WHERE id = ?");
                $stmt->execute([$code, $name, $location, $status, $battery, $id]);
                sendJson(true, null, 'แก้ไขข้อมูลรถโฟล์คลิฟท์เรียบร้อยแล้ว');
            } else {
                $stmt = $pdo->prepare("INSERT INTO dbo.FORKLIFTS 
                                        (code, name, last_location, status, current_battery, is_active, last_updated) 
                                       VALUES (?, ?, ?, ?, ?, 1, GETDATE())");
                $stmt->execute([$code, $name, $location, $status, $battery]);
                sendJson(true, null, 'เพิ่มรถโฟล์คลิฟท์ใหม่เรียบร้อยแล้ว');
            }
            break;
        }

        case 'delete_forklift': {
            if (!$canManage) {
                sendJson(false, null, 'ไม่มีสิทธิ์ในการลบรถโฟล์คลิฟท์');
            }
            $id = intval($_POST['id'] ?? 0);
            if ($id <= 0) {
                sendJson(false, null, 'ไม่พบรหัสรถโฟล์คลิฟท์ที่ต้องการลบ');
            }

            $stmt = $pdo->prepare("UPDATE dbo.FORKLIFTS SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            sendJson(true, null, 'ระงับการใช้งานรถโฟล์คลิฟท์เรียบร้อยแล้ว');
            break;
        }

        default:
            sendJson(false, null, 'Invalid or unrecognized API action');
            break;
    }

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJson(false, null, 'Server Error: ' . $e->getMessage());
}
