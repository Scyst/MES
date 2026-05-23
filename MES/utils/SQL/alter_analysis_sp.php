<?php
require_once __DIR__ . '/../../page/db.php';

$sql = "
CREATE OR ALTER PROCEDURE [dbo].[sp_GetIntegratedManpowerAnalysis_TEST]
    @StartDate DATE,
    @EndDate DATE,
    @Line NVARCHAR(50) = 'ALL',
    @HcGroup NVARCHAR(50) = 'ALL'
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @LineFilter NVARCHAR(50) = CASE WHEN @Line = 'ALL' OR @Line = '' THEN NULL ELSE @Line END;
    DECLARE @HcGroupFilter NVARCHAR(50) = CASE WHEN @HcGroup = 'ALL' OR @HcGroup = '' THEN NULL ELSE @HcGroup END;

    -- [LAYER 1] KPI Summary
    SELECT 
        COUNT(DISTINCT L.emp_id) as Total_Unique_HC,
        SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as Total_Present_ManDays,
        SUM(CASE WHEN L.status = 'ABSENT' THEN 1 ELSE 0 END) as Total_Absent_ManDays,
        SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE') THEN 1 ELSE 0 END) as Total_Leave_ManDays,
        
        (SELECT COUNT(*) FROM dbo.MANPOWER_EMPLOYEES_TEST E_New 
         LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS_TEST TS ON E_New.department_api = TS.department_api
         WHERE E_New.start_date BETWEEN @StartDate AND DATEADD(DAY, 1, @EndDate)
           AND (@LineFilter IS NULL OR E_New.line = @LineFilter)
           AND (@HcGroupFilter IS NULL OR TS.hc_group = @HcGroupFilter)) as New_Joiners,
           
        (SELECT COUNT(*) FROM dbo.MANPOWER_EMPLOYEES_TEST E_Res 
         LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS_TEST TS ON E_Res.department_api = TS.department_api
         WHERE E_Res.is_active = 0 
           AND E_Res.resign_date BETWEEN @StartDate AND DATEADD(DAY, 1, @EndDate)
           AND (@LineFilter IS NULL OR E_Res.line = @LineFilter)
           AND (@HcGroupFilter IS NULL OR TS.hc_group = @HcGroupFilter)) as Resigned

    FROM dbo.MANPOWER_DAILY_LOGS_TEST L WITH (NOLOCK)
    LEFT JOIN dbo.MANPOWER_EMPLOYEES_TEST E ON L.emp_id = E.emp_id
    LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS_TEST TS ON E.department_api = TS.department_api
    WHERE L.log_date BETWEEN @StartDate AND @EndDate
      AND (@LineFilter IS NULL OR ISNULL(L.actual_line, E.line) = @LineFilter)
      AND (@HcGroupFilter IS NULL OR TS.hc_group = @HcGroupFilter)
      AND L.status != 'GHOST';

    -- [LAYER 2] Trend Graph
    SELECT 
        L.log_date,
        COUNT(DISTINCT L.emp_id) as Daily_HC,
        SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as Act_Present,
        SUM(CASE WHEN L.status = 'ABSENT' THEN 1 ELSE 0 END) as Act_Absent,
        SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE') THEN 1 ELSE 0 END) as Act_Leave
    FROM dbo.MANPOWER_DAILY_LOGS_TEST L WITH (NOLOCK)
    LEFT JOIN dbo.MANPOWER_EMPLOYEES_TEST E ON L.emp_id = E.emp_id
    LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS_TEST TS ON E.department_api = TS.department_api
    WHERE L.log_date BETWEEN @StartDate AND @EndDate
      AND (@LineFilter IS NULL OR ISNULL(L.actual_line, E.line) = @LineFilter)
      AND (@HcGroupFilter IS NULL OR TS.hc_group = @HcGroupFilter)
    GROUP BY L.log_date ORDER BY L.log_date;

    -- [LAYER 3] Financials (Cost Comparison)
    WITH DateRange(d) AS (
        SELECT @StartDate UNION ALL
        SELECT DATEADD(DAY, 1, d) FROM DateRange WHERE d < @EndDate
    )
    SELECT 
        COALESCE(O.display_section, N.display_section) as section_name,
        SUM(ISNULL(O.Normal_Cost, 0) + ISNULL(O.OT_Cost, 0)) as cost_standard,
        SUM(ISNULL(N.Normal_Cost, 0) + ISNULL(N.OT_Cost, 0)) as cost_actual,
        SUM(ISNULL(N.Normal_Cost, 0)) as actual_dl,
        SUM(ISNULL(N.OT_Cost, 0)) as actual_ot
    FROM DateRange dr
    CROSS APPLY dbo.fn_GetLaborCost_Split(dr.d) O
    CROSS APPLY dbo.fn_GetLaborCost_Split_V2(dr.d) N
    WHERE O.display_section = N.display_section
      AND (@LineFilter IS NULL OR O.display_section = @LineFilter)
      AND (@HcGroupFilter IS NULL OR COALESCE(O.hc_group, N.hc_group, 'MAIN') = @HcGroupFilter)
    GROUP BY COALESCE(O.display_section, N.display_section)
    OPTION (MAXRECURSION 366);

    -- [LAYER 4] Distribution (Pie Chart)
    SELECT 
        ISNULL(CM.category_name, 'Other') as category,
        COUNT(DISTINCT L.emp_id) as head_count,
        SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as work_days
    FROM dbo.MANPOWER_DAILY_LOGS_TEST L WITH (NOLOCK)
    JOIN dbo.MANPOWER_EMPLOYEES_TEST E ON L.emp_id = E.emp_id
    LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS_TEST TS ON E.department_api = TS.department_api
    OUTER APPLY (
        SELECT TOP 1 category_name 
        FROM dbo.MANPOWER_CATEGORY_MAPPING_TEST M 
        WHERE E.position LIKE '%' + M.keyword + '%' 
        ORDER BY LEN(M.keyword) DESC
    ) CM
    WHERE L.log_date BETWEEN @StartDate AND @EndDate
      AND (@LineFilter IS NULL OR ISNULL(L.actual_line, E.line) = @LineFilter)
      AND (@HcGroupFilter IS NULL OR TS.hc_group = @HcGroupFilter)
    GROUP BY ISNULL(CM.category_name, 'Other');
END
";

try {
    $pdo->exec($sql);
    echo "SP Updated successfully!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
