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
- **Limitation:** There is no `machine_id` column natively tied to this that is updated in real-time.

### 2.2 Modern IIoT Schema (`PE_IIOT_TELEMETRY`)
Used by `page/PE`. This table focuses on real-time equipment status.
- `machine_code`: The unique identifier of the equipment (e.g., `M-01`).
- `live_counter`: The total cumulative production count measured directly by the PLC/sensor.
- `live_status`: Current state (`running`, `stopped`, `warning`).
- `last_updated`: Timestamp of the last 3-second poll.
- **Integration Target:** Future architecture must take the delta of `live_counter` (e.g., +100 units) and automatically generate a `PRODUCTION_FG` record in `STOCK_TRANSACTIONS`.

---

## 3. Frontend Modernization & Mobile Apps

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

- **[ ] Double Counting Prevention:** As we transition, we must ensure that automated `live_counter` increments from the PE module do not overlap or conflict with manual `STOCK_TRANSACTIONS` entries if an operator uses both systems.
- **[ ] Material Consumption Sync:** If a machine produces 100 Finished Goods automatically, the system needs an automated trigger (Backflushing) to deduct the corresponding Raw Materials from `STOCK_TRANSACTIONS`.
- **[ ] Legacy App Sunset:** Plan a hard cutoff date to decommission `page/production/mobile_app.php` and force all operators to use the new `mes-mobile-app`.
