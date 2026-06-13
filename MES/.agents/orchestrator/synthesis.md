# Synthesis Report: Codebase & Architecture Map Remediation (Iteration 1)

This report defines the consensus remediation strategy to address the four integrity violations identified by the Forensic Auditor.

## Consensus Remediation Plan

### 1. Telemetry Pipeline Alignment (`script/iiot_service.py` & `page/PE/api/iiotAPI.php`)
- **Fix**: Modify `script/iiot_service.py` to post JSON telemetry payloads to the HTTP endpoint `page/PE/api/iiotAPI.php?action=update_telemetry` via Python's standard library `urllib.request`.
- **Reasoning**: This eliminates the `pyodbc` database bypass, removes credential duplication, and aligns the Python daemon execution with the diagrammed architecture flow in `docs/architecture_map.md`.

### 2. Trigger Compilation Error (`machine-oee-setup.sql`)
- **Fix**: Modify trigger `trg_AutoCreateMachineSchedules` in `machine-oee-setup.sql` line 83 to join and filter using `m.is_active = 1` instead of `m.active = 1`.
- **Reasoning**: `PE_MACHINES` registry uses `is_active` as the boolean column name. This resolves the compilation error.

### 3. Migration Utility Schema Mismatches (`page/PE/api/migrate_legacy.php`)
- **Fix**: Correct columns in `migrate_legacy.php`:
  - Replace `legacy_id` with `legacy_sc_id` for downtime log table imports.
  - Replace `legacy_id` with `legacy_mt_id` for work order table imports.
  - Replace `image_path` with `photo_before` for work order imports.
- **Reasoning**: Matches the database schema defined in `page/PE/sql/create_pe_tables.sql` and resolves runtime database execute failures.

### 4. Hardcoded Stored Procedure Paths & Reproducibility (`execute_sps.php` & `alter_sps.js`)
- **Fix**: 
  - Delete `alter_sps.js` entirely.
  - Extract the clean, parameter-ready SQL definitions of the four OEE stored procedures (`sp_CalculateOEE_Dashboard_PieChart`, `sp_CalculateOEE_Dashboard_LineChart`, `sp_CalculateOEE_Hourly_Trend`, and `sp_GetDailyProductionSummary`) and save them under `page/PE/sql/stored_procedures/`.
  - Rewrite `execute_sps.php` to load and run these clean SQL files directly from `page/PE/sql/stored_procedures/` to rebuild the SPs in the database.
- **Reasoning**: Eliminates dependency on transient developer IDE session paths, enables clean git tracking of procedures, and ensures reproducibility.

---

## Final Mermaid Diagram for `docs/architecture_map.md`
The diagram remains correct but the text details the exact HTTP POST interface for IIoT telemetry ingestion rather than a database shortcut.
