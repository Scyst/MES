-- ============================================================================
-- Phase 0 Backup: Original Stored Procedure Definitions (Captured 2026-11-26)
-- Target DB: IIOT_TOOLBOX (SQL Server 2016)
-- Purpose: Instant restore of original SP logic if emergency rollback is needed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ORIGINAL dbo.sp_UpdateOnhandBalance
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_UpdateOnhandBalance', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_UpdateOnhandBalance;
GO
CREATE PROCEDURE [dbo].[sp_UpdateOnhandBalance]
    @item_id INT,
    @location_id INT,
    @quantity_to_change DECIMAL(18, 6)
AS
BEGIN
    SET NOCOUNT ON;

    MERGE INTO dbo.INVENTORY_ONHAND AS T
    USING (SELECT @item_id AS item_id, @location_id AS location_id) AS S
    ON (T.parameter_id = S.item_id AND T.location_id = S.location_id)
    WHEN MATCHED THEN
        UPDATE SET T.quantity = T.quantity + @quantity_to_change, T.last_updated = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (parameter_id, location_id, quantity)
        VALUES (S.item_id, S.location_id, @quantity_to_change);
END
GO

-- ----------------------------------------------------------------------------
-- 2. ORIGINAL dbo.sp_ExecuteProduction
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_ExecuteProduction', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ExecuteProduction;
GO
CREATE PROCEDURE [dbo].[sp_ExecuteProduction]
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
    @team_user_ids VARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @prod_transaction_type VARCHAR(100) = 'PRODUCTION_' + UPPER(@count_type);
    DECLARE @ParentTransactionID BIGINT;
    DECLARE @LogDetail NVARCHAR(500);

    DECLARE @PriceTHB DECIMAL(18,6), @PriceUSD DECIMAL(18,6);
    DECLARE @CostMat DECIMAL(18,6), @CostDL DECIMAL(18,6), @CostOH DECIMAL(18,6);
    DECLARE @OH_Mach DECIMAL(18,6), @OH_Util DECIMAL(18,6), @OH_Ind DECIMAL(18,6), @OH_Staff DECIMAL(18,6), @OH_Acc DECIMAL(18,6), @OH_Oth DECIMAL(18,6);

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
        BEGIN TRANSACTION;

        INSERT INTO dbo.STOCK_TRANSACTIONS
            (parameter_id, quantity, transaction_type, to_location_id, created_by_user_id, notes, reference_id, transaction_timestamp, start_time, end_time,
             std_price_snapshot, std_price_usd_snapshot, std_cost_mat_snapshot, std_cost_dl_snapshot, std_cost_oh_snapshot,
             std_cost_oh_machine_snapshot, std_cost_oh_util_snapshot, std_cost_oh_indirect_snapshot, std_cost_oh_staff_snapshot, std_cost_oh_acc_snapshot, std_cost_oh_other_snapshot, machine_id)
        VALUES
            (@item_id, @quantity, @prod_transaction_type, @location_id, @user_id, @notes, @lot_no, @timestamp, @start_time, @end_time,
             @PriceTHB, @PriceUSD, @CostMat, @CostDL, @CostOH,
             @OH_Mach, @OH_Util, @OH_Ind, @OH_Staff, @OH_Acc, @OH_Oth, @machine_id);

        SET @ParentTransactionID = SCOPE_IDENTITY();

        IF @team_user_ids IS NOT NULL AND LTRIM(RTRIM(@team_user_ids)) != ''
        BEGIN
            DECLARE @TeamSize INT;
            SELECT @TeamSize = COUNT(*) FROM STRING_SPLIT(@team_user_ids, ',') WHERE LTRIM(RTRIM(value)) != '';

            IF @TeamSize > 0
            BEGIN
                INSERT INTO dbo.STOCK_TRANSACTION_USERS (transaction_id, user_id, emp_id, head_count_ratio)
                SELECT @ParentTransactionID, u.id, u.emp_id, 1.0 / @TeamSize
                FROM STRING_SPLIT(@team_user_ids, ',') s
                INNER JOIN dbo.USERS u ON CAST(LTRIM(RTRIM(s.value)) AS INT) = u.id
                WHERE LTRIM(RTRIM(s.value)) != '';
            END
        END
        ELSE
        BEGIN
            INSERT INTO dbo.STOCK_TRANSACTION_USERS (transaction_id, user_id, emp_id, head_count_ratio)
            SELECT @ParentTransactionID, @user_id, u.emp_id, 1.0
            FROM dbo.USERS u WHERE u.id = @user_id;
        END

        EXEC dbo.sp_UpdateOnhandBalance @item_id = @item_id, @location_id = @location_id, @quantity_to_change = @quantity;

        IF UPPER(@count_type) IN ('FG', 'HOLD', 'SCRAP')
        BEGIN
            DECLARE @component_item_id INT, @quantity_required DECIMAL(18, 6), @qty_to_consume DECIMAL(18, 6);
            DECLARE @consume_note NVARCHAR(500) = 'Auto-consumed for production ID: ' + CAST(@ParentTransactionID AS VARCHAR(20));

            DECLARE comp_cursor CURSOR FOR
                SELECT component_item_id, quantity_required
                FROM dbo.PRODUCT_BOM WITH (NOLOCK) WHERE fg_item_id = @item_id;

            OPEN comp_cursor;
            FETCH NEXT FROM comp_cursor INTO @component_item_id, @quantity_required;

            WHILE @@FETCH_STATUS = 0
            BEGIN
                SET @qty_to_consume = -1.0 * @quantity * @quantity_required;

                DECLARE @CompCostMat DECIMAL(18,6), @CompCostTotal DECIMAL(18,6);
                SELECT @CompCostMat = ISNULL(Cost_RM, 0), @CompCostTotal = ISNULL(Cost_Total, 0)
                FROM dbo.ITEMS WITH (NOLOCK) WHERE item_id = @component_item_id;

                INSERT INTO dbo.STOCK_TRANSACTIONS
                    (parameter_id, quantity, transaction_type, from_location_id, created_by_user_id, notes, reference_id, transaction_timestamp, start_time, end_time,
                     std_cost_mat_snapshot, std_cost_oh_snapshot)
                VALUES
                    (@component_item_id, @qty_to_consume, 'CONSUMPTION', @location_id, @user_id, @consume_note, @lot_no, @timestamp, @start_time, @end_time,
                     @CompCostMat, @CompCostTotal);

                EXEC dbo.sp_UpdateOnhandBalance @item_id = @component_item_id, @location_id = @location_id, @quantity_to_change = @qty_to_consume;

                FETCH NEXT FROM comp_cursor INTO @component_item_id, @quantity_required;
            END
            CLOSE comp_cursor;
            DEALLOCATE comp_cursor;
        END

        SET @LogDetail = 'Type: ' + @count_type + ', Qty: ' + CAST(@quantity AS VARCHAR(20)) + ', Location: ' + CAST(@location_id AS VARCHAR(10)) + ', Lot: ' + ISNULL(@lot_no, 'N/A');
        INSERT INTO dbo.USER_LOGS (action_by, action_type, detail) VALUES (@username, 'PRODUCTION LOG', @LogDetail);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        IF CURSOR_STATUS('global', 'comp_cursor') >= -1
        BEGIN
            CLOSE comp_cursor; DEALLOCATE comp_cursor;
        END
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- ----------------------------------------------------------------------------
-- 3. ORIGINAL dbo.sp_Job_DeleteTransaction
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_Job_DeleteTransaction', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_Job_DeleteTransaction;
GO
CREATE PROCEDURE [dbo].[sp_Job_DeleteTransaction]
    @txn_id BIGINT,
    @job_id INT = NULL,
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @item_id INT, @qty DECIMAL(18,6), @loc_id_from INT, @loc_id_to INT, @type VARCHAR(50);
    DECLARE @neg_qty DECIMAL(18,6);

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT @item_id = parameter_id,
               @qty = quantity,
               @loc_id_from = from_location_id,
               @loc_id_to = to_location_id,
               @type = transaction_type
        FROM dbo.STOCK_TRANSACTIONS WITH (UPDLOCK)
        WHERE transaction_id = @txn_id;

        IF @item_id IS NULL THROW 50001, 'Transaction not found.', 1;

        IF @job_id IS NOT NULL
        BEGIN
            IF @type = 'PRODUCTION_FG'
                UPDATE dbo.PRODUCTION_JOBS SET actual_qty = ISNULL(actual_qty, 0) - @qty WHERE job_id = @job_id;
            ELSE IF @type = 'PRODUCTION_HOLD'
                UPDATE dbo.PRODUCTION_JOBS SET hold_qty = ISNULL(hold_qty, 0) - @qty WHERE job_id = @job_id;
            ELSE IF @type = 'PRODUCTION_SCRAP'
                UPDATE dbo.PRODUCTION_JOBS SET scrap_qty = ISNULL(scrap_qty, 0) - @qty WHERE job_id = @job_id;
        END

        IF @loc_id_to IS NOT NULL
        BEGIN
            SET @neg_qty = @qty * -1;
            EXEC dbo.sp_UpdateOnhandBalance @item_id = @item_id, @location_id = @loc_id_to, @quantity_to_change = @neg_qty;
        END

        IF @loc_id_from IS NOT NULL
        BEGIN
            EXEC dbo.sp_UpdateOnhandBalance @item_id = @item_id, @location_id = @loc_id_from, @quantity_to_change = @qty;
        END

        DECLARE @consume_note NVARCHAR(500) = 'Auto-consumed for production ID: ' + CAST(@txn_id AS VARCHAR(20));

        DECLARE @c_item_id INT, @c_qty DECIMAL(18,6), @c_loc INT, @c_txn_id BIGINT;
        DECLARE cur_consumption CURSOR FOR
            SELECT transaction_id, parameter_id, quantity, from_location_id
            FROM dbo.STOCK_TRANSACTIONS
            WHERE notes = @consume_note AND transaction_type = 'CONSUMPTION';

        OPEN cur_consumption;
        FETCH NEXT FROM cur_consumption INTO @c_txn_id, @c_item_id, @c_qty, @c_loc;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            IF @c_loc IS NOT NULL
            BEGIN
                EXEC dbo.sp_UpdateOnhandBalance @item_id = @c_item_id, @location_id = @c_loc, @quantity_to_change = @c_qty;
            END
            DELETE FROM dbo.STOCK_TRANSACTIONS WHERE transaction_id = @c_txn_id;

            FETCH NEXT FROM cur_consumption INTO @c_txn_id, @c_item_id, @c_qty, @c_loc;
        END
        CLOSE cur_consumption;
        DEALLOCATE cur_consumption;

        DELETE FROM dbo.STOCK_TRANSACTIONS WHERE transaction_id = @txn_id;

        INSERT INTO dbo.USER_LOGS (action_by, action_type, detail, created_at)
        VALUES (CAST(@user_id AS VARCHAR), 'DELETE_TXN', 'Deleted Txn ID: ' + CAST(@txn_id AS VARCHAR) + ISNULL(' from Job ID: ' + CAST(@job_id AS VARCHAR), ' (Manual Log)'), GETDATE());

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END
GO
