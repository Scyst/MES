CREATE OR ALTER FUNCTION [dbo].[fn_GetManpowerSummary_TEST] 
(
    @ReportDate DATE
)
RETURNS TABLE 
AS
RETURN 
(
    SELECT 
        ISNULL(E.department_api, ISNULL(L.actual_line, E.line)) AS display_section,
        ISNULL(S.shift_name, 'Unknown') AS shift_name,
        ISNULL(L.actual_team, E.team_group) AS team_group,
        COALESCE(CM.category_name, E.position, 'Other') AS category_name,
        ISNULL(CM.rate_type, 'DAILY') AS rate_type,
        ASCII(LEFT(ISNULL(E.department_api, ISNULL(L.actual_line, E.line)), 1)) AS section_id,
        30 AS Divisor_Used,
        0 AS Is_Saturday_Logic,
        ISNULL(TS.hc_group, 'MAIN') AS hc_group,

        COUNT(E.emp_id) AS Master_Headcount,
        SUM(CASE WHEN E.is_active = 1 THEN 1 ELSE 0 END) AS Total_Registered,
        SUM(CASE WHEN L.status = 'PRESENT' THEN 1 ELSE 0 END) AS Count_Present,
        SUM(CASE WHEN L.status = 'LATE' THEN 1 ELSE 0 END) AS Count_Late,
        SUM(CASE WHEN L.status = 'ABSENT' THEN 1 WHEN L.status IS NULL AND @ReportDate < CAST(GETDATE() AS DATE) AND E.is_active = 1 THEN 1 ELSE 0 END) AS Count_Absent,
        SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE') THEN 1 ELSE 0 END) AS Count_Leave,
        SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) AS Count_Actual,
        
        SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN ISNULL(Final_OT.OT_Hours, 0) ELSE 0 END) AS Total_OT_Hours,
        SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') AND ISNULL(Final_OT.OT_Hours, 0) > 0 THEN 1 ELSE 0 END) AS Count_OT,
        
        SUM(CASE 
            WHEN CM.rate_type LIKE 'MONTHLY%' THEN (CASE WHEN L.status IN ('PRESENT', 'LATE', 'SICK', 'VACATION', 'BUSINESS', 'LEAVE') THEN (ISNULL(CM.hourly_rate, 0) / 30.0) ELSE 0 END)
            WHEN CM.rate_type = 'DAILY' AND L.status IN ('PRESENT', 'LATE') THEN (ISNULL(CM.hourly_rate, 0) * 1.0)
            WHEN CM.rate_type = 'DAILY' AND L.status IN ('SICK', 'VACATION') THEN ISNULL(CM.hourly_rate, 0)
            ELSE 0 END
        ) AS Normal_Cost,

        SUM(CASE 
            WHEN CM.rate_type LIKE 'MONTHLY%' AND L.status IN ('PRESENT', 'LATE') THEN 
                (CASE WHEN Cal.calendar_date IS NOT NULL THEN (Rate.Hourly_Base * 8.0 * (ISNULL(Cal.work_rate_holiday, 1.0) - 1.0)) ELSE 0 END) + (ISNULL(Final_OT.OT_Hours, 0) * Rate.Hourly_Base * ISNULL(Cal.ot_rate_holiday, 1.5))
            WHEN CM.rate_type = 'DAILY' AND L.status IN ('PRESENT', 'LATE') THEN 
                (ISNULL(CM.hourly_rate, 0) * (ISNULL(Cal.work_rate_holiday, 1.0) - 1.0)) + (ISNULL(Final_OT.OT_Hours, 0) * Rate.Hourly_Base * Rate.OT_Multiplier)
            ELSE 0 END
        ) AS OT_Cost,
        0 AS Total_Cost

    FROM dbo.MANPOWER_EMPLOYEES_TEST E
    LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS_TEST TS ON E.department_api = TS.department_api
    LEFT JOIN dbo.MANPOWER_DAILY_LOGS_TEST L ON E.emp_id = L.emp_id AND L.log_date = @ReportDate
    LEFT JOIN dbo.MANPOWER_SHIFTS_TEST S ON ISNULL(L.shift_id, E.default_shift_id) = S.shift_id
    OUTER APPLY (SELECT TOP 1 * FROM dbo.MANPOWER_CATEGORY_MAPPING_TEST M WHERE E.position LIKE '%' + M.keyword + '%' ORDER BY LEN(M.keyword) DESC) CM
    LEFT JOIN dbo.MANPOWER_CALENDAR Cal ON @ReportDate = Cal.calendar_date
    CROSS APPLY (
        SELECT CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (ISNULL(CM.hourly_rate, 0) / 30.0) / 8.0 WHEN CM.rate_type = 'DAILY' THEN ISNULL(CM.hourly_rate, 0) / 8.0 ELSE ISNULL(CM.hourly_rate, 0) END AS Hourly_Base,
        CASE WHEN Cal.calendar_date IS NOT NULL THEN ISNULL(Cal.ot_rate_holiday, 3.0) ELSE 1.5 END AS OT_Multiplier
    ) AS Rate
    CROSS APPLY (SELECT CAST(CONCAT(@ReportDate, ' ', S.start_time) AS DATETIME) AS Shift_Start) AS T0
    CROSS APPLY (SELECT CASE WHEN L.scan_out_time IS NOT NULL THEN L.scan_out_time WHEN @ReportDate = CAST(GETDATE() AS DATE) THEN GETDATE() ELSE NULL END AS Calc_End_Time) AS T1
    CROSS APPLY (SELECT DATEDIFF(MINUTE, T0.Shift_Start, T1.Calc_End_Time) AS Total_Minutes) AS T2
    CROSS APPLY (SELECT CASE WHEN T2.Total_Minutes > 570 THEN FLOOR((T2.Total_Minutes - 570) / 30.0) * 0.5 ELSE 0 END AS OT_Hours) AS Final_OT
    
    WHERE E.is_active = 1 AND (L.is_verified = 1 OR L.status IS NULL OR L.status != 'GHOST')
    GROUP BY ISNULL(E.department_api, ISNULL(L.actual_line, E.line)), ISNULL(S.shift_name, 'Unknown'), ISNULL(L.actual_team, E.team_group), COALESCE(CM.category_name, E.position, 'Other'), ISNULL(CM.rate_type, 'DAILY'), ISNULL(TS.hc_group, 'MAIN')
)
GO

