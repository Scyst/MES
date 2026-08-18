<?php
/**
 * agent_api.php
 * Dedicated REST endpoint for AI Agents to interact with the MES Team Planner.
 * NOTE: Intentionally bypasses session auth — uses ?user=<username> for identity.
 * Only expose this endpoint to trusted internal networks or authenticated agents.
 */

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Resolve DB path (same pattern as db_helper.php)
$dbPath1 = __DIR__ . '/../../page/db.php';
$dbPath2 = __DIR__ . '/../../../MES/MES/page/db.php';

if (file_exists($dbPath1)) {
    require_once $dbPath1;
} elseif (file_exists($dbPath2)) {
    require_once $dbPath2;
} else {
    echo json_encode(["success" => false, "message" => "DB config not found."]);
    exit;
}

// $pdo is now available from db.php

$action = $_GET['action'] ?? '';
$user = trim($_GET['user'] ?? '');

if (!$user) {
    echo json_encode(["success" => false, "message" => "Missing 'user' parameter."]);
    exit;
}

try {
    switch ($action) {
        case 'get_timeline':
            $stmt = $pdo->prepare("
                SELECT Id, Title, Status, Priority, DueDate, StartDate, SpaceId, ProjectId, Assignee, Tags
                FROM TeamPlanner_Tasks 
                WHERE Assignee LIKE ? 
                ORDER BY CASE WHEN DueDate IS NULL THEN 1 ELSE 0 END, DueDate ASC
            ");
            $stmt->execute(["%$user%"]);
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmtProj = $pdo->query("
                SELECT Id, Title, SpaceId, Status, Description 
                FROM TeamPlanner_Projects 
                WHERE Status != 'Completed' AND Status != 'done'
            ");
            $projects = $stmtProj->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "data" => [
                    "tasks" => $tasks,
                    "projects" => $projects,
                    "fetched_for_user" => $user
                ]
            ]);
            break;

        case 'create_task':
            $input = json_decode(file_get_contents("php://input"), true);
            if (!$input) {
                echo json_encode(["success" => false, "message" => "Invalid JSON payload"]);
                exit;
            }

            $title       = htmlspecialchars(trim($input['title'] ?? 'New Task'), ENT_QUOTES, 'UTF-8');
            $description = $input['description'] ?? '';
            $status      = in_array($input['status'] ?? '', ['todo','in-progress','done']) ? $input['status'] : 'todo';
            $visibility  = in_array($input['visibility'] ?? '', ['public','private']) ? $input['visibility'] : 'public';
            $assignee    = $input['assignee'] ?? $user;
            $priority    = in_array($input['priority'] ?? '', ['low','normal','high','urgent']) ? $input['priority'] : 'normal';
            $dueDate     = !empty($input['dueDate']) ? $input['dueDate'] : null;
            $startDate   = !empty($input['startDate']) ? $input['startDate'] : null;
            $startTime   = !empty($input['startTime']) ? $input['startTime'] : null;
            $endTime     = !empty($input['endTime']) ? $input['endTime'] : null;
            $projectId   = !empty($input['projectId']) ? intval($input['projectId']) : null;
            $spaceId     = !empty($input['spaceId']) ? intval($input['spaceId']) : null;

            // Subtasks as JSON array of { id, title, completed }
            $subtasks = '[]';
            if (isset($input['subtasks']) && is_array($input['subtasks'])) {
                $subtasks = json_encode($input['subtasks'], JSON_UNESCAPED_UNICODE);
            }

            $sql = "INSERT INTO TeamPlanner_Tasks 
                        (Title, Description, Status, Visibility, Assignee, Priority, DueDate, StartDate, StartTime, EndTime, ProjectId, SpaceId, Subtasks, CreatedBy) 
                    OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Status, INSERTED.DueDate
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $title, $description, $status, $visibility, $assignee, $priority,
                $dueDate, $startDate, $startTime, $endTime, $projectId, $spaceId, $subtasks, "Agent-$user"
            ]);
            $newTask = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $newTask, "message" => "Task created successfully"]);
            break;

        case 'create_project':
            $input = json_decode(file_get_contents("php://input"), true);
            if (!$input) {
                echo json_encode(["success" => false, "message" => "Invalid JSON payload"]);
                exit;
            }

            $title       = htmlspecialchars(trim($input['title'] ?? 'New Project'), ENT_QUOTES, 'UTF-8');
            $description = $input['description'] ?? '';
            $status      = $input['status'] ?? 'active';
            $spaceId     = !empty($input['spaceId']) ? intval($input['spaceId']) : null;

            // Checklist as JSON array of { id, text, isDone }
            $checklist = '[]';
            if (isset($input['checklist']) && is_array($input['checklist'])) {
                $checklist = json_encode($input['checklist'], JSON_UNESCAPED_UNICODE);
            }

            $sql = "INSERT INTO TeamPlanner_Projects 
                        (Title, Description, Status, SpaceId, Checklist, CreatedBy) 
                    OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Status
                    VALUES (?, ?, ?, ?, ?, ?)";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $title, $description, $status, $spaceId, $checklist, "Agent-$user"
            ]);
            $newProject = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $newProject, "message" => "Project created successfully"]);
            break;

        default:
            echo json_encode(["success" => false, "message" => "Invalid or missing 'action' parameter. Valid: get_timeline, create_task, create_project"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
