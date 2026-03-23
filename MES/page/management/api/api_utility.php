<?php
define('ALLOW_GUEST_ACCESS', true); 
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

header('Content-Type: application/json; charset=utf-8');

function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $message, "data" => null]);
    exit;
}

function sendSuccess($data, $message = "Success") {
    echo json_encode(["success" => true, "message" => $message, "data" => $data]);
    exit;
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true) ?: [];
    $action = $_GET['action'] ?? $input['action'] ?? '';

    switch ($action) {
        
        case 'get_dashboard':
            if (!isset($_SESSION['user']) || !hasPermission('view_dashboard')) {
                sendError("Access Denied: Dashboard permission required.", 403);
            }

            $defaultDate = date('Y-m-d', strtotime('-8 hours'));
            $startDate = $_GET['startDate'] ?? $defaultDate;
            $endDate = $_GET['endDate'] ?? $defaultDate;
            $stmtRT = $pdo->prepare("EXEC dbo.sp_GetUtilityRealtimeStatus");
            $stmtRT->execute();
            $realtimeData = $stmtRT->fetchAll(PDO::FETCH_ASSOC);
            $sqlMeterSum = "SELECT m.meter_name, SUM(s.consumption) as period_usage, SUM(s.calculated_cost) as period_cost 
                            FROM dbo.UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
                            JOIN dbo.UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
                            WHERE s.log_date BETWEEN :sd AND :ed 
                            GROUP BY m.meter_name";
            $stmtMS = $pdo->prepare($sqlMeterSum);
            $stmtMS->execute([':sd' => $startDate, ':ed' => $endDate]);
            
            $meterSums = [];
            foreach ($stmtMS->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $meterSums[$row['meter_name']] = $row;
            }

            if ($startDate === $endDate) {
                $sqlTrend = "SELECT log_hour AS label_key, SUM(consumption) as val_usage, SUM(calculated_cost) as val_cost 
                             FROM dbo.UTILITY_HOURLY_SUMMARY WITH (NOLOCK)
                             WHERE log_date = :sd AND meter_id IN (SELECT meter_id FROM dbo.UTILITY_METERS WHERE utility_type = 'ELECTRIC' AND meter_name != 'MDB')
                             GROUP BY log_hour ORDER BY log_hour";
                $stmtHE = $pdo->prepare($sqlTrend);
                $stmtHE->execute([':sd' => $startDate]);
            } else {
                $sqlTrend = "SELECT CONVERT(VARCHAR, log_date, 23) AS label_key, SUM(consumption) as val_usage, SUM(calculated_cost) as val_cost 
                             FROM dbo.UTILITY_HOURLY_SUMMARY WITH (NOLOCK)
                             WHERE log_date BETWEEN :sd AND :ed AND meter_id IN (SELECT meter_id FROM dbo.UTILITY_METERS WHERE utility_type = 'ELECTRIC' AND meter_name != 'MDB')
                             GROUP BY log_date ORDER BY log_date";
                $stmtHE = $pdo->prepare($sqlTrend);
                $stmtHE->execute([':sd' => $startDate, ':ed' => $endDate]);
            }
            $trendData = $stmtHE->fetchAll(PDO::FETCH_ASSOC);
            $summary = ['total_kw' => 0, 'period_kwh' => 0, 'period_elec_cost' => 0, 'total_lpg_flow' => 0, 'period_lpg_usage' => 0, 'period_lpg_cost' => 0, 'avg_pf' => 0, 'pf_count' => 0, 'online_meters' => 0, 'total_meters' => count($realtimeData)];
            $meters = [];
            foreach ($realtimeData as $row) {
                $mName = $row['meter_name'];
                $row['period_usage'] = $meterSums[$mName]['period_usage'] ?? 0;
                $row['period_cost'] = $meterSums[$mName]['period_cost'] ?? 0;
                $meters[] = $row;
                if ($row['status'] === 'ONLINE') $summary['online_meters']++;
                if ($row['utility_type'] === 'ELECTRIC') {
                    if ($mName !== 'MDB') {
                        $summary['total_kw'] += floatval($row['power_kw']);
                        $summary['period_kwh'] += floatval($row['period_usage']);
                        $summary['period_elec_cost'] += floatval($row['period_cost']);
                    }
                    if (floatval($row['power_factor']) > 0) { $summary['avg_pf'] += floatval($row['power_factor']); $summary['pf_count']++; }
                } elseif ($row['utility_type'] === 'LPG') {
                    $summary['total_lpg_flow'] += floatval($row['flow_rate']);
                    $summary['period_lpg_usage'] += floatval($row['period_usage']);
                    $summary['period_lpg_cost'] += floatval($row['period_cost']);
                }
            }
            if ($summary['pf_count'] > 0) $summary['avg_pf'] = $summary['avg_pf'] / $summary['pf_count'];

            sendSuccess(['summary' => $summary, 'meters' => $meters, 'trend' => $trendData, 'is_range' => ($startDate !== $endDate)]);
            break;

        case 'get_tou_rates':
            if (!isset($_SESSION['user']) || !hasPermission('manage_settings')) {
                sendError("Access Denied: Settings permission required.", 403);
            }
            $stmt = $pdo->query("SELECT * FROM dbo.UTILITY_RATES_TOU ORDER BY utility_type, day_type, start_time");
            sendSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_tou_rates':
            if (!isset($_SESSION['user']) || !hasPermission('manage_settings')) {
                sendError("Access Denied: Settings permission required.", 403);
            }
            if ($method !== 'POST') sendError('Method Not Allowed', 405);
            
            $rates = $input['rates'] ?? [];
            if (empty($rates)) sendError('No rates provided.');

            try {
                $pdo->beginTransaction();
                
                // 1. [แก้ไข] เปลี่ยน TRUNCATE เป็น DELETE FROM (ใช้สิทธิ์แค่ลบข้อมูลธรรมดา ไม่ติด Permission)
                $pdo->exec("DELETE FROM dbo.UTILITY_RATES_TOU");
                
                // 2. เตรียมคำสั่ง Insert ของใหม่
                $stmt = $pdo->prepare("INSERT INTO dbo.UTILITY_RATES_TOU (utility_type, day_type, start_time, end_time, rate_price) VALUES (:ut, :dt, :st, :et, :rp)");
                
                foreach ($rates as $r) {
                    $stmt->execute([
                        ':ut' => $r['utility_type'],
                        ':dt' => $r['day_type'],
                        ':st' => $r['start_time'],
                        ':et' => $r['end_time'],
                        ':rp' => floatval($r['rate_price'])
                    ]);
                }
                
                $pdo->commit();
                
                // 3. สั่งคำนวณของวันนี้ใหม่ทันที
                $today = date('Y-m-d');
                $pdo->exec("EXEC dbo.sp_AggregateUtilityHourly @TargetDate = '$today'");
                
                sendSuccess([], "All TOU rates updated and today's cost recalculated.");
            } catch (Exception $e) {
                // 4. เช็คก่อน Rollback ป้องกัน Error ซ้อน
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                error_log("Save TOU Error: " . $e->getMessage());
                
                // 5. [แก้ไข] ชั่วคราว: โยน Error ของ Database กลับไปให้หน้าเว็บโชว์ จะได้รู้ว่าพังที่บรรทัดไหน
                sendError("DB Error: " . $e->getMessage(), 500);
            }
            break;

        case 'insert_log':
            // (คงโค้ด Insert เดิมไว้ ที่แก้ Timezone -7 แล้ว)
            $headers = getallheaders();
            $apiKey = $headers['X-API-KEY'] ?? $headers['X-Api-Key'] ?? '';
            if ($apiKey !== 'MESKey2026') sendError('Unauthorized API Key', 401);
            if ($method !== 'POST') sendError('Method Not Allowed', 405);

            $meterName = $input['meter_name'] ?? null;
            $utilityType = $input['utility_type'] ?? null;
            $dataBatch = $input['data_batch'] ?? null;

            if (!$meterName || !$utilityType || !is_array($dataBatch)) sendError("Invalid payload.");

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
                $logTimeStr  = $data['thai_time'] ?? date('Y-m-d H:i:s');
                $logTimeStr  = str_replace(['T', 'Z'], [' ', ''], $logTimeStr);

                if ($utilityType === 'ELECTRIC') {
                    $dt = new DateTime($logTimeStr);
                    $dt->modify('0 hours');
                    $logTimeStr = $dt->format('Y-m-d H:i:s');
                }

                $stmt->execute([
                    ':mName' => $meterName, ':uType' => $utilityType, ':lTime' => $logTimeStr,
                    ':v' => $data['voltage'] ?? null, ':c' => $data['current'] ?? null, 
                    ':p' => $data['power'] ?? null, ':rp' => $data['reactive_power'] ?? null, 
                    ':ap' => $data['apparent_power'] ?? null, ':pf' => $data['power_factor'] ?? null,
                    ':vel' => $data['velocity'] ?? null, ':fr' => $data['flow'] ?? null, 
                    ':cum' => $data['cumulative'] ?? 0,
                    ':va' => $data['volt_a'] ?? null, ':vb' => $data['volt_b'] ?? null, ':vc' => $data['volt_c'] ?? null,
                    ':aa' => $data['amp_a'] ?? null, ':ab' => $data['amp_b'] ?? null, ':ac' => $data['amp_c'] ?? null,
                    ':kwa' => $data['kw_a'] ?? null, ':kwb' => $data['kw_b'] ?? null, ':kwc' => $data['kw_c'] ?? null
                ]);
                $insertedCount++;
            }
            sendSuccess(['inserted_count' => $insertedCount]);
            break;

        // ----------------------------------------------------
        // [CRON JOB] สั่งคำนวณและอัปเดตตาราง Summary
        // ----------------------------------------------------
        case 'aggregate_summary':
            $headers = getallheaders();
            $apiKey = $headers['X-API-KEY'] ?? $headers['X-Api-Key'] ?? '';
            if ($apiKey !== 'MESKey2026') sendError('Unauthorized API Key', 401);

            try {
                // ถอย 8 ชั่วโมง เพื่อหาวันที่ผลิต (Production Date)
                $today_prod = date('Y-m-d', strtotime('-8 hours'));
                $yesterday_prod = date('Y-m-d', strtotime('-32 hours'));

                $pdo->exec("EXEC dbo.sp_AggregateUtilityHourly @TargetDate = '$today_prod'");
                $pdo->exec("EXEC dbo.sp_AggregateUtilityHourly @TargetDate = '$yesterday_prod'");
                
                sendSuccess([], "Aggregation completed successfully via Node-RED trigger.");
            } catch (Exception $e) {
                error_log("Aggregate Error: " . $e->getMessage());
                // [แก้ไข] เปลี่ยนมาส่งข้อความ Error จริงของฐานข้อมูลกลับไป
                sendError("DB Error: " . $e->getMessage(), 500);
            }
            break;

        default:
            sendError("Invalid action", 400);
            break;
    }

} catch (Throwable $e) { // [แก้ไข] เปลี่ยน Exception เป็น Throwable เพื่อดักจับ Error ทุกประเภทใน PHP
    error_log("Utility API Error: " . $e->getMessage());
    // [แก้ไข] เอาข้อความ Error จริงส่งกลับไปที่หน้าเว็บด้วย จะได้แก้ปัญหาได้ทันที
    sendError("System Error: " . $e->getMessage(), 500);
}

/*} catch (Exception $e) {
    error_log("Utility API Error: " . $e->getMessage());
    sendError("System Error. Please try again.", 500);
}*/ // [แก้ไข] ปิด try-catch ใหญ่ไว้ก่อน เพื่อให้เห็น Error จริงของ Database ที่อาจเกิดขึ้นในแต่ละบล็อกได้ชัดเจนขึ้น
?>