<?php
// MES/page/dailyLog/api/dailyLogManage.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php'; // ถอย 3 ชั้น
require_once __DIR__ . '/../../db.php'; // ถอย 2 ชั้น

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$response = ['success' => false, 'message' => 'Invalid action'];

try {
    $userId = $_SESSION['user']['id'];
    $userRole = $_SESSION['user']['role'];
    $currentDate = date('Y-m-d');
    $tableName = OPERATOR_LOGS_TABLE;

    // --- 1. GET INITIAL DATA (โหลดข้อมูลเข้าหน้าเว็บ) ---
    if ($action === 'get_initial_data') {
        $startOfMonth = date('Y-m-01');
        $endOfMonth = date('Y-m-t');

        // 1.1 Monthly Data (สำหรับปฏิทิน)
        $monthlyData = [];
        $stmt = $pdo->prepare("SELECT log_date, period_id, mood_score, production_qty, note FROM {$tableName} WHERE user_id = ? AND log_date BETWEEN ? AND ?");
        $stmt->execute([$userId, $startOfMonth, $endOfMonth]);
        while ($row = $stmt->fetch()) {
            $monthlyData[$row['log_date']][$row['period_id']] = [
                'mood' => $row['mood_score'],
                'qty' => $row['production_qty'],
                'note' => $row['note']
            ];
        }

        // 1.2 Dashboard Data (เฉพาะ Admin/Sup)
        $dashboardData = [];
        $factoryMood = ['total' => 0, 'sum' => 0, 'avg' => 0];
        
        if (in_array($userRole, ['admin', 'supervisor', 'creator'])) {
            $usersTable = USERS_TABLE;
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
                $factoryMood['total']++;
                $factoryMood['sum'] += $log['mood_score'];
            }
            if($factoryMood['total'] > 0) $factoryMood['avg'] = $factoryMood['sum'] / $factoryMood['total'];
        }

        $response = [
            'success' => true,
            'data' => [
                'monthlyData' => $monthlyData,
                'todayLogs' => $monthlyData[$currentDate] ?? [],
                'dashboardData' => $dashboardData,
                'factoryMood' => $factoryMood,
                'userRole' => $userRole
            ]
        ];
    }

    // --- 2. SAVE LOG (บันทึกข้อมูล) ---
    elseif ($action === 'save_log') {
        $targetDate = $_POST['target_date'];
        $period = $_POST['period_id'];
        $mood = $_POST['mood_score'];
        $qty = !empty($_POST['production_qty']) ? $_POST['production_qty'] : 0;
        $note = $_POST['note'];

        if (!$targetDate || !$period || !$mood) throw new Exception("ข้อมูลไม่ครบถ้วน");

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
            $targetDate, $userId, $period, $mood, $qty, $note,
            $targetDate, $userId, $period, $mood, $qty, $note
        ]);

        $response = ['success' => true, 'message' => "บันทึกข้อมูลสำเร็จ!"];
    }

} catch (Exception $e) {
    $response = ['success' => false, 'message' => $e->getMessage()];
}

echo json_encode($response);
exit;
?>