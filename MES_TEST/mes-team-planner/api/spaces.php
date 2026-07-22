<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? $_GET['id'] : null;

function ensureSpacesTable($pdo) {
    try {
        // Create table if not exists
        $sqlCreateSpaces = "
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_Spaces' and xtype='U')
            BEGIN
                CREATE TABLE TeamPlanner_Spaces (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    Name NVARCHAR(255) NOT NULL,
                    Icon NVARCHAR(50) DEFAULT 'FiUsers',
                    Color NVARCHAR(100) DEFAULT 'text-indigo-500 bg-indigo-500/10',
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
            END
        ";
        $pdo->exec($sqlCreateSpaces);

        // Create SpaceMembers table
        $sqlCreateSpaceMembers = "
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_SpaceMembers' and xtype='U')
            BEGIN
                CREATE TABLE TeamPlanner_SpaceMembers (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    SpaceId INT NOT NULL,
                    UserId NVARCHAR(255) NOT NULL,
                    Role NVARCHAR(50) DEFAULT 'Member',
                    JoinedAt DATETIME DEFAULT GETDATE(),
                    FOREIGN KEY (SpaceId) REFERENCES TeamPlanner_Spaces(Id) ON DELETE CASCADE
                )
            END
        ";
        $pdo->exec($sqlCreateSpaceMembers);

        // Alter Projects
        $sqlAlterProjects = "
            IF COL_LENGTH('TeamPlanner_Projects', 'SpaceId') IS NULL
            BEGIN
                ALTER TABLE TeamPlanner_Projects ADD SpaceId INT NULL;
            END
        ";
        $pdo->exec($sqlAlterProjects);

        // Alter Tasks
        $sqlAlterTasks = "
            IF COL_LENGTH('TeamPlanner_Tasks', 'SpaceId') IS NULL
            BEGIN
                ALTER TABLE TeamPlanner_Tasks ADD SpaceId INT NULL;
            END
        ";
        $pdo->exec($sqlAlterTasks);

        // Insert defaults if empty
        $sqlCheckEmpty = "SELECT COUNT(*) FROM TeamPlanner_Spaces";
        $count = $pdo->query($sqlCheckEmpty)->fetchColumn();
        if ($count == 0) {
            $sqlInsertDefaults = "
                INSERT INTO TeamPlanner_Spaces (Name, Icon, Color) VALUES 
                ('Engineers', 'FiUsers', 'text-indigo-500 bg-indigo-500/10'),
                ('Design Team', 'FiUsers', 'text-pink-500 bg-pink-500/10'),
                ('Developer Team', 'FiUsers', 'text-cyan-500 bg-cyan-500/10')
            ";
            $pdo->exec($sqlInsertDefaults);
        }
    } catch (Exception $e) {
        error_log("Failed to initialize spaces: " . $e->getMessage());
    }
}

function isSpaceAdmin($pdo, $spaceId, $userId) {
    if (!$userId) return false;
    $stmt = $pdo->prepare("SELECT Role FROM TeamPlanner_SpaceMembers WHERE SpaceId = ? AND UserId = ?");
    $stmt->execute([$spaceId, $userId]);
    $role = $stmt->fetchColumn();
    return $role === 'Admin';
}

try {
    ensureSpacesTable($pdo);

    $action = isset($_GET['action']) ? $_GET['action'] : '';

    if ($action === 'members' && $method === 'GET' && $id) {
        $stmt = $pdo->prepare("SELECT sm.*, u.fullname as Name, u.username as user_id 
                               FROM TeamPlanner_SpaceMembers sm
                               LEFT JOIN USERS u ON sm.UserId = u.username
                               WHERE sm.SpaceId = ?");
        $stmt->execute([$id]);
        sendJson($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($action === 'add_member' && $method === 'POST') {
        $currentUser = $_SESSION['user']['username'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isSpaceAdmin($pdo, $data['space_id'], $currentUser)) {
            sendJson(['error' => 'Unauthorized: Only Space Admins can add members.'], 403);
            exit;
        }

        $checkStmt = $pdo->prepare("SELECT Id FROM TeamPlanner_SpaceMembers WHERE SpaceId = ? AND UserId = ?");
        $checkStmt->execute([$data['space_id'], $data['user_id']]);
        if ($checkStmt->fetch()) {
            sendJson(['error' => 'User is already a member of this space.'], 400);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO TeamPlanner_SpaceMembers (SpaceId, UserId, Role) OUTPUT INSERTED.* VALUES (?, ?, ?)");
        $stmt->execute([$data['space_id'], $data['user_id'], $data['role'] ?? 'Member']);
        
        $inserted = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Fetch user details to append
        $uStmt = $pdo->prepare("SELECT fullname as Name, username as user_id FROM USERS WHERE username = ?");
        $uStmt->execute([$data['user_id']]);
        $uData = $uStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($uData) {
            $inserted = array_merge($inserted, $uData);
        }
        
        sendJson($inserted);
    }
    elseif ($action === 'update_member' && $method === 'PUT' && $id) {
        $currentUser = $_SESSION['user']['username'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Get SpaceId for this member
        $sStmt = $pdo->prepare("SELECT SpaceId FROM TeamPlanner_SpaceMembers WHERE Id = ?");
        $sStmt->execute([$id]);
        $spaceId = $sStmt->fetchColumn();

        if (!$spaceId || !isSpaceAdmin($pdo, $spaceId, $currentUser)) {
            sendJson(['error' => 'Unauthorized: Only Space Admins can update roles.'], 403);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE TeamPlanner_SpaceMembers SET Role = ? WHERE Id = ?");
        $stmt->execute([$data['role'], $id]);
        sendJson(['success' => true]);
    }
    elseif ($action === 'remove_member' && $method === 'DELETE' && $id) {
        $currentUser = $_SESSION['user']['username'] ?? null;
        
        // Get SpaceId and UserId for this member
        $sStmt = $pdo->prepare("SELECT SpaceId, UserId FROM TeamPlanner_SpaceMembers WHERE Id = ?");
        $sStmt->execute([$id]);
        $member = $sStmt->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            sendJson(['error' => 'Member not found.'], 404);
            exit;
        }

        $spaceId = $member['SpaceId'];
        $memberUserId = $member['UserId'];

        // Allow if user is an Admin, OR if the user is removing themselves
        if (!isSpaceAdmin($pdo, $spaceId, $currentUser) && $memberUserId !== $currentUser) {
            sendJson(['error' => 'Unauthorized: Only Space Admins can remove other members.'], 403);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM TeamPlanner_SpaceMembers WHERE Id = ?");
        $stmt->execute([$id]);
        sendJson(['success' => true]);
    }
    elseif ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM TeamPlanner_Spaces ORDER BY CreatedAt ASC");
        $spaces = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $spaces[] = $row;
        }
        sendJson($spaces);
    } 
    elseif ($method === 'POST') {
        $currentUser = $_SESSION['user']['username'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "INSERT INTO TeamPlanner_Spaces (Name, Icon, Color) OUTPUT INSERTED.* VALUES (?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['icon'] ?? 'FiFolder',
            $data['color'] ?? 'text-indigo-500 bg-indigo-500/10'
        ]);
        $inserted = $stmt->fetch(PDO::FETCH_ASSOC);

        // Make the creator an Admin
        if ($currentUser && $inserted) {
            $adminStmt = $pdo->prepare("INSERT INTO TeamPlanner_SpaceMembers (SpaceId, UserId, Role) VALUES (?, ?, 'Admin')");
            $adminStmt->execute([$inserted['Id'], $currentUser]);
        }

        sendJson($inserted);
    }
    elseif ($method === 'PUT' && $id) {
        $currentUser = $_SESSION['user']['username'] ?? null;
        if (!isSpaceAdmin($pdo, $id, $currentUser)) {
            sendJson(['error' => 'Unauthorized: Only Space Admins can edit space details.'], 403);
            exit;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "UPDATE TeamPlanner_Spaces SET Name = ?, Icon = ?, Color = ? WHERE Id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['icon'] ?? 'FiFolder',
            $data['color'] ?? 'text-indigo-500 bg-indigo-500/10',
            $id
        ]);
        
        $stmt = $pdo->prepare("SELECT * FROM TeamPlanner_Spaces WHERE Id = ?");
        $stmt->execute([$id]);
        sendJson($stmt->fetch(PDO::FETCH_ASSOC));
    }
    elseif ($method === 'DELETE' && $id) {
        $currentUser = $_SESSION['user']['username'] ?? null;
        if (!isSpaceAdmin($pdo, $id, $currentUser)) {
            sendJson(['error' => 'Unauthorized: Only Space Admins can delete spaces.'], 403);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM TeamPlanner_Spaces WHERE Id = ?");
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