CREATE OR ALTER FUNCTION [dbo].[fn_GetManpowerSummary_V2_TEST] 
(
    @ReportDate DATE
)
RETURNS TABLE 
AS
RETURN 
(
    SELECT 
        ISNULL(E.department_api, ISNULL(L.actual_line, E.line)) AS display_section,
        ISNULL(S.shift_name, 'Unknown') AS shift_name,
        ISNULL(L.actual_team, E.team_group) AS team_group,
        COALESCE(CM.category_name, E.position, 'Other') AS category_name,
        ISNULL(CM.rate_type, 'DAILY') AS rate_type,
        ASCII(LEFT(ISNULL(E.department_api, ISNULL(L.actual_line, E.line)), 1)) AS section_id,
        MonthCalc.Divisor AS Divisor_Used,
        CASE WHEN DayCheck.DayOfWeek = 6 THEN 1 ELSE 0 END AS Is_Saturday_Logic,
        ISNULL(TS.hc_group, 'MAIN') AS hc_group,
        COUNT(E.emp_id) AS Master_Headcount,
        SUM(CASE WHEN E.is_active = 1 THEN 1 ELSE 0 END) AS Total_Registered,
        SUM(CASE WHEN L.status = 'PRESENT' THEN 1 ELSE 0 END) AS Count_Present,
        SUM(CASE WHEN L.status = 'LATE' THEN 1 ELSE 0 END) AS Count_Late,
        SUM(CASE WHEN L.status = 'ABSENT' THEN 1 WHEN L.status IS NULL AND @ReportDate < CAST(GETDATE() AS DATE) AND E.is_active = 1 THEN 1 ELSE 0 END) AS Count_Absent,
        SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE') THEN 1 ELSE 0 END) AS Count_Leave,
        SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) AS Count_Actual,
        
        SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN ISNULL(Final_OT.OT_Hours, 0) ELSE 0 END) AS Total_OT_Hours,
        SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') AND ISNULL(Final_OT.OT_Hours, 0) > 0 THEN 1 ELSE 0 END) AS Count_OT,
        
        SUM(CASE 
            WHEN CM.rate_type LIKE 'MONTHLY%' THEN CASE WHEN DayCheck.DayOfWeek IN (6, 0) THEN 0 WHEN Cal.day_type = 'HOLIDAY' THEN 0 WHEN L.status IN ('PRESENT', 'LATE', 'SICK', 'VACATION', 'BUSINESS', 'LEAVE') THEN (ISNULL(CM.hourly_rate, 0) / MonthCalc.Divisor) ELSE 0 END
            WHEN CM.rate_type = 'DAILY' AND L.status IN ('PRESENT', 'LATE') THEN CASE WHEN Cal.day_type IN ('SUNDAY', 'HOLIDAY') THEN 0 ELSE (ISNULL(CM.hourly_rate, 0) * 1.0) END
            WHEN CM.rate_type = 'DAILY' AND L.status IN ('SICK', 'VACATION') THEN ISNULL(CM.hourly_rate, 0) ELSE 0 END
        ) AS Normal_Cost,

        SUM(CASE 
            WHEN CM.rate_type LIKE 'MONTHLY%' AND L.status IN ('PRESENT', 'LATE') THEN (CASE WHEN Cal.day_type IN ('SUNDAY', 'HOLIDAY') THEN (Rate.Hourly_Base * 8.0 * (ISNULL(Cal.work_rate_holiday, 1.0) - 1.0)) ELSE 0 END) + (ISNULL(Final_OT.OT_Hours, 0) * Rate.Hourly_Base * ISNULL(Cal.ot_rate_holiday, 1.5))
            WHEN CM.rate_type = 'DAILY' AND L.status IN ('PRESENT', 'LATE') THEN (ISNULL(CM.hourly_rate, 0) * (ISNULL(Cal.work_rate_holiday, 1.0) - (CASE WHEN Cal.day_type IN ('SUNDAY', 'HOLIDAY') THEN 0 ELSE 1 END))) + (ISNULL(Final_OT.OT_Hours, 0) * Rate.Hourly_Base * Rate.OT_Multiplier)
            ELSE 0 END
        ) AS OT_Cost,
        0 AS Total_Cost
    FROM dbo.MANPOWER_EMPLOYEES_TEST E
    LEFT JOIN dbo.MANPOWER_TEAM_SETTINGS_TEST TS ON E.department_api = TS.department_api
    LEFT JOIN dbo.MANPOWER_DAILY_LOGS_TEST L ON E.emp_id = L.emp_id AND L.log_date = @ReportDate
    LEFT JOIN dbo.MANPOWER_SHIFTS_TEST S ON ISNULL(L.shift_id, E.default_shift_id) = S.shift_id
    OUTER APPLY (SELECT TOP 1 * FROM dbo.MANPOWER_CATEGORY_MAPPING_TEST M WHERE E.position LIKE '%' + M.keyword + '%' ORDER BY LEN(M.keyword) DESC) CM
    LEFT JOIN dbo.MANPOWER_CALENDAR Cal ON @ReportDate = Cal.calendar_date
    CROSS APPLY (SELECT (DATEPART(dw, @ReportDate) + @@DATEFIRST - 1) % 7 AS DayOfWeek) AS DayCheck
    CROSS APPLY (
        SELECT TOP 1 CASE WHEN (COUNT(*) - 1) < 20 THEN 20.0 ELSE CAST((COUNT(*) - 1) AS DECIMAL(18,2)) END AS Divisor
        FROM (SELECT TOP 31 DATEADD(DAY, ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) - 1, DATEFROMPARTS(YEAR(@ReportDate), MONTH(@ReportDate), 1)) AS D FROM sys.objects) DateList
        WHERE MONTH(DateList.D) = MONTH(@ReportDate) AND ((DATEPART(dw, DateList.D) + @@DATEFIRST - 1) % 7) NOT IN (0, 6)
    ) AS MonthCalc
    CROSS APPLY (
   SELECT CASE WHEN CM.rate_type LIKE 'MONTHLY%' THEN (ISNULL(CM.hourly_rate, 0) / 30.0) / 8.0 WHEN CM.rate_type = 'DAILY' THEN ISNULL(CM.hourly_rate, 0) / 8.0 ELSE ISNULL(CM.hourly_rate, 0) END AS Hourly_Base,
        CASE WHEN Cal.calendar_date IS NOT NULL THEN ISNULL(Cal.ot_rate_holiday, 3.0) ELSE 1.5 END AS OT_Multiplier
    ) AS Rate
    CROSS APPLY (SELECT CAST(CONCAT(@ReportDate, ' ', S.start_time) AS DATETIME) AS Shift_Start) AS T0
    CROSS APPLY (SELECT CASE WHEN L.scan_out_time IS NOT NULL THEN L.scan_out_time WHEN @ReportDate = CAST(GETDATE() AS DATE) THEN GETDATE() ELSE NULL END AS Calc_End_Time) AS T1
    CROSS APPLY (SELECT DATEDIFF(MINUTE, T0.Shift_Start, T1.Calc_End_Time) AS Total_Minutes) AS T2
    CROSS APPLY (SELECT CASE WHEN T2.Total_Minutes > 570 THEN FLOOR((T2.Total_Minutes - 570) / 30.0) * 0.5 ELSE 0 END AS OT_Hours) AS Final_OT
    WHERE E.is_active = 1 AND (L.is_verified = 1 OR L.status IS NULL OR L.status != 'GHOST')
    GROUP BY ISNULL(E.department_api, ISNULL(L.actual_line, E.line)), ISNULL(S.shift_name, 'Unknown'), ISNULL(L.actual_team, E.team_group), COALESCE(CM.category_name, E.position, 'Other'), ISNULL(CM.rate_type, 'DAILY'), DayCheck.DayOfWeek, MonthCalc.Divisor, Cal.day_type, Rate.Hourly_Base, Cal.work_rate_holiday, Cal.ot_rate_holiday, ISNULL(TS.hc_group, 'MAIN')
)
GO
