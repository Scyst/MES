## 2026-06-13T01:45:28Z
You are the Worker (generation 2).
Your working directory is: e:\MES\MES\MES\.agents\teamwork_preview_worker_milestone1_2
Your mission is to execute the codebase and architecture map remediation changes defined in the synthesis report.

Specifically, implement the following changes:
1. Modify `e:\MES\MES\MES\script\iiot_service.py` to replace the `pyodbc` database connection and direct query execution with an HTTP POST request to the `iiotAPI.php?action=update_telemetry` endpoint using the `urllib.request` standard library, as specified in the synthesis report.
2. In `e:\MES\MES\MES\machine-oee-setup.sql` line 83, modify trigger filter column name from `m.active` to `m.is_active`.
3. In `e:\MES\MES\MES\page\PE\api\migrate_legacy.php`, update database column mappings:
   - Change `legacy_id` on the downtime table query to `legacy_sc_id`.
   - Change `legacy_id` on the work order table query to `legacy_mt_id`.
   - Change `image_path` on the work order table query to `photo_before`.
4. Stored Procedure Improvements:
   - Delete `e:\MES\MES\MES\alter_sps.js` entirely.
   - Create the directory `e:\MES\MES\MES\page\PE\sql\stored_procedures/` if it doesn't exist.
   - Create the following four stored procedure SQL files in that directory with the exact SQL scripts provided in the synthesis report (`e:\MES\MES\MES\.agents\orchestrator\synthesis.md` or Explorer 1 gen2's analysis report):
     - `page/PE/sql/stored_procedures/sp_CalculateOEE_Dashboard_PieChart.sql`
     - `page/PE/sql/stored_procedures/sp_CalculateOEE_Dashboard_LineChart.sql`
     - `page/PE/sql/stored_procedures/sp_CalculateOEE_Hourly_Trend.sql`
     - `page/PE/sql/stored_procedures/sp_GetDailyProductionSummary.sql`
   - Rewrite `e:\MES\MES\MES\execute_sps.php` to load and execute these SQL files from `page/PE/sql/stored_procedures/` directly, matching the script in the synthesis report.
5. In `e:\MES\MES\MES\docs\architecture_map.md`, verify that the visual diagram and text description remain correct and fully aligned with the HTTP POST telemetry ingestion flow (instead of pyodbc database inserts).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

When done, write a handoff report (handoff.md) in your working directory and notify the orchestrator (0106cfdc-38be-4d89-90e4-eea98bcaee50) with the list of changes made.
