# Architecture Analysis Report: Line-Based to Machine-Based Transition

## Core Summary
The transition from line-based to machine-based production recording in the MES is implemented via database schema adaptations (trigger-driven machine schedules and added `machine_id` columns), backend post-processing workarounds (due to legacy stored procedure limitations), and corresponding UI upgrades in both legacy pages (`page/production`, `page/OEE_Dashboard`) and new systems (`page/PE`, `mes-mobile-app`). Legacy data is consolidated into new modern PE tables (`PE_DOWNTIME_LOG` and `PE_WORK_ORDERS`) via migration scripts.

---

## 1. System Components & Key Configurations

### 1.1 Legacy Systems vs. New Systems

| System / Component | Path / Context | Status | Role & Integration Details |
|---|---|---|---|
| **page/production** | `page/production/productionUI.php` | Legacy | Shop Floor & Inventory UI. Has been retrofitted with a Machine dropdown filter and table columns to support machine-level tracing. |
| **page/OEE_Dashboard**| `page/OEE_Dashboard/OEE_Dashboard.php` | Legacy | OEE analytics dashboard. Updated to allow filtering by machine and executing OEE stored procedures with a `@MachineId` parameter. |
| **page/PE** | `page/PE/index.php` | New | PE Enterprise portal containing the new Machine Registry, Work Orders, Downtime Tracker, Spare Parts, Live IIoT Monitor, and IIoT OEE Dashboard. |
| **mes-mobile-app** | `mes-mobile-app/` | New | Operator mobile app (React/Vite). Operators select/scan machines and log production quantities (FG, HOLD, SCRAP) directly against active jobs at the machine level. |

### 1.2 Core Database Entities

| Table Name | Configuration Constant | Transition / Role |
|---|---|---|
| `LINE_SCHEDULES` | `SCHEDULES_TABLE` | Legacy line-level planning data. |
| `MACHINE_SCHEDULES` | *N/A* | New machine-level schedule table containing `machine_id` and linking back to `LINE_SCHEDULES` via `line_schedule_id`. |
| `PE_MACHINES` | `PE_MACHINES_TABLE` | New centralized machine registry mapping machines to production lines. |
| `STOCK_TRANSACTIONS`| `TRANSACTIONS_TABLE` | Inventory transaction log. Retrofitted with a `machine_id` column for tracing. |
| `STOP_CAUSES` | `STOP_CAUSES_TABLE` | Legacy downtime log table, now retrofitted with a `machine_id` column. |
| `MAINTENANCE_REQUESTS`| `MAINTENANCE_REQUESTS_TABLE`| Legacy maintenance requests, now retrofitted with a `machine_id` column. |
| `PE_DOWNTIME_LOG` | `PE_DOWNTIME_LOG_TABLE` | New structured PE downtime tracking table (migrated from `STOP_CAUSES`). |
| `PE_WORK_ORDERS` | `PE_WORK_ORDERS_TABLE` | New structured PE work order table (migrated from `MAINTENANCE_REQUESTS`). |

---

## 2. Transition Logic & Call Chains

### 2.1 Incoming / Planning Phase
When a production plan is launched at the line level, it is written to `LINE_SCHEDULES`. A SQL database trigger, `trg_AutoCreateMachineSchedules`, is defined to automatically generate machine-level schedules:

- **Source Code Reference (`machine-oee-setup.sql:57-84`):**
```sql
CREATE TRIGGER trg_AutoCreateMachineSchedules
ON LINE_SCHEDULES
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO MACHINE_SCHEDULES (
        line_schedule_id, 
        machine_id, 
        production_date, 
        shift, 
        planned_time_mins, 
        actual_time_mins, 
        status
    )
    SELECT 
        i.schedule_id,
        m.machine_id,
        i.production_date,
        i.shift,
        i.planned_time_mins,
        i.actual_time_mins,
        'Scheduled'
    FROM inserted i
    JOIN PE_MACHINES m ON m.line = i.line
    WHERE m.active = 1; -- Only create schedule for active machines
END
```

