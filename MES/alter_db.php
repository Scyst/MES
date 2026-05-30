<?php
require_once __DIR__ . '/page/db.php';

try {
    $pdo->exec("ALTER TABLE dbo.STORE_REQUISITIONS ADD internal_job_no VARCHAR(50) NULL");
    echo "Successfully added internal_job_no to STORE_REQUISITIONS\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false || strpos($e->getMessage(), 'column names in each table must be unique') !== false) {
        echo "Column already exists\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
?>
