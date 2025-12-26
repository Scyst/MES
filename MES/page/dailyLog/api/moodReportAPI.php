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
    // 1. Get Filters (Lines)
    if ($action === 'get_filters') {
        $usersTable = USERS_TABLE;
        $sql = "SELECT DISTINCT line FROM {$usersTable} WHERE line IS NOT NULL AND line != '' AND line != 'All' ORDER BY line ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        echo json_encode(['success' => true, 'data' => ['lines' => $stmt->fetchAll(PDO::FETCH_COLUMN)]]);
        exit;
    }

    // Common Filter Params
    $startDate = $_POST['start_date'] ?? date('Y-m-01');
    $endDate = $_POST['end_date'] ?? date('Y-m-d');
    $line = $_POST['line'] ?? 'All';
    
    // Base WHERE Clause Helper
    $whereSQL = " WHERE l.log_date BETWEEN ? AND ? ";
    $params = [$startDate, $endDate];
    if ($line !== 'All') {
        $whereSQL .= " AND u.line = ? ";
        $params[] = $line;
    }

    // 2. GET OVERVIEW (KPI & Charts Only)
    if ($action === 'get_overview_stats') {
        $logsTable = OPERATOR_LOGS_TABLE;
        $usersTable = USERS_TABLE;

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

        $sqlLine = "SELECT u.line, AVG(CAST(l.mood_score AS FLOAT)) as line_avg
                    FROM {$logsTable} l
                    JOIN {$usersTable} u ON l.user_id = u.id
                    {$whereSQL}
                    GROUP BY u.line ORDER BY u.line ASC";
        $stmtLine = $pdo->prepare($sqlLine);
        $stmtLine->execute($params);
        $byLine = $stmtLine->fetchAll(PDO::FETCH_ASSOC);

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
        exit;
    }

    // 3. GET ISSUES TABLE (Paginated)
    if ($action === 'get_issues_table') {
        // Force Cast to Int (Security & Logic)
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

        // [CRITICAL FIX] Embed Integers directly into SQL String (Bypass Driver Binding Issue)
        $sqlData = "SELECT l.log_date, l.period_id, l.mood_score, l.note, 
                           u.username, u.emp_id, u.line,
                           COALESCE(e.name_th, u.username) as fullname 
                    FROM {$logsTable} l
                    JOIN {$usersTable} u ON l.user_id = u.id
                    LEFT JOIN {$empTable} e ON u.emp_id = e.emp_id 
                    {$whereSQL}
                    ORDER BY l.log_date DESC, l.created_at DESC
                    OFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY"; // <--- ใส่ตัวแปรตรงนี้เลย
        
        $stmtData = $pdo->prepare($sqlData);
        $stmtData->execute($params); // Bind แค่ตัวแปร WHERE Clause (startDate, endDate, line)
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
        exit;
    }

    // 4. GET MISSING TABLE (Paginated)
    if ($action === 'get_missing_table') {
        // Force Cast to Int
        $page = isset($_POST['page']) ? (int)$_POST['page'] : 1;
        $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 10;
        $offset = ($page - 1) * $limit;

        $logsTable = OPERATOR_LOGS_TABLE;
        $usersTable = USERS_TABLE;
        $empTable = MANPOWER_EMPLOYEES_TABLE;
        
        $missingParams = [$startDate, $endDate];
        $lineCondition = "";
        if ($line !== 'All') {
            $lineCondition = " AND u.line = ? ";
            $missingParams[] = $line;
        }

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
        $countParams = $missingParams; 
        $countParams[] = $startDate;
        $countParams[] = $endDate;

        $stmtCount = $pdo->prepare($sqlTotal);
        $stmtCount->execute($countParams);
        $totalRecords = $stmtCount->fetchColumn();

        // [CRITICAL FIX] Embed Integers directly into SQL String
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
                    OFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY"; // <--- ใส่ตัวแปรตรงนี้เลย

        $stmtData = $pdo->prepare($sqlData);
        $stmtData->execute($countParams); // Bind แค่ตัวแปร WHERE Clause
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
        exit;
    }

    // 5. History - คงเดิม
    if ($action === 'get_user_history') {
        $empId = $_POST['emp_id'] ?? '';
        if (!$empId) { echo json_encode(['success' => false]); exit; }
        
        $sql = "SELECT TOP 10 l.log_date, l.mood_score, l.note
                FROM " . OPERATOR_LOGS_TABLE . " l
                JOIN " . USERS_TABLE . " u ON l.user_id = u.id
                WHERE u.emp_id = ? ORDER BY l.log_date DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$empId]);
        echo json_encode(['success' => true, 'history' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}