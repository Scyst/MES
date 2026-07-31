<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? $_GET['id'] : null;

function isAdminOrManager() {
    if (!isset($_SESSION['user_role'])) return false;
    $role = strtolower($_SESSION['user_role']);
    return in_array($role, ['admin', 'manager', 'supervisor', 'creator']);
}

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

try {
    ensureSpacesTable($pdo);

    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM TeamPlanner_Spaces ORDER BY CreatedAt ASC");
        $spaces = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $spaces[] = $row;
        }
        sendJson($spaces);
    } 
    elseif ($method === 'POST') {
        if (!isAdminOrManager()) {
            http_response_code(403);
            sendJson(['error' => 'Permission denied: Only Admin/Manager can create spaces.']);
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "INSERT INTO TeamPlanner_Spaces (Name, Icon, Color) OUTPUT INSERTED.* VALUES (?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['icon'] ?? 'FiFolder',
            $data['color'] ?? 'text-indigo-500 bg-indigo-500/10'
        ]);
        sendJson($stmt->fetch(PDO::FETCH_ASSOC));
    }
    elseif ($method === 'PUT' && $id) {
        if (!isAdminOrManager()) {
            http_response_code(403);
            sendJson(['error' => 'Permission denied: Only Admin/Manager can edit spaces.']);
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
        if (!isAdminOrManager()) {
            http_response_code(403);
            sendJson(['error' => 'Permission denied: Only Admin/Manager can delete spaces.']);
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
