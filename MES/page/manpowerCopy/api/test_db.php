<?php
require_once '../../db.php';
try {
    $stmt = $pdo->query("
        SELECT 
            e.department_api AS department_api, 
            ISNULL(s.hc_group, 'MAIN') as hc_group
        FROM (
            SELECT DISTINCT department_api 
            FROM dbo.MANPOWER_EMPLOYEES_TEST 
            WHERE department_api IS NOT NULL AND department_api != '' AND is_active = 1
        ) e
        LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS_TEST s 
          ON e.department_api = s.department_api
        ORDER BY e.department_api
    ");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
