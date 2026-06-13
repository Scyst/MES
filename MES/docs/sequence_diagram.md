# System Sequence Diagram: Machine-Based Execution

This sequence diagram illustrates the step-by-step interactions between the operator, the mobile application, the backend PE system, the database, and legacy components during a production run.

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operator (Machine Node)
    participant App as mes-mobile-app (React)
    participant PE as page/PE (Core System)
    participant Legacy as page/production (Legacy)
    participant DB as MES SQL Database
    participant ERP as SAP ERP
    participant OEE as OEE Dashboard

    %% Pre-requisite
    ERP->>DB: Sync PO, Forecast & Sale Orders
    Note over DB,ERP: Job Queue & Line Inventory initialized

    %% Execution flow
    Op->>App: Open App & Select Machine
    App->>PE: Request Machine Status (API)
    PE->>DB: Query `PE_MACHINES_TABLE`
    DB-->>PE: Return Machine Data
    PE-->>App: Display Machine Status

    Op->>App: Scan WIP Tag (HTML5-QRCode)
    App->>PE: Validate Tag & Job Route
    PE->>DB: Verify Job Queue & Material
    DB-->>PE: Data Validated
    PE-->>App: Display Job Details & Ready for Input

    %% Production Data Entry
    Op->>App: Input IPH (Items Per Hour) & NG (No Good) Data
    App->>PE: Submit Production Data (API)
    PE->>DB: Update Production & Machine State Logs
    
    %% Legacy Sync
    par Legacy Compatibility Sync
        PE->>Legacy: Sync Machine Status -> Line-Based System
        Legacy->>DB: Update Legacy Location/Line Tables
    end

    %% Analytics & Tagging
    DB->>OEE: Trigger Real-time Metrics Update
    Op->>PE: Job Done - Request FG/WIP Tag Print
    PE->>DB: Fetch Tag Data
    PE->>Op: Generate Tag via `label_printer.php`
```
