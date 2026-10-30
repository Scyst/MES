<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? $_GET['id'] : null;
$spaceId = isset($_GET['space_id']) ? $_GET['space_id'] : null;

// NOTE: isAdminOrManager() is defined in db_helper.php (BUG-010)

try {
    if ($method === 'GET') {
        if ($spaceId) {
            $stmt = $pdo->prepare("SELECT sm.*, u.fullname, u.role as user_role FROM TeamPlanner_SpaceMembers sm LEFT JOIN USERS u ON sm.UserId = u.username WHERE sm.SpaceId = ? ORDER BY sm.JoinedAt ASC");
            $stmt->execute([$spaceId]);
        } else {
            $stmt = $pdo->query("SELECT sm.*, u.fullname, u.role as user_role FROM TeamPlanner_SpaceMembers sm LEFT JOIN USERS u ON sm.UserId = u.username ORDER BY sm.SpaceId, sm.JoinedAt ASC");
        }
        $members = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $members[] = $row;
        }
        sendJson($members);
    } 
    elseif ($method === 'POST') {
        if (!isAdminOrManager()) {
            http_response_code(403);
            sendJson(['error' => 'Permission denied: Only Admin/Manager can manage space members.']);
            exit;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Check if already exists
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM TeamPlanner_SpaceMembers WHERE SpaceId = ? AND UserId = ?");
        $checkStmt->execute([$data['SpaceId'], $data['UserId']]);
        if ($checkStmt->fetchColumn() > 0) {
            http_response_code(400);
            sendJson(['error' => 'User is already a member of this space.']);
            exit;
        }
        
        $sql = "INSERT INTO TeamPlanner_SpaceMembers (SpaceId, UserId, Role, JoinedAt) OUTPUT INSERTED.* VALUES (?, ?, ?, GETDATE())";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['SpaceId'],
            $data['UserId'],
            $data['Role'] ?? 'Member'
        ]);
        sendJson($stmt->fetch(PDO::FETCH_ASSOC));
    }
    elseif ($method === 'DELETE' && $id) {
        if (!isAdminOrManager()) {
            http_response_code(403);
            sendJson(['error' => 'Permission denied: Only Admin/Manager can manage space members.']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM TeamPlanner_SpaceMembers WHERE Id = ?");
        $stmt->execute([$id]);
        sendJson(['success' => true]);
    }
    else {
        sendJson(['error' => 'Method not allowed'], 405);
    }
} catch (PDOException $e) {
    sendJson(['error' => $e->getMessage()], 500);
}
?>
