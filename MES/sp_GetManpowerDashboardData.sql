
CREATE   PROCEDURE [dbo].[sp_GetManpowerDashboardData]
    @StartDate DATE,
    @EndDate DATE,
    @UseNewFormula BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.calendar_date as [Date],
        f.section_id,
        f.display_section as [Line],
        f.shift_name as [Shift],
        f.team_group as [Team],
        f.category_name as [Category],
        f.rate_type as [RateType],
        f.hc_group as [HC_Group],
        
        SUM(f.Total_Registered) as [Plan (HC)],
        SUM(f.Count_Present) as [Present],
        SUM(f.Count_Late) as [Late],
        SUM(f.Count_Absent) as [Absent],
        SUM(f.Count_Leave) as [Leave],
        SUM(f.Count_Actual) as [Actual (Present+Late)],
        SUM(f.Count_Present + f.Count_Late + f.Count_Absent + f.Count_Leave) as [Total_Accounted],
        
        SUM(f.Count_OT) as [OT_Headcount],
        SUM(f.Normal_Cost) as [Normal_Cost],
        SUM(f.OT_Cost) as [OT_Cost],
        SUM(f.Normal_Cost + f.OT_Cost) as [Est_Cost],
        SUM(f.Total_OT_Hours) as [OT_Hours]
    FROM dbo.MANPOWER_CALENDAR c WITH (NOLOCK)
    CROSS APPLY (
        SELECT * FROM dbo.fn_GetManpowerSummary(c.calendar_date) WHERE @UseNewFormula = 0
        UNION ALL
        SELECT * FROM dbo.fn_GetManpowerSummary_V2(c.calendar_date) WHERE @UseNewFormula = 1
    ) f
    WHERE c.calendar_date >= @StartDate AND c.calendar_date <= @EndDate
    GROUP BY 
        c.calendar_date, f.section_id, f.display_section, f.shift_name, f.team_group, f.category_name, f.rate_type, f.hc_group
    ORDER BY 
        c.calendar_date DESC, f.section_id ASC, f.shift_name ASC;
END

