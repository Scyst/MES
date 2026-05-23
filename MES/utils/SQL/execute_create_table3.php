<?php
require 'E:/MES/MES/MES/config/config.php';
try {
    $pdo = new PDO('sqlsrv:Server=' . DB_HOST . ';Database=' . DB_DATABASE . ';TrustServerCertificate=true', DB_USER, DB_PASSWORD);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $sql = file_get_contents('E:/MES/MES/MES/utils/SQL/create_deleted_tags_table.sql');
    $pdo->exec($sql);
    echo 'Table created successfully.';
} catch (PDOException $e) {
    if ($e->getCode() == '42S01') {
        echo 'Table already exists.';
    } else {
        echo 'Error: ' . $e->getMessage();
    }
}
?>
