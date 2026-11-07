<?php
/**
 * utilityApi.php
 * Central Self-Contained Backend API for Toolbox Utility & Energy Management
 * MES & IIoT Toolbox - SNC Former (B9)
 * Standard: Industrial Audit Trail Protocol & Unified Session Security
 */

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
error_reporting(0);
ini_set('display_errors', 0);

define('ALLOW_GUEST_ACCESS', true);
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
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $jsonPayload = json_decode(file_get_contents('php://input'), true);
        if (is_array($jsonPayload)) {
            $_POST = array_merge($_POST, $jsonPayload);
            $_REQUEST = array_merge($_REQUEST, $jsonPayload);
        }
    }

    $action = $_REQUEST['action'] ?? '';

    // IoT hardware & Cron endpoints authenticate via X-API-KEY
    $isIotAction = in_array($action, ['insert_log', 'aggregate_summary']);
    if ($isIotAction) {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $apiKey = $headers['X-API-KEY'] ?? $headers['X-Api-Key'] ?? $headers['x-api-key'] ?? ($_SERVER['HTTP_X_API_KEY'] ?? '');
        if ($apiKey !== 'MESKey2026') {
            http_response_code(401);
            sendJson(false, null, 'Unauthorized Access: Invalid or missing API Key');
        }
    } else {
        // Human/web endpoints require a valid user session
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            sendJson(false, null, 'Unauthorized Access: Please log in');
        }

        $currentUser = $_SESSION['user'];
        $role = $currentUser['role'] ?? 'guest';
        $canManage = in_array(strtolower($role), ['admin', 'creator', 'manager', 'supervisor', 'engineer']);
    }

    switch ($action) {
        // ----------------------------------------------------
        // GET DASHBOARD (Real-time Status, Period Costs, Trends)
        // ----------------------------------------------------
        case 'get_dashboard': {
            $defaultDate = date('Y-m-d');
            $startDate = $_REQUEST['startDate'] ?? $defaultDate;
            $endDate = $_REQUEST['endDate'] ?? $defaultDate;

            // 1. Live Realtime Status from Stored Procedure
            $stmtRT = $pdo->prepare("EXEC dbo.sp_GetUtilityRealtimeStatus");
            $stmtRT->execute();
            $realtimeData = $stmtRT->fetchAll(PDO::FETCH_ASSOC) ?: [];

            // 2. Period Usage & Cost per meter
            $sqlMeterSum = "SELECT m.meter_name, m.utility_type, m.production_line,
                                   SUM(s.consumption) AS period_usage,
                                   SUM(s.calculated_cost) AS period_cost 
                            FROM dbo.UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
                            JOIN dbo.UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
                            WHERE s.log_date BETWEEN :sd AND :ed 
                            GROUP BY m.meter_name, m.utility_type, m.production_line";
            $stmtMS = $pdo->prepare($sqlMeterSum);
            $stmtMS->execute([':sd' => $startDate, ':ed' => $endDate]);
            
            $meterSums = [];
            foreach ($stmtMS->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $meterSums[$row['meter_name']] = $row;
            }

            // 3. Hourly / Daily Trend Breakdown
            $isSingleDay = ($startDate === $endDate);

            if ($isSingleDay) {
                // Hourly breakdown (0-23 hr)
                $sqlElec = "SELECT s.log_hour AS label_key,
                                   SUM(CASE WHEN s.log_hour BETWEEN 9 AND 21 THEN s.consumption ELSE 0 END) AS peak_kwh,
                                   SUM(CASE WHEN s.log_hour NOT BETWEEN 9 AND 21 THEN s.consumption ELSE 0 END) AS offpeak_kwh,
                                   SUM(s.consumption) AS val_usage,
                                   SUM(CASE WHEN s.log_hour BETWEEN 9 AND 21 THEN s.calculated_cost ELSE 0 END) AS peak_cost,
                                   SUM(CASE WHEN s.log_hour NOT BETWEEN 9 AND 21 THEN s.calculated_cost ELSE 0 END) AS offpeak_cost,
                                   SUM(s.calculated_cost) AS val_cost
                            FROM dbo.UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
                            JOIN dbo.UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
                            WHERE s.log_date = :sd AND m.utility_type = 'ELECTRIC' AND m.meter_name != 'MDB'
                            GROUP BY s.log_hour ORDER BY s.log_hour";
                $stmtElec = $pdo->prepare($sqlElec);
                $stmtElec->execute([':sd' => $startDate]);

                $sqlLpg = "SELECT s.log_hour AS label_key,
                                  SUM(s.consumption) AS val_usage,
                                  SUM(s.calculated_cost) AS val_cost
                           FROM dbo.UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
                           JOIN dbo.UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
                           WHERE s.log_date = :sd AND m.utility_type = 'LPG'
                           GROUP BY s.log_hour ORDER BY s.log_hour";
                $stmtLpg = $pdo->prepare($sqlLpg);
                $stmtLpg->execute([':sd' => $startDate]);
            } else {
                // Daily breakdown across date range
                $sqlElec = "SELECT CONVERT(VARCHAR, s.log_date, 23) AS label_key,
                                   SUM(CASE WHEN s.log_hour BETWEEN 9 AND 21 THEN s.consumption ELSE 0 END) AS peak_kwh,
                                   SUM(CASE WHEN s.log_hour NOT BETWEEN 9 AND 21 THEN s.consumption ELSE 0 END) AS offpeak_kwh,
                                   SUM(s.consumption) AS val_usage,
                                   SUM(CASE WHEN s.log_hour BETWEEN 9 AND 21 THEN s.calculated_cost ELSE 0 END) AS peak_cost,
                                   SUM(CASE WHEN s.log_hour NOT BETWEEN 9 AND 21 THEN s.calculated_cost ELSE 0 END) AS offpeak_cost,
                                   SUM(s.calculated_cost) AS val_cost
                            FROM dbo.UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
                            JOIN dbo.UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
                            WHERE s.log_date BETWEEN :sd AND :ed AND m.utility_type = 'ELECTRIC' AND m.meter_name != 'MDB'
                            GROUP BY s.log_date ORDER BY s.log_date";
                $stmtElec = $pdo->prepare($sqlElec);
                $stmtElec->execute([':sd' => $startDate, ':ed' => $endDate]);

                $sqlLpg = "SELECT CONVERT(VARCHAR, s.log_date, 23) AS label_key,
                                  SUM(s.consumption) AS val_usage,
                                  SUM(s.calculated_cost) AS val_cost
                           FROM dbo.UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
                           JOIN dbo.UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
                           WHERE s.log_date BETWEEN :sd AND :ed AND m.utility_type = 'LPG'
                           GROUP BY s.log_date ORDER BY s.log_date";
                $stmtLpg = $pdo->prepare($sqlLpg);
                $stmtLpg->execute([':sd' => $startDate, ':ed' => $endDate]);
            }

            $trendElec = $stmtElec->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $trendLpg  = $stmtLpg->fetchAll(PDO::FETCH_ASSOC) ?: [];

            // 4. Combine Hourly Metrics into unified chart data
            $combinedTrend = [];
            $trendMap = [];

            foreach ($trendElec as $row) {
                $key = $row['label_key'];
                $trendMap[$key] = [
                    'label' => $isSingleDay ? sprintf('%02d:00', $key) : $key,
                    'key' => $key,
                    'elec_usage' => floatval($row['val_usage'] ?? 0),
                    'elec_cost' => floatval($row['val_cost'] ?? 0),
                    'peak_kwh' => floatval($row['peak_kwh'] ?? 0),
                    'offpeak_kwh' => floatval($row['offpeak_kwh'] ?? 0),
                    'peak_cost' => floatval($row['peak_cost'] ?? 0),
                    'offpeak_cost' => floatval($row['offpeak_cost'] ?? 0),
                    'lpg_usage' => 0,
                    'lpg_cost' => 0,
                    'total_cost' => floatval($row['val_cost'] ?? 0)
                ];
            }

            foreach ($trendLpg as $row) {
                $key = $row['label_key'];
                if (!isset($trendMap[$key])) {
                    $trendMap[$key] = [
                        'label' => $isSingleDay ? sprintf('%02d:00', $key) : $key,
                        'key' => $key,
                        'elec_usage' => 0,
                        'elec_cost' => 0,
                        'peak_kwh' => 0,
                        'offpeak_kwh' => 0,
                        'peak_cost' => 0,
                        'offpeak_cost' => 0,
                        'lpg_usage' => floatval($row['val_usage'] ?? 0),
                        'lpg_cost' => floatval($row['val_cost'] ?? 0),
                        'total_cost' => floatval($row['val_cost'] ?? 0)
                    ];
                } else {
                    $trendMap[$key]['lpg_usage'] = floatval($row['val_usage'] ?? 0);
                    $trendMap[$key]['lpg_cost'] = floatval($row['val_cost'] ?? 0);
                    $trendMap[$key]['total_cost'] += floatval($row['val_cost'] ?? 0);
                }
            }

            ksort($trendMap);
            $combinedTrend = array_values($trendMap);

            // 5. Aggregate KPI Summary
            $summary = [
                'total_kw' => 0,
                'period_kwh' => 0,
                'period_elec_cost' => 0,
                'peak_elec_cost' => 0,
                'offpeak_elec_cost' => 0,
                'total_lpg_flow' => 0,
                'period_lpg_usage' => 0,
                'period_lpg_cost' => 0,
                'total_utility_cost' => 0,
                'avg_pf' => 0,
                'pf_count' => 0,
                'online_meters' => 0,
                'total_meters' => count($realtimeData),
                'last_update' => date('Y-m-d H:i:s')
            ];

            $meters = [];
            foreach ($realtimeData as $row) {
                $mName = $row['meter_name'];
                $row['period_usage'] = floatval($meterSums[$mName]['period_usage'] ?? 0);
                $row['period_cost']  = floatval($meterSums[$mName]['period_cost'] ?? 0);
                $meters[] = $row;

                if (($row['status'] ?? '') === 'ONLINE') {
                    $summary['online_meters']++;
                }

                if ($row['utility_type'] === 'ELECTRIC') {
                    if ($mName !== 'MDB') {
                        $summary['total_kw'] += floatval($row['power_kw'] ?? 0);
                        $summary['period_kwh'] += floatval($row['period_usage']);
                        $summary['period_elec_cost'] += floatval($row['period_cost']);
                    }
                    if (floatval($row['power_factor'] ?? 0) > 0) {
                        $summary['avg_pf'] += floatval($row['power_factor']);
                        $summary['pf_count']++;
                    }
                } elseif ($row['utility_type'] === 'LPG') {
                    $summary['total_lpg_flow'] += floatval($row['flow_rate'] ?? 0);
                    $summary['period_lpg_usage'] += floatval($row['period_usage']);
                    $summary['period_lpg_cost'] += floatval($row['period_cost']);
                }
            }

            if ($summary['pf_count'] > 0) {
                $summary['avg_pf'] = round($summary['avg_pf'] / $summary['pf_count'], 2);
            }
            $summary['total_utility_cost'] = $summary['period_elec_cost'] + $summary['period_lpg_cost'];

            // Sum Peak vs Off-Peak
            foreach ($combinedTrend as $t) {
                $summary['peak_elec_cost'] += $t['peak_cost'];
                $summary['offpeak_elec_cost'] += $t['offpeak_cost'];
            }

            sendJson(true, [
                'summary' => $summary,
                'meters' => $meters,
                'trends' => $combinedTrend,
                'is_range' => !$isSingleDay,
                'date_range' => ['startDate' => $startDate, 'endDate' => $endDate]
            ], 'Utility dashboard data loaded successfully');
            break;
        }

        // ----------------------------------------------------
        // GET TOU RATES
        // ----------------------------------------------------
        case 'get_tou_rates': {
            $stmt = $pdo->query("SELECT rate_id, utility_type, day_type, 
                                        CONVERT(VARCHAR(5), start_time, 108) AS start_time,
                                        CONVERT(VARCHAR(5), end_time, 108) AS end_time,
                                        rate_price
                                 FROM dbo.UTILITY_RATES_TOU 
                                 ORDER BY utility_type, day_type, start_time");
            $rates = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            sendJson(true, $rates, 'TOU rates loaded');
            break;
        }

        // ----------------------------------------------------
        // SAVE TOU RATES (With CSRF & Permission Guard)
        // ----------------------------------------------------
        case 'save_tou_rates': {
            if (!$canManage) {
                sendJson(false, null, 'Access Denied: Requires management privileges');
            }

            $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_REQUEST['csrf_token'] ?? '';
            if (empty($_SESSION['csrf_token']) || $clientToken !== $_SESSION['csrf_token']) {
                sendJson(false, null, 'CSRF token mismatch. Please refresh.');
            }

            $rates = $_POST['rates'] ?? [];
            if (!is_array($rates) || empty($rates)) {
                sendJson(false, null, 'No rate data provided.');
            }

            $pdo->beginTransaction();
            try {
                $pdo->exec("DELETE FROM dbo.UTILITY_RATES_TOU");
                $stmt = $pdo->prepare("INSERT INTO dbo.UTILITY_RATES_TOU 
                                        (utility_type, day_type, start_time, end_time, rate_price) 
                                       VALUES (:ut, :dt, :st, :et, :rp)");

                foreach ($rates as $r) {
                    $stmt->execute([
                        ':ut' => $r['utility_type'] ?? 'ELECTRIC',
                        ':dt' => $r['day_type'] ?? 'NORMAL',
                        ':st' => $r['start_time'] ?? '00:00',
                        ':et' => $r['end_time'] ?? '23:59',
                        ':rp' => floatval($r['rate_price'] ?? 0)
                    ]);
                }

                $pdo->commit();

                // Recalculate today's cost using the updated tariff
                $today = date('Y-m-d');
                $pdo->exec("EXEC dbo.sp_AggregateUtilityHourly @TargetDate = '$today'");

                sendJson(true, null, 'อัปเดตอัตราค่าไฟฟ้าและคำนวณยอดวันนี้ใหม่เรียบร้อยแล้ว');
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                sendJson(false, null, 'Database Error: ' . $e->getMessage());
            }
            break;
        }

        // ----------------------------------------------------
        // RECALCULATE TARGET DATE
        // ----------------------------------------------------
        case 'recalculate': {
            if (!$canManage) {
                sendJson(false, null, 'Access Denied: Requires management privileges');
            }

            $targetDate = $_REQUEST['date'] ?? date('Y-m-d');
            $stmt = $pdo->prepare("EXEC dbo.sp_AggregateUtilityHourly @TargetDate = :dt");
            $stmt->execute([':dt' => $targetDate]);
            sendJson(true, null, "คำนวณยอด Utility สำหรับวันที่ {$targetDate} เรียบร้อยแล้ว");
            break;
        }

        // ----------------------------------------------------
        // [NODE-RED IoT] INSERT UTILITY LOG BATCH
        // ----------------------------------------------------
        case 'insert_log': {
            $meterName = $_REQUEST['meter_name'] ?? null;
            $utilityType = $_REQUEST['utility_type'] ?? null;
            $dataBatch = $_REQUEST['data_batch'] ?? null;

            if (!$meterName || !$utilityType || !is_array($dataBatch)) {
                sendJson(false, null, 'Invalid payload: meter_name, utility_type, and data_batch are required.');
            }

            $sql = "EXEC dbo.sp_InsertUtilityLog 
                        @MeterName = :mName, @UtilityType = :uType, @LogTimestamp = :lTime, 
                        @Voltage = :v, @CurrentAmp = :c, @PowerKw = :p, 
                        @ReactivePower = :rp, @ApparentPower = :ap, @PowerFactor = :pf, 
                        @Velocity = :vel, @FlowRate = :fr, @CumulativeValue = :cum,
                        @VoltA = :va, @VoltB = :vb, @VoltC = :vc,
                        @AmpA = :aa, @AmpB = :ab, @AmpC = :ac,
                        @KwA = :kwa, @KwB = :kwb, @KwC = :kwc";
            $stmt = $pdo->prepare($sql);

            $insertedCount = 0;
            foreach ($dataBatch as $data) {
                $logTimeStr = $data['thai_time'] ?? date('Y-m-d H:i:s');
                $logTimeStr = str_replace(['T', 'Z'], [' ', ''], $logTimeStr);

                if ($utilityType === 'ELECTRIC') {
                    $dt = new DateTime($logTimeStr);
                    $logTimeStr = $dt->format('Y-m-d H:i:s');
                }

                $stmt->execute([
                    ':mName' => $meterName,
                    ':uType' => $utilityType,
                    ':lTime' => $logTimeStr,
                    ':v'     => $data['voltage'] ?? null,
                    ':c'     => $data['current'] ?? null, 
                    ':p'     => $data['power'] ?? null,
                    ':rp'    => $data['reactive_power'] ?? null, 
                    ':ap'    => $data['apparent_power'] ?? null,
                    ':pf'    => $data['power_factor'] ?? null,
                    ':vel'   => $data['velocity'] ?? null,
                    ':fr'    => $data['flow'] ?? null, 
                    ':cum'   => $data['cumulative'] ?? 0,
                    ':va'    => $data['volt_a'] ?? null,
                    ':vb'    => $data['volt_b'] ?? null,
                    ':vc'    => $data['volt_c'] ?? null,
                    ':aa'    => $data['amp_a'] ?? null,
                    ':ab'    => $data['amp_b'] ?? null,
                    ':ac'    => $data['amp_c'] ?? null,
                    ':kwa'   => $data['kw_a'] ?? null,
                    ':kwb'   => $data['kw_b'] ?? null,
                    ':kwc'   => $data['kw_c'] ?? null
                ]);
                $insertedCount++;
            }
            sendJson(true, ['inserted_count' => $insertedCount], "บันทึกข้อมูล IoT สำเร็จ ({$insertedCount} รายการ)");
            break;
        }

        // ----------------------------------------------------
        // [CRON JOB / NODE-RED] AGGREGATE SUMMARY
        // ----------------------------------------------------
        case 'aggregate_summary': {
            $today_prod = date('Y-m-d', strtotime('-8 hours'));
            $yesterday_prod = date('Y-m-d', strtotime('-32 hours'));

            $stmtToday = $pdo->prepare("EXEC dbo.sp_AggregateUtilityHourly @TargetDate = :dt1");
            $stmtToday->execute([':dt1' => $today_prod]);

            $stmtYest = $pdo->prepare("EXEC dbo.sp_AggregateUtilityHourly @TargetDate = :dt2");
            $stmtYest->execute([':dt2' => $yesterday_prod]);

            sendJson(true, [
                'target_dates' => [$today_prod, $yesterday_prod]
            ], "Aggregation completed successfully via trigger.");
            break;
        }

        default:
            sendJson(false, null, 'Invalid or unrecognized API action');
            break;
    }

} catch (Throwable $e) {
    sendJson(false, null, 'Server Error: ' . $e->getMessage());
}
