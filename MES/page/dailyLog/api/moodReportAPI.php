<?php
// MES/page/dailyLog/api/moodReportAPI.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// Access Control
if (!in_array($_SESSION['user']['role'], ['admin', 'creator'])) {
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {

    switch ($action) {

        // =====================================================================
        // CASE: SAVE ADMIN REPLY (บันทึกการตอบกลับ)
        // =====================================================================
        case 'save_reply':
            $logDate = $_POST['log_date'] ?? null;
            $targetUserId = $_POST['target_user_id'] ?? null;
            $periodId = $_POST['period_id'] ?? null;
            $message = trim($_POST['reply_message'] ?? '');

            if (!$logDate || !$targetUserId || !$periodId) {
                echo json_encode(['success' => false, 'message' => 'Missing Keys (Date, User, Period)']);
                exit;
            }
            if (empty($message)) {
                echo json_encode(['success' => false, 'message' => 'กรุณากรอกข้อความตอบกลับ']);
                exit;
            }

            $adminName = $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'];
            $tableName = OPERATOR_LOGS_TABLE; 

            $sql = "UPDATE {$tableName}
                    SET reply_message = ?, 
                        reply_by = ?, 
                        replied_at = GETDATE()
                    WHERE log_date = ? AND user_id = ? AND period_id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$message, $adminName, $logDate, $targetUserId, $periodId]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'บันทึกการตอบกลับสำเร็จ']);
            } else {
                echo json_encode(['success' => false, 'message' => 'ไม่พบข้อมูล Log หรือข้อมูลไม่มีการเปลี่ยนแปลง']);
            }
            break;

        // =====================================================================
        // CASE: GET FILTERS (ดึงรายชื่อไลน์การผลิต)
        // =====================================================================
        case 'get_filters':
            $usersTable = USERS_TABLE;
            $sql = "SELECT DISTINCT line FROM {$usersTable} WHERE line IS NOT NULL AND line != '' AND line != 'All' ORDER BY line ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => ['lines' => $stmt->fetchAll(PDO::FETCH_COLUMN)]]);
            break;

        // =====================================================================
        // CASE: GET OVERVIEW STATS (Dashboard KPI & Charts)
        // =====================================================================
        case 'get_overview_stats':
            // Prepare Params
            list($params, $whereSQL) = getCommonParams();
            
            $logsTable = OPERATOR_LOGS_TABLE;
            $usersTable = USERS_TABLE;

            // 1. KPI
            $sqlKPI = "SELECT 
                        COUNT(*) as total_responses,
                        AVG(CAST(mood_score AS FLOAT)) as avg_mood,
                        SUM(CASE WHEN mood_score <= 2 THEN 1 ELSE 0 END) as negative_count
                       FROM {$logsTable} l
                       JOIN {$usersTable} u ON l.user_id = u.id
                       {$whereSQL}";
            $stmtKPI = $pdo->prepare($sqlKPI);
            $stmtKPI->execute($params);
            $kpi = $stmtKPI->fetch(PDO::FETCH_ASSOC);

            // 2. Daily Trend
            $sqlTrend = "SELECT l.log_date, 
                                AVG(CAST(l.mood_score AS FLOAT)) as daily_avg,
                                COUNT(*) as daily_vol
                         FROM {$logsTable} l
                         JOIN {$usersTable} u ON l.user_id = u.id
                         {$whereSQL}
                         GROUP BY l.log_date ORDER BY l.log_date ASC";
            $stmtTrend = $pdo->prepare($sqlTrend);
            $stmtTrend->execute($params);
            $trend = $stmtTrend->fetchAll(PDO::FETCH_ASSOC);

            // 3. By Line
            $sqlLine = "SELECT u.line, AVG(CAST(l.mood_score AS FLOAT)) as line_avg
                        FROM {$logsTable} l
                        JOIN {$usersTable} u ON l.user_id = u.id
                        {$whereSQL}
                        GROUP BY u.line ORDER BY u.line ASC";
            $stmtLine = $pdo->prepare($sqlLine);
            $stmtLine->execute($params);
            $byLine = $stmtLine->fetchAll(PDO::FETCH_ASSOC);

            // 4. Mood Distribution
            $sqlDist = "SELECT l.mood_score, COUNT(*) as count_val
                        FROM {$logsTable} l
                        JOIN {$usersTable} u ON l.user_id = u.id
                        {$whereSQL}
                        GROUP BY l.mood_score ORDER BY l.mood_score ASC";
            $stmtDist = $pdo->prepare($sqlDist);
            $stmtDist->execute($params);
            $dist = $stmtDist->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'kpi' => $kpi,
                'trend' => $trend,
                'byLine' => $byLine,
                'dist' => $dist
            ]);
            break;

        // =====================================================================
        // CASE: GET ISSUES TABLE (ตารางข้อมูล พร้อม Pagination)
        // =====================================================================
        case 'get_issues_table':
            list($params, $whereSQL) = getCommonParams();
            
            $page = isset($_POST['page']) ? (int)$_POST['page'] : 1;
            $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 10;
            $offset = ($page - 1) * $limit;

            $logsTable = OPERATOR_LOGS_TABLE;
            $usersTable = USERS_TABLE;
            $empTable = MANPOWER_EMPLOYEES_TABLE;

            // Count Total
            $sqlCount = "SELECT COUNT(*) FROM {$logsTable} l JOIN {$usersTable} u ON l.user_id = u.id {$whereSQL}";
            $stmtCount = $pdo->prepare($sqlCount);
            $stmtCount->execute($params);
            $totalRecords = $stmtCount->fetchColumn();

            // Fetch Data (Added reply info)
            $sqlData = "SELECT l.log_date, l.period_id, l.mood_score, l.note, 
                               l.user_id, l.reply_message, l.reply_by,
                               u.username, u.emp_id, u.line,
                               COALESCE(e.name_th, u.username) as fullname 
                        FROM {$logsTable} l
                        JOIN {$usersTable} u ON l.user_id = u.id
                        LEFT JOIN {$empTable} e ON u.emp_id = e.emp_id 
                        {$whereSQL}
                        ORDER BY l.log_date DESC, l.created_at DESC
                        OFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY";
            
            $stmtData = $pdo->prepare($sqlData);
            $stmtData->execute($params);
            $data = $stmtData->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $data,
                'pagination' => [
                    'total' => (int)$totalRecords,
                    'page' => $page,
                    'limit' => $limit,
                    'totalPages' => ceil($totalRecords / $limit)
                ]
            ]);
            break;

        // =====================================================================
        // CASE: GET MISSING TABLE (คนที่ยังไม่ลงข้อมูล)
        // =====================================================================
        case 'get_missing_table':
            $startDate = $_POST['start_date'] ?? date('Y-m-01');
            $endDate = $_POST['end_date'] ?? date('Y-m-d');
            $line = $_POST['line'] ?? 'All';

            $page = isset($_POST['page']) ? (int)$_POST['page'] : 1;
            $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 10;
            $offset = ($page - 1) * $limit;

            $logsTable = OPERATOR_LOGS_TABLE;
            $usersTable = USERS_TABLE;
            $empTable = MANPOWER_EMPLOYEES_TABLE;
            
            $countParams = [$startDate, $endDate];
            $lineCondition = "";
            if ($line !== 'All') {
                $lineCondition = " AND u.line = ? ";
                $countParams[] = $line;
            }
            
            // เพิ่ม params สำหรับ EXISTS subquery
            $countParams[] = $startDate;
            $countParams[] = $endDate;

            // Count Total
            $sqlTotal = "SELECT COUNT(*) 
                         FROM {$usersTable} u
                         WHERE u.role = 'operator' 
                         AND u.line IS NOT NULL 
                         {$lineCondition}
                         AND NOT EXISTS (
                            SELECT 1 FROM {$logsTable} l 
                            WHERE l.user_id = u.id 
                            AND l.log_date BETWEEN ? AND ?
                         )";

            $stmtCount = $pdo->prepare($sqlTotal);
            $stmtCount->execute($countParams);
            $totalRecords = $stmtCount->fetchColumn();

            // Fetch Data
            $sqlData = "SELECT u.emp_id, u.username, u.line,
                               COALESCE(e.name_th, u.username) as fullname
                        FROM {$usersTable} u
                        LEFT JOIN {$empTable} e ON u.emp_id = e.emp_id
                        WHERE u.role = 'operator' 
                        AND u.line IS NOT NULL 
                        {$lineCondition}
                        AND NOT EXISTS (
                            SELECT 1 FROM {$logsTable} l 
                            WHERE l.user_id = u.id 
                            AND l.log_date BETWEEN ? AND ?
                        )
                        ORDER BY u.line ASC, u.emp_id ASC
                        OFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY";

            $stmtData = $pdo->prepare($sqlData);
            $stmtData->execute($countParams);
            $data = $stmtData->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $data,
                'pagination' => [
                    'total' => (int)$totalRecords,
                    'page' => $page,
                    'limit' => $limit,
                    'totalPages' => ceil($totalRecords / $limit)
                ]
            ]);
            break;

        // =====================================================================
        // CASE: GET USER HISTORY (ประวัติรายบุคคล)
        // =====================================================================
        case 'get_user_history':
            $empId = $_POST['emp_id'] ?? '';
            if (!$empId) { echo json_encode(['success' => false]); exit; }
            
            $sql = "SELECT TOP 10 l.log_date, l.mood_score, l.note, l.reply_message
                    FROM " . OPERATOR_LOGS_TABLE . " l
                    JOIN " . USERS_TABLE . " u ON l.user_id = u.id
                    WHERE u.emp_id = ? ORDER BY l.log_date DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$empId]);
            echo json_encode(['success' => true, 'history' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // =====================================================================
        // CASE: VERIFY PASSWORD (ตรวจสอบรหัสผ่านสำหรับ Privacy Mode)
        // =====================================================================
        case 'verify_password':
            $inputPassword = $_POST['password'] ?? '';
            $userId = $_SESSION['user']['id']; // ดึง ID ของคนที่ Login อยู่

            if (empty($inputPassword)) {
                echo json_encode(['success' => false, 'message' => 'Empty password']);
                exit;
            }

            // 1. ดึง Hash Password จากฐานข้อมูล
            $sql = "SELECT password FROM " . USERS_TABLE . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            // 2. ตรวจสอบรหัสผ่าน
            // หมายเหตุ: ใช้ password_verify เพราะในระบบ Login ปกติคุณใช้ Hash
            if ($user && password_verify($inputPassword, $user['password'])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Incorrect password']);
            }
            break;

        // =====================================================================
        // DEFAULT: INVALID ACTION
        // =====================================================================
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

// -----------------------------------------------------------------------------
// Helper Function: สร้าง Parameter สำหรับ Query ทั่วไป
// -----------------------------------------------------------------------------
function getCommonParams() {
    $startDate = $_POST['start_date'] ?? date('Y-m-01');
    $endDate = $_POST['end_date'] ?? date('Y-m-d');
    $line = $_POST['line'] ?? 'All';
    
    $whereSQL = " WHERE l.log_date BETWEEN ? AND ? ";
    $params = [$startDate, $endDate];
    if ($line !== 'All') {
        $whereSQL .= " AND u.line = ? ";
        $params[] = $line;
    }
    return [$params, $whereSQL];
}
?>