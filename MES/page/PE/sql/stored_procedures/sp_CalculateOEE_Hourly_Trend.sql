ALTER PROCEDURE [dbo].[sp_CalculateOEE_Hourly_Trend]
    @TargetDate DATE,
    @Line NVARCHAR(50) = NULL,
    @Model NVARCHAR(100) = NULL,
    @MachineId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AnchorTime DATETIME;
    DECLARE @IsToday BIT = 0;

    IF @TargetDate = CAST(GETDATE() AS DATE)
    BEGIN
        SET @AnchorTime = GETDATE();
        SET @IsToday = 1;
    END
    ELSE
    BEGIN
        SET @AnchorTime = DATEADD(HOUR, 8, DATEADD(DAY, 1, CAST(@TargetDate AS DATETIME)));
    END

    DECLARE @HourSeries TABLE (
        HourStart DATETIME PRIMARY KEY,
        HourEnd DATETIME,
        HourLabel NVARCHAR(10)
    );
    DECLARE @k INT = 0;
    WHILE @k < 24
    BEGIN
        DECLARE @CurrentHourEnd DATETIME = DATEADD(HOUR, -@k, @AnchorTime);
        DECLARE @CurrentHourStart DATETIME = DATEADD(HOUR, -1, @CurrentHourEnd);
        
        INSERT INTO @HourSeries (HourStart, HourEnd, HourLabel)
        VALUES (
            @CurrentHourStart,
            @CurrentHourEnd,
            FORMAT(@CurrentHourStart, 'HH:mm') 
        );
        SET @k = @k + 1;
    END;

    WITH 
    HourlyPlanned AS (
        SELECT
            h.HourStart,
            CASE 
                WHEN @IsToday = 1 AND h.HourEnd > @AnchorTime THEN DATEDIFF(MINUTE, h.HourStart, @AnchorTime)
                ELSE 60.0 
            END AS PlannedMinutes
        FROM @HourSeries h
    ),
    HourlyDowntime AS (
        SELECT
            h.HourStart,
            ISNULL(SUM(sc.duration), 0) AS DowntimeMinutes 
        FROM @HourSeries h
        LEFT JOIN dbo.STOP_CAUSES sc
            ON sc.stop_begin >= h.HourStart AND sc.stop_begin < h.HourEnd 
            AND (@IsToday = 0 OR sc.stop_end <= @AnchorTime)
            AND (@Line IS NULL OR sc.line = @Line)
            AND (@MachineId IS NULL OR sc.machine_id = @MachineId)
        GROUP BY h.HourStart
    ),
    HourlyProduction AS (
        SELECT 
            h.HourStart,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END), 0) AS GoodCount,
            ISNULL(SUM(t.quantity), 0) AS TotalCount,
            ISNULL(SUM(t.quantity * (60.0 / NULLIF(r.planned_output, 0))), 0) AS IdealRunTimeMinutes
        FROM @HourSeries h
        LEFT JOIN (
            dbo.STOCK_TRANSACTIONS t
            JOIN dbo.LOCATIONS l ON t.to_location_id = l.location_id
            JOIN dbo.MANUFACTURING_ROUTES r ON t.parameter_id = r.item_id AND l.production_line = r.line
        ) 
        ON t.transaction_timestamp >= h.HourStart AND t.transaction_timestamp < h.HourEnd
        AND t.transaction_timestamp <= @AnchorTime 
        AND t.transaction_type LIKE 'PRODUCTION_%' AND r.planned_output > 0
        AND (@Line IS NULL OR l.production_line = @Line)
        AND (@Model IS NULL OR r.model = @Model)
        AND (@MachineId IS NULL OR t.machine_id = @MachineId)
        GROUP BY h.HourStart
    )
    SELECT
        h.HourLabel AS [hour], 
        CAST(ISNULL(a.Availability, 0) AS DECIMAL(5, 1)) AS availability,
        CAST(ISNULL(p.Performance, 0) AS DECIMAL(5, 1)) AS performance,
        CAST(ISNULL(q.Quality, 0) AS DECIMAL(5, 1)) AS quality,
        CAST(ISNULL(a.Availability / 100.0 * p.Performance / 100.0 * q.Quality / 100.0 * 100.0, 0) AS DECIMAL(5, 1)) AS oee
    FROM @HourSeries h
    LEFT JOIN HourlyPlanned hp ON h.HourStart = hp.HourStart
    LEFT JOIN HourlyDowntime hd ON h.HourStart = hd.HourStart
    LEFT JOIN HourlyProduction hprod ON h.HourStart = hprod.HourStart
    CROSS APPLY (
        SELECT 
            (hp.PlannedMinutes - ISNULL(hd.DowntimeMinutes, 0)) AS RunTimeMinutes
    ) rt
    CROSS APPLY (
        SELECT 
            CASE WHEN hp.PlannedMinutes > 0 THEN (rt.RunTimeMinutes / hp.PlannedMinutes) * 100.0 ELSE 0 END AS Availability
    ) a
    CROSS APPLY (
        SELECT 
            CASE WHEN rt.RunTimeMinutes > 0 THEN 
                CASE WHEN (hprod.IdealRunTimeMinutes / rt.RunTimeMinutes) * 100.0 > 100.0 THEN 100.0 
                ELSE (hprod.IdealRunTimeMinutes / rt.RunTimeMinutes) * 100.0 END
            ELSE 0 END AS Performance
    ) p
    CROSS APPLY (
        SELECT 
            CASE WHEN hprod.TotalCount > 0 THEN (hprod.GoodCount / hprod.TotalCount) * 100.0 ELSE 0 END AS Quality
    ) q
    ORDER BY
        h.HourStart ASC;
END
