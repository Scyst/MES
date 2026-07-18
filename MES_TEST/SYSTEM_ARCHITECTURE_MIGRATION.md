# 🏗️ MES System Architecture & Migration Plan

This document outlines the architectural shift from the legacy manual production logging system to the modern IIoT machine-level tracking system, and the future transition towards a unified React-based frontend.

---

## 1. The Core Paradigm Shift: Production Logging

### 🟥 Old Paradigm (Manual Batch Logging)
**Location:** `e:\MES\MES\MES\page\production`
- **How it works:** Operators manually type production numbers (Yield, Scrap, Hold) at the end of a shift or job using `productionUI.php` or the legacy `mobile_app.php`.
- **Data Storage:** Data is directly inserted into the `STOCK_TRANSACTIONS` table with generic transaction types like `PRODUCTION_FG` (Finished Goods), `PRODUCTION_HOLD`, and `PRODUCTION_SCRAP`.
- **The Problem:** It lacks granularity. The system knows *how many* items were produced, but it cannot accurately trace *which specific machine* produced them, at *what exact second*, or what the real-time efficiency (OEE) was during production.

### 🟩 New Paradigm (Automated Machine-Level Logging)
**Location:** `e:\MES\MES\MES\page\PE`
- **How it works:** Simulates a Single Page Application (SPA) using vanilla JavaScript modules (`peApp.js`).
- **Data Storage:** Uses `PE_IIOT_TELEMETRY` and `PE_IIOT_TELEMETRY_HISTORY` to track the `live_counter` of each individual machine.
- **The Solution:** Production is now tracked automatically via IIoT sensors polling every 3 seconds. The system accurately calculates real-time **Availability, Performance, and Quality (OEE)** on a per-machine basis. It bridges the gap between Inventory (Stock) and Equipment (Machines).

---

## 2. Core Data Structure Mapping

To plan migrations and API rewrites, developers must understand how the legacy schema maps to the modern schema.

### 2.1 Legacy Production Schema (`STOCK_TRANSACTIONS`)
Used by `page/production`. This table focuses on physical inventory movement.
- `transaction_type`: e.g., `'PRODUCTION_FG'`, `'PRODUCTION_SCRAP'`.
- `quantity`: The total amount produced in a batch.
- `to_location_id`: Where the goods were sent (e.g., Finished Goods Warehouse).
- `reference_id`: Tied to a Job Order or Work Order.
- `machine_id`: **(NEWLY ADDED)** This column exists in the database but is currently bypassed by the legacy Stored Procedure `dbo.sp_ExecuteProduction`.

### 2.2 Modern IIoT Schema (`PE_IIOT_TELEMETRY`)
Used by `page/PE`. This table focuses on real-time equipment status.
- `machine_code`: The unique identifier of the equipment (e.g., `M-01`).
- `live_counter`: **(CRITICAL DISTINCTION)** This is the number of **machine strokes** (or cycles), NOT the actual finished goods yield. It is used for calculating OEE (Availability, Performance), machine lifespan, and preventative maintenance.
- `live_status`: Current state (`running`, `stopped`, `warning`).
- `last_updated`: Timestamp of the last 3-second poll.
- **Integration Strategy:** `PE_IIOT_TELEMETRY` (Strokes/Maintenance) and `STOCK_TRANSACTIONS` (Actual Yield) will remain separate. The key change is that manual yield entries are now tied to a specific `machine_id` instead of a generic Production Line.

---

## 3. Safe Migration Plan for `dbo.sp_ExecuteProduction`

Currently, `mes-mobile-app` uses a temporary hack to associate production with a machine because `dbo.sp_ExecuteProduction` does not accept `@machine_id`. It injects a token into `notes`, executes the SP, and then runs a subsequent `UPDATE` statement to set the `machine_id`. 

To eliminate this hack safely without breaking legacy systems (like `page/production`), follow this exact plan:

### Step 1: Modify the Stored Procedure Parameters
Alter `dbo.sp_ExecuteProduction` to accept `@machine_id` as an **optional** parameter by giving it a default value of `NULL`.
```sql
ALTER PROCEDURE [dbo].[sp_ExecuteProduction]
    @item_id INT,
    @location_id INT,
    @quantity DECIMAL(18,4),
    @count_type VARCHAR(50),
    @lot_no VARCHAR(100) = NULL,
    @notes NVARCHAR(500) = NULL,
    @timestamp DATETIME = NULL,
    @start_time TIME = NULL,
    @end_time TIME = NULL,
    @user_id INT = NULL,
    @username VARCHAR(100) = NULL,
    @machine_id INT = NULL -- [NEW] Optional parameter
AS
BEGIN
...
```

