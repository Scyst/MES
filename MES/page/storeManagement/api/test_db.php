<?php
require_once dirname(__DIR__) . '/../../config/database.php';
$stmt = $pdo->query("SELECT j.job_id, j.job_no, j.status, j.location_id, l.location_type, l.production_line 
                     FROM dbo.PRODUCTION_JOBS j 
                     LEFT JOIN dbo.LOCATIONS l ON j.location_id = l.location_id 
                     WHERE j.status IN ('PENDING', 'RUNNING', 'PAUSED')");
$jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "ACTIVE JOBS:\n";
print_r($jobs);
?>
