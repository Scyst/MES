-- ============================================================================
-- Phase 0 Migration (P0-04): Immutable Ledger Reversal SP & Wrapper
-- Creates: dbo.sp_ReverseProductionTransaction
-- Updates: dbo.sp_Job_DeleteTransaction (delegates to Reversal — NO HARD DELETE)
-- Fixes:
--   1. Eliminates DELETE FROM dbo.STOCK_TRANSACTIONS (Audit Compliance Major NC).
--   2. Fixes Double-Deduction Sign Bug on CONSUMPTION rollback (uses ABS(@c_qty)).
--   3. Restores stock to the exact original stock_type bucket.
--   4. Prevents double-reversal (checks is_reversed = 0 & reversal_of_tx_id IS NULL).
--   5. Supports Nested Transactions via @@TRANCOUNT + SAVE TRANSACTION.
-- ============================================================================
IF OBJECT_ID('dbo.sp_ReverseProductionTransaction', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.sp_ReverseProductionTransaction AS RETURN 0;');
GO

ALTER PROCEDURE [dbo].[sp_ReverseProductionTransaction]
    @txn_id BIGINT,
    @job_id INT = NULL,
    @user_id INT,
    @reason NVARCHAR(500) = N'Manual Reversal',
    @out_reversal_tx_id BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @item_id INT, @qty DECIMAL(18,6), @loc_id_from INT, @loc_id_to INT,
            @type VARCHAR(50), @stock_type VARCHAR(20), @orig_job_id INT, @machine_id INT,
            @ref_id VARCHAR(255), @is_reversed BIT, @reversal_of BIGINT;
    DECLARE @neg_qty DECIMAL(18,6);
    DECLARE @effective_job_id INT;
    DECLARE @ReversalTxnID BIGINT;
    DECLARE @TranCount INT = @@TRANCOUNT;
    DECLARE @clean_reason NVARCHAR(500) = CASE
        WHEN @reason IS NULL OR LTRIM(RTRIM(@reason)) = '' THEN N'Manual Reversal'
        ELSE LTRIM(RTRIM(@reason))
    END;

    BEGIN TRY
        IF @TranCount = 0
            BEGIN TRANSACTION;
        ELSE
            SAVE TRANSACTION sp_RevProd_Save;

        -- 1. Lock and inspect original transaction
        SELECT
            @item_id = parameter_id,
            @qty = quantity,
            @loc_id_from = from_location_id,
            @loc_id_to = to_location_id,
            @type = transaction_type,
            @stock_type = ISNULL(stock_type, 'UNRESTRICTED'),
            @orig_job_id = job_id,
            @machine_id = machine_id,
            @ref_id = reference_id,
            @is_reversed = ISNULL(is_reversed, 0),
            @reversal_of = reversal_of_tx_id
        FROM dbo.STOCK_TRANSACTIONS WITH (UPDLOCK, HOLDLOCK)
        WHERE transaction_id = @txn_id;

        IF @item_id IS NULL
            THROW 50001, 'Transaction not found.', 1;

        IF @is_reversed = 1
            THROW 50005, 'Transaction has already been reversed.', 1;

        IF @reversal_of IS NOT NULL OR @type LIKE 'REVERSAL_%'
            THROW 50006, 'Cannot reverse a reversal transaction.', 1;

        -- 2. Mark original transaction as reversed (Immutable Ledger)
        UPDATE dbo.STOCK_TRANSACTIONS
        SET is_reversed = 1,
            reversed_by_user_id = @user_id,
            reversed_at = GETDATE(),
            reversal_reason = @clean_reason
        WHERE transaction_id = @txn_id;

        -- 3. Insert counter-entry (Reversal Row) into STOCK_TRANSACTIONS
        SET @neg_qty = -1.0 * @qty;
        SET @effective_job_id = COALESCE(@job_id, @orig_job_id);

        INSERT INTO dbo.STOCK_TRANSACTIONS
            (parameter_id, quantity, transaction_type, stock_type, from_location_id, to_location_id,
             reference_id, created_by_user_id, notes, transaction_timestamp,
             reversal_of_tx_id, reversal_reason, machine_id, job_id)
        VALUES
            (@item_id, @neg_qty, 'REVERSAL_' + LEFT(@type, 40), @stock_type, @loc_id_from, @loc_id_to,
             @ref_id, @user_id, N'Reversal of TXN #' + CAST(@txn_id AS NVARCHAR(20)) + N': ' + @clean_reason, GETDATE(),
             @txn_id, @clean_reason, @machine_id, @effective_job_id);

        SET @ReversalTxnID = SCOPE_IDENTITY();
        SET @out_reversal_tx_id = @ReversalTxnID;

        -- 4. Rollback Job accumulated counters if linked to a Job
        IF @effective_job_id IS NOT NULL
        BEGIN
            IF @type = 'PRODUCTION_FG'
                UPDATE dbo.PRODUCTION_JOBS SET actual_qty = ISNULL(actual_qty, 0) - @qty WHERE job_id = @effective_job_id;
            ELSE IF @type = 'PRODUCTION_HOLD'
                UPDATE dbo.PRODUCTION_JOBS SET hold_qty = ISNULL(hold_qty, 0) - @qty WHERE job_id = @effective_job_id;
            ELSE IF @type = 'PRODUCTION_SCRAP'
                UPDATE dbo.PRODUCTION_JOBS SET scrap_qty = ISNULL(scrap_qty, 0) - @qty WHERE job_id = @effective_job_id;
        END

        -- 5. Reverse INVENTORY_ONHAND for the Parent Transaction (exact stock_type bucket)
        IF @loc_id_to IS NOT NULL
        BEGIN
            EXEC dbo.sp_UpdateOnhandBalance
                @item_id = @item_id,
                @location_id = @loc_id_to,
                @quantity_to_change = @neg_qty,
                @stock_type = @stock_type;
        END

        IF @loc_id_from IS NOT NULL
        BEGIN
            DECLARE @restore_from_qty DECIMAL(18,6) = ABS(@qty);
            EXEC dbo.sp_UpdateOnhandBalance
                @item_id = @item_id,
                @location_id = @loc_id_from,
                @quantity_to_change = @restore_from_qty,
                @stock_type = @stock_type;
        END

        -- 6. Reverse Child CONSUMPTION rows (FIXES DOUBLE-DEDUCTION SIGN BUG!)
        DECLARE @consume_note NVARCHAR(500) = 'Auto-consumed for production ID: ' + CAST(@txn_id AS VARCHAR(20));
        DECLARE @c_txn_id BIGINT, @c_item_id INT, @c_qty DECIMAL(18,6), @c_loc INT, @c_stock_type VARCHAR(20);

        DECLARE cur_consumption CURSOR LOCAL FAST_FORWARD FOR
            SELECT transaction_id, parameter_id, quantity, from_location_id, ISNULL(stock_type, 'UNRESTRICTED')
            FROM dbo.STOCK_TRANSACTIONS WITH (UPDLOCK, HOLDLOCK)
            WHERE notes = @consume_note
              AND transaction_type = 'CONSUMPTION'
              AND ISNULL(is_reversed, 0) = 0;

        OPEN cur_consumption;
        FETCH NEXT FROM cur_consumption INTO @c_txn_id, @c_item_id, @c_qty, @c_loc, @c_stock_type;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- @c_qty is stored as NEGATIVE in CONSUMPTION; restoring RM requires POSITIVE ABS(@c_qty)!
            DECLARE @restore_rm_qty DECIMAL(18,6) = ABS(@c_qty);

            UPDATE dbo.STOCK_TRANSACTIONS
            SET is_reversed = 1,
                reversed_by_user_id = @user_id,
                reversed_at = GETDATE(),
                reversal_reason = @clean_reason
            WHERE transaction_id = @c_txn_id;

            INSERT INTO dbo.STOCK_TRANSACTIONS
                (parameter_id, quantity, transaction_type, stock_type, from_location_id,
                 reference_id, created_by_user_id, notes, transaction_timestamp,
                 reversal_of_tx_id, reversal_reason, machine_id, job_id)
            VALUES
                (@c_item_id, @restore_rm_qty, 'REVERSAL_CONSUMPTION', @c_stock_type, @c_loc,
                 @ref_id, @user_id, N'Reversal of CONSUMPTION #' + CAST(@c_txn_id AS NVARCHAR(20)) + N' (Parent #' + CAST(@txn_id AS NVARCHAR(20)) + N')', GETDATE(),
                 @c_txn_id, @clean_reason, @machine_id, @effective_job_id);

            IF @c_loc IS NOT NULL
            BEGIN
                EXEC dbo.sp_UpdateOnhandBalance
                    @item_id = @c_item_id,
                    @location_id = @c_loc,
                    @quantity_to_change = @restore_rm_qty,
                    @stock_type = @c_stock_type;
            END

            FETCH NEXT FROM cur_consumption INTO @c_txn_id, @c_item_id, @c_qty, @c_loc, @c_stock_type;
        END
        CLOSE cur_consumption;
        DEALLOCATE cur_consumption;

        -- 7. Legacy USER_LOGS entry (Primary audit trail is logged to SYSTEM_LOGS by PHP API)
        INSERT INTO dbo.USER_LOGS (action_by, action_type, detail, created_at)
        VALUES (
            CAST(@user_id AS VARCHAR(50)),
            'REVERSE_TXN',
            'Reversed Txn ID: ' + CAST(@txn_id AS VARCHAR(20)) + ' -> Rev ID: ' + CAST(@ReversalTxnID AS VARCHAR(20)) + ' | Reason: ' + LEFT(@clean_reason, 200),
            GETDATE()
        );

        IF @TranCount = 0
            COMMIT TRANSACTION;

        SELECT @ReversalTxnID AS reversal_transaction_id;
    END TRY
    BEGIN CATCH
        IF CURSOR_STATUS('local', 'cur_consumption') >= -1
        BEGIN
            CLOSE cur_consumption;
            DEALLOCATE cur_consumption;
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
                ROLLBACK TRANSACTION sp_RevProd_Save;
        END;

        THROW;
    END CATCH
END
GO

-- Update dbo.sp_Job_DeleteTransaction to delegate to sp_ReverseProductionTransaction (Zero Hard Delete)
IF OBJECT_ID('dbo.sp_Job_DeleteTransaction', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.sp_Job_DeleteTransaction AS RETURN 0;');
GO

ALTER PROCEDURE [dbo].[sp_Job_DeleteTransaction]
    @txn_id BIGINT,
    @job_id INT = NULL,
    @user_id INT,
    @reason NVARCHAR(500) = N'Reversed via legacy delete wrapper'
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ReverseProductionTransaction
        @txn_id = @txn_id,
        @job_id = @job_id,
        @user_id = @user_id,
        @reason = @reason;
END
GO
PRINT 'Phase 0 P0-04 sp_ReverseProductionTransaction & sp_Job_DeleteTransaction wrapper created successfully.';
GO
