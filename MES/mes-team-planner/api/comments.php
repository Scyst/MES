<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$taskId = isset($_GET['taskId']) ? $_GET['taskId'] : null;

try {
    // BUG-004: Handle ?action=recent for NotificationWidget
    if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'recent') {
        $stmt = $pdo->prepare(
            "SELECT TOP 200 c.*, t.Assignee AS TaskAssignee
             FROM TeamPlanner_Comments c
             LEFT JOIN TeamPlanner_Tasks t ON c.TaskId = t.Id
             ORDER BY c.CreatedAt DESC"
        );
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

        // BUG-020: Validate message field
        if (empty(trim($data['message'] ?? ''))) {
            http_response_code(400);
            sendJson(['error' => 'Message is required']);
        }

        $sql = "INSERT INTO TeamPlanner_Comments (TaskId, Author, Message) OUTPUT INSERTED.* VALUES (?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $taskId,
            $data['author'] ?? 'User',
            trim($data['message'])
        ]);

        sendJson($stmt->fetch(PDO::FETCH_ASSOC), 201);
    }
    else {
        sendJson(['error' => 'Method not allowed or missing parameters'], 405);
    }
} catch (Exception $e) {
    error_log('comments.php error: ' . $e->getMessage());
    sendJson(['error' => 'Server Error'], 500);
}
?>
