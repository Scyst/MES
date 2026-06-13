# Handoff Report — Explorer 3 (gen2)

## 1. Observation

Direct observations made during the codebase investigation:

- **Observation A (MQTT Telemetry Bypass)**:
  - `docs/architecture_map.md` line 107-108:
    ```mermaid
    IIoT_Daemon -->|POST Telemetry JSON| iiot_api
    iiot_api -->|Upserts status & count| PE_Db_T
    ```
  - `script/iiot_service.py` line 22, 24-25:
    ```python
    CONN_STR = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE={DB_NAME};UID={DB_USER};PWD={DB_PASS}'
    def get_db_connection():
        return pyodbc.connect(CONN_STR)
    ```
  - The script does not utilize `iiotAPI.php` and instead connects directly to SQL Server via pyodbc.

- **Observation B (Trigger Column Name Error)**:
  - `machine-oee-setup.sql` line 83:
    ```sql
    JOIN PE_MACHINES m ON m.line = i.line
    WHERE m.active = 1; -- Only create schedule for active machines
    ```
  - `page/PE/sql/create_pe_tables.sql` line 25:
    ```sql
    is_active       BIT DEFAULT 1,
    ```
  - There is no column named `active` in `PE_MACHINES`.

- **Observation C (Migration Engine Schema Errors)**:
  - `page/PE/api/migrate_legacy.php` line 23:
    ```php
    $check = $pdo->prepare("SELECT downtime_id FROM " . PE_DOWNTIME_LOG_TABLE . " WHERE legacy_id = ?");
    ```
  - `page/PE/api/migrate_legacy.php` line 120:
    ```php
    (wo_number, wo_type, machine_name, line, priority, status, requested_by, requested_at, 
     issue_title, issue_detail, assigned_to, started_at, completed_at, repair_minutes, action_taken, image_path, photo_after, legacy_id)
    ```
  - `page/PE/sql/create_pe_tables.sql` lines 50, 65, 96:
    ```sql
    photo_before    NVARCHAR(500),
    ...
    legacy_mt_id    INT NULL,
    ...
    legacy_sc_id    INT NULL,
    ```
  - Columns `legacy_id` and `image_path` do not exist in the new tables.

- **Observation D (Hardcoded Temporary Subagent Paths)**:
  - `alter_sps.js` lines 23-24:
    ```javascript
    processSP('C:\\Users\\naphat-noo\\.gemini\\antigravity-ide\\brain\\01d316f5-c021-4b37-9d65-b1c7099555fa\\.system_generated\\steps\\297\\output.txt', 'sp_CalculateOEE_Dashboard_PieChart');
    processSP('C:\\Users\\naphat-noo\\.gemini\\antigravity-ide\\brain\\01d316f5-c021-4b37-9d65-b1c7099555fa\\.system_generated\\steps\\334\\output.txt', 'sp_CalculateOEE_Dashboard_LineChart');
    ```
  - Stored procedures are modified using transient subagent session files, which are non-reproducible and missing from git.

---

## 2. Logic Chain

- **MQTT Telemetry Ingestion (Observation A)**:
  1. The architecture map documents an HTTP data flow between the Python IIoT Daemon and `iiotAPI.php`.
  2. The Python daemon actually accesses the database via raw pyodbc queries, making the API endpoint dead code and violating security boundaries by exposing database credentials on edge scripts.
  3. Modifying `iiot_service.py` to perform HTTP POST requests solves this decoupling issue and aligns the system with the architecture documentation.

- **Trigger Compilation (Observation B)**:
  1. `machine-oee-setup.sql` joins `PE_MACHINES` and queries `m.active`.
  2. The database schema in `create_pe_tables.sql` defines the column as `is_active`.
  3. Running `machine-oee-setup.sql` triggers a compiler failure: "Invalid column name 'active'". Changing the filter to `m.is_active` corrects the bug.

- **Migration Crashes (Observation C)**:
  1. `migrate_legacy.php` references `legacy_id` and `image_path`.
  2. `create_pe_tables.sql` uses `legacy_sc_id` (for downtime), `legacy_mt_id` (for work orders), and `photo_before` (for work orders).
  3. Running the migration crashes due to missing columns. Replacing the legacy column names with the defined schema columns resolves the crashes.

- **Stored Procedures Reproducibility (Observation D)**:
  1. `alter_sps.js` depends on temporary files from a previous subagent session.
  2. A fresh environment cannot run `alter_sps.js` since the temporary files do not exist.
  3. Querying the active database (using `mssql` node client) allowed us to extract the already modified stored procedures.
  4. Saving these SQL files with `CREATE OR ALTER PROCEDURE` under `page/PE/sql/` and updating `execute_sps.php` to run them directly removes the transient file dependency.

---

## 3. Caveats

- **Network reachability**: We assumed `iiotAPI.php` can be reached from the machine running `iiot_service.py` via HTTP. If there is a firewall rule blocking port 80/443 between the edge daemon and web server, firewall rules will need to be updated.
- **Downtime Machine Filter**: `sp_CalculateOEE_Dashboard_PieChart` currently does not filter the legacy `STOP_CAUSES` by `@MachineId`. It only filters `STOCK_TRANSACTIONS` by machine. This is because legacy `STOP_CAUSES` only recorded downtime at the line level. Once migration is complete, OEE calculations should query the new machine-level `PE_DOWNTIME_LOG` table instead.

---

## 4. Conclusion

The forensic audit findings are fully validated. The codebase has clear integrity errors in SQL files, PHP migration utilities, and Python daemons.
Implementing the recommended changes (detailed in `analysis.md`):
- Restores system security and decouples the IIoT daemon.
- Fixes trigger compilation errors.
- Resolves migration utility crashes.
- Version-controls and secures stored procedure deployments, ensuring clean environmental reproducibility.

---

## 5. Verification Method

To verify the remediation:
1. **Trigger Compilation**: Run `machine-oee-setup.sql` in SQL Server Management Studio (SSMS) or via CLI tool. Ensure the trigger compiles with no column name errors.
2. **Migration Script**: Trigger `page/PE/api/migrate_legacy.php?action=run_migration` via HTTP request or CLI PHP execution. Verify that it migrates legacy records successfully without throwing SQL exceptions.
3. **Stored Procedures Deployment**: Run `php execute_sps.php` and verify it successfully applies the stored procedures to the database.
4. **IIoT Telemetry API**: Post a sample JSON payload to `page/PE/api/iiotAPI.php?action=update_telemetry` and check that `PE_IIOT_TELEMETRY` is updated correctly.
