<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $currentUsername = $_SESSION['user']['username'] ?? '';
    if (!$currentUsername) {
        sendJson(['error' => 'Unauthorized'], 401);
    }

    if ($method === 'GET') {
        $stmt = $pdo->prepare("SELECT aka FROM USERS WHERE username = ?");
        $stmt->execute([$currentUsername]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        sendJson(['aka' => $user ? $user['aka'] : '']);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $aka = $data['aka'] ?? '';
        
        $stmt = $pdo->prepare("UPDATE USERS SET aka = ? WHERE username = ?");
        $stmt->execute([$aka, $currentUsername]);
        
        sendJson(['success' => true, 'aka' => $aka]);
    } else {
        sendJson(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    sendJson(['error' => $e->getMessage()], 500);
}
?>
