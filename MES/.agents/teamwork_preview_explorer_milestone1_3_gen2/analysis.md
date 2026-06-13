# Forensic Audit Remediation Analysis Report

This report analyzes four critical integrity violations identified in the Manufacturing Execution System (MES) codebase and defines the precise remediation strategy for each.

---

## Executive Summary

A forensic audit of the new machine-based production recording system revealed several discrepancies between the architecture design, the database schema, and the implementation. These include:
1. **MQTT Telemetry Ingestion Bypass**: The Python IIoT daemon (`iiot_service.py`) directly connects to the database via `pyodbc` instead of utilizing the HTTP POST API endpoint (`iiotAPI.php`) as documented in the architecture map.
2. **SQL Trigger Compilation Failure**: The SQL script `machine-oee-setup.sql` references a non-existent column (`active`) in `PE_MACHINES`, causing compilation failure.
3. **Migration Engine Crashes**: The ETL migration script (`migrate_legacy.php`) uses outdated or incorrect database column names (`legacy_id` and `image_path`), leading to SQL execution exceptions.
4. **Transient/Hacky Stored Procedure Generation**: The stored procedure patcher (`alter_sps.js`) relies on hardcoded, transient subagent workspace paths to perform regex replacements on dumped procedure text, making it non-reproducible.

---

## Detailed Investigation & Remediation Strategy

### 1. Observation A: MQTT Telemetry Bypass

#### A. Investigation Findings
- **Claim in `docs/architecture_map.md`**:
  - *Mermaid Diagram*: `IIoT_Daemon["Python IIoT Daemon"] -->|POST Telemetry JSON| iiot_api["page/PE/api/iiotAPI.php"]`
  - *Text Description*: The daemon makes an HTTP POST to `iiotAPI.php`, which upserts telemetry to `PE_IIOT_TELEMETRY`.
- **Actual Implementation**:
  - `script/iiot_service.py` directly imports `pyodbc`, establishes a database connection using local SQL Server credentials (User: `TOOLBOX`, Server: `10.1.1.31`), and executes raw SQL `UPDATE`/`INSERT` commands.
  - The API endpoint `page/PE/api/iiotAPI.php?action=update_telemetry` contains fully functional PHP logic that processes JSON payloads via `php://input` but is currently bypassed and unused.

#### B. Remediation Recommendation
Align the implementation with the architecture map by modifying `iiot_service.py` to send HTTP POST requests to `iiotAPI.php`. This removes the database credentials and the direct `pyodbc` driver dependency from the IIoT daemon, improving security and reducing system coupling.

#### C. Exact Code Changes
**File**: `script/iiot_service.py`
- Remove `pyodbc` imports and SQL credentials.
- Add `urllib.request` and configure `API_URL`.
- Modify `process_payload` to POST JSON to the API.

```python
# ==========================================
# Proposed changes in script/iiot_service.py
# ==========================================

# --- REMOVE: Old database imports and credentials ---
# import pyodbc
# DB_SERVER = "10.1.1.31" ...
# CONN_STR = ...

# --- ADD: HTTP client imports and API configuration ---
import urllib.request
import urllib.error

API_URL = "http://10.1.1.31/page/PE/api/iiotAPI.php?action=update_telemetry" # Or localhost if running locally

# --- REPLACE: process_payload implementation ---
def process_payload(payload):
    try:
        if isinstance(payload, dict):
            payload = [payload]
            
        for item in payload:
            topic_name = item.get("work_center")
            if not topic_name:
                continue
                
            # Construct JSON payload matching the expected input for iiotAPI.php
            telemetry_data = {
                "topic_name": topic_name,
                "live_status": str(item.get("status", "UNKNOWN")).upper(),
                "live_counter": item.get("counter", 0),
                "live_total": item.get("total", 0),
                "cycle_time": item.get("cycle_time", 0)
            }
            
            # Post telemetry data to iiotAPI.php
            try:
                req = urllib.request.Request(
                    API_URL,
                    data=json.dumps(telemetry_data).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    res_body = response.read().decode('utf-8')
                    res_data = json.loads(res_body)
                    if not res_data.get('success'):
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ API Error: {res_data.get('message')}")
            except urllib.error.URLError as ue:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ HTTP Request Failed: {ue}")
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Error posting telemetry: {e}")
                
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Payload processing error: {e}")
```

---

### 2. Observation B: Trigger Column Name Error

#### A. Investigation Findings
- **Table Definition** (`page/PE/sql/create_pe_tables.sql`):
  ```sql
  CREATE TABLE PE_MACHINES (
      ...
      is_active       BIT DEFAULT 1,
      ...
  );
  ```
  The table contains a column named `is_active` but no column named `active`.
