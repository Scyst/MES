<?php
$dbPath1 = __DIR__ . '/../../page/db.php';
$dbPath2 = __DIR__ . '/../../../MES/MES/page/db.php';

if (file_exists($dbPath1)) require_once $dbPath1;
elseif (file_exists($dbPath2)) require_once $dbPath2;
else die("DB config not found.\n");

try {
    // 1. Create TeamPlanner_Spaces table
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

    // 2. Add SpaceId to TeamPlanner_Projects
    $sqlAlterProjects = "
        IF COL_LENGTH('TeamPlanner_Projects', 'SpaceId') IS NULL
        BEGIN
            ALTER TABLE TeamPlanner_Projects ADD SpaceId INT NULL;
        END
    ";
    $pdo->exec($sqlAlterProjects);

    // 3. Add SpaceId to TeamPlanner_Tasks
    $sqlAlterTasks = "
        IF COL_LENGTH('TeamPlanner_Tasks', 'SpaceId') IS NULL
        BEGIN
            ALTER TABLE TeamPlanner_Tasks ADD SpaceId INT NULL;
        END
    ";
    $pdo->exec($sqlAlterTasks);

    // 4. Insert Default Spaces if table is empty
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

    echo "Spaces DB initialization successful.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
