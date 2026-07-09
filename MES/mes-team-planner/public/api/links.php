<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? $_GET['id'] : null;

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM TeamPlanner_Links ORDER BY CreatedAt DESC");
        sendJson($stmt->fetchAll(PDO::FETCH_ASSOC));
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO TeamPlanner_Links (Title, Url, Category, CreatedBy) OUTPUT INSERTED.* VALUES (?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['title'],
            $data['url'],
            $data['category'] ?? 'General',
            $data['createdBy'] ?? 'User'
        ]);
        
        logActivity($pdo, "New link added: " . $data['title']);
        sendJson($stmt->fetch(PDO::FETCH_ASSOC), 201);
    } 
    elseif ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("DELETE FROM TeamPlanner_Links WHERE Id = ?");
        $stmt->execute([$id]);
        http_response_code(204);
        exit;
    }
} catch (Exception $e) {
    sendJson(['error' => 'Server Error'], 500);
}
?>