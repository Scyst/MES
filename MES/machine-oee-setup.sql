-- 1. Create MACHINE_SCHEDULES table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MACHINE_SCHEDULES' and xtype='U')
BEGIN
    CREATE TABLE MACHINE_SCHEDULES (
        schedule_id INT IDENTITY(1,1) PRIMARY KEY,
        line_schedule_id INT NOT NULL, -- Link back to LINE_SCHEDULES
        machine_id INT NOT NULL, -- Foreign key to PE_MACHINES
        production_date DATE NOT NULL,
        shift NVARCHAR(50) NOT NULL,
        planned_time_mins FLOAT NOT NULL DEFAULT 0,
        actual_time_mins FLOAT NOT NULL DEFAULT 0,
        status NVARCHAR(50) DEFAULT 'Scheduled', -- Scheduled, Running, Stopped, Offline
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- 2. Add machine_id to STOP_CAUSES
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'STOP_CAUSES' AND COLUMN_NAME = 'machine_id'
)
BEGIN
    ALTER TABLE STOP_CAUSES ADD machine_id INT NULL;
END
GO

-- 3. Add machine_id to MAINTENANCE_REQUESTS
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'MAINTENANCE_REQUESTS' AND COLUMN_NAME = 'machine_id'
)
BEGIN
    ALTER TABLE MAINTENANCE_REQUESTS ADD machine_id INT NULL;
END
GO

-- 4. Add machine_id to MANUFACTURING_ROUTES for Cycle Time overrides
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'MANUFACTURING_ROUTES' AND COLUMN_NAME = 'machine_id'
)
BEGIN
    ALTER TABLE MANUFACTURING_ROUTES ADD machine_id INT NULL;
END
GO

-- 5. Trigger to auto-create MACHINE_SCHEDULES when a LINE_SCHEDULES is created
-- Drop if exists to recreate
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_AutoCreateMachineSchedules')
BEGIN
    DROP TRIGGER trg_AutoCreateMachineSchedules;
END
GO

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
    WHERE m.is_active = 1; -- Only create schedule for active machines
END
GO
