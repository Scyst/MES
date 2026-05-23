-- =================================================================
-- UPDATE: sp_SaveMonthlyTarget (PL Feature - Exclude Saturday)
-- =================================================================
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_SaveMonthlyTarget]
    @Year INT,
    @Month INT,
    @Section NVARCHAR(50),
    @Items NVARCHAR(MAX),
    @User NVARCHAR(100) 
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @StartDate DATE = DATEFROMPARTS(@Year, @Month, 1);
    DECLARE @EndDate DATE = EOMONTH(@StartDate);
    DECLARE @WorkingDays INT;

    SELECT @WorkingDays = COUNT(*)
    FROM dbo.MANPOWER_CALENDAR
    WHERE calendar_date BETWEEN @StartDate AND @EndDate
      AND day_type NOT IN ('HOLIDAY', 'SUNDAY', 'OFFDAY')
      AND DATENAME(weekday, calendar_date) <> 'Saturday'; -- [PL Feature] Exclude Saturday

    IF @WorkingDays IS NULL OR @WorkingDays = 0 SET @WorkingDays = 26;

    BEGIN TRY
        BEGIN TRANSACTION;

        MERGE INTO dbo.MONTHLY_PL_TARGETS AS Target
        USING (
            SELECT 
                @Year AS y, @Month AS m, @Section AS s, @WorkingDays as wd,
                item_id, amount 
            FROM OPENJSON(@Items) 
            WITH (item_id INT '$.item_id', amount DECIMAL(18,4) '$.amount')
        ) AS Source
        ON (Target.year_val = Source.y AND Target.month_val = Source.m 
            AND Target.section_name = Source.s AND Target.item_id = Source.item_id)
        
        WHEN MATCHED THEN
            UPDATE SET 
                target_amount = Source.amount,
                working_days = Source.wd,
                updated_at = GETDATE(),
                updated_by = @User 

        WHEN NOT MATCHED THEN
            INSERT (year_val, month_val, section_name, item_id, target_amount, working_days, updated_at, updated_by)
            VALUES (Source.y, Source.m, Source.s, Source.item_id, Source.amount, Source.wd, GETDATE(), @User); 

        COMMIT TRANSACTION;
        
        SELECT 1 as success, 'Saved Successfully' as message, @WorkingDays as working_days_used;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SELECT 0 as success, ERROR_MESSAGE() as message, 0 as working_days_used;
    END CATCH
END
GO

