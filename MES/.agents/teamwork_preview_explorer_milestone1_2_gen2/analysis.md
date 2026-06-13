# Analysis Report: Forensic Audit Remediation Strategy

## 1. Executive Summary & Overview
This report presents a detailed analysis and remediation strategy for four integrity violations identified in the Manufacturing Execution System (MES) codebase during a Forensic Audit. These violations compromise system reliability, database schema alignment, build process reproducibility, and security practices.

By resolving these issues, the codebase will achieve:
1. **Decoupled IIoT Daemons**: The daemon will communicate via HTTP rather than direct DB calls.
2. **Schema Integration**: Stored procedures and triggers will compile cleanly without column mismatches.
3. **Reproducible SQL Deployments**: Temporary IDE folder dependencies will be replaced with version-controlled SQL files.

---

## 2. Remediation Strategy for the 4 Audit Observations

### Observation A: MQTT Telemetry Bypass (`iiot_service.py` vs `iiotAPI.php`)
* **Problem**: `docs/architecture_map.md` states that the Python IIoT daemon posts JSON telemetry to `iiotAPI.php`, which handles database upserts. However, `script/iiot_service.py` directly opens a database connection via `pyodbc` using SQL Server credentials (`TOOLBOX` / `I1o1@T@#1boX`), bypassing the API.
* **Impact**: Exposes database credentials on edge clients, introduces tight coupling, and requires OS-specific database drivers (like ODBC Driver 17 for SQL Server) on edge devices.
* **Remediation**:
  - We recommend **Option 1 (Modify `iiot_service.py` to HTTP POST to `iiotAPI.php`)** as it fulfills the documented architecture, simplifies the daemon codebase, and secures database credentials.
  - **Option 2 (Update documentation)** is kept as an alternative, but discouraged.

#### Proposed Code Changes for Option 1:
In `script/iiot_service.py`:
1. Remove `import pyodbc`.
2. Add `import requests`.
3. Replace database configuration variables with a configurable `API_BASE_URL`.
4. Update `process_payload` to assemble the payload and perform an HTTP POST request.

**File Changes Code Sketch (`script/iiot_service.py`):**
```python
import paho.mqtt.client as mqtt
import json
from datetime import datetime
import threading
import requests
import os

# --- Configuration ---
MQTT_BROKER = "10.1.68.100"
MQTT_PORT = 1883
MQTT_TOPIC = "/Counter/B9"
MQTT_USER = "snc-mqtt"
MQTT_PASS = "snc-mqtt"

# Web API Configuration
API_BASE_URL = os.environ.get("MES_API_URL", "http://localhost/MES")
API_URL = f"{API_BASE_URL}/page/PE/api/iiotAPI.php?action=update_telemetry"

def process_payload(payload):
    try:
        # Ensure payload is a list (if it's a single object, wrap it)
        if isinstance(payload, dict):
            payload = [payload]
            
        for item in payload:
            topic_name = item.get("work_center")
            if not topic_name:
                continue
                
            status = str(item.get("status", "UNKNOWN")).upper()
            counter = item.get("counter", 0)
            total = item.get("total", 0)
            cycle_time = item.get("cycle_time", 0)
            
            # Map Python keys to PHP iiotAPI.php expected keys
            post_data = {
                "topic_name": topic_name,
                "live_status": status,
                "live_counter": counter,
                "live_total": total,
                "cycle_time": cycle_time
            }
            
            # Call PHP HTTP API
            response = requests.post(
                API_URL, 
                json=post_data, 
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            if response.status_code == 200:
                res_json = response.json()
                if not res_json.get("success"):
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ API Error: {res_json.get('message')}")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ HTTP Error {response.status_code}: {response.text}")
                
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ HTTP Ingestion Error: {e}")
```

---

### Observation B: Trigger Column Name Error (`trg_AutoCreateMachineSchedules`)
* **Problem**: In `machine-oee-setup.sql` (Line 83), the trigger `trg_AutoCreateMachineSchedules` queries `PE_MACHINES` on `WHERE m.active = 1`. However, the table definition in `page/PE/sql/create_pe_tables.sql` (Line 25) names this column `is_active`.
* **Impact**: Executing `machine-oee-setup.sql` fails compilation with: `"Invalid column name 'active'"`.
* **Remediation**: Correct column name from `m.active` to `m.is_active`.

