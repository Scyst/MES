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
    // 1. ACTION: read_daily (ดูข้อมูลรายวัน - ส่วนนี้เหมือนเดิม)
    // ==================================================================================
    // ==================================================================================
    // 1. ACTION: read_daily (แก้ไขเงื่อนไข WHERE)
    // ==================================================================================
    if ($action === 'read_daily') {
        $startDate = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
        $endDate   = $_GET['endDate']   ?? $startDate; 
        $lineFilter = $_GET['line'] ?? ''; 

        $sql = "SELECT 
                    ISNULL(L.log_id, 0) as log_id,
                    ISNULL(CONVERT(VARCHAR(10), L.log_date, 120), '$startDate') as log_date,
                    CONVERT(VARCHAR(19), L.scan_in_time, 120) as scan_in_time,
                    CONVERT(VARCHAR(19), L.scan_out_time, 120) as scan_out_time,
                    CASE 
                        WHEN L.status IS NOT NULL THEN L.status
                        WHEN '$startDate' < CAST(GETDATE() AS DATE) THEN 'ABSENT'
                        ELSE 'WAITING'
                    END as status,
                    L.remark, 
                    ISNULL(L.is_verified, 0) as is_verified,
                    E.emp_id, E.name_th, E.position, 
                    E.is_active, -- [เพิ่ม] ดึงสถานะ Active มาด้วย เพื่อให้ JS เช็คได้
                    COALESCE(SM.display_section, E.line, 'Unassigned') as line, 
                    E.team_group,
                    S_Master.shift_name, 
                    S_Master.start_time as shift_start, 
                    S_Master.end_time as shift_end,
                    L.shift_id as actual_shift_id,
                    ISNULL(CM.category_name, 'Other') as category_name
                FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                LEFT JOIN " . MANPOWER_SECTION_MAPPING_TABLE . " SM ON E.line = SM.api_department
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S_Master ON E.default_shift_id = S_Master.shift_id
                LEFT JOIN " . MANPOWER_CATEGORY_MAPPING_TABLE . " CM ON E.position = CM.keyword
                LEFT JOIN " . MANPOWER_DAILY_LOGS_TABLE . " L 
                    ON E.emp_id = L.emp_id 
                    AND L.log_date BETWEEN :start AND :end
                WHERE 
                    (E.is_active = 1) 
                    OR 
                    (L.log_id IS NOT NULL)"; // <=== [แก้ไขจุดนี้] ถ้ามี Log ให้ดึงมาด้วย แม้จะ Inactive
        
        $params = [':start' => $startDate, ':end' => $endDate];

        if (!empty($lineFilter) && $lineFilter !== 'ALL') {
            $sql .= " AND COALESCE(SM.display_section, E.line, 'Unassigned') = :line";
            $params[':line'] = $lineFilter;
        }

        $sql .= " ORDER BY COALESCE(SM.display_section, E.line), E.emp_id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
    // 2. ACTION: read_summary (แก้ไขใหม่ - Single Query)
    // ==================================================================================
    } elseif ($action === 'read_summary') {
        $date = $_GET['date'] ?? date('Y-m-d');
        
        // เลือก Function ตามโหมด
        $funcName = IS_DEVELOPMENT ? 'fn_GetManpowerSummary_TEST' : 'fn_GetManpowerSummary';

        // ดึงข้อมูล "ดิบ" ที่ละเอียดที่สุด (Line + Shift + Team + Type) ครั้งเดียวพอ!
        // JS จะเอาไปหมุน (Pivot) เป็นมุมมองต่างๆ เอง
        $sql = "SELECT 
                    display_section as line_name,
                    shift_name,
                    team_group,
                    category_name as emp_type,
                    section_id, /* เอาไว้เรียงลำดับ Line */
                    
                    /* Metrics */
                    MAX(Master_Headcount) as [total_hc], 
                    SUM(Total_Registered) as [plan], 
                    SUM(Count_Present) as [present], 
                    SUM(Count_Late) as [late], 
                    SUM(Count_Absent) as [absent], 
                    SUM(Count_Leave) as [leave], 
                    SUM(Count_Actual) as [actual],
                    (SUM(Count_Actual) - SUM(Total_Registered)) as [diff]

                FROM $funcName(:date)
                GROUP BY display_section, section_id, shift_name, team_group, category_name
                ORDER BY section_id, display_section, shift_name";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':date' => $date]);
        $rawData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'raw_data' => $rawData, // ส่งก้อนนี้ก้อนเดียวจบ เร็วขึ้นแน่นอน
            'last_update' => date('d/m/Y H:i:s')
        ]);

    // ==================================================================================
    // 3. ACTION: update_log (แก้ไขสถานะรายคน)
    // ==================================================================================
    } elseif ($action === 'update_log') {
        if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");

        // รับค่า (ยอมรับ 0 ได้ โดยใช้ isset เช็คแทน)
        $logId  = isset($input['log_id']) ? $input['log_id'] : null;
        $status = $input['status'] ?? null;
        $remark = trim($input['remark'] ?? '');
        $shiftId = !empty($input['shift_id']) ? intval($input['shift_id']) : null;
        $scanIn  = !empty($input['scan_in_time']) ? $input['scan_in_time'] : null;
        $scanOut = !empty($input['scan_out_time']) ? $input['scan_out_time'] : null;
        
        // รับค่าเพิ่มสำหรับกรณีสร้างใหม่ (log_id = 0)
        $empId   = $input['emp_id'] ?? null;
        $logDate = $input['log_date'] ?? null;

        // แก้ไขเงื่อนไข validation: เช็คว่า logId เป็น null หรือไม่ (ยอมรับ 0)
        if ($logId === null || !$status) throw new Exception("Missing required fields.");

        // กรณีที่มี Log อยู่แล้ว (Update)
        if ($logId != 0) {
            // ตรวจสอบข้อมูลก่อนแก้
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

            $sql = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
                    SET status = ?, remark = ?, scan_in_time = ?, scan_out_time = ?, 
                        shift_id = ?, updated_by = ?, updated_at = GETDATE(),
                        is_verified = 1
                    WHERE log_id = ?";
            
            $stmt = $pdo->prepare($sql);
            // execute ไม่ต้องส่งตัวแปร verified เข้าไป เพราะ hardcode ใน sql แล้ว
            $stmt->execute([$status, $remark, $scanIn, $scanOut, $shiftId, $updatedBy, $logId]);
            
            $msg = "Update successful (Verified)";

        // กรณีที่ยังไม่มี Log (Insert ใหม่)
        } else {
            if (!$empId || !$logDate) throw new Exception("New record requires Emp ID and Date.");

            // ตรวจสอบว่ามีอยู่จริงไหม (กันข้อมูลซ้ำ)
            $stmtCheckDup = $pdo->prepare("SELECT log_id FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE emp_id = ? AND log_date = ?");
            $stmtCheckDup->execute([$empId, $logDate]);
            if ($stmtCheckDup->fetch()) throw new Exception("Log already exists. Please refresh.");

            $sql = "INSERT INTO " . MANPOWER_DAILY_LOGS_TABLE . " 
                    (log_date, emp_id, status, remark, scan_in_time, scan_out_time, shift_id, updated_by, updated_at, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), 1)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$logDate, $empId, $status, $remark, $scanIn, $scanOut, $shiftId, $updatedBy]);
            
            $logId = $pdo->lastInsertId(); // เก็บ ID ไว้ลง Log
            $msg = "Created new record";
        }

        $detail = "Manpower Update LogID:$logId Status:$status Shift:$shiftId";
        $stmtLog = $pdo->prepare("INSERT INTO " . USER_LOGS_TABLE . " (action_by, action_type, detail, created_at) VALUES (?, 'MANPOWER_EDIT', ?, GETDATE())");
        $stmtLog->execute([$updatedBy, $detail]);

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
            $sqlDeleteLog = "DELETE L FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                             INNER JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                             WHERE L.log_date = ? AND E.line = ?";
            
            $sqlDeleteCost .= " AND line = ?";
            $params[] = $line;
        }

        $stmt = $pdo->prepare($sqlDeleteLog);
        $stmt->execute($params);
        $deletedCount = $stmt->rowCount();

        $stmtCost = $pdo->prepare($sqlDeleteCost);
        $stmtCost->execute($params);

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