-- =================================================================
-- UPDATE: sp_GetPLEntryData_WithTargets (PL Feature - Exclude Saturday)
-- =================================================================
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_GetPLEntryData_WithTargets] 
    @EntryDate DATE,
    @Section NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    EXEC dbo.sp_CalculateDailyCost @EntryDate, @EntryDate;

    DECLARE @Year INT = YEAR(@EntryDate);
    DECLARE @Month INT = MONTH(@EntryDate);
    DECLARE @IsHoliday BIT = 0;
    
    DECLARE @DailyExRate DECIMAL(10,4);
    DECLARE @DailyContainerRate DECIMAL(18,2);

    SELECT 
        @IsHoliday = CASE WHEN day_type IN ('HOLIDAY', 'SUNDAY', 'OFFDAY') OR DATENAME(weekday, calendar_date) = 'Saturday' THEN 1 ELSE 0 END, -- [PL Feature]
        @DailyExRate = exchange_rate,
        @DailyContainerRate = container_rate
    FROM dbo.MANPOWER_CALENDAR 
    WHERE calendar_date = @EntryDate;

    IF @DailyExRate IS NULL
    BEGIN
        SELECT TOP 1 @DailyExRate = exchange_rate FROM dbo.MANPOWER_CALENDAR
        WHERE calendar_date < @EntryDate AND exchange_rate IS NOT NULL ORDER BY calendar_date DESC;
    END

    IF @DailyContainerRate IS NULL
    BEGIN
        SELECT TOP 1 @DailyContainerRate = container_rate FROM dbo.MANPOWER_CALENDAR
        WHERE calendar_date < @EntryDate AND container_rate IS NOT NULL ORDER BY calendar_date DESC;
    END

    -- Default Fallback
    IF @DailyExRate IS NULL SET @DailyExRate = 32.0; 
    IF @DailyContainerRate IS NULL SET @DailyContainerRate = 15500.00;

    -- 3. Calculate Auto Values
    DECLARE @Val_Revenue FLOAT = 0;
    DECLARE @Val_Logistics FLOAT = 0;
    DECLARE @Val_Labor_Base FLOAT = 0, @Val_Labor_OT FLOAT = 0;
    
    DECLARE @Val_Mat_Std FLOAT = 0, @Val_Mat_Act FLOAT = 0, @Val_Scrap FLOAT = 0;
    DECLARE @Val_Std_DL FLOAT = 0, @Val_OH_Machine FLOAT = 0, @Val_OH_Utility FLOAT = 0; 
    DECLARE @Val_OH_Indirect FLOAT = 0, @Val_OH_Staff FLOAT = 0, @Val_OH_Accessory FLOAT = 0, @Val_OH_Other FLOAT = 0;

    -- ==================================================================================
    -- [A] Revenue & Standard Costs (FG Only)
    -- ==================================================================================
    SELECT 
        @Val_Revenue      = SUM(st.quantity * CASE WHEN i.Price_USD > 0 THEN (i.Price_USD * @DailyExRate) ELSE i.StandardPrice END),
        @Val_Logistics    = SUM(CASE WHEN ISNULL(i.CTN, 0) > 0 THEN (st.quantity / i.CTN) * @DailyContainerRate ELSE 0 END),
        
        -- Standard BOM Costs (Backflush Logic based on FG Output)
        @Val_Mat_Std      = SUM(st.quantity * (ISNULL(i.Cost_RM, 0) + ISNULL(i.Cost_PKG, 0) + ISNULL(i.Cost_SUB, 0))),
        @Val_Std_DL       = SUM(st.quantity * ISNULL(i.Cost_DL, 0)),
        @Val_OH_Machine   = SUM(st.quantity * ISNULL(i.Cost_OH_Machine, 0)),
        @Val_OH_Utility   = SUM(st.quantity * ISNULL(i.Cost_OH_Utilities, 0)),
        @Val_OH_Indirect  = SUM(st.quantity * ISNULL(i.Cost_OH_Indirect, 0)),
        @Val_OH_Staff     = SUM(st.quantity * ISNULL(i.Cost_OH_Staff, 0)),
        @Val_OH_Accessory = SUM(st.quantity * ISNULL(i.Cost_OH_Accessory, 0)),
        @Val_OH_Other     = SUM(st.quantity * ISNULL(i.Cost_OH_Others, 0))

    FROM dbo.STOCK_TRANSACTIONS st
    JOIN dbo.ITEMS i ON st.parameter_id = i.item_id 
    LEFT JOIN dbo.LOCATIONS l ON st.to_location_id = l.location_id
    WHERE st.transaction_type = 'PRODUCTION_FG' 
      AND CAST(DATEADD(HOUR, -8, st.transaction_timestamp) AS DATE) = @EntryDate 
      AND (@Section = 'ALL' OR l.production_line = @Section)
      AND i.material_type = 'FG'; 

    -- [D] Consumption & Scrap (Actuals)
    SELECT @Val_Mat_Act = ABS(SUM(st.quantity * i.Cost_RM)) 
    FROM dbo.STOCK_TRANSACTIONS st
    JOIN dbo.ITEMS i ON st.parameter_id = i.item_id 
    LEFT JOIN dbo.LOCATIONS l ON st.from_location_id = l.location_id 
    WHERE st.transaction_type = 'CONSUMPTION' 
      AND CAST(DATEADD(HOUR, -8, st.transaction_timestamp) AS DATE) = @EntryDate 
      AND (@Section = 'ALL' OR l.production_line = @Section);

    SELECT @Val_Scrap = ABS(SUM(st.quantity * i.Cost_Total)) 
    FROM dbo.STOCK_TRANSACTIONS st
    JOIN dbo.ITEMS i ON st.parameter_id = i.item_id 
    LEFT JOIN dbo.LOCATIONS l ON st.from_location_id = l.location_id 
    LEFT JOIN dbo.USERS u ON st.created_by_user_id = u.id
    WHERE st.transaction_type = 'SCRAP' 
      AND CAST(DATEADD(HOUR, -8, st.transaction_timestamp) AS DATE) = @EntryDate 
      AND (@Section = 'ALL' OR l.production_line = @Section)
      AND (u.line NOT LIKE '%Team2%' OR u.line IS NULL) 
      AND (u.username NOT LIKE '%Team2%' OR u.username IS NULL);

    -- [E] Labor (From MES_MANUAL_DAILY_COSTS)
    SELECT @Val_Labor_Base = SUM(cost_value) FROM dbo.MES_MANUAL_DAILY_COSTS
    WHERE entry_date = @EntryDate AND cost_category = 'LABOR' AND cost_type = 'DIRECT_LABOR' AND (@Section = 'ALL' OR line = @Section);

    SELECT @Val_Labor_OT = SUM(cost_value) FROM dbo.MES_MANUAL_DAILY_COSTS
    WHERE entry_date = @EntryDate AND cost_category = 'LABOR' AND cost_type = 'OVERTIME' AND (@Section = 'ALL' OR line = @Section);

    -- 4. Mapping & Return
    ;WITH PL_Tree AS (
        SELECT id, item_name, account_code, item_type, data_source, calculation_formula, parent_id, row_order, 0 AS item_level, CAST(RIGHT('00000' + CAST(row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX)) AS SortPath
        FROM dbo.PL_STRUCTURE WHERE parent_id IS NULL AND is_active = 1
        UNION ALL
        SELECT c.id, c.item_name, c.account_code, c.item_type, c.data_source, c.calculation_formula, c.parent_id, c.row_order, p.item_level + 1, p.SortPath + '.' + CAST(RIGHT('00000' + CAST(c.row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX))
        FROM dbo.PL_STRUCTURE c INNER JOIN PL_Tree p ON c.parent_id = p.id WHERE c.is_active = 1
    )
    SELECT 
        T.id AS item_id, T.account_code, T.item_name, T.item_type, T.data_source, T.calculation_formula, T.item_level, T.parent_id,
        CAST(CASE 
            WHEN T.data_source = 'AUTO_STOCK' THEN ISNULL(@Val_Revenue, 0)
            WHEN T.data_source = 'AUTO_LABOR' THEN ISNULL(@Val_Labor_Base, 0)
            WHEN T.data_source = 'AUTO_LABOR_OT' THEN ISNULL(@Val_Labor_OT, 0)
            WHEN T.data_source = 'AUTO_MAT'        THEN ISNULL(@Val_Mat_Std, 0)
            WHEN T.data_source = 'AUTO_MAT_ACTUAL' THEN ISNULL(@Val_Mat_Act, 0)
            WHEN T.data_source = 'AUTO_SCRAP'      THEN ISNULL(@Val_Scrap, 0)
            WHEN T.data_source = 'AUTO_STD_LABOR'       THEN ISNULL(@Val_Std_DL, 0)
            WHEN T.data_source = 'AUTO_OH_MACHINE'      THEN ISNULL(@Val_OH_Machine, 0)
            WHEN T.data_source = 'AUTO_OH_UTILITY'      THEN ISNULL(@Val_OH_Utility, 0)
            WHEN T.data_source = 'AUTO_OH_INDIRECT_STD' THEN ISNULL(@Val_OH_Indirect, 0)
            WHEN T.data_source = 'AUTO_OH_STAFF'        THEN ISNULL(@Val_OH_Staff, 0)
            WHEN T.data_source = 'AUTO_OH_ACCESSORY'    THEN ISNULL(@Val_OH_Accessory, 0)
            WHEN T.data_source = 'AUTO_OH_OTHER'        THEN ISNULL(@Val_OH_Other, 0)
            WHEN T.data_source = 'AUTO_LOGISTICS' THEN ISNULL(@Val_Logistics, 0)
            ELSE ISNULL(E.actual_amount, 0)
        END AS FLOAT) AS actual_amount,
        
        ISNULL(E.input_by, '') AS remark,
        @DailyExRate as current_ex_rate,
        CASE WHEN @IsHoliday = 1 THEN 0 WHEN M.target_amount IS NOT NULL AND M.working_days > 0 THEN CAST((M.target_amount / M.working_days) AS FLOAT) ELSE 0 END AS daily_target,
        CAST(ISNULL(M.target_amount, 0) AS FLOAT) as monthly_budget

    FROM PL_Tree T
    LEFT JOIN dbo.DAILY_PL_ENTRIES E ON T.id = E.item_id AND E.entry_date = @EntryDate AND E.section_name = @Section
    LEFT JOIN dbo.MONTHLY_PL_TARGETS M ON T.id = M.item_id AND M.year_val = @Year AND M.month_val = @Month AND M.section_name = @Section
    ORDER BY T.SortPath;
END
GO
