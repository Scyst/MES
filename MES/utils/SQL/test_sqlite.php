<?php
try {
    $pdo = new PDO('sqlite:E:/MES/MES/MES/temp_db.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo 'SQLite connected';
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage();
}
?>