#### Proposed Code Changes:
In `machine-oee-setup.sql` (Lines 81-85):
```sql
<<<<
    FROM inserted i
    JOIN PE_MACHINES m ON m.line = i.line
    WHERE m.active = 1; -- Only create schedule for active machines
====
    FROM inserted i
    JOIN PE_MACHINES m ON m.line = i.line
    WHERE m.is_active = 1; -- Only create schedule for active machines
>>>>
```

---

### Observation C: Migration Engine Schema Errors (`migrate_legacy.php`)
* **Problem**: In `migrate_legacy.php`, the migration queries map historical database tables using non-existent columns:
  1. `PE_DOWNTIME_LOG` queries search and insert into `legacy_id`, but the database table defines it as `legacy_sc_id`.
  2. `PE_WORK_ORDERS` queries search and insert into `legacy_id`, but the database table defines it as `legacy_mt_id`.
  3. `PE_WORK_ORDERS` insert queries target `image_path`, but the database table defines it as `photo_before`.
* **Impact**: Executing the legacy migration crashes with database execution errors (e.g. `Invalid column name 'legacy_id'`).
* **Remediation**: Modify `migrate_legacy.php` to align all query statements with the database schema definitions.

#### Proposed Code Changes:

**1. Downtime Log Check & Insert (Lines 23 & 33):**
```php
<<<<
        // Check if already migrated
        $check = $pdo->prepare("SELECT downtime_id FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE legacy_id = ?");
        $check->execute([$row['id']]);
        if ($check->fetchColumn()) continue;
...
        $sql = "INSERT INTO " . PE_DOWNTIME_LOG_TABLE . " 
                (machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail, recovered_by, notes, legacy_id)
                VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
====
        // Check if already migrated
        $check = $pdo->prepare("SELECT downtime_id FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE legacy_sc_id = ?");
        $check->execute([$row['id']]);
        if ($check->fetchColumn()) continue;
...
        $sql = "INSERT INTO " . PE_DOWNTIME_LOG_TABLE . " 
                (machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail, recovered_by, notes, legacy_sc_id)
                VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
>>>>
```

**2. Work Order Check & Insert (Lines 65 & 118-121):**
```php
<<<<
        $check = $pdo->prepare("SELECT wo_id FROM " . PE_WORK_ORDERS_TABLE . " WHERE legacy_id = ?");
        $check->execute([$row['id']]);
...
        $sql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . " 
                (wo_number, wo_type, machine_name, line, priority, status, requested_by, requested_at, 
                 issue_title, issue_detail, assigned_to, started_at, completed_at, repair_minutes, action_taken, image_path, photo_after, legacy_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
====
        $check = $pdo->prepare("SELECT wo_id FROM " . PE_WORK_ORDERS_TABLE . " WHERE legacy_mt_id = ?");
        $check->execute([$row['id']]);
...
        $sql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . " 
                (wo_number, wo_type, machine_name, line, priority, status, requested_by, requested_at, 
                 issue_title, issue_detail, assigned_to, started_at, completed_at, repair_minutes, action_taken, photo_before, photo_after, legacy_mt_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
>>>>
```

**3. Work Order Photo After Synchronization (Lines 147-152):**
```php
<<<<
    $stmtSync = $pdo->query("
        SELECT PE.wo_id, PE.legacy_id, MR.photo_after_path 
        FROM " . PE_WORK_ORDERS_TABLE . " PE WITH (NOLOCK)
        INNER JOIN MAINTENANCE_REQUESTS MR WITH (NOLOCK) ON PE.legacy_id = MR.id 
        WHERE MR.photo_after_path IS NOT NULL AND PE.photo_after IS NULL
    ");
====
    $stmtSync = $pdo->query("
        SELECT PE.wo_id, PE.legacy_mt_id AS legacy_id, MR.photo_after_path 
        FROM " . PE_WORK_ORDERS_TABLE . " PE WITH (NOLOCK)
        INNER JOIN MAINTENANCE_REQUESTS MR WITH (NOLOCK) ON PE.legacy_mt_id = MR.id 
        WHERE MR.photo_after_path IS NOT NULL AND PE.photo_after IS NULL
    ");
>>>>
```