### 2.2 Production / Recording Phase
When logging production quantities, the core stored procedure `sp_ExecuteProduction` is utilized. Because this legacy SP does not support `machine_id` as an input parameter, both the legacy inventory API (`inventoryManage.php`) and the new mobile app API (`production_logs.php`) implement a **post-execution update workaround**:
1. Execute `sp_ExecuteProduction` with a unique transaction notes pattern.
2. Run a subsequent SQL `UPDATE` statement on `STOCK_TRANSACTIONS` to bind the generated transaction to the `machine_id`.

- **Mobile App API Implementation (`mes-mobile-app/public/api/v1/production_logs.php:117-132`):**
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

- **Legacy Inventory API Implementation (`page/production/api/inventoryManage.php:654-656`):**
```php
if ($last_txn_id && $machine_id) {
    $updateMachineStmt = $pdo->prepare("UPDATE " . TRANSACTIONS_TABLE . " SET machine_id = ? WHERE transaction_id = ?");
    $updateMachineStmt->execute([$machine_id, $last_txn_id]);
}
```

### 2.3 Downtime & Maintenance Migration
Legacy unstructured events recorded in `STOP_CAUSES` and `MAINTENANCE_REQUESTS` are systematically migrated to the new structured PE portal tables (`PE_DOWNTIME_LOG` and `PE_WORK_ORDERS`) via the `migrate_legacy.php` utility.
- **Source Code Reference (`page/PE/api/migrate_legacy.php:32-34` & `118-121`):**
  - Migrates `STOP_CAUSES` to `PE_DOWNTIME_LOG` mapping the legacy columns to new fields, tracking the machine by name/ID.
  - Migrates `MAINTENANCE_REQUESTS` to `PE_WORK_ORDERS`, auto-generating work order numbers (e.g. `WO-YYYYMMDD-XXX`) and copying binary files (before/after repair images).

---

## 3. Recommended Design Strategy for architecture_map.md

To present a comprehensive and visually clear architectural transition that addresses all user requirements, we recommend implementing the following structured Mermaid diagram in `e:\MES\MES\MES\docs\architecture_map.md`:

### 3.1 Recommended Mermaid Code Block

