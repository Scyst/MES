<?php
// setup_activity_db.php - Run once via browser to set up database
require_once __DIR__ . '/../../db.php';

try {
    echo "Starting database setup for CRM_ACTIVITY_LOGS...\n";

    $createTable = "
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CRM_ACTIVITY_LOGS' AND xtype='U')
        CREATE TABLE CRM_ACTIVITY_LOGS (
            id INT IDENTITY(1,1) PRIMARY KEY,
            dealId INT NOT NULL,
            type NVARCHAR(50) NOT NULL DEFAULT 'comment', -- comment, call, meeting
            note NVARCHAR(MAX) NOT NULL,
            createdAt DATETIME DEFAULT GETDATE(),
            CONSTRAINT FK_CRM_ACTIVITY_DEAL FOREIGN KEY (dealId) REFERENCES CRM_DEALS(id) ON DELETE CASCADE
        )
    ";
    
    $pdo->exec($createTable);
    echo "CRM_ACTIVITY_LOGS table created successfully.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
