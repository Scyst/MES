<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? $_GET['id'] : null;

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM TeamPlanner_Tasks ORDER BY CreatedAt DESC");
        $tasks = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['dueDate'] = formatDate($row['DueDate']);
            $row['startDate'] = formatDate($row['StartDate']);
            $row['startTime'] = $row['StartTime'];
            $row['endTime'] = $row['EndTime'];
            $row['priority'] = $row['Priority'] ?: 'normal';
            $row['description'] = $row['Description'] ?: '';
            $row['subtasks'] = $row['Subtasks'] ?: '[]';
            $row['tags'] = $row['Tags'] ?: '';
            $row['recurrence'] = $row['Recurrence'] ?: 'none';
            $row['projectId'] = $row['ProjectId'] ?: null;
            $row['projectChecklistId'] = $row['ProjectChecklistId'] ?: null;
            $tasks[] = $row;
        }
        sendJson($tasks);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO TeamPlanner_Tasks (Title, Status, Visibility, Assignee, DueDate, StartDate, StartTime, EndTime, Priority, Description, Subtasks, Tags, Recurrence, ProjectId, ProjectChecklistId) 
                OUTPUT INSERTED.* 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['title'],
            $data['status'] ?? 'todo',
            $data['visibility'] ?? 'public',
            $data['assignee'] ?? 'Unassigned',
            $data['dueDate'] ?? null,
            $data['startDate'] ?? null,
            $data['startTime'] ?? '09:00',
            $data['endTime'] ?? '18:00',
            $data['priority'] ?? 'normal',
            $data['description'] ?? null,
            $data['subtasks'] ?? '[]',
            $data['tags'] ?? '',
            $data['recurrence'] ?? 'none',
            $data['projectId'] ?? null,
            $data['projectChecklistId'] ?? null
        ]);
        
        $newTask = $stmt->fetch(PDO::FETCH_ASSOC);
        $newTask['dueDate'] = formatDate($newTask['DueDate']);
        $newTask['startDate'] = formatDate($newTask['StartDate']);
        $newTask['startTime'] = $newTask['StartTime'];
        $newTask['endTime'] = $newTask['EndTime'];
        $newTask['priority'] = $newTask['Priority'] ?: 'normal';
        $newTask['description'] = $newTask['Description'] ?: '';
        $newTask['subtasks'] = $newTask['Subtasks'] ?: '[]';
        $newTask['tags'] = $newTask['Tags'] ?: '';
        $newTask['recurrence'] = $newTask['Recurrence'] ?: 'none';
        $newTask['projectId'] = $newTask['ProjectId'] ?: null;
        $newTask['projectChecklistId'] = $newTask['ProjectChecklistId'] ?: null;
        
        // Sync checklist if created as done
        if ($newTask['Status'] === 'done' && !empty($newTask['ProjectChecklistId']) && !empty($newTask['ProjectId'])) {
            $pStmt = $pdo->prepare("SELECT Checklist FROM TeamPlanner_Projects WHERE Id = ?");
            $pStmt->execute([$newTask['ProjectId']]);
            $project = $pStmt->fetch(PDO::FETCH_ASSOC);
            if ($project && !empty($project['Checklist'])) {
                $checklist = json_decode($project['Checklist'], true);
                $changed = false;
                if (is_array($checklist)) {
                    foreach ($checklist as &$item) {
                        if (isset($item['id']) && $item['id'] == $newTask['ProjectChecklistId']) {
                            if (!$item['isDone']) {
                                $item['isDone'] = true;
                                $changed = true;
                            }
                            break;
                        }
                    }
                }
                if ($changed) {
                    $updStmt = $pdo->prepare("UPDATE TeamPlanner_Projects SET Checklist = ? WHERE Id = ?");
                    $updStmt->execute([json_encode($checklist), $newTask['ProjectId']]);
                }
            }
        }
        
        logActivity($pdo, "Task created: " . $data['title'] . " by " . ($data['assignee'] ?? 'Unassigned'));
        sendJson($newTask, 201);
    } 
    elseif ($method === 'PUT' && $id) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $updateFields = [];
        $params = [];
        
        $fields = [
            'status' => 'Status', 'title' => 'Title', 'assignee' => 'Assignee', 
            'startDate' => 'StartDate', 'dueDate' => 'DueDate', 'startTime' => 'StartTime', 
            'endTime' => 'EndTime', 'visibility' => 'Visibility', 'priority' => 'Priority', 
            'description' => 'Description', 'subtasks' => 'Subtasks', 'tags' => 'Tags', 'recurrence' => 'Recurrence', 'projectId' => 'ProjectId', 'projectChecklistId' => 'ProjectChecklistId'
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
        $sql = "UPDATE TeamPlanner_Tasks SET " . implode(', ', $updateFields) . " OUTPUT INSERTED.* WHERE Id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $updatedTask = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$updatedTask) {
            sendJson(['error' => 'Task not found'], 404);
        }
        
        $updatedTask['dueDate'] = formatDate($updatedTask['DueDate']);
        $updatedTask['startDate'] = formatDate($updatedTask['StartDate']);
        $updatedTask['startTime'] = $updatedTask['StartTime'];
        $updatedTask['endTime'] = $updatedTask['EndTime'];
        $updatedTask['priority'] = $updatedTask['Priority'] ?: 'normal';
        $updatedTask['description'] = $updatedTask['Description'] ?: '';
        $updatedTask['subtasks'] = $updatedTask['Subtasks'] ?: '[]';
        $updatedTask['tags'] = $updatedTask['Tags'] ?: '';
        $updatedTask['recurrence'] = $updatedTask['Recurrence'] ?: 'none';
        $updatedTask['projectId'] = $updatedTask['ProjectId'] ?: null;
        $updatedTask['projectChecklistId'] = $updatedTask['ProjectChecklistId'] ?: null;
        
        if (array_key_exists('status', $data) && !empty($updatedTask['ProjectChecklistId']) && !empty($updatedTask['ProjectId'])) {
            $pStmt = $pdo->prepare("SELECT Checklist FROM TeamPlanner_Projects WHERE Id = ?");
            $pStmt->execute([$updatedTask['ProjectId']]);
            $project = $pStmt->fetch(PDO::FETCH_ASSOC);
            if ($project && !empty($project['Checklist'])) {
                $checklist = json_decode($project['Checklist'], true);
                $isDone = ($updatedTask['Status'] === 'done');
                $changed = false;
                if (is_array($checklist)) {
                    foreach ($checklist as &$item) {
                        if (isset($item['id']) && $item['id'] == $updatedTask['ProjectChecklistId']) {
                            if (!isset($item['isDone']) || $item['isDone'] !== $isDone) {
                                $item['isDone'] = $isDone;
                                $changed = true;
                            }
                            break;
                        }
                    }
                }
                if ($changed) {
                    $updStmt = $pdo->prepare("UPDATE TeamPlanner_Projects SET Checklist = ? WHERE Id = ?");
                    $updStmt->execute([json_encode($checklist), $updatedTask['ProjectId']]);
                }
            }
        }
        
        logActivity($pdo, "Task updated: " . $updatedTask['Title']);
        sendJson($updatedTask);
    } 
    elseif ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("DELETE FROM TeamPlanner_Tasks WHERE Id = ?");
        $stmt->execute([$id]);
        logActivity($pdo, "Task deleted (ID: $id)");
        http_response_code(204);
        exit;
    }
} catch (Exception $e) {
    error_log($e->getMessage());
    sendJson(['error' => 'Server Error', 'details' => $e->getMessage()], 500);
}
?>