### Step 2: Update the INSERT Statement inside the SP
Inside the SP, find the `INSERT INTO STOCK_TRANSACTIONS` block and add `@machine_id` to it. Since it defaults to `NULL`, legacy callers won't crash and will simply insert `NULL` for `machine_id`, preserving backward compatibility.

### Step 3: Refactor the Frontend APIs
Once the SP is updated, modify `mes-mobile-app/public/api/v1/production_logs.php` to pass the `@machine_id` directly to `$spProd->execute()`.
- Remove the `uniqid()` token logic entirely.
- Remove the subsequent `UPDATE STOCK_TRANSACTIONS SET machine_id = ? WHERE notes = ?` query.

This 3-step process ensures 100% backward compatibility while making the `mes-mobile-app` codebase cleaner and more performant.

---

## 4. Frontend Modernization & Mobile Apps

### 📱 Legacy Mobile Web
**Location:** `e:\MES\MES\MES\page\production\mobile_app.php`
- A standard PHP Server-Side Rendered (SSR) page. Requires session state (`$_SESSION`) and reloads on every interaction. Hard to maintain as a native-feeling app for floor operators.

### 🚀 Modern PWA Mobile App
**Location:** `e:\MES\MES\MES\mes-mobile-app`
- **Stack:** React + Vite + Capacitor + TailwindCSS.
- **Purpose:** A true Progressive Web App (PWA) that can be installed on Android/iOS devices used by operators on the factory floor. Features like barcode scanning (`html5-qrcode`) run instantly on the client side, communicating with the PHP backend via stateless REST APIs.

---

## 3. The Future Vision: `mes-toolbox`

### 🔧 The Next Generation Frontend
**Location:** `e:\MES\MES\MES\mes-toolbox`
- **Stack:** React + Vite + TailwindCSS.
- **The Goal:** Currently, the MES system is fragmented across different PHP modules (e.g., `page/production`, `page/PE`, `page/storeManagement`). While `page/PE` simulates an SPA using vanilla JS, it is still fundamentally bound to PHP routing.
- **The Plan:** `mes-toolbox` will serve as the unified, enterprise-grade React SPA that completely replaces all legacy PHP views. 
- **Migration Strategy:**
  1. Freeze UI development on legacy PHP pages.
  2. Ensure all PHP files act purely as API endpoints returning JSON.
  3. Rebuild the `PE Map Builder`, `Production Job Queues`, and `Store Management` as modular React components inside `mes-toolbox`.

---

## 4. Integration Challenges & Action Items

To ensure a seamless transition from the Old to the New system, the following challenges must be addressed:

- **[x] Update Legacy SPs:** Execute the 3-step safe migration plan for `dbo.sp_ExecuteProduction` so we can permanently move away from the `notes` hack and properly enforce `machine_id` integrity. (Completed)
- **[x] Consolidate Yield vs. Strokes:** Ensure the BI Dashboard can overlay the actual Yield (from `STOCK_TRANSACTIONS`) against the Machine Strokes (from `PE_IIOT_TELEMETRY`) to accurately measure Quality and real-world efficiency per machine. (Completed)
- **[ ] Legacy App Sunset:** Plan a hard cutoff date to decommission `page/production/mobile_app.php` and force all operators to use the new `mes-mobile-app`.

---

## 4. SAP Integration Architecture (Added July 2026)

To pull live data from SNC-SAP, we have introduced a secondary Database Connection module specifically targeting the ERP system.

### 4.1 Connection details
- **Location:** page/sap_db.php`n- **Pattern:** Using PDO with sqlsrv connected to 10.0.0.4.
- **Target Database:** SNC-SAP`n- **Use Case:** Real-time visibility into Operation Slips (View_OperationSlip_1820) and Stock Levels (View_SAP_ALL_STOCK_1820).

### 4.2 Data Fetching (page/SAP_Sync)
- **Frontend:** A modern UI module (page/SAP_Sync/index.php) fetching data asynchronously.
- **Backend:** page/SAP_Sync/api/get_sap_data.php provides JSON responses.
- **Strategy:** Read-only access to SAP Views. Does NOT duplicate data into the MES SQL Server unless explicitly required by future sync agents.

