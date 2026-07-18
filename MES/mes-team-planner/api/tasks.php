<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? $_GET['id'] : null;

function formatTaskOutput($row) {
    $row['dueDate'] = formatDate($row['DueDate'] ?? null);
    $row['startDate'] = formatDate($row['StartDate'] ?? null);
    $row['startTime'] = $row['StartTime'] ?? null;
    $row['endTime'] = $row['EndTime'] ?? null;
    $row['priority'] = $row['Priority'] ?: 'normal';
    $row['description'] = $row['Description'] ?: '';
    $row['subtasks'] = $row['Subtasks'] ?: '[]';
    $row['tags'] = $row['Tags'] ?: '';
    $row['recurrence'] = $row['Recurrence'] ?: 'none';
    $row['projectId'] = $row['ProjectId'] ?: null;
    $row['projectChecklistId'] = $row['ProjectChecklistId'] ?: null;
    $row['spaceId'] = $row['SpaceId'] ?: null;
    $row['groupId'] = $row['GroupId'] ?: null;
    $row['recurrenceSettings'] = $row['RecurrenceSettings'] ?: null;
    return $row;
}

try {
    if ($method === 'GET') {
        $currentUserFullname = $_SESSION['user']['fullname'] ?? '';
        $currentUsername = $_SESSION['user']['username'] ?? '';
        $akasStr = isset($_GET['akas']) ? $_GET['akas'] : '';
        $akas = array_filter(array_map('trim', explode(',', $akasStr)));

        $conditions = ["Visibility = 'public'"];
        $params = [];
        
        if ($currentUsername) {
            $conditions[] = "CreatedBy = ?";
            $params[] = $currentUsername;
            
            $conditions[] = "Assignee LIKE ?";
            $params[] = "%$currentUsername%";
            
            if ($currentUserFullname) {
                $conditions[] = "Assignee LIKE ?";
                $params[] = "%$currentUserFullname%";
            }
            
            foreach ($akas as $aka) {
                $conditions[] = "Assignee LIKE ?";
                $params[] = "%$aka%";
            }
        }
        
        $whereClause = "";
        if (count($conditions) > 1) {
            $visibilityCondition = array_shift($conditions);
            $whereClause = "WHERE ($visibilityCondition OR " . implode(' OR ', $conditions) . ")";
        } else {
            $whereClause = "WHERE Visibility = 'public'";
        }

        $stmt = $pdo->prepare("SELECT * FROM TeamPlanner_Tasks $whereClause ORDER BY CreatedAt DESC");
        $stmt->execute($params);
        $tasks = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $tasks[] = formatTaskOutput($row);
        }
        sendJson($tasks);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $createdBy = $_SESSION['user']['username'] ?? 'System';
        
        $recurrence = $data['recurrence'] ?? 'none';
        $tasksToCreate = [];
        
        if ($recurrence !== 'none' && !empty($data['startDate']) && !empty($data['recurrenceEndDate'])) {
            $groupId = uniqid('grp_');
            $start = new DateTime($data['startDate']);
            $end = new DateTime($data['recurrenceEndDate']);
            
            // Safety limit 365 days
            $diff = $start->diff($end)->days;
            if ($diff > 366) $end = (clone $start)->modify('+365 days');
            
            $recDays = $data['recurrenceDays'] ?? [];
            $recDates = $data['recurrenceDates'] ?? [];
            $settingsJson = json_encode([
                'days' => $recDays,
                'dates' => $recDates,
                'endDate' => $data['recurrenceEndDate']
            ]);
            
            $current = clone $start;
            $dueDiffDays = 0;
            if (!empty($data['dueDate'])) {
                $dueDt = new DateTime($data['dueDate']);
                $dueDiffDays = (int)$start->diff($dueDt)->format('%R%a');
            }
            
            $safetyCounter = 0;
            while ($current <= $end && $safetyCounter < 400) {
                $shouldCreate = false;
                if ($recurrence === 'daily') {
                    $shouldCreate = true;
                } elseif ($recurrence === 'weekly') {
                    if ($current->format('w') == $start->format('w')) $shouldCreate = true;
                } elseif ($recurrence === 'monthly') {
                    if ($current->format('j') == $start->format('j')) $shouldCreate = true;
                } elseif ($recurrence === 'custom') {
                    if (in_array((int)$current->format('w'), $recDays)) {
                        $shouldCreate = true;
                    }
                    if (in_array((int)$current->format('j'), $recDates)) {
                        $shouldCreate = true;
                    }
                }
                
                if ($shouldCreate) {
                    $currentStartStr = $current->format('Y-m-d');
                    $currentDueDt = clone $current;
                    if ($dueDiffDays != 0) {
                        $currentDueDt->modify(($dueDiffDays >= 0 ? '+' : '') . $dueDiffDays . ' days');
                    }
                    $currentDueStr = $currentDueDt->format('Y-m-d');
                    
                    $tasksToCreate[] = [
                        'startDate' => $currentStartStr,
                        'dueDate' => $currentDueStr,
                        'groupId' => $groupId,
                        'settings' => $settingsJson
                    ];
                }
                $current->modify('+1 day');
                $safetyCounter++;
            }
        }
        
        if (empty($tasksToCreate)) {
            $tasksToCreate[] = [
                'startDate' => $data['startDate'] ?? null,
                'dueDate' => $data['dueDate'] ?? null,
                'groupId' => null,
                'settings' => null
            ];
        }
        
        $sql = "INSERT INTO TeamPlanner_Tasks (Title, Status, Visibility, Assignee, DueDate, StartDate, StartTime, EndTime, Priority, Description, Subtasks, Tags, Recurrence, ProjectId, ProjectChecklistId, SpaceId, CreatedBy, GroupId, RecurrenceSettings) 
                OUTPUT INSERTED.* 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
        $stmt = $pdo->prepare($sql);
        $createdTasks = [];
        
        foreach ($tasksToCreate as $t) {
            $stmt->execute([
                $data['title'],
                $data['status'] ?? 'todo',
                $data['visibility'] ?? 'public',
                $data['assignee'] ?? 'Unassigned',
                $t['dueDate'],
                $t['startDate'],
                $data['startTime'] ?? '09:00',
                $data['endTime'] ?? '18:00',
                $data['priority'] ?? 'normal',
                $data['description'] ?? null,
                $data['subtasks'] ?? '[]',
                $data['tags'] ?? '',
                $recurrence,
                $data['projectId'] ?? null,
                $data['projectChecklistId'] ?? null,
                $data['spaceId'] ?? null,
                $createdBy,
                $t['groupId'],
                $t['settings']
            ]);
            
            $newTask = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($newTask) $createdTasks[] = formatTaskOutput($newTask);
        }
        
        if (count($createdTasks) > 0 && $createdTasks[0]['Status'] === 'done' && !empty($createdTasks[0]['ProjectId'])) {
            $pStmt = $pdo->prepare("SELECT Checklist FROM TeamPlanner_Projects WHERE Id = ?");
            $pStmt->execute([$createdTasks[0]['ProjectId']]);
            $project = $pStmt->fetch(PDO::FETCH_ASSOC);
            if ($project && !empty($project['Checklist'])) {
                $checklist = json_decode($project['Checklist'], true);
                $changed = false;
                
                $targetIds = [];
                if (!empty($createdTasks[0]['ProjectChecklistId'])) $targetIds[] = $createdTasks[0]['ProjectChecklistId'];
                
                $subtasksArr = json_decode($createdTasks[0]['subtasks'], true);
                if (is_array($subtasksArr)) {
                    foreach ($subtasksArr as $st) {
                        if (!empty($st['projectChecklistId'])) $targetIds[] = $st['projectChecklistId'];
                    }
                }
                
                if (is_array($checklist) && count($targetIds) > 0) {
                    foreach ($checklist as &$item) {
                        if (isset($item['id']) && in_array($item['id'], $targetIds)) {
                            if (empty($item['isDone'])) {
                                $item['isDone'] = true;
                                $changed = true;
                            }
                        }
                    }
                }
                
                if ($changed) {
                    $updStmt = $pdo->prepare("UPDATE TeamPlanner_Projects SET Checklist = ? WHERE Id = ?");
                    $updStmt->execute([json_encode($checklist), $createdTasks[0]['ProjectId']]);
                }
            }
        }
        
        logActivity($pdo, "Task(s) created: " . $data['title'] . " by " . ($data['assignee'] ?? 'Unassigned'));
        sendJson($createdTasks, 201);
    } 
    elseif ($method === 'PUT' && $id) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $chkStmt = $pdo->prepare("SELECT GroupId, StartDate FROM TeamPlanner_Tasks WHERE Id = ?");
        $chkStmt->execute([$id]);
        $targetTask = $chkStmt->fetch(PDO::FETCH_ASSOC);
        
        $updateSeries = !empty($data['updateSeries']) && !empty($targetTask['GroupId']);
        
        $updateFields = [];
        $params = [];
        
        $fields = [
            'status' => 'Status', 'title' => 'Title', 'visibility' => 'Visibility',
            'assignee' => 'Assignee', 'dueDate' => 'DueDate', 'startDate' => 'StartDate',
            'startTime' => 'StartTime', 'endTime' => 'EndTime', 'priority' => 'Priority',
            'description' => 'Description', 'subtasks' => 'Subtasks', 'tags' => 'Tags',
            'recurrence' => 'Recurrence', 'projectId' => 'ProjectId', 'projectChecklistId' => 'ProjectChecklistId',
            'spaceId' => 'SpaceId'
        ];
        
        foreach ($fields as $jsonKey => $dbKey) {
            if (array_key_exists($jsonKey, $data)) {
                if ($updateSeries && ($dbKey === 'StartDate' || $dbKey === 'DueDate')) {
                    continue; // Skip dates when updating series
                }
                $updateFields[] = "$dbKey = ?";
                $params[] = $data[$jsonKey];
            }
        }
        
        if (empty($updateFields)) {
            sendJson(['error' => 'No fields to update'], 400);
        }
        
        $sql = "UPDATE TeamPlanner_Tasks SET " . implode(', ', $updateFields) . " OUTPUT INSERTED.* WHERE ";
        if ($updateSeries) {
            $sql .= "GroupId = ? AND StartDate >= ?";
            $params[] = $targetTask['GroupId'];
            $params[] = $targetTask['StartDate'];
        } else {
            $sql .= "Id = ?";
            $params[] = $id;
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $updatedTasks = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $updatedTasks[] = formatTaskOutput($row);
        }
        
        if (empty($updatedTasks)) {
            sendJson(['error' => 'Task not found or no rows updated'], 404);
        }
        
        $firstUpdated = $updatedTasks[0];
        
        if (array_key_exists('status', $data) && !empty($firstUpdated['ProjectId'])) {
            $pStmt = $pdo->prepare("SELECT Checklist FROM TeamPlanner_Projects WHERE Id = ?");
            $pStmt->execute([$firstUpdated['ProjectId']]);
            $project = $pStmt->fetch(PDO::FETCH_ASSOC);
            if ($project && !empty($project['Checklist'])) {
                $checklist = json_decode($project['Checklist'], true);
                $isDone = ($firstUpdated['Status'] === 'done');
                $changed = false;
                
                $targetIds = [];
                if (!empty($firstUpdated['ProjectChecklistId'])) $targetIds[] = $firstUpdated['ProjectChecklistId'];
                
                $subtasksArr = json_decode($firstUpdated['subtasks'], true);
                if (is_array($subtasksArr)) {
                    foreach ($subtasksArr as $st) {
                        if (!empty($st['projectChecklistId'])) $targetIds[] = $st['projectChecklistId'];
                    }
                }
                
                if (is_array($checklist) && count($targetIds) > 0) {
                    foreach ($checklist as &$item) {
                        if (isset($item['id']) && in_array($item['id'], $targetIds)) {
                            if (!isset($item['isDone']) || $item['isDone'] !== $isDone) {
                                $item['isDone'] = $isDone;
                                $changed = true;
                            }
                        }
                    }
                }
                
                if ($changed) {
                    $updStmt = $pdo->prepare("UPDATE TeamPlanner_Projects SET Checklist = ? WHERE Id = ?");
                    $updStmt->execute([json_encode($checklist), $firstUpdated['ProjectId']]);
                }
            }
        }
        
        logActivity($pdo, "Task updated: " . ($data['title'] ?? 'Unknown'));
        sendJson($updateSeries ? $updatedTasks : $updatedTasks[0]);
    } 
    elseif ($method === 'DELETE' && $id) {
        $deleteSeries = isset($_GET['deleteSeries']) && $_GET['deleteSeries'] === 'true';
        
        if ($deleteSeries) {
            $chkStmt = $pdo->prepare("SELECT GroupId, StartDate FROM TeamPlanner_Tasks WHERE Id = ?");
            $chkStmt->execute([$id]);
            $targetTask = $chkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($targetTask && $targetTask['GroupId']) {
                $stmt = $pdo->prepare("DELETE FROM TeamPlanner_Tasks WHERE GroupId = ? AND StartDate >= ?");
                $stmt->execute([$targetTask['GroupId'], $targetTask['StartDate']]);
            } else {
                $stmt = $pdo->prepare("DELETE FROM TeamPlanner_Tasks WHERE Id = ?");
                $stmt->execute([$id]);
            }
        } else {
            $stmt = $pdo->prepare("DELETE FROM TeamPlanner_Tasks WHERE Id = ?");
            $stmt->execute([$id]);
        }
        
        logActivity($pdo, "Task deleted (ID: $id, Series: " . ($deleteSeries ? 'Yes' : 'No') . ")");
        http_response_code(204);
        exit;
    }
} catch (Exception $e) {
    error_log($e->getMessage());
    sendJson(['error' => 'Server Error', 'details' => $e->getMessage()], 500);
}
?>