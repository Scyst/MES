-- ============================================================================
-- Phase 0 Migration (P0-02): Upgrade dbo.sp_UpdateOnhandBalance
-- Supports @stock_type ('UNRESTRICTED' | 'QUALITY_INSPECTION' | 'BLOCKED_SCRAP')
-- Backward-compatible default: @stock_type = 'UNRESTRICTED'
-- ============================================================================
IF OBJECT_ID('dbo.sp_UpdateOnhandBalance', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.sp_UpdateOnhandBalance AS RETURN 0;');
GO

ALTER PROCEDURE [dbo].[sp_UpdateOnhandBalance]
    @item_id INT,
    @location_id INT,
    @quantity_to_change DECIMAL(18, 6),
    @stock_type VARCHAR(20) = 'UNRESTRICTED'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @normalized_type VARCHAR(20) = UPPER(LTRIM(RTRIM(ISNULL(@stock_type, 'UNRESTRICTED'))));
    IF @normalized_type NOT IN ('UNRESTRICTED', 'QUALITY_INSPECTION', 'BLOCKED_SCRAP')
    BEGIN
        THROW 50002, 'Invalid stock_type. Must be UNRESTRICTED, QUALITY_INSPECTION, or BLOCKED_SCRAP.', 1;
    END;

    MERGE INTO dbo.INVENTORY_ONHAND WITH (HOLDLOCK) AS T
    USING (SELECT @item_id AS item_id, @location_id AS location_id, @normalized_type AS stock_type) AS S
    ON (T.parameter_id = S.item_id AND T.location_id = S.location_id AND T.stock_type = S.stock_type)
    WHEN MATCHED THEN
        UPDATE SET
            T.quantity = T.quantity + @quantity_to_change,
            T.last_updated = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (parameter_id, location_id, stock_type, quantity, last_updated)
        VALUES (S.item_id, S.location_id, S.stock_type, @quantity_to_change, GETDATE());
END
GO
PRINT 'Phase 0 P0-02 sp_UpdateOnhandBalance updated successfully.';
GO
