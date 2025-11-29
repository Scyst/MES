<?php
// MES/page/dailyLog/api/moodReportAPI.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php'; // บังคับ Login
require_once __DIR__ . '/../../db.php';

// อนุญาตเฉพาะ Admin, Creator, Supervisor
if (!in_array($_SESSION['user']['role'], ['admin', 'creator', 'supervisor'])) {
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? ''; 
    
    if ($action === 'get_filters') {
        $usersTable = USERS_TABLE;
        $sql = "SELECT DISTINCT line 
                FROM {$usersTable} 
                WHERE line IS NOT NULL AND line != '' AND line != 'All'
                ORDER BY line ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'success' => true,
            'data' => [
                'lines' => $lines
            ]
        ]);
        exit;
    }
    
    if ($action === 'get_report_data') {
        $startDate = $_POST['start_date'] ?? date('Y-m-01');
        $endDate = $_POST['end_date'] ?? date('Y-m-d');
        $lineFilter = $_POST['line'] ?? 'All';

        $logsTable = OPERATOR_LOGS_TABLE;
        $usersTable = USERS_TABLE;

        // 1. สร้าง Base Query และ Parameters
        $params = [$startDate, $endDate];
        $lineCondition = "";
        
        if ($lineFilter !== 'All') {
            $lineCondition = " AND u.line = ? ";
            $params[] = $lineFilter;
        }

        // ======================================================
        // A. KPI SUMMARY
        // ======================================================
        $sqlKPI = "SELECT 
                    COUNT(*) as total_responses,
                    AVG(CAST(l.mood_score AS FLOAT)) as avg_mood,
                    SUM(CASE WHEN l.mood_score <= 2 THEN 1 ELSE 0 END) as negative_count
                   FROM {$logsTable} l
                   JOIN {$usersTable} u ON l.user_id = u.id
                   WHERE l.log_date BETWEEN ? AND ? {$lineCondition}";
        
        $stmtKPI = $pdo->prepare($sqlKPI);
        $stmtKPI->execute($params);
        $kpi = $stmtKPI->fetch(PDO::FETCH_ASSOC);

        // ======================================================
        // B. CHART 1: TREND (Mood vs Volume per Day)
        // ======================================================
        $sqlTrend = "SELECT 
                        l.log_date,
                        AVG(CAST(l.mood_score AS FLOAT)) as daily_avg,
                        COUNT(*) as daily_vol
                     FROM {$logsTable} l
                     JOIN {$usersTable} u ON l.user_id = u.id
                     WHERE l.log_date BETWEEN ? AND ? {$lineCondition}
                     GROUP BY l.log_date
                     ORDER BY l.log_date";
        $stmtTrend = $pdo->prepare($sqlTrend);
        $stmtTrend->execute($params);
        $trendData = $stmtTrend->fetchAll(PDO::FETCH_ASSOC);

        // ======================================================
        // C. CHART 2: BY LINE (Avg Mood per Line)
        // ======================================================
        $sqlByLine = "SELECT 
                        u.line,
                        AVG(CAST(l.mood_score AS FLOAT)) as line_avg
                      FROM {$logsTable} l
                      JOIN {$usersTable} u ON l.user_id = u.id
                      WHERE l.log_date BETWEEN ? AND ? {$lineCondition}
                      GROUP BY u.line
                      ORDER BY line_avg DESC"; // เรียงจากอารมณ์ดีสุดไปน้อยสุด
        $stmtByLine = $pdo->prepare($sqlByLine);
        $stmtByLine->execute($params);
        $byLineData = $stmtByLine->fetchAll(PDO::FETCH_ASSOC);

        // ======================================================
        // D. CHART 3: DISTRIBUTION (สัดส่วนอารมณ์)
        // ======================================================
        $sqlDist = "SELECT 
                        l.mood_score,
                        COUNT(*) as count_val
                    FROM {$logsTable} l
                    JOIN {$usersTable} u ON l.user_id = u.id
                    WHERE l.log_date BETWEEN ? AND ? {$lineCondition}
                    GROUP BY l.mood_score
                    ORDER BY l.mood_score";
        $stmtDist = $pdo->prepare($sqlDist);
        $stmtDist->execute($params);
        $distData = $stmtDist->fetchAll(PDO::FETCH_ASSOC);

        // ======================================================
        // E. DEEP DIVE TABLE (Low Score Alert)
        // ======================================================
        $empTable = MANPOWER_EMPLOYEES_TABLE; 
        $sqlTable = "SELECT 
                        l.log_date, l.period_id, l.mood_score, l.note,
                        u.username, u.emp_id, u.line,
                        m.name_th
                     FROM {$logsTable} l
                     JOIN {$usersTable} u ON l.user_id = u.id
                     LEFT JOIN {$empTable} m ON u.emp_id = m.emp_id
                     WHERE l.log_date BETWEEN ? AND ? {$lineCondition}
                       AND (l.mood_score <= 2 OR (l.note IS NOT NULL AND l.note <> ''))
                     ORDER BY l.log_date DESC, l.mood_score ASC";
        
        $stmtTable = $pdo->prepare($sqlTable);
        $stmtTable->execute($params);
        $tableData = $stmtTable->fetchAll(PDO::FETCH_ASSOC);

        // ======================================================
        // [NEW] F. MISSING USERS (ยังไม่ส่งงาน)
        // ======================================================
        $missingParams = [];
        $missingLineCondition = "";
        
        if ($lineFilter !== 'All') {
            $missingLineCondition = " AND u.line = ? ";
        }

        $sqlMissing = "SELECT 
                        u.username, u.emp_id, u.line, m.name_th
                       FROM {$usersTable} u
                       LEFT JOIN {$empTable} m ON u.emp_id = m.emp_id
                       WHERE u.role NOT IN ('admin', 'creator') 
                         AND u.emp_id IS NOT NULL
                         AND u.emp_id <> ''
                         {$missingLineCondition}
                         AND u.id NOT IN (
                            SELECT DISTINCT user_id 
                            FROM {$logsTable} 
                            WHERE log_date BETWEEN ? AND ?
                         )
                       ORDER BY u.line ASC, u.emp_id ASC";

        $finalMissingParams = [];
        if ($lineFilter !== 'All') {
            $finalMissingParams[] = $lineFilter;
        }
        $finalMissingParams[] = $startDate;
        $finalMissingParams[] = $endDate;

        $stmtMissing = $pdo->prepare($sqlMissing);
        $stmtMissing->execute($finalMissingParams);
        $missingData = $stmtMissing->fetchAll(PDO::FETCH_ASSOC);

        $totalEligibleUsers = count($missingData) + count(array_unique(array_column($trendData, 'user_id') ?? []));

        echo json_encode([
            'success' => true,
            'kpi' => $kpi,
            'trend' => $trendData,
            'byLine' => $byLineData,
            'dist' => $distData,
            'table' => $tableData,
            'missing' => $missingData
        ]);
        exit;
    }
    if ($action === 'get_user_history') {
        $empId = $_POST['emp_id'] ?? '';
        
        if (!$empId) {
            echo json_encode(['success' => false, 'message' => 'No Emp ID']);
            exit;
        }

        $logsTable = OPERATOR_LOGS_TABLE;
        $usersTable = USERS_TABLE;

        $sql = "SELECT TOP 7 l.log_date, l.mood_score, l.note
                FROM {$logsTable} l
                JOIN {$usersTable} u ON l.user_id = u.id
                WHERE u.emp_id = ?
                ORDER BY l.log_date DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$empId]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'history' => $history]);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>