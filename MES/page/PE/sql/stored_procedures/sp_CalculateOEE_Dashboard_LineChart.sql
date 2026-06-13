ALTER PROCEDURE [dbo].[sp_CalculateOEE_Dashboard_LineChart]
    @StartDate DATE,
    @EndDate DATE,
    @Line NVARCHAR(50) = NULL,
    @Model NVARCHAR(100) = NULL,
    @MachineId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentDateTime DATETIME = GETDATE();
    DECLARE @IsToday BIT = 0;
    IF @StartDate <= CAST(@CurrentDateTime AS DATE) AND @EndDate >= CAST(@CurrentDateTime AS DATE)
    BEGIN
        SET @IsToday = 1;
    END
    DECLARE @ProductionDayStartToday DATETIME = DATEADD(HOUR, 8, CAST( CAST(DATEADD(HOUR, -8, @CurrentDateTime) AS DATE) AS DATETIME) );
    
    WITH 
    DailyMetrics AS (
        SELECT 
            c.calendar_date AS LogDate, 
            ISNULL(SUM(
                CASE WHEN s.end_time >= s.start_time THEN DATEDIFF(MINUTE, s.start_time, s.end_time) 
                ELSE DATEDIFF(MINUTE, s.start_time, s.end_time) + 1440 END 
                - s.planned_break_minutes
            ), 0) AS PlannedMinutes
        FROM dbo.MANPOWER_CALENDAR c WITH (NOLOCK)
        LEFT JOIN dbo.LINE_SCHEDULES s WITH (NOLOCK) ON s.is_active = 1 AND (@Line IS NULL OR s.line = @Line)
        WHERE c.calendar_date BETWEEN @StartDate AND @EndDate
        GROUP BY c.calendar_date
    ),
    DailyDowntime AS (
        SELECT
            CAST(DATEADD(HOUR, -8, stop_begin) AS DATE) as log_date, 
            ISNULL(SUM(duration), 0) AS DowntimeMinutes
        FROM dbo.STOP_CAUSES WITH (NOLOCK)
        WHERE CAST(DATEADD(HOUR, -8, stop_begin) AS DATE) BETWEEN @StartDate AND @EndDate 
          AND (@Line IS NULL OR line = @Line)
          AND (@MachineId IS NULL OR machine_id = @MachineId)
        GROUP BY CAST(DATEADD(HOUR, -8, stop_begin) AS DATE)
    ),
    DailyProduction AS (
        SELECT
            CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) as LogDate, 
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) AS GoodCount,
            SUM(t.quantity) AS TotalCount,
            SUM(t.quantity * (60.0 / NULLIF(r.planned_output, 0))) AS IdealRunTimeMinutes
        FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
        JOIN dbo.LOCATIONS l WITH (NOLOCK) ON t.to_location_id = l.location_id 
        JOIN dbo.MANUFACTURING_ROUTES r WITH (NOLOCK) ON t.parameter_id = r.item_id AND l.production_line = r.line 
        WHERE
            CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) BETWEEN @StartDate AND @EndDate 
            AND t.transaction_type LIKE 'PRODUCTION_%' AND r.planned_output > 0
            AND (@Line IS NULL OR l.production_line = @Line) 
            AND (@Model IS NULL OR r.model = @Model)
            AND (@MachineId IS NULL OR t.machine_id = @MachineId)
        GROUP BY CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) 
    )
    SELECT
        c.calendar_date AS [date], 
        ISNULL(dm.PlannedMinutes, 0) AS PlannedMinutes, 
        ISNULL(dd.DowntimeMinutes, 0) AS DowntimeMinutes, 
        ISNULL(dp.IdealRunTimeMinutes, 0) AS IdealRunTimeMinutes, 
        ISNULL(dp.GoodCount, 0) AS GoodCount, 
        ISNULL(dp.TotalCount, 0) AS TotalCount,
        CAST(ISNULL(a.Availability, 0) AS DECIMAL(5, 1)) AS availability,
        CAST(ISNULL(p.Performance, 0) AS DECIMAL(5, 1)) AS performance,
        CAST(ISNULL(q.Quality, 0) AS DECIMAL(5, 1)) AS quality,
        CAST(ISNULL(a.Availability / 100.0 * p.Performance / 100.0 * q.Quality / 100.0 * 100.0, 0) AS DECIMAL(5, 1)) AS oee
    INTO #Results_Prod
    FROM dbo.MANPOWER_CALENDAR c WITH (NOLOCK)
    LEFT JOIN DailyMetrics dm ON c.calendar_date = dm.LogDate
    LEFT JOIN DailyDowntime dd ON c.calendar_date = dd.log_date
    LEFT JOIN DailyProduction dp ON c.calendar_date = dp.LogDate
    CROSS APPLY (SELECT CASE WHEN dm.PlannedMinutes > 0 THEN (dm.PlannedMinutes - ISNULL(dd.DowntimeMinutes, 0)) / dm.PlannedMinutes * 100.0 ELSE 0 END AS Availability) a
    CROSS APPLY (SELECT CASE WHEN (dm.PlannedMinutes - ISNULL(dd.DowntimeMinutes, 0)) > 0 THEN CASE WHEN (dp.IdealRunTimeMinutes / (dm.PlannedMinutes - ISNULL(dd.DowntimeMinutes, 0))) * 100.0 > 100.0 THEN 100.0 ELSE (dp.IdealRunTimeMinutes / (dm.PlannedMinutes - ISNULL(dd.DowntimeMinutes, 0))) * 100.0 END ELSE 0 END AS Performance) p
    CROSS APPLY (SELECT CASE WHEN dp.TotalCount > 0 THEN (dp.GoodCount / dp.TotalCount) * 100.0 ELSE 0 END AS Quality) q
    WHERE c.calendar_date BETWEEN @StartDate AND @EndDate;

    IF @IsToday = 1
    BEGIN
        DECLARE @TotalPlannedMinutesToday FLOAT;
        DECLARE @TotalGrossMinutesToday FLOAT;
        SELECT 
            @TotalPlannedMinutesToday = ISNULL(SUM(CASE WHEN s.end_time >= s.start_time THEN DATEDIFF(MINUTE, s.start_time, s.end_time) ELSE DATEDIFF(MINUTE, s.start_time, s.end_time) + 1440 END - s.planned_break_minutes), 0),
            @TotalGrossMinutesToday = ISNULL(SUM(CASE WHEN s.end_time >= s.start_time THEN DATEDIFF(MINUTE, s.start_time, s.end_time) ELSE DATEDIFF(MINUTE, s.start_time, s.end_time) + 1440 END), 1)
        FROM dbo.LINE_SCHEDULES s WITH (NOLOCK) WHERE s.is_active = 1 AND (@Line IS NULL OR s.line = @Line);

        DECLARE @ElapsedMinutesSinceStart FLOAT = DATEDIFF(MINUTE, @ProductionDayStartToday, @CurrentDateTime);
        IF @ElapsedMinutesSinceStart < 0 SET @ElapsedMinutesSinceStart = 0;
        
        DECLARE @ElapsedFraction FLOAT = @ElapsedMinutesSinceStart / @TotalGrossMinutesToday;
        IF @ElapsedFraction > 1.0 SET @ElapsedFraction = 1.0;
        
        DECLARE @RT_PlannedMinutes FLOAT = @TotalPlannedMinutesToday * @ElapsedFraction;
        
        DECLARE @RT_DowntimeMinutes FLOAT;
        SELECT @RT_DowntimeMinutes = ISNULL(SUM(duration), 0)
        FROM dbo.STOP_CAUSES WITH (NOLOCK)
        WHERE stop_end <= @CurrentDateTime 
          AND CAST(DATEADD(HOUR, -8, stop_begin) AS DATE) = CAST(@CurrentDateTime AS DATE) 
          AND (@Line IS NULL OR line = @Line)
          AND (@MachineId IS NULL OR machine_id = @MachineId);

        DECLARE @RT_RunTimeMinutes FLOAT = @RT_PlannedMinutes - @RT_DowntimeMinutes;
        IF @RT_RunTimeMinutes < 0 SET @RT_RunTimeMinutes = 0;
        
        DECLARE @RT_GoodCount FLOAT, @RT_TotalCount FLOAT, @RT_IdealRunTimeMinutes FLOAT;
        SELECT
            @RT_GoodCount = ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END), 0),
            @RT_TotalCount = ISNULL(SUM(t.quantity), 0),
            @RT_IdealRunTimeMinutes = ISNULL(SUM(t.quantity * (60.0 / NULLIF(r.planned_output, 0))), 0)
        FROM dbo.STOCK_TRANSACTIONS t WITH (NOLOCK)
        JOIN dbo.LOCATIONS l WITH (NOLOCK) ON t.to_location_id = l.location_id
        JOIN dbo.MANUFACTURING_ROUTES r WITH (NOLOCK) ON t.parameter_id = r.item_id AND l.production_line = r.line
        WHERE t.transaction_timestamp >= @ProductionDayStartToday 
          AND t.transaction_timestamp < @CurrentDateTime 
          AND t.transaction_type LIKE 'PRODUCTION_%' 
          AND r.planned_output > 0 
          AND (@Line IS NULL OR l.production_line = @Line) 
          AND (@Model IS NULL OR r.model = @Model)
          AND (@MachineId IS NULL OR t.machine_id = @MachineId);
            
        DECLARE @RT_Availability FLOAT = CASE WHEN @RT_PlannedMinutes > 0 THEN (@RT_RunTimeMinutes / @RT_PlannedMinutes) * 100.0 ELSE 0 END;
        DECLARE @RT_Performance FLOAT = CASE WHEN @RT_RunTimeMinutes > 0 THEN (@RT_IdealRunTimeMinutes / @RT_RunTimeMinutes) * 100.0 ELSE 0 END;
        DECLARE @RT_Quality FLOAT = CASE WHEN @RT_TotalCount > 0 THEN (@RT_GoodCount / @RT_TotalCount) * 100.0 ELSE 0 END;
        IF @RT_Performance > 100 SET @RT_Performance = 100;
        DECLARE @RT_OEE FLOAT = (@RT_Availability / 100.0) * (@RT_Performance / 100.0) * (@RT_Quality / 100.0) * 100.0;
        
        UPDATE #Results_Prod
        SET availability = @RT_Availability, performance = @RT_Performance, quality = @RT_Quality, oee = @RT_OEE
        WHERE [date] = CAST(@CurrentDateTime AS DATE);
    END
    
    SELECT [date], availability, performance, quality, oee FROM #Results_Prod ORDER BY [date];
    DROP TABLE #Results_Prod;
END
