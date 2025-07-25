USE [master]
GO
/****** Object:  Database [IIOT_TOOLBOX]    Script Date: 25/7/2568 11:00:42 ******/
CREATE DATABASE [IIOT_TOOLBOX]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'IIOT_TOOLBOX', FILENAME = N'D:\DB_IIOT_TOOLBOX\DATA\IIOT_TOOLBOX.mdf' , SIZE = 8192KB , MAXSIZE = UNLIMITED, FILEGROWTH = 65536KB )
 LOG ON 
( NAME = N'IIOT_TOOLBOX_log', FILENAME = N'D:\DB_IIOT_TOOLBOX\LOG\IIOT_TOOLBOX_log.ldf' , SIZE = 8192KB , MAXSIZE = 2048GB , FILEGROWTH = 65536KB )
GO
ALTER DATABASE [IIOT_TOOLBOX] SET COMPATIBILITY_LEVEL = 130
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [IIOT_TOOLBOX].[dbo].[sp_fulltext_database] @action = 'enable'
end
GO
ALTER DATABASE [IIOT_TOOLBOX] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET ARITHABORT OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET AUTO_CLOSE OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET  DISABLE_BROKER 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET READ_COMMITTED_SNAPSHOT OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET RECOVERY SIMPLE 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET  MULTI_USER 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [IIOT_TOOLBOX] SET DB_CHAINING OFF 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET TARGET_RECOVERY_TIME = 60 SECONDS 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [IIOT_TOOLBOX] SET QUERY_STORE = OFF
GO
USE [IIOT_TOOLBOX]
GO
ALTER DATABASE SCOPED CONFIGURATION SET LEGACY_CARDINALITY_ESTIMATION = OFF;
GO
ALTER DATABASE SCOPED CONFIGURATION SET MAXDOP = 0;
GO
ALTER DATABASE SCOPED CONFIGURATION SET PARAMETER_SNIFFING = ON;
GO
ALTER DATABASE SCOPED CONFIGURATION SET QUERY_OPTIMIZER_HOTFIXES = OFF;
GO
USE [IIOT_TOOLBOX]
GO
/****** Object:  User [TOOLBOX]    Script Date: 25/7/2568 11:00:42 ******/
CREATE USER [TOOLBOX] FOR LOGIN [TOOLBOX] WITH DEFAULT_SCHEMA=[dbo]
GO
ALTER ROLE [db_owner] ADD MEMBER [TOOLBOX]
GO
/****** Object:  Table [dbo].[PARTS]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PARTS](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[log_date] [date] NOT NULL,
	[log_time] [time](7) NOT NULL,
	[line] [varchar](50) NOT NULL,
	[model] [varchar](50) NOT NULL,
	[part_no] [varchar](50) NOT NULL,
	[count_value] [int] NOT NULL,
	[count_type] [varchar](50) NOT NULL,
	[note] [varchar](max) NULL,
	[lot_no] [nvarchar](100) NULL,
	[source_transaction_id] [varchar](255) NULL,
	[start_time] [time](7) NULL,
 CONSTRAINT [PK_IOT_TOOLBOX_PARTS] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_LatestPartCounts]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_LatestPartCounts] AS SELECT line, model, part_no, MAX(log_date) AS last_date, SUM(CASE WHEN count_type = 'FG' THEN count_value ELSE 0 END) AS FG, SUM(CASE WHEN count_type = 'NG' THEN count_value ELSE 0 END) AS NG FROM dbo.PARTS GROUP BY line, model, part_no;
GO
/****** Object:  View [dbo].[vw_DailyPartSummary]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_DailyPartSummary] AS SELECT log_date, model, part_no, count_type, SUM(count_value) AS total_count FROM dbo.PARTS GROUP BY log_date, model, part_no, count_type;
GO
/****** Object:  Table [dbo].[STOP_CAUSES]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[STOP_CAUSES](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[log_date] [date] NOT NULL,
	[stop_begin] [datetime] NOT NULL,
	[stop_end] [datetime] NOT NULL,
	[line] [nvarchar](50) NOT NULL,
	[machine] [nvarchar](50) NOT NULL,
	[cause] [nvarchar](255) NOT NULL,
	[note] [nvarchar](255) NOT NULL,
	[recovered_by] [nvarchar](100) NOT NULL,
	[duration]  AS (datediff(minute,[stop_begin],[stop_end])) PERSISTED,
 CONSTRAINT [PK_IOT_TOOLBOX_STOP_CAUSES] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_StopByMachine]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_StopByMachine] AS SELECT line, machine, COUNT(*) AS stop_count, SUM(duration) AS total_minutes FROM dbo.STOP_CAUSES GROUP BY line, machine;
GO
/****** Object:  View [dbo].[vw_Stop_Cause_Summary]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_Stop_Cause_Summary] AS SELECT log_date, line, machine, cause, SUM(DATEDIFF(MINUTE, stop_begin, stop_end)) AS total_minutes FROM dbo.STOP_CAUSES GROUP BY log_date, line, machine, cause;
GO
/****** Object:  Table [dbo].[LINE_SCHEDULES]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LINE_SCHEDULES](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[line] [varchar](50) NOT NULL,
	[shift_name] [varchar](50) NOT NULL,
	[start_time] [time](7) NOT NULL,
	[end_time] [time](7) NOT NULL,
	[planned_break_minutes] [int] NOT NULL,
	[is_active] [bit] NOT NULL,
 CONSTRAINT [PK_IOT_TOOLBOX_LINE_SCHEDULES] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PARAMETER]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PARAMETER](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[line] [varchar](50) NOT NULL,
	[model] [varchar](100) NOT NULL,
	[part_no] [varchar](100) NOT NULL,
	[planned_output] [int] NOT NULL,
	[updated_at] [datetime] NULL,
	[sap_no] [varchar](100) NULL,
	[part_description] [nvarchar](255) NULL,
 CONSTRAINT [PK_IOT_TOOLBOX_PARAMETER] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [uc_line_model_part_sap] UNIQUE NONCLUSTERED 
(
	[line] ASC,
	[model] ASC,
	[part_no] ASC,
	[sap_no] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PARAMETER_TEST]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PARAMETER_TEST](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[line] [varchar](50) NOT NULL,
	[model] [varchar](100) NOT NULL,
	[part_no] [varchar](100) NOT NULL,
	[planned_output] [int] NOT NULL,
	[updated_at] [datetime] NULL,
	[sap_no] [varchar](100) NULL,
	[part_description] [nvarchar](255) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PRODUCT_BOM]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PRODUCT_BOM](
	[bom_id] [int] IDENTITY(1,1) NOT NULL,
	[fg_part_no] [varchar](50) NOT NULL,
	[component_part_no] [varchar](50) NOT NULL,
	[quantity_required] [int] NOT NULL,
	[updated_by] [varchar](100) NULL,
	[updated_at] [datetime] NULL,
	[line] [varchar](50) NOT NULL,
	[model] [varchar](100) NOT NULL,
 CONSTRAINT [PK_PRODUCT_BOM] PRIMARY KEY CLUSTERED 
(
	[bom_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [UQ_bom_unique_component] UNIQUE NONCLUSTERED 
(
	[fg_part_no] ASC,
	[line] ASC,
	[model] ASC,
	[component_part_no] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PRODUCT_BOM_TEST]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PRODUCT_BOM_TEST](
	[bom_id] [int] IDENTITY(1,1) NOT NULL,
	[fg_part_no] [varchar](50) NOT NULL,
	[component_part_no] [varchar](50) NOT NULL,
	[quantity_required] [int] NOT NULL,
	[updated_by] [varchar](100) NULL,
	[updated_at] [datetime] NULL,
	[line] [varchar](50) NOT NULL,
	[model] [varchar](100) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[USER_LOGS]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[USER_LOGS](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[action_by] [varchar](100) NULL,
	[action_type] [varchar](20) NULL,
	[target_user] [varchar](100) NULL,
	[detail] [nvarchar](255) NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK_IOT_TOOLBOX_USER_LOGS] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[USER_LOGS_CLONED]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[USER_LOGS_CLONED](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[action_by] [varchar](100) NULL,
	[action_type] [varchar](50) NULL,
	[target_user] [varchar](100) NULL,
	[detail] [nvarchar](500) NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK_USER_LOGS_CLONED] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[USERS]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[USERS](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[username] [varchar](100) NOT NULL,
	[password] [nvarchar](255) NOT NULL,
	[role] [varchar](50) NULL,
	[created_at] [datetime] NULL,
	[line] [varchar](50) NULL,
 CONSTRAINT [PK_IOT_TOOLBOX_USERS] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [UQ_IOT_TOOLBOX_USERS_username] UNIQUE NONCLUSTERED 
(
	[username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[WIP_ENTRIES]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[WIP_ENTRIES](
	[entry_id] [int] IDENTITY(1,1) NOT NULL,
	[entry_time] [datetime] NOT NULL,
	[line] [varchar](50) NOT NULL,
	[lot_no] [nvarchar](100) NULL,
	[part_no] [varchar](50) NOT NULL,
	[quantity_in] [int] NOT NULL,
	[operator] [varchar](100) NOT NULL,
	[remark] [nvarchar](255) NULL,
	[model] [varchar](50) NULL,
 CONSTRAINT [PK_WIP_ENTRIES] PRIMARY KEY CLUSTERED 
(
	[entry_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_line_shift]    Script Date: 25/7/2568 11:00:42 ******/
