<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../db.php';

try {
    $stmt = $pdo->query("sp_helptext 'sp_SaveCalendarEvent'");
    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($res as $row) {
        echo $row['Text'];
    }
} catch (Exception $e) {
    echo $e->getMessage();
}
