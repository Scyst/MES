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

            // 1.2 Dashboard Data (เฉพาะ Admin/Sup)
            $dashboardData = [];
            $factoryMood = ['total' => 0, 'sum' => 0, 'avg' => 0];
            
            if (in_array($userRole, ['admin', 'supervisor', 'creator'])) {
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

            $response = [
                'success' => true,
                'data' => [
                    'monthlyData' => $monthlyData,
                    'todayLogs' => $monthlyData[$currentDate] ?? [],
                    'replyCount' => $replyCount,
                    'unreadDates' => array_unique($unreadDates),
                    'dashboardData' => $dashboardData,
                    'factoryMood' => $factoryMood,
                    'userRole' => $userRole
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