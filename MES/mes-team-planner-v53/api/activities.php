<?php
require_once 'db_helper.php';

try {
    $stmt = $pdo->query("SELECT TOP 50 * FROM TeamPlanner_Activities ORDER BY CreatedAt DESC");
    sendJson($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    sendJson(['error' => 'Server Error'], 500);
}
?>