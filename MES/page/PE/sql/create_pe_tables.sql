-- =============================================
-- PE Enterprise System — Database Schema
-- Created: 2026-06-01
-- =============================================

-- 1. Machine Registry
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'PE_MACHINES') AND type = 'U')
BEGIN
    CREATE TABLE PE_MACHINES (
        machine_id      INT IDENTITY(1,1) PRIMARY KEY,
        machine_code    NVARCHAR(50) NOT NULL UNIQUE,
        machine_name    NVARCHAR(200) NOT NULL,
        line            NVARCHAR(50),
        area            NVARCHAR(100),
        machine_type    NVARCHAR(100),
        manufacturer    NVARCHAR(200),
        model           NVARCHAR(200),
        serial_number   NVARCHAR(200),
        install_date    DATE,
        status          NVARCHAR(30) DEFAULT 'Active',
        criticality     NVARCHAR(20) DEFAULT 'Medium',
        photo_path      NVARCHAR(500),
        specifications  NVARCHAR(MAX),
        notes           NVARCHAR(MAX),
        is_active       BIT DEFAULT 1,
        created_at      DATETIME DEFAULT GETDATE(),
        updated_at      DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created table PE_MACHINES';
END
GO

-- 2. Work Orders (replaces MAINTENANCE_REQUESTS for new system)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'PE_WORK_ORDERS') AND type = 'U')
BEGIN
    CREATE TABLE PE_WORK_ORDERS (
        wo_id           INT IDENTITY(1,1) PRIMARY KEY,
        wo_number       NVARCHAR(30) NOT NULL UNIQUE,
        wo_type         NVARCHAR(30) NOT NULL DEFAULT 'Corrective',
        machine_id      INT NULL,
        machine_name    NVARCHAR(200),
        line            NVARCHAR(50),
        priority        NVARCHAR(20) DEFAULT 'Normal',
        status          NVARCHAR(30) DEFAULT 'Open',
        
        requested_by    NVARCHAR(100),
        requested_at    DATETIME DEFAULT GETDATE(),
        issue_title     NVARCHAR(300),
        issue_detail    NVARCHAR(MAX),
        photo_before    NVARCHAR(500),
        
        assigned_to     NVARCHAR(100),
        assigned_at     DATETIME,
        
        started_at      DATETIME,
        completed_at    DATETIME,
        repair_minutes  INT,
        root_cause      NVARCHAR(MAX),
        action_taken    NVARCHAR(MAX),
        photo_after     NVARCHAR(500),
        
        parts_used      NVARCHAR(MAX),
        total_cost      DECIMAL(12,2) DEFAULT 0,
        
        legacy_mt_id    INT NULL,
        
        created_at      DATETIME DEFAULT GETDATE(),
        updated_at      DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_WO_Machine FOREIGN KEY (machine_id) REFERENCES PE_MACHINES(machine_id)
    );
    PRINT 'Created table PE_WORK_ORDERS';
END
GO

-- 3. Downtime Log (replaces STOP_CAUSES for new system)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'PE_DOWNTIME_LOG') AND type = 'U')
BEGIN
    CREATE TABLE PE_DOWNTIME_LOG (
        downtime_id     INT IDENTITY(1,1) PRIMARY KEY,
        machine_id      INT NULL,
        machine_name    NVARCHAR(200),
        line            NVARCHAR(50),
        log_date        DATE NOT NULL,
        start_time      DATETIME NOT NULL,
        end_time        DATETIME NOT NULL,
        duration_min    AS DATEDIFF(MINUTE, start_time, end_time),
        
        cause_category  NVARCHAR(100),
        cause_detail    NVARCHAR(500),
        
        wo_id           INT NULL,
        recovered_by    NVARCHAR(100),
        notes           NVARCHAR(MAX),
        
        legacy_sc_id    INT NULL,
        
        created_by      NVARCHAR(100),
        created_at      DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_DT_Machine FOREIGN KEY (machine_id) REFERENCES PE_MACHINES(machine_id),
        CONSTRAINT FK_DT_WO FOREIGN KEY (wo_id) REFERENCES PE_WORK_ORDERS(wo_id)
    );
    PRINT 'Created table PE_DOWNTIME_LOG';
END
GO

-- 4. Machine History / Audit Trail
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'PE_MACHINE_HISTORY') AND type = 'U')
BEGIN
    CREATE TABLE PE_MACHINE_HISTORY (
        history_id      INT IDENTITY(1,1) PRIMARY KEY,
        machine_id      INT NOT NULL,
        event_type      NVARCHAR(50),
        event_detail    NVARCHAR(MAX),
        performed_by    NVARCHAR(100),
        event_date      DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_MH_Machine FOREIGN KEY (machine_id) REFERENCES PE_MACHINES(machine_id)
    );
    PRINT 'Created table PE_MACHINE_HISTORY';
END
GO

-- 5. Indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PE_WO_Status')
    CREATE INDEX IX_PE_WO_Status ON PE_WORK_ORDERS(status, priority);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PE_WO_Machine')
    CREATE INDEX IX_PE_WO_Machine ON PE_WORK_ORDERS(machine_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PE_WO_Date')
    CREATE INDEX IX_PE_WO_Date ON PE_WORK_ORDERS(requested_at);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PE_DT_Machine')
    CREATE INDEX IX_PE_DT_Machine ON PE_DOWNTIME_LOG(machine_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PE_DT_Date')
    CREATE INDEX IX_PE_DT_Date ON PE_DOWNTIME_LOG(log_date);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PE_DT_Cause')
    CREATE INDEX IX_PE_DT_Cause ON PE_DOWNTIME_LOG(cause_category);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PE_MH_Machine')
    CREATE INDEX IX_PE_MH_Machine ON PE_MACHINE_HISTORY(machine_id);
GO

PRINT '=== PE Enterprise Schema created successfully ===';
