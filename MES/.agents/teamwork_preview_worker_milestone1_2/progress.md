# Progress Log

Last visited: 2026-06-13T01:48:15Z

- [x] Initialized briefing and original request.
- [x] Explored and located the synthesis report and Explorer's analysis reports containing the SQL procedures.
- [x] Modified `script/iiot_service.py` to replace `pyodbc` database connection and direct query execution with HTTP POST requests via Python's standard `urllib.request` library.
- [x] Fixed compilation error in `machine-oee-setup.sql` by changing `m.active` to `m.is_active` in trigger filter.
- [x] Corrected database column mapping mismatches in `page/PE/api/migrate_legacy.php` (`legacy_id` -> `legacy_sc_id`/`legacy_mt_id` and `image_path` -> `photo_before`).
- [x] Deleted `alter_sps.js` entirely.
- [x] Created `page/PE/sql/stored_procedures/` directory and saved the four OEE stored procedures as clean, version-controlled SQL files:
  - `sp_CalculateOEE_Dashboard_PieChart.sql`
  - `sp_CalculateOEE_Dashboard_LineChart.sql`
  - `sp_CalculateOEE_Hourly_Trend.sql`
  - `sp_GetDailyProductionSummary.sql`
- [x] Rewrote `execute_sps.php` to deploy stored procedures directly from `page/PE/sql/stored_procedures/`.
- [x] Verified `docs/architecture_map.md` visual diagram and text description are correct and aligned with HTTP POST telemetry ingestion flow.
