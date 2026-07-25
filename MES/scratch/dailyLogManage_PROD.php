<?php
// MES/page/dailyLog/api/dailyLogManage.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$response = ['success' => false, 'message' => 'Invalid action'];

try {
    $userId = $_SESSION['user']['id'];
    $userRole = $_SESSION['user']['role'];
    $currentDate = date('Y-m-d');
    $tableName = OPERATOR_LOGS_TABLE;

    switch ($action) {
        
        // =====================================================================
        // CASE: GET INITIAL DATA (โหลดข้อมูลปฏิทิน & Dashboard)
        // =====================================================================
        

        case 'get_morning_brief':
            $userRole = $_SESSION['user']['role'] ?? 'guest';
            if (!in_array($userRole, ['admin', 'creator', 'supervisor'])) {
                throw new Exception("Permission denied");
            }
            $reqTeam = $_POST['team'] ?? ($_SESSION['user']['team_group'] ?? null);
            if ($reqTeam === 'ALL') $reqTeam = null;

            $currentHour = (int)date('H');
            $actualProdDate = ($currentHour < 8) ? date('Y-m-d', strtotime('-1 day')) : date('Y-m-d');
            $yesterday = date('Y-m-d', strtotime('-1 day', strtotime($actualProdDate)));
            
            // --- [1] Manpower Data ---
            $mpQuery = "SELECT COUNT(L.emp_id) as total,
                SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE') THEN 1 ELSE 0 END) as leave_count
                FROM MANPOWER_DAILY_LOGS L WITH (NOLOCK) 
                LEFT JOIN MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
                LEFT JOIN MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                WHERE L.log_date = ? AND L.status != 'GHOST'";
            $mpParams = [$yesterday];
            if (!empty($reqTeam)) {
                $mpQuery .= " AND ISNULL(TS.hc_group, '') = ?";
                $mpParams[] = $reqTeam;
            }
            $stmtMp = $pdo->prepare($mpQuery);
            $stmtMp->execute($mpParams);
            $mp = $stmtMp->fetch();

            // --- [2] Labor Cost ---
            $costQuery = "SELECT ISNULL(SUM(Normal_Cost + OT_Cost), 0) as total_dlot,
                ISNULL(SUM(OT_Cost), 0) as total_ot,
                ISNULL(SUM(CASE WHEN rate_type = 'DAILY' THEN Normal_Cost ELSE 0 END), 0) as daily_dl
                FROM dbo.fn_GetManpowerSummary_V2(?)";
            $costParams = [$yesterday];
            if (!empty($reqTeam)) {
                $costQuery .= " WHERE hc_group = ?";
                $costParams[] = $reqTeam;
            }
            $stmtCost = $pdo->prepare($costQuery);
            $stmtCost->execute($costParams);
            $cost = $stmtCost->fetch();

            // --- [3] Utilities Cost ---
            $stmtUtil = $pdo->prepare("SELECT 
                ISNULL(SUM(CASE WHEN m.utility_type = 'ELECTRIC' THEN s.calculated_cost ELSE 0 END), 0) as elec_cost,
                ISNULL(SUM(CASE WHEN m.utility_type = 'LPG' THEN s.calculated_cost ELSE 0 END), 0) as gas_cost
                FROM UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
                JOIN UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
                WHERE s.log_date = ? AND m.is_active = 1 AND m.meter_name != 'MDB'");
            $stmtUtil->execute([$yesterday]);
            $util = $stmtUtil->fetch();

            // --- [4] Production & Revenue ---
            $prodQuery = "SELECT 
                ISNULL(r.model, i.part_no) as model_name,
                SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as fg,
                SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) as hold,
                SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as scrap,
                SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN 
                    t.quantity * CASE 
                        WHEN ISNULL(t.std_price_usd_snapshot, 0) > 0 THEN (t.std_price_usd_snapshot * ISNULL(cal.exchange_rate, 32.0))
                        ELSE ISNULL(t.std_price_snapshot, i.StandardPrice) 
                    END
                ELSE 0 END) as revenue
                FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
                JOIN ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
                LEFT JOIN MANUFACTURING_ROUTES r WITH (NOLOCK) ON i.item_id = r.item_id
                LEFT JOIN MANPOWER_CALENDAR cal WITH (NOLOCK) ON cal.calendar_date = CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
                LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) = ?
                AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                AND i.material_type = 'FG'";
            $prodParams = [$yesterday];
            if (!empty($reqTeam)) {
                $prodQuery .= " AND (u.team_group = ? OR t.notes LIKE ?)";
                $prodParams[] = $reqTeam;
                $prodParams[] = '%[[]TEAM_OVERRIDE: ' . $reqTeam . ']%';
            }
            $prodQuery .= " GROUP BY ISNULL(r.model, i.part_no)
                            HAVING SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) > 0";
            
            $stmtProd = $pdo->prepare($prodQuery);
            $stmtProd->execute($prodParams);
            $prodList = $stmtProd->fetchAll();

            $totalRevenue = 0;
            foreach($prodList as $p) { $totalRevenue += $p['revenue']; }

            // --- [5] Mood Avg ---
            $moodQuery = "SELECT ISNULL(AVG(CAST(l.mood_score AS FLOAT)), 0) as avg_mood 
                          FROM OPERATOR_DAILY_LOGS l WITH (NOLOCK) 
                          LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON l.user_id = u.id
                          WHERE l.log_date = ? AND l.mood_score > 0";
            $moodParams = [$yesterday];
            if (!empty($reqTeam)) {
                $moodQuery .= " AND u.team_group = ?";
                $moodParams[] = $reqTeam;
            }
            $stmtMood = $pdo->prepare($moodQuery);
            $stmtMood->execute($moodParams);
            $moodYesterday = $stmtMood->fetchColumn();

            $morningBrief = [
                'date_text' => date('d/m/Y', strtotime($yesterday)),
                'mp_total' => $mp['total'] ?? 0,
                'mp_present' => $mp['present'] ?? 0,
                'mp_leave' => $mp['leave_count'] ?? 0,
                'dlot_total' => number_format($cost['total_dlot'], 0),
                'dl_daily' => number_format($cost['daily_dl'], 0),
                'ot_total' => number_format($cost['total_ot'], 0),
                'elec_cost' => number_format($util['elec_cost'], 0),
                'gas_cost' => number_format($util['gas_cost'], 0),
                'revenue' => number_format($totalRevenue, 2),
                'models' => $prodList,
                'mood_avg' => $moodYesterday
            ];

            $response = ['success' => true, 'data' => $morningBrief];
            break;


        case 'get_initial_data':
            $startOfMonth = date('Y-m-01');
            $endOfMonth = date('Y-m-t');

            $monthlyData = [];
            $replyCount = 0;
            // [NEW] เพิ่มตัวแปรเก็บวันที่ที่ยังไม่ได้อ่าน ส่งไปให้ Frontend ไฮไลท์
            $unreadDates = []; 

            // [UPDATED] เพิ่ม is_read_by_user ใน SELECT
            $sql = "SELECT log_date, period_id, mood_score, production_qty, note, reply_message, reply_by, is_read_by_user 
                    FROM {$tableName} 
                    WHERE user_id = ? AND log_date BETWEEN ? AND ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $startOfMonth, $endOfMonth]);
            
            while ($row = $stmt->fetch()) {
                // [UPDATED Logic] นับเฉพาะที่มีข้อความตอบกลับ และ ยังไม่ได้อ่าน (0)
                if (!empty($row['reply_message']) && $row['is_read_by_user'] == 0) {
                    $replyCount++;
                    $unreadDates[] = $row['log_date']; // เก็บวันที่ไว้
                }

                $monthlyData[$row['log_date']][$row['period_id']] = [
                    'mood' => $row['mood_score'],
                    'qty' => $row['production_qty'],
                    'note' => $row['note'],
                    'reply_message' => $row['reply_message'], 
                    'reply_by' => $row['reply_by'],
                    'is_read' => $row['is_read_by_user']
                ];
            }

            // 1.2 Dashboard Data (เฉพาะคนที่มีสิทธิ์ดูภาพรวม)
            $dashboardData = [];
            $factoryMood = ['total' => 0, 'sum' => 0, 'avg' => 0];
            
            if (hasPermission('view_mood')) {
                $usersTable = USERS_TABLE;
                // l.* จะดึง reply_message มาด้วยโดยอัตโนมัติ
                $sqlDash = "SELECT l.*, u.username, u.emp_id, u.line 
                            FROM {$tableName} l 
                            JOIN {$usersTable} u ON l.user_id = u.id 
                            WHERE l.log_date = ? 
                            ORDER BY u.line, u.username, l.period_id";
                $stmtDash = $pdo->prepare($sqlDash);
                $stmtDash->execute([$currentDate]);
                
                foreach ($stmtDash->fetchAll() as $log) {
                    $u = $log['username'];
                    $dashboardData[$u]['info'] = ['emp_id' => $log['emp_id'], 'line' => $log['line']];
                    $dashboardData[$u]['logs'][$log['period_id']] = $log;
                    
                    if ($log['mood_score'] > 0) { // นับเฉพาะที่มีคะแนน
                        $factoryMood['total']++;
                        $factoryMood['sum'] += $log['mood_score'];
                    }
                }
                
                if ($factoryMood['total'] > 0) {
                    $factoryMood['avg'] = $factoryMood['sum'] / $factoryMood['total'];
                }
            }


        // [NEW] 1.3 Morning Brief Data
        $morningBrief = null;
        if (in_array($userRole, ['admin', 'creator', 'supervisor'])) {
                
                $currentHour = (int)date('H');
                $actualProdDate = ($currentHour < 8) ? date('Y-m-d', strtotime('-1 day')) : date('Y-m-d');
                $yesterday = date('Y-m-d', strtotime('-1 day', strtotime($actualProdDate)));
                
                $myTeam = $_SESSION['user']['team_group'] ?? null;

                // --- [1] Manpower Data ---
                $mpQuery = "SELECT 
                    COUNT(L.emp_id) as total,
                    SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE') THEN 1 ELSE 0 END) as leave_count
                    FROM MANPOWER_DAILY_LOGS L WITH (NOLOCK) 
                    LEFT JOIN MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
                    LEFT JOIN MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                    WHERE L.log_date = ? AND L.status != 'GHOST'";
                $mpParams = [$yesterday];

                if (!empty($myTeam)) {
                    $mpQuery .= " AND ISNULL(TS.hc_group, '') = ?";
                    $mpParams[] = $myTeam;
                }

                $stmtMp = $pdo->prepare($mpQuery);
                $stmtMp->execute($mpParams);
                $mp = $stmtMp->fetch();

                // --- [2] Labor Cost ---
                $costQuery = "SELECT 
                    ISNULL(SUM(Normal_Cost + OT_Cost), 0) as total_dlot,
                    ISNULL(SUM(OT_Cost), 0) as total_ot,
                    ISNULL(SUM(CASE WHEN rate_type = 'DAILY' THEN Normal_Cost ELSE 0 END), 0) as daily_dl
                    FROM dbo.fn_GetManpowerSummary_V2(?)";
                $costParams = [$yesterday];

                if (!empty($myTeam)) {
                    $costQuery .= " WHERE hc_group = ?";
                    $costParams[] = $myTeam;
                }

                $stmtCost = $pdo->prepare($costQuery);
                $stmtCost->execute($costParams);
                $cost = $stmtCost->fetch();

                // --- [3] Utilities Cost (ค่าไฟ / ค่าแก๊ส) ---
                $stmtUtil = $pdo->prepare("SELECT 
                    ISNULL(SUM(CASE WHEN m.utility_type = 'ELECTRIC' THEN s.calculated_cost ELSE 0 END), 0) as elec_cost,
                    ISNULL(SUM(CASE WHEN m.utility_type = 'LPG' THEN s.calculated_cost ELSE 0 END), 0) as gas_cost
                    FROM UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
                    JOIN UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
                    WHERE s.log_date = ? AND m.is_active = 1 AND m.meter_name != 'MDB'");
                $stmtUtil->execute([$yesterday]);
                $util = $stmtUtil->fetch();

                // --- [4] Production & Revenue (กรองเฉพาะ FG) ---
                $prodQuery = "SELECT 
                    ISNULL(r.model, i.part_no) as model_name,
                    SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as fg,
                    SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) as hold,
                    SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as scrap,
                    SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN 
                        t.quantity * CASE 
                            WHEN ISNULL(t.std_price_usd_snapshot, 0) > 0 THEN (t.std_price_usd_snapshot * ISNULL(cal.exchange_rate, 32.0))
                            ELSE ISNULL(t.std_price_snapshot, i.StandardPrice) 
                        END
                    ELSE 0 END) as revenue
                    FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
                    JOIN ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
                    LEFT JOIN MANUFACTURING_ROUTES r WITH (NOLOCK) ON i.item_id = r.item_id
                    LEFT JOIN MANPOWER_CALENDAR cal WITH (NOLOCK) ON cal.calendar_date = CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
                    LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON t.created_by_user_id = u.id
                    WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) = ?
                    AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
                    AND i.material_type = 'FG'";
                $prodParams = [$yesterday];
                if (!empty($myTeam)) {
                    $prodQuery .= " AND (u.team_group = ? OR t.notes LIKE ?)";
                    $prodParams[] = $myTeam;
                    $prodParams[] = '%[[]TEAM_OVERRIDE: ' . $myTeam . ']%';
                }
                $prodQuery .= " GROUP BY ISNULL(r.model, i.part_no)
                                HAVING SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) > 0";
                
                $stmtProd = $pdo->prepare($prodQuery);
                $stmtProd->execute($prodParams);
                $prodList = $stmtProd->fetchAll();

                $totalRevenue = 0;
                foreach($prodList as $p) { 
                    $totalRevenue += $p['revenue']; 
                }

                // --- [5] Mood Avg ---
                $moodQuery = "SELECT ISNULL(AVG(CAST(l.mood_score AS FLOAT)), 0) as avg_mood 
                              FROM OPERATOR_DAILY_LOGS l WITH (NOLOCK) 
                              LEFT JOIN " . USERS_TABLE . " u WITH (NOLOCK) ON l.user_id = u.id
                              WHERE l.log_date = ? AND l.mood_score > 0";
                $moodParams = [$yesterday];
                if (!empty($myTeam)) {
                    $moodQuery .= " AND u.team_group = ?";
                    $moodParams[] = $myTeam;
                }
                $stmtMood = $pdo->prepare($moodQuery);
                $stmtMood->execute($moodParams);
                $moodYesterday = $stmtMood->fetchColumn();

                $morningBrief = [
                    'date_text' => date('d/m/Y', strtotime($yesterday)),
                    'mp_total' => $mp['total'] ?? 0,
                    'mp_present' => $mp['present'] ?? 0,
                    'mp_leave' => $mp['leave_count'] ?? 0,
                    'dlot_total' => number_format($cost['total_dlot'], 0),
                    'dl_daily' => number_format($cost['daily_dl'], 0),
                    'ot_total' => number_format($cost['total_ot'], 0),
                    'elec_cost' => number_format($util['elec_cost'], 0),
                    'gas_cost' => number_format($util['gas_cost'], 0),
                    'revenue' => number_format($totalRevenue, 2),
                    'models' => $prodList,
                    'mood_avg' => $moodYesterday
                ];
            }

            $response = [
                'success' => true,
                'data' => [
                    'monthlyData' => $monthlyData,
                    'todayLogs' => $monthlyData[$currentDate] ?? [],
                    'replyCount' => $replyCount,
                    'unreadDates' => array_unique($unreadDates),
                    'dashboardData' => $dashboardData,
                    'factoryMood' => $factoryMood,
                    'userRole' => $userRole,
                    'morningBrief' => $morningBrief
                ]
            ];
            break;

        // =====================================================================
        // CASE: SAVE LOG (บันทึกข้อมูลฝั่งพนักงาน)
        // =====================================================================
        case 'save_log':
            $targetDate = $_POST['target_date'] ?? null;
            $period = $_POST['period_id'] ?? null;
            $mood = $_POST['mood_score'] ?? null;
            $qty = !empty($_POST['production_qty']) ? $_POST['production_qty'] : 0;
            $note = $_POST['note'] ?? '';

            if (!$targetDate || !$period || !$mood) {
                throw new Exception("ข้อมูลไม่ครบถ้วน (Date/Period/Mood)");
            }

            // MERGE Logic: ถ้ามี update, ถ้าไม่มี insert
            // การ Update ตรงนี้จะไม่ยุ่งกับ Column reply_message ที่ Admin ตอบมา
            $sql = "MERGE INTO {$tableName} AS T
                    USING (SELECT ? AS log_date, ? AS user_id, ? AS period_id) AS S
                    ON (T.log_date = S.log_date AND T.user_id = S.user_id AND T.period_id = S.period_id)
                    WHEN MATCHED THEN
                        UPDATE SET mood_score = ?, production_qty = ?, note = ?, created_at = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (log_date, user_id, period_id, mood_score, production_qty, note)
                        VALUES (?, ?, ?, ?, ?, ?);";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $targetDate, $userId, $period,        // USING
                $mood, $qty, $note,                   // UPDATE
                $targetDate, $userId, $period, $mood, $qty, $note // INSERT
            ]);

            $response = ['success' => true, 'message' => "บันทึกข้อมูลสำเร็จ!"];
            break;

        // =====================================================================
        // MARK AS READ (เมื่อพนักงานกดอ่าน)
        // =====================================================================
        case 'mark_as_read':
            $logDate = $_POST['log_date'] ?? null;
            $periodId = $_POST['period_id'] ?? null;

            if ($logDate && $periodId) {
                $sql = "UPDATE {$tableName} 
                        SET is_read_by_user = 1 
                        WHERE user_id = ? AND log_date = ? AND period_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$userId, $logDate, $periodId]);
            }
            $response = ['success' => true];
            break;

        // =====================================================================
        // DEFAULT
        // =====================================================================
        default:
            throw new Exception("Action not supported: " . htmlspecialchars($action));
    }

} catch (Exception $e) {
    // Log error จริงลงไฟล์ Server Log แต่ส่งข้อความสั้นๆ กลับไปหา User
    error_log("DailyLog API Error: " . $e->getMessage());
    $response = ['success' => false, 'message' => $e->getMessage()];
}

echo json_encode($response);
exit;
?>