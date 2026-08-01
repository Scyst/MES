-- =========================================================
-- DATABASE SCHEMA FOR SNC TRANSPORT SYSTEM (SQL SERVER 2016)
-- =========================================================

-- 1. DEPARTMENTS (ข้อมูลแผนก/BU)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TRANSPORT_DEPARTMENTS' AND xtype='U')
BEGIN
    CREATE TABLE TRANSPORT_DEPARTMENTS (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(20) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- 2. ROUTES (เส้นทางและจุดจอด)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TRANSPORT_ROUTES' AND xtype='U')
BEGIN
    CREATE TABLE TRANSPORT_ROUTES (
        id VARCHAR(50) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        stops_json NVARCHAR(MAX) NOT NULL, -- เก็บเป็น JSON array: ["จุดA", "จุดB"]
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- 3. TIME_SLOTS (ช่วงเวลามาตรฐาน)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TRANSPORT_TIME_SLOTS' AND xtype='U')
BEGIN
    CREATE TABLE TRANSPORT_TIME_SLOTS (
        id VARCHAR(50) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL, -- เช่น "กะเช้า", "โอที"
        time_start VARCHAR(10) NOT NULL, -- "07:30"
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- 4. FLEET (ยานพาหนะและคนขับ)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TRANSPORT_FLEET' AND xtype='U')
BEGIN
    CREATE TABLE TRANSPORT_FLEET (
        id VARCHAR(50) PRIMARY KEY,
        license_plate NVARCHAR(50) NOT NULL,
        vehicle_type VARCHAR(20) NOT NULL, -- VAN, BUS, MINIBUS
        capacity INT NOT NULL DEFAULT 12,
        driver_emp_id VARCHAR(50),
        driver_name NVARCHAR(100),
        driver_phone VARCHAR(20),
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- 5. SCHEDULED_TRIPS (รอบรถรายวัน)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TRANSPORT_SCHEDULES' AND xtype='U')
BEGIN
    CREATE TABLE TRANSPORT_SCHEDULES (
        id VARCHAR(50) PRIMARY KEY,
        trip_date DATE NOT NULL,
        departure_time DATETIME NOT NULL,
        route_id VARCHAR(50) NOT NULL,
        vehicle_id VARCHAR(50) NOT NULL,
        base_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED, CANCELLED
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (route_id) REFERENCES TRANSPORT_ROUTES(id),
        FOREIGN KEY (vehicle_id) REFERENCES TRANSPORT_FLEET(id)
    );
END
GO

-- 6. BOOKINGS (การจองตั๋วและการเช็คอิน)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TRANSPORT_BOOKINGS' AND xtype='U')
BEGIN
    CREATE TABLE TRANSPORT_BOOKINGS (
        id VARCHAR(50) PRIMARY KEY,
        schedule_id VARCHAR(50) NULL, -- สามารถว่างได้ หากเป็นการลงชื่อจองแบบไม่ระบุคันรถ
        route_id VARCHAR(50) NULL,
        target_date DATE NULL,
        emp_id VARCHAR(50) NOT NULL,
        emp_name NVARCHAR(100) NOT NULL,
        bu_id VARCHAR(50), -- FK to DEPARTMENTS.id
        status VARCHAR(20) NOT NULL DEFAULT 'BOOKED', -- BOOKED, BOARDED, CANCELLED
        is_extra BIT DEFAULT 0, -- 1=Walk-in, 0=Booked
        booked_at DATETIME DEFAULT GETDATE(),
        boarded_at DATETIME NULL,
        FOREIGN KEY (schedule_id) REFERENCES TRANSPORT_SCHEDULES(id)
    );
END
GO
