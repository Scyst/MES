<?php
require_once __DIR__ . '/db_helper.php';

try {
    $pdo->beginTransaction();

    // 1. Create TeamPlanner_ChatRooms
    $pdo->exec("
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_ChatRooms' AND xtype='U')
        CREATE TABLE TeamPlanner_ChatRooms (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            Type NVARCHAR(50) NOT NULL,
            Name NVARCHAR(255) NULL,
            ReferenceId INT NULL,
            CreatedAt DATETIME DEFAULT GETDATE()
        )
    ");

    // 2. Create TeamPlanner_ChatMembers
    $pdo->exec("
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_ChatMembers' AND xtype='U')
        CREATE TABLE TeamPlanner_ChatMembers (
            RoomId INT NOT NULL,
            Username NVARCHAR(100) NOT NULL,
            JoinedAt DATETIME DEFAULT GETDATE(),
            PRIMARY KEY (RoomId, Username)
        )
    ");

    // 3. Create TeamPlanner_ChatMessages
    $pdo->exec("
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_ChatMessages' AND xtype='U')
        CREATE TABLE TeamPlanner_ChatMessages (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            RoomId INT NOT NULL,
            Author NVARCHAR(100) NOT NULL,
            Message NVARCHAR(MAX) NOT NULL,
            Attachments NVARCHAR(MAX) NULL,
            CreatedAt DATETIME DEFAULT GETDATE()
        )
    ");

    // 4. Add CreatedBy to TeamPlanner_Projects
    $pdo->exec("
        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'CreatedBy' AND Object_ID = Object_ID(N'TeamPlanner_Projects'))
        BEGIN
            ALTER TABLE TeamPlanner_Projects ADD CreatedBy VARCHAR(100) NULL
        END
    ");

    // 5. Migrate Tasks to ChatRooms
    $pdo->exec("
        INSERT INTO TeamPlanner_ChatRooms (Type, ReferenceId, CreatedAt)
        SELECT 'task', Id, GETDATE() FROM TeamPlanner_Tasks 
        WHERE Id NOT IN (SELECT ReferenceId FROM TeamPlanner_ChatRooms WHERE Type = 'task' AND ReferenceId IS NOT NULL)
    ");

    // 6. Migrate Comments
    $pdo->exec("
        IF EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_Comments' AND xtype='U')
        BEGIN
            INSERT INTO TeamPlanner_ChatMessages (RoomId, Author, Message, Attachments, CreatedAt)
            SELECT r.Id, c.Author, c.Message, '[]', c.CreatedAt
            FROM TeamPlanner_Comments c
            JOIN TeamPlanner_ChatRooms r ON r.ReferenceId = c.TaskId AND r.Type = 'task'
            
            -- Rename old table
            EXEC sp_rename 'TeamPlanner_Comments', 'TeamPlanner_Comments_Backup_Phase2'
        END
    ");

    $pdo->commit();
    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    $pdo->rollBack();
    echo "Migration failed: " . $e->getMessage() . "\n";
}
