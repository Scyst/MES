<?php
// MES/page/manpower/api/api_daily_operations.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// 1. Auth Check
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$currentUser = $_SESSION['user'];
$updatedBy = $currentUser['username'];

// 2. Input Handling
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? 'read_daily');

// 3. Performance
session_write_close();

try {
    switch ($action) {
        
        // ======================================================================
        // CASE: read_daily (ดึงข้อมูลรายวัน)
        // ======================================================================
        case 'read_daily':
            $startDate  = $_GET['startDate'] ?? ($_GET['date'] ?? date('Y-m-d'));
            $endDate    = $_GET['endDate']   ?? $startDate; 
            
            $lineFilter = isset($_GET['line']) ? trim($_GET['line']) : ''; 
            $empTypeFilter = isset($_GET['type']) ? trim($_GET['type']) : '';
            $empIdFilter = isset($_GET['emp_id']) ? trim($_GET['emp_id']) : '';

            $sql = "SELECT 
                        ISNULL(L.log_id, 0) as log_id,
                        ISNULL(CONVERT(VARCHAR(10), L.log_date, 120), :startDateDisp) as log_date,
                        CONVERT(VARCHAR(5), L.scan_in_time, 108) as in_time,   
                        CONVERT(VARCHAR(5), L.scan_out_time, 108) as out_time, 
                        
                        CASE 
                            WHEN L.status IS NOT NULL THEN L.status
                            WHEN :startDateCheck < CAST(GETDATE() AS DATE) THEN 'ABSENT'
                            ELSE 'WAITING'
                        END as status,

                        L.remark, 
                        E.emp_id, E.name_th, E.position, E.is_active,
                        ISNULL(L.actual_line, E.line) as line, 
                        ISNULL(L.actual_team, E.team_group) as team_group,
                        ISNULL(L.shift_id, E.default_shift_id) as shift_id,
                        ISNULL(S.shift_name, S_Master.shift_name) as shift_name,
                        E.default_shift_id,
                        
                        ISNULL(CM.rate_type, 'DAILY') as rate_type,

                        CAST(
                            CASE 
                                WHEN L.status IN ('PRESENT', 'LATE') THEN 
                                    (CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE (Rate.Hourly_Base * 8.0 * Rate.Work_Multiplier) END)
                                WHEN L.status IN ('SICK', 'VACATION', 'BUSINESS') THEN
                                    (CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE (Rate.Hourly_Base * 8.0) END)
                                ELSE 
                                    (CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE 0 END)
                            END
                        AS DECIMAL(10,2)) as normal_cost,

                        CAST(
                            CASE 
                                WHEN L.status IN ('PRESENT', 'LATE') THEN 
                                    (Final_OT.OT_Capped * Rate.Hourly_Base * Rate.OT_Multiplier)
                                ELSE 0
                            END
                        AS DECIMAL(10,2)) as ot_cost,

                        L.actual_line, L.actual_team, E.line as master_line, E.team_group as master_team,
                        
                        CASE 
                            WHEN L.scan_in_time IS NOT NULL AND L.scan_out_time IS NULL AND L.log_date < CAST(GETDATE() AS DATE) THEN 1 
                            ELSE 0 
                        END as is_forgot_out

                    FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                    LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S_Master ON E.default_shift_id = S_Master.shift_id
                    OUTER APPLY (
                        SELECT TOP 1 * FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " M 
                        WHERE E.position LIKE '%' + M.keyword + '%' 
                        ORDER BY LEN(M.keyword) DESC
                    ) CM
                    LEFT JOIN " . MANPOWER_DAILY_LOGS_TABLE . " L 
                        ON E.emp_id = L.emp_id 
                        AND L.log_date BETWEEN :start AND :end
                    LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id
                    LEFT JOIN dbo.MANPOWER_CALENDAR Cal ON (L.log_date = Cal.calendar_date OR Cal.calendar_date = :calDate)
                    CROSS APPLY (SELECT CASE WHEN CM.rate_type='MONTHLY_NO_OT' THEN 0.0 WHEN Cal.day_type='HOLIDAY' THEN 3.0 ELSE 1.5 END AS OT_Multiplier, CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN 0.0 ELSE 1.0 END AS Work_Multiplier, CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN COALESCE(CM.hourly_rate, 0)/30.0/8.0 WHEN CM.rate_type='DAILY' THEN COALESCE(CM.hourly_rate,0)/8.0 ELSE COALESCE(CM.hourly_rate,0) END AS Hourly_Base) AS Rate
                    CROSS APPLY (SELECT CAST(CONCAT(ISNULL(L.log_date, :t0Date), ' ', ISNULL(S.start_time, S_Master.start_time)) AS DATETIME) AS Shift_Start) AS T0
                    CROSS APPLY (
                        SELECT CASE 
                            WHEN L.scan_out_time IS NOT NULL THEN L.scan_out_time 
                            WHEN L.log_date < CAST(GETDATE() AS DATE) THEN T0.Shift_Start 
                            ELSE GETDATE() 
                        END AS Calc_End_Time
                    ) AS T1
                    CROSS APPLY (SELECT DATEDIFF(MINUTE, T0.Shift_Start, T1.Calc_End_Time) AS Total_Minutes) AS T2
                    CROSS APPLY (SELECT CASE WHEN T2.Total_Minutes > 570 THEN FLOOR((T2.Total_Minutes - 570) / 30.0) * 0.5 ELSE 0 END AS OT_Hours) AS Step_OT
                    CROSS APPLY (SELECT CASE WHEN L.log_date < CAST(GETDATE() AS DATE) AND L.scan_out_time IS NULL THEN 0 WHEN Step_OT.OT_Hours > 6 THEN 6 ELSE Step_OT.OT_Hours END AS OT_Capped) AS Final_OT
                    WHERE (E.is_active = 1 OR L.log_id IS NOT NULL)
                        AND (L.log_id IS NOT NULL OR (E.created_at IS NULL OR CAST(E.created_at AS DATE) <= :createDateCheck))
                    ";
            
            $params = [
                ':startDateDisp' => $startDate, ':startDateCheck' => $startDate, ':start' => $startDate, ':end' => $endDate,
                ':calDate' => $startDate, ':t0Date' => $startDate, ':createDateCheck' => $startDate
            ];

            if (!empty($lineFilter) && $lineFilter !== 'ALL' && $lineFilter !== 'undefined' && $lineFilter !== 'null') {
                $sql .= " AND ISNULL(L.actual_line, E.line) = :line";
                $params[':line'] = $lineFilter;
            }

            if (!empty($empTypeFilter) && $empTypeFilter !== 'ALL' && $empTypeFilter !== 'undefined') {
                if ($empTypeFilter === 'Other') {
                    $sql .= " AND (CM.category_name IS NULL)";
                } else {
                    $sql .= " AND (CM.category_name = :empType)";
                    $params[':empType'] = $empTypeFilter;
                }
            }

            if (!empty($empIdFilter)) {
                $sql .= " AND E.emp_id = :empIdFilter";
                $params[':empIdFilter'] = $empIdFilter;
            }

            // 🔥 [FIXED] ย้าย ORDER BY มาไว้ท้ายสุดตรงนี้
            $sql .= " ORDER BY line ASC, E.emp_id ASC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calc Summary
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
                elseif (in_array($st, ['SICK', 'BUSINESS', 'VACATION', 'LEAVE', 'OTHER'])) $summary['leave']++;
                else $summary['other']++;
            }
            $summary['other_total'] = $summary['late'] + $summary['leave'] + $summary['other'] + $summary['waiting'];

            echo json_encode(['success' => true, 'data' => $data, 'summary' => $summary]);
            break;

        // ======================================================================
        // CASE: read_summary (Dashboard Graph & Table) - อัปเกรดใหม่รองรับ Payment
        // ======================================================================
        case 'read_summary':
            $date = $_GET['date'] ?? date('Y-m-d');
            
            $sql = "SELECT 
                        ISNULL(L.actual_line, E.line) as line_name,
                        ISNULL(S.shift_name, S_Master.shift_name) as shift_name,
                        ISNULL(L.actual_team, E.team_group) as team_group,
                        ISNULL(CM.category_name, 'General') as emp_type,
                        ISNULL(CM.rate_type, 'DAILY') as rate_type,

                        COUNT(E.emp_id) as total_hc,
                        SUM(CASE WHEN E.is_active = 1 THEN 1 ELSE 0 END) as plan_count,
                        
                        SUM(CASE WHEN L.status = 'PRESENT' THEN 1 ELSE 0 END) as present,
                        SUM(CASE WHEN L.status = 'LATE' THEN 1 ELSE 0 END) as late,
                        SUM(CASE WHEN L.status = 'ABSENT' THEN 1 ELSE 0 END) as absent,
                        SUM(CASE WHEN L.status IN ('SICK','BUSINESS','VACATION') THEN 1 ELSE 0 END) as leave,
                        SUM(CASE WHEN L.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END) as actual,

                        SUM(CAST(
                            CASE 
                                WHEN L.status IN ('PRESENT', 'LATE') THEN 
                                    CASE 
                                        WHEN CM.rate_type = 'MONTHLY_NO_OT' THEN (CM.hourly_rate / 30.0)
                                        WHEN CM.rate_type LIKE 'MONTHLY%' THEN 
                                            (CM.hourly_rate / 30.0) + 
                                            (CASE WHEN Cal.day_type = 'HOLIDAY' THEN (Rate.Hourly_Base * 8.0 * (Rate.Work_Multiplier - 1.0)) ELSE 0 END)
                                        ELSE (Rate.Hourly_Base * 8.0 * Rate.Work_Multiplier) 
                                    END

                                WHEN L.status IN ('SICK', 'VACATION', 'BUSINESS') THEN
                                    CASE 
                                        WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) 
                                        ELSE (Rate.Hourly_Base * 8.0) 
                                    END

                                ELSE 
                                    CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE 0 END
                            END
                        AS DECIMAL(10,2))) as normal_cost,

                        SUM(CAST(
                            CASE 
                                WHEN L.status IN ('PRESENT', 'LATE') THEN 
                                    (Final_OT.OT_Capped * Rate.Hourly_Base * Rate.OT_Multiplier)
                                ELSE 0
                            END
                        AS DECIMAL(10,2))) as ot_cost,

                        SUM(CAST(
                            (
                                CASE 
                                    WHEN L.status IN ('PRESENT', 'LATE') THEN 
                                        CASE 
                                            WHEN CM.rate_type = 'MONTHLY_NO_OT' THEN (CM.hourly_rate / 30.0)
                                            WHEN CM.rate_type LIKE 'MONTHLY%' THEN 
                                                (CM.hourly_rate / 30.0) + (CASE WHEN Cal.day_type = 'HOLIDAY' THEN (Rate.Hourly_Base * 8.0 * (Rate.Work_Multiplier - 1.0)) ELSE 0 END)
                                            ELSE (Rate.Hourly_Base * 8.0 * Rate.Work_Multiplier) 
                                        END
                                    WHEN L.status IN ('SICK', 'VACATION', 'BUSINESS') THEN
                                        CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE (Rate.Hourly_Base * 8.0) END
                                    ELSE 
                                        CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CM.hourly_rate / 30.0) ELSE 0 END
                                END
                            ) + 
                            (
                                CASE 
                                    WHEN L.status IN ('PRESENT', 'LATE') THEN (Final_OT.OT_Capped * Rate.Hourly_Base * Rate.OT_Multiplier)
                                    ELSE 0
                                END
                            )
                        AS DECIMAL(10,2))) as total_cost

                    FROM " . MANPOWER_EMPLOYEES_TABLE . " E
                    LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S_Master ON E.default_shift_id = S_Master.shift_id
                    OUTER APPLY (
                        SELECT TOP 1 * FROM " . MANPOWER_CATEGORY_MAPPING_TABLE . " M 
                        WHERE E.position LIKE '%' + M.keyword + '%' 
                        ORDER BY LEN(M.keyword) DESC
                    ) CM
                    LEFT JOIN " . MANPOWER_DAILY_LOGS_TABLE . " L 
                        ON E.emp_id = L.emp_id AND L.log_date = :date
                    LEFT JOIN " . MANPOWER_SHIFTS_TABLE . " S ON L.shift_id = S.shift_id
                    
                    LEFT JOIN dbo.MANPOWER_CALENDAR Cal ON (L.log_date = Cal.calendar_date OR Cal.calendar_date = :calDate)
                    
                    CROSS APPLY (
                        SELECT 
                            CASE 
                                WHEN CM.rate_type='MONTHLY_NO_OT' THEN 0.0 
                                WHEN Cal.day_type='HOLIDAY' THEN ISNULL(Cal.ot_rate_holiday, 3.0) 
                                ELSE 1.5 
                            END AS OT_Multiplier, 
                            
                            CASE 
                                WHEN CM.rate_type LIKE 'MONTHLY%' THEN 0.0
                                WHEN Cal.day_type='HOLIDAY' THEN ISNULL(Cal.work_rate_holiday, 2.0) 
                                ELSE 1.0 
                            END AS Work_Multiplier, 
                            
                            CASE 
                                WHEN CM.rate_type LIKE 'MONTHLY%' THEN COALESCE(CM.hourly_rate, 0)/30.0/8.0 
                                WHEN CM.rate_type='DAILY' THEN COALESCE(CM.hourly_rate,0)/8.0 
                                ELSE COALESCE(CM.hourly_rate,0) 
                            END AS Hourly_Base
                    ) AS Rate

                    CROSS APPLY (SELECT CAST(CONCAT(ISNULL(L.log_date, :t0Date), ' ', ISNULL(S.start_time, S_Master.start_time)) AS DATETIME) AS Shift_Start) AS T0
                    CROSS APPLY (
                        SELECT CASE 
                            WHEN L.scan_out_time IS NOT NULL THEN L.scan_out_time 
                            WHEN L.log_date < CAST(GETDATE() AS DATE) THEN T0.Shift_Start 
                            ELSE GETDATE() 
                        END AS Calc_End_Time
                    ) AS T1
                    CROSS APPLY (SELECT DATEDIFF(MINUTE, T0.Shift_Start, T1.Calc_End_Time) AS Total_Minutes) AS T2
                    CROSS APPLY (SELECT CASE WHEN T2.Total_Minutes > 570 THEN FLOOR((T2.Total_Minutes - 570) / 30.0) * 0.5 ELSE 0 END AS OT_Hours) AS Step_OT
                    CROSS APPLY (SELECT CASE WHEN L.log_date < CAST(GETDATE() AS DATE) AND L.scan_out_time IS NULL THEN 0 WHEN Step_OT.OT_Hours > 6 THEN 6 ELSE Step_OT.OT_Hours END AS OT_Capped) AS Final_OT
                    
                    WHERE (E.is_active = 1 OR L.log_id IS NOT NULL)
                      AND (L.log_id IS NOT NULL OR (E.created_at IS NULL OR CAST(E.created_at AS DATE) <= :createDateCheck))
                    
                    GROUP BY 
                        ISNULL(L.actual_line, E.line),
                        ISNULL(S.shift_name, S_Master.shift_name),
                        ISNULL(L.actual_team, E.team_group),
                        ISNULL(CM.category_name, 'General'),
                        ISNULL(CM.rate_type, 'DAILY')
                    
                    ORDER BY line_name, shift_name";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':date' => $date, 
                ':calDate' => $date, 
                ':t0Date' => $date, 
                ':createDateCheck' => $date
            ]);
            $rawData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $finalData = array_map(function($row) {
                return [
                    'line_name' => $row['line_name'],
                    'shift_name' => $row['shift_name'],
                    'team_group' => $row['team_group'],
                    'emp_type' => $row['emp_type'],
                    'rate_type' => $row['rate_type'],
                    'total_hc' => $row['total_hc'],
                    'plan' => $row['total_hc'],
                    'present' => $row['present'],
                    'late' => $row['late'],
                    'absent' => $row['absent'],
                    'leave' => $row['leave'],
                    'total_cost' => $row['total_cost'],
                    'normal_cost' => $row['normal_cost'],
                    'ot_cost' => $row['ot_cost']
                ];
            }, $rawData);

            echo json_encode(['success' => true, 'raw_data' => $finalData, 'last_update' => date('d/m/Y H:i:s')]);
            break;

        // ======================================================================
        // CASE: clear_day (Admin Only)
        // ======================================================================
        case 'clear_day':
            if (!hasRole(['admin', 'creator'])) throw new Exception("Unauthorized.");

            $date = $input['date'] ?? '';
            $line = $input['line'] ?? '';

            if (empty($date)) throw new Exception("Date is required.");

            $pdo->beginTransaction();

            if (!empty($line) && $line !== 'ALL') {
                $sql = "DELETE L FROM " . MANPOWER_DAILY_LOGS_TABLE . " L
                        LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E ON L.emp_id = E.emp_id
                        WHERE L.log_date = ? AND (L.actual_line = ? OR E.line = ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$date, $line, $line]);
            } else {
                $stmt = $pdo->prepare("DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_date = ?");
                $stmt->execute([$date]);
            }
            
            $deletedCount = $stmt->rowCount();
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => "Cleared $deletedCount records."]);
            break;

        // ======================================================================
        // CASE: update_log_status (Quick Update)
        // ======================================================================
        case 'update_log_status':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");

            $logId  = $input['log_id'] ?? '';
            $status = $input['status'] ?? '';
            $remark = $input['remark'] ?? '';

            if (empty($logId) || empty($status)) throw new Exception("Missing parameters");

            // Get Date for Recalc
            $stmtDate = $pdo->prepare("SELECT log_date FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_id = ?");
            $stmtDate->execute([$logId]);
            $rowDate = $stmtDate->fetch(PDO::FETCH_ASSOC);

            // Update
            $sql = "UPDATE " . MANPOWER_DAILY_LOGS_TABLE . "
                SET status = ?, remark = ?, updated_at = GETDATE(), updated_by = ?, is_verified = 1 
                WHERE log_id = ?";
            $pdo->prepare($sql)->execute([$status, $remark, $updatedBy, $logId]);

            // Recalc
            if ($rowDate) {
                $pdo->prepare("EXEC sp_CalculateDailyCost @StartDate = ?, @EndDate = ?")->execute([$rowDate['log_date'], $rowDate['log_date']]);
            }

            echo json_encode(['success' => true, 'message' => 'Updated successfully']);
            break;

        // ======================================================================
        // CASE: delete_log (Delete Individual)
        // ======================================================================
        case 'delete_log':
            if (!hasRole(['admin', 'creator', 'supervisor'])) throw new Exception("Unauthorized");

            $logId = $input['log_id'] ?? '';
            if (empty($logId)) throw new Exception("Missing Log ID");

            $stmtCheck = $pdo->prepare("SELECT status, log_date FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_id = ?");
            $stmtCheck->execute([$logId]);
            $log = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if (!$log) throw new Exception("Record not found.");
            
            if (in_array($log['status'], ['PRESENT', 'LATE']) && !hasRole('admin')) {
                throw new Exception("ไม่สามารถลบรายการที่มีการสแกนเข้างานแล้วได้");
            }

            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM " . MANPOWER_DAILY_LOGS_TABLE . " WHERE log_id = ?")->execute([$logId]);
            $pdo->prepare("INSERT INTO " . USER_LOGS_TABLE . " (action_by, action_type, detail, created_at) VALUES (?, 'MANPOWER_DELETE_LOG', ?, GETDATE())")->execute([$updatedBy, "Deleted Log ID: $logId"]);
            $pdo->commit();

            // Recalc
            $pdo->prepare("EXEC sp_CalculateDailyCost @StartDate = ?, @EndDate = ?")->execute([$log['log_date'], $log['log_date']]);

            echo json_encode(['success' => true, 'message' => 'Record deleted successfully']);
            break;

        // ======================================================================
        // CASE: read_trend (ดึงข้อมูลกราฟย้อนหลัง)
        // ======================================================================
        case 'read_trend':
            // 1. รับค่า Date Range (Default ย้อนหลัง 7 วัน)
            $endDateStr   = $_GET['endDate']   ?? date('Y-m-d');
            $startDateStr = $_GET['startDate'] ?? date('Y-m-d', strtotime('-6 days'));
            
            // 2. ชื่อฟังก์ชัน SQL (ตาม Environment)
            $funcName = IS_DEVELOPMENT ? 'fn_GetManpowerSummary_TEST' : 'fn_GetManpowerSummary';

            // 3. SQL Query: ใช้ Recursive CTE สร้างวันที่ แล้ว Cross Apply ฟังก์ชัน
            // หมายเหตุ: ใช้ WITH (NOLOCK) ในฟังก์ชันไม่ได้โดยตรง แต่ Table ในฟังก์ชันควรมีอยู่แล้ว 
            // หรือเรายอมรับ Dirty Read ได้เล็กน้อยสำหรับ Dashboard
            $sql = "
                WITH DateRange AS (
                    SELECT CAST(:start AS DATE) AS SummaryDate
                    UNION ALL
                    SELECT DATEADD(DAY, 1, SummaryDate)
                    FROM DateRange
                    WHERE SummaryDate < CAST(:end AS DATE)
                )
                SELECT 
                    FORMAT(d.SummaryDate, 'dd/MM') as display_date,
                    d.SummaryDate as raw_date,
                    SUM(f.Total_Registered) as total_plan,
                    SUM(f.Count_Actual) as total_actual,
                    SUM(f.Count_Absent) as total_absent,
                    SUM(f.Count_Late) as total_late,
                    SUM(f.Count_Leave) as total_leave
                FROM DateRange d
                CROSS APPLY $funcName(d.SummaryDate) f
                GROUP BY d.SummaryDate
                ORDER BY d.SummaryDate ASC
                OPTION (MAXRECURSION 366); -- ป้องกัน Infinite Loop
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':start' => $startDateStr, 
                ':end'   => $endDateStr
            ]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // ======================================================================
        // CASE: export_history (ดึงข้อมูลสรุปแยก Line/Shift ตามช่วงเวลา)
        // ======================================================================
        case 'export_history':
            $endDateStr   = $_GET['endDate']   ?? date('Y-m-d');
            $startDateStr = $_GET['startDate'] ?? date('Y-m-d', strtotime('-6 days'));
            $funcName     = IS_DEVELOPMENT ? 'fn_GetManpowerSummary_TEST' : 'fn_GetManpowerSummary';

            // Query นี้จะดึงข้อมูลละเอียดระดับ Line/Shift/Team ของทุกวันในช่วงเวลา
            $sql = "
                WITH DateRange AS (
                    SELECT CAST(:start AS DATE) AS SummaryDate
                    UNION ALL
                    SELECT DATEADD(DAY, 1, SummaryDate)
                    FROM DateRange
                    WHERE SummaryDate < CAST(:end AS DATE)
                )
                SELECT 
                    CONVERT(VARCHAR(10), d.SummaryDate, 120) as [Date],
                    f.display_section as [Line],
                    f.shift_name as [Shift],
                    f.team_group as [Team],
                    f.Total_Registered as [Plan (HC)],
                    f.Count_Present as [Present],
                    f.Count_Late as [Late],
                    f.Count_Absent as [Absent],
                    f.Count_Leave as [Leave],
                    f.Count_Actual as [Actual (Present+Late)],
                    (f.Count_Present + f.Count_Late + f.Count_Absent + f.Count_Leave) as [Total_Accounted],
                    f.Total_Cost as [Est_Cost]
                FROM DateRange d
                CROSS APPLY $funcName(d.SummaryDate) f
                ORDER BY d.SummaryDate DESC, f.section_id ASC, f.shift_name ASC
                OPTION (MAXRECURSION 366);
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([':start' => $startDateStr, ':end' => $endDateStr]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // ======================================================================
        // DEFAULT: Error
        // ======================================================================
        default:
            throw new Exception("Invalid Action: " . htmlspecialchars($action));
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>