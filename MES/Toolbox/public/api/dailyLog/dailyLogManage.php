<?php
// Toolbox/public/api/dailyLog/dailyLogManage.php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/logger.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $decoded = json_decode($rawInput, true);
        if (is_array($decoded)) {
            $_POST = array_merge($_POST, $decoded);
            $_REQUEST = array_merge($_REQUEST, $decoded);
        }
    }
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$response = ['success' => false, 'data' => null, 'message' => 'Invalid action'];

function verifyDailyLogCsrf() {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (empty($clientToken) || empty($sessionToken) || !hash_equals($sessionToken, $clientToken)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'data' => null,
            'message' => 'CSRF Token Validation Failed. กรุณารีเฟรชหน้าจอแล้วลองใหม่อีกครั้ง'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

try {
    if (!isset($_SESSION['user']['id'])) {
        http_response_code(401);
        throw new Exception('Unauthorized Access');
    }

    $userId = (int)$_SESSION['user']['id'];
    $userRole = $_SESSION['user']['role'] ?? 'operator';
    $currentDate = date('Y-m-d');
    $tableName = OPERATOR_LOGS_TABLE;

    switch ($action) {
        
        // =====================================================================
        // CASE: GET INITIAL DATA (โหลดข้อมูลปฏิทิน & Dashboard)
        // =====================================================================
        

        case 'get_morning_brief':
            $userRole = $_SESSION['user']['role'] ?? 'guest';
            if (!in_array($userRole, ['admin', 'creator'])) {
                throw new Exception("Permission denied");
            }
            $reqTeam = $_POST['team'] ?? ($_SESSION['user']['team_group'] ?? null);
            if ($reqTeam === 'ALL') $reqTeam = null;

            $reqDate = $_POST['brief_date'] ?? $_GET['brief_date'] ?? null;
            if (!empty($reqDate)) {
                $yesterday = $reqDate;
            } else {
                $currentHour = (int)date('H');
                $actualProdDate = ($currentHour < 8) ? date('Y-m-d', strtotime('-1 day')) : date('Y-m-d');
                $yesterday = date('Y-m-d', strtotime('-1 day', strtotime($actualProdDate)));
            }
            
            // --- [1] Manpower Data ---
            $mpQuery = "SELECT COUNT(L.emp_id) as total,
                SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE', 'ABSENT', 'HOLIDAY') THEN 1 ELSE 0 END) as leave_count
                FROM MANPOWER_DAILY_LOGS L WITH (NOLOCK) 
                LEFT JOIN MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
                LEFT JOIN MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
                WHERE L.log_date = ? AND L.status != 'GHOST'";
            $mpParams = [$yesterday];
            if (!empty($reqTeam)) {
                $mpQuery .= " AND ISNULL(TS.hc_group, '') = ?";
                $mpParams[] = $reqTeam;
            } else {
                $mpQuery .= " AND ISNULL(TS.hc_group, '') != 'EXCLUDE'";
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
            } else {
                $costQuery .= " WHERE ISNULL(hc_group, '') != 'EXCLUDE'";
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
            } else {
                $prodQuery .= " AND ISNULL(u.team_group, '') != 'EXCLUDE'";
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
            } else {
                $moodQuery .= " AND ISNULL(u.team_group, '') != 'EXCLUDE'";
            }
            $stmtMood = $pdo->prepare($moodQuery);
            $stmtMood->execute($moodParams);
            $moodYesterday = $stmtMood->fetchColumn();

            $morningBrief = [
                'date_text' => date('d/m/Y', strtotime($yesterday)),
                'raw_date' => $yesterday,
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
            $reqMonth = $_POST['month'] ?? $_GET['month'] ?? date('Y-m');
            if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $reqMonth)) {
                $reqMonth = date('Y-m');
            }
            $startOfMonth = $reqMonth . '-01';
            $endOfMonth = date('Y-m-t', strtotime($startOfMonth));

            $monthlyData = [];
            $replyCount = 0;
            $unreadDates = [];

            $sql = "SELECT CONVERT(VARCHAR(10), log_date, 23) as log_date_str,
                           period_id, mood_score, production_qty, note,
                           reply_message, reply_by, FORMAT(replied_at, 'dd/MM/yyyy HH:mm') as replied_at_fmt,
                           is_read_by_user, FORMAT(created_at, 'HH:mm') as created_time
                    FROM {$tableName} WITH (NOLOCK)
                    WHERE user_id = ? AND log_date BETWEEN ? AND ?
                    ORDER BY log_date DESC, period_id ASC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $startOfMonth, $endOfMonth]);

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $dStr = $row['log_date_str'];
                if (!empty($row['reply_message']) && (int)$row['is_read_by_user'] === 0) {
                    $replyCount++;
                    $unreadDates[] = $dStr;
                }

                $monthlyData[$dStr][$row['period_id']] = [
                    'mood' => (int)$row['mood_score'],
                    'qty' => (float)$row['production_qty'],
                    'note' => $row['note'],
                    'reply_message' => $row['reply_message'],
                    'reply_by' => $row['reply_by'],
                    'replied_at_fmt' => $row['replied_at_fmt'],
                    'created_time' => $row['created_time'],
                    'is_read' => (int)$row['is_read_by_user']
                ];
            }

            // Dashboard Data (เฉพาะคนที่มีสิทธิ์ดูภาพรวม)
            $dashboardData = [];
            $factoryMood = ['total' => 0, 'sum' => 0, 'avg' => 0];

            if (hasPermission('view_mood')) {
                $dashDate = $_POST['dash_date'] ?? $_GET['dash_date'] ?? $currentDate;
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dashDate)) {
                    $dashDate = $currentDate;
                }
                $usersTable = USERS_TABLE;
                $sqlDash = "SELECT l.log_id, CONVERT(VARCHAR(10), l.log_date, 23) as log_date,
                                   l.user_id, l.period_id, l.mood_score, l.production_qty, l.note,
                                   l.reply_message, l.reply_by,
                                   u.username, u.emp_id, u.line, COALESCE(u.fullname, u.username) as fullname
                            FROM {$tableName} l WITH (NOLOCK)
                            JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                            WHERE l.log_date = ?
                            ORDER BY u.line, u.username, l.period_id";
                $stmtDash = $pdo->prepare($sqlDash);
                $stmtDash->execute([$dashDate]);

                foreach ($stmtDash->fetchAll(PDO::FETCH_ASSOC) as $log) {
                    $u = $log['username'];
                    $dashboardData[$u]['info'] = [
                        'user_id' => (int)$log['user_id'],
                        'emp_id' => $log['emp_id'],
                        'line' => $log['line'],
                        'fullname' => $log['fullname']
                    ];
                    $dashboardData[$u]['logs'][$log['period_id']] = $log;

                    if ((int)$log['mood_score'] > 0) {
                        $factoryMood['total']++;
                        $factoryMood['sum'] += (int)$log['mood_score'];
                    }
                }

                if ($factoryMood['total'] > 0) {
                    $factoryMood['avg'] = $factoryMood['sum'] / $factoryMood['total'];
                }
            }

            $response = [
                'success' => true,
                'data' => [
                    'month' => $reqMonth,
                    'monthlyData' => $monthlyData,
                    'todayLogs' => $monthlyData[$currentDate] ?? [],
                    'replyCount' => $replyCount,
                    'unreadDates' => array_values(array_unique($unreadDates)),
                    'dashboardData' => $dashboardData,
                    'factoryMood' => $factoryMood,
                    'userRole' => $userRole,
                    'canViewMood' => hasPermission('view_mood')
                ],
                'message' => 'Daily log data loaded'
            ];
            break;

        // =====================================================================
        // CASE: SAVE LOG (บันทึกข้อมูลฝั่งพนักงาน)
        // =====================================================================
        case 'save_log':
            verifyDailyLogCsrf();

            $targetDate = $_POST['target_date'] ?? $_POST['log_date'] ?? null;
            $period = isset($_POST['period_id']) ? intval($_POST['period_id']) : 0;
            $rawMood = $_POST['mood_score'] ?? $_POST['mood'] ?? null;
            $mood = $rawMood !== null ? intval($rawMood) : 0;
            $rawQty = $_POST['production_qty'] ?? $_POST['qty'] ?? 0;
            $qty = ($rawQty === '' || $rawQty === null) ? 0.0 : floatval($rawQty);
            $note = mb_substr(trim((string)($_POST['note'] ?? '')), 0, 500, 'UTF-8');

            if (!$targetDate || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $targetDate)) {
                throw new Exception("รูปแบบวันที่ไม่ถูกต้อง (Date)");
            }
            if (!in_array($period, [1, 2, 3], true)) {
                throw new Exception("ช่วงเวลากะไม่ถูกต้อง (Period ต้องเป็น 1, 2 หรือ 3)");
            }
            if ($mood < 1 || $mood > 5) {
                throw new Exception("กรุณาระบุระดับความรู้สึก 1-5");
            }
            if (!is_finite($qty) || $qty < 0 || $qty > 9999999.999) {
                throw new Exception("จำนวนยอดผลิตต้องอยู่ระหว่าง 0 ถึง 9,999,999.999");
            }

            $pdo->beginTransaction();

            $oldStmt = $pdo->prepare("SELECT log_id, log_date, period_id, mood_score, production_qty, note FROM {$tableName} WHERE log_date = ? AND user_id = ? AND period_id = ?");
            $oldStmt->execute([$targetDate, $userId, $period]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);

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
                $targetDate, $userId, $period,
                $mood, $qty, $note,
                $targetDate, $userId, $period, $mood, $qty, $note
            ]);

            writeLog(
                $pdo,
                $oldRow ? 'UPDATE' : 'CREATE',
                'DAILY_LOG',
                $oldRow['log_id'] ?? "{$userId}_{$targetDate}_{$period}",
                $oldRow ?: null,
                [
                    'log_date' => $targetDate,
                    'period_id' => $period,
                    'mood_score' => $mood,
                    'production_qty' => $qty,
                    'note' => $note
                ],
                "Operator saved daily log ({$targetDate} P{$period})"
            );

            $pdo->commit();
            $response = ['success' => true, 'data' => ['log_date' => $targetDate, 'period_id' => $period], 'message' => "บันทึกข้อมูลสำเร็จ!"];
            break;

        // =====================================================================
        // MARK AS READ (เมื่อพนักงานกดอ่าน)
        // =====================================================================
        case 'mark_as_read':
            verifyDailyLogCsrf();

            $logDate = $_POST['log_date'] ?? null;
            $periodId = isset($_POST['period_id']) ? intval($_POST['period_id']) : 0;

            if (!$logDate || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $logDate) || !in_array($periodId, [1, 2, 3], true)) {
                throw new Exception("ข้อมูลอ้างอิงไม่ถูกต้อง");
            }

            $sql = "UPDATE {$tableName}
                    SET is_read_by_user = 1
                    WHERE user_id = ? AND log_date = ? AND period_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $logDate, $periodId]);

            $response = ['success' => true, 'data' => null, 'message' => 'อัปเดตสถานะการอ่านแล้ว'];
            break;

        // =====================================================================
        // DEFAULT
        // =====================================================================
        default:
            throw new Exception("Action not supported: " . htmlspecialchars($action));
    }

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("DailyLog API Error: " . $e->getMessage());
    $response = ['success' => false, 'data' => null, 'message' => $e->getMessage()];
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;
?>