# Handoff Report: Architecture Map Design Strategy

## 1. Observation
We observed the following files and code snippets in the `e:\MES\MES\MES` workspace:

- **Project Context (`e:\MES\MES\MES\PROJECT.md`):**
  - Defines the core architecture transition: "This project visualizes the transition from a line-based production recording system to a machine-based system. Data flows from individual machine nodes to legacy and new components instead of generic line-level aggregation."
  - Identifies the key components:
    - Legacy Systems: `page/production`, `page/OEE_Dashboard`
    - New Systems: `page/PE`, `mes-mobile-app`
  - Defines Milestone 1: "Generate architecture_map.md containing the Mermaid diagram under e:\MES\MES\MES\docs\"

- **Original Request (`e:\MES\MES\MES\.agents\ORIGINAL_REQUEST.md`):**
  - Specifies the acceptance criteria for `architecture_map.md`:
    - Contains a syntactically valid `mermaid` code block.
    - All 4 specific systems (`page/PE`, `mes-mobile-app`, `page/OEE_Dashboard`, `page/production`) are present as distinct nodes.
    - The diagram structurally shows "Machine" nodes feeding data into the systems, rather than generic "Line" nodes.
    - Visually structures the workflow into distinct phases (Incoming, Production, Outgoing).

- **Database Setup (`e:\MES\MES\MES\machine-oee-setup.sql`):**
  - Line 4-15: Creates `MACHINE_SCHEDULES` containing `machine_id` and linking to `LINE_SCHEDULES`.
  - Line 57-84: Creates a database trigger `trg_AutoCreateMachineSchedules` on `LINE_SCHEDULES` that automatically generates corresponding `MACHINE_SCHEDULES` for active machines mapped to the line.
  - Line 19-37: Alters legacy tables `STOP_CAUSES` and `MAINTENANCE_REQUESTS` to add `machine_id`.

- **New Mobile App API (`e:\MES\MES\MES\mes-mobile-app/public/api/v1/production_logs.php`):**
  - Line 117-132: Shows a post-execution update workaround:
    ```php
    $note = "[MACHINE:" . ($machineId ?: '') . "] Mobile App " . time();
    ...
    if ($add_actual > 0) $spProd->execute([$job['item_id'], $locToUse, $add_actual, 'FG', $job['job_no'], $note, $ts, $st, $et, $userId, 'Mobile']);
    ...
    if ($machineId) {
        $pdo->prepare("UPDATE " . TRANSACTIONS_TABLE . " SET machine_id = ? WHERE notes = ?")
            ->execute([$machineId, $note]);
    }
    ```
    This indicates that the stored procedure `sp_ExecuteProduction` does not support a `machine_id` parameter directly, requiring a direct SQL update.

- **Legacy UI API (`e:\MES\MES\MES\page/production/api/inventoryManage.php`):**
  - Line 654-656: Implements the exact same post-execution update workaround to set `machine_id` on the generated stock transaction:
    ```php
    if ($last_txn_id && $machine_id) {
        $updateMachineStmt = $pdo->prepare("UPDATE " . TRANSACTIONS_TABLE . " SET machine_id = ? WHERE transaction_id = ?");
        $updateMachineStmt->execute([$machine_id, $last_txn_id]);
    }
    ```

- **Legacy Analytics (`e:\MES\MES\MES\page/OEE_Dashboard/api/oeeDashboardApi.php`):**
  - Line 31-32: Calls OEE stored procedures (like `sp_CalculateOEE_Dashboard_PieChart`) passing the `@MachineId` parameter.

- **New PE Enterprise Portal (`e:\MES\MES\MES\page/PE/index.php` and `migrate_legacy.php`):**
  - Integrates machine-based Work Orders (`PE_WORK_ORDERS`), Downtime Tracker (`PE_DOWNTIME_LOG`), Live IIoT Monitor, and IIoT OEE Dashboard.
  - Migrates legacy data (`STOP_CAUSES` -> `PE_DOWNTIME_LOG` and `MAINTENANCE_REQUESTS` -> `PE_WORK_ORDERS`) using `migrate_legacy.php`.

---

## 2. Logic Chain
1. **R1. Phase Division:** The transition sequence spans from planning to production execution, and finally to metrics display. Therefore, the visual structure of the architecture map must be organized into:
   - **Phase 1: Incoming / Planning** (defining schedules and jobs, automatically mapping lines to machines).
   - **Phase 2: Production / Recording** (handling actual logging by operators and capturing downtime/maintenance/IIoT).
   - **Phase 3: Outgoing / Analytics** (aggregating and displaying metrics via dashboards).
2. **R2. Machine-Based Focus:** Rather than showing lines as the end-nodes, physical machines (`Machine A`, `Machine B`) must be modeled as the core data sources. This aligns with the trigger mapping `LINE_SCHEDULES` to `MACHINE_SCHEDULES`, the APIs updating `machine_id` in `STOCK_TRANSACTIONS`, and the OEE procedures using the `@MachineId` parameter.
3. **R3. System Integration:**
   - **New components** (`mes-mobile-app`, `page/PE`, `PE_DOWNTIME_LOG`, `PE_WORK_ORDERS`) and **legacy components** (`page/production`, `page/OEE_Dashboard`, `STOP_CAUSES`, `MAINTENANCE_REQUESTS`) must coexist.
   - The map must illustrate how both new and legacy APIs interface with the same core database objects (`sp_ExecuteProduction`, `STOCK_TRANSACTIONS`).
   - The migration path (`migrate_legacy.php`) from legacy tables to new PE tables must be clearly depicted.
4. **Syntax Validity:** Node labels containing special symbols (slashes, parentheses, HTML line breaks) can break Mermaid parsing. Enclosing labels in double quotes (e.g., `Node["label"]`) is the optimal strategy to ensure 100% syntax compatibility.

---

## 3. Caveats
- **Database Connection Constraints:** We did not run live database scripts or check actual database values on the SQL Server, since we are a read-only explorer agent. We assume the SQL Server behaves according to the sql scripts (`machine-oee-setup.sql`, `work-tracker-sql-setup.sql`).
- **External Network Access:** We operated under CODE_ONLY mode, meaning we relied entirely on local files and did not check any external documentation or websites.

---

## 4. Conclusion
We recommend that the orchestrator or implementer agent create `e:\MES\MES\MES\docs\architecture_map.md` using the design strategy and Mermaid diagram detailed in `e:\MES\MES\MES\.agents\teamwork_preview_explorer_milestone1_3\analysis.md`. This diagram cleanly visualizes the transition, groups the systems into Incoming, Production, and Outgoing phases, models the machine-level data flow, and clearly integrates all 4 legacy and new systems.

---

## 5. Verification Method
To verify this strategy:
1. **Content Matching:** Open and read `analysis.md` and check that all findings correspond directly to the source code paths and line numbers cited.
2. **Mermaid Rendering Check:** Copy the Mermaid code block from `analysis.md` (Section 3.1) and paste it into a Mermaid live editor (e.g., [mermaid.live](https://mermaid.live)) or render it locally to ensure there are no syntax errors and the layout renders successfully.
3. **Path Verification:** Inspect `e:\MES\MES\MES\docs\` to ensure `architecture_map.md` does not yet exist (as Explorer 3 is read-only and must not create it).

---

## 6. Remaining Work
- The next agent (Implementer) must create `e:\MES\MES\MES\docs\architecture_map.md`.
- Write the exact Markdown content (with the recommended Mermaid diagram) to that file.
- Validate that the file compiles successfully and that the diagram renders correctly.
