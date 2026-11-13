<?php
/**
 * fleetLogApi.php
 * Self-Contained Backend API for Freight & Fleet Cost Logistics (Toolbox SPA)
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

function sendFleetResponse(bool $success, $data = null, string $message = '', int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function verifyFleetCsrf(): void {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if ($clientToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $clientToken)) {
        sendFleetResponse(false, null, 'CSRF Token Validation Failed. กรุณารีเฟรชหน้าจอแล้วลองใหม่อีกครั้ง', 403);
    }
}

function validateIsoDate($value, string $fallback): string {
    return (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) ? $value : $fallback;
}

function validateDecimalPrecision($rawValue, float $maxValue = 9999999.999, string $label = 'ค่าขนส่ง'): float {
    $rawStr = trim((string)($rawValue ?? '0'));
    if ($rawStr === '') {
        return 0.0;
    }
    if (!is_numeric($rawStr)) {
        throw new InvalidArgumentException("ข้อมูล{$label}ต้องเป็นตัวเลขเท่านั้น");
    }
    $num = (float)$rawStr;
    if (!is_finite($num) || $num < 0) {
        throw new InvalidArgumentException("ข้อมูล{$label}ต้องไม่ติดลบ");
    }
    if ($num > $maxValue) {
        throw new InvalidArgumentException("ข้อมูล{$label}ต้องไม่เกิน " . number_format($maxValue, 3));
    }
    if (preg_match('/\.(\d+)$/', $rawStr, $m) && strlen($m[1]) > 3) {
        throw new InvalidArgumentException("ข้อมูล{$label}รองรับทศนิยมสูงสุด 3 ตำแหน่ง");
    }
    return round($num, 3);
}

function validateBoundedString($rawValue, int $maxLen, string $label, bool $required = false): string {
    $val = trim((string)($rawValue ?? ''));
    if ($required && $val === '') {
        throw new InvalidArgumentException("กรุณาระบุ{$label}");
    }
    $len = function_exists('mb_strlen') ? mb_strlen($val, 'UTF-8') : strlen($val);
    if ($len > $maxLen) {
        throw new InvalidArgumentException("{$label}ต้องมีความยาวไม่เกิน {$maxLen} ตัวอักษร");
    }
    return $val;
}

function parseFleetTimestamp($rawValue): string {
    $raw = str_replace('T', ' ', trim((string)($rawValue ?? '')));
    if ($raw === '') {
        return date('Y-m-d H:i:s');
    }
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $raw)) {
        $raw .= ':00';
    }
    $dt = DateTime::createFromFormat('Y-m-d H:i:s', $raw);
    if (!$dt || $dt->format('Y-m-d H:i:s') !== $raw) {
        throw new InvalidArgumentException('รูปแบบวัน/เวลาไม่ถูกต้อง (กรุณาใช้ YYYY-MM-DD HH:MM)');
    }
    return $raw;
}

function parseFleetLogInput(array $src): array {
    $transType = strtoupper(trim((string)($src['trans_type'] ?? 'INBOUND')));
    if (!in_array($transType, ['INBOUND', 'OUTBOUND', 'OTHER'], true)) {
        throw new InvalidArgumentException('ประเภทรายการต้องเป็น INBOUND, OUTBOUND หรือ OTHER เท่านั้น');
    }

    $providerType = strtoupper(trim((string)($src['provider_type'] ?? 'VENDOR')));
    if (!in_array($providerType, ['VENDOR', 'SNC'], true)) {
        throw new InvalidArgumentException('ผู้ให้บริการต้องเป็น VENDOR หรือ SNC เท่านั้น');
    }

    return [
        'log_timestamp' => parseFleetTimestamp($src['log_timestamp'] ?? ''),
        'trans_type' => $transType,
        'provider_type' => $providerType,
        'vehicle_type' => validateBoundedString($src['vehicle_type'] ?? '', 50, 'ประเภทรถ/ตู้', true),
        'car_license' => validateBoundedString($src['car_license'] ?? '', 50, 'ทะเบียนรถ'),
        'container_no' => validateBoundedString($src['container_no'] ?? '', 50, 'หมายเลขตู้'),
        'seal_no' => validateBoundedString($src['seal_no'] ?? '', 50, 'หมายเลขซีล'),
        'ref_document' => validateBoundedString($src['ref_document'] ?? '', 100, 'เอกสารอ้างอิง'),
        'remark' => validateBoundedString($src['remark'] ?? '', 255, 'หมายเหตุ'),
        'transport_cost' => validateDecimalPrecision($src['transport_cost'] ?? 0)
    ];
}

function buildFleetFilterWhere(array $req): array {
    $startDate = validateIsoDate($req['start_date'] ?? null, date('Y-m-01'));
    $endDate = validateIsoDate($req['end_date'] ?? null, date('Y-m-t'));
    if ($startDate > $endDate) {
        [$startDate, $endDate] = [$endDate, $startDate];
    }

    $where = " WHERE f.log_timestamp >= ? AND f.log_timestamp <= ? ";
    $params = [$startDate . ' 00:00:00', $endDate . ' 23:59:59'];

    $transType = strtoupper(trim((string)($req['trans_type'] ?? 'ALL')));
    if (in_array($transType, ['INBOUND', 'OUTBOUND', 'OTHER'], true)) {
        $where .= " AND f.trans_type = ? ";
        $params[] = $transType;
    }

    $provider = strtoupper(trim((string)($req['provider_type'] ?? 'ALL')));
    if (in_array($provider, ['VENDOR', 'SNC'], true)) {
        $where .= " AND f.provider_type = ? ";
        $params[] = $provider;
    }

    $vehicle = trim((string)($req['vehicle_type'] ?? 'ALL'));
    if ($vehicle !== '' && $vehicle !== 'ALL') {
        $where .= " AND f.vehicle_type = ? ";
        $params[] = $vehicle;
    }

    $search = trim((string)($req['search'] ?? ''));
    if ($search !== '') {
        $like = '%' . $search . '%';
        $where .= " AND (f.car_license LIKE ? OR f.container_no LIKE ? OR f.seal_no LIKE ? OR f.ref_document LIKE ? OR f.remark LIKE ? OR f.vehicle_type LIKE ? OR COALESCE(u.fullname, u.username, '') LIKE ?) ";
        array_push($params, $like, $like, $like, $like, $like, $like, $like);
    }

    return [$where, $params, $startDate, $endDate];
}

function fetchFleetKpiSummary(PDO $pdo, string $where, array $params): array {
    $usersTable = defined('USERS_TABLE') ? USERS_TABLE : 'USERS';
    $sqlAgg = "SELECT
                   f.trans_type,
                   f.provider_type,
                   ISNULL(NULLIF(LTRIM(RTRIM(f.vehicle_type)), ''), 'UNKNOWN') AS vehicle_type,
                   COUNT(*) AS trip_count,
                   COALESCE(SUM(CAST(f.transport_cost AS DECIMAL(18,3))), 0) AS total_cost
               FROM dbo.LOGISTICS_FLEET_LOGS f WITH (NOLOCK)
               LEFT JOIN dbo.{$usersTable} u WITH (NOLOCK) ON f.created_by_user_id = u.id
               {$where}
               GROUP BY f.trans_type, f.provider_type, ISNULL(NULLIF(LTRIM(RTRIM(f.vehicle_type)), ''), 'UNKNOWN')";

    $stmt = $pdo->prepare($sqlAgg);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $kpi = [
        'total' => 0,
        'vendor' => 0,
        'snc' => 0,
        'total_cost' => 0.0,
        'breakdown' => ['total' => [], 'vendor' => [], 'snc' => []],
        'cost_breakdown' => ['INBOUND' => 0.0, 'OUTBOUND' => 0.0, 'OTHER' => 0.0]
    ];

    foreach ($rows as $row) {
        $cnt = (int)$row['trip_count'];
        $cost = (float)$row['total_cost'];
        $vType = $row['vehicle_type'];
        $provider = strtoupper((string)$row['provider_type']);
        $tType = strtoupper((string)$row['trans_type']);

        $kpi['total'] += $cnt;
        $kpi['total_cost'] += $cost;

        $costKey = isset($kpi['cost_breakdown'][$tType]) ? $tType : 'OTHER';
        $kpi['cost_breakdown'][$costKey] += $cost;

        $kpi['breakdown']['total'][$vType] = ($kpi['breakdown']['total'][$vType] ?? 0) + $cnt;
        if ($provider === 'VENDOR') {
            $kpi['vendor'] += $cnt;
            $kpi['breakdown']['vendor'][$vType] = ($kpi['breakdown']['vendor'][$vType] ?? 0) + $cnt;
        } elseif ($provider === 'SNC') {
            $kpi['snc'] += $cnt;
            $kpi['breakdown']['snc'][$vType] = ($kpi['breakdown']['snc'][$vType] ?? 0) + $cnt;
        }
    }

    arsort($kpi['breakdown']['total']);
    arsort($kpi['breakdown']['vendor']);
    arsort($kpi['breakdown']['snc']);
    $kpi['total_cost'] = round($kpi['total_cost'], 2);

    return $kpi;
}

function fetchFleetDailyTrend(PDO $pdo, string $where, array $params): array {
    $usersTable = defined('USERS_TABLE') ? USERS_TABLE : 'USERS';
    $sql = "SELECT
                CONVERT(VARCHAR(10), f.log_timestamp, 120) AS log_day,
                COUNT(*) AS trips,
                COALESCE(SUM(CAST(f.transport_cost AS DECIMAL(18,3))), 0) AS total_cost
            FROM dbo.LOGISTICS_FLEET_LOGS f WITH (NOLOCK)
            LEFT JOIN dbo.{$usersTable} u WITH (NOLOCK) ON f.created_by_user_id = u.id
            {$where}
            GROUP BY CONVERT(VARCHAR(10), f.log_timestamp, 120)
            ORDER BY log_day ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return array_map(static function ($row) {
        return [
            'log_day' => $row['log_day'],
            'trips' => (int)$row['trips'],
            'total_cost' => round((float)$row['total_cost'], 2)
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));
}

function handleGetLogs(PDO $pdo, array $req): void {
    [$where, $params, $startDate, $endDate] = buildFleetFilterWhere($req);
    $usersTable = defined('USERS_TABLE') ? USERS_TABLE : 'USERS';

    $page = max(1, intval($req['page'] ?? 1));
    $limit = max(10, min(200, intval($req['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;

    $kpi = fetchFleetKpiSummary($pdo, $where, $params);
    $dailyTrend = fetchFleetDailyTrend($pdo, $where, $params);

    $sqlList = "SELECT
                    f.log_id,
                    CONVERT(VARCHAR(19), f.log_timestamp, 120) AS log_timestamp,
                    f.trans_type,
                    f.provider_type,
                    f.vehicle_type,
                    f.car_license,
                    f.container_no,
                    f.seal_no,
                    f.ref_document,
                    f.loading_report_id,
                    f.remark,
                    f.created_by_user_id,
                    CAST(COALESCE(f.transport_cost, 0) AS DECIMAL(18,3)) AS transport_cost,
                    COALESCE(u.fullname, u.username, 'System') AS admin_name
                FROM dbo.LOGISTICS_FLEET_LOGS f WITH (NOLOCK)
                LEFT JOIN dbo.{$usersTable} u WITH (NOLOCK) ON f.created_by_user_id = u.id
                {$where}
                ORDER BY f.log_timestamp DESC, f.log_id DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";

    $stmt = $pdo->prepare($sqlList);
    $bindIdx = 1;
    foreach ($params as $val) {
        $stmt->bindValue($bindIdx++, $val);
    }
    $stmt->bindValue($bindIdx++, $offset, PDO::PARAM_INT);
    $stmt->bindValue($bindIdx, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $vehicleOptionsStmt = $pdo->query("SELECT DISTINCT ISNULL(NULLIF(LTRIM(RTRIM(vehicle_type)), ''), 'OTHER') AS vehicle_type FROM dbo.LOGISTICS_FLEET_LOGS WITH (NOLOCK) ORDER BY vehicle_type ASC");
    $vehicleOptions = array_column($vehicleOptionsStmt->fetchAll(PDO::FETCH_ASSOC), 'vehicle_type');

    $totalRows = $kpi['total'];
    sendFleetResponse(true, [
        'logs' => $logs,
        'kpi' => $kpi,
        'daily_trend' => $dailyTrend,
        'vehicle_options' => $vehicleOptions,
        'date_range' => ['start_date' => $startDate, 'end_date' => $endDate],
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total_rows' => $totalRows,
            'total_pages' => max(1, (int)ceil($totalRows / $limit))
        ]
    ], 'Loaded fleet logs successfully');
}

function handleExportLogs(PDO $pdo, array $req): void {
    [$where, $params] = buildFleetFilterWhere($req);
    $usersTable = defined('USERS_TABLE') ? USERS_TABLE : 'USERS';
    $sql = "SELECT TOP (5000)
                f.log_id,
                CONVERT(VARCHAR(19), f.log_timestamp, 120) AS log_timestamp,
                f.trans_type,
                f.provider_type,
                f.vehicle_type,
                f.car_license,
                f.container_no,
                f.seal_no,
                f.ref_document,
                f.loading_report_id,
                f.remark,
                CAST(COALESCE(f.transport_cost, 0) AS DECIMAL(18,3)) AS transport_cost,
                COALESCE(u.fullname, u.username, 'System') AS admin_name
            FROM dbo.LOGISTICS_FLEET_LOGS f WITH (NOLOCK)
            LEFT JOIN dbo.{$usersTable} u WITH (NOLOCK) ON f.created_by_user_id = u.id
            {$where}
            ORDER BY f.log_timestamp DESC, f.log_id DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    sendFleetResponse(true, $stmt->fetchAll(PDO::FETCH_ASSOC), 'Export dataset prepared');
}

function handleGetLogDetail(PDO $pdo, array $req): void {
    $logId = intval($req['log_id'] ?? 0);
    if ($logId <= 0) {
        throw new InvalidArgumentException('รหัสรายการไม่ถูกต้อง');
    }
    $stmt = $pdo->prepare("SELECT log_id, CONVERT(VARCHAR(19), log_timestamp, 120) AS log_timestamp, trans_type, provider_type, vehicle_type, car_license, container_no, seal_no, ref_document, loading_report_id, remark, CAST(COALESCE(transport_cost, 0) AS DECIMAL(18,3)) AS transport_cost FROM dbo.LOGISTICS_FLEET_LOGS WITH (NOLOCK) WHERE log_id = ?");
    $stmt->execute([$logId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        sendFleetResponse(false, null, 'ไม่พบข้อมูลรายการเที่ยวรถ', 404);
    }
    sendFleetResponse(true, $row, 'Loaded log detail');
}

function handleSaveManualLog(PDO $pdo, array $req, int $userId): void {
    verifyFleetCsrf();
    $input = parseFleetLogInput($req);

    $pdo->beginTransaction();
    $sql = "INSERT INTO dbo.LOGISTICS_FLEET_LOGS
            (log_timestamp, trans_type, provider_type, vehicle_type, car_license, container_no, seal_no, ref_document, remark, transport_cost, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $input['log_timestamp'],
        $input['trans_type'],
        $input['provider_type'],
        $input['vehicle_type'],
        $input['car_license'],
        $input['container_no'] !== '' ? $input['container_no'] : null,
        $input['seal_no'] !== '' ? $input['seal_no'] : null,
        $input['ref_document'] !== '' ? $input['ref_document'] : null,
        $input['remark'],
        $input['transport_cost'],
        $userId
    ]);
    $newId = (string)$pdo->lastInsertId();
    writeLog($pdo, 'INSERT', 'FLEET_LOG', $newId, null, $input, 'Created manual fleet log');
    $pdo->commit();

    sendFleetResponse(true, ['log_id' => $newId], 'บันทึกข้อมูลเที่ยวรถสำเร็จ');
}

function handleUpdateManualLog(PDO $pdo, array $req): void {
    verifyFleetCsrf();
    $logId = intval($req['log_id'] ?? 0);
    if ($logId <= 0) {
        throw new InvalidArgumentException('รหัสรายการไม่ถูกต้อง');
    }
    $input = parseFleetLogInput($req);

    $pdo->beginTransaction();
    $stmtOld = $pdo->prepare("SELECT log_id, CONVERT(VARCHAR(19), log_timestamp, 120) AS log_timestamp, trans_type, provider_type, vehicle_type, car_license, container_no, seal_no, ref_document, loading_report_id, remark, transport_cost FROM dbo.LOGISTICS_FLEET_LOGS WITH (UPDLOCK) WHERE log_id = ?");
    $stmtOld->execute([$logId]);
    $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);

    if (!$oldRow) {
        $pdo->rollBack();
        sendFleetResponse(false, null, 'ไม่พบรายการเที่ยวรถที่ต้องการแก้ไข', 404);
    }
    if ($oldRow['loading_report_id'] !== null) {
        $pdo->rollBack();
        throw new InvalidArgumentException('รายการที่ซิงค์อัตโนมัติจาก C-TPAT สามารถแก้ไขได้เฉพาะค่าขนส่งและหมายเหตุเท่านั้น');
    }

    $sql = "UPDATE dbo.LOGISTICS_FLEET_LOGS
            SET log_timestamp = ?, trans_type = ?, provider_type = ?, vehicle_type = ?, car_license = ?, container_no = ?, seal_no = ?, ref_document = ?, remark = ?, transport_cost = ?, updated_at = GETDATE()
            WHERE log_id = ? AND loading_report_id IS NULL";
    $pdo->prepare($sql)->execute([
        $input['log_timestamp'],
        $input['trans_type'],
        $input['provider_type'],
        $input['vehicle_type'],
        $input['car_license'],
        $input['container_no'] !== '' ? $input['container_no'] : null,
        $input['seal_no'] !== '' ? $input['seal_no'] : null,
        $input['ref_document'] !== '' ? $input['ref_document'] : null,
        $input['remark'],
        $input['transport_cost'],
        $logId
    ]);

    writeLog($pdo, 'UPDATE', 'FLEET_LOG', (string)$logId, $oldRow, $input, 'Updated manual fleet log');
    $pdo->commit();

    sendFleetResponse(true, ['log_id' => $logId], 'แก้ไขข้อมูลเที่ยวรถสำเร็จ');
}

function handleUpdateQuickCost(PDO $pdo, array $req): void {
    verifyFleetCsrf();
    $logId = intval($req['log_id'] ?? 0);
    if ($logId <= 0) {
        throw new InvalidArgumentException('รหัสรายการไม่ถูกต้อง');
    }
    $transportCost = validateDecimalPrecision($req['transport_cost'] ?? 0);
    $remark = validateBoundedString($req['remark'] ?? '', 255, 'หมายเหตุ');

    $pdo->beginTransaction();
    $stmtOld = $pdo->prepare("SELECT log_id, transport_cost, remark FROM dbo.LOGISTICS_FLEET_LOGS WITH (UPDLOCK) WHERE log_id = ?");
    $stmtOld->execute([$logId]);
    $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);

    if (!$oldRow) {
        $pdo->rollBack();
        sendFleetResponse(false, null, 'ไม่พบรายการเที่ยวรถที่ต้องการอัปเดต', 404);
    }

    $pdo->prepare("UPDATE dbo.LOGISTICS_FLEET_LOGS SET transport_cost = ?, remark = ?, updated_at = GETDATE() WHERE log_id = ?")
        ->execute([$transportCost, $remark, $logId]);

    writeLog($pdo, 'UPDATE_COST', 'FLEET_LOG', (string)$logId, $oldRow, ['transport_cost' => $transportCost, 'remark' => $remark], 'Updated fleet transport cost');
    $pdo->commit();

    sendFleetResponse(true, ['log_id' => $logId, 'transport_cost' => $transportCost], 'อัปเดตค่าขนส่งสำเร็จ');
}

function handleDeleteLog(PDO $pdo, array $req): void {
    verifyFleetCsrf();
    $logId = intval($req['log_id'] ?? 0);
    if ($logId <= 0) {
        throw new InvalidArgumentException('รหัสรายการไม่ถูกต้อง');
    }

    $pdo->beginTransaction();
    $stmtOld = $pdo->prepare("SELECT log_id, CONVERT(VARCHAR(19), log_timestamp, 120) AS log_timestamp, trans_type, provider_type, vehicle_type, car_license, loading_report_id, transport_cost, remark FROM dbo.LOGISTICS_FLEET_LOGS WITH (UPDLOCK) WHERE log_id = ?");
    $stmtOld->execute([$logId]);
    $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);

    if (!$oldRow) {
        $pdo->rollBack();
        sendFleetResponse(false, null, 'ไม่พบรายการเที่ยวรถที่ต้องการลบ', 404);
    }
    if ($oldRow['loading_report_id'] !== null) {
        $pdo->rollBack();
        sendFleetResponse(false, null, 'ปฏิเสธการลบ: รายการนี้ถูกดึงมาจากระบบ C-TPAT อัตโนมัติ (กรุณายกเลิกใบโหลดที่ต้นทาง)', 400);
    }

    $pdo->prepare("DELETE FROM dbo.LOGISTICS_FLEET_LOGS WHERE log_id = ? AND loading_report_id IS NULL")
        ->execute([$logId]);

    writeLog($pdo, 'DELETE', 'FLEET_LOG', (string)$logId, $oldRow, null, 'Deleted manual fleet log');
    $pdo->commit();

    sendFleetResponse(true, ['log_id' => $logId], 'ลบข้อมูลรายการเที่ยวรถสำเร็จ');
}

function handleGetPendingLoading(PDO $pdo): void {
    $loadingTable = defined('LOADING_REPORTS_TABLE') ? LOADING_REPORTS_TABLE : 'LOADING_REPORTS';
    $salesTable = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';

    $sql = "SELECT TOP (100)
                l.id,
                s.po_number,
                l.car_license,
                l.container_no,
                l.container_type,
                l.seal_no,
                CONVERT(VARCHAR(19), l.loading_end_time, 120) AS loading_end_time,
                s.invoice_no,
                s.snc_ci_no
            FROM dbo.{$loadingTable} l WITH (NOLOCK)
            LEFT JOIN dbo.{$salesTable} s WITH (NOLOCK) ON l.sales_order_id = s.id
            LEFT JOIN dbo.LOGISTICS_FLEET_LOGS f WITH (NOLOCK) ON l.id = f.loading_report_id
            WHERE l.status = 'COMPLETED' AND f.log_id IS NULL
            ORDER BY l.updated_at DESC";
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    sendFleetResponse(true, $rows, 'Loaded pending C-TPAT reports');
}

function handleSyncOutbound(PDO $pdo, array $req, int $userId): void {
    verifyFleetCsrf();
    $loadingId = intval($req['loading_report_id'] ?? 0);
    if ($loadingId <= 0) {
        throw new InvalidArgumentException('รหัสใบโหลด C-TPAT ไม่ถูกต้อง');
    }
    $transportCost = validateDecimalPrecision($req['transport_cost'] ?? 1100);

    $loadingTable = defined('LOADING_REPORTS_TABLE') ? LOADING_REPORTS_TABLE : 'LOADING_REPORTS';
    $salesTable = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';

    $pdo->beginTransaction();
    $dupStmt = $pdo->prepare("SELECT log_id FROM dbo.LOGISTICS_FLEET_LOGS WITH (UPDLOCK, HOLDLOCK) WHERE loading_report_id = ?");
    $dupStmt->execute([$loadingId]);
    if ($dupStmt->fetch(PDO::FETCH_ASSOC)) {
        $pdo->rollBack();
        throw new InvalidArgumentException('ใบโหลด C-TPAT นี้ถูกซิงค์เข้าสู่บัญชีเที่ยวรถแล้ว');
    }

    $stmt = $pdo->prepare("SELECT r.id, r.car_license, r.container_no, r.container_type, r.seal_no, CONVERT(VARCHAR(19), r.loading_end_time, 120) AS loading_end_time, s.po_number FROM dbo.{$loadingTable} r WITH (NOLOCK) LEFT JOIN dbo.{$salesTable} s WITH (NOLOCK) ON r.sales_order_id = s.id WHERE r.id = ?");
    $stmt->execute([$loadingId]);
    $report = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$report) {
        $pdo->rollBack();
        sendFleetResponse(false, null, 'ไม่พบใบโหลด C-TPAT หรือข้อมูลถูกลบไปแล้ว', 404);
    }

    $logTime = $report['loading_end_time'] ?: date('Y-m-d H:i:s');
    $vehicleType = trim((string)($report['container_type'] ?? '')) ?: 'UNKNOWN';
    $refDoc = trim((string)($report['po_number'] ?? '')) ?: ('C-TPAT ID: ' . $loadingId);

    $sqlInsert = "INSERT INTO dbo.LOGISTICS_FLEET_LOGS
                  (log_timestamp, trans_type, provider_type, vehicle_type, car_license, container_no, seal_no, ref_document, loading_report_id, created_by_user_id, transport_cost)
                  VALUES (?, 'OUTBOUND', 'VENDOR', ?, ?, ?, ?, ?, ?, ?, ?)";
    $pdo->prepare($sqlInsert)->execute([
        $logTime,
        $vehicleType,
        $report['car_license'],
        $report['container_no'],
        $report['seal_no'],
        $refDoc,
        $loadingId,
        $userId,
        $transportCost
    ]);
    $newId = (string)$pdo->lastInsertId();

    writeLog($pdo, 'SYNC_CTPAT', 'FLEET_LOG', $newId, null, [
        'loading_report_id' => $loadingId,
        'ref_document' => $refDoc,
        'vehicle_type' => $vehicleType,
        'transport_cost' => $transportCost
    ], "Synced C-TPAT loading_report_id={$loadingId}");
    $pdo->commit();

    sendFleetResponse(true, ['log_id' => $newId], 'ซิงค์ข้อมูลรถออก C-TPAT สำเร็จ');
}

// NOTE: Intentionally >50 lines — Action dispatcher for Freight FleetLog endpoints
function dispatchFleetAction(PDO $pdo, string $action, array $req, int $userId): void {
    switch ($action) {
        case 'get_logs':
            handleGetLogs($pdo, $req);
            break;
        case 'export_logs':
            handleExportLogs($pdo, $req);
            break;
        case 'get_log_detail':
            handleGetLogDetail($pdo, $req);
            break;
        case 'save_manual_log':
            handleSaveManualLog($pdo, $req, $userId);
            break;
        case 'update_manual_log':
            handleUpdateManualLog($pdo, $req);
            break;
        case 'update_quick_cost':
            handleUpdateQuickCost($pdo, $req);
            break;
        case 'delete_log':
            handleDeleteLog($pdo, $req);
            break;
        case 'get_pending_loading':
            handleGetPendingLoading($pdo);
            break;
        case 'sync_outbound':
            handleSyncOutbound($pdo, $req, $userId);
            break;
        default:
            sendFleetResponse(false, null, 'Action not supported: ' . htmlspecialchars($action, ENT_QUOTES, 'UTF-8'), 400);
    }
}

try {
    if (!isset($_SESSION['user']['id'])) {
        sendFleetResponse(false, null, 'Unauthorized Access: Please log in', 401);
    }
    if (hasRole(['trainee', 'display'])) {
        sendFleetResponse(false, null, 'Forbidden: บัญชีผู้ใช้งานนี้ไม่มีสิทธิ์เข้าถึงระบบ Freight FleetLog', 403);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        if (!empty($rawInput)) {
            $decoded = json_decode($rawInput, true);
            if (is_array($decoded)) {
                $_POST = array_merge($_POST, $decoded);
                $_REQUEST = array_merge($_REQUEST, $decoded);
            }
        }
    }

    $action = (string)($_REQUEST['action'] ?? '');
    $userId = intval($_SESSION['user']['id']);
    dispatchFleetAction($pdo, $action, $_REQUEST, $userId);
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendFleetResponse(false, null, $e->getMessage(), 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo ?? null, 'FLEET_LOG', $e->getMessage(), $_POST ?? []);
    sendFleetResponse(false, null, 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 500);
}
?>
