<?php
// MES/page/management/api/dlot_manual_manage.php
include_once("../../../auth/check_auth.php");
include_once("../../db.php");
include_once("../../../config/config.php");

header('Content-Type: application/json');

// อนุญาตเฉพาะ Admin, Creator, Planner
if (!hasRole(['admin', 'creator', 'planner'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $_POST['action'] ?? $input['action'] ?? '';

// รวม Input จาก GET/POST/JSON ให้เรียกใช้ง่ายๆ
$data = array_merge($_GET, $_POST, $input);

$table = MANUAL_COSTS_TABLE; 

try {
    switch ($action) {
        
        // ==================================================================================
        // ACTION 1: AUTO SYNC BATCH (พระเอกใหม่ของเรา)
        // คำนวณและบันทึกลง DB อัตโนมัติ ตามช่วงวันที่ที่กำหนด
        // ==================================================================================
        case 'sync_dlot_batch':
            $startDate = $data['startDate'] ?? date('Y-m-d');
            $endDate = $data['endDate'] ?? date('Y-m-d');
            $user = $_SESSION['user']['username'] ?? 'System';

            $currentDate = strtotime($startDate);
            $endTimestamp = strtotime($endDate);
            
            $pdo->beginTransaction();
            $syncCount = 0;

            try {
                $sqlMerge = "
                    MERGE INTO $table AS T 
                    USING (VALUES (:date, :line, :cat, :type, :val, :unit, :user)) 
                    AS S (entry_date, line, cost_category, cost_type, cost_value, unit, user_update) 
                    ON (T.entry_date = S.entry_date AND T.line = S.line AND T.cost_type = S.cost_type) 
                    WHEN MATCHED THEN 
                        UPDATE SET cost_value = S.cost_value, updated_by = S.user_update, updated_at = GETDATE() 
                    WHEN NOT MATCHED THEN 
                        INSERT (entry_date, line, cost_category, cost_type, cost_value, unit, updated_by) 
                        VALUES (S.entry_date, S.line, S.cost_category, S.cost_type, S.cost_value, S.unit, S.user_update);
                ";
                $stmtSave = $pdo->prepare($sqlMerge);

                // วนลูปทีละวัน
                while ($currentDate <= $endTimestamp) {
                    $processDate = date('Y-m-d', $currentDate);
                    
                    // 1. คำนวณค่าแรงของวันนั้น (แยกตาม Line)
                    $dailyResult = calculateLaborByLine($pdo, $processDate);

                    // 2. บันทึกลง Database
                    foreach ($dailyResult as $lineName => $costs) {
                        // บันทึก Headcount
                        $stmtSave->execute([
                            ':date' => $processDate, ':line' => $lineName, ':cat' => 'LABOR', 
                            ':type' => 'HEAD_COUNT', ':val' => $costs['headcount'], 
                            ':unit' => 'Person', ':user' => $user
                        ]);
                        // บันทึก DL Cost (เงินเดือน/ค่าแรงรายวัน)
                        $stmtSave->execute([
                            ':date' => $processDate, ':line' => $lineName, ':cat' => 'LABOR', 
                            ':type' => 'DIRECT_LABOR', ':val' => $costs['dl_cost'], 
                            ':unit' => 'THB', ':user' => $user
                        ]);
                        // บันทึก OT Cost
                        $stmtSave->execute([
                            ':date' => $processDate, ':line' => $lineName, ':cat' => 'LABOR', 
                            ':type' => 'OVERTIME', ':val' => $costs['ot_cost'], 
                            ':unit' => 'THB', ':user' => $user
                        ]);
                    }
                    
                    $syncCount++;
                    $currentDate = strtotime('+1 day', $currentDate);
                }

                $planTable = PRODUCTION_PLANS_TABLE; 
                $costTable = MANUAL_COSTS_TABLE;

                $updatePlanSql = "
                    UPDATE p
                    SET 
                        p.manpower_num = CAST(ISNULL(hc.cost_value, 0) AS INT),
                        p.total_labor_cost = (ISNULL(dl.cost_value, 0) + ISNULL(ot_cost.cost_value, 0)),
                        p.ot_hours = ISNULL(ot_hrs.cost_value, 0), -- (ถ้ามี OT_HOURS)
                        p.updated_at = GETDATE()
                    FROM $planTable p
                    LEFT JOIN $costTable hc 
                        ON p.plan_date = hc.entry_date 
                        AND p.line = hc.line 
                        AND hc.cost_type = 'HEAD_COUNT'
                    LEFT JOIN $costTable dl 
                        ON p.plan_date = dl.entry_date 
                        AND p.line = dl.line 
                        AND dl.cost_type = 'DIRECT_LABOR'
                    LEFT JOIN $costTable ot_cost 
                        ON p.plan_date = ot_cost.entry_date 
                        AND p.line = ot_cost.line 
                        AND ot_cost.cost_type = 'OVERTIME'
                    LEFT JOIN $costTable ot_hrs 
                        ON p.plan_date = ot_hrs.entry_date 
                        AND p.line = ot_hrs.line 
                        AND ot_hrs.cost_type = 'OT_HOURS'
                    
                    WHERE p.plan_date BETWEEN :start AND :end
                ";

                $stmtUpdatePlan = $pdo->prepare($updatePlanSql);
                $stmtUpdatePlan->execute([':start' => $startDate, ':end' => $endDate]);

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "Synced $syncCount days successfully."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        // ==================================================================================
        // ACTION 2: Get Summary (สำหรับโชว์ยอดรวมในช่วงเวลา - ใช้ใน Dashboard เดิมได้)
        // ==================================================================================
        case 'get_dlot_summary_range':
            $start = $data['startDate'] ?? date('Y-m-d');
            $end = $data['endDate'] ?? date('Y-m-d');
            $line = $data['line'] ?? 'ALL';

            $sql = "
                SELECT 
                    ISNULL(SUM(CASE WHEN cost_type = 'DIRECT_LABOR' THEN cost_value ELSE 0 END), 0) as total_dl,
                    ISNULL(SUM(CASE WHEN cost_type = 'OVERTIME' THEN cost_value ELSE 0 END), 0) as total_ot,
                    ISNULL(SUM(CASE WHEN cost_type IN ('DIRECT_LABOR', 'OVERTIME') THEN cost_value ELSE 0 END), 0) as total_labor
                FROM $table 
                WHERE (entry_date BETWEEN :startDate AND :endDate)
            ";
            $params = [':startDate' => $start, ':endDate' => $end];
            
            if ($line !== 'ALL' && $line !== '') {
                $sql .= " AND line = :line"; 
                $params[':line'] = $line;
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $result]);
            break;

        // ==================================================================================
        // ACTION 3: Get Daily Costs (สำหรับดูรายวัน - เผื่อยังต้องใช้ตรวจสอบ)
        // ==================================================================================
        case 'get_daily_costs':
            $date = $data['entry_date'] ?? null;
            $line = $data['line'] ?? 'ALL';
            
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

        default:
            throw new Exception("Invalid action: $action");
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function calculateLaborByLine($pdo, $date) {
    // 1. Logic วันหยุด
    $dayOfWeek = date('w', strtotime($date));
    $isSunday = ($dayOfWeek == 0);
    $isHoliday = false; 

    // 2. ปรับ SQL: ใช้การเปรียบเทียบเวลาแบบ "Working Day" 
    // โดยดึง Log ที่เกิดขึ้นในช่วงวันที่เลือก (รวมกะดึกที่คาบเกี่ยว)
    $sql = "
        SELECT 
            e.emp_id, e.position, e.line, e.default_shift_id,
            s.shift_name, s.start_time AS shift_start, s.end_time AS shift_end,
            MIN(l.scan_in_time) as scan_in_time, 
            MAX(l.scan_out_time) as scan_out_time,
            l.status
        FROM " . MANPOWER_DAILY_LOGS_TABLE . " l
        JOIN " . MANPOWER_EMPLOYEES_TABLE . " e ON l.emp_id = e.emp_id
        LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " s ON e.default_shift_id = s.shift_id
        WHERE l.log_date = :log_date
          AND l.status IN ('PRESENT', 'LATE')
        GROUP BY 
            e.emp_id, e.position, e.line, e.default_shift_id,
            s.shift_name, s.start_time, s.end_time, l.status
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':log_date' => $date]);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $resultsByLine = [];

    foreach ($logs as $emp) {
        $line = strtoupper(trim($emp['line'] ?? 'UNKNOWN'));
        if (!isset($resultsByLine[$line])) {
            $resultsByLine[$line] = ['headcount' => 0, 'dl_cost' => 0, 'ot_cost' => 0];
        }

        $resultsByLine[$line]['headcount']++;

        // --- 3. กำหนดเรทค่าจ้าง ---
        $pos = trim($emp['position']);
        $dailyWage = 0;
        $isMonthly = false;
        $hasOT = true; 

        if (preg_match('/Mini MD/i', $pos) && stripos($pos, 'Acting') === false) {
            $dailyWage = 80000 / 30; $isMonthly = true; $hasOT = false; 
        } elseif (stripos($pos, 'Acting Mini MD') !== false) {
            $dailyWage = 40000 / 30; $isMonthly = true;
        } elseif (stripos($pos, 'หัวหน้า') !== false || stripos($pos, 'Supervisor') !== false) {
            $dailyWage = 30000 / 30; $isMonthly = true;
        } elseif (stripos($pos, 'นักศึกษาทุน') !== false || trim($pos) === 'พนักงาน' || (stripos($pos, 'พนักงาน') !== false && stripos($pos, 'สัญญาจ้าง') === false)) {
            $dailyWage = 20000 / 30; $isMonthly = true;
        } else {
            $dailyWage = 400; $isMonthly = false;
        }

        $hourlyRate = $dailyWage / 8;

        // --- 4. คำนวณ DL (ค่าแรงพื้นฐาน) ---
        // ไม่ว่าจะมี scan_out หรือยัง ถ้าสถานะคือ PRESENT เราใส่ Daily Wage ให้ทันทีตามคำขอผู้บริหาร
        if ($isHoliday) {
            $resultsByLine[$line]['dl_cost'] += ($dailyWage * 3); 
        } elseif ($isSunday) {
            $resultsByLine[$line]['dl_cost'] += ($isMonthly ? $dailyWage : ($dailyWage * 2)); 
        } else {
            $resultsByLine[$line]['dl_cost'] += $dailyWage; 
        }

        // --- 5. คำนวณ OT (เฉพาะคนที่มี scan_out แล้วเท่านั้น) ---
        if ($hasOT && !empty($emp['scan_out_time']) && !empty($emp['shift_end'])) {
            // Logic การคำนวณ OT เดิมของคุณ (ที่ตัด Ghost Shift และปัดเศษ 0.5)
            // ... (โค้ดส่วนคำนวณ OT เดิมทั้งหมด) ...
            
            // หมายเหตุ: ยอด OT จะถูกบวกเพิ่มเข้าไปเมื่อพนักงานสแกนนิ้วออกจริง
            // ทำให้ระหว่างวัน ยอดจะเป็นแค่ Daily Wage และจะพุ่งขึ้นตอนเย็นหลัง Sync
            $scanOutObj = new DateTime($emp['scan_out_time']);
            $shiftEndStr = $date . ' ' . $emp['shift_end'];
            $shiftEndObj = new DateTime($shiftEndStr);
            if (new DateTime($date . ' ' . $emp['shift_start']) > $shiftEndObj) {
                $shiftEndObj->modify('+1 day');
            }

            $otStartObj = clone $shiftEndObj;
            $otStartObj->modify('+30 minutes'); 

            if ($scanOutObj > $otStartObj) {
                $otMinutes = ($scanOutObj->getTimestamp() - $otStartObj->getTimestamp()) / 60;
                if ($otMinutes >= 60) {
                    $otTotalHours = floor($otMinutes / 60 * 2) / 2;
                    
                    // ส่วนลดแรงคูณตามเงื่อนไขวันหยุด/วันอาทิตย์
                    $multiplierNormal = ($isSunday || $isHoliday) ? 3 : 1.5; 
                    $resultsByLine[$line]['ot_cost'] += ($otTotalHours * $hourlyRate * $multiplierNormal);
                }
            }
        }
    } 
    return $resultsByLine;
}
?>