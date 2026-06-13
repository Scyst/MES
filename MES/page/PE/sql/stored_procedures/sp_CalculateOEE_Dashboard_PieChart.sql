ALTER PROCEDURE [dbo].[sp_CalculateOEE_Dashboard_PieChart]
    @StartDate DATE,
    @EndDate DATE,
    @Line NVARCHAR(50) = NULL,
    @Model NVARCHAR(100) = NULL,
    @MachineId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentDateTime DATETIME = GETDATE();
    DECLARE @Today DATE = CAST(@CurrentDateTime AS DATE);
    DECLARE @IsTodayIncluded BIT = 0;
    IF @EndDate = @Today AND @StartDate <= @Today SET @IsTodayIncluded = 1;
    DECLARE @ProductionDayStartToday DATETIME = DATEADD(HOUR, 8, CAST( CAST(DATEADD(HOUR, -8, @CurrentDateTime) AS DATE) AS DATETIME) );

    DECLARE @Agg_GoodCount FLOAT = 0, @Agg_HoldCount FLOAT = 0, @Agg_ScrapCount FLOAT = 0, @Agg_IdealRunTimeMinutes FLOAT = 0;
    
    SELECT
        @Agg_GoodCount = ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END), 0),
        @Agg_HoldCount = ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END), 0),
        @Agg_ScrapCount = ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END), 0),
        @Agg_IdealRunTimeMinutes = ISNULL(SUM(CASE WHEN r.planned_output > 0 THEN t.quantity * (60.0 / r.planned_output) ELSE 0 END), 0)
    FROM dbo.STOCK_TRANSACTIONS t
    LEFT JOIN dbo.LOCATIONS l ON t.to_location_id = l.location_id
    LEFT JOIN dbo.MANUFACTURING_ROUTES r ON t.parameter_id = r.item_id AND l.production_line = r.line
    WHERE t.transaction_timestamp >= DATEADD(HOUR, 8, CAST(@StartDate AS DATETIME)) 
      AND t.transaction_timestamp < DATEADD(HOUR, 8, DATEADD(DAY, 1, CAST(@EndDate AS DATETIME)))
      AND (@IsTodayIncluded = 0 OR t.transaction_timestamp <= @CurrentDateTime) AND t.transaction_type LIKE 'PRODUCTION_%'
      AND (@Line IS NULL OR l.production_line = @Line) 
      AND (@Model IS NULL OR r.model = @Model)
      AND (@MachineId IS NULL OR t.machine_id = @MachineId);

    DECLARE @TotalPlannedMinutes FLOAT = 0;
    DECLARE @TotalGrossMinutes FLOAT = 1;
    
    SELECT 
        @TotalPlannedMinutes = ISNULL(SUM(CASE WHEN s.end_time >= s.start_time THEN DATEDIFF(MINUTE, s.start_time, s.end_time) ELSE DATEDIFF(MINUTE, s.start_time, s.end_time) + 1440 END - s.planned_break_minutes), 0),
        @TotalGrossMinutes = ISNULL(SUM(CASE WHEN s.end_time >= s.start_time THEN DATEDIFF(MINUTE, s.start_time, s.end_time) ELSE DATEDIFF(MINUTE, s.start_time, s.end_time) + 1440 END), 1)
    FROM dbo.LINE_SCHEDULES s WHERE s.is_active = 1 AND (@Line IS NULL OR s.line = @Line);

    DECLARE @TotalDays FLOAT = 0;
    IF @IsTodayIncluded = 1
    BEGIN
        DECLARE @ElapsedMinutesSinceStart FLOAT = DATEDIFF(MINUTE, @ProductionDayStartToday, @CurrentDateTime);
        IF @ElapsedMinutesSinceStart < 0 SET @ElapsedMinutesSinceStart = 0;
        DECLARE @ElapsedFraction FLOAT = @ElapsedMinutesSinceStart / @TotalGrossMinutes;
        IF @ElapsedFraction > 1.0 SET @ElapsedFraction = 1.0;
        
        SET @TotalDays = DATEDIFF(DAY, @StartDate, @Today) + @ElapsedFraction;
    END
    ELSE
    BEGIN
        SET @TotalDays = DATEDIFF(DAY, @StartDate, @EndDate) + 1.0;
    END
    
    IF @TotalDays < 0 SET @TotalDays = 0;
    SET @TotalPlannedMinutes = @TotalPlannedMinutes * @TotalDays;

    DECLARE @TotalDowntimeMinutes FLOAT = 0;
    SELECT @TotalDowntimeMinutes = ISNULL(SUM(duration), 0)
    FROM dbo.STOP_CAUSES
    WHERE stop_begin >= DATEADD(HOUR, 8, CAST(@StartDate AS DATETIME))
      AND stop_end <= (CASE WHEN @IsTodayIncluded=1 THEN @CurrentDateTime ELSE DATEADD(HOUR, 8, DATEADD(DAY, 1, CAST(@EndDate AS DATETIME))) END)
      AND (@Line IS NULL OR line = @Line)
      AND (@MachineId IS NULL OR machine_id = @MachineId);

    DECLARE @RunTimeMinutes FLOAT = @TotalPlannedMinutes - @TotalDowntimeMinutes;
    IF @RunTimeMinutes < 0 SET @RunTimeMinutes = 0;

    DECLARE @TotalDefects FLOAT = @Agg_HoldCount + @Agg_ScrapCount;
    DECLARE @TotalCount FLOAT = @Agg_GoodCount + @TotalDefects;

    DECLARE @Availability FLOAT = CASE WHEN @TotalPlannedMinutes > 0 THEN (@RunTimeMinutes / @TotalPlannedMinutes) * 100.0 ELSE 0 END;
    DECLARE @Performance FLOAT = CASE WHEN @RunTimeMinutes > 0 THEN (@Agg_IdealRunTimeMinutes / @RunTimeMinutes) * 100.0 ELSE 0 END;
    DECLARE @Quality FLOAT = CASE WHEN @TotalCount > 0 THEN (@Agg_GoodCount / @TotalCount) * 100.0 ELSE 0 END;
    
    IF @Performance > 100 SET @Performance = 100;
    DECLARE @OEE FLOAT = (@Availability / 100.0) * (@Performance / 100.0) * (@Quality / 100.0) * 100.0;

    DECLARE @TargetQty FLOAT = 0;
    IF @Agg_IdealRunTimeMinutes > 0
    BEGIN
        SET @TargetQty = @TotalCount * (@RunTimeMinutes / @Agg_IdealRunTimeMinutes);
    END

    SELECT 
        @Availability AS Availability, @Performance AS Performance, @Quality AS Quality, @OEE AS OEE,
        @TotalPlannedMinutes AS PlannedTime, @TotalDowntimeMinutes AS Downtime, @RunTimeMinutes AS Runtime,
        @Agg_GoodCount AS FG, @Agg_HoldCount AS Hold, @Agg_ScrapCount AS Scrap,
        @TotalDefects AS Defects, @TotalCount AS ActualOutput, 
        @TargetQty AS TargetQty,
        @Agg_IdealRunTimeMinutes AS TotalTheoreticalMinutes;
END
