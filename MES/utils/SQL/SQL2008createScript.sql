/*************************************************************************************************
 * SETUP SCRIPT FOR IIOT_TOOLBOX TABLES & OBJECTS
 * Target Server: SQL Server 2008 and later
 *
 * Instruction: 
 * 1. Manually select the 'IIOT_TOOLBOX' database in SSMS.
 * 2. Execute this entire script.
 *************************************************************************************************/

-- SECTION 2: TABLE CREATION
PRINT 'SECTION 2: Creating Tables...';

-- Drop existing objects first to ensure a clean setup
IF OBJECT_ID('dbo.vw_LatestPartCounts', 'V') IS NOT NULL DROP VIEW dbo.vw_LatestPartCounts;
IF OBJECT_ID('dbo.vw_DailyPartSummary', 'V') IS NOT NULL DROP VIEW dbo.vw_DailyPartSummary;
IF OBJECT_ID('dbo.vw_StopByMachine', 'V') IS NOT NULL DROP VIEW dbo.vw_StopByMachine;
IF OBJECT_ID('dbo.vw_Stop_Cause_Summary', 'V') IS NOT NULL DROP VIEW dbo.vw_Stop_Cause_Summary;

IF OBJECT_ID('dbo.sp_AddUser', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_AddUser;
IF OBJECT_ID('dbo.sp_CalculateOEE_LineChart', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CalculateOEE_LineChart;
IF OBJECT_ID('dbo.sp_CalculateOEE_PieChart', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CalculateOEE_PieChart;
IF OBJECT_ID('dbo.sp_DeleteSchedule', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_DeleteSchedule;
IF OBJECT_ID('dbo.sp_GetMissingParameters', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetMissingParameters;
IF OBJECT_ID('dbo.sp_GetSchedules', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetSchedules;
IF OBJECT_ID('dbo.sp_SaveSchedule', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_SaveSchedule;
IF OBJECT_ID('dbo.sp_UpdatePlannedOutput', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_UpdatePlannedOutput;

IF OBJECT_ID('dbo.IOT_TOOLBOX_PARTS', 'U') IS NOT NULL DROP TABLE dbo.IOT_TOOLBOX_PARTS;
IF OBJECT_ID('dbo.IOT_TOOLBOX_STOP_CAUSES', 'U') IS NOT NULL DROP TABLE dbo.IOT_TOOLBOX_STOP_CAUSES;
IF OBJECT_ID('dbo.IOT_TOOLBOX_PARAMETER', 'U') IS NOT NULL DROP TABLE dbo.IOT_TOOLBOX_PARAMETER;
IF OBJECT_ID('dbo.IOT_TOOLBOX_LINE_SCHEDULES', 'U') IS NOT NULL DROP TABLE dbo.IOT_TOOLBOX_LINE_SCHEDULES;
IF OBJECT_ID('dbo.WIP_ENTRIES', 'U') IS NOT NULL DROP TABLE dbo.WIP_ENTRIES;
IF OBJECT_ID('dbo.PRODUCT_BOM', 'U') IS NOT NULL DROP TABLE dbo.PRODUCT_BOM;

-- Create Core OEE Tables
CREATE TABLE [dbo].[IOT_TOOLBOX_PARTS]( [id] [int] IDENTITY(1,1) NOT NULL, [log_date] [date] NOT NULL, [log_time] [time](7) NOT NULL, [line] [varchar](50) NOT NULL, [model] [varchar](50) NOT NULL, [part_no] [varchar](50) NOT NULL, [count_value] [int] NOT NULL, [count_type] [varchar](50) NOT NULL, [note] [varchar](max) NULL, [lot_no] [nvarchar](100) NULL, CONSTRAINT [PK_IOT_TOOLBOX_PARTS] PRIMARY KEY CLUSTERED ([id] ASC));
CREATE TABLE [dbo].[IOT_TOOLBOX_STOP_CAUSES]( [id] [int] IDENTITY(1,1) NOT NULL, [log_date] [date] NOT NULL, [stop_begin] [datetime] NOT NULL, [stop_end] [datetime] NOT NULL, [line] [nvarchar](50) NOT NULL, [machine] [nvarchar](50) NOT NULL, [cause] [nvarchar](255) NOT NULL, [note] [nvarchar](255) NOT NULL, [recovered_by] [nvarchar](100) NOT NULL, [duration] AS (datediff(minute,[stop_begin],[stop_end])) PERSISTED, CONSTRAINT [PK_IOT_TOOLBOX_STOP_CAUSES] PRIMARY KEY CLUSTERED ([id] ASC));
CREATE TABLE [dbo].[IOT_TOOLBOX_PARAMETER]( [id] [int] IDENTITY(1,1) NOT NULL, [line] [varchar](50) NOT NULL, [model] [varchar](100) NOT NULL, [part_no] [varchar](100) NOT NULL, [planned_output] [int] NOT NULL, [updated_at] [datetime] NULL, [sap_no] [varchar](100) NULL, CONSTRAINT [PK_IOT_TOOLBOX_PARAMETER] PRIMARY KEY CLUSTERED ([id] ASC), CONSTRAINT [uc_line_model_part_sap] UNIQUE NONCLUSTERED ([line] ASC, [model] ASC, [part_no] ASC, [sap_no] ASC));
CREATE TABLE [dbo].[IOT_TOOLBOX_LINE_SCHEDULES]( [id] [int] IDENTITY(1,1) NOT NULL, [line] [varchar](50) NOT NULL, [shift_name] [varchar](50) NOT NULL, [start_time] [time](7) NOT NULL, [end_time] [time](7) NOT NULL, [planned_break_minutes] [int] NOT NULL, [is_active] [bit] NOT NULL, CONSTRAINT [PK_IOT_TOOLBOX_LINE_SCHEDULES] PRIMARY KEY CLUSTERED ([id] ASC));

-- Create New WIP and BOM Tables
CREATE TABLE [dbo].[WIP_ENTRIES]( [entry_id] [int] IDENTITY(1,1) NOT NULL, [entry_time] [datetime] NOT NULL, [line] [varchar](50) NOT NULL, [lot_no] [nvarchar](100) NULL, [part_no] [varchar](50) NOT NULL, [quantity_in] [int] NOT NULL, [operator] [varchar](100) NOT NULL, [remark] [nvarchar](255) NULL, CONSTRAINT [PK_WIP_ENTRIES] PRIMARY KEY CLUSTERED ([entry_id] ASC));
CREATE TABLE [dbo].[PRODUCT_BOM]( [bom_id] [int] IDENTITY(1,1) NOT NULL, [fg_part_no] [varchar](50) NOT NULL, [component_part_no] [varchar](50) NOT NULL, [quantity_required] [int] NOT NULL, CONSTRAINT [PK_PRODUCT_BOM] PRIMARY KEY CLUSTERED ([bom_id] ASC), CONSTRAINT [UQ_bom_components] UNIQUE NONCLUSTERED ([fg_part_no], [component_part_no]));

-- Create User tables only if they don't exist to preserve data
IF OBJECT_ID('dbo.IOT_TOOLBOX_USER_LOGS', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[IOT_TOOLBOX_USER_LOGS]( [id] [int] IDENTITY(1,1) NOT NULL, [action_by] [varchar](100) NULL, [action_type] [varchar](20) NULL, [target_user] [varchar](100) NULL, [detail] [nvarchar](255) NULL, [created_at] [datetime] NULL, CONSTRAINT [PK_IOT_TOOLBOX_USER_LOGS] PRIMARY KEY CLUSTERED ([id] ASC));
END
IF OBJECT_ID('dbo.IOT_TOOLBOX_USERS', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[IOT_TOOLBOX_USERS]( [id] [int] IDENTITY(1,1) NOT NULL, [username] [varchar](100) NOT NULL, [password] [nvarchar](255) NOT NULL, [role] [varchar](50) NULL, [created_at] [datetime] NULL, CONSTRAINT [PK_IOT_TOOLBOX_USERS] PRIMARY KEY CLUSTERED ([id] ASC), CONSTRAINT [UQ_IOT_TOOLBOX_USERS_username] UNIQUE NONCLUSTERED ([username] ASC));
END
PRINT 'Tables created/updated successfully.';
GO

-- SECTION 3: DEFAULT CONSTRAINTS
PRINT 'SECTION 3: Applying Default Constraints...';
ALTER TABLE [dbo].[IOT_TOOLBOX_PARTS] ADD CONSTRAINT [DF_parts_note] DEFAULT ('-') FOR [note];
ALTER TABLE [dbo].[IOT_TOOLBOX_PARAMETER] ADD CONSTRAINT [DF_parameter_updated_at] DEFAULT (getdate()) FOR [updated_at];
ALTER TABLE [dbo].[IOT_TOOLBOX_USER_LOGS] ADD CONSTRAINT [DF_user_logs_created_at] DEFAULT (getdate()) FOR [created_at];
ALTER TABLE [dbo].[IOT_TOOLBOX_USERS] ADD CONSTRAINT [DF_users_role] DEFAULT ('user') FOR [role];
ALTER TABLE [dbo].[IOT_TOOLBOX_USERS] ADD CONSTRAINT [DF_users_created_at] DEFAULT (getdate()) FOR [created_at];
ALTER TABLE [dbo].[IOT_TOOLBOX_LINE_SCHEDULES] ADD CONSTRAINT [DF_schedules_planned_break] DEFAULT ((0)) FOR [planned_break_minutes];
ALTER TABLE [dbo].[IOT_TOOLBOX_LINE_SCHEDULES] ADD CONSTRAINT [DF_schedules_is_active] DEFAULT ((1)) FOR [is_active];
ALTER TABLE [dbo].[WIP_ENTRIES] ADD CONSTRAINT [DF_WIP_entry_time] DEFAULT (getdate()) FOR [entry_time];
GO
PRINT 'Default Constraints applied successfully.';
GO


-- SECTION 4: INDEXES
PRINT 'SECTION 4: Creating Indexes...';
CREATE NONCLUSTERED INDEX [IX_Parts_HealthCheck] ON [dbo].[IOT_TOOLBOX_PARTS] ([line] ASC, [model] ASC, [part_no] ASC);
CREATE NONCLUSTERED INDEX [idx_parts_part_no] ON [dbo].[IOT_TOOLBOX_PARTS] ([part_no] ASC);
CREATE NONCLUSTERED INDEX [idx_stop_date] ON [dbo].[IOT_TOOLBOX_STOP_CAUSES] ([log_date] ASC);
CREATE NONCLUSTERED INDEX [IX_Parameter_HealthCheck] ON [dbo].[IOT_TOOLBOX_PARAMETER] ([line] ASC, [model] ASC, [part_no] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UQ_line_shift] ON [dbo].[IOT_TOOLBOX_LINE_SCHEDULES] ([line] ASC, [shift_name] ASC);
CREATE NONCLUSTERED INDEX [IX_WIP_Entries_Lookup] ON [dbo].[WIP_ENTRIES] ([part_no] ASC, [line] ASC);
CREATE NONCLUSTERED INDEX [IX_BOM_Lookup] ON [dbo].[PRODUCT_BOM] ([fg_part_no] ASC);
GO
PRINT 'Indexes created successfully.';
GO


-- SECTION 5: VIEWS
PRINT 'SECTION 5: Creating Views...';
CREATE VIEW [dbo].[vw_LatestPartCounts] AS SELECT line, model, part_no, MAX(log_date) AS last_date, SUM(CASE WHEN count_type = 'FG' THEN count_value ELSE 0 END) AS FG, SUM(CASE WHEN count_type = 'NG' THEN count_value ELSE 0 END) AS NG FROM dbo.IOT_TOOLBOX_PARTS GROUP BY line, model, part_no;
GO
CREATE VIEW [dbo].[vw_DailyPartSummary] AS SELECT log_date, model, part_no, count_type, SUM(count_value) AS total_count FROM dbo.IOT_TOOLBOX_PARTS GROUP BY log_date, model, part_no, count_type;
GO
CREATE VIEW [dbo].[vw_StopByMachine] AS SELECT line, machine, COUNT(*) AS stop_count, SUM(duration) AS total_minutes FROM dbo.IOT_TOOLBOX_STOP_CAUSES GROUP BY line, machine;
GO
CREATE VIEW [dbo].[vw_Stop_Cause_Summary] AS SELECT log_date, line, machine, cause, SUM(DATEDIFF(MINUTE, stop_begin, stop_end)) AS total_minutes FROM dbo.IOT_TOOLBOX_STOP_CAUSES GROUP BY log_date, line, machine, cause;
GO
PRINT 'Views created successfully.';
GO


-- SECTION 6: STORED PROCEDURES
PRINT 'SECTION 6: Creating Stored Procedures...';
EXEC('CREATE PROCEDURE [dbo].[sp_AddUser] @username VARCHAR(100), @password NVARCHAR(255), @role VARCHAR(50) = ''user'' AS BEGIN SET NOCOUNT ON; INSERT INTO IOT_TOOLBOX_USERS (username, password, role, created_at) VALUES (@username, @password, @role, GETDATE()); END');
GO
EXEC('CREATE PROCEDURE [dbo].[sp_CalculateOEE_LineChart] @StartDate DATE, @EndDate DATE, @Line VARCHAR(50) = NULL, @Model VARCHAR(50) = NULL AS BEGIN SET NOCOUNT ON; DECLARE @DateSeries TABLE (LogDate DATE PRIMARY KEY); DECLARE @CurrentDate DATE = @StartDate; WHILE @CurrentDate <= @EndDate BEGIN INSERT INTO @DateSeries (LogDate) VALUES (@CurrentDate); SET @CurrentDate = DATEADD(DAY, 1, @CurrentDate); END; WITH DailyPlannedTime AS (SELECT aps.log_date AS LogDate, ISNULL(SUM(CASE WHEN s.end_time >= s.start_time THEN DATEDIFF(MINUTE, s.start_time, s.end_time) ELSE DATEDIFF(MINUTE, s.start_time, s.end_time) + 1440 END - s.planned_break_minutes), 0) AS PlannedMinutes FROM (SELECT DISTINCT p.log_date, s.id AS schedule_id FROM dbo.IOT_TOOLBOX_PARTS p JOIN dbo.IOT_TOOLBOX_LINE_SCHEDULES s ON p.line = s.line AND s.is_active = 1 WHERE p.log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR p.line = @Line) AND ((s.start_time <= s.end_time AND p.log_time BETWEEN s.start_time AND s.end_time) OR (s.start_time > s.end_time AND (p.log_time >= s.start_time OR p.log_time < s.end_time)))) aps JOIN dbo.IOT_TOOLBOX_LINE_SCHEDULES s ON aps.schedule_id = s.id GROUP BY aps.log_date), DailyDowntime AS (SELECT log_date, ISNULL(SUM(DATEDIFF(MINUTE, stop_begin, stop_end)), 0) AS DowntimeMinutes FROM dbo.IOT_TOOLBOX_STOP_CAUSES WHERE log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR line = @Line) GROUP BY log_date), DailyProduction AS (SELECT p.log_date, SUM(CASE WHEN p.count_type = ''FG'' THEN p.count_value ELSE 0 END) AS TotalFG, SUM(CASE WHEN p.count_type <> ''FG'' THEN p.count_value ELSE 0 END) AS TotalDefects, SUM(p.count_value * (60.0 / NULLIF(param.planned_output, 0))) AS TheoreticalMinutes FROM dbo.IOT_TOOLBOX_PARTS p JOIN dbo.IOT_TOOLBOX_PARAMETER param ON p.line = param.line AND p.model = param.model AND p.part_no = param.part_no WHERE p.log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR p.line = @Line) AND (@Model IS NULL OR p.model = @Model) AND param.planned_output > 0 GROUP BY p.log_date) SELECT d.LogDate AS [date], CAST(ISNULL((dp.TotalFG * 100.0) / NULLIF(dp.TotalFG + dp.TotalDefects, 0), 0) AS DECIMAL(5,1)) AS quality, CAST(ISNULL(((ISNULL(dpt.PlannedMinutes, 0) - ISNULL(dd.DowntimeMinutes, 0)) * 100.0) / NULLIF(dpt.PlannedMinutes, 0), 0) AS DECIMAL(5,1)) AS availability, CAST(ISNULL((dp.TheoreticalMinutes * 100.0) / NULLIF(ISNULL(dpt.PlannedMinutes, 0) - ISNULL(dd.DowntimeMinutes, 0), 0), 0) AS DECIMAL(5,1)) AS performance, CAST(ISNULL((((ISNULL(dpt.PlannedMinutes, 0) - ISNULL(dd.DowntimeMinutes, 0)) * 1.0) / NULLIF(dpt.PlannedMinutes, 0)) * ((dp.TheoreticalMinutes * 1.0) / NULLIF(ISNULL(dpt.PlannedMinutes, 0) - ISNULL(dd.DowntimeMinutes, 0), 0)) * ((dp.TotalFG * 1.0) / NULLIF(dp.TotalFG + dp.TotalDefects, 0)) * 100, 0) AS DECIMAL(5,1)) AS oee FROM @DateSeries d LEFT JOIN DailyPlannedTime dpt ON d.LogDate = dpt.LogDate LEFT JOIN DailyDowntime dd ON d.LogDate = dd.log_date LEFT JOIN DailyProduction dp ON d.LogDate = dp.log_date ORDER BY d.LogDate ASC; END');
GO
EXEC('CREATE PROCEDURE [dbo].[sp_CalculateOEE_PieChart] @StartDate DATE, @EndDate DATE, @Line VARCHAR(50) = NULL, @Model VARCHAR(50) = NULL AS BEGIN SET NOCOUNT ON; DECLARE @TotalPlannedMinutes INT; WITH ActualProductionShifts AS (SELECT DISTINCT p.log_date, s.id AS schedule_id FROM dbo.IOT_TOOLBOX_PARTS p JOIN dbo.IOT_TOOLBOX_LINE_SCHEDULES s ON p.line = s.line AND s.is_active = 1 WHERE p.log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR p.line = @Line) AND ((s.start_time <= s.end_time AND p.log_time BETWEEN s.start_time AND s.end_time) OR (s.start_time > s.end_time AND (p.log_time >= s.start_time OR p.log_time < s.end_time)))) SELECT @TotalPlannedMinutes = ISNULL(SUM(CASE WHEN s.end_time >= s.start_time THEN DATEDIFF(MINUTE, s.start_time, s.end_time) ELSE DATEDIFF(MINUTE, s.start_time, s.end_time) + 1440 END - s.planned_break_minutes), 0) FROM ActualProductionShifts aps JOIN dbo.IOT_TOOLBOX_LINE_SCHEDULES s ON aps.schedule_id = s.id; IF @TotalPlannedMinutes IS NULL OR @TotalPlannedMinutes = 0 BEGIN SELECT Quality = 0.0, Availability = 0.0, Performance = 0.0, OEE = 0.0, FG = 0, Defects = 0, NG = 0, Rework = 0, Hold = 0, Scrap = 0, Etc = 0, Runtime = 0, PlannedTime = 0, Downtime = 0, ActualOutput = 0, TotalTheoreticalMinutes = 0.0; RETURN; END; DECLARE @TotalDowntimeMinutes INT; SELECT @TotalDowntimeMinutes = ISNULL(SUM(DATEDIFF(MINUTE, stop_begin, stop_end)), 0) FROM dbo.IOT_TOOLBOX_STOP_CAUSES WHERE log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR line = @Line); DECLARE @TotalRuntimeMinutes INT; SET @TotalRuntimeMinutes = @TotalPlannedMinutes - @TotalDowntimeMinutes; IF @TotalRuntimeMinutes < 0 SET @TotalRuntimeMinutes = 0; DECLARE @TotalFG INT, @TotalDefects INT, @TotalActualOutput INT, @TotalTheoreticalMinutes DECIMAL(18, 4); DECLARE @TotalNG INT, @TotalREWORK INT, @TotalHOLD INT, @TotalSCRAP INT, @TotalETC INT; SELECT @TotalFG = ISNULL(SUM(CASE WHEN p.count_type = ''FG'' THEN p.count_value ELSE 0 END), 0), @TotalNG = ISNULL(SUM(CASE WHEN p.count_type = ''NG'' THEN p.count_value ELSE 0 END), 0), @TotalREWORK = ISNULL(SUM(CASE WHEN p.count_type = ''REWORK'' THEN p.count_value ELSE 0 END), 0), @TotalHOLD = ISNULL(SUM(CASE WHEN p.count_type = ''HOLD'' THEN p.count_value ELSE 0 END), 0), @TotalSCRAP = ISNULL(SUM(CASE WHEN p.count_type = ''SCRAP'' THEN p.count_value ELSE 0 END), 0), @TotalETC = ISNULL(SUM(CASE WHEN p.count_type = ''ETC.'' THEN p.count_value ELSE 0 END), 0), @TotalTheoreticalMinutes = ISNULL(SUM(p.count_value * (60.0 / NULLIF(param.planned_output, 0))), 0) FROM dbo.IOT_TOOLBOX_PARTS p JOIN dbo.IOT_TOOLBOX_PARAMETER param ON p.line = param.line AND p.model = param.model AND p.part_no = param.part_no WHERE p.log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR p.line = @Line) AND (@Model IS NULL OR p.model = @Model) AND param.planned_output > 0; SET @TotalDefects = @TotalNG + @TotalREWORK + @TotalHOLD + @TotalSCRAP + @TotalETC; SET @TotalActualOutput = @TotalFG + @TotalDefects; SELECT Quality = CAST(ISNULL((@TotalFG * 100.0) / NULLIF(@TotalActualOutput, 0), 0) AS DECIMAL(5,1)), Availability = CAST(ISNULL((@TotalRuntimeMinutes * 100.0) / NULLIF(@TotalPlannedMinutes, 0), 0) AS DECIMAL(5,1)), Performance = CAST(ISNULL((@TotalTheoreticalMinutes * 100.0) / NULLIF(@TotalRuntimeMinutes, 0), 0) AS DECIMAL(5,1)), OEE = CAST(ISNULL((((@TotalRuntimeMinutes * 1.0) / NULLIF(@TotalPlannedMinutes, 0)) * ((@TotalTheoreticalMinutes * 1.0) / NULLIF(@TotalRuntimeMinutes, 0)) * ((@TotalFG * 1.0) / NULLIF(@TotalActualOutput, 0))) * 100, 0) AS DECIMAL(5,1)), FG = @TotalFG, Defects = @TotalDefects, NG = @TotalNG, Rework = @TotalREWORK, Hold = @TotalHOLD, Scrap = @TotalSCRAP, Etc = @TotalETC, Runtime = @TotalRuntimeMinutes, PlannedTime = @TotalPlannedMinutes, Downtime = @TotalDowntimeMinutes, ActualOutput = @TotalActualOutput, TotalTheoreticalMinutes = CAST(@TotalTheoreticalMinutes AS DECIMAL(18,2)); END');
GO
EXEC('CREATE PROCEDURE [dbo].[sp_DeleteSchedule] @id INT AS BEGIN SET NOCOUNT ON; DELETE FROM dbo.IOT_TOOLBOX_LINE_SCHEDULES WHERE id = @id; END');
GO
EXEC('CREATE PROCEDURE [dbo].[sp_GetMissingParameters] AS BEGIN SET NOCOUNT ON; ;WITH DistinctPartsToCheck AS (SELECT DISTINCT line, model, part_no FROM dbo.IOT_TOOLBOX_PARTS) SELECT p.line, p.model, p.part_no FROM DistinctPartsToCheck p WHERE NOT EXISTS (SELECT 1 FROM dbo.IOT_TOOLBOX_PARAMETER param WHERE param.line = p.line AND param.model = p.model AND param.part_no = p.part_no) ORDER BY p.line, p.model, p.part_no; END');
GO
EXEC('CREATE PROCEDURE [dbo].[sp_GetSchedules] AS BEGIN SET NOCOUNT ON; SELECT id, line, shift_name, CONVERT(VARCHAR(8), start_time, 108) AS start_time, CONVERT(VARCHAR(8), end_time, 108) AS end_time, planned_break_minutes, is_active FROM dbo.IOT_TOOLBOX_LINE_SCHEDULES ORDER BY line, shift_name; END');
GO
EXEC('CREATE PROCEDURE [dbo].[sp_SaveSchedule] @id INT, @line VARCHAR(50), @shift_name VARCHAR(50), @start_time TIME, @end_time TIME, @planned_break_minutes INT, @is_active BIT AS BEGIN SET NOCOUNT ON; IF @id = 0 BEGIN INSERT INTO dbo.IOT_TOOLBOX_LINE_SCHEDULES (line, shift_name, start_time, end_time, planned_break_minutes, is_active) VALUES (@line, @shift_name, @start_time, @end_time, @planned_break_minutes, @is_active); END ELSE BEGIN UPDATE dbo.IOT_TOOLBOX_LINE_SCHEDULES SET line = @line, shift_name = @shift_name, start_time = @start_time, end_time = @end_time, planned_break_minutes = @planned_break_minutes, is_active = @is_active WHERE id = @id; END END');
GO
EXEC('CREATE PROCEDURE [dbo].[sp_UpdatePlannedOutput] @id INT, @planned_output INT AS BEGIN SET NOCOUNT ON; UPDATE IOT_TOOLBOX_PARAMETER SET planned_output = @planned_output, updated_at = GETDATE() WHERE id = @id; END');
GO
PRINT 'Stored Procedures created successfully.';
GO


-- SECTION 7: TRIGGERS
PRINT 'SECTION 7: Creating Triggers...';
GO
EXEC('CREATE TRIGGER [dbo].[trg_UppercasePara] ON [dbo].[IOT_TOOLBOX_PARAMETER] INSTEAD OF INSERT AS BEGIN SET NOCOUNT ON; INSERT INTO IOT_TOOLBOX_PARAMETER (line, model, part_no, planned_output, updated_at, sap_no) SELECT UPPER(line), UPPER(model), UPPER(part_no), planned_output, updated_at, UPPER(sap_no) FROM inserted; END');
GO
ALTER TABLE [dbo].[IOT_TOOLBOX_PARAMETER] ENABLE TRIGGER [trg_UppercasePara];
GO
EXEC('CREATE TRIGGER [dbo].[trg_UppercaseParts] ON [dbo].[IOT_TOOLBOX_PARTS] INSTEAD OF INSERT AS BEGIN SET NOCOUNT ON; INSERT INTO IOT_TOOLBOX_PARTS (log_date, log_time, model, line, part_no, lot_no, count_type, count_value, note) SELECT log_date, log_time, UPPER(model), UPPER(line), UPPER(part_no), lot_no, UPPER(count_type), count_value, note FROM inserted; END');
GO
ALTER TABLE [dbo].[IOT_TOOLBOX_PARTS] ENABLE TRIGGER [trg_UppercaseParts];
GO
EXEC('CREATE TRIGGER [dbo].[trg_UppercaseStop] ON [dbo].[IOT_TOOLBOX_STOP_CAUSES] INSTEAD OF INSERT AS BEGIN SET NOCOUNT ON; INSERT INTO IOT_TOOLBOX_STOP_CAUSES (log_date, stop_begin, stop_end, line, machine, cause, note, recovered_by) SELECT log_date, stop_begin, stop_end, UPPER(line), UPPER(machine), cause, note, recovered_by FROM inserted; END');
GO
ALTER TABLE [dbo].[IOT_TOOLBOX_STOP_CAUSES] ENABLE TRIGGER [trg_UppercaseStop];
GO
PRINT 'Triggers created and enabled successfully.';
GO


-- SECTION 8: SEED INITIAL DATA
PRINT 'SECTION 8: Seeding initial data for IOT_TOOLBOX_LINE_SCHEDULES...';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.IOT_TOOLBOX_LINE_SCHEDULES WHERE line = 'ASSEMBLY' AND shift_name = 'DAY')
        INSERT INTO dbo.IOT_TOOLBOX_LINE_SCHEDULES (line, shift_name, start_time, end_time, planned_break_minutes, is_active) VALUES (UPPER('Assembly'), UPPER('Day'), '08:00:00', '20:00:00', 90, 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.IOT_TOOLBOX_LINE_SCHEDULES WHERE line = 'ASSEMBLY' AND shift_name = 'NIGHT')
        INSERT INTO dbo.IOT_TOOLBOX_LINE_SCHEDULES (line, shift_name, start_time, end_time, planned_break_minutes, is_active) VALUES (UPPER('Assembly'), UPPER('Night'), '20:00:00', '08:00:00', 90, 1);
    -- (Add other lines as needed)
END
GO
PRINT 'IOT_TOOLBOX_LINE_SCHEDULES data seeded successfully.';
GO

-- SECTION 9: FINALIZATION
PRINT 'Database script execution completed successfully.';
GO