- **Trigger Code** (`machine-oee-setup.sql`):
  ```sql
  CREATE TRIGGER trg_AutoCreateMachineSchedules
  ON LINE_SCHEDULES
  AFTER INSERT
  AS
  BEGIN
      ...
      JOIN PE_MACHINES m ON m.line = i.line
      WHERE m.active = 1; -- <--- Compilation failure here
  END
  ```
  Attempting to compile this trigger fails with `Invalid column name 'active'`.

#### B. Remediation Recommendation
Change `m.active` to `m.is_active` on Line 83 of `machine-oee-setup.sql`.

#### C. Exact Code Changes
**File**: `machine-oee-setup.sql` (Line 83)

*Before:*
```sql
    JOIN PE_MACHINES m ON m.line = i.line
    WHERE m.active = 1; -- Only create schedule for active machines
```

*After:*
```sql
    JOIN PE_MACHINES m ON m.line = i.line
    WHERE m.is_active = 1; -- Only create schedule for active machines
```

---

### 3. Observation C: Migration Engine Schema Errors

#### A. Investigation Findings
- **Table Definition** (`page/PE/sql/create_pe_tables.sql`):
  - `PE_DOWNTIME_LOG` contains `legacy_sc_id INT NULL` (and no `legacy_id` column).
  - `PE_WORK_ORDERS` contains `legacy_mt_id INT NULL` (and no `legacy_id` column).
  - `PE_WORK_ORDERS` contains `photo_before NVARCHAR(500)` (and no `image_path` column).
- **Migration Code** (`page/PE/api/migrate_legacy.php`):
  - Line 23: Searches `PE_DOWNTIME_LOG` using `legacy_id = ?`.
  - Line 33: Inserts into `PE_DOWNTIME_LOG` using column `legacy_id`.
  - Line 65: Searches `PE_WORK_ORDERS` using `legacy_id = ?`.
  - Line 120: Inserts into `PE_WORK_ORDERS` using columns `image_path` and `legacy_id`.
  - Line 148-150: Performs join using `PE.legacy_id` and `MR.id`.
  - Line 157: Uses `$row['legacy_id']`.

Running this script results in fatal SQL errors due to missing database columns.

#### B. Remediation Recommendation
Modify the SQL queries in `migrate_legacy.php` to target the correct columns:
- Replace `legacy_id` in `PE_DOWNTIME_LOG` queries with `legacy_sc_id`.
- Replace `legacy_id` in `PE_WORK_ORDERS` queries with `legacy_mt_id`.
- Replace `image_path` in `PE_WORK_ORDERS` query with `photo_before`.

#### C. Exact Code Changes
**File**: `page/PE/api/migrate_legacy.php`

*Change 1: Downtime migration check (Line 23)*
- Before:
  ```php
  $check = $pdo->prepare("SELECT downtime_id FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE legacy_id = ?");
  ```
- After:
  ```php
  $check = $pdo->prepare("SELECT downtime_id FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE legacy_sc_id = ?");
  ```

*Change 2: Downtime insert statement (Line 33)*
- Before:
  ```php
  $sql = "INSERT INTO " . PE_DOWNTIME_LOG_TABLE . " 
          (machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail, recovered_by, notes, legacy_id)
          VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  ```
- After:
  ```php
  $sql = "INSERT INTO " . PE_DOWNTIME_LOG_TABLE . " 
          (machine_id, machine_name, line, log_date, start_time, end_time, cause_category, cause_detail, recovered_by, notes, legacy_sc_id)
          VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  ```

*Change 3: Work orders migration check (Line 65)*
- Before:
  ```php
  $check = $pdo->prepare("SELECT wo_id FROM " . PE_WORK_ORDERS_TABLE . " WHERE legacy_id = ?");
  ```
- After:
  ```php
  $check = $pdo->prepare("SELECT wo_id FROM " . PE_WORK_ORDERS_TABLE . " WHERE legacy_mt_id = ?");
  ```

*Change 4: Work orders insert statement (Line 118-121)*
- Before:
  ```php
  $sql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . " 
          (wo_number, wo_type, machine_name, line, priority, status, requested_by, requested_at, 
           issue_title, issue_detail, assigned_to, started_at, completed_at, repair_minutes, action_taken, image_path, photo_after, legacy_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  ```
- After:
  ```php
  $sql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . " 
          (wo_number, wo_type, machine_name, line, priority, status, requested_by, requested_at, 
           issue_title, issue_detail, assigned_to, started_at, completed_at, repair_minutes, action_taken, photo_before, photo_after, legacy_mt_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  ```

