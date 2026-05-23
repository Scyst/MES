<?php
require 'E:/MES/MES/MES/page/db.php';
try {
    $pdo = new PDO('sqlsrv:Server=' . DB_HOST . ';Database=' . DB_DATABASE, DB_USER, DB_PASSWORD);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE TABLE dbo.DELETED_SERIAL_TAGS (deleted_id INT IDENTITY(1,1) PRIMARY KEY, serial_no VARCHAR(50) NOT NULL, master_pallet_no VARCHAR(50) NULL, item_id INT NOT NULL, qty_per_pallet DECIMAL(18,4) DEFAULT 0, current_qty DECIMAL(18,4) DEFAULT 0, status VARCHAR(50) NULL, po_number VARCHAR(100) NULL, warehouse_no VARCHAR(100) NULL, pallet_no VARCHAR(100) NULL, ctn_number VARCHAR(100) NULL, week_no VARCHAR(50) NULL, remark NVARCHAR(MAX) NULL, original_created_at DATETIME NULL, original_created_by INT NULL, deleted_at DATETIME DEFAULT GETDATE(), deleted_by INT NOT NULL);");
    echo 'Table created successfully.';
} catch (PDOException $e) {
    if ($e->getCode() == '42S01') {
        echo 'Table already exists.';
    } else {
        echo 'Error: ' . $e->getMessage();
    }
}
?>
