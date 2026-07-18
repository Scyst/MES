# SAP Data Integration Documentation

## Overview
This document outlines the data structures, connection details, and integration methods for pulling live ERP data from the `SNC-SAP` database located at `10.0.0.4`.

## Connection Details
- **IP Address:** `10.0.0.4`
- **Database:** `SNC-SAP`
- **User ID:** `SNC-IIoT-Toolbox`
- **Authentication:** SQL Server Authentication

## MCP Configuration (For AI Tooling)
The SAP database is added to the local MCP Tool configuration (`mcp_config.json`) under the name `sap-mssql`. This allows AI agents to directly query SAP tables and views using `execute_sql_query` and `list_tables` tools.

## View Structures

### 1. `View_OperationSlip_1820`
This view provides details on manufacturing orders, quantities, and timelines.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| **Plant** | string | Plant Code (e.g., 1820) |
| **Order_ID** | string | Production Order ID |
| **Mat_No** | string | Material Number / Part Code |
| **MatDesc** | string | Material Description |
| **BS_StartDate** | datetime | Basic Start Date |
| **BS_FinishDate** | datetime | Basic Finish Date |
| **TargetQty** | int | Target Production Quantity |
| **ScrapQty** | int | Scrapped Quantity |
| **Unit** | string | Unit of Measure (e.g., PC) |
| **MRP_Controller** | string | MRP Controller ID |
| **WorkCenter** | string | Assigned Work Center |
| **LogDate** | datetime | Timestamp of the log entry |

*(Note: The view contains 35 total columns. The table above highlights the most frequently used fields.)*

### 2. `View_SAP_ALL_STOCK_1820`
This view provides current inventory on-hand at specific storage locations.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| **Plant** | string | Plant Code (e.g., 1820) |
| **Mat_No** | string | Material Number / Part Code |
| **MatDesc** | string | Material Description |
| **Storage_Location** | string | Storage Location ID (e.g., 17E0) |
| **Batch** | string | Batch / Lot Number |
| **Quantity** | double | Current Quantity on Hand |
| **Unit** | string | Unit of Measure (e.g., PC) |
| **Logdate** | datetime | Timestamp of the log entry |

## Application Integration
The `page/SAP_Sync` module provides a read-only Web UI for operators to view the above data in real-time. It uses a backend PHP PDO script (`api/get_sap_data.php`) connected via `page/sap_db.php`.

## Data Reconciliation (MES vs SAP)
เพื่อแก้ปัญหาความคลาดเคลื่อนของข้อมูลระหว่างระบบปฏิบัติการหน้างาน (MES) และระบบบัญชี/การวางแผน (SAP) จึงมีการสร้างระบบ **Auditing / Reconciliation** เพื่อเทียบข้อมูล 2 ฝั่งแบบเรียลไทม์

### 1. Inventory Audit (เช็คความตรงกันของสต๊อก)
- **API Endpoint:** `page/SAP_Sync/api/recon_inventory.php`
- **Logic & Linkage:**
  - **ฝั่ง SAP:** รวมผลรวมยอด `Quantity` ทั้งหมดจาก `View_SAP_ALL_STOCK_1820` โดย Grouping ด้วย `Mat_No` (รหัสชิ้นงาน)
  - **ฝั่ง MES:** ดึงข้อมูลยอดคงเหลือจาก `INVENTORY_ONHAND` นำมา `JOIN` กับตาราง `ITEMS` (ผ่าน `parameter_id = item_id`) เพื่อแปลงหา `sap_no` จากนั้นจับผลรวม (SUM) แบ่งตาม `sap_no`
  - นำผลรวมของ MES และ SAP มาลบกันเพื่อหา `Diff`
- **ตารางที่เกี่ยวข้องใน MES:** `INVENTORY_ONHAND`, `ITEMS`

### 2. Yield Audit (เช็คความตรงกันของยอดผลิต)
- **API Endpoint:** `page/SAP_Sync/api/recon_production.php`
- **ปัญหาหลัก:** รหัส Job ของ MES (`job_no`) และรหัส Order ของ SAP (`Order_ID`) มีรูปแบบต่างกันสิ้นเชิง ทำให้ไม่สามารถจับคู่แบบ 1:1 (One-to-one matching) ได้
- **Logic & Linkage (Material-level Aggregation):**
  - แทนที่จะเทียบระดับ Job เราจะเทียบระดับ "Part Number" (รหัสสินค้า) แทน
  - **ฝั่ง SAP:** รวมยอด `TargetQty` และ `CONFIRMYIELD` จาก `View_OperationSlip_1820` โดย Grouping ตาม `Mat_No`
  - **ฝั่ง MES:** รวมยอด `target_qty` และ `actual_qty` จาก `PRODUCTION_JOBS` โดย `JOIN` กับ `ITEMS` (ผ่าน `item_id`) เพื่อแบ่งกลุ่มตาม `sap_no`
  - นำยอด Actual ของ MES มาหักลบกับ CONFIRMYIELD ของ SAP เพื่อเช็คว่ามี **"ยอดที่ผลิตเสร็จใน MES แล้ว แต่ยังไม่ถูกยืนยัน (Confirm) เข้าสู่บัญชี SAP"** ค้างอยู่หรือไม่
- **ตารางที่เกี่ยวข้องใน MES:** `PRODUCTION_JOBS`, `ITEMS`
