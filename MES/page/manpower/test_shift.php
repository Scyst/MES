<?php
require 'db.php';
$stmtShifts = $pdo->query("SELECT shift_id, start_time FROM dbo.MANPOWER_SHIFTS");
$res = $stmtShifts->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($res);
