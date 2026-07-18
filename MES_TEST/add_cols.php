<?php
require_once __DIR__ . '/page/db.php';
try {
    $pdo->exec("ALTER TABLE dbo.MT_ITEMS ADD created_at DATETIME DEFAULT GETDATE()");
    echo "Added created_at. ";
} catch (Exception $e) {
    echo "created_at exists. ";
}
try {
    $pdo->exec("ALTER TABLE dbo.MT_ITEMS ADD last_updated DATETIME DEFAULT GETDATE()");
    echo "Added last_updated. ";
} catch (Exception $e) {
    echo "last_updated exists. ";
}
