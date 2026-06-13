# System Architecture Map: Full Enterprise MES System

This document outlines the complete architecture of the MES system, including the transition to Machine-Based Production Execution, Job Queue Management, WIP/Tag Tracking, and OEE Analytics.

## Comprehensive Workflow Diagram

```mermaid
flowchart LR
    %% ERP and Database
    SAP[(SAP ERP)]
    DB[(MES Central SQL Database)]
    SAP <-->|PO, Forecast, Sale Orders Sync| DB

    %% Phase 1: Incoming & Planning
    subgraph Incoming [1. Planning & Material Incoming]
        direction TB
        JobQ{{Job Queue System<br/>(jobQueueUI.php)}}
        ProdUI{{Shop Floor Line & Inventory<br/>(productionUI.php)}}
        JobQ -.-> ProdUI
    end
    
    Incoming ==> DB

    %% Phase 2: Production (Machine Focus)
    subgraph Production [2. Production Phase (Machine-Based Execution)]
        direction TB
        
        subgraph PE [PE Enterprise Portal (page/PE)]
            direction LR
            MachineMgr[Machine Config & Status]
            Maint[Maintenance Tracking]
        end
        
        subgraph Mobile [mes-mobile-app (React/Vite)]
            QR[HTML5 QR Scanner]
            Input[Operator IPH & NG Data Input]
        end

        subgraph Machines [Shop Floor Machines]
            direction LR
            M1[CNC/Robot 1]
            M2[Machine 2]
            M3[Machine 3]
        end

        %% Data Flow
        Machines -->|IoT/API Telemetry| PE
        Machines -.->|Operator UI| Mobile
        Mobile -->|Real-time Machine API| PE
        QR -->|Scan Tag/WIP| Mobile
    end

    %% Phase 3: Outgoing & Monitoring
    subgraph Outgoing [3. Traceability & Outgoing]
        direction TB
        Print{{Production Tag Printer<br/>(label_printer.php)}}
        Warehouse[Warehouse Management / Outgoing]
        Print -->|Generate WIP / FG Tags| Warehouse
    end

    subgraph Analytics [4. Dashboards & Analytics]
        direction TB
        OEE_DB{{OEE Dashboard<br/>(OEE_Dashboard.php)}}
        OEE_SF{{OEE Shopfloor View<br/>(OEE_Shopfloor.php)}}
    end

    %% Connections
    DB ==> PE
    PE ==> DB
    PE --> Print
    Warehouse --> DB
    DB ==> Analytics
    Production -.->|Backward Compatibility| ProdUI

    %% Styling
    classDef erp fill:#e1bee7,stroke:#8e24aa,stroke-width:2px,color:#4a148c
    classDef db fill:#c8e6c9,stroke:#388e3c,stroke-width:2px,color:#1b5e20
    classDef legacy fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100
    classDef newapp fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#0d47a1
    classDef hw fill:#cfd8dc,stroke:#546e7a,stroke-width:2px,color:#263238

    class SAP erp
    class DB db
    class JobQ,ProdUI,OEE_DB,OEE_SF,Print legacy
    class Mobile,PE,QR,Input,MachineMgr,Maint newapp
    class M1,M2,M3,Warehouse hw
```

## System Modules Breakdown

### 1. Data & Planning Layer
* **`jobQueueUI.php`**: Manages the production Job Queues downloaded or synced from the Database.
* **`productionUI.php`**: The original Shop Floor & Inventory management interface, handling production line groupings and team assignments.

### 2. Modern Machine-Based Execution Core
* **`page/PE` (PE Enterprise Portal)**: The modern core system handling individual machine states (`PE_MACHINES_TABLE`), maintenance, and telemetry.
* **`mes-mobile-app` (React/Vite)**: The new frontend for operators on the floor. Includes an `HTML5-QRCode` scanner to read WIP tags and submit direct IPH (Items Per Hour) and NG (No Good) counts directly linked to specific machines, not generic lines.

### 3. Traceability & Output
* **`label_printer.php`**: Generates Production Tags (WIP/FG tags) allowing parts to be tracked through the warehouse and Outgoing phases.
* **`page/OEE_Dashboard` & `OEE_Shopfloor`**: Analytics dashboards that aggregate data from the Central DB to calculate and display Overall Equipment Effectiveness.
