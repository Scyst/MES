<?php
/**
 * forkliftApi.php
 * Central Self-Contained Backend API for Toolbox Forklift Command, Live Tracking, Heatmap & QR Scan
 * MES & IIoT Toolbox - SNC Former (B9 & B10)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

// Factory perimeter bounds matching legacy leaflet spatial calibration
const FACTORY_LAT_TOP = 12.889578;
const FACTORY_LAT_BOTTOM = 12.883121;
const FACTORY_LNG_LEFT = 101.088351;
const FACTORY_LNG_RIGHT = 101.096783;

function sendJson(bool $success, $data = null, string $message = '', int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function verifyForkliftCsrf(): void {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if ($clientToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $clientToken)) {
        sendJson(false, null, 'CSRF Token Validation Failed. กรุณารีเฟรชหน้าจอแล้วลองใหม่อีกครั้ง', 403);
    }
}

function cleanForkliftText(?string $value): string {
    return trim(str_replace("\t", '', (string)($value ?? '')));
}

function validateBoundedInt($raw, int $minVal, int $maxVal, string $label): int {
    if ($raw === null || $raw === '' || !is_numeric($raw)) {
        throw new InvalidArgumentException("กรุณาระบุ{$label}เป็นตัวเลขที่ถูกต้อง");
    }
    $val = (int)round((float)$raw);
    if ($val < $minVal || $val > $maxVal) {
        throw new InvalidArgumentException("{$label}ต้องอยู่ระหว่าง {$minVal} ถึง {$maxVal}");
    }
    return $val;
}

function validateTextParam($raw, int $maxLen, string $label, bool $required = false): string {
    $val = trim((string)($raw ?? ''));
    if ($required && $val === '') {
        throw new InvalidArgumentException("กรุณาระบุ{$label}");
    }
    $len = function_exists('mb_strlen') ? mb_strlen($val, 'UTF-8') : strlen($val);
    if ($len > $maxLen) {
        throw new InvalidArgumentException("{$label}ต้องมีความยาวไม่เกิน {$maxLen} ตัวอักษร");
    }
    return $val;
}

function formatEnrichedForklift(array $fl, array $activeMap, array $bookedMap): array {
    $fid = (int)$fl['id'];
    $fl['id'] = $fid;
    $fl['code'] = cleanForkliftText($fl['code'] ?? '');
    $fl['name'] = cleanForkliftText($fl['name'] ?? '');
    $fl['last_location'] = cleanForkliftText($fl['last_location'] ?? '') ?: 'จุดชาร์จ';
    $fl['current_driver'] = '-';
    $fl['active_booking'] = null;
    $fl['upcoming_bookings'] = $bookedMap[$fid] ?? [];

    if (isset($activeMap[$fid])) {
        $fl['status'] = 'IN_USE';
        $fl['current_driver'] = $activeMap[$fid]['user_name'];
        $fl['active_booking'] = $activeMap[$fid];
    }

    if (empty($fl['status'])) {
        $fl['status'] = 'AVAILABLE';
    }
    $fl['current_battery'] = $fl['current_battery'] === null ? 100 : (int)$fl['current_battery'];
    $fl['indoor_x'] = $fl['indoor_x'] !== null ? (int)$fl['indoor_x'] : null;
    $fl['indoor_y'] = $fl['indoor_y'] !== null ? (int)$fl['indoor_y'] : null;
    $fl['lat'] = $fl['lat'] !== null ? (float)$fl['lat'] : null;
    $fl['lng'] = $fl['lng'] !== null ? (float)$fl['lng'] : null;
    $minsAgo = isset($fl['minutes_since_update']) && $fl['minutes_since_update'] !== null
        ? (int)$fl['minutes_since_update']
        : null;
    $fl['minutes_since_update'] = $minsAgo;
    $fl['is_offline'] = ($minsAgo === null || $minsAgo > 3);
    return $fl;
}

function fetchBookingMaps(PDO $pdo): array {
    $stmtBookings = $pdo->query(
        "SELECT booking_id, forklift_id, user_id, user_name, booking_type,
                start_time, end_time_est, usage_details, status, start_battery
         FROM dbo.FORKLIFT_BOOKINGS
         WHERE status IN ('ACTIVE', 'BOOKED')
         ORDER BY start_time ASC"
    );
    $activeList = $stmtBookings->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $activeMap = [];
    $bookedMap = [];
    foreach ($activeList as $booking) {
        $fid = (int)$booking['forklift_id'];
        if ($booking['status'] === 'ACTIVE') {
            $activeMap[$fid] = $booking;
        } else {
            $bookedMap[$fid][] = $booking;
        }
    }
    return [$activeMap, $bookedMap];
}

function handleGetDashboard(PDO $pdo): void {
    $stmt = $pdo->query(
        "SELECT id, code, name, status, current_battery, last_location,
                is_active, lat, lng, indoor_x, indoor_y, location_type, last_updated,
                DATEDIFF(MINUTE, last_updated, GETDATE()) AS minutes_since_update
         FROM dbo.FORKLIFTS
         WHERE is_active = 1 OR is_active IS NULL
         ORDER BY code ASC"
    );
    $rawForklifts = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    [$activeMap, $bookedMap] = fetchBookingMaps($pdo);

    $stats = [
        'total' => count($rawForklifts),
        'available' => 0,
        'in_use' => 0,
        'charging' => 0,
        'maintenance' => 0,
        'online_count' => 0,
        'low_battery_count' => 0,
        'avg_battery' => 0
    ];
    $totalBatt = 0;
    $forklifts = [];

    foreach ($rawForklifts as $fl) {
        $enriched = formatEnrichedForklift($fl, $activeMap, $bookedMap);
        $statusKey = strtolower($enriched['status']);
        if (isset($stats[$statusKey])) {
            $stats[$statusKey]++;
        }
        if (!$enriched['is_offline']) {
            $stats['online_count']++;
        }
        if ($enriched['current_battery'] < 20) {
            $stats['low_battery_count']++;
        }
        $totalBatt += $enriched['current_battery'];
        $forklifts[] = $enriched;
    }

    if ($stats['total'] > 0) {
        $stats['avg_battery'] = round($totalBatt / $stats['total'], 1);
    }

    sendJson(true, [
        'forklifts' => $forklifts,
        'stats' => $stats
    ], 'Forklift fleet data loaded successfully');
}

function handleGetRealtime(PDO $pdo): void {
    $stmt = $pdo->query(
        "SELECT id, code, name, status, current_battery, last_location,
                is_active, lat, lng, indoor_x, indoor_y, location_type, last_updated,
                DATEDIFF(MINUTE, last_updated, GETDATE()) AS minutes_since_update
         FROM dbo.FORKLIFTS
         WHERE is_active = 1 OR is_active IS NULL
         ORDER BY code ASC"
    );
    $rawForklifts = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    [$activeMap, $bookedMap] = fetchBookingMaps($pdo);

    $vehicles = [];
    foreach ($rawForklifts as $fl) {
        $vehicles[] = formatEnrichedForklift($fl, $activeMap, $bookedMap);
    }

    sendJson(true, [
        'vehicles' => $vehicles,
        'server_time' => date('Y-m-d H:i:s')
    ], 'Realtime telemetry loaded');
}

function handleGetSingleForklift(PDO $pdo, array $req): void {
    $codeParam = cleanForkliftText($req['code'] ?? '');
    $idParam = isset($req['id']) ? (int)$req['id'] : 0;

    if ($codeParam === '' && $idParam <= 0) {
        throw new InvalidArgumentException('กรุณาระบุรหัสรถโฟล์คลิฟท์ (code หรือ id)');
    }

    $stmt = $pdo->prepare(
        "SELECT TOP 1 id, code, name, status, current_battery, last_location,
                is_active, lat, lng, indoor_x, indoor_y, location_type, last_updated,
                DATEDIFF(MINUTE, last_updated, GETDATE()) AS minutes_since_update
         FROM dbo.FORKLIFTS
         WHERE (is_active = 1 OR is_active IS NULL)
           AND ((? > 0 AND id = ?) OR (? <> '' AND REPLACE(LTRIM(RTRIM(code)), CHAR(9), '') = ?))"
    );
    $stmt->execute([$idParam, $idParam, $codeParam, $codeParam]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        sendJson(false, null, 'ไม่พบข้อมูลรถโฟล์คลิฟท์ในระบบ', 404);
    }

    [$activeMap, $bookedMap] = fetchBookingMaps($pdo);
    $forklift = formatEnrichedForklift($row, $activeMap, $bookedMap);
    sendJson(true, $forklift, 'Single forklift details loaded');
}

function handleBookForklift(PDO $pdo, array $req, array $currentUser): void {
    $forkliftId = validateBoundedInt($req['forklift_id'] ?? 0, 1, 9999999, 'รหัสรถโฟล์คลิฟท์');
    $userId = (int)($currentUser['id'] ?? 0);
    $userName = $currentUser['fullname'] ?? $currentUser['username'] ?? 'User';
    $type = strtoupper(trim((string)($req['booking_type'] ?? 'RESERVE')));
    if (!in_array($type, ['INSTANT', 'RESERVE'], true)) {
        throw new InvalidArgumentException('ประเภทการจองไม่ถูกต้อง');
    }

    $location = validateTextParam($req['location'] ?? 'จุดชาร์จ', 100, 'ตำแหน่ง');
    $detail = validateTextParam($req['usage_details'] ?? '', 255, 'รายละเอียดการใช้งาน', true);
    $startBattery = validateBoundedInt($req['start_battery'] ?? 100, 0, 100, 'ระดับแบตเตอรี่เริ่มต้น');

    $vehStmt = $pdo->prepare("SELECT id, code, status, current_battery, last_location, is_active FROM dbo.FORKLIFTS WHERE id = ?");
    $vehStmt->execute([$forkliftId]);
    $vehicle = $vehStmt->fetch(PDO::FETCH_ASSOC);
    if (!$vehicle || ($vehicle['is_active'] !== null && !(bool)$vehicle['is_active'])) {
        sendJson(false, null, 'ไม่พบรถโฟล์คลิฟท์หรือรถถูกระงับการใช้งานแล้ว', 404);
    }
    if ($type === 'INSTANT' && strtoupper((string)$vehicle['status']) === 'MAINTENANCE') {
        sendJson(false, null, 'รถคันนี้อยู่ระหว่างการซ่อมบำรุง (Maintenance) ไม่สามารถเริ่มใช้งานได้', 409);
    }

    if ($type === 'INSTANT') {
        $start = date('Y-m-d H:i:s');
        $estHours = validateBoundedInt($req['duration_hours'] ?? 2, 1, 12, 'ชั่วโมงการใช้งาน');
        $endEst = date('Y-m-d H:i:s', strtotime("+{$estHours} hours"));
        $status = 'ACTIVE';
    } else {
        if (empty($req['start_time']) || empty($req['end_time_est'])) {
            throw new InvalidArgumentException('กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด');
        }
        $startTs = strtotime((string)$req['start_time']);
        $endTs = strtotime((string)$req['end_time_est']);
        if ($startTs === false || $endTs === false || $endTs <= $startTs) {
            throw new InvalidArgumentException('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
        }
        $start = date('Y-m-d H:i:s', $startTs);
        $endEst = date('Y-m-d H:i:s', $endTs);
        $status = 'BOOKED';
    }

    $chk = $pdo->prepare(
        "SELECT COUNT(*) FROM dbo.FORKLIFT_BOOKINGS
         WHERE forklift_id = ? AND status IN ('ACTIVE', 'BOOKED')
           AND (start_time < ? AND end_time_est > ?)"
    );
    $chk->execute([$forkliftId, $endEst, $start]);
    if ((int)$chk->fetchColumn() > 0) {
        sendJson(false, null, 'รถคันนี้มีการจองหรือกำลังใช้งานในช่วงเวลาดังกล่าวแล้ว', 409);
    }

    $pdo->beginTransaction();
    $stmt = $pdo->prepare(
        "INSERT INTO dbo.FORKLIFT_BOOKINGS
         (forklift_id, user_id, user_name, booking_type, start_time, end_time_est, usage_details, status, start_battery)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$forkliftId, $userId, $userName, $type, $start, $endEst, $detail, $status, $startBattery]);
    $newBookingId = (string)$pdo->lastInsertId();

    if ($type === 'INSTANT') {
        $upd = $pdo->prepare(
            "UPDATE dbo.FORKLIFTS
             SET status = 'IN_USE', last_location = ?, current_battery = ?, last_updated = GETDATE()
             WHERE id = ?"
        );
        $upd->execute([$location, $startBattery, $forkliftId]);
    }

    writeLog($pdo, $type === 'INSTANT' ? 'CHECKOUT' : 'RESERVE', 'FORKLIFT_BOOKING', $newBookingId, $vehicle, [
        'forklift_id' => $forkliftId,
        'booking_type' => $type,
        'status' => $status,
        'location' => $location,
        'start_battery' => $startBattery,
        'usage_details' => $detail
    ], "Booking {$type} for " . cleanForkliftText($vehicle['code']));

    $pdo->commit();
    sendJson(
        true,
        ['booking_id' => $newBookingId],
        $type === 'INSTANT' ? 'เริ่มใช้งานรถโฟล์คลิฟท์เรียบร้อยแล้ว' : 'บันทึกการจองล่วงหน้าเรียบร้อยแล้ว'
    );
}

function handleStartJob(PDO $pdo, array $req): void {
    $bookingId = validateBoundedInt($req['booking_id'] ?? 0, 1, 9999999, 'รหัสการจอง');
    $forkliftId = validateBoundedInt($req['forklift_id'] ?? 0, 1, 9999999, 'รหัสรถโฟล์คลิฟท์');
    $location = validateTextParam($req['location'] ?? 'จุดปฏิบัติงาน', 100, 'ตำแหน่งเริ่มต้น');
    $usage = validateTextParam($req['usage_details'] ?? '', 255, 'รายละเอียดงาน');
    $startBattery = validateBoundedInt($req['start_battery'] ?? 100, 0, 100, 'แบตเตอรี่เริ่มต้น');

    $bkStmt = $pdo->prepare("SELECT booking_id, forklift_id, status, user_id FROM dbo.FORKLIFT_BOOKINGS WHERE booking_id = ?");
    $bkStmt->execute([$bookingId]);
    $booking = $bkStmt->fetch(PDO::FETCH_ASSOC);
    if (!$booking || (int)$booking['forklift_id'] !== $forkliftId) {
        sendJson(false, null, 'ไม่พบรายการจองที่ต้องการเริ่มงาน', 404);
    }
    if ($booking['status'] !== 'BOOKED') {
        sendJson(false, null, 'รายการจองนี้ไม่อยู่ในสถานะรอดำเนินการ (BOOKED)', 409);
    }

    $pdo->beginTransaction();
    $pdo->prepare(
        "UPDATE dbo.FORKLIFT_BOOKINGS
         SET status = 'ACTIVE', usage_details = ?, start_battery = ?, start_time = GETDATE()
         WHERE booking_id = ?"
    )->execute([$usage, $startBattery, $bookingId]);

    $pdo->prepare(
        "UPDATE dbo.FORKLIFTS
         SET status = 'IN_USE', last_location = ?, current_battery = ?, last_updated = GETDATE()
         WHERE id = ?"
    )->execute([$location, $startBattery, $forkliftId]);

    writeLog($pdo, 'START_JOB', 'FORKLIFT_BOOKING', (string)$bookingId, $booking, [
        'status' => 'ACTIVE',
        'location' => $location,
        'start_battery' => $startBattery
    ], 'Started reserved forklift booking');

    $pdo->commit();
    sendJson(true, null, 'เริ่มใช้งานรถโฟล์คลิฟท์เรียบร้อยแล้ว');
}

function handleReturnForklift(PDO $pdo, array $req, array $currentUser, bool $canManage): void {
    $bookingId = validateBoundedInt($req['booking_id'] ?? 0, 1, 9999999, 'รหัสการจอง');
    $forkliftId = validateBoundedInt($req['forklift_id'] ?? 0, 1, 9999999, 'รหัสรถโฟล์คลิฟท์');
    $battery = validateBoundedInt($req['end_battery'] ?? 100, 0, 100, 'แบตเตอรี่คงเหลือ');
    $location = validateTextParam($req['location'] ?? 'จุดชาร์จ', 100, 'จุดจอดคืนรถ');

    $bkStmt = $pdo->prepare("SELECT booking_id, forklift_id, user_id, status FROM dbo.FORKLIFT_BOOKINGS WHERE booking_id = ?");
    $bkStmt->execute([$bookingId]);
    $booking = $bkStmt->fetch(PDO::FETCH_ASSOC);
    if (!$booking || (int)$booking['forklift_id'] !== $forkliftId) {
        sendJson(false, null, 'ไม่พบรายการใช้งานที่ต้องการคืนรถ', 404);
    }
    if ($booking['status'] !== 'ACTIVE') {
        sendJson(false, null, 'รายการนี้ไม่อยู่ในสถานะกำลังใช้งาน (ACTIVE)', 409);
    }
    $currentUserId = (int)($currentUser['id'] ?? 0);
    if (!$canManage && (int)$booking['user_id'] !== $currentUserId) {
        sendJson(false, null, 'ไม่มีสิทธิ์คืนรถรายการของผู้ใช้งานท่านอื่น', 403);
    }

    $flStatus = ($battery < 20) ? 'CHARGING' : 'AVAILABLE';

    $pdo->beginTransaction();
    $pdo->prepare(
        "UPDATE dbo.FORKLIFT_BOOKINGS
         SET status = 'COMPLETED', end_time_actual = GETDATE(), end_battery = ?
         WHERE booking_id = ?"
    )->execute([$battery, $bookingId]);

    $pdo->prepare(
        "UPDATE dbo.FORKLIFTS
         SET status = ?, current_battery = ?, last_location = ?, last_updated = GETDATE()
         WHERE id = ?"
    )->execute([$flStatus, $battery, $location, $forkliftId]);

    writeLog($pdo, 'RETURN', 'FORKLIFT_BOOKING', (string)$bookingId, $booking, [
        'status' => 'COMPLETED',
        'forklift_status' => $flStatus,
        'end_battery' => $battery,
        'location' => $location
    ], 'Returned forklift after job completion');

    $pdo->commit();
    sendJson(true, ['forklift_status' => $flStatus], 'คืนรถโฟล์คลิฟท์เรียบร้อยแล้ว');
}

function handleGetTimeline(PDO $pdo): void {
    $stmt = $pdo->query(
        "SELECT TOP (200) b.booking_id, b.forklift_id, b.user_id, b.user_name,
                b.booking_type, b.start_time, b.end_time_est, b.end_time_actual,
                b.usage_details, b.status, b.start_battery, b.end_battery,
                LTRIM(RTRIM(REPLACE(f.code, CHAR(9), ''))) AS forklift_code,
                LTRIM(RTRIM(REPLACE(f.name, CHAR(9), ''))) AS forklift_name
         FROM dbo.FORKLIFT_BOOKINGS b
         JOIN dbo.FORKLIFTS f ON b.forklift_id = f.id
         WHERE (b.status IN ('ACTIVE', 'BOOKED'))
            OR (b.status = 'COMPLETED' AND b.end_time_actual >= CAST(GETDATE() AS DATE))
         ORDER BY b.start_time ASC"
    );
    $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    sendJson(true, $timeline, 'Timeline schedule loaded');
}

function handleGetBookingHistory(PDO $pdo, array $req): void {
    $limit = min(300, max(20, (int)($req['limit'] ?? 100)));
    $stmt = $pdo->prepare(
        "SELECT TOP ({$limit}) b.booking_id, b.forklift_id, b.user_id, b.user_name,
                b.booking_type, b.start_time, b.end_time_est, b.end_time_actual,
                b.usage_details, b.status, b.start_battery, b.end_battery,
                LTRIM(RTRIM(REPLACE(f.code, CHAR(9), ''))) AS forklift_code,
                LTRIM(RTRIM(REPLACE(f.name, CHAR(9), ''))) AS forklift_name,
                f.last_location
         FROM dbo.FORKLIFT_BOOKINGS b
         JOIN dbo.FORKLIFTS f ON b.forklift_id = f.id
         WHERE b.status = 'COMPLETED'
         ORDER BY b.end_time_actual DESC"
    );
    $stmt->execute();
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    sendJson(true, $history, 'Booking history loaded');
}

function handleSaveForklift(PDO $pdo, array $req, bool $canManage): void {
    if (!$canManage) {
        sendJson(false, null, 'ไม่มีสิทธิ์ในการจัดการรถโฟล์คลิฟท์', 403);
    }

    $id = isset($req['id']) ? (int)$req['id'] : 0;
    $code = validateTextParam($req['code'] ?? '', 50, 'รหัสรถ (Code)', true);
    $name = validateTextParam($req['name'] ?? '', 100, 'ชื่อ/ผู้ให้บริการ');
    $location = validateTextParam($req['last_location'] ?? 'จุดชาร์จ', 100, 'ตำแหน่งจอด');
    $status = strtoupper(trim((string)($req['status'] ?? 'AVAILABLE')));
    $allowedStatuses = ['AVAILABLE', 'IN_USE', 'CHARGING', 'MAINTENANCE'];
    if (!in_array($status, $allowedStatuses, true)) {
        throw new InvalidArgumentException('สถานะรถไม่ถูกต้อง');
    }
    $battery = validateBoundedInt($req['current_battery'] ?? 100, 0, 100, 'ระดับแบตเตอรี่');

    $pdo->beginTransaction();
    if ($id > 0) {
        $oldStmt = $pdo->prepare("SELECT id, code, name, last_location, status, current_battery FROM dbo.FORKLIFTS WHERE id = ?");
        $oldStmt->execute([$id]);
        $oldData = $oldStmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldData) {
            $pdo->rollBack();
            sendJson(false, null, 'ไม่พบรถโฟล์คลิฟท์ที่ต้องการแก้ไข', 404);
        }

        $pdo->prepare(
            "UPDATE dbo.FORKLIFTS
             SET code = ?, name = ?, last_location = ?, status = ?, current_battery = ?, last_updated = GETDATE()
             WHERE id = ?"
        )->execute([$code, $name, $location, $status, $battery, $id]);

        writeLog($pdo, 'UPDATE', 'FORKLIFT', (string)$id, $oldData, [
            'code' => $code,
            'name' => $name,
            'last_location' => $location,
            'status' => $status,
            'current_battery' => $battery
        ], "Updated forklift {$code}");

        $pdo->commit();
        sendJson(true, ['id' => $id], 'แก้ไขข้อมูลรถโฟล์คลิฟท์เรียบร้อยแล้ว');
    }

    $ins = $pdo->prepare(
        "INSERT INTO dbo.FORKLIFTS
         (code, name, last_location, status, current_battery, is_active, last_updated)
         VALUES (?, ?, ?, ?, ?, 1, GETDATE())"
    );
    $ins->execute([$code, $name, $location, $status, $battery]);
    $newId = (string)$pdo->lastInsertId();

    writeLog($pdo, 'CREATE', 'FORKLIFT', $newId, null, [
        'code' => $code,
        'name' => $name,
        'last_location' => $location,
        'status' => $status,
        'current_battery' => $battery
    ], "Created forklift {$code}");

    $pdo->commit();
    sendJson(true, ['id' => (int)$newId], 'เพิ่มรถโฟล์คลิฟท์ใหม่เรียบร้อยแล้ว');
}

function handleDeleteForklift(PDO $pdo, array $req, bool $canManage): void {
    if (!$canManage) {
        sendJson(false, null, 'ไม่มีสิทธิ์ในการระงับรถโฟล์คลิฟท์', 403);
    }
    $id = validateBoundedInt($req['id'] ?? 0, 1, 9999999, 'รหัสรถโฟล์คลิฟท์');

    $oldStmt = $pdo->prepare("SELECT id, code, name, status, is_active FROM dbo.FORKLIFTS WHERE id = ?");
    $oldStmt->execute([$id]);
    $oldData = $oldStmt->fetch(PDO::FETCH_ASSOC);
    if (!$oldData) {
        sendJson(false, null, 'ไม่พบรถโฟล์คลิฟท์ที่ต้องการระงับ', 404);
    }

    $pdo->beginTransaction();
    $pdo->prepare("UPDATE dbo.FORKLIFTS SET is_active = 0 WHERE id = ?")->execute([$id]);
    writeLog($pdo, 'DELETE', 'FORKLIFT', (string)$id, $oldData, ['is_active' => 0], "Deactivated forklift {$oldData['code']}");
    $pdo->commit();

    sendJson(true, null, 'ระงับการใช้งานรถโฟล์คลิฟท์เรียบร้อยแล้ว');
}

function handleGetTrackingHistory(PDO $pdo, array $req): void {
    $code = cleanForkliftText($req['code'] ?? '');
    if ($code === '') {
        throw new InvalidArgumentException('กรุณาระบุรหัสรถโฟล์คลิฟท์');
    }
    $mode = strtolower(trim((string)($req['mode'] ?? 'minutes')));
    $mins = max(1, min(10080, (int)($req['mins'] ?? 60)));
    $limit = max(10, min(300, (int)($req['limit'] ?? 150)));

    $vehStmt = $pdo->prepare(
        "SELECT TOP 1 id FROM dbo.FORKLIFTS
         WHERE REPLACE(LTRIM(RTRIM(code)), CHAR(9), '') = ?"
    );
    $vehStmt->execute([$code]);
    $forkliftId = (int)$vehStmt->fetchColumn();
    if ($forkliftId <= 0) {
        sendJson(false, null, 'ไม่พบข้อมูลรถโฟล์คลิฟท์ที่ต้องการดูเส้นทาง', 404);
    }

    if ($mode === 'latest') {
        $stmt = $pdo->prepare(
            "SELECT id, forklift_id, location_type, last_location, lat, lng, indoor_x, indoor_y, current_battery, recorded_at
             FROM (
                SELECT TOP ({$limit}) id, forklift_id, location_type, last_location, lat, lng, indoor_x, indoor_y, current_battery, recorded_at
                FROM dbo.FORKLIFT_HISTORY_LOGS
                WHERE forklift_id = ?
                ORDER BY recorded_at DESC, id DESC
             ) AS recent_pts
             ORDER BY recorded_at ASC, id ASC"
        );
        $stmt->execute([$forkliftId]);
    } else {
        $stmt = $pdo->prepare(
            "SELECT id, forklift_id, location_type, last_location, lat, lng, indoor_x, indoor_y, current_battery, recorded_at
             FROM (
                SELECT TOP ({$limit}) id, forklift_id, location_type, last_location, lat, lng, indoor_x, indoor_y, current_battery, recorded_at
                FROM dbo.FORKLIFT_HISTORY_LOGS
                WHERE forklift_id = ?
                  AND recorded_at >= DATEADD(MINUTE, -?, GETDATE())
                ORDER BY recorded_at DESC, id DESC
             ) AS window_pts
             ORDER BY recorded_at ASC, id ASC"
        );
        $stmt->execute([$forkliftId, $mins]);
    }

    $points = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    sendJson(true, [
        'forklift_id' => $forkliftId,
        'code' => $code,
        'mode' => $mode,
        'points' => $points
    ], 'Tracking trail loaded');
}

function handleGetHeatmap(PDO $pdo, array $req): void {
    $window = strtolower(trim((string)($req['window'] ?? '24h')));
    $forkliftId = isset($req['forklift_id']) ? (int)$req['forklift_id'] : 0;

    $whereClauses = [];
    $params = [];

    if ($forkliftId > 0) {
        $whereClauses[] = 'forklift_id = ?';
        $params[] = $forkliftId;
    }

    if ($window === '24h') {
        $whereClauses[] = 'recorded_at >= DATEADD(HOUR, -24, GETDATE())';
    } elseif ($window === '7d') {
        $whereClauses[] = 'recorded_at >= DATEADD(DAY, -7, GETDATE())';
    } elseif ($window === '30d') {
        $whereClauses[] = 'recorded_at >= DATEADD(DAY, -30, GETDATE())';
    } elseif ($window === 'latest_sample') {
        // Recent 30,000 logs snapshot around latest telemetry timestamp
        $whereClauses[] = 'recorded_at >= (SELECT DATEADD(DAY, -7, ISNULL(MAX(recorded_at), GETDATE())) FROM dbo.FORKLIFT_HISTORY_LOGS)';
    }

    $whereSql = !empty($whereClauses) ? ('WHERE ' . implode(' AND ', $whereClauses)) : '';
    $latRange = FACTORY_LAT_TOP - FACTORY_LAT_BOTTOM;
    $lngRange = FACTORY_LNG_RIGHT - FACTORY_LNG_LEFT;

    $sql = "SELECT TOP (2500)
                CAST(FLOOR(norm_x / 10.0) * 10 AS INT) AS bucket_x,
                CAST(FLOOR(norm_y / 10.0) * 10 AS INT) AS bucket_y,
                COUNT(*) AS weight
            FROM (
                SELECT TOP (60000)
                    CASE
                        WHEN location_type = 'OUTDOOR'
                             AND lat BETWEEN 12.880000 AND 12.893000
                             AND lng BETWEEN 101.085000 AND 101.100000
                            THEN ((CAST(lng AS FLOAT) - " . FACTORY_LNG_LEFT . ") / {$lngRange}) * 1000.0
                        ELSE CAST(indoor_x AS FLOAT)
                    END AS norm_x,
                    CASE
                        WHEN location_type = 'OUTDOOR'
                             AND lat BETWEEN 12.880000 AND 12.893000
                             AND lng BETWEEN 101.085000 AND 101.100000
                            THEN ((" . FACTORY_LAT_TOP . " - CAST(lat AS FLOAT)) / {$latRange}) * 1000.0
                        ELSE CAST(indoor_y AS FLOAT)
                    END AS norm_y
                FROM dbo.FORKLIFT_HISTORY_LOGS
                {$whereSql}
                ORDER BY recorded_at DESC
            ) AS pts
            WHERE norm_x BETWEEN 0 AND 1000 AND norm_y BETWEEN 0 AND 1000
            GROUP BY CAST(FLOOR(norm_x / 10.0) * 10 AS INT), CAST(FLOOR(norm_y / 10.0) * 10 AS INT)
            ORDER BY weight DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $buckets = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $totalWeight = 0;
    $maxWeight = 0;
    foreach ($buckets as &$b) {
        $b['bucket_x'] = (int)$b['bucket_x'];
        $b['bucket_y'] = (int)$b['bucket_y'];
        $b['weight'] = (int)$b['weight'];
        $totalWeight += $b['weight'];
        if ($b['weight'] > $maxWeight) {
            $maxWeight = $b['weight'];
        }
    }

    $metaStmt = $pdo->query("SELECT MIN(recorded_at) AS earliest_at, MAX(recorded_at) AS latest_at, COUNT(*) AS total_archive FROM dbo.FORKLIFT_HISTORY_LOGS");
    $meta = $metaStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    sendJson(true, [
        'buckets' => $buckets,
        'window' => $window,
        'total_points' => $totalWeight,
        'max_weight' => $maxWeight,
        'cell_count' => count($buckets),
        'latest_at' => $meta['latest_at'] ?? null,
        'earliest_at' => $meta['earliest_at'] ?? null,
        'total_archive' => (int)($meta['total_archive'] ?? 0)
    ], 'Heatmap density aggregated');
}

function handleGetZones(PDO $pdo): void {
    $stmt = $pdo->query(
        "SELECT TOP (500) ap_id, zone_name, svg_x, svg_y, bssid_1, rssi_1, bssid_2, rssi_2, bssid_3, rssi_3, is_active
         FROM dbo.WIFI_AP_ZONES
         WHERE is_active = 1
         ORDER BY zone_name ASC"
    );
    $zones = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    sendJson(true, $zones, 'Wi-Fi AP Zones loaded');
}

function handleSaveZone(PDO $pdo, array $req, bool $canManage): void {
    if (!$canManage) {
        sendJson(false, null, 'เฉพาะผู้ดูแลระบบหรือหัวหน้างานเท่านั้นที่สามารถบันทึก Site Survey Wi-Fi AP Zone', 403);
    }

    $zoneName = validateTextParam($req['zone_name'] ?? '', 100, 'ชื่อโซน (Zone Name)', true);
    $svgX = validateBoundedInt($req['svg_x'] ?? -1, 0, 1000, 'พิกัด X (0-1000)');
    $svgY = validateBoundedInt($req['svg_y'] ?? -1, 0, 1000, 'พิกัด Y (0-1000)');
    $bssid1 = validateTextParam($req['bssid_1'] ?? '', 20, 'BSSID #1 (AP หลัก)', true);
    $rssi1 = validateBoundedInt($req['rssi_1'] ?? -50, -120, 0, 'สัญญาณ RSSI #1');
    $bssid2 = validateTextParam($req['bssid_2'] ?? '', 20, 'BSSID #2');
    $rssi2 = ($bssid2 !== '') ? validateBoundedInt($req['rssi_2'] ?? -100, -120, 0, 'สัญญาณ RSSI #2') : -100;
    $bssid3 = validateTextParam($req['bssid_3'] ?? '', 20, 'BSSID #3');
    $rssi3 = ($bssid3 !== '') ? validateBoundedInt($req['rssi_3'] ?? -100, -120, 0, 'สัญญาณ RSSI #3') : -100;

    $bssid2Val = $bssid2 !== '' ? $bssid2 : null;
    $bssid3Val = $bssid3 !== '' ? $bssid3 : null;

    $oldStmt = $pdo->prepare("SELECT ap_id, zone_name, svg_x, svg_y, bssid_1, rssi_1, bssid_2, rssi_2, bssid_3, rssi_3 FROM dbo.WIFI_AP_ZONES WHERE zone_name = ?");
    $oldStmt->execute([$zoneName]);
    $oldData = $oldStmt->fetch(PDO::FETCH_ASSOC) ?: null;

    $pdo->beginTransaction();
    $sql = "MERGE INTO dbo.WIFI_AP_ZONES AS target
            USING (SELECT ? AS zone_name) AS source
            ON (target.zone_name = source.zone_name)
            WHEN MATCHED THEN
                UPDATE SET svg_x = ?, svg_y = ?, bssid_1 = ?, rssi_1 = ?, bssid_2 = ?, rssi_2 = ?, bssid_3 = ?, rssi_3 = ?, is_active = 1
            WHEN NOT MATCHED THEN
                INSERT (zone_name, svg_x, svg_y, bssid_1, rssi_1, bssid_2, rssi_2, bssid_3, rssi_3, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1);";

    $pdo->prepare($sql)->execute([
        $zoneName,
        $svgX, $svgY, $bssid1, $rssi1, $bssid2Val, $rssi2, $bssid3Val, $rssi3,
        $zoneName, $svgX, $svgY, $bssid1, $rssi1, $bssid2Val, $rssi2, $bssid3Val, $rssi3
    ]);

    writeLog($pdo, $oldData ? 'UPDATE' : 'CREATE', 'FORKLIFT_WIFI_ZONE', $zoneName, $oldData, [
        'zone_name' => $zoneName,
        'svg_x' => $svgX,
        'svg_y' => $svgY,
        'bssid_1' => $bssid1,
        'rssi_1' => $rssi1
    ], "Saved Wi-Fi AP Zone {$zoneName}");

    $pdo->commit();
    sendJson(true, null, "บันทึกพิกัด {$zoneName} (X:{$svgX}, Y:{$svgY}) เรียบร้อยแล้ว");
}

function handleReportIssue(PDO $pdo, array $req): void {
    $forkliftId = validateBoundedInt($req['forklift_id'] ?? 0, 1, 9999999, 'รหัสรถโฟล์คลิฟท์');
    $issueDetail = validateTextParam($req['issue_detail'] ?? '', 500, 'รายละเอียดอาการเสีย/ปัญหา', true);
    $setMaintenance = filter_var($req['set_maintenance'] ?? true, FILTER_VALIDATE_BOOLEAN);

    $stmt = $pdo->prepare("SELECT id, code, name, status, current_battery, last_location FROM dbo.FORKLIFTS WHERE id = ?");
    $stmt->execute([$forkliftId]);
    $oldData = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$oldData) {
        sendJson(false, null, 'ไม่พบรถโฟล์คลิฟท์ที่ต้องการแจ้งปัญหา', 404);
    }

    $newStatus = $setMaintenance ? 'MAINTENANCE' : (string)$oldData['status'];
    $pdo->beginTransaction();
    if ($setMaintenance && strtoupper((string)$oldData['status']) !== 'MAINTENANCE') {
        $pdo->prepare("UPDATE dbo.FORKLIFTS SET status = 'MAINTENANCE', last_updated = GETDATE() WHERE id = ?")->execute([$forkliftId]);
    }

    writeLog($pdo, 'REPORT_ISSUE', 'FORKLIFT', (string)$forkliftId, $oldData, [
        'code' => cleanForkliftText($oldData['code']),
        'status' => $newStatus,
        'issue_detail' => $issueDetail
    ], "แจ้งปัญหาโฟล์คลิฟท์: {$issueDetail}");

    $pdo->commit();
    sendJson(true, ['status' => $newStatus], 'บันทึกการแจ้งปัญหาและส่งข้อมูลให้ทีมซ่อมบำรุงเรียบร้อยแล้ว');
}

// NOTE: Intentionally >50 lines — Central action dispatcher for Forklift module
function dispatchForkliftAction(PDO $pdo, string $action, array $req, array $currentUser, bool $canManage): void {
    switch ($action) {
        case 'get_dashboard':
            handleGetDashboard($pdo);
            break;
        case 'get_realtime':
            handleGetRealtime($pdo);
            break;
        case 'get_single_forklift':
            handleGetSingleForklift($pdo, $req);
            break;
        case 'book_forklift':
            verifyForkliftCsrf();
            handleBookForklift($pdo, $req, $currentUser);
            break;
        case 'start_job':
            verifyForkliftCsrf();
            handleStartJob($pdo, $req);
            break;
        case 'return_forklift':
            verifyForkliftCsrf();
            handleReturnForklift($pdo, $req, $currentUser, $canManage);
            break;
        case 'get_timeline':
            handleGetTimeline($pdo);
            break;
        case 'get_history':
            handleGetBookingHistory($pdo, $req);
            break;
        case 'get_tracking_history':
            handleGetTrackingHistory($pdo, $req);
            break;
        case 'get_heatmap':
            handleGetHeatmap($pdo, $req);
            break;
        case 'get_zones':
            handleGetZones($pdo);
            break;
        case 'save_zone':
            verifyForkliftCsrf();
            handleSaveZone($pdo, $req, $canManage);
            break;
        case 'report_issue':
            verifyForkliftCsrf();
            handleReportIssue($pdo, $req);
            break;
        case 'save_forklift':
            verifyForkliftCsrf();
            handleSaveForklift($pdo, $req, $canManage);
            break;
        case 'delete_forklift':
            verifyForkliftCsrf();
            handleDeleteForklift($pdo, $req, $canManage);
            break;
        default:
            sendJson(false, null, 'Invalid or unrecognized API action', 400);
    }
}

try {
    if (!isset($_SESSION['user'])) {
        sendJson(false, null, 'Unauthorized Access: Please log in', 401);
    }

    $currentUser = $_SESSION['user'];
    $role = strtolower((string)($currentUser['role'] ?? 'guest'));
    $canManage = in_array($role, ['admin', 'creator', 'supervisor', 'manager'], true);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        if ($rawInput !== false && $rawInput !== '') {
            $jsonPayload = json_decode($rawInput, true);
            if (is_array($jsonPayload)) {
                $_POST = array_merge($_POST, $jsonPayload);
                $_REQUEST = array_merge($_REQUEST, $jsonPayload);
            }
        }
    }

    $action = (string)($_REQUEST['action'] ?? '');
    dispatchForkliftAction($pdo, $action, $_REQUEST, $currentUser, $canManage);
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJson(false, null, $e->getMessage(), 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo ?? null, 'FORKLIFT', $e->getMessage(), $_POST ?? []);
    sendJson(false, null, 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 500);
}
?>
