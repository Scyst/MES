<?php
/**
 * moodReportApi.php
 * Self-Contained Backend API for Toolbox Daily Shift Ledger & Mood Insight Analytics
 * MES & IIoT Toolbox - SNC Former (B9 & B10)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

function sendMoodResponse($success, $data = null, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function verifyMoodCsrf() {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (empty($clientToken) || empty($sessionToken) || !hash_equals($sessionToken, $clientToken)) {
        http_response_code(403);
        sendMoodResponse(false, null, 'CSRF Token Validation Failed. กรุณารีเฟรชหน้าจอแล้วลองใหม่อีกครั้ง');
    }
}

function validateIsoDate($value, $fallback) {
    return (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) ? $value : $fallback;
}

function buildFilterWhere(array $req) {
    $startDate = validateIsoDate($req['start_date'] ?? null, date('Y-m-01'));
    $endDate = validateIsoDate($req['end_date'] ?? null, date('Y-m-d'));
    if ($startDate > $endDate) {
        [$startDate, $endDate] = [$endDate, $startDate];
    }

    $where = " WHERE l.log_date BETWEEN ? AND ? ";
    $params = [$startDate, $endDate];

    $line = trim((string)($req['line'] ?? 'All'));
    if ($line !== '' && $line !== 'All') {
        $where .= " AND u.line = ? ";
        $params[] = $line;
    }

    $periodId = isset($req['period_id']) ? intval($req['period_id']) : 0;
    if (in_array($periodId, [1, 2, 3], true)) {
        $where .= " AND l.period_id = ? ";
        $params[] = $periodId;
    }

    if (!empty($req['only_negative']) && $req['only_negative'] !== '0' && $req['only_negative'] !== 'false') {
        $where .= " AND l.mood_score > 0 AND l.mood_score <= 2 ";
    }

    $replyStatus = $req['reply_status'] ?? 'ALL';
    if ($replyStatus === 'REPLIED') {
        $where .= " AND l.reply_message IS NOT NULL AND LEN(LTRIM(RTRIM(l.reply_message))) > 0 ";
    } elseif ($replyStatus === 'PENDING') {
        $where .= " AND (l.reply_message IS NULL OR LEN(LTRIM(RTRIM(l.reply_message))) = 0) ";
    }

    $search = trim((string)($req['search'] ?? ''));
    if ($search !== '') {
        $like = '%' . $search . '%';
        $where .= " AND (u.username LIKE ? OR u.emp_id LIKE ? OR COALESCE(e.name_th, u.fullname, u.username) LIKE ? OR l.note LIKE ? OR l.reply_message LIKE ?) ";
        array_push($params, $like, $like, $like, $like, $like);
    }

    return [$params, $where, $startDate, $endDate, $line];
}

try {
    if (!isset($_SESSION['user']['id'])) {
        http_response_code(401);
        sendMoodResponse(false, null, 'Unauthorized Access: Please log in');
    }

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

    requirePermission('view_mood');

    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    $logsTable = OPERATOR_LOGS_TABLE;
    $usersTable = USERS_TABLE;
    $empTable = MANPOWER_EMPLOYEES_TABLE;

    switch ($action) {
        case 'get_filters': {
            $sql = "SELECT DISTINCT LTRIM(RTRIM(line)) as line
                    FROM {$usersTable} WITH (NOLOCK)
                    WHERE line IS NOT NULL AND LTRIM(RTRIM(line)) != '' AND line != 'All'
                    ORDER BY line ASC";
            $stmt = $pdo->query($sql);
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
            sendMoodResponse(true, ['lines' => $lines], 'Filters loaded');
        }

        case 'get_overview_stats': {
            [$params, $whereSQL, $startDate, $endDate, $line] = buildFilterWhere($_REQUEST);

            $sqlKpi = "SELECT
                        COUNT(*) as total_responses,
                        AVG(CAST(NULLIF(l.mood_score, 0) AS FLOAT)) as avg_mood,
                        SUM(CASE WHEN l.mood_score > 0 AND l.mood_score <= 2 THEN 1 ELSE 0 END) as negative_count,
                        SUM(CASE WHEN l.reply_message IS NOT NULL AND LEN(LTRIM(RTRIM(l.reply_message))) > 0 THEN 1 ELSE 0 END) as replied_count,
                        ISNULL(SUM(ISNULL(l.production_qty, 0)), 0) as total_production_qty
                       FROM {$logsTable} l WITH (NOLOCK)
                       JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                       LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                       {$whereSQL}";
            $stmtKpi = $pdo->prepare($sqlKpi);
            $stmtKpi->execute($params);
            $kpi = $stmtKpi->fetch(PDO::FETCH_ASSOC) ?: [];

            // Active operators vs missing count in selected line/date window
            $missingParams = [$startDate, $endDate];
            $lineCond = '';
            if ($line !== '' && $line !== 'All') {
                $lineCond = ' AND u.line = ? ';
                $missingParams[] = $line;
            }
            $sqlOpStats = "SELECT
                            COUNT(*) as total_operators,
                            SUM(CASE WHEN logged.user_id IS NULL THEN 1 ELSE 0 END) as missing_count
                           FROM {$usersTable} u WITH (NOLOCK)
                           LEFT JOIN (
                               SELECT DISTINCT user_id
                               FROM {$logsTable} WITH (NOLOCK)
                               WHERE log_date BETWEEN ? AND ?
                           ) logged ON logged.user_id = u.id
                           WHERE u.role = 'operator'
                             AND (u.is_active = 1 OR u.is_active IS NULL)
                             AND u.line IS NOT NULL AND LTRIM(RTRIM(u.line)) != ''
                             {$lineCond}";
            $stmtOp = $pdo->prepare($sqlOpStats);
            $stmtOp->execute($missingParams);
            $opStats = $stmtOp->fetch(PDO::FETCH_ASSOC) ?: ['total_operators' => 0, 'missing_count' => 0];

            $kpi['total_responses'] = (int)($kpi['total_responses'] ?? 0);
            $kpi['avg_mood'] = $kpi['avg_mood'] !== null ? round((float)$kpi['avg_mood'], 2) : 0;
            $kpi['negative_count'] = (int)($kpi['negative_count'] ?? 0);
            $kpi['replied_count'] = (int)($kpi['replied_count'] ?? 0);
            $kpi['total_production_qty'] = (float)($kpi['total_production_qty'] ?? 0);
            $kpi['total_operators'] = (int)($opStats['total_operators'] ?? 0);
            $kpi['missing_count'] = (int)($opStats['missing_count'] ?? 0);

            $sqlTrend = "SELECT CONVERT(VARCHAR(10), l.log_date, 23) as log_date,
                                ROUND(AVG(CAST(NULLIF(l.mood_score, 0) AS FLOAT)), 2) as daily_avg,
                                COUNT(*) as daily_vol
                         FROM {$logsTable} l WITH (NOLOCK)
                         JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                         LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                         {$whereSQL}
                         GROUP BY l.log_date
                         ORDER BY l.log_date ASC";
            $stmtTrend = $pdo->prepare($sqlTrend);
            $stmtTrend->execute($params);
            $trend = $stmtTrend->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $sqlLine = "SELECT ISNULL(NULLIF(LTRIM(RTRIM(u.line)), ''), 'N/A') as line,
                               ROUND(AVG(CAST(NULLIF(l.mood_score, 0) AS FLOAT)), 2) as line_avg,
                               COUNT(*) as line_vol
                        FROM {$logsTable} l WITH (NOLOCK)
                        JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                        LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                        {$whereSQL}
                        GROUP BY u.line
                        ORDER BY line_avg ASC";
            $stmtLine = $pdo->prepare($sqlLine);
            $stmtLine->execute($params);
            $byLine = $stmtLine->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $sqlDist = "SELECT l.mood_score, COUNT(*) as count_val
                        FROM {$logsTable} l WITH (NOLOCK)
                        JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                        LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                        {$whereSQL} AND l.mood_score BETWEEN 1 AND 5
                        GROUP BY l.mood_score
                        ORDER BY l.mood_score ASC";
            $stmtDist = $pdo->prepare($sqlDist);
            $stmtDist->execute($params);
            $dist = $stmtDist->fetchAll(PDO::FETCH_ASSOC) ?: [];

            sendMoodResponse(true, [
                'kpi' => $kpi,
                'trend' => $trend,
                'byLine' => $byLine,
                'dist' => $dist,
                'range' => ['start_date' => $startDate, 'end_date' => $endDate, 'line' => $line]
            ], 'Overview statistics loaded');
        }

        case 'get_issues_table': {
            [$params, $whereSQL] = buildFilterWhere($_REQUEST);

            $page = max(1, intval($_REQUEST['page'] ?? 1));
            $limit = min(200, max(10, intval($_REQUEST['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            // Total distinct user-days so each employee day stays grouped cleanly
            $sqlCount = "SELECT COUNT(*) FROM (
                            SELECT l.log_date, l.user_id
                            FROM {$logsTable} l WITH (NOLOCK)
                            JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                            LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                            {$whereSQL}
                            GROUP BY l.log_date, l.user_id
                         ) AS grp";
            $stmtCount = $pdo->prepare($sqlCount);
            $stmtCount->execute($params);
            $totalGroups = (int)$stmtCount->fetchColumn();

            $sqlData = "WITH PageKeys AS (
                            SELECT l.log_date, l.user_id, MAX(l.created_at) AS last_created
                            FROM {$logsTable} l WITH (NOLOCK)
                            JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                            LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                            {$whereSQL}
                            GROUP BY l.log_date, l.user_id
                            ORDER BY l.log_date DESC, MAX(l.created_at) DESC
                            OFFSET {$offset} ROWS FETCH NEXT {$limit} ROWS ONLY
                        )
                        SELECT l.log_id,
                               CONVERT(VARCHAR(10), l.log_date, 23) as log_date,
                               l.period_id, l.mood_score, l.production_qty, l.note,
                               l.user_id, l.reply_message, l.reply_by,
                               FORMAT(l.replied_at, 'dd/MM/yyyy HH:mm') as replied_at_fmt,
                               FORMAT(l.created_at, 'HH:mm') as created_time,
                               l.is_read_by_user,
                               u.username, u.emp_id, u.line,
                               COALESCE(e.name_th, u.fullname, u.username) as fullname
                        FROM {$logsTable} l WITH (NOLOCK)
                        JOIN PageKeys pk ON l.log_date = pk.log_date AND l.user_id = pk.user_id
                        JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                        LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                        ORDER BY l.log_date DESC, pk.last_created DESC, l.user_id ASC, l.period_id ASC";

            $stmtData = $pdo->prepare($sqlData);
            $stmtData->execute($params);
            $rows = $stmtData->fetchAll(PDO::FETCH_ASSOC) ?: [];

            sendMoodResponse(true, [
                'rows' => $rows,
                'pagination' => [
                    'total' => $totalGroups,
                    'page' => $page,
                    'limit' => $limit,
                    'totalPages' => max(1, (int)ceil($totalGroups / $limit))
                ]
            ], 'Logs loaded');
        }

        case 'get_negative_alerts': {
            $req = array_merge($_REQUEST, ['only_negative' => 1]);
            [$params, $whereSQL] = buildFilterWhere($req);
            $limit = min(200, max(10, intval($_REQUEST['limit'] ?? 100)));

            $sql = "SELECT TOP ({$limit})
                           l.log_id,
                           CONVERT(VARCHAR(10), l.log_date, 23) as log_date,
                           l.period_id, l.mood_score, l.production_qty, l.note,
                           l.user_id, l.reply_message, l.reply_by,
                           FORMAT(l.replied_at, 'dd/MM/yyyy HH:mm') as replied_at_fmt,
                           u.username, u.emp_id, u.line,
                           COALESCE(e.name_th, u.fullname, u.username) as fullname
                    FROM {$logsTable} l WITH (NOLOCK)
                    JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                    LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                    {$whereSQL}
                    ORDER BY l.log_date DESC, l.mood_score ASC, l.created_at DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            sendMoodResponse(true, $rows, 'Negative alerts loaded');
        }

        case 'get_missing_table': {
            $startDate = validateIsoDate($_REQUEST['start_date'] ?? null, date('Y-m-01'));
            $endDate = validateIsoDate($_REQUEST['end_date'] ?? null, date('Y-m-d'));
            if ($startDate > $endDate) {
                [$startDate, $endDate] = [$endDate, $startDate];
            }
            $line = trim((string)($reqLine = ($_REQUEST['line'] ?? 'All')));
            $search = trim((string)($_REQUEST['search'] ?? ''));

            $page = max(1, intval($_REQUEST['page'] ?? 1));
            $limit = min(200, max(10, intval($_REQUEST['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            $whereParts = [
                "u.role = 'operator'",
                "(u.is_active = 1 OR u.is_active IS NULL)",
                "u.line IS NOT NULL",
                "LTRIM(RTRIM(u.line)) != ''"
            ];
            $params = [];

            if ($line !== '' && $line !== 'All') {
                $whereParts[] = "u.line = ?";
                $params[] = $line;
            }
            if ($search !== '') {
                $like = '%' . $search . '%';
                $whereParts[] = "(u.username LIKE ? OR u.emp_id LIKE ? OR COALESCE(e.name_th, u.fullname, u.username) LIKE ?)";
                array_push($params, $like, $like, $like);
            }

            $whereParts[] = "NOT EXISTS (SELECT 1 FROM {$logsTable} l WITH (NOLOCK) WHERE l.user_id = u.id AND l.log_date BETWEEN ? AND ?)";
            array_push($params, $startDate, $endDate);

            $whereClause = ' WHERE ' . implode(' AND ', $whereParts);

            $sqlCount = "SELECT COUNT(*)
                         FROM {$usersTable} u WITH (NOLOCK)
                         LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                         {$whereClause}";
            $stmtCount = $pdo->prepare($sqlCount);
            $stmtCount->execute($params);
            $totalRecords = (int)$stmtCount->fetchColumn();

            $sqlData = "SELECT u.id as user_id, u.emp_id, u.username, u.line,
                               COALESCE(e.name_th, u.fullname, u.username) as fullname
                        FROM {$usersTable} u WITH (NOLOCK)
                        LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                        {$whereClause}
                        ORDER BY u.line ASC, u.emp_id ASC
                        OFFSET {$offset} ROWS FETCH NEXT {$limit} ROWS ONLY";
            $stmtData = $pdo->prepare($sqlData);
            $stmtData->execute($params);
            $rows = $stmtData->fetchAll(PDO::FETCH_ASSOC) ?: [];

            sendMoodResponse(true, [
                'rows' => $rows,
                'pagination' => [
                    'total' => $totalRecords,
                    'page' => $page,
                    'limit' => $limit,
                    'totalPages' => max(1, (int)ceil($totalRecords / $limit))
                ]
            ], 'Missing staff loaded');
        }

        case 'get_user_history': {
            $empId = trim((string)($_REQUEST['emp_id'] ?? ''));
            $targetUserId = intval($_REQUEST['user_id'] ?? 0);

            if ($empId === '' && $targetUserId <= 0) {
                sendMoodResponse(false, null, 'กรุณาระบุรหัสพนักงานหรือ User ID');
            }

            if ($targetUserId > 0) {
                $userCond = "u.id = ?";
                $paramVal = $targetUserId;
            } else {
                $userCond = "u.emp_id = ?";
                $paramVal = $empId;
            }

            $sqlUser = "SELECT TOP 1 u.id as user_id, u.emp_id, u.username, u.line,
                               COALESCE(e.name_th, u.fullname, u.username) as fullname
                        FROM {$usersTable} u WITH (NOLOCK)
                        LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                        WHERE {$userCond}";
            $stmtU = $pdo->prepare($sqlUser);
            $stmtU->execute([$paramVal]);
            $profile = $stmtU->fetch(PDO::FETCH_ASSOC) ?: null;

            $sql = "SELECT TOP (10)
                           CONVERT(VARCHAR(10), l.log_date, 23) as log_date,
                           l.period_id, l.mood_score, l.production_qty, l.note,
                           l.reply_message, l.reply_by,
                           FORMAT(l.replied_at, 'dd/MM/yyyy HH:mm') as replied_at_fmt
                    FROM {$logsTable} l WITH (NOLOCK)
                    JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                    WHERE {$userCond}
                    ORDER BY l.log_date DESC, l.period_id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$paramVal]);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            sendMoodResponse(true, ['profile' => $profile, 'history' => $history], 'User history loaded');
        }

        case 'get_export_data': {
            $exportType = $_REQUEST['export_type'] ?? 'logs';
            if ($exportType === 'missing') {
                $startDate = validateIsoDate($_REQUEST['start_date'] ?? null, date('Y-m-01'));
                $endDate = validateIsoDate($_REQUEST['end_date'] ?? null, date('Y-m-d'));
                $line = trim((string)($_REQUEST['line'] ?? 'All'));
                $params = [];
                $lineSql = '';
                if ($line !== '' && $line !== 'All') {
                    $lineSql = ' AND u.line = ? ';
                    $params[] = $line;
                }
                array_push($params, $startDate, $endDate);
                $sql = "SELECT TOP (3000) u.emp_id, u.username, u.line,
                               COALESCE(e.name_th, u.fullname, u.username) as fullname
                        FROM {$usersTable} u WITH (NOLOCK)
                        LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                        WHERE u.role = 'operator'
                          AND (u.is_active = 1 OR u.is_active IS NULL)
                          AND u.line IS NOT NULL AND LTRIM(RTRIM(u.line)) != ''
                          {$lineSql}
                          AND NOT EXISTS (
                              SELECT 1 FROM {$logsTable} l WITH (NOLOCK)
                              WHERE l.user_id = u.id AND l.log_date BETWEEN ? AND ?
                          )
                        ORDER BY u.line ASC, u.emp_id ASC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                sendMoodResponse(true, $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], 'Missing export loaded');
            } else {
                [$params, $whereSQL] = buildFilterWhere($_REQUEST);
                $sql = "SELECT TOP (3000)
                               CONVERT(VARCHAR(10), l.log_date, 23) as log_date,
                               l.period_id, l.mood_score, l.production_qty, l.note,
                               l.reply_message, l.reply_by,
                               FORMAT(l.replied_at, 'dd/MM/yyyy HH:mm') as replied_at_fmt,
                               u.emp_id, u.username, u.line,
                               COALESCE(e.name_th, u.fullname, u.username) as fullname
                        FROM {$logsTable} l WITH (NOLOCK)
                        JOIN {$usersTable} u WITH (NOLOCK) ON l.user_id = u.id
                        LEFT JOIN {$empTable} e WITH (NOLOCK) ON u.emp_id = e.emp_id
                        {$whereSQL}
                        ORDER BY l.log_date DESC, u.line ASC, u.username ASC, l.period_id ASC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                sendMoodResponse(true, $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], 'Export logs loaded');
            }
        }

        case 'save_reply': {
            verifyMoodCsrf();

            $logDate = validateIsoDate($_POST['log_date'] ?? null, '');
            $targetUserId = intval($_POST['target_user_id'] ?? 0);
            $periodId = intval($_POST['period_id'] ?? 0);
            $message = mb_substr(trim((string)($_POST['reply_message'] ?? '')), 0, 1000, 'UTF-8');

            if ($logDate === '' || $targetUserId <= 0 || !in_array($periodId, [1, 2, 3], true)) {
                sendMoodResponse(false, null, 'ข้อมูลอ้างอิงไม่ครบถ้วน (วันที่ / พนักงาน / ช่วงเวลา)');
            }
            if ($message === '') {
                sendMoodResponse(false, null, 'กรุณากรอกข้อความตอบกลับ');
            }

            $adminName = $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'Supervisor';

            $pdo->beginTransaction();

            $oldStmt = $pdo->prepare("SELECT log_id, reply_message, reply_by, replied_at, is_read_by_user
                                      FROM {$logsTable}
                                      WHERE log_date = ? AND user_id = ? AND period_id = ?");
            $oldStmt->execute([$logDate, $targetUserId, $periodId]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);

            if (!$oldRow) {
                $pdo->rollBack();
                sendMoodResponse(false, null, 'ไม่พบบันทึกกะที่ต้องการตอบกลับ');
            }

            $sqlUpdate = "UPDATE {$logsTable}
                          SET reply_message = ?,
                              reply_by = ?,
                              replied_at = GETDATE(),
                              is_read_by_user = 0
                          WHERE log_id = ?";
            $stmtUp = $pdo->prepare($sqlUpdate);
            $stmtUp->execute([$message, $adminName, $oldRow['log_id']]);

            writeLog(
                $pdo,
                'UPDATE',
                'DAILY_LOG_REPLY',
                $oldRow['log_id'],
                $oldRow,
                [
                    'reply_message' => $message,
                    'reply_by' => $adminName,
                    'is_read_by_user' => 0
                ],
                "Supervisor replied to daily log ({$logDate} P{$periodId})"
            );

            $pdo->commit();

            sendMoodResponse(true, [
                'log_id' => $oldRow['log_id'],
                'log_date' => $logDate,
                'target_user_id' => $targetUserId,
                'period_id' => $periodId,
                'reply_message' => $message,
                'reply_by' => $adminName,
                'replied_at_fmt' => date('d/m/Y H:i')
            ], 'บันทึกการตอบกลับสำเร็จ');
        }

        case 'verify_password': {
            verifyMoodCsrf();

            $inputPassword = (string)($_POST['password'] ?? '');
            $sessionUserId = (int)$_SESSION['user']['id'];

            if ($inputPassword === '') {
                sendMoodResponse(false, null, 'กรุณากรอกรหัสผ่าน');
            }

            $stmt = $pdo->prepare("SELECT password FROM {$usersTable} WHERE id = ?");
            $stmt->execute([$sessionUserId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($inputPassword, $user['password'])) {
                writeLog(
                    $pdo,
                    'UNLOCK',
                    'MOOD_PRIVACY',
                    $sessionUserId,
                    null,
                    ['unlocked' => true],
                    'Verified password to unlock Daily Log / Mood Insight privacy mode'
                );
                sendMoodResponse(true, ['unlocked' => true], 'ยืนยันตัวตนสำเร็จ');
            } else {
                sendMoodResponse(false, null, 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
            }
        }

        default:
            sendMoodResponse(false, null, 'Action not supported: ' . htmlspecialchars($action));
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('MoodReport API Error: ' . $e->getMessage());
    http_response_code(500);
    sendMoodResponse(false, null, 'Server Error: ' . $e->getMessage());
}
?>
