<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? $_GET['id'] : null;

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM TeamPlanner_Events ORDER BY Date ASC");
        $events = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['date'] = formatDate($row['Date']);
            $events[] = $row;
        }
        sendJson($events);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO TeamPlanner_Events (Title, Date, Type, Assignee) OUTPUT INSERTED.* VALUES (?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['title'],
            $data['date'],
            $data['type'] ?? 'meeting',
            $data['assignee'] ?? null
        ]);
        
        $newEvent = $stmt->fetch(PDO::FETCH_ASSOC);
        $newEvent['date'] = formatDate($newEvent['Date']);
        
        $msg = "Event created: " . $data['title'];
        if (($data['type'] ?? '') === 'leave') {
            $msg = ($data['assignee'] ?? 'Someone') . " is taking a leave on " . $data['date'];
        }
        logActivity($pdo, $msg);
        
        sendJson($newEvent, 201);
    } 
    elseif ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("DELETE FROM TeamPlanner_Events WHERE Id = ?");
        $stmt->execute([$id]);
        http_response_code(204);
        exit;
    }
} catch (Exception $e) {
    sendJson(['error' => 'Server Error'], 500);
}
?>