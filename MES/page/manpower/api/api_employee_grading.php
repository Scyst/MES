<?php
// page/manpower/api/api_employee_grading.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json');

if (!hasPermission('manage_manpower')) {
    echo json_encode(['success' => false, 'message' => 'Permission denied.']);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$period = $_GET['period'] ?? date('Y-m'); // Default current month (or date)
$periodLength = strlen($period) == 10 ? 10 : 7;
$line = $_GET['line'] ?? 'ALL';
$hcGroup = $_GET['hcGroup'] ?? 'ALL';

$startDate = $period;
if (strlen($period) === 21 && strpos($period, '_') !== false) {
    // Range mode: YYYY-MM-DD_YYYY-MM-DD
    $parts = explode('_', $period);
    $startDate = $parts[0];
    $endDate = date('Y-m-d', strtotime($parts[1] . ' +1 day'));
} elseif ($periodLength == 7) {
    // Monthly mode
    $startDate = $period . '-01';
    $endDate = date('Y-m-d', strtotime("$startDate +1 month"));
} else {
    // Daily mode
    $endDate = date('Y-m-d', strtotime("$startDate +1 day"));
}

try {
    if ($action === 'get_grading_data') {
        
        // Fetch employees and their grades for the selected period
        $sql = "
            SELECT 
                E.emp_id, 
                E.name_th, 
                E.position, 
                E.line, 
                E.team_group,
                G.grade,
                G.notes,
                ISNULL(INC.income_per_head, 0) AS income_per_head,
                ISNULL(WAGE.total_wage, 350.0) AS total_wage,
                ISNULL(WAGE.dl_wage, 350.0) AS dl_wage,
                ISNULL(WAGE.ot_wage, 0.0) AS ot_wage,
                ISNULL(WAGE.ot_hours, 0.0) AS ot_hours,
                C.threshold_a,
                C.threshold_b,
                C.threshold_c
            FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
            INNER JOIN (
                SELECT DISTINCT emp_id 
                FROM dbo.MANPOWER_DAILY_LOGS WITH (NOLOCK)
                WHERE log_date >= :start1 AND log_date < :end1
            ) L ON L.emp_id = E.emp_id
            LEFT JOIN dbo.EMPLOYEE_GRADES G WITH (NOLOCK) 
                ON E.emp_id = G.emp_id AND G.evaluation_period = :period2
            LEFT JOIN (
                SELECT 
                    stu.emp_id,
                    SUM(
                        stu.head_count_ratio * (t.quantity * (
                            ISNULL(t.std_cost_dl_snapshot, ISNULL(i.Cost_DL, 0)) + 
                            ISNULL(t.std_cost_oh_snapshot, (ISNULL(i.Cost_OH_Machine, 0) + ISNULL(i.Cost_OH_Utilities, 0) + ISNULL(i.Cost_OH_Indirect, 0) + ISNULL(i.Cost_OH_Staff, 0) + ISNULL(i.Cost_OH_Accessory, 0) + ISNULL(i.Cost_OH_Others, 0)))
                        ))
                    ) AS income_per_head
                FROM dbo.STOCK_TRANSACTION_USERS stu WITH (NOLOCK)
                INNER JOIN dbo.STOCK_TRANSACTIONS t WITH (NOLOCK) ON stu.transaction_id = t.transaction_id
                LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
                WHERE t.transaction_timestamp >= DATEADD(HOUR, 8, CAST(:start3 AS DATETIME)) 
                  AND t.transaction_timestamp < DATEADD(HOUR, 8, CAST(:end3 AS DATETIME))
                  AND t.transaction_type LIKE 'PRODUCTION_%'
                GROUP BY stu.emp_id
            ) INC ON INC.emp_id = E.emp_id COLLATE Thai_CI_AS
            LEFT JOIN (
                SELECT 
                    LOGS.emp_id,
                    LOGS.present_days * RATES.daily_rate AS dl_wage,
                    LOGS.ot_hours * RATES.ot_rate AS ot_wage,
                    (LOGS.present_days * RATES.daily_rate) + (LOGS.ot_hours * RATES.ot_rate) AS total_wage,
                    LOGS.ot_hours
                FROM (
                    SELECT 
                        ml.emp_id,
                        COUNT(ml.log_date) AS present_days,
                        SUM(
                            CASE WHEN ml.scan_out_time IS NOT NULL AND ms.start_time IS NOT NULL 
                            THEN 
                                CASE WHEN DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) > 570 
                                THEN FLOOR((DATEDIFF(MINUTE, CAST(CONCAT(ml.log_date, ' ', ms.start_time) AS DATETIME), ml.scan_out_time) - 570) / 30.0) * 0.5 
                                ELSE 0 END
                            ELSE 0 END
                        ) AS ot_hours
                    FROM dbo.MANPOWER_DAILY_LOGS ml WITH (NOLOCK)
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES emp WITH (NOLOCK) ON ml.emp_id = emp.emp_id COLLATE Thai_CI_AS
                    LEFT JOIN dbo.MANPOWER_SHIFTS ms WITH (NOLOCK) ON ms.shift_id = ISNULL(ml.shift_id, emp.default_shift_id)
                    WHERE ml.log_date >= :start4 AND ml.log_date < :end4
                      AND ml.status IN ('PRESENT', 'LATE')
                    GROUP BY ml.emp_id
                ) LOGS
                LEFT JOIN (
                    SELECT 
                        e.emp_id,
                        COALESCE(
                            CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN cm.hourly_rate / 30.0 ELSE cm.hourly_rate END,
                            350.0
                        ) AS daily_rate,
                        COALESCE(CASE WHEN cm.rate_type LIKE 'MONTHLY%' THEN (cm.hourly_rate / 30.0) / 8.0 ELSE cm.hourly_rate / 8.0 END, 350.0 / 8.0) * 1.5 AS ot_rate
                    FROM dbo.MANPOWER_EMPLOYEES e WITH (NOLOCK)
                    OUTER APPLY (
                        SELECT TOP 1 * FROM dbo.MANPOWER_CATEGORY_MAPPING WITH (NOLOCK) 
                        WHERE e.position LIKE '%' + keyword + '%' COLLATE Thai_CI_AS 
                        ORDER BY display_order DESC
                    ) cm
                ) RATES ON RATES.emp_id = LOGS.emp_id COLLATE Thai_CI_AS
            ) WAGE ON WAGE.emp_id = E.emp_id COLLATE Thai_CI_AS
            LEFT JOIN dbo.EMPLOYEE_GRADING_CRITERIA C WITH (NOLOCK) ON C.line = E.line
            WHERE E.is_active = 1
        ";
        
        $params = [
            ':start1' => $startDate,
            ':end1' => $endDate,
            ':period2' => $period, // Grade period remains 'YYYY-MM'
            ':start3' => $startDate,
            ':end3' => $endDate,
            ':start4' => $startDate,
            ':end4' => $endDate
        ];
        
        if ($line !== 'ALL') {
            $sql .= " AND E.line = :line";
            $params[':line'] = $line;
        }

        if ($hcGroup !== 'ALL') {
            $sql .= " AND E.department_api IN (SELECT department_api FROM dbo.MANPOWER_TEAM_SETTINGS WHERE hc_group = :hcGroup)";
            $params[':hcGroup'] = $hcGroup;
        }
        
        $sql .= " ORDER BY E.line ASC, E.emp_id ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $results = [];
        foreach ($employees as $emp) {
            $income = (float)$emp['income_per_head'];
            $wage = (float)$emp['total_wage'];
            $ratio = $wage > 0 ? ($income / $wage) : 0;
            
            // Calculate System Grade based on Ratio
            $systemGrade = 'N/A';
            if (isset($emp['threshold_a']) && $emp['threshold_a'] > 0) {
                if ($ratio >= $emp['threshold_a']) {
                    $systemGrade = 'A';
                } else if ($ratio >= $emp['threshold_b']) {
                    $systemGrade = 'B';
                } else if ($ratio >= $emp['threshold_c']) {
                    $systemGrade = 'C';
                } else {
                    $systemGrade = 'D';
                }
            } else {
                // Default fallback if no criteria is set
                if ($ratio >= 2.0) {
                    $systemGrade = 'A';
                } else if ($ratio >= 1.5) {
                    $systemGrade = 'B';
                } else if ($ratio >= 1.0) {
                    $systemGrade = 'C';
                } else {
                    $systemGrade = 'D';
                }
            }
            
            $results[] = [
                'emp_id' => $emp['emp_id'],
                'name_th' => $emp['name_th'],
                'position' => $emp['position'],
                'line' => $emp['line'],
                'team_group' => $emp['team_group'],
                'income_per_head' => $income,
                'total_wage' => $wage,
                'dl_wage' => (float)($emp['dl_wage'] ?? 0),
                'ot_wage' => (float)($emp['ot_wage'] ?? 0),
                'ot_hours' => (float)($emp['ot_hours'] ?? 0),
                'ratio' => round($ratio, 2),
                'system_grade' => $systemGrade,
                'grade' => $emp['grade'] ?? '',
                'notes' => $emp['notes'] ?? ''
            ];
        }
        
        echo json_encode(['success' => true, 'data' => $results]);
        exit;
    }
    
    if ($action === 'save_grades') {
        $grades = json_decode($_POST['grades'] ?? '[]', true);
        $period = $_POST['period'] ?? date('Y-m');
        $userId = $_SESSION['user']['id'];
        
        if (empty($grades)) {
            throw new Exception("No grades provided to save.");
        }
        
        $pdo->beginTransaction();
        
        $stmtInsert = $pdo->prepare("
            INSERT INTO dbo.EMPLOYEE_GRADES (emp_id, evaluation_period, grade, evaluated_by, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, GETDATE(), GETDATE())
        ");
        
        $stmtUpdate = $pdo->prepare("
            UPDATE dbo.EMPLOYEE_GRADES 
            SET grade = ?, evaluated_by = ?, notes = ?, updated_at = GETDATE()
            WHERE emp_id = ? AND evaluation_period = ?
        ");
        
        $stmtCheck = $pdo->prepare("SELECT id FROM dbo.EMPLOYEE_GRADES WHERE emp_id = ? AND evaluation_period = ?");
        
        foreach ($grades as $g) {
            $empId = $g['emp_id'];
            $grade = $g['grade'];
            $notes = $g['notes'] ?? '';
            
            $stmtCheck->execute([$empId, $period]);
            if ($stmtCheck->fetchColumn()) {
                $stmtUpdate->execute([$grade, $userId, $notes, $empId, $period]);
            } else {
                $stmtInsert->execute([$empId, $period, $grade, $userId, $notes]);
            }
        }
        
        $pdo->commit();
        echo json_encode(['success' => true]);
        exit;
    }
    
    if ($action === 'verify_password') {
        $password = $_POST['password'] ?? '';
        $username = $_SESSION['user']['username'] ?? '';
        
        if (empty($password) || empty($username)) {
            throw new Exception("Missing password or session expired.");
        }
        
        // Use the constant defined in init.php or fallback
        $userTable = defined('USERS_TABLE') ? USERS_TABLE : 'dbo.USERS';
        $sql = "SELECT password FROM " . $userTable . " WHERE username = ? AND is_active = 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$username]);
        $hash = $stmt->fetchColumn();
        
        if ($hash && password_verify($password, $hash)) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception("Incorrect password.");
        }
        exit;
    }
    else if ($action === 'get_criteria') {
        $sql = "SELECT line, threshold_a, threshold_b, threshold_c FROM dbo.EMPLOYEE_GRADING_CRITERIA WITH (NOLOCK)";
        $stmt = $pdo->query($sql);
        $criteria = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        
        echo json_encode(['success' => true, 'data' => $criteria]);
        exit;
    }
    else if ($action === 'save_criteria') {
        $criteriaData = json_decode($_POST['criteria'] ?? '[]', true);
        if (!is_array($criteriaData)) {
            throw new Exception("Invalid criteria format");
        }
        
        $pdo->beginTransaction();
        
        $sql = "
            IF EXISTS (SELECT 1 FROM dbo.EMPLOYEE_GRADING_CRITERIA WHERE line = :line)
            BEGIN
                UPDATE dbo.EMPLOYEE_GRADING_CRITERIA 
                SET threshold_a = :a, threshold_b = :b, threshold_c = :c, updated_at = GETDATE(), updated_by = :user_id
                WHERE line = :line2
            END
            ELSE
            BEGIN
                INSERT INTO dbo.EMPLOYEE_GRADING_CRITERIA (line, threshold_a, threshold_b, threshold_c, updated_by)
                VALUES (:line3, :a2, :b2, :c2, :user_id2)
            END
        ";
        
        $stmt = $pdo->prepare($sql);
        $userId = $currentUser['id'] ?? null;
        
        foreach ($criteriaData as $c) {
            $line = $c['line'] ?? '';
            if (empty($line)) continue;
            
            $stmt->execute([
                ':line' => $line,
                ':a' => $c['threshold_a'] ?? 0,
                ':b' => $c['threshold_b'] ?? 0,
                ':c' => $c['threshold_c'] ?? 0,
                ':user_id' => $userId,
                ':line2' => $line,
                ':line3' => $line,
                ':a2' => $c['threshold_a'] ?? 0,
                ':b2' => $c['threshold_b'] ?? 0,
                ':c2' => $c['threshold_c'] ?? 0,
                ':user_id2' => $userId
            ]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Criteria updated successfully']);
        exit;
    }
    
    throw new Exception("Invalid action");
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
