-- ============================================================================
-- Phase 0 Migration (P0-03): Fix Critical Bugs in dbo.sp_ExecuteProduction
-- Fixes:
--   1. Stock Type Segregation: FG -> UNRESTRICTED, HOLD -> QUALITY_INSPECTION,
--      SCRAP -> BLOCKED_SCRAP (NEVER adds HOLD/SCRAP to Unrestricted stock).
--   2. Active BOM Filter: Only backflush WHERE ISNULL(bom_status, 'ACTIVE') = 'ACTIVE'.
--   3. Job & Machine Linkage: Accepts @job_id INT = NULL, stamps job_id & machine_id
--      on both Parent and Child CONSUMPTION rows.
--   4. Atomic OUTPUT ID: Returns @out_transaction_id BIGINT = NULL OUTPUT and
--      resultset (SELECT @ParentTransactionID AS transaction_id).
--   5. Nested Transaction Safety: Uses @@TRANCOUNT + SAVE TRANSACTION so PHP PDO
--      beginTransaction() can safely wrap multi-batch FG+HOLD+SCRAP calls.
-- ============================================================================
IF OBJECT_ID('dbo.sp_ExecuteProduction', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.sp_ExecuteProduction AS RETURN 0;');
GO

ALTER PROCEDURE [dbo].[sp_ExecuteProduction]
    @item_id INT,
    @location_id INT,
    @quantity DECIMAL(18, 6),
    @count_type VARCHAR(50),
    @lot_no NVARCHAR(255),
    @notes NVARCHAR(500),
    @timestamp DATETIME,
    @start_time TIME,
    @end_time TIME,
    @user_id INT,
    @username NVARCHAR(100),
    @machine_id INT = NULL,
    @team_user_ids VARCHAR(MAX) = NULL,
    @job_id INT = NULL,
    @out_transaction_id BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @normalized_count VARCHAR(50) = UPPER(LTRIM(RTRIM(ISNULL(@count_type, ''))));
    IF @normalized_count NOT IN ('FG', 'HOLD', 'SCRAP')
    BEGIN
        THROW 50003, 'Invalid @count_type. Allowed values: FG, HOLD, SCRAP.', 1;
    END;

    IF @quantity IS NULL OR @quantity <= 0
    BEGIN
        THROW 50004, 'Production @quantity must be greater than 0.', 1;
    END;

    DECLARE @prod_transaction_type VARCHAR(100) = 'PRODUCTION_' + @normalized_count;
    DECLARE @target_stock_type VARCHAR(20) = CASE
        WHEN @normalized_count = 'FG' THEN 'UNRESTRICTED'
        WHEN @normalized_count = 'HOLD' THEN 'QUALITY_INSPECTION'
        ELSE 'BLOCKED_SCRAP'
    END;

    DECLARE @ParentTransactionID BIGINT;
    DECLARE @LogDetail NVARCHAR(500);
    DECLARE @TranCount INT = @@TRANCOUNT;

    -- Fetch standard price & cost snapshots from Master Data
    DECLARE @PriceTHB DECIMAL(18,6), @PriceUSD DECIMAL(18,6);
    DECLARE @CostMat DECIMAL(18,6), @CostDL DECIMAL(18,6), @CostOH DECIMAL(18,6);
    DECLARE @OH_Mach DECIMAL(18,6), @OH_Util DECIMAL(18,6), @OH_Ind DECIMAL(18,6),
            @OH_Staff DECIMAL(18,6), @OH_Acc DECIMAL(18,6), @OH_Oth DECIMAL(18,6);

    SELECT
        @PriceTHB = ISNULL(StandardPrice, 0),
        @PriceUSD = ISNULL(Price_USD, 0),
        @CostMat = ISNULL(Cost_RM, 0) + ISNULL(Cost_PKG, 0) + ISNULL(Cost_SUB, 0),
        @CostDL = ISNULL(Cost_DL, 0),
        @OH_Mach = ISNULL(Cost_OH_Machine, 0),
        @OH_Util = ISNULL(Cost_OH_Utilities, 0),
        @OH_Ind = ISNULL(Cost_OH_Indirect, 0),
        @OH_Staff = ISNULL(Cost_OH_Staff, 0),
        @OH_Acc = ISNULL(Cost_OH_Accessory, 0),
        @OH_Oth = ISNULL(Cost_OH_Others, 0),
        @CostOH = ISNULL(Cost_OH_Machine, 0) + ISNULL(Cost_OH_Utilities, 0) + ISNULL(Cost_OH_Indirect, 0) +
                  ISNULL(Cost_OH_Staff, 0) + ISNULL(Cost_OH_Accessory, 0) + ISNULL(Cost_OH_Others, 0)
    FROM dbo.ITEMS WITH (NOLOCK)
    WHERE item_id = @item_id;

    BEGIN TRY
        IF @TranCount = 0
            BEGIN TRANSACTION;
        ELSE
            SAVE TRANSACTION sp_ExecProd_Save;

        -- 1. Insert Parent Production Transaction with stock_type & job_id
        INSERT INTO dbo.STOCK_TRANSACTIONS
            (parameter_id, quantity, transaction_type, stock_type, to_location_id, created_by_user_id, notes, reference_id,
             transaction_timestamp, start_time, end_time,
             std_price_snapshot, std_price_usd_snapshot, std_cost_mat_snapshot, std_cost_dl_snapshot, std_cost_oh_snapshot,
             std_cost_oh_machine_snapshot, std_cost_oh_util_snapshot, std_cost_oh_indirect_snapshot,
             std_cost_oh_staff_snapshot, std_cost_oh_acc_snapshot, std_cost_oh_other_snapshot,
             machine_id, job_id)
        VALUES
            (@item_id, @quantity, @prod_transaction_type, @target_stock_type, @location_id, @user_id, @notes, @lot_no,
             @timestamp, @start_time, @end_time,
             @PriceTHB, @PriceUSD, @CostMat, @CostDL, @CostOH,
             @OH_Mach, @OH_Util, @OH_Ind, @OH_Staff, @OH_Acc, @OH_Oth,
             @machine_id, @job_id);

        SET @ParentTransactionID = SCOPE_IDENTITY();
        SET @out_transaction_id = @ParentTransactionID;

        -- 2. Record Team Attribution (STOCK_TRANSACTION_USERS)
        IF @team_user_ids IS NOT NULL AND LTRIM(RTRIM(@team_user_ids)) != ''
        BEGIN
            DECLARE @TeamSize INT;
            SELECT @TeamSize = COUNT(*)
            FROM STRING_SPLIT(@team_user_ids, ',')
            WHERE LTRIM(RTRIM(value)) != '' AND TRY_CAST(LTRIM(RTRIM(value)) AS INT) IS NOT NULL;

            IF @TeamSize > 0
            BEGIN
                INSERT INTO dbo.STOCK_TRANSACTION_USERS (transaction_id, user_id, emp_id, head_count_ratio)
                SELECT @ParentTransactionID, u.id, u.emp_id, 1.0 / @TeamSize
                FROM STRING_SPLIT(@team_user_ids, ',') s
                INNER JOIN dbo.USERS u ON TRY_CAST(LTRIM(RTRIM(s.value)) AS INT) = u.id
                WHERE LTRIM(RTRIM(s.value)) != '';
            END
        END
        ELSE
        BEGIN
            INSERT INTO dbo.STOCK_TRANSACTION_USERS (transaction_id, user_id, emp_id, head_count_ratio)
            SELECT @ParentTransactionID, @user_id, u.emp_id, 1.0
            FROM dbo.USERS u WHERE u.id = @user_id;
        END

        -- 3. Update Inventory Onhand in the SEGREGATED stock_type bucket
        EXEC dbo.sp_UpdateOnhandBalance
            @item_id = @item_id,
            @location_id = @location_id,
            @quantity_to_change = @quantity,
            @stock_type = @target_stock_type;

        -- 4. Backflush ONLY ACTIVE BOM Components from UNRESTRICTED stock
        DECLARE @component_item_id INT, @quantity_required DECIMAL(18, 6), @qty_to_consume DECIMAL(18, 6);
        DECLARE @consume_note NVARCHAR(500) = 'Auto-consumed for production ID: ' + CAST(@ParentTransactionID AS VARCHAR(20));

        DECLARE comp_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT component_item_id, quantity_required
            FROM dbo.PRODUCT_BOM WITH (NOLOCK)
            WHERE fg_item_id = @item_id
              AND ISNULL(bom_status, 'ACTIVE') = 'ACTIVE';

        OPEN comp_cursor;
        FETCH NEXT FROM comp_cursor INTO @component_item_id, @quantity_required;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @qty_to_consume = -1.0 * @quantity * @quantity_required;

            DECLARE @CompCostMat DECIMAL(18,6), @CompCostTotal DECIMAL(18,6);
            SELECT @CompCostMat = ISNULL(Cost_RM, 0), @CompCostTotal = ISNULL(Cost_Total, 0)
            FROM dbo.ITEMS WITH (NOLOCK) WHERE item_id = @component_item_id;

            INSERT INTO dbo.STOCK_TRANSACTIONS
                (parameter_id, quantity, transaction_type, stock_type, from_location_id, created_by_user_id, notes, reference_id,
                 transaction_timestamp, start_time, end_time,
                 std_cost_mat_snapshot, std_cost_oh_snapshot, machine_id, job_id)
            VALUES
                (@component_item_id, @qty_to_consume, 'CONSUMPTION', 'UNRESTRICTED', @location_id, @user_id, @consume_note, @lot_no,
                 @timestamp, @start_time, @end_time,
                 @CompCostMat, @CompCostTotal, @machine_id, @job_id);

            EXEC dbo.sp_UpdateOnhandBalance
                @item_id = @component_item_id,
                @location_id = @location_id,
                @quantity_to_change = @qty_to_consume,
                @stock_type = 'UNRESTRICTED';

            FETCH NEXT FROM comp_cursor INTO @component_item_id, @quantity_required;
        END
        CLOSE comp_cursor;
        DEALLOCATE comp_cursor;

        -- 5. Legacy USER_LOGS Compatibility (Primary audit log is written to SYSTEM_LOGS by API)
        SET @LogDetail = 'Type: ' + @normalized_count + ' (' + @target_stock_type + '), Qty: ' + CAST(@quantity AS VARCHAR(20)) +
                         ', Location: ' + CAST(@location_id AS VARCHAR(10)) + ', Lot: ' + ISNULL(@lot_no, 'N/A');
        INSERT INTO dbo.USER_LOGS (action_by, action_type, detail) VALUES (@username, 'PRODUCTION LOG', @LogDetail);

        IF @TranCount = 0
            COMMIT TRANSACTION;

        SELECT @ParentTransactionID AS transaction_id;
    END TRY
    BEGIN CATCH
        IF CURSOR_STATUS('local', 'comp_cursor') >= -1
        BEGIN
            CLOSE comp_cursor;
            DEALLOCATE comp_cursor;
        END

        IF XACT_STATE() = -1
        BEGIN
            IF @TranCount = 0 ROLLBACK TRANSACTION;
        END
        ELSE IF XACT_STATE() = 1
        BEGIN
            IF @TranCount = 0
                ROLLBACK TRANSACTION;
            ELSE
                ROLLBACK TRANSACTION sp_ExecProd_Save;
        END;

        THROW;
    END CATCH
END
GO
PRINT 'Phase 0 P0-03 sp_ExecuteProduction updated successfully.';
GO
