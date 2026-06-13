# Handoff Report: Forensic Audit Remediation

## 1. Observation
I directly observed the following files and code patterns:

1. **Observation A: IIoT Ingestion Direct DB bypass**
   - In `docs/architecture_map.md` (lines 107-108):
     ```mermaid
     IIoT_Daemon["Python IIoT Daemon"]:::new
     iiot_api["page/PE/api/iiotAPI.php"]:::new
     IIoT_Daemon -->|POST Telemetry JSON| iiot_api
     ```
   - In `docs/architecture_map.md` (line 162):
     `"The daemon issues a HTTP POST to iiotAPI.php..."`
   - In `script/iiot_service.py` (lines 24-25, 50-79):
     ```python
     def get_db_connection():
         return pyodbc.connect(CONN_STR)
     ...
     # 1. Update PE_IIOT_DISCOVERY
     cursor.execute(...)
     ...
     # 2. Update PE_IIOT_TELEMETRY
     cursor.execute(...)
     ```
     This opens a direct SQL Server connection via `pyodbc` and bypasses the PHP endpoint.
   - In `page/PE/api/iiotAPI.php` (lines 14-104):
     An HTTP endpoint case `'update_telemetry'` exists to accept JSON POST and update both `PE_IIOT_DISCOVERY` and `PE_IIOT_TELEMETRY`.

2. **Observation B: Trigger Compilation Error**
   - In `machine-oee-setup.sql` (line 83):
     `"WHERE m.active = 1;"`
   - In `page/PE/sql/create_pe_tables.sql` (lines 9-28):
     ```sql
     CREATE TABLE PE_MACHINES (
         ...
         is_active       BIT DEFAULT 1,
         ...
     );
     ```
     There is no column named `active` in `PE_MACHINES`, only `is_active`.

3. **Observation C: Migration Engine Schema Errors**
   - In `page/PE/api/migrate_legacy.php`:
     - Line 23: `WHERE legacy_id = ?` (on `PE_DOWNTIME_LOG_TABLE`)
     - Line 33: `(..., notes, legacy_id)` (on `PE_DOWNTIME_LOG_TABLE`)
     - Line 65: `WHERE legacy_id = ?` (on `PE_WORK_ORDERS_TABLE`)
     - Line 120: `(..., action_taken, image_path, photo_after, legacy_id)`
     - Lines 149-150: `ON PE.legacy_id = MR.id` (joining `PE_WORK_ORDERS_TABLE`)
     - Line 157: `$row['legacy_id']`
   - In `page/PE/sql/create_pe_tables.sql`:
     - `PE_DOWNTIME_LOG` defines `legacy_sc_id INT NULL` (line 96). There is no `legacy_id` column.
     - `PE_WORK_ORDERS` defines `legacy_mt_id INT NULL` (line 65). There is no `legacy_id` column.
     - `PE_WORK_ORDERS` defines `photo_before NVARCHAR(500)` (line 50). There is no `image_path` column.

4. **Observation D: Hardcoded IDE Session Paths in `alter_sps.js`**
   - In `alter_sps.js` (lines 23-26):
     ```javascript
     processSP('C:\\Users\\naphat-noo\\.gemini\\antigravity-ide\\brain\\01d316f5-c021-4b37-9d65-b1c7099555fa\\.system_generated\\steps\\297\\output.txt', 'sp_CalculateOEE_Dashboard_PieChart');
     ```
     This relies on transient step outputs. The output SQL files (`alter_*.sql`) are not checked into the codebase.

---

## 2. Logic Chain
1. **MQTT Telemetry Ingestion**: The daemon configuration in `iiot_service.py` exposes DB server credentials and depends on OS-level SQL Server drivers via `pyodbc`. The existance of the API endpoint `iiotAPI.php?action=update_telemetry` allows receiving payloads and handling DB interaction. Converting `iiot_service.py` to HTTP POST to the API endpoint fulfills the documented design and decouples the daemon.
2. **Trigger Compilation**: The trigger in `machine-oee-setup.sql` joins `PE_MACHINES` and filters on `m.active`. Since `PE_MACHINES` only has `is_active`, the compilation fails. Changing the query to `m.is_active` resolves this error.
3. **Migration Scripts**: The column names used in queries inside `migrate_legacy.php` (`legacy_id` and `image_path`) do not match the columns declared in `create_pe_tables.sql` (`legacy_sc_id` / `legacy_mt_id` and `photo_before`). Running the script causes database execution crashes. Correcting the column names in the PHP script aligns it with the DB schema.
4. **Reproducible SQL**: The script `alter_sps.js` depends on absolute folder paths to temporary step directories. This means the stored procedures cannot be recompiled on other developer environments. Extracting the SQL code for these stored procedures and tracking them in version control makes the deployment process stable and reproducible.

---

## 3. Caveats
- We assume that the database has other tables (e.g. `MANPOWER_CALENDAR` and `STOP_CAUSES`) already present or configured in the system since they are referenced in the stored procedures but not created in `create_pe_tables.sql`.
- We assume the web application is deployed locally at `/MES/` which is the default directory mapping for the PHP endpoints.

---

## 4. Conclusion
We recommend implementing the remediation strategy outlined in `analysis.md` to:
1. Align the Python daemon (`iiot_service.py`) by replacing its `pyodbc` database connection with HTTP POST requests to `iiotAPI.php`.
2. Correct `m.active` to `m.is_active` in `machine-oee-setup.sql`.
3. Align target columns in `migrate_legacy.php` with `create_pe_tables.sql`.
4. Delete `alter_sps.js` and track the four corrected stored procedures directly under `page/PE/sql/procedures/`. Update `execute_sps.php` to deploy them from this location.

---

## 5. Verification Method
1. **Trigger Compilation**: Compile `machine-oee-setup.sql` against a SQL Server database. Check that compilation completes without column identifier errors.
2. **Legacy Migration**: Run `php page/PE/api/migrate_legacy.php?action=run_migration` (or issue an HTTP GET to it) and verify the response is `{success: true}` with non-zero counters for migrated entries.
3. **Stored Procedures**: Deploy the SQL files by running `php execute_sps.php` and verify that all four procedures (`sp_CalculateOEE_Dashboard_PieChart`, `sp_CalculateOEE_Dashboard_LineChart`, `sp_CalculateOEE_Hourly_Trend`, and `sp_GetDailyProductionSummary`) are successfully registered in the database.
4. **IIoT Service**: Run `python script/iiot_service.py` and verify it receives MQTT events and successfully triggers HTTP POST requests to `iiotAPI.php` without database driver errors. Check the `PE_IIOT_TELEMETRY` table to verify live counts.
