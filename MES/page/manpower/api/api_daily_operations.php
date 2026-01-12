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
    // 1. ACTION: read_daily (ดูข้อมูลรายวัน - ตัด Mapping ออก)
    // ==================================================================================
    if ($action === 'read_daily') {
        $startDate  = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
        $endDate    = $_GET['endDate']   ?? $startDate; 
        
        $lineFilter = isset($_GET['line']) ? trim($_GET['line']) : ''; 

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

                    -- [FIX] ตัด Mapping ออก: ใช้ค่าจาก Log (actual_line) หรือ Master (line) ตรงๆ
                    ISNULL(L.actual_line, E.line) as line, 
                    
                    ISNULL(L.actual_team, E.team_group) as team_group,

                    -- Shift Info
                    ISNULL(S.shift_name, S_Master.shift_name) as shift_name, 
                    ISNULL(S.start_time, S_Master.start_time) as shift_start, 
                    ISNULL(S.end_time,   S_Master.end_time)   as shift_end,
                    
                    L.shift_id as actual_shift_id,
                    
                    -- Snapshot Type Logic
                    ISNULL(L.actual_emp_type, ISNULL(CM.category_name, 'Other')) as category_name

                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                
                -- Shift & Category Master
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S_Master ON E.default_shift_id = S_Master.shift_id
                LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position = CM.keyword
                
                -- Log Table (ข้อมูลรายวัน)
                LEFT JOIN " . MANPOWER_DAILY_LOGS_TABLE . " L 
                    ON E.emp_id = L.emp_id 
                    AND L.log_date BETWEEN :start AND :end
                
                -- Shift จริงใน Log
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id

                WHERE 
                    ((L.log_id IS NOT NULL) OR (E.is_active = 1))";
        
        $params = [
            ':startDateDisp' => $startDate,
            ':startDateCheck' => $startDate,
            ':start' => $startDate, 
            ':end' => $endDate
        ];

        // [FIX] แก้ Filter ไม่ให้เช็คกับ Mapping
        if (!empty($lineFilter) && $lineFilter !== 'ALL' && $lineFilter !== 'undefined' && $lineFilter !== 'null') {
            // เช็คว่า ถ้ามี Log ให้ดู Actual Line, ถ้าไม่มีให้ดู Master Line
            $sql .= " AND ISNULL(L.actual_line, E.line) = :line";
            $params[':line'] = $lineFilter;
        }

        $sql .= " ORDER BY line ASC, team_group ASC, E.emp_id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate Summary
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
    // 3. ACTION: update_log (เพิ่มการบันทึก Snapshot Line/Team)
    // ==================================================================================
    } elseif ($action === 'update_log') {
        if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");

        $logId  = isset($input['log_id']) ? $input['log_id'] : null;
        $status = $input['status'] ?? null;
        $remark = trim($input['remark'] ?? '');
        $shiftId = !empty($input['shift_id']) ? intval($input['shift_id']) : null;
        
        // [NEW] รับค่า Snapshot ใหม่ (ถ้ามีการแก้ไข)
        $actualLine = !empty($input['actual_line']) ? $input['actual_line'] : null; 
        $actualTeam = !empty($input['actual_team']) ? $input['actual_team'] : null;

        $scanIn  = !empty($input['scan_in_time']) ? $input['scan_in_time'] : null;
        $scanOut = !empty($input['scan_out_time']) ? $input['scan_out_time'] : null;
        
        $empId   = $input['emp_id'] ?? null;
        $logDate = $input['log_date'] ?? null;

        if ($logId === null || !$status) throw new Exception("Missing required fields.");

        $pdo->beginTransaction();

        // ---------------------------------------------------------
        // CASE 1: UPDATE (แก้ไขข้อมูลที่มีอยู่แล้ว)
        // ---------------------------------------------------------
        if ($logId != 0) {
            // ตรวจสอบสิทธิ์ (Security Check)
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

            // [UPDATED SQL] เพิ่ม actual_line, actual_team
            $sql = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
                    SET status = ?, remark = ?, scan_in_time = ?, scan_out_time = ?, 
                        shift_id = ?, 
                        actual_line = ISNULL(?, actual_line), -- ถ้าส่งมาให้แก้ ถ้าไม่ส่งใช้ค่าเดิม
                        actual_team = ISNULL(?, actual_team), -- ถ้าส่งมาให้แก้ ถ้าไม่ส่งใช้ค่าเดิม
                        updated_by = ?, updated_at = GETDATE(),
                        is_verified = 1
                    WHERE log_id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $status, $remark, $scanIn, $scanOut, $shiftId, 
                $actualLine, $actualTeam, // params ใหม่
                $updatedBy, $logId
            ]);
            
            $msg = "Update successful (Snapshot Updated)";

        // ---------------------------------------------------------
        // CASE 2: INSERT (สร้างข้อมูลใหม่ - ยังไม่มีใน Log)
        // ---------------------------------------------------------
        } else {
            if (!$empId || !$logDate) throw new Exception("New record requires Emp ID and Date.");

            // ดึงข้อมูล Master ปัจจุบัน เพื่อใช้เป็น Default หรือหา Emp Type
            $stmtSnap = $pdo->prepare("
                SELECT E.line, E.team_group, ISNULL(CM.category_name, 'Other') as emp_type
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM 
                    ON E.position = CM.keyword 
                    OR E.position LIKE '%' + CM.keyword + '%' -- [UPDATED] ใช้ Logic แบบใหม่ให้ตรงกับ SP
                WHERE E.emp_id = ?
            ");
            $stmtSnap->execute([$empId]);
            $snapData = $stmtSnap->fetch(PDO::FETCH_ASSOC);

            if (!$snapData) throw new Exception("Employee Master not found.");

            // [LOGIC] ถ้า User ไม่ได้เลือก Line/Team มา ให้ใช้ค่าจาก Master เป็น Default
            $finalLine = $actualLine ?? $snapData['line'];
            $finalTeam = $actualTeam ?? $snapData['team_group'];
            $finalType = $snapData['emp_type']; // Type เอาจาก Master เสมอ (User แก้ไม่ได้)

            // [UPDATED SQL] Insert พร้อม Snapshot ที่ถูกต้อง
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

        // Log Activity
        $detail = "Manpower Update LogID:$logId Status:$status Shift:$shiftId Line:$actualLine";
        $stmtLog = $pdo->prepare("INSERT INTO " . USER_LOGS_TABLE . " (action_by, action_type, detail, created_at) VALUES (?, 'MANPOWER_EDIT', ?, GETDATE())");
        $stmtLog->execute([$updatedBy, $detail]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => $msg]);

    // ==================================================================================
    // 4. ACTION: clear_day
    // ==================================================================================
    } elseif ($action === 'clear_day') {
        if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized to clear data.");

        $date = $input['date'] ?? '';
        $line = $input['line'] ?? '';

        if (empty($date)) throw new Exception("Date is required.");

        $pdo->beginTransaction();

        $sqlDeleteLog = "DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_date = ?";
        $sqlDeleteCost = "DELETE FROM " . MANUAL_COSTS_TABLE . " WHERE entry_date = ?";

        if (!empty($line) && $line !== 'ALL') {
            $sqlDeleteLog = "DELETE L FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                             LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                             WHERE L.log_date = ? 
                             AND (L.actual_line = ? OR E.line = ?)";
            
            $sqlDeleteCost .= " AND line = ?";
            
            $stmt = $pdo->prepare($sqlDeleteLog);
            $stmt->execute([$date, $line, $line]);
            $deletedCount = $stmt->rowCount();

            $stmtCost = $pdo->prepare($sqlDeleteCost);
            $stmtCost->execute([$date, $line]);

        } else {
            $sqlDeleteCost .= " AND cost_category = 'LABOR'";
            
            $stmt = $pdo->prepare($sqlDeleteLog);
            $stmt->execute([$date]);
            $deletedCount = $stmt->rowCount();

            $stmtCost = $pdo->prepare($sqlDeleteCost);
            $stmtCost->execute([$date]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => "Cleared $deletedCount records."]);

    // ==================================================================================
    // 5. ACTION: get_daily_details (Dynamic Shift Filter + ตัด Mapping ออก)
    // ==================================================================================
    } elseif ($action === 'get_daily_details') {
        $date = $input['date'] ?? date('Y-m-d');
        $line = $input['line'] ?? '';
        $shift = $input['shift_id'] ?? ''; 
        
        if (empty($line)) {
             echo json_encode(['success' => true, 'data' => []]);
             exit;
        }

        // 1. ตั้งต้น SQL หลัก (ยังไม่กรอง Shift)
        $sql = "SELECT 
                    ISNULL(L.log_id, 0) as log_id,
                    E.emp_id,
                    E.name_th,
                    E.position,
                    L.scan_in_time,
                    L.scan_out_time,
                    
                    CASE 
                        WHEN L.status IS NOT NULL THEN L.status
                        WHEN :dateCheck < CAST(GETDATE() AS DATE) THEN 'ABSENT'
                        ELSE 'WAITING'
                    END as status,
                    
                    L.remark,
                    ISNULL(L.shift_id, E.default_shift_id) as actual_shift_id,
                    ISNULL(S.shift_name, S_Def.shift_name) as shift_name

                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S_Def ON E.default_shift_id = S_Def.shift_id
                LEFT JOIN " . MANPOWER_DAILY_LOGS_TABLE . " L 
                    ON E.emp_id = L.emp_id AND L.log_date = :date
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id

                -- [FIX] ตัด Mapping ออก 

                WHERE E.is_active = 1";

        // 2. กำหนด Params เริ่มต้น
        $params = [
            ':date'      => $date, 
            ':dateCheck' => $date
        ];

        // 3. กรอง Line (ตัดส่วน Mapping ออก)
        // เช็คว่า E.line ตรง หรือ L.actual_line ตรง
        $sql .= " AND (
                      E.line = :line1 
                      OR L.actual_line = :line2
                  )";
        $params[':line1'] = $line;
        $params[':line2'] = $line;

        // 4. กรอง Shift (Dynamic)
        if (!empty($shift)) {
            $sql .= " AND (
                          (L.shift_id IS NOT NULL AND L.shift_id = :shift1) 
                          OR 
                          (L.shift_id IS NULL AND E.default_shift_id = :shift2)
                      )";
            $params[':shift1'] = $shift;
            $params[':shift2'] = $shift;
        }

        $sql .= " ORDER BY E.emp_id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rawData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Filter Status ด้วย PHP
        $filterStatus = $input['filter_status'] ?? 'ALL';
        $finalData = [];

        foreach ($rawData as $row) {
            if ($filterStatus === 'ALL' || $row['status'] === $filterStatus) {
                $finalData[] = $row;
            }
        }

        echo json_encode(['success' => true, 'data' => $finalData]);

    // ==================================================================================
    // 6. ACTION: update_log_status
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