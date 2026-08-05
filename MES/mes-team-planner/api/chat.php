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
        if ($action === 'rooms') {
            // Get all rooms the user can access
            // 1. Task rooms (for now, everyone can see all tasks, or we can filter by SpaceId if needed)
            // 2. Private/Group rooms where the user is a member
            $sql = "
                SELECT r.Id, r.Type, r.Name, r.ReferenceId, r.CreatedAt,
                       (SELECT TOP 1 m.Message FROM TeamPlanner_ChatMessages m WHERE m.RoomId = r.Id ORDER BY m.CreatedAt DESC) as LastMessage,
                       (SELECT TOP 1 m.CreatedAt FROM TeamPlanner_ChatMessages m WHERE m.RoomId = r.Id ORDER BY m.CreatedAt DESC) as LastMessageTime,
                       (SELECT TOP 1 t.Title FROM TeamPlanner_Tasks t WHERE t.Id = r.ReferenceId) as TaskTitle
                FROM TeamPlanner_ChatRooms r
                LEFT JOIN TeamPlanner_ChatMembers mem ON mem.RoomId = r.Id
                WHERE (r.Type = 'task' AND EXISTS (SELECT 1 FROM TeamPlanner_ChatMessages m2 WHERE m2.RoomId = r.Id)) 
                   OR mem.Username = ?
                ORDER BY LastMessageTime DESC, r.CreatedAt DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user]);
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format rooms
            foreach ($rooms as &$r) {
                if ($r['Type'] === 'task') {
                    $r['DisplayName'] = $r['TaskTitle'] ? "Task: " . $r['TaskTitle'] : "Task #" . $r['ReferenceId'];
                } else if ($r['Type'] === 'private') {
                    // Get the other member's name for private chat
                    $stmt2 = $pdo->prepare("SELECT m.Username, u.fullname FROM TeamPlanner_ChatMembers m LEFT JOIN USERS u ON u.username = m.Username WHERE m.RoomId = ? AND m.Username != ?");
                    $stmt2->execute([$r['Id'], $user]);
                    $other = $stmt2->fetch(PDO::FETCH_ASSOC);
                    $r['DisplayName'] = $other ? ($other['fullname'] ?: $other['Username']) : 'Private Chat';
                } else {
                    $r['DisplayName'] = $r['Name'] ?: 'Group Chat';
                }
            }
            sendJson($rooms);
        }
        elseif ($action === 'messages') {
            $roomId = isset($_GET['roomId']) ? (int)$_GET['roomId'] : 0;
            if (!$roomId) sendJson(['error' => 'Missing roomId'], 400);

            // Verify access
            $stmtCheck = $pdo->prepare("SELECT Type FROM TeamPlanner_ChatRooms WHERE Id = ?");
            $stmtCheck->execute([$roomId]);
            $room = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if (!$room) sendJson(['error' => 'Room not found'], 404);

            if ($room['Type'] !== 'task') {
                $stmtMem = $pdo->prepare("SELECT 1 FROM TeamPlanner_ChatMembers WHERE RoomId = ? AND Username = ?");
                $stmtMem->execute([$roomId, $user]);
                if (!$stmtMem->fetch()) {
                    sendJson(['error' => 'Access denied'], 403);
                }
            }

            $stmt = $pdo->prepare("SELECT * FROM TeamPlanner_ChatMessages WHERE RoomId = ? ORDER BY CreatedAt ASC");
            $stmt->execute([$roomId]);
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach($messages as &$m) {
                $m['Attachments'] = json_decode($m['Attachments'] ?: '[]', true);
            }
            
            sendJson($messages);
        }
        elseif ($action === 'get_or_create_room') {
            $type = $_GET['type'] ?? '';
            $refId = $_GET['referenceId'] ?? 0;
            
            if ($type === 'task' && $refId) {
                $stmt = $pdo->prepare("SELECT r.*, (SELECT TOP 1 t.Title FROM TeamPlanner_Tasks t WHERE t.Id = r.ReferenceId) as TaskTitle FROM TeamPlanner_ChatRooms r WHERE r.Type = 'task' AND r.ReferenceId = ?");
                $stmt->execute([$refId]);
                $room = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$room) {
                    $stmt2 = $pdo->prepare("INSERT INTO TeamPlanner_ChatRooms (Type, ReferenceId) OUTPUT INSERTED.* VALUES ('task', ?)");
                    $stmt2->execute([$refId]);
                    $room = $stmt2->fetch(PDO::FETCH_ASSOC);
                    $stmt3 = $pdo->prepare("SELECT Title FROM TeamPlanner_Tasks WHERE Id = ?");
                    $stmt3->execute([$refId]);
                    $room['TaskTitle'] = $stmt3->fetchColumn();
                }
                $room['DisplayName'] = $room['TaskTitle'] ? "Task: " . $room['TaskTitle'] : "Task #" . $room['ReferenceId'];
                sendJson($room);
            }
            sendJson(['error' => 'Invalid parameters'], 400);
        }
    }
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if ($action === 'send') {
            $roomId = $data['roomId'] ?? 0;
            $message = $data['message'] ?? '';
            $attachments = isset($data['attachments']) ? json_encode($data['attachments']) : '[]';

            if (!$roomId || (empty(trim($message)) && $attachments === '[]')) {
                sendJson(['error' => 'Invalid message data'], 400);
            }

            $stmt = $pdo->prepare("INSERT INTO TeamPlanner_ChatMessages (RoomId, Author, Message, Attachments) OUTPUT INSERTED.* VALUES (?, ?, ?, ?)");
            $stmt->execute([$roomId, $user, $message, $attachments]);
            
            $newMsg = $stmt->fetch(PDO::FETCH_ASSOC);
            $newMsg['Attachments'] = json_decode($newMsg['Attachments'], true);
            
            sendJson($newMsg, 201);
        }
        elseif ($action === 'create_room') {
            $type = $data['type'] ?? 'private';
            $targetUser = $data['targetUser'] ?? '';
            $name = $data['name'] ?? null;

            if ($type === 'private' && !$targetUser) {
                sendJson(['error' => 'Target user required for private chat'], 400);
            }

            // Check if private chat already exists between these two users
            if ($type === 'private') {
                $checkSql = "
                    SELECT r.Id FROM TeamPlanner_ChatRooms r
                    JOIN TeamPlanner_ChatMembers m1 ON m1.RoomId = r.Id AND m1.Username = ?
                    JOIN TeamPlanner_ChatMembers m2 ON m2.RoomId = r.Id AND m2.Username = ?
                    WHERE r.Type = 'private'
                ";
                $stmtCheck = $pdo->prepare($checkSql);
                $stmtCheck->execute([$user, $targetUser]);
                $existingRoom = $stmtCheck->fetch(PDO::FETCH_ASSOC);
                
                if ($existingRoom) {
                    sendJson(['roomId' => $existingRoom['Id']]);
                }
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("INSERT INTO TeamPlanner_ChatRooms (Type, Name) OUTPUT INSERTED.Id VALUES (?, ?)");
            $stmt->execute([$type, $name]);
            $roomId = $stmt->fetchColumn();

            // Add members
            $stmtMem = $pdo->prepare("INSERT INTO TeamPlanner_ChatMembers (RoomId, Username) VALUES (?, ?)");
            $stmtMem->execute([$roomId, $user]);
            if ($type === 'private' && $targetUser !== $user) {
                $stmtMem->execute([$roomId, $targetUser]);
            }

            $pdo->commit();
            sendJson(['roomId' => $roomId], 201);
        }
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('chat.php error: ' . $e->getMessage());
    sendJson(['error' => 'Server Error'], 500);
}