*Change 5: Post-migration sync statement (Line 147-152)*
- Before:
  ```php
  $stmtSync = $pdo->query("
      SELECT PE.wo_id, PE.legacy_id, MR.photo_after_path 
      FROM " . PE_WORK_ORDERS_TABLE . " PE WITH (NOLOCK)
      INNER JOIN MAINTENANCE_REQUESTS MR WITH (NOLOCK) ON PE.legacy_id = MR.id 
      WHERE MR.photo_after_path IS NOT NULL AND PE.photo_after IS NULL
  ");
  ```
- After:
  ```php
  $stmtSync = $pdo->query("
      SELECT PE.wo_id, PE.legacy_mt_id, MR.photo_after_path 
      FROM " . PE_WORK_ORDERS_TABLE . " PE WITH (NOLOCK)
      INNER JOIN MAINTENANCE_REQUESTS MR WITH (NOLOCK) ON PE.legacy_mt_id = MR.id 
      WHERE MR.photo_after_path IS NOT NULL AND PE.photo_after IS NULL
  ");
  ```

*Change 6: Sync filename template (Line 157)*
- Before:
  ```php
  $newName = 'LEGACY_AFTER_' . $row['legacy_id'] . '_' . time() . '.' . ($fileInfo['extension'] ?? 'jpg');
  ```
- After:
  ```php
  $newName = 'LEGACY_AFTER_' . $row['legacy_mt_id'] . '_' . time() . '.' . ($fileInfo['extension'] ?? 'jpg');
  ```

---

### 4. Observation D: Hardcoded Temporary Subagent Paths

#### A. Investigation Findings
- **Script Analysis** (`alter_sps.js`):
  - The script relies on hardcoded JSON dumps containing the raw SQL code of stored procedures in another agent's session directory (e.g. `C:\\Users\\naphat-noo\\.gemini\\antigravity-ide\\brain\\...\\output.txt`).
  - It runs a JavaScript regex-replace script to insert `@MachineId` and saves files named `alter_sp_CalculateOEE_Dashboard_PieChart.sql`, etc.
  - The generated output files are not version-controlled, meaning fresh installations will lack these files and cannot deploy the stored procedures.
  - The actual deployed stored procedures are already modified in the database.

#### B. Remediation Recommendation
To ensure reproducibility and clean up the deployment workflow:
1. Extract the actual altered stored procedure code from the database. (We have successfully queried and saved them as reference files in the agent folder).
2. Save these SQL files permanently in the codebase under `page/PE/sql/` using standard, version-controlled names:
   - `page/PE/sql/sp_CalculateOEE_Dashboard_PieChart.sql`
   - `page/PE/sql/sp_CalculateOEE_Dashboard_LineChart.sql`
   - `page/PE/sql/sp_CalculateOEE_Hourly_Trend.sql`
   - `page/PE/sql/sp_GetDailyProductionSummary.sql`
3. Modify the syntax inside these SQL files to use `CREATE OR ALTER PROCEDURE` instead of `CREATE PROCEDURE` so that they can be safely re-run.
4. Delete the hacky `alter_sps.js` utility.
5. Update `execute_sps.php` to load and run these clean files from `page/PE/sql/` instead of the transient output files.

#### C. Exact Code Changes
**File**: `execute_sps.php`

*Before:*
```php
$files = [
    'alter_sp_CalculateOEE_Dashboard_PieChart.sql',
    'alter_sp_CalculateOEE_Dashboard_LineChart.sql',
    'alter_sp_CalculateOEE_Hourly_Trend.sql',
    'alter_sp_GetDailyProductionSummary.sql'
];
```

*After:*
```php
$files = [
    'page/PE/sql/sp_CalculateOEE_Dashboard_PieChart.sql',
    'page/PE/sql/sp_CalculateOEE_Dashboard_LineChart.sql',
    'page/PE/sql/sp_CalculateOEE_Hourly_Trend.sql',
    'page/PE/sql/sp_GetDailyProductionSummary.sql'
];
```

**New Stored Procedure Files (with `CREATE OR ALTER` syntax)**:
The complete, cleaned SQL definitions extracted from the database are saved as:
- `page/PE/sql/sp_CalculateOEE_Dashboard_PieChart.sql`
- `page/PE/sql/sp_CalculateOEE_Dashboard_LineChart.sql`
- `page/PE/sql/sp_CalculateOEE_Hourly_Trend.sql`
- `page/PE/sql/sp_GetDailyProductionSummary.sql`

*(See the `sp_*_original.sql` files inside our agent directory for the exact SQL definitions to write into these paths).*
