<?php
require_once 'e:\MES\MES\MES\db.php';
$stmt = $pdo->query("SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COMPUTED_IS_PERSISTED = ISNULL(C.is_persisted, 0)
    FROM INFORMATION_SCHEMA.COLUMNS I
    LEFT JOIN sys.computed_columns C ON object_id(I.TABLE_NAME) = C.object_id AND I.COLUMN_NAME = C.name
    WHERE I.TABLE_NAME = 'PE_DOWNTIME_LOG'");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($cols);
?>
