<?php
require_once 'db_helper.php';

if (!isset($_SESSION['user'])) {
    sendJson(['error' => 'Unauthorized'], 401);
}

$user = $_SESSION['username'] ?? ($_SESSION['user']['username'] ?? 'Unknown');
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : null;

try {
    if ($method === 'GET') {
        if ($action === 'recent') {
            // Get recent comments for tasks (last 30 days)
            $sql = "
                SELECT m.Id, m.RoomId, m.Author, m.Message, m.CreatedAt, m.Attachments,
                       r.ReferenceId as TaskId,
                       t.Assignee as TaskAssignee
                FROM TeamPlanner_ChatMessages m
                JOIN TeamPlanner_ChatRooms r ON m.RoomId = r.Id
                JOIN TeamPlanner_Tasks t ON r.ReferenceId = t.Id
                WHERE r.Type = 'task' 
                  AND m.CreatedAt >= DATEADD(day, -30, GETDATE())
                ORDER BY m.CreatedAt DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format attachments
            foreach($recent as &$r) {
                $r['Attachments'] = json_decode($r['Attachments'] ?: '[]', true);
            }
            sendJson($recent);
        } else {
            $taskId = isset($_GET['taskId']) ? (int)$_GET['taskId'] : 0;
            if (!$taskId) sendJson(['error' => 'Missing taskId'], 400);

            // Get RoomId for this task
            $stmtRoom = $pdo->prepare("SELECT Id FROM TeamPlanner_ChatRooms WHERE Type = 'task' AND ReferenceId = ?");
            $stmtRoom->execute([$taskId]);
            $roomId = $stmtRoom->fetchColumn();

            if (!$roomId) {
                sendJson([]); // No room yet = no comments
            }

            $stmt = $pdo->prepare("SELECT * FROM TeamPlanner_ChatMessages WHERE RoomId = ? ORDER BY CreatedAt ASC");
            $stmt->execute([$roomId]);
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach($messages as &$m) {
                $m['Attachments'] = json_decode($m['Attachments'] ?: '[]', true);
            }
            sendJson($messages);
        }
    } elseif ($method === 'POST') {
        // Post a new comment for a task
        $taskId = isset($_GET['taskId']) ? (int)$_GET['taskId'] : 0;
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$taskId) {
            $taskId = $data['taskId'] ?? 0;
        }

        if (!$taskId) sendJson(['error' => 'Missing taskId'], 400);

        $message = $data['message'] ?? $data['Message'] ?? '';
        $attachments = isset($data['attachments']) ? json_encode($data['attachments']) : '[]';

        if (empty(trim($message)) && $attachments === '[]') {
            sendJson(['error' => 'Empty comment'], 400);
        }

        // Get or create room for task
        $stmtRoom = $pdo->prepare("SELECT Id FROM TeamPlanner_ChatRooms WHERE Type = 'task' AND ReferenceId = ?");
        $stmtRoom->execute([$taskId]);
        $roomId = $stmtRoom->fetchColumn();

        if (!$roomId) {
            // Need to insert a new room
            $stmt2 = $pdo->prepare("INSERT INTO TeamPlanner_ChatRooms (Type, ReferenceId) OUTPUT INSERTED.Id VALUES ('task', ?)");
            $stmt2->execute([$taskId]);
            $roomId = $stmt2->fetchColumn();
        }

        $stmt = $pdo->prepare("INSERT INTO TeamPlanner_ChatMessages (RoomId, Author, Message, Attachments) OUTPUT INSERTED.* VALUES (?, ?, ?, ?)");
        $stmt->execute([$roomId, $user, $message, $attachments]);
        
        $newMsg = $stmt->fetch(PDO::FETCH_ASSOC);
        $newMsg['Attachments'] = json_decode($newMsg['Attachments'], true);
        
        sendJson($newMsg, 201);
    } else {
        sendJson(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('comments.php error: ' . $e->getMessage());
    sendJson(['error' => 'Server Error'], 500);
}
