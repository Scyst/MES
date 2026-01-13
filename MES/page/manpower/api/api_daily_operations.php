<?php
// MES/page/manpower/api/api_daily_operations.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// ตรวจสอบสิทธิ์เบื้องต้น (ต้อง Login)
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$currentUser = $_SESSION['user'];
$updatedBy = $currentUser['username'];

// รับค่า Action (รองรับทั้ง GET และ POST JSON)
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? 'read_daily');

// ปิด Session เพื่อลดการล็อกไฟล์ session (Performance Tuning)
session_write_close();

try {
    // ==================================================================================
    // 1. ACTION: read_daily (ดึงข้อมูลรายวัน + คำนวณเงิน + ตัดเกรด)
    // ==================================================================================
    if ($action === 'read_daily') {
        $startDate  = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
        $endDate    = $_GET['endDate']   ?? $startDate; 
        
        $lineFilter = isset($_GET['line']) ? trim($_GET['line']) : ''; 
        $empTypeFilter = isset($_GET['type']) ? trim($_GET['type']) : '';

        // SQL Logic: คำนวณ 8 ชม. + OT Step + ตัดคนลืมสแกน
        $sql = "SELECT 
                    ISNULL(L.log_id, 0) as log_id,
                    ISNULL(CONVERT(VARCHAR(10), L.log_date, 120), :startDateDisp) as log_date,
                    CONVERT(VARCHAR(5), L.scan_in_time, 108) as in_time,   
                    CONVERT(VARCHAR(5), L.scan_out_time, 108) as out_time, 
                    
                    -- Status Logic
                    CASE 
                        WHEN L.status IS NOT NULL THEN L.status
                        WHEN :startDateCheck < CAST(GETDATE() AS DATE) THEN 'ABSENT'
                        ELSE 'WAITING'
                    END as status,
                    
                    L.remark, 
                    E.emp_id, E.name_th, E.position, 
                    
                    -- Shift & Line Info (Priority: Snapshot > Master)
                    ISNULL(L.actual_line, E.line) as line, 
                    ISNULL(L.actual_team, E.team_group) as team_group,
                    ISNULL(L.shift_id, E.default_shift_id) as shift_id,
                    ISNULL(S.shift_name, S_Master.shift_name) as shift_name,
                    E.default_shift_id,
                    
                    -- Snapshot Data (สำหรับ Frontend Dropdown)
                    L.actual_line,
                    L.actual_team,
                    E.line as master_line,
                    E.team_group as master_team,
                    
                    -- ✅ 1. เช็คคนลืมสแกนออก (Flag)
                    CASE 
                        WHEN L.scan_in_time IS NOT NULL AND L.scan_out_time IS NULL AND L.log_date < CAST(GETDATE() AS DATE) THEN 1 
                        ELSE 0 
                    END as is_forgot_out,

                    -- ✅ 2. คำนวณเงินรายหัว (Est. Cost)
                    CAST(
                        CASE 
                            WHEN L.status IN ('PRESENT', 'LATE') THEN 
                                -- [A] ฐานเงินเดือน/ค่าแรง (8 ชม.)
                                (CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE (COALESCE(CM.hourly_rate,0) * Rate.Work_Multiplier) END)
                                +
                                -- [B] ค่า OT (Logic: ลืมสแกน = 0, OT Step 30 นาที, Cap 6 ชม.)
                                (Final_OT.OT_Capped * Rate.Hourly_Base * Rate.OT_Multiplier)
                            ELSE 0 
                        END
                    AS DECIMAL(10,2)) as est_cost

                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                
                -- Shift Master
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S_Master ON E.default_shift_id = S_Master.shift_id
                
                -- Category Mapping (ดึงเรทเงิน)
                OUTER APPLY (
                    SELECT TOP 1 * FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " M 
                    WHERE E.position LIKE '%' + M.keyword + '%' 
                    ORDER BY LEN(M.keyword) DESC
                ) CM
                
                -- Log Table
                LEFT JOIN " . MANPOWER_DAILY_LOGS_TABLE . " L 
                    ON E.emp_id = L.emp_id 
                    AND L.log_date BETWEEN :start AND :end
                
                -- Shift Actual
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id
                
                -- Calendar
                LEFT JOIN dbo.MANPOWER_CALENDAR Cal ON (L.log_date = Cal.calendar_date OR Cal.calendar_date = :calDate)

                -- ✅ 3. Helper: Rate Multipliers
                CROSS APPLY (SELECT CASE WHEN CM.rate_type='MONTHLY_NO_OT' THEN 0.0 WHEN Cal.day_type='HOLIDAY' THEN 3.0 ELSE 1.5 END AS OT_Multiplier, CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN 0.0 ELSE 1.0 END AS Work_Multiplier, CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN COALESCE(CM.hourly_rate, 0)/30.0/8.0 WHEN CM.rate_type='DAILY' THEN COALESCE(CM.hourly_rate,0)/8.0 ELSE COALESCE(CM.hourly_rate,0) END AS Hourly_Base) AS Rate
                
                -- ✅ 4. Helper: Time Calc & Auto-Cutoff
                CROSS APPLY (SELECT CAST(CONCAT(ISNULL(L.log_date, :t0Date), ' ', ISNULL(S.start_time, S_Master.start_time)) AS DATETIME) AS Shift_Start) AS T0
                CROSS APPLY (
                    SELECT CASE 
                        WHEN L.scan_out_time IS NOT NULL THEN L.scan_out_time 
                        WHEN L.log_date < CAST(GETDATE() AS DATE) THEN T0.Shift_Start -- อดีต+ลืม = ตัดเวลาทิ้ง (OT=0)
                        ELSE GETDATE() -- วันนี้ = วิ่งตามจริง
                    END AS Calc_End_Time
                ) AS T1
                CROSS APPLY (SELECT DATEDIFF(MINUTE, T0.Shift_Start, T1.Calc_End_Time) AS Total_Minutes) AS T2
                
                -- ✅ 5. Helper: OT Step 30 นาที
                CROSS APPLY (SELECT CASE WHEN T2.Total_Minutes > 570 THEN FLOOR((T2.Total_Minutes - 570) / 30.0) * 0.5 ELSE 0 END AS OT_Hours) AS Step_OT
                CROSS APPLY (SELECT CASE WHEN L.log_date < CAST(GETDATE() AS DATE) AND L.scan_out_time IS NULL THEN 0 WHEN Step_OT.OT_Hours > 6 THEN 6 ELSE Step_OT.OT_Hours END AS OT_Capped) AS Final_OT

                WHERE 
                    E.is_active = 1
                    -- ✅ 6. Ghost Plan Filter
                    AND (L.log_id IS NOT NULL OR (E.created_at IS NULL OR CAST(E.created_at AS DATE) <= :createDateCheck))
        ";
        
        $params = [
            ':startDateDisp' => $startDate,
            ':startDateCheck' => $startDate,
            ':start' => $startDate, 
            ':end' => $endDate,
            ':calDate' => $startDate,
            ':t0Date' => $startDate,
            ':createDateCheck' => $startDate
        ];

        // Filter Line
        if (!empty($lineFilter) && $lineFilter !== 'ALL' && $lineFilter !== 'undefined' && $lineFilter !== 'null') {
            $sql .= " AND ISNULL(L.actual_line, E.line) = :line";
            $params[':line'] = $lineFilter;
        }

        if (!empty($empTypeFilter) && $empTypeFilter !== 'ALL' && $empTypeFilter !== 'undefined') {
            // ต้องเช็คว่าใน DB เราเก็บ Type ไว้ที่ไหน (ปกติเทียบกับ Category Name)
            // สูตร: ถ้า category_name ตรงกับที่ส่งมา หรือถ้าเป็น Other ก็เช็คว่าไม่มี category
            if ($empTypeFilter === 'Other') {
                $sql .= " AND (CM.category_name IS NULL)";
            } else {
                $sql .= " AND (CM.category_name = :empType)";
                $params[':empType'] = $empTypeFilter;
            }
        }

        $sql .= " ORDER BY line ASC, E.emp_id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate Summary
        $summary = [
            'total' => count($data), 'present' => 0, 'absent' => 0, 
            'late' => 0, 'leave' => 0, 'waiting' => 0, 'other' => 0, 'other_total' => 0
        ];
        
        foreach ($data as $row) {
            $st = strtoupper($row['status']);
            if ($st === 'PRESENT') $summary['present']++;
            elseif ($st === 'ABSENT') $summary['absent']++;
            elseif ($st === 'LATE') $summary['late']++;
            elseif ($st === 'WAITING') $summary['waiting']++;
            
            // 🔥 [FIXED] รวม 'OTHER' เข้าไปในกลุ่ม Leave ด้วย
            elseif (in_array($st, ['SICK', 'BUSINESS', 'VACATION', 'LEAVE', 'OTHER'])) $summary['leave']++;
            
            else $summary['other']++;
        }
        $summary['other_total'] = $summary['late'] + $summary['leave'] + $summary['other'] + $summary['waiting'];

        echo json_encode([
            'success' => true,
            'data' => $data,
            'summary' => $summary
        ]);

    // ==================================================================================
    // 2. ACTION: read_summary (Dashboard Summary)
    // ==================================================================================
    } elseif ($action === 'read_summary') {
        $date = $_GET['date'] ?? date('Y-m-d');
        
        $funcName = IS_DEVELOPMENT ? 'fn_GetManpowerSummary_TEST' : 'fn_GetManpowerSummary';

        $sql = "SELECT 
                    display_section as line_name,
                    shift_name,
                    team_group,
                    category_name as emp_type,
                    section_id,
                    
                    Master_Headcount as [total_hc], 
                    Total_Registered as [plan], 
                    Count_Present    as [present], 
                    Count_Late       as [late], 
                    Count_Absent     as [absent], 
                    Count_Leave      as [leave], 
                    Count_Actual     as [actual],
                    (Count_Actual - Total_Registered) as [diff],
                    Total_Cost       as [total_cost]

                FROM $funcName(:date)
                ORDER BY section_id, display_section, shift_name, team_group";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':date' => $date]);
        $rawData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'raw_data' => $rawData,
            'last_update' => date('d/m/Y H:i:s')
        ]);

    // ==================================================================================
    // 3. ACTION: update_log (บันทึกข้อมูล + แก้ไข Snapshot)
    // ==================================================================================
    } elseif ($action === 'update_log') {
        if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");

        $logId  = isset($input['log_id']) ? $input['log_id'] : null;
        $status = $input['status'] ?? null;
        $remark = trim($input['remark'] ?? '');
        $shiftId = !empty($input['shift_id']) ? intval($input['shift_id']) : null;
        
        // รับค่า Snapshot (Line/Team)
        $actualLine = !empty($input['actual_line']) ? $input['actual_line'] : null; 
        $actualTeam = !empty($input['actual_team']) ? $input['actual_team'] : null;

        // แปลงค่าว่างเป็น NULL เพื่อไม่ให้ DB Error
        $scanIn  = !empty($input['scan_in_time']) ? $input['scan_in_time'] : null;
        $scanOut = !empty($input['scan_out_time']) ? $input['scan_out_time'] : null;
        
        $empId   = $input['emp_id'] ?? null;
        $logDate = $input['log_date'] ?? null;

        if ($logId === null || !$status) throw new Exception("Missing required fields.");

        $pdo->beginTransaction();

        // --- CASE 1: UPDATE Existing Log ---
        if ($logId != 0) {
            $stmtCheck = $pdo->prepare("SELECT L.is_verified, E.line FROM " . MANPOWER_DAILY_LOGS_TABLE . " L JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id WHERE L.log_id = ?");
            $stmtCheck->execute([$logId]);
            $log = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if (!$log) throw new Exception("Log not found.");
            
            if (hasRole('supervisor')) {
                $userLine = $currentUser['line'] ?? '';
                if ($log['line'] !== $userLine) throw new Exception("Permission Denied (Wrong Line).");
            }
            if ($log['is_verified'] == 1 && !hasRole(['admin', 'creator'])) {
                throw new Exception("Record is locked (Verified).");
            }

            // Update พร้อม Logic เช็คค่าว่าง (ISNULL)
            $sql = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
                    SET status = ?, remark = ?, scan_in_time = ?, scan_out_time = ?, 
                        shift_id = ?, 
                        actual_line = ISNULL(?, actual_line), 
                        actual_team = ISNULL(?, actual_team),
                        updated_by = ?, updated_at = GETDATE(),
                        is_verified = 1
                    WHERE log_id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $status, $remark, $scanIn, $scanOut, $shiftId, 
                $actualLine, $actualTeam,
                $updatedBy, $logId
            ]);
            
            $msg = "Update successful (Snapshot Updated)";

        // --- CASE 2: INSERT New Log ---
        } else {
            if (!$empId || !$logDate) throw new Exception("New record requires Emp ID and Date.");

            // ดึง Master Data มาเป็น Default
            $stmtSnap = $pdo->prepare("
                SELECT E.line, E.team_group, ISNULL(CM.category_name, 'Other') as emp_type
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                OUTER APPLY (
                    SELECT TOP 1 category_name 
                    FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " M 
                    WHERE E.position = M.keyword OR E.position LIKE '%' + M.keyword + '%' 
                    ORDER BY LEN(M.keyword) DESC
                ) CM
                WHERE E.emp_id = ?
            ");
            $stmtSnap->execute([$empId]);
            $snapData = $stmtSnap->fetch(PDO::FETCH_ASSOC);

            if (!$snapData) throw new Exception("Employee Master not found.");

            $finalLine = $actualLine ?? $snapData['line'];
            $finalTeam = $actualTeam ?? $snapData['team_group'];
            $finalType = $snapData['emp_type'];

            $sql = "INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " 
                    (log_date, emp_id, status, remark, scan_in_time, scan_out_time, shift_id, 
                     actual_line, actual_team, actual_emp_type, 
                     updated_by, updated_at, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 
                            ?, ?, ?, 
                            ?, GETDATE(), 1)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $logDate, $empId, $status, $remark, $scanIn, $scanOut, $shiftId,
                $finalLine, $finalTeam, $finalType, 
                $updatedBy
            ]);
            
            $logId = $pdo->lastInsertId();
            $msg = "Created new record (History Saved)";
        }

        // Log Action
        $detail = "Manpower Update LogID:$logId Status:$status Shift:$shiftId Line:$actualLine";
        $stmtLog = $pdo->prepare("INSERT INTO " . USER_LOGS_TABLE . " (action_by, action_type, detail, created_at) VALUES (?, 'MANPOWER_EDIT', ?, GETDATE())");
        $stmtLog->execute([$updatedBy, $detail]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => $msg]);

    // ==================================================================================
    // 4. ACTION: clear_day (ล้างข้อมูล)
    // ==================================================================================
    } elseif ($action === 'clear_day') {
        if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized.");

        $date = $input['date'] ?? '';
        $line = $input['line'] ?? '';

        if (empty($date)) throw new Exception("Date is required.");

        $pdo->beginTransaction();

        $sqlDeleteLog = "DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_date = ?";
        
        // ถ้าต้องการลบ Cost ด้วย ให้เปิดคอมเมนต์บรรทัดนี้
        // $sqlDeleteCost = "DELETE FROM " . MANUAL_COSTS_TABLE . " WHERE entry_date = ?"; 

        if (!empty($line) && $line !== 'ALL') {
            $sqlDeleteLog = "DELETE L FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                             LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                             WHERE L.log_date = ? AND (L.actual_line = ? OR E.line = ?)";
            
            $stmt = $pdo->prepare($sqlDeleteLog);
            $stmt->execute([$date, $line, $line]);
            $deletedCount = $stmt->rowCount();
        } else {
            $stmt = $pdo->prepare($sqlDeleteLog);
            $stmt->execute([$date]);
            $deletedCount = $stmt->rowCount();
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => "Cleared $deletedCount records."]);

    // ==================================================================================
    // 5. ACTION: update_log_status (Quick Update) - เผื่อไว้ใช้
    // ==================================================================================
    } elseif ($action === 'update_log_status') {
        if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");

        $logId  = $input['log_id'] ?? '';
        $status = $input['status'] ?? '';
        $remark = $input['remark'] ?? '';

        if (empty($logId) || empty($status)) throw new Exception("Missing parameters");

        $sql = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . "
                SET status = ?, 
                    remark = ?, 
                    updated_at = GETDATE(),
                    updated_by = ?
                WHERE log_id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$status, $remark, $updatedBy, $logId]);

        echo json_encode(['success' => true, 'message' => 'Updated successfully']);

    } else {
        throw new Exception("Invalid Action: " . htmlspecialchars($action));
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>