---

### Observation D: Hardcoded Temporary Subagent Paths (`alter_sps.js`)
* **Problem**: The `alter_sps.js` script processes stored procedures by fetching text from temporary, session-based IDE outputs (e.g. `C:\\Users\\naphat-noo\\.gemini\\antigravity-ide\\brain\\01d316f5-c021-4b37-9d65-b1c7099555fa\\.system_generated\\steps\\297\\output.txt`) and running regex replacements. The output scripts are not tracked in version control, making the setup completely unreproducible.
* **Impact**: Disables reproducible staging and deployment configurations.
* **Remediation**:
  1. Extract the actual final SQL definitions for the four stored procedures: `sp_CalculateOEE_Dashboard_PieChart`, `sp_CalculateOEE_Dashboard_LineChart`, `sp_CalculateOEE_Hourly_Trend`, and `sp_GetDailyProductionSummary`.
  2. Save these static scripts in the codebase directory `page/PE/sql/procedures/`.
  3. Delete the dynamically generated scripts/process (`alter_sps.js`) and modify `execute_sps.php` to directly run these version-controlled files, or integrate them into a SQL migration package.

#### Extracted & Corrected Stored Procedures SQL Files:

##### 1. `sp_CalculateOEE_Dashboard_PieChart`
Save to: `page/PE/sql/procedures/sp_CalculateOEE_Dashboard_PieChart.sql`
```sql
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
```

##### 2. `sp_CalculateOEE_Dashboard_LineChart`
Save to: `page/PE/sql/procedures/sp_CalculateOEE_Dashboard_LineChart.sql`
```sql
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
```

##### 3. `sp_CalculateOEE_Hourly_Trend`
Save to: `page/PE/sql/procedures/sp_CalculateOEE_Hourly_Trend.sql`
```sql
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
```

##### 4. `sp_GetDailyProductionSummary`
Save to: `page/PE/sql/procedures/sp_GetDailyProductionSummary.sql`
*(Note: We add the `@MachineId` parameter and filtering condition `AND (@MachineId IS NULL OR t.machine_id = @MachineId)` to allow machine filtering support).*
```sql
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
```

#### Proposed Code Changes for `execute_sps.php`:
We should modify `execute_sps.php` to load SQL modules directly from `page/PE/sql/procedures/`:
```php
<?php
require_once __DIR__ . '/page/components/init.php';
require_once __DIR__ . '/db.php';

$spDirectory = __DIR__ . '/page/PE/sql/procedures/';
$files = [
    'sp_CalculateOEE_Dashboard_PieChart.sql',
    'sp_CalculateOEE_Dashboard_LineChart.sql',
    'sp_CalculateOEE_Hourly_Trend.sql',
    'sp_GetDailyProductionSummary.sql'
];

foreach ($files as $file) {
    $filePath = $spDirectory . $file;
    if (file_exists($filePath)) {
        $sql = file_get_contents($filePath);
        try {
            $pdo->exec($sql);
            echo "Successfully deployed $file\n";
        } catch (PDOException $e) {
            echo "Error deploying $file: " . $e->getMessage() . "\n";
        }
    } else {
        echo "Stored procedure file not found: $filePath\n";
    }
}
?>
```
This migration approach eliminates the transient session path dependencies entirely and ensures SQL procedures are tracked directly in the repository.

---

## 3. Implementation Verification & Testing Instructions
To verify these changes:
1. Apply the corrected trigger SQL to your local/test SQL Server database. Check that compilation succeeds.
2. Run the `migrate_legacy.php` page via URL `/page/PE/api/migrate_legacy.php?action=run_migration` and check the response JSON to verify that legacy records in `STOP_CAUSES` and `MAINTENANCE_REQUESTS` are imported without SQL execution errors.
3. Deploy the SQL stored procedures from `page/PE/sql/procedures/` by running `php execute_sps.php`. Verify all procedures compile successfully.
4. Run `script/iiot_service.py` background process. Check that it successfully forwards MQTT topics to `iiotAPI.php` and does not raise connection errors. Check the database `PE_IIOT_TELEMETRY` table to verify live updates occur.
