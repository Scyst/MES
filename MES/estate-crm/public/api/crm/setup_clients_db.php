<?php
// setup_clients_db.php - Run once via CLI to set up database
require_once __DIR__ . '/../../db.php';

try {
    echo "Starting database setup for CRM_CLIENTS...\n";

    // 1. Create CRM_CLIENTS table
    $createClientsTable = "
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CRM_CLIENTS' AND xtype='U')
        CREATE TABLE CRM_CLIENTS (
            id INT IDENTITY(1,1) PRIMARY KEY,
            name NVARCHAR(255) NOT NULL,
            phone NVARCHAR(100),
            email NVARCHAR(255),
            lineId NVARCHAR(100),
            address NVARCHAR(MAX),
            createdAt DATETIME DEFAULT GETDATE(),
            updatedAt DATETIME DEFAULT GETDATE()
        )
    ";
    $pdo->exec($createClientsTable);
    echo "CRM_CLIENTS table created or already exists.\n";

    // 2. Clear existing deals to avoid relation mismatch (Prototype approach)
    $pdo->exec("DELETE FROM CRM_TASKS"); // Foreign key to deals
    $pdo->exec("DELETE FROM CRM_DOCUMENTS"); // Foreign key to deals
    $pdo->exec("DELETE FROM CRM_DOCUMENT_VERSIONS"); // Document history
    $pdo->exec("DELETE FROM CRM_DEALS");
    echo "Cleared old deals, tasks, and documents data.\n";

    // 3. Alter CRM_DEALS to add clientId
    $alterDeals = "
        IF NOT EXISTS (
            SELECT * FROM sys.columns 
            WHERE Name = N'clientId' AND Object_ID = Object_ID(N'CRM_DEALS')
        )
        BEGIN
            ALTER TABLE CRM_DEALS ADD clientId INT NULL;
            ALTER TABLE CRM_DEALS ADD CONSTRAINT FK_CRM_DEALS_CLIENT FOREIGN KEY (clientId) REFERENCES CRM_CLIENTS(id) ON DELETE SET NULL;
        END
    ";
    $pdo->exec($alterDeals);
    echo "Added clientId to CRM_DEALS.\n";

    // Create a dummy client
    $pdo->exec("
        IF NOT EXISTS (SELECT * FROM CRM_CLIENTS)
        INSERT INTO CRM_CLIENTS (name, phone, email, lineId) 
        VALUES ('John Doe', '0812345678', 'john@example.com', 'john.doe')
    ");
    echo "Inserted dummy client.\n";

    echo "Setup complete.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
