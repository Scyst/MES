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

// ปิด Session เพื่อลดการล็อกไฟล์ session
session_write_close();

try {
    // ==================================================================================
    // 1. ACTION: read_daily (ดูข้อมูลรายวัน - อัปเกรด Snapshot History)
    // ==================================================================================
    if ($action === 'read_daily') {
        $startDate  = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
        $endDate    = $_GET['endDate']   ?? $startDate; 
        $lineFilter = $_GET['line'] ?? ''; 

        // [Logic ใหม่] อ่านข้อมูลจาก Log (History) ก่อน -> ถ้าไม่มีค่อยไป Master
        $sql = "SELECT 
                    ISNULL(L.log_id, 0) as log_id,
                    ISNULL(CONVERT(VARCHAR(10), L.log_date, 120), :startDateDisp) as log_date,
                    CONVERT(VARCHAR(19), L.scan_in_time, 120) as scan_in_time,
                    CONVERT(VARCHAR(19), L.scan_out_time, 120) as scan_out_time,
                    CASE 
                        WHEN L.status IS NOT NULL THEN L.status
                        WHEN :startDateCheck < CAST(GETDATE() AS DATE) THEN 'ABSENT'
                        ELSE 'WAITING'
                    END as status,
                    L.remark, 
                    ISNULL(L.is_verified, 0) as is_verified,
                    E.emp_id, E.name_th, E.position, 
                    E.is_active, 

                    -- [CRITICAL] Snapshot Line Logic
                    -- 1. ดู mapping ของ actual_line (จาก Log)
                    -- 2. ดู actual_line ดิบๆ
                    -- 3. ดู mapping ของ line ปัจจุบัน (Master)
                    -- 4. ดู line ปัจจุบันดิบๆ
                    COALESCE(SM_Act.display_section, L.actual_line, SM.display_section, E.line, 'Unassigned') as line, 
                    
                    -- [CRITICAL] Snapshot Team Logic
                    COALESCE(L.actual_team, E.team_group) as team_group,

                    -- Shift Info
                    ISNULL(S.shift_name, S_Master.shift_name) as shift_name, 
                    ISNULL(S.start_time, S_Master.start_time) as shift_start, 
                    ISNULL(S.end_time,   S_Master.end_time)   as shift_end,
                    
                    L.shift_id as actual_shift_id,
                    
                    -- Snapshot Type Logic
                    ISNULL(L.actual_emp_type, ISNULL(CM.category_name, 'Other')) as category_name

                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                
                -- 1. Mapping สำหรับ Master Data (ข้อมูลปัจจุบัน)
                LEFT JOIN " . MANPOWER_SECTION_MAPPING_TABLE . " SM ON E.line = SM.api_department
                
                -- 2. Shift & Category Master
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S_Master ON E.default_shift_id = S_Master.shift_id
                LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position = CM.keyword
                
                -- 3. Log Table (ข้อมูลรายวัน)
                LEFT JOIN " . MANPOWER_DAILY_LOGS_TABLE . " L 
                    ON E.emp_id = L.emp_id 
                    AND L.log_date BETWEEN :start AND :end
                
                -- 4. [NEW] Mapping สำหรับ Snapshot Data (ข้อมูลในอดีตจาก Log)
                LEFT JOIN " . MANPOWER_SECTION_MAPPING_TABLE . " SM_Act ON L.actual_line = SM_Act.api_department
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id

                WHERE 
                    -- แสดงคนที่มี Log (ประวัติ) หรือ คนที่ Active (ปัจจุบัน)
                    (L.log_id IS NOT NULL) 
                    OR 
                    (E.is_active = 1)";
        
        $params = [
            ':startDateDisp' => $startDate,
            ':startDateCheck' => $startDate,
            ':start' => $startDate, 
            ':end' => $endDate
        ];

        // Filter Logic: ต้องกรองจากค่าที่ Display จริงๆ (Snapshot Priority)
        if (!empty($lineFilter) && $lineFilter !== 'ALL') {
            $sql .= " AND COALESCE(SM_Act.display_section, L.actual_line, SM.display_section, E.line, 'Unassigned') = :line";
            $params[':line'] = $lineFilter;
        }

        $sql .= " ORDER BY line ASC, team_group ASC, E.emp_id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate Summary for Header (Client-side usage)
        $summary = [
            'total' => count($data), 'present' => 0, 'absent' => 0, 
            'late' => 0, 'leave' => 0, 'waiting' => 0, 'other' => 0, 'other_total' => 0
        ];
        
        $maxUpdateTimestamp = null;

        foreach ($data as &$row) {
            $row['scan_time_display'] = $row['scan_in_time'] ? date('H:i', strtotime($row['scan_in_time'])) : '-';
            
            $st = strtoupper($row['status']);
            if ($st === 'PRESENT') $summary['present']++;
            elseif ($st === 'ABSENT') $summary['absent']++;
            elseif ($st === 'LATE') $summary['late']++;
            elseif ($st === 'WAITING') $summary['waiting']++;
            elseif (strpos($st, 'LEAVE') !== false) $summary['leave']++;
            else $summary['other']++;

             if (isset($row['updated_at'])) {
                $ts = strtotime($row['updated_at']);
                if ($maxUpdateTimestamp === null || $ts > $maxUpdateTimestamp) {
                    $maxUpdateTimestamp = $ts;
                }
            }
        }
        $summary['other_total'] = $summary['late'] + $summary['leave'] + $summary['other'] + $summary['waiting'];

        echo json_encode([
            'success' => true,
            'data' => $data,
            'summary' => $summary,
            'last_update_ts' => $maxUpdateTimestamp
        ]);
        
    // ==================================================================================
    // 2. ACTION: read_summary (ใช้ SQL Function ตัวใหม่)
    // ==================================================================================
    } elseif ($action === 'read_summary') {
        $date = $_GET['date'] ?? date('Y-m-d');
        
        // เลือก Function ตามโหมด (Prod หรือ Test)
        $funcName = IS_DEVELOPMENT ? 'fn_GetManpowerSummary_TEST' : 'fn_GetManpowerSummary';

        // เรียก SQL Function โดยตรง (เร็วกว่า และ Logic อยู่ที่ Database)
        // ต้อง Alias ชื่อ column ให้ตรงกับที่ JS ต้องการ (plan, present, late...)
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
                    (Count_Actual - Total_Registered) as [diff]

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
    // 3. ACTION: update_log (แก้ไขสถานะ + บันทึก Snapshot)
    // ==================================================================================
    } elseif ($action === 'update_log') {
        if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");

        $logId  = isset($input['log_id']) ? $input['log_id'] : null;
        $status = $input['status'] ?? null;
        $remark = trim($input['remark'] ?? '');
        $shiftId = !empty($input['shift_id']) ? intval($input['shift_id']) : null;
        $scanIn  = !empty($input['scan_in_time']) ? $input['scan_in_time'] : null;
        $scanOut = !empty($input['scan_out_time']) ? $input['scan_out_time'] : null;
        
        $empId   = $input['emp_id'] ?? null;
        $logDate = $input['log_date'] ?? null;

        if ($logId === null || !$status) throw new Exception("Missing required fields.");

        $pdo->beginTransaction();

        // กรณีที่มี Log อยู่แล้ว (Update)
        if ($logId != 0) {
            // ... (โค้ดตรวจสอบสิทธิ์เดิม) ...
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

            // Update ปกติ (ไม่ต้องแก้ Snapshot เพราะถือว่ามีอยู่แล้ว)
            $sql = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
                    SET status = ?, remark = ?, scan_in_time = ?, scan_out_time = ?, 
                        shift_id = ?, updated_by = ?, updated_at = GETDATE(),
                        is_verified = 1
                    WHERE log_id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status, $remark, $scanIn, $scanOut, $shiftId, $updatedBy, $logId]);
            
            $msg = "Update successful (Verified)";

        // กรณีที่ยังไม่มี Log (Insert ใหม่ - Manual Add)
        } else {
            if (!$empId || !$logDate) throw new Exception("New record requires Emp ID and Date.");

            // 1. ดึงข้อมูล Master ปัจจุบัน เพื่อทำ Snapshot
            $stmtSnap = $pdo->prepare("
                SELECT E.line, E.team_group, ISNULL(CM.category_name, 'Other') as emp_type
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position = CM.keyword
                WHERE E.emp_id = ?
            ");
            $stmtSnap->execute([$empId]);
            $snapData = $stmtSnap->fetch(PDO::FETCH_ASSOC);

            if (!$snapData) throw new Exception("Employee Master not found.");

            // 2. Insert พร้อม Snapshot
            $sql = "INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " 
                    (log_date, emp_id, status, remark, scan_in_time, scan_out_time, shift_id, 
                     actual_line, actual_team, actual_emp_type, -- <== Insert Snapshot
                     updated_by, updated_at, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 
                            ?, ?, ?, 
                            ?, GETDATE(), 1)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $logDate, $empId, $status, $remark, $scanIn, $scanOut, $shiftId,
                $snapData['line'], $snapData['team_group'], $snapData['emp_type'], // Snapshot values
                $updatedBy
            ]);
            
            $logId = $pdo->lastInsertId();
            $msg = "Created new record (History Saved)";
        }

        $detail = "Manpower Update LogID:$logId Status:$status Shift:$shiftId";
        $stmtLog = $pdo->prepare("INSERT INTO " . USER_LOGS_TABLE . " (action_by, action_type, detail, created_at) VALUES (?, 'MANPOWER_EDIT', ?, GETDATE())");
        $stmtLog->execute([$updatedBy, $detail]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => $msg]);

    // ==================================================================================
    // 4. ACTION: clear_day (ลบข้อมูลทั้งวัน)
    // ==================================================================================
    } elseif ($action === 'clear_day') {
        if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized to clear data.");

        $date = $input['date'] ?? '';
        $line = $input['line'] ?? '';

        if (empty($date)) throw new Exception("Date is required.");

        $pdo->beginTransaction();

        $params = [$date];
        $sqlDeleteLog = "DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_date = ?";
        $sqlDeleteCost = "DELETE FROM " . MANUAL_COSTS_TABLE . " WHERE entry_date = ?";

        if (!empty($line) && $line !== 'ALL') {
            // [Safety] ลบโดยเช็คทั้ง actual_line (ถ้ามี) หรือ Master Line
            $sqlDeleteLog = "DELETE L FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                             LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                             WHERE L.log_date = ? 
                             AND (L.actual_line = ? OR E.line = ?)";
            
            $sqlDeleteCost .= " AND line = ?";
            
            // Params: Date, Line, Line, Line
            $params = [$date, $line, $line, $line];
        } else {
            // ถ้าลบทั้งวัน ให้ลบเฉพาะ Cost ที่เป็น LABOR (เผื่อมี Cost อื่น)
            $sqlDeleteCost .= " AND cost_category = 'LABOR'";
        }

        $stmt = $pdo->prepare($sqlDeleteLog);
        // ตัด parameter ตัวสุดท้ายออก 1 ตัวสำหรับ Log Query (เพราะ Cost ใช้ param เยอะกว่า 1 ตัวถ้าระบุ line)
        // แต่เดี๋ยวก่อน! $params ของ Cost มี 4 ตัว (Date, Line, Line, Line)
        // $params ของ Log มี 3 ตัว (Date, Line, Line)
        // ดังนั้นต้อง slice ให้ถูก
        
        if (!empty($line) && $line !== 'ALL') {
             $stmt->execute([$date, $line, $line]);
        } else {
             $stmt->execute([$date]);
        }
        
        $deletedCount = $stmt->rowCount();

        // Delete Cost
        $stmtCost = $pdo->prepare($sqlDeleteCost);
        if (!empty($line) && $line !== 'ALL') {
            $stmtCost->execute([$date, $line]);
        } else {
            $stmtCost->execute([$date]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => "Cleared $deletedCount records."]);

    } else {
        throw new Exception("Invalid Action: " . htmlspecialchars($action));
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>