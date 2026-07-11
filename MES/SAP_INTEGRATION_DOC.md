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
