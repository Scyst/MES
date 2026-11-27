-- ============================================================================
-- Phase 0 Migration (P0-01): Stock Type Segregation & Immutable Ledger Columns
-- Target DB: IIOT_TOOLBOX (SQL Server 2016 Compatible & Idempotent)
-- IMPORTANT: Run 00_backup_existing_sps.sql backup check before applying.
-- ============================================================================
-- 1. INVENTORY_ONHAND: Add stock_type ('UNRESTRICTED' | 'QUALITY_INSPECTION' | 'BLOCKED_SCRAP')
IF COL_LENGTH('dbo.INVENTORY_ONHAND', 'stock_type') IS NULL
BEGIN
    ALTER TABLE dbo.INVENTORY_ONHAND
    ADD stock_type VARCHAR(20) NOT NULL
        CONSTRAINT DF_INVENTORY_ONHAND_STOCK_TYPE DEFAULT ('UNRESTRICTED');
END;
GO

IF EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_inventory_part_location'
      AND parent_object_id = OBJECT_ID('dbo.INVENTORY_ONHAND')
)
BEGIN
    ALTER TABLE dbo.INVENTORY_ONHAND DROP CONSTRAINT UQ_inventory_part_location;
END
ELSE IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_inventory_part_location'
      AND object_id = OBJECT_ID('dbo.INVENTORY_ONHAND')
)
BEGIN
    DROP INDEX UQ_inventory_part_location ON dbo.INVENTORY_ONHAND;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_inventory_part_location_type'
      AND object_id = OBJECT_ID('dbo.INVENTORY_ONHAND')
)
BEGIN
    ALTER TABLE dbo.INVENTORY_ONHAND
    ADD CONSTRAINT UQ_inventory_part_location_type UNIQUE (parameter_id, location_id, stock_type);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_INVENTORY_ONHAND_STOCK_TYPE'
      AND parent_object_id = OBJECT_ID('dbo.INVENTORY_ONHAND')
)
BEGIN
    ALTER TABLE dbo.INVENTORY_ONHAND
    ADD CONSTRAINT CK_INVENTORY_ONHAND_STOCK_TYPE
        CHECK (stock_type IN ('UNRESTRICTED', 'QUALITY_INSPECTION', 'BLOCKED_SCRAP'));
END;
GO

-- 2. STOCK_TRANSACTIONS: Add Immutable Reversal & Stock Type Tracking Columns
IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'is_reversed') IS NULL
BEGIN
    ALTER TABLE dbo.STOCK_TRANSACTIONS
    ADD is_reversed BIT NOT NULL
        CONSTRAINT DF_STOCK_TXN_IS_REVERSED DEFAULT (0);
END;

IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'reversal_of_tx_id') IS NULL
BEGIN
    ALTER TABLE dbo.STOCK_TRANSACTIONS
    ADD reversal_of_tx_id BIGINT NULL;
END;

IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'reversed_by_user_id') IS NULL
BEGIN
    ALTER TABLE dbo.STOCK_TRANSACTIONS
    ADD reversed_by_user_id INT NULL;
END;

IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'reversed_at') IS NULL
BEGIN
    ALTER TABLE dbo.STOCK_TRANSACTIONS
    ADD reversed_at DATETIME NULL;
END;

IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'reversal_reason') IS NULL
BEGIN
    ALTER TABLE dbo.STOCK_TRANSACTIONS
    ADD reversal_reason NVARCHAR(500) NULL;
END;

IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'stock_type') IS NULL
BEGIN
    ALTER TABLE dbo.STOCK_TRANSACTIONS
    ADD stock_type VARCHAR(20) NOT NULL
        CONSTRAINT DF_STOCK_TXN_STOCK_TYPE DEFAULT ('UNRESTRICTED');
END;
GO

-- 3. Filtered Performance Indexes for Job & Reversal Lookups
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_STOCK_TXN_JobId'
      AND object_id = OBJECT_ID('dbo.STOCK_TRANSACTIONS')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_STOCK_TXN_JobId
    ON dbo.STOCK_TRANSACTIONS (job_id)
    WHERE job_id IS NOT NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_STOCK_TXN_ReversalOf'
      AND object_id = OBJECT_ID('dbo.STOCK_TRANSACTIONS')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_STOCK_TXN_ReversalOf
    ON dbo.STOCK_TRANSACTIONS (reversal_of_tx_id)
    WHERE reversal_of_tx_id IS NOT NULL;
END;

PRINT 'Phase 0 P0-01 schema migration completed successfully.';
GO
