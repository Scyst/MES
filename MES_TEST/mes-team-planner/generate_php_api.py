import os

api_dir = r"e:\MES\MES\MES\mes-team-planner\api"
os.makedirs(api_dir, exist_ok=True)

db_helper = """<?php
// Resolve paths for local vs sandbox
$authPath1 = __DIR__ . '/../../auth/check_auth.php'; // Local
$authPath2 = __DIR__ . '/../../../MES/MES/auth/check_auth.php'; // Sandbox Server

if (file_exists($authPath1)) require_once $authPath1;
elseif (file_exists($authPath2)) require_once $authPath2;
else die(json_encode(['error' => 'Auth file not found.']));

$dbPath1 = __DIR__ . '/../../page/db.php';
$dbPath2 = __DIR__ . '/../../../MES/MES/page/db.php';

if (file_exists($dbPath1)) require_once $dbPath1;
elseif (file_exists($dbPath2)) require_once $dbPath2;
else die(json_encode(['error' => 'DB config not found.']));

// The above db.php provides $pdo
header('Content-Type: application/json; charset=utf-8');

function logActivity($pdo, $message) {
    try {
        $stmt = $pdo->prepare("INSERT INTO TeamPlanner_Activities (Message) VALUES (?)");
        $stmt->execute([$message]);
    } catch (Exception $e) {
        error_log('Failed to log activity: ' . $e->getMessage());
    }
}

function formatDate($dateString) {
    if (!$dateString) return null;
    $d = new DateTime($dateString);
    return $d->format('Y-m-d');
}

function getNextDate($currentDateStr, $recurrence) {
    if (!$currentDateStr) return null;
    $d = new DateTime($currentDateStr);
    if ($recurrence === 'daily') $d->modify('+1 day');
    elseif ($recurrence === 'weekly') $d->modify('+7 days');
    elseif ($recurrence === 'monthly') $d->modify('+1 month');
    return $d->format('Y-m-d');
}

function sendJson($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Ensure $_SESSION['user'] exists
if (!isset($_SESSION['user'])) {
    sendJson(['error' => 'Unauthorized'], 401);
}
?>"""

tasks_php = """<?php
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
            $tasks[] = $row;
        }
        sendJson($tasks);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO TeamPlanner_Tasks (Title, Status, Visibility, Assignee, DueDate, StartDate, StartTime, EndTime, Priority, Description, Subtasks, Tags, Recurrence, ProjectId) 
                OUTPUT INSERTED.* 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
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
            $data['recurrence'] ?? 'none'
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
            'description' => 'Description', 'subtasks' => 'Subtasks', 'tags' => 'Tags', 'recurrence' => 'Recurrence'
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
?>"""

events_php = """<?php
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
?>"""

links_php = """<?php
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
?>"""

activities_php = """<?php
require_once 'db_helper.php';

try {
    $stmt = $pdo->query("SELECT TOP 50 * FROM TeamPlanner_Activities ORDER BY CreatedAt DESC");
    sendJson($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    sendJson(['error' => 'Server Error'], 500);
}
?>"""

comments_php = """<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$taskId = isset($_GET['taskId']) ? $_GET['taskId'] : null;

try {
    if ($method === 'GET' && $taskId) {
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
?>"""

def write_file(filename, content):
    with open(os.path.join(api_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

write_file("db_helper.php", db_helper)
write_file("tasks.php", tasks_php)
write_file("events.php", events_php)
write_file("links.php", links_php)
write_file("activities.php", activities_php)
write_file("comments.php", comments_php)

print("PHP API files generated successfully in /api/")
