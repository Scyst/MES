ALTER PROCEDURE [dbo].[sp_GetDailyProductionSummary]
    @StartDate DATE,
    @EndDate DATE,
    @Line NVARCHAR(50) = NULL,
    @Model NVARCHAR(100) = NULL,
    @MachineId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ActualEndDate DATETIME = DATEADD(DAY, 1, @EndDate);

    WITH ActualProduction AS (
        SELECT
            t.transaction_id, t.parameter_id, t.quantity, t.transaction_timestamp, l.production_line
        FROM dbo.STOCK_TRANSACTIONS t
        LEFT JOIN dbo.LOCATIONS l ON t.to_location_id = l.location_id
        WHERE
            t.transaction_type = 'PRODUCTION_FG'
            AND DATEADD(HOUR, -8, t.transaction_timestamp) >= @StartDate
            AND DATEADD(HOUR, -8, t.transaction_timestamp) < @ActualEndDate
            AND (@Line IS NULL OR l.production_line = @Line)
            AND (@MachineId IS NULL OR t.machine_id = @MachineId)
            AND (@Model IS NULL OR EXISTS (
                SELECT 1
                FROM dbo.MANUFACTURING_ROUTES r
                WHERE r.item_id = t.parameter_id AND r.model = @Model AND (@Line IS NULL OR r.line = l.production_line)
            ))
    )
    SELECT
        CAST(DATEADD(HOUR, -8, ap.transaction_timestamp) AS DATE) AS ProductionDate,
        ISNULL(i.part_no, i.sap_no) AS ItemIdentifier,
        SUM(ap.quantity) AS TotalQuantity
    FROM ActualProduction ap
    JOIN dbo.ITEMS i ON ap.parameter_id = i.item_id
    GROUP BY
        CAST(DATEADD(HOUR, -8, ap.transaction_timestamp) AS DATE),
        ISNULL(i.part_no, i.sap_no)
    ORDER BY
        ProductionDate ASC,
        ItemIdentifier ASC;
END
