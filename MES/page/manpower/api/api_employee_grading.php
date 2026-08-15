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
$period = $_GET['period'] ?? date('Y-m'); // Default current month
$line = $_GET['line'] ?? 'ALL';
$hcGroup = $_GET['hcGroup'] ?? 'ALL';

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
                ISNULL(INC.income_per_head, 0) AS income_per_head
            FROM dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK)
            INNER JOIN (
                SELECT DISTINCT emp_id 
                FROM dbo.MANPOWER_DAILY_LOGS WITH (NOLOCK)
                WHERE log_date LIKE :period1 + '%'
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
                WHERE t.transaction_timestamp LIKE :period3 + '%'
                  AND t.transaction_type LIKE 'PRODUCTION_%'
                GROUP BY stu.emp_id
            ) INC ON INC.emp_id = E.emp_id COLLATE Thai_CI_AS
            WHERE E.is_active = 1
        ";
        
        $params = [
            ':period1' => $period,
            ':period2' => $period,
            ':period3' => $period
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
            $results[] = [
                'emp_id' => $emp['emp_id'],
                'name_th' => $emp['name_th'],
                'position' => $emp['position'],
                'line' => $emp['line'],
                'team_group' => $emp['team_group'],
                'income_per_head' => (float)$emp['income_per_head'],
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
        echo json_encode(['success' => true, 'message' => 'Grades saved successfully.']);
        exit;
    }
    
    throw new Exception("Unknown action.");
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