```mermaid
graph TD
    %% Define Styles & Classes
    classDef legacy fill:#f9f,stroke:#333,stroke-width:2px;
    classDef new fill:#bbf,stroke:#333,stroke-width:2px;
    classDef db fill:#ffd,stroke:#333,stroke-dasharray: 5 5;
    classDef physical fill:#dfd,stroke:#333,stroke-width:2px;
    classDef phase fill:#f2f2f2,stroke:#ccc,stroke-width:1px;

    %% Subgraphs for Phases (R1 Phase Division)
    subgraph Phase_Incoming ["1. Incoming & Planning Phase"]
        style Phase_Incoming fill:#f5f5f5,stroke:#bbb,stroke-width:1px;
        LineSchedule["LINE_SCHEDULES Table"] -->|Trigger: trg_AutoCreateMachineSchedules| MachineSchedule["MACHINE_SCHEDULES Table"]
        PE_Machines["PE_MACHINES Registry"] -.->|Used by Trigger| MachineSchedule
        JobOrders["PRODUCTION_JOBS Table"]
    end

    subgraph Phase_Production ["2. Production & Recording Phase"]
        style Phase_Production fill:#fafafa,stroke:#bbb,stroke-width:1px;
        
        %% Physical Sources & Devices (R2 Machine-Based Focus)
        subgraph Physical_Sources ["Physical Sources"]
            MachineA["Machine A (e.g., Press)"]
            MachineB["Machine B (e.g., Assembly)"]
        end

        %% New Recording Systems (R3 System Integration)
        subgraph New_Production_Recording ["New Recording Interface (Machine Focus)"]
            MobileApp["mes-mobile-app (React)"]
            ProdLogsAPI["production_logs.php API"]
            MobileApp -->|1. Scan QR / Select Machine| MachineA
            MobileApp -->|2. Log Production (FG/HOLD/SCRAP)| ProdLogsAPI
        end

        %% Legacy Recording Systems (R3 System Integration)
        subgraph Legacy_Production_Recording ["Legacy Recording Interface (Retrofitted)"]
            LegacyUI["page/production (productionUI.php)"]
            InvManageAPI["inventoryManage.php API"]
            LegacyUI -->|Log Production with Machine Select| InvManageAPI
        end

        %% Execution Flow
        ProdLogsAPI -->|3. Run sp_ExecuteProduction| SP_Exec["sp_ExecuteProduction SP"]
        InvManageAPI -->|Run sp_ExecuteProduction| SP_Exec

        SP_Exec -->|4. Insert Log| StockTxn["STOCK_TRANSACTIONS Table"]
        
        %% Post-Execution Update
        ProdLogsAPI -->|5. Update machine_id| StockTxn
        InvManageAPI -->|Update machine_id| StockTxn

        %% Downtime & Maintenance Mapping
        LegacyDowntime["Legacy: STOP_CAUSES"] -->|Migration: migrate_legacy.php| NewDowntime["PE_DOWNTIME_LOG Table"]
        LegacyMaint["Legacy: MAINTENANCE_REQUESTS"] -->|Migration: migrate_legacy.php| NewMaint["PE_WORK_ORDERS Table"]
        
        MachineA -.->|Record downtime / faults| LegacyDowntime
        MachineB -.->|Record downtime / faults| LegacyDowntime
        
        IIoT["IIoT Sensors"] -->|Live Stream| IIoT_API["iiotAPI.php"]
    end

    subgraph Phase_Outgoing ["3. Outgoing & Analytics Phase"]
        style Phase_Outgoing fill:#f5f5f5,stroke:#bbb,stroke-width:1px;
        
        %% Legacy Reporting (R3 System Integration)
        subgraph Legacy_Reporting ["Legacy Analytics"]
            LegacyDashboard["page/OEE_Dashboard (OEE_Dashboard.php)"]
            OEEDashAPI["oeeDashboardApi.php / oeeShopfloorApi.php"]
            LegacyDashboard --> OEEDashAPI
        end
        
        %% New Reporting (R3 System Integration)
        subgraph New_Reporting ["New Analytics"]
            PEPortal["page/PE Portal (index.php)"]
            PE_Downtime["Downtime & Timeline API"]
            PEPortal --> PE_Downtime
        end

        %% Data Querying
        OEEDashAPI -->|Calculate OEE with @MachineId| OEE_SPs["OEE Calculation SPs <br> (sp_CalculateOEE_Dashboard_PieChart, etc.)"]
        
        StockTxn --> OEE_SPs
        NewDowntime --> OEE_SPs
        
        StockTxn --> PE_Downtime
        NewDowntime --> PE_Downtime
        NewMaint --> PE_Downtime
        IIoT_API --> PEPortal
    end

    %% Apply Styles
    class LegacyUI,LegacyDashboard,LegacyDowntime,LegacyMaint legacy;
    class MobileApp,PEPortal,NewDowntime,NewMaint new;
    class LineSchedule,MachineSchedule,StockTxn,JobOrders,PE_Machines db;
    class MachineA,MachineB,IIoT physical;
```

### 3.2 Strategy Justification
1. **R1. Phase Division**: The subgraphs explicitly split the transition into three stages (Incoming/Planning, Production/Recording, and Outgoing/Analytics), tracing the path of the schedule down to physical records and up to OEE visualization.
2. **R2. Machine-Based Focus**: The diagram shows physical machines (`Machine A`, `Machine B`) as the primary origin of logging events. It also details:
   - The database trigger mapping line schedules down to machine schedules.
   - The two-step transaction writing pattern where `machine_id` is updated on the transactions.
   - The OEE calculation SPs accepting `@MachineId` directly.
3. **R3. System Integration**: It clearly separates legacy components (`page/production`, `page/OEE_Dashboard`, `STOP_CAUSES`, `MAINTENANCE_REQUESTS`) in pink/legacy styled boxes, and new components (`mes-mobile-app`, `page/PE`, `PE_DOWNTIME_LOG`, `PE_WORK_ORDERS`) in blue/new styled boxes, demonstrating the co-existence and connection paths between them.
4. **Syntax Robustness**: All labels are enclosed in double quotes (`""`) to prevent any character parsing errors (such as brackets, parentheses, or slashes) in standard Mermaid renderers.
