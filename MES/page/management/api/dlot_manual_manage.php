<?php
// แก้ไข Path ให้ตรงกับโครงสร้างจริง
include_once("../../../auth/check_auth.php"); // MES/auth/check_auth.php
include_once("../../db.php");               // MES/page/db.php
include_once("../../../config/config.php");   // MES/config/config.php

header('Content-Type: application/json');

if (!hasRole(['admin', 'creator', 'planner'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true) ?? [];

$table = MANUAL_COSTS_TABLE; 

try {
    switch ($action) {
        case 'get_daily_costs':
            $date = $data['entry_date'] ?? $_POST['entry_date'] ?? null;
            $line = $data['line'] ?? $_POST['line'] ?? 'ALL';
            
            $sql = "SELECT * FROM $table WHERE entry_date = :date AND line = :line";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':date' => $date, ':line' => $line]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result = ['headcount' => 0, 'dl_cost' => 0, 'ot_cost' => 0];
            foreach ($rows as $row) {
                if ($row['cost_type'] == 'HEAD_COUNT') $result['headcount'] = $row['cost_value'];
                if ($row['cost_type'] == 'DIRECT_LABOR') $result['dl_cost'] = $row['cost_value'];
                if ($row['cost_type'] == 'OVERTIME') $result['ot_cost'] = $row['cost_value'];
            }
            
            echo json_encode(['success' => true, 'data' => $result]);
            break;

        case 'save_daily_costs':
            if ($method !== 'POST') throw new Exception("Invalid method");
            
            $date = $data['entry_date'];
            $line = $data['line'];
            $user = $_SESSION['user']['username'] ?? 'System';
            
            $costs = [
                'HEAD_COUNT' => $data['headcount'],
                'DIRECT_LABOR' => $data['dl_cost'],
                'OVERTIME' => $data['ot_cost']
            ];
            
            $sql = "
                MERGE INTO $table AS T
                USING (VALUES (:date, :line, :cat, :type, :val, :unit, :user)) AS S (entry_date, line, cost_category, cost_type, cost_value, unit, user_update)
                ON (T.entry_date = S.entry_date AND T.line = S.line AND T.cost_type = S.cost_type)
                WHEN MATCHED THEN
                    UPDATE SET cost_value = S.cost_value, updated_by = S.user_update, updated_at = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (entry_date, line, cost_category, cost_type, cost_value, unit, updated_by)
                    VALUES (S.entry_date, S.line, S.cost_category, S.cost_type, S.cost_value, S.unit, S.user_update);
            ";
            $stmt = $pdo->prepare($sql);
            
            foreach ($costs as $type => $val) {
                $stmt->execute([
                    ':date' => $date, 
                    ':line' => $line, 
                    ':cat' => 'LABOR',
                    ':type' => $type,
                    ':val' => $val,
                    ':unit' => ($type == 'HEAD_COUNT' ? 'Person' : 'THB'),
                    ':user' => $user
                ]);
            }
            
            echo json_encode(['success' => true, 'message' => 'Saved successfully']);
            break;

        case 'get_dlot_dates':
            $start = $_GET['startDate'];
            $end = $_GET['endDate'];
            $line = $_GET['line'] ?? 'ALL';
            
            $sql = "SELECT DISTINCT entry_date FROM $table WHERE (entry_date BETWEEN :start AND :end) AND line = :line";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':start' => $start, ':end' => $end, ':line' => $line]);
            $dates = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            echo json_encode(['success' => true, 'data' => $dates]);
            break;

        case 'calc_dlot_auto':
            $entry_date = $data['entry_date'];
            $line = isset($data['line']) ? $data['line'] : 'ALL';

            if (empty($entry_date)) throw new Exception("Entry date is required.");

            $dayOfWeek = date('w', strtotime($entry_date));
            $isSunday = ($dayOfWeek == 0);
            $isHoliday = false; 

            // [FIX] แก้ไข SQL Parameter ไม่ให้ชื่อซ้ำกัน (:line1, :line2)
            $sql = "
                SELECT 
                    l.emp_id, 
                    l.scan_in_time, 
                    l.scan_out_time,
                    e.position,
                    e.default_shift_id,
                    s.start_time AS shift_start,
                    s.end_time AS shift_end,
                    s.shift_name
                FROM " . MANPOWER_DAILY_LOGS_TABLE . " l
                JOIN " . MANPOWER_EMPLOYEES_TABLE . " e ON l.emp_id = e.emp_id
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " s ON e.default_shift_id = s.shift_id
                WHERE l.log_date = :log_date
                  AND l.status IN ('PRESENT', 'LATE')
                  AND (:line1 = 'ALL' OR e.line = :line2) -- เปลี่ยนชื่อตัวแปรตรงนี้
            ";

            $stmt = $pdo->prepare($sql);
            // [FIX] ส่งค่าเข้าไป 2 ครั้ง ให้ครบตามจำนวน Parameter
            $stmt->execute([
                ':log_date' => $entry_date, 
                ':line1' => $line, 
                ':line2' => $line 
            ]);
            
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // ... (ส่วน Logic การคำนวณด้านล่างเหมือนเดิม ไม่ต้องแก้) ...
            
            $totalHeadcount = 0;
            $totalDLCost = 0;
            $totalOTCost = 0;
            $totalOTHours = 0;

            foreach ($logs as $emp) {
                // ... (Logic เดิม) ...
                $totalHeadcount++;
                
                $dailyWage = 0;
                $isMonthly = false;
                $hasOT = true;
                $pos = strtolower($emp['position'] ?? '');

                if (strpos($pos, 'mini md') !== false && strpos($pos, 'acting') === false) {
                    $dailyWage = 80000 / 30; $isMonthly = true; $hasOT = false;
                } elseif (strpos($pos, 'acting mini md') !== false) {
                    $dailyWage = 40000 / 30; $isMonthly = true;
                } elseif (strpos($pos, 'supervisor') !== false || strpos($pos, 'head') !== false) {
                    $dailyWage = 30000 / 30; $isMonthly = true;
                } elseif (strpos($pos, 'staff') !== false || strpos($pos, 'permanent') !== false || strpos($pos, 'scholarship') !== false) {
                    $dailyWage = 20000 / 30; $isMonthly = true;
                } else {
                    $dailyWage = 400; 
                }

                $hourlyRate = $dailyWage / 8;

                if ($isMonthly) {
                    $totalDLCost += $dailyWage;
                } else {
                    if ($isHoliday) $totalDLCost += ($dailyWage * 3);
                    elseif ($isSunday) $totalDLCost += ($dailyWage * 2);
                    else $totalDLCost += $dailyWage;
                }

                if ($hasOT && !empty($emp['scan_out_time']) && !empty($emp['shift_end'])) {
                    $shiftEndDateTime = new DateTime($entry_date . ' ' . $emp['shift_end']);
                    if ($emp['shift_name'] == 'NIGHT') $shiftEndDateTime->modify('+1 day');
                    
                    $scanOutDateTime = new DateTime($emp['scan_out_time']);
                    $otStartDateTime = clone $shiftEndDateTime;
                    $otStartDateTime->modify('+30 minutes'); 

                    if ($scanOutDateTime > $otStartDateTime) {
                        $otMinutes = ($scanOutDateTime->getTimestamp() - $otStartDateTime->getTimestamp()) / 60;
                        
                        if ($otMinutes >= 60) {
                            $otHours = $otMinutes / 60;
                            $multiplier = 1.5;

                            if ($isHoliday) $multiplier = 5;
                            elseif ($isSunday) $multiplier = 3;
                            
                            if ($otHours > 6 && !$isHoliday && !$isSunday) {
                                $otNormal = 6 * $hourlyRate * 1.5;
                                $otExtra = ($otHours - 6) * $hourlyRate * 3;
                                $totalOTCost += ($otNormal + $otExtra);
                            } else {
                                $totalOTCost += ($otHours * $hourlyRate * $multiplier);
                            }
                            $totalOTHours += $otHours;
                        }
                    }
                }
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'headcount' => $totalHeadcount,
                    'dl_cost' => round($totalDLCost, 2),
                    'ot_cost' => round($totalOTCost, 2),
                    'ot_hours' => round($totalOTHours, 1)
                ]
            ]);
            break;
        case 'get_dlot_summary_range':
            // รับค่า Filter
            $startDate = $_GET['startDate'] ?? date('Y-m-d');
            $endDate = $_GET['endDate'] ?? date('Y-m-d');
            $line = $_GET['line'] ?? 'ALL';

            // [FIX] แก้ SQL ให้รองรับตารางแบบ Vertical (ใช้ CASE WHEN)
            $sql = "
                SELECT 
                    ISNULL(SUM(CASE WHEN cost_type = 'DIRECT_LABOR' THEN cost_value ELSE 0 END), 0) as total_dl,
                    ISNULL(SUM(CASE WHEN cost_type = 'OVERTIME' THEN cost_value ELSE 0 END), 0) as total_ot,
                    ISNULL(SUM(CASE WHEN cost_type IN ('DIRECT_LABOR', 'OVERTIME') THEN cost_value ELSE 0 END), 0) as total_labor
                FROM $table 
                WHERE (entry_date BETWEEN :startDate AND :endDate)
            ";

            $params = [':startDate' => $startDate, ':endDate' => $endDate];

            if ($line !== 'ALL' && $line !== '') {
                $sql .= " AND line = :line"; 
                $params[':line'] = $line;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $result]);
            break;

        default:
            throw new Exception("Invalid action");
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>