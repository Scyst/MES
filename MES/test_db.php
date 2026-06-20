<?php
require_once __DIR__ . '/page/db.php';
try {
    $stmt = $pdo->query("SELECT TOP 5 id, file_name, file_type, category FROM dbo.DOCUMENTS ORDER BY id DESC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows);
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage();
}
