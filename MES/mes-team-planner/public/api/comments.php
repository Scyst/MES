<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$taskId = isset($_GET['taskId']) ? $_GET['taskId'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : null;

try {
    if ($method === 'GET' && $action === 'recent') {
        $sql = "SELECT c.*, t.Title as TaskTitle, t.Assignee as TaskAssignee 
                FROM TeamPlanner_Comments c
                JOIN TeamPlanner_Tasks t ON c.TaskId = t.Id
                ORDER BY c.CreatedAt DESC
                OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        sendJson($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($method === 'GET' && $taskId) {
        $stmt = $pdo->prepare("SELECT * FROM TeamPlanner_Comments WHERE TaskId = ? ORDER BY CreatedAt ASC");
        $stmt->execute([$taskId]);
        sendJson($stmt->fetchAll(PDO::FETCH_ASSOC));
    } 
    elseif ($method === 'POST' && $taskId) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO TeamPlanner_Comments (TaskId, Author, Message) OUTPUT INSERTED.* VALUES (?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $taskId,
            $data['author'] ?? 'User',
            $data['message']
        ]);
        
        sendJson($stmt->fetch(PDO::FETCH_ASSOC), 201);
    }
} catch (Exception $e) {
    sendJson(['error' => 'Server Error'], 500);
}
?>