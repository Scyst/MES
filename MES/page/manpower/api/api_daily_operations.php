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
    // 1. ACTION: read_daily (ดูข้อมูลรายวัน)
    // ==================================================================================
    if ($action === 'read_daily') {
        $startDate = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
        $endDate   = $_GET['endDate']   ?? $startDate; 
        $lineFilter = $_GET['line'] ?? ''; 

        // Query ข้อมูล
        $sql = "SELECT 
                    L.log_id, L.log_date, 
                    CONVERT(VARCHAR(19), L.scan_in_time, 120) as scan_in_time, 
                    CONVERT(VARCHAR(19), L.scan_out_time, 120) as scan_out_time,
                    L.status, L.remark, L.is_verified,
                    E.emp_id, E.name_th, E.position, E.line, E.team_group,
                    S.shift_name, S.start_time as shift_start, S.end_time as shift_end,
                    L.shift_id as actual_shift_id
                FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id
                WHERE L.log_date BETWEEN :start AND :end";
        
        $params = [':start' => $startDate, ':end' => $endDate];

        if (!empty($lineFilter) && $lineFilter !== 'ALL') {
            $sql .= " AND E.line = :line";
            $params[':line'] = $lineFilter;
        }

        $sql .= " ORDER BY L.log_date DESC, E.line, L.status";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // คำนวณสรุป (Summary)
        $summary = [
            'total' => count($data), 'present' => 0, 'absent' => 0, 
            'late' => 0, 'leave' => 0, 'other' => 0, 'other_total' => 0
        ];
        
        $maxUpdateTimestamp = null;

        foreach ($data as &$row) {
            $row['scan_time_display'] = $row['scan_in_time'] ? date('H:i', strtotime($row['scan_in_time'])) : '-';
            
            $st = strtoupper($row['status']);
            if ($st === 'PRESENT') $summary['present']++;
            elseif ($st === 'ABSENT') $summary['absent']++;
            elseif ($st === 'LATE') $summary['late']++;
            elseif (strpos($st, 'LEAVE') !== false) $summary['leave']++;
            else $summary['other']++;

             // หา Timestamp ล่าสุดเพื่อใช้เช็ค Sync
             if (isset($row['updated_at'])) {
                $ts = strtotime($row['updated_at']);
                if ($maxUpdateTimestamp === null || $ts > $maxUpdateTimestamp) {
                    $maxUpdateTimestamp = $ts;
                }
            }
        }
        $summary['other_total'] = $summary['late'] + $summary['leave'] + $summary['other'];

        echo json_encode([
            'success' => true,
            'data' => $data,
            'summary' => $summary,
            'last_update_ts' => $maxUpdateTimestamp
        ]);

    // ==================================================================================
    // 2. ACTION: read_summary (Logic ใหม่ + Fix Syntax Error 'plan')
    // ==================================================================================
    } elseif ($action === 'read_summary') {
        $date = $_GET['date'] ?? date('Y-m-d');
        
        // กำหนดชื่อตารางและ View ตามโหมด
        $viewName   = IS_DEVELOPMENT ? 'vw_Manpower_Executive_Summary_TEST' : 'vw_Manpower_Executive_Summary';
        $tableEmp   = MANPOWER_EMPLOYEES_TABLE;
        $tableShift = MANPOWER_SHIFTS_TABLE;
        $tableCat   = MANPOWER_CATEGORY_MAPPING_TABLE;

        try {
            // -----------------------------------------------------------------------
            // 2.1 ตารางที่ 1: Line Breakdown
            // -----------------------------------------------------------------------
            // ใส่ [] ครอบ Alias เพื่อความปลอดภัย
            $sumFields = "MAX(Master_Headcount) as [total_hc], 
                          SUM(Total_Registered) as [plan], 
                          SUM(Count_Present) as [present], 
                          SUM(Count_Late) as [late], 
                          SUM(Count_Absent) as [absent], 
                          SUM(Count_Leave) as [leave], 
                          SUM(Count_Actual) as [actual]";

            $sqlLine = "SELECT 
                            display_section AS line_name,
                            shift_name,
                            team_group,
                            category_name,
                            $sumFields
                        FROM $viewName
                        WHERE log_date = :date
                        GROUP BY display_section, section_id, shift_name, team_group, category_name
                        ORDER BY section_id, display_section, shift_name";
            $stmtLine = $pdo->prepare($sqlLine);
            $stmtLine->execute([':date' => $date]);
            $rawLineData = $stmtLine->fetchAll(PDO::FETCH_ASSOC);

            // -----------------------------------------------------------------------
            // 2.2 ตารางที่ 2: สรุปกะและทีม (Fix syntax error)
            // -----------------------------------------------------------------------
            $sqlShift = "SELECT 
                            COALESCE(M.shift_name, D.shift_name) as shift_name,
                            COALESCE(M.team_group, D.team_group) as team_group,
                            ISNULL(M.master_hc, 0) as [total_hc],
                            ISNULL(D.[plan], 0) as [plan],
                            ISNULL(D.[absent], 0) as [absent],
                            ISNULL(D.[actual], 0) as [actual]
                        FROM 
                        (
                            -- Part M: Master Count
                            SELECT 
                                S.shift_name,
                                ISNULL(E.team_group, '-') as team_group,
                                COUNT(E.emp_id) as master_hc
                            FROM $tableEmp E
                            -- [FIXED] เปลี่ยน E.shift_id เป็น E.default_shift_id
                            LEFT JOIN $tableShift S ON E.default_shift_id = S.shift_id 
                            WHERE E.is_active = 1
                            GROUP BY S.shift_name, E.team_group
                        ) M
                        FULL OUTER JOIN 
                        (
                            -- Part D: Daily View
                            SELECT 
                                shift_name,
                                team_group,
                                SUM(Total_Registered) as [plan],
                                SUM(Count_Absent) as [absent],
                                SUM(Count_Actual) as [actual]
                            FROM $viewName
                            WHERE log_date = :date
                            GROUP BY shift_name, team_group
                        ) D ON M.shift_name = D.shift_name AND M.team_group = D.team_group
                        ORDER BY shift_name, team_group";
            
            $stmtShift = $pdo->prepare($sqlShift);
            $stmtShift->execute([':date' => $date]);
            $tableByShiftTeam = $stmtShift->fetchAll(PDO::FETCH_ASSOC);

            // -----------------------------------------------------------------------
            // 2.3 ตารางที่ 3: ประเภทพนักงาน (Fix syntax error)
            // -----------------------------------------------------------------------
            $sqlType = "SELECT 
                            COALESCE(M.category_name, D.category_name) as emp_type,
                            ISNULL(M.master_hc, 0) as [total_hc],
                            ISNULL(D.[plan], 0) as [plan],   -- [FIX] ใส่ [] ตรงเรียกใช้ D.[plan]
                            ISNULL(D.[absent], 0) as [absent],
                            ISNULL(D.[actual], 0) as [actual]
                        FROM 
                        (
                            -- Part M: Master Count
                            SELECT 
                                ISNULL(CM.category_name, 'Other') as category_name,
                                COUNT(E.emp_id) as master_hc
                            FROM $tableEmp E
                            LEFT JOIN $tableCat CM ON E.position = CM.keyword
                            WHERE E.is_active = 1
                            GROUP BY ISNULL(CM.category_name, 'Other')
                        ) M
                        FULL OUTER JOIN 
                        (
                            -- Part D: Daily View
                            SELECT 
                                category_name,
                                SUM(Total_Registered) as [plan], -- [FIX] ใส่ [] ตอนตั้งชื่อ
                                SUM(Count_Absent) as [absent],
                                SUM(Count_Actual) as [actual]
                            FROM $viewName
                            WHERE log_date = :date
                            GROUP BY category_name
                        ) D ON M.category_name = D.category_name
                        ORDER BY [total_hc] DESC";

            $stmtType = $pdo->prepare($sqlType);
            $stmtType->execute([':date' => $date]);
            $tableByType = $stmtType->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'summary_drilldown' => $rawLineData,
                'summary_shift_team' => $tableByShiftTeam,
                'summary_by_type' => $tableByType,
                'last_update' => date('d/m/Y H:i:s')
            ]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }

    // ==================================================================================
    // 3. ACTION: get_summary (สำหรับ Drill Down Table ใหม่)
    // ==================================================================================
    } elseif ($action === 'get_summary') {
        $date = $_GET['date'] ?? date('Y-m-d');
        
        $viewName = IS_DEVELOPMENT ? 'vw_Manpower_Executive_Summary_TEST' : 'vw_Manpower_Executive_Summary';

        $sql = "SELECT * FROM $viewName 
                WHERE log_date = :log_date 
                ORDER BY display_section, shift_name, category_name";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':log_date' => $date]);
        $raw_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($raw_data);

    // ==================================================================================
    // 4. ACTION: update_log (แก้ไขสถานะรายคน)
    // ==================================================================================
    } elseif ($action === 'update_log') {
        if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");

        $logId  = $input['log_id'] ?? null;
        $status = $input['status'] ?? null;
        $remark = trim($input['remark'] ?? '');
        $shiftId = !empty($input['shift_id']) ? intval($input['shift_id']) : null;
        $scanIn  = !empty($input['scan_in_time']) ? $input['scan_in_time'] : null;
        $scanOut = !empty($input['scan_out_time']) ? $input['scan_out_time'] : null;

        if (!$logId || !$status) throw new Exception("Missing required fields.");

        // ตรวจสอบข้อมูลก่อนแก้
        $stmtCheck = $pdo->prepare("SELECT L.is_verified, E.line FROM " . MANPOWER_DAILY_LOGS_TABLE . " L JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id WHERE L.log_id = ?");
        $stmtCheck->execute([$logId]);
        $log = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$log) throw new Exception("Log not found.");
        
        // Supervisor แก้ได้เฉพาะ Line ตัวเอง
        if (hasRole('supervisor')) {
            $userLine = $currentUser['line'] ?? '';
            if ($log['line'] !== $userLine) throw new Exception("Permission Denied (Wrong Line).");
        }

        // เช็คการล็อกข้อมูล
        if ($log['is_verified'] == 1 && !hasRole(['admin', 'creator'])) {
            throw new Exception("Record is locked (Verified).");
        }

        $sql = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . " 
                SET status = ?, remark = ?, scan_in_time = ?, scan_out_time = ?, 
                    shift_id = ?, updated_by = ?, updated_at = GETDATE()
                WHERE log_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$status, $remark, $scanIn, $scanOut, $shiftId, $updatedBy, $logId]);

        // บันทึก Log การกระทำ
        $detail = "Manpower Update LogID:$logId Status:$status Shift:$shiftId";
        $stmtLog = $pdo->prepare("INSERT INTO " . USER_LOGS_TABLE . " (action_by, action_type, detail, created_at) VALUES (?, 'MANPOWER_EDIT', ?, GETDATE())");
        $stmtLog->execute([$updatedBy, $detail]);

        echo json_encode(['success' => true, 'message' => 'Update successful']);

    // ==================================================================================
    // 5. ACTION: clear_day (ลบข้อมูลทั้งวัน)
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
            // ลบเฉพาะ Line
            $sqlDeleteLog = "DELETE L FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                             INNER JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                             WHERE L.log_date = ? AND E.line = ?";
            
            $sqlDeleteCost .= " AND line = ?";
            $params[] = $line;
        }

        $stmt = $pdo->prepare($sqlDeleteLog);
        $stmt->execute($params);
        $deletedCount = $stmt->rowCount();

        // ลบ Cost ด้วย
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