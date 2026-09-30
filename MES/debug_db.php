<?php
require_once __DIR__ . '/page/db.php';
$stmt = $pdo->query("SELECT TOP 5 header_id, log_date, shift, status FROM dbo.PAINT_CHEM_SHEET_HEADER ORDER BY header_id DESC");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);
?>
