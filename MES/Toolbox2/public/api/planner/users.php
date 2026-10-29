<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT username, fullname, role, aka FROM USERS WHERE is_active = 1 ORDER BY fullname ASC");
        $users = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $users[] = $row;
        }
        sendJson($users);
    } else {
        sendJson(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    sendJson(['error' => $e->getMessage()], 500);
}
?>
