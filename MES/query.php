<?php
require 'e:/MES/MES/MES/db.php';
$stmt = $pdo->query("SELECT id, parent_id, item_name, account_code, data_source FROM dbo.PL_STRUCTURE WHERE account_code LIKE '%DL%' OR account_code LIKE '%OT%' OR account_code LIKE '522%' OR parent_id IN (SELECT id FROM dbo.PL_STRUCTURE WHERE account_code = 'GRP_DL') ORDER BY parent_id, row_order");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
?>
