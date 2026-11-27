-- ============================================================================
-- Phase 0 Rollback Script: Reverts P0-01 through P0-04
-- WARNING: Review carefully before executing on Production DB.
--          If any non-UNRESTRICTED rows exist in INVENTORY_ONHAND, decide
--          whether to archive them before dropping stock_type.
-- ============================================================================
SET XACT_ABORT ON;

-- 1. Drop new Reversal SP
IF OBJECT_ID('dbo.sp_ReverseProductionTransaction', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ReverseProductionTransaction;
GO

-- 2. Restore original SPs (run 00_backup_existing_sps.sql after this section)
PRINT 'Step 1 done. Now run 00_backup_existing_sps.sql to restore original SPs, then run Schema Rollback below.';
GO

-- 3. Schema Rollback (Uncomment when ready to drop Phase 0 columns)
/*
BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_STOCK_TXN_ReversalOf' AND object_id = OBJECT_ID('dbo.STOCK_TRANSACTIONS'))
    DROP INDEX IX_STOCK_TXN_ReversalOf ON dbo.STOCK_TRANSACTIONS;

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_STOCK_TXN_JobId' AND object_id = OBJECT_ID('dbo.STOCK_TRANSACTIONS'))
    DROP INDEX IX_STOCK_TXN_JobId ON dbo.STOCK_TRANSACTIONS;

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_STOCK_TXN_IS_REVERSED')
    ALTER TABLE dbo.STOCK_TRANSACTIONS DROP CONSTRAINT DF_STOCK_TXN_IS_REVERSED;

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_STOCK_TXN_STOCK_TYPE')
    ALTER TABLE dbo.STOCK_TRANSACTIONS DROP CONSTRAINT DF_STOCK_TXN_STOCK_TYPE;

IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'is_reversed') IS NOT NULL
    ALTER TABLE dbo.STOCK_TRANSACTIONS DROP COLUMN is_reversed;
IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'reversal_of_tx_id') IS NOT NULL
    ALTER TABLE dbo.STOCK_TRANSACTIONS DROP COLUMN reversal_of_tx_id;
IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'reversed_by_user_id') IS NOT NULL
    ALTER TABLE dbo.STOCK_TRANSACTIONS DROP COLUMN reversed_by_user_id;
IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'reversed_at') IS NOT NULL
    ALTER TABLE dbo.STOCK_TRANSACTIONS DROP COLUMN reversed_at;
IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'reversal_reason') IS NOT NULL
    ALTER TABLE dbo.STOCK_TRANSACTIONS DROP COLUMN reversal_reason;
IF COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'stock_type') IS NOT NULL
    ALTER TABLE dbo.STOCK_TRANSACTIONS DROP COLUMN stock_type;

-- Rollback INVENTORY_ONHAND stock_type
DELETE FROM dbo.INVENTORY_ONHAND WHERE stock_type != 'UNRESTRICTED';

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_INVENTORY_ONHAND_STOCK_TYPE')
    ALTER TABLE dbo.INVENTORY_ONHAND DROP CONSTRAINT CK_INVENTORY_ONHAND_STOCK_TYPE;

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_inventory_part_location_type')
    ALTER TABLE dbo.INVENTORY_ONHAND DROP CONSTRAINT UQ_inventory_part_location_type;

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_INVENTORY_ONHAND_STOCK_TYPE')
    ALTER TABLE dbo.INVENTORY_ONHAND DROP CONSTRAINT DF_INVENTORY_ONHAND_STOCK_TYPE;

IF COL_LENGTH('dbo.INVENTORY_ONHAND', 'stock_type') IS NOT NULL
    ALTER TABLE dbo.INVENTORY_ONHAND DROP COLUMN stock_type;

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_inventory_part_location')
    ALTER TABLE dbo.INVENTORY_ONHAND ADD CONSTRAINT UQ_inventory_part_location UNIQUE (parameter_id, location_id);

COMMIT TRANSACTION;
*/
GO
