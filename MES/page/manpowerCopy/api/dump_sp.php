<?php
require_once __DIR__ . '/../../db.php';
$stmt = $pdo->query("sp_helptext 'sp_GetManpowerDashboardData_TEST'");
$result = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($result as $row) {
    echo $row['Text'];
}
?>
