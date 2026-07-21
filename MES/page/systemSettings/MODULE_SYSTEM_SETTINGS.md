# System Settings Module Documentation

**Module:** `systemSettings`
**Path:** `e:\MES\MES\MES\page\systemSettings\`
**Description:** The core administrative module of the MES. It handles master data management, system configurations, and cross-system data synchronization (specifically bridging the gap between SAP ERP and local MES data).

---

## 1. Sub-Modules (Panes)
The module is structured as a Single Page Application (SPA). Visibility of different sections is toggled via CSS classes (`.d-none`) rather than reloading the page.

1. **Item Master (`item-master-pane`)**: Catalog of all materials, products, and components used in the system.
2. **BOM Manager (`bom-manager-pane`)**: Management of Bill of Materials structures (Headers and Details).
3. **Line Schedules (`lineSchedulesPane`)**: Management of production line timings and schedules.
4. **Locations (`locations-pane`)**: Management of physical and logical storage locations within the warehouse.
5. **SAP Valuation (`sap-valuation-pane`)**: A financial and inventory analytical dashboard that compares SAP staging data against live MES data to highlight discrepancies and missing configurations.

---

## 2. Architecture & File Structure

### Frontend
- **View (`systemSettings.php`)**: The main layout. Contains the toolbar group controls and the HTML structures for all 5 sub-modules (including DataTables, Summary Cards, and Modals).
- **Controller (`script/systemSettings.js`)**: Handles all client-side logic.
  - Initializes DataTables for each pane.
  - Fetches JSON data from APIs.
  - Contains the logic for rendering dynamic UI components (like the SAP Valuation summary cards, health badges, and dynamic filter checkboxes).
  - Handles module switching (`.module-switch` click events).

### Backend (APIs in `page/systemSettings/api/`)
- `itemMasterManage.php`: CRUD operations for the `ItemMaster` table.
- `bomManager.php`: CRUD operations and complex Excel imports for BOM structures.
- `locationsManage.php`: CRUD operations for warehouse locations.
- `sapValuationManage.php`: The data engine for the SAP Valuation dashboard. Fetches and aggregates staging data vs. MES data.
- `sync_sap_items.php`: Manual trigger script to synchronize material master attributes from SAP to the MES Item Master.
- `cron_sync_sap_staging.php`: Automated background job script that acts as the bridge connecting SAP to MES.

---

## 3. Database & Connections (การเชื่อมต่อดาต้าเบส ภายในและภายนอก)

The module interacts with both internal SQL Server databases and external ERP systems via REST APIs.

### 3.1 External Databases / Sources (ภายนอก)
- **SAP ERP (via REST API)**: 
  - Acts as the central source of truth for financial valuation, inventory quantities, and official material categories.
  - Endpoints (configured via `cron_sync_sap_staging.php`) include:
    - `ZMM_GET_STOCK`: Retrieves real-time inventory quantities.
    - `ZCO_GET_STD_COST`: Retrieves the latest Standard Cost and Moving Average Price (MAP).

### 3.2 Internal Databases (ภายใน - MES SQL Server)
- **Staging Tables (Intermediate/Buffer)**:
  - `sap_staging_inventory`: Stores daily/hourly snapshots of inventory levels pulled from SAP.
  - `sap_staging_costs`: Stores material costs pulled from SAP.
  *(These tables allow the MES to analyze SAP data without making expensive real-time API calls on every page load.)*
  
- **Core MES Tables (Production)**:
  - `ItemMaster`: The local catalog. Key fields include `ItemCode`, `ItemName`, `Category`, `StandardCost`.
  - `BOM_Header` / `BOM_Detail`: Manufacturing recipes.
  - `Locations`: Warehouse definitions.

---

## 4. Data Synchronization Flow (SAP Valuation Workflow)

The SAP Valuation dashboard is the most complex component of this module. Its data flow operates in 4 distinct phases:

### Phase 1: Data Ingestion (Background)
1. `cron_sync_sap_staging.php` runs periodically (e.g., hourly).
2. It calls SAP APIs to fetch the latest Inventory and Cost data.
3. The data is truncated and inserted into `sap_staging_inventory` and `sap_staging_costs` in the local SQL Server.

### Phase 2: Data Aggregation (Backend)
1. User opens the SAP Valuation pane. The frontend calls `sapValuationManage.php`.
2. The API performs a complex SQL `LEFT JOIN`:
   - Joins `sap_staging_inventory` with `sap_staging_costs` to calculate **SAP Value** (Qty × SAP Price).
   - Joins the result with `ItemMaster` to calculate the **MES Value** (Qty × MES StandardCost).
3. The API flags data anomalies:
   - `is_registered`: `false` if the item exists in SAP but not in `ItemMaster`.
   - `missing_sap_cost`: `true` if SAP returned a 0 value.
   - `missing_mes_cost`: `true` if MES `StandardCost` is 0 or NULL.

### Phase 3: Presentation & Rendering (Frontend)
1. `systemSettings.js` receives the array of items.
2. It groups the data by `Category_Group`:
   - **RM (10-xx)**: Raw Materials
   - **PKG (20-xx)**: Packaging
   - **WIP (30-xx)**: Work in Progress
   - **FG (40-xx)**: Finished Goods
3. Calculates total sums and renders them into the UI Cards, calculating the **Variance** (MES Value - SAP Value).
4. Dynamically builds the sidebar filters (Categories, Locations, Health Statuses).

### Phase 4: Corrective Actions (User Flow)
1. Users analyze discrepancies (e.g., missing MES costs).
2. They use the **Data Action -> Sync Costs to MES** feature (`sync_sap_items.php` / `itemMasterManage.php`).
3. This performs a bulk `UPDATE` on `ItemMaster.StandardCost`, setting it equal to the `sap_staging_costs` value.
4. Upon refreshing, the Variance drops to zero (Match), ensuring MES financial calculations align with SAP.

---

## 5. Future Development & Extension Points
- **Modal Editing (Quick Actions)**: Allow users to click on individual rows in the SAP Valuation table to open an edit modal, making it easier to fix individual `ItemMaster` records on the fly without switching to the Item Master pane.
- **Advanced Filtering Options**: The current filter logic supports simple inclusions. Future requirements may need AND/OR complex logic for deeper data drilling.
- **Historical Snapshots**: Currently, staging tables are truncated. To show trend charts (e.g., Variance over the last 30 days), a historical logging table (`sap_valuation_history`) would need to be implemented.
