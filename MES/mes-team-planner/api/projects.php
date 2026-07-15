<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? $_GET['id'] : null;

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM TeamPlanner_Projects ORDER BY CreatedAt DESC");
        $projects = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (!empty($row['StartDate'])) $row['StartDate'] = formatDate($row['StartDate']);
            if (!empty($row['DueDate'])) $row['DueDate'] = formatDate($row['DueDate']);
            $projects[] = $row;
        }
        sendJson($projects);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO TeamPlanner_Projects (Title, Description, Status, Assignee, StartDate, DueDate, Tags, Priority) OUTPUT INSERTED.* VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['title'],
            $data['description'] ?? null,
            $data['status'] ?? 'active',
            $data['assignee'] ?? null,
            $data['startDate'] ?? null,
            $data['dueDate'] ?? null,
            $data['tags'] ?? null,
            $data['priority'] ?? 'normal'
        ]);
        
        $newProject = $stmt->fetch(PDO::FETCH_ASSOC);
        
        logActivity($pdo, "Project created: " . $data['title']);
        sendJson($newProject, 201);
    }
    elseif ($method === 'PUT' && $id) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $updateFields = [];
        $params = [];
        
        $fields = [
            'status' => 'Status', 'title' => 'Title', 'description' => 'Description',
            'assignee' => 'Assignee', 'startDate' => 'StartDate', 'dueDate' => 'DueDate',
            'tags' => 'Tags', 'priority' => 'Priority'
        ];
        
        foreach ($fields as $jsonKey => $dbKey) {
            if (array_key_exists($jsonKey, $data)) {
                $updateFields[] = "$dbKey = ?";
                $params[] = $data[$jsonKey];
            }
        }
        
        if (empty($updateFields)) {
            sendJson(['error' => 'No fields to update'], 400);
        }
        
        $params[] = $id;
        $sql = "UPDATE TeamPlanner_Projects SET " . implode(', ', $updateFields) . " OUTPUT INSERTED.* WHERE Id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $updatedProject = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$updatedProject) {
            sendJson(['error' => 'Project not found'], 404);
        }
        
        logActivity($pdo, "Project updated: " . $updatedProject['Title']);
        sendJson($updatedProject);
    } 
    elseif ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("DELETE FROM TeamPlanner_Projects WHERE Id = ?");
        $stmt->execute([$id]);
        
        // Unlink tasks
        $stmt2 = $pdo->prepare("UPDATE TeamPlanner_Tasks SET ProjectId = NULL WHERE ProjectId = ?");
        $stmt2->execute([$id]);
        
        logActivity($pdo, "Project deleted (ID: $id)");
        http_response_code(204);
        exit;
    }
} catch (Exception $e) {
    sendJson(['error' => 'Server Error'], 500);
}
?>