CREATE UNIQUE NONCLUSTERED INDEX [UQ_line_shift] ON [dbo].[LINE_SCHEDULES]
(
	[line] ASC,
	[shift_name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Parameter_HealthCheck]    Script Date: 25/7/2568 11:00:42 ******/
CREATE NONCLUSTERED INDEX [IX_Parameter_HealthCheck] ON [dbo].[PARAMETER]
(
	[line] ASC,
	[model] ASC,
	[part_no] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_parts_part_no]    Script Date: 25/7/2568 11:00:42 ******/
CREATE NONCLUSTERED INDEX [idx_parts_part_no] ON [dbo].[PARTS]
(
	[part_no] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Parts_HealthCheck]    Script Date: 25/7/2568 11:00:42 ******/
CREATE NONCLUSTERED INDEX [IX_Parts_HealthCheck] ON [dbo].[PARTS]
(
	[line] ASC,
	[model] ASC,
	[part_no] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_BOM_Lookup]    Script Date: 25/7/2568 11:00:42 ******/
CREATE NONCLUSTERED INDEX [IX_BOM_Lookup] ON [dbo].[PRODUCT_BOM]
(
	[fg_part_no] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO
/****** Object:  Index [idx_stop_date]    Script Date: 25/7/2568 11:00:42 ******/
CREATE NONCLUSTERED INDEX [idx_stop_date] ON [dbo].[STOP_CAUSES]
(
	[log_date] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_WIP_Entries_Lookup]    Script Date: 25/7/2568 11:00:42 ******/
CREATE NONCLUSTERED INDEX [IX_WIP_Entries_Lookup] ON [dbo].[WIP_ENTRIES]
(
	[part_no] ASC,
	[line] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO
ALTER TABLE [dbo].[LINE_SCHEDULES] ADD  CONSTRAINT [DF_schedules_planned_break]  DEFAULT ((0)) FOR [planned_break_minutes]
GO
ALTER TABLE [dbo].[LINE_SCHEDULES] ADD  CONSTRAINT [DF_schedules_is_active]  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[PARAMETER] ADD  CONSTRAINT [DF_parameter_updated_at]  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[PARTS] ADD  CONSTRAINT [DF_parts_note]  DEFAULT ('-') FOR [note]
GO
ALTER TABLE [dbo].[PRODUCT_BOM] ADD  DEFAULT ('DEFAULT') FOR [line]
GO
ALTER TABLE [dbo].[PRODUCT_BOM] ADD  DEFAULT ('DEFAULT') FOR [model]
GO
ALTER TABLE [dbo].[USER_LOGS] ADD  CONSTRAINT [DF_user_logs_created_at]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[USER_LOGS_CLONED] ADD  CONSTRAINT [DF_user_logs_cloned_created_at]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[USERS] ADD  CONSTRAINT [DF_users_role]  DEFAULT ('user') FOR [role]
GO
ALTER TABLE [dbo].[USERS] ADD  CONSTRAINT [DF_users_created_at]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[WIP_ENTRIES] ADD  CONSTRAINT [DF_WIP_entry_time]  DEFAULT (getdate()) FOR [entry_time]
GO
/****** Object:  StoredProcedure [dbo].[sp_AddUser]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[sp_AddUser] @username VARCHAR(100), @password NVARCHAR(255), @role VARCHAR(50) = 'user' AS BEGIN SET NOCOUNT ON; INSERT INTO USERS (username, password, role, created_at) VALUES (@username, @password, @role, GETDATE()); END
GO
/****** Object:  StoredProcedure [dbo].[sp_CalculateOEE_LineChart]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      <Author,,Name>
-- Create date: <Create Date,,>
-- Description: Calculates daily OEE for line chart. Caps Performance at 100%.
-- =============================================
CREATE PROCEDURE [dbo].[sp_CalculateOEE_LineChart]
    @StartDate DATE,
    @EndDate DATE,
    @Line VARCHAR(50) = NULL,
    @Model VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Create Date Series (เหมือนเดิม)
    DECLARE @DateSeries TABLE (LogDate DATE PRIMARY KEY);
    DECLARE @CurrentDate DATE = @StartDate;
    WHILE @CurrentDate <= @EndDate BEGIN
        INSERT INTO @DateSeries (LogDate) VALUES (@CurrentDate);
        SET @CurrentDate = DATEADD(DAY, 1, @CurrentDate);
    END;

    -- 2. CTEs for daily data (เหมือนเดิม)
    WITH DailyPlannedTime AS (
        SELECT aps.log_date AS LogDate, 
               ISNULL(SUM(CASE WHEN s.end_time >= s.start_time THEN DATEDIFF(MINUTE, s.start_time, s.end_time) ELSE DATEDIFF(MINUTE, s.start_time, s.end_time) + 1440 END - s.planned_break_minutes), 0) AS PlannedMinutes 
        FROM (
            SELECT DISTINCT p.log_date, s.id AS schedule_id 
            FROM dbo.PARTS p JOIN dbo.LINE_SCHEDULES s ON p.line = s.line AND s.is_active = 1 
            WHERE p.log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR p.line = @Line)
            AND ((s.start_time <= s.end_time AND p.log_time BETWEEN s.start_time AND s.end_time) OR (s.start_time > s.end_time AND (p.log_time >= s.start_time OR p.log_time < s.end_time)))
        ) aps 
        JOIN dbo.LINE_SCHEDULES s ON aps.schedule_id = s.id 
        GROUP BY aps.log_date
    ), 
    DailyDowntime AS (
        SELECT log_date, ISNULL(SUM(DATEDIFF(MINUTE, stop_begin, stop_end)), 0) AS DowntimeMinutes 
        FROM dbo.STOP_CAUSES 
        WHERE log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR line = @Line) 
        GROUP BY log_date
    ), 
    DailyProduction AS (
        SELECT 
            p.log_date,
            SUM(CASE WHEN p.count_type = 'FG' THEN p.count_value ELSE 0 END) AS TotalFG,
            SUM(CASE WHEN p.count_type <> 'FG' THEN p.count_value ELSE 0 END) AS TotalDefects,
            SUM(p.count_value * (60.0 / NULLIF(param.planned_output, 0))) AS TheoreticalMinutes
        FROM dbo.PARTS p 
        JOIN dbo.PARAMETER param ON p.line = param.line AND p.model = param.model AND p.part_no = param.part_no
        WHERE 
            p.log_date BETWEEN @StartDate AND @EndDate
            AND (@Line IS NULL OR p.line = @Line)
            AND (@Model IS NULL OR p.model = @Model)
            AND param.planned_output > 0
            AND p.count_type IN ('FG', 'NG', 'HOLD', 'REWORK', 'SCRAP', 'ETC.')
        GROUP BY 
            p.log_date
    ),
    -- 3. *** ส่วนที่แก้ไข: เพิ่ม CTE เพื่อคำนวณค่า A, P, Q ดิบ ***
    RawMetrics AS (
        SELECT 
            d.LogDate AS [date],
            CAST(ISNULL((dp.TotalFG * 100.0) / NULLIF(dp.TotalFG + dp.TotalDefects, 0), 0) AS DECIMAL(10, 4)) AS quality_raw,
            CAST(ISNULL(((ISNULL(dpt.PlannedMinutes, 0) - ISNULL(dd.DowntimeMinutes, 0)) * 100.0) / NULLIF(dpt.PlannedMinutes, 0), 0) AS DECIMAL(10, 4)) AS availability_raw,
            CAST(
                ISNULL(
                    (dp.TheoreticalMinutes * 100.0) / 
                    NULLIF(
                        CASE 
                            WHEN (ISNULL(dpt.PlannedMinutes, 0) - ISNULL(dd.DowntimeMinutes, 0)) < 0 THEN 0 
                            ELSE (ISNULL(dpt.PlannedMinutes, 0) - ISNULL(dd.DowntimeMinutes, 0)) 
                        END, 0
                    )
                , 0) 
            AS DECIMAL(10, 4)) AS performance_raw
        FROM @DateSeries d 
        LEFT JOIN DailyPlannedTime dpt ON d.LogDate = dpt.LogDate 
        LEFT JOIN DailyDowntime dd ON d.LogDate = dd.log_date 
        LEFT JOIN DailyProduction dp ON d.LogDate = dp.log_date 
    )
    -- 4. *** ส่วนที่แก้ไข: SELECT สุดท้ายเพื่อจำกัดค่า Performance และคำนวณ OEE ***
    SELECT 
        m.[date],
        CAST(m.quality_raw AS DECIMAL(5,1)) AS quality,
        CAST(m.availability_raw AS DECIMAL(5,1)) AS availability,
        -- จำกัดค่า Performance ที่ 100
        CAST(CASE WHEN m.performance_raw > 100 THEN 100.0 ELSE m.performance_raw END AS DECIMAL(5,1)) AS performance,
        -- คำนวณ OEE ใหม่โดยใช้ค่า Performance ที่จำกัดแล้ว
        CAST(
            (m.availability_raw / 100.0) * (CASE WHEN m.performance_raw > 100 THEN 100.0 ELSE m.performance_raw END / 100.0) * (m.quality_raw / 100.0) * 100.0 
        AS DECIMAL(5,1)) AS oee
    FROM RawMetrics m
    ORDER BY 
        m.[date] ASC;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_CalculateOEE_PieChart]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      <Author,,Name>
-- Create date: <Create Date,,>
-- Description: Calculates overall OEE for a given period. Caps Performance at 100%.
-- =============================================
CREATE PROCEDURE [dbo].[sp_CalculateOEE_PieChart]
    @StartDate DATE,
    @EndDate DATE,
    @Line VARCHAR(50) = NULL,
    @Model VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Calculate Planned Time (เหมือนเดิม)
    DECLARE @TotalPlannedMinutes INT;
    WITH ActualProductionShifts AS (
        SELECT DISTINCT p.log_date, s.id AS schedule_id 
        FROM dbo.PARTS p JOIN dbo.LINE_SCHEDULES s ON p.line = s.line AND s.is_active = 1 
        WHERE p.log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR p.line = @Line)
        AND ((s.start_time <= s.end_time AND p.log_time BETWEEN s.start_time AND s.end_time) OR (s.start_time > s.end_time AND (p.log_time >= s.start_time OR p.log_time < s.end_time)))
    )
    SELECT @TotalPlannedMinutes = ISNULL(SUM(CASE WHEN s.end_time >= s.start_time THEN DATEDIFF(MINUTE, s.start_time, s.end_time) ELSE DATEDIFF(MINUTE, s.start_time, s.end_time) + 1440 END - s.planned_break_minutes), 0) 
    FROM ActualProductionShifts aps JOIN dbo.LINE_SCHEDULES s ON aps.schedule_id = s.id;

    -- Exit if no planned time (เหมือนเดิม)
    IF @TotalPlannedMinutes IS NULL OR @TotalPlannedMinutes = 0 BEGIN
        SELECT Quality = 0.0, Availability = 0.0, Performance = 0.0, OEE = 0.0, FG = 0, Defects = 0, NG = 0, Rework = 0, Hold = 0, Scrap = 0, Etc = 0, Runtime = 0, PlannedTime = 0, Downtime = 0, ActualOutput = 0, TotalTheoreticalMinutes = 0.0;
        RETURN;
    END;

    -- 2. Calculate Downtime (เหมือนเดิม)
    DECLARE @TotalDowntimeMinutes INT;
    SELECT @TotalDowntimeMinutes = ISNULL(SUM(DATEDIFF(MINUTE, stop_begin, stop_end)), 0) 
    FROM dbo.STOP_CAUSES 
    WHERE log_date BETWEEN @StartDate AND @EndDate AND (@Line IS NULL OR line = @Line);

    -- 3. Calculate Runtime (เหมือนเดิม)
    DECLARE @TotalRuntimeMinutes INT;
    SET @TotalRuntimeMinutes = @TotalPlannedMinutes - @TotalDowntimeMinutes;
    IF @TotalRuntimeMinutes < 0 SET @TotalRuntimeMinutes = 0;

    -- 4. Calculate Production Counts and Theoretical Time (เหมือนเดิม)
    DECLARE @TotalFG INT, @TotalDefects INT, @TotalActualOutput INT, @TotalTheoreticalMinutes DECIMAL(18, 4);
    DECLARE @TotalNG INT, @TotalREWORK INT, @TotalHOLD INT, @TotalSCRAP INT, @TotalETC INT;

    SELECT 
        @TotalFG = ISNULL(SUM(CASE WHEN p.count_type = 'FG' THEN p.count_value ELSE 0 END), 0),
        @TotalNG = ISNULL(SUM(CASE WHEN p.count_type = 'NG' THEN p.count_value ELSE 0 END), 0),
        @TotalREWORK = ISNULL(SUM(CASE WHEN p.count_type = 'REWORK' THEN p.count_value ELSE 0 END), 0),
        @TotalHOLD = ISNULL(SUM(CASE WHEN p.count_type = 'HOLD' THEN p.count_value ELSE 0 END), 0),
        @TotalSCRAP = ISNULL(SUM(CASE WHEN p.count_type = 'SCRAP' THEN p.count_value ELSE 0 END), 0),
        @TotalETC = ISNULL(SUM(CASE WHEN p.count_type = 'ETC.' THEN p.count_value ELSE 0 END), 0),
        @TotalTheoreticalMinutes = ISNULL(SUM(p.count_value * (60.0 / NULLIF(param.planned_output, 0))), 0)
    FROM dbo.PARTS p 
    JOIN dbo.PARAMETER param ON p.line = param.line AND p.model = param.model AND p.part_no = param.part_no
    WHERE 
        p.log_date BETWEEN @StartDate AND @EndDate
        AND (@Line IS NULL OR p.line = @Line)
        AND (@Model IS NULL OR p.model = @Model)
        AND param.planned_output > 0
        AND p.count_value > 0;

    SET @TotalDefects = @TotalNG + @TotalREWORK + @TotalHOLD + @TotalSCRAP + @TotalETC;
    SET @TotalActualOutput = @TotalFG + @TotalDefects;

    -- 5. *** ส่วนที่แก้ไข: คำนวณ A, P, Q และ OEE พร้อมจำกัดค่า Performance ***
    DECLARE @Availability DECIMAL(5,1), @Performance DECIMAL(5,1), @Quality DECIMAL(5,1), @OEE DECIMAL(5,1);

    SET @Quality = CAST(ISNULL((@TotalFG * 100.0) / NULLIF(@TotalActualOutput, 0), 0) AS DECIMAL(5,1));
    SET @Availability = CAST(ISNULL((@TotalRuntimeMinutes * 100.0) / NULLIF(@TotalPlannedMinutes, 0), 0) AS DECIMAL(5,1));
    
    -- คำนวณ Performance ดิบ
    DECLARE @CalculatedPerformance DECIMAL(18, 4);
    SET @CalculatedPerformance = ISNULL((@TotalTheoreticalMinutes * 100.0) / NULLIF(@TotalRuntimeMinutes, 0), 0);
    
    -- ตรวจสอบและจำกัดค่า Performance ที่ 100
    SET @Performance = CASE WHEN @CalculatedPerformance > 100 THEN 100.0 ELSE CAST(@CalculatedPerformance AS DECIMAL(5,1)) END;

    -- คำนวณ OEE โดยใช้ค่า P ที่ถูกจำกัดแล้ว
    SET @OEE = CAST((@Availability / 100.0) * (@Performance / 100.0) * (@Quality / 100.0) * 100.0 AS DECIMAL(5,1));

    -- 6. Final Select
    SELECT 
        Quality = @Quality,
        Availability = @Availability,
        Performance = @Performance,
        OEE = @OEE,
        FG = @TotalFG, 
        Defects = @TotalDefects, 
        NG = @TotalNG, 
        Rework = @TotalREWORK, 
        Hold = @TotalHOLD, 
        Scrap = @TotalSCRAP, 
        Etc = @TotalETC, 
        Runtime = @TotalRuntimeMinutes, 
        PlannedTime = @TotalPlannedMinutes, 
        Downtime = @TotalDowntimeMinutes, 
        ActualOutput = @TotalActualOutput, 
        TotalTheoreticalMinutes = CAST(@TotalTheoreticalMinutes AS DECIMAL(18,2));
END
GO
/****** Object:  StoredProcedure [dbo].[sp_DeleteSchedule]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[sp_DeleteSchedule] @id INT AS BEGIN SET NOCOUNT ON; DELETE FROM dbo.LINE_SCHEDULES WHERE id = @id; END
GO
/****** Object:  StoredProcedure [dbo].[sp_GetMissingParameters]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- อัปเดต Stored Procedure ที่มีอยู่
CREATE PROCEDURE [dbo].[sp_GetMissingParameters]
AS
BEGIN
    SET NOCOUNT ON;

    -- สร้าง Common Table Expression (CTE) เพื่อดึงรายการ Part ที่ไม่ซ้ำกัน
    -- โดยเพิ่มเงื่อนไขให้ไม่สนใจรายการที่เป็น 'BOM-ISSUE'
    ;WITH DistinctPartsToCheck AS (
        SELECT DISTINCT 
            line, 
            model, 
            part_no 
        FROM 
            dbo.PARTS
        WHERE 
            count_type <> 'BOM-ISSUE' -- <<<< เพิ่มเงื่อนไขนี้เพื่อกรองข้อมูล
    )
    -- ค้นหาว่า Part ใน CTE นั้นมีอยู่ในตาราง PARAMETER หรือไม่
    SELECT 
        p.line, 
        p.model, 
        p.part_no 
    FROM 
        DistinctPartsToCheck p
    WHERE 
        NOT EXISTS (
            SELECT 1 
            FROM dbo.PARAMETER param 
            WHERE param.line = p.line 
              AND param.model = p.model 
              AND param.part_no = p.part_no
        )
    ORDER BY 
        p.line, p.model, p.part_no;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_GetSchedules]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[sp_GetSchedules] AS BEGIN SET NOCOUNT ON; SELECT id, line, shift_name, CONVERT(VARCHAR(8), start_time, 108) AS start_time, CONVERT(VARCHAR(8), end_time, 108) AS end_time, planned_break_minutes, is_active FROM dbo.LINE_SCHEDULES ORDER BY line, shift_name; END
GO
/****** Object:  StoredProcedure [dbo].[sp_SaveSchedule]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[sp_SaveSchedule] @id INT, @line VARCHAR(50), @shift_name VARCHAR(50), @start_time TIME, @end_time TIME, @planned_break_minutes INT, @is_active BIT AS BEGIN SET NOCOUNT ON; IF @id = 0 BEGIN INSERT INTO dbo.LINE_SCHEDULES (line, shift_name, start_time, end_time, planned_break_minutes, is_active) VALUES (@line, @shift_name, @start_time, @end_time, @planned_break_minutes, @is_active); END ELSE BEGIN UPDATE dbo.LINE_SCHEDULES SET line = @line, shift_name = @shift_name, start_time = @start_time, end_time = @end_time, planned_break_minutes = @planned_break_minutes, is_active = @is_active WHERE id = @id; END END
GO
/****** Object:  StoredProcedure [dbo].[sp_UpdatePlannedOutput]    Script Date: 25/7/2568 11:00:42 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[sp_UpdatePlannedOutput] @id INT, @planned_output INT AS BEGIN SET NOCOUNT ON; UPDATE PARAMETER SET planned_output = @planned_output, updated_at = GETDATE() WHERE id = @id; END
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Optional description for the part' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'PARAMETER', @level2type=N'COLUMN',@level2name=N'part_description'
GO
USE [master]
GO
ALTER DATABASE [IIOT_TOOLBOX] SET  READ_WRITE 
GO
