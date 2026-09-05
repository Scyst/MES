# MES Database Change Log

> **Protocol**: All schema alterations MUST be documented here per AGENTS.md.
> Format: Date | Agent | Table | Change | Reason

---

## 2026-08-24

### [ADD COLUMNS] `PE_MACHINES`
- **Agent**: Antigravity (Audit & Fix)
- **Time**: 10:31
- **SQL**:
  ```sql
  ALTER TABLE dbo.PE_MACHINES
  ADD is_loto     BIT           NOT NULL DEFAULT 0,
      loto_reason NVARCHAR(500) NULL
  ```
- **Reason**: `lotoAPI.php` (implemented 21/08) required these columns to store the LOTO lock state on a machine. They were missing from DB causing the E-LOTO feature to throw runtime errors on any lock/unlock attempt.

---

### [CREATE TABLE] `PE_LOTO_LOGS`
- **Agent**: Antigravity (Audit & Fix)
- **Time**: 10:31
- **SQL**:
  ```sql
  CREATE TABLE dbo.PE_LOTO_LOGS (
      log_id       INT IDENTITY(1,1) PRIMARY KEY,
      machine_id   INT           NOT NULL,
      wo_id        INT           NULL,
      locked_by    NVARCHAR(100) NOT NULL,
      locked_at    DATETIME      NOT NULL DEFAULT GETDATE(),
      unlocked_by  NVARCHAR(100) NULL,
      unlocked_at  DATETIME      NULL,
      status       NVARCHAR(20)  NOT NULL DEFAULT 'Locked',
      reason       NVARCHAR(500) NULL,
      updated_at   DATETIME      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT FK_LOTO_MACHINE FOREIGN KEY (machine_id)
          REFERENCES dbo.PE_MACHINES(machine_id)
  )
  ```
- **Reason**: Audit log table for all LOTO lock/unlock events. Required by `lotoAPI.php` for the `lock`, `unlock`, and `status` actions. Missing table caused every LOTO action to fail silently.

---

### 2026-08-24: In-App Notification Center
- **Created Table**: PE_NOTIFICATIONS
  - Columns: id (INT IDENTITY PK), module (VARCHAR 50), ef_id (VARCHAR 50), 	itle (NVARCHAR 255), message (NVARCHAR MAX),  lert_level (VARCHAR 20), created_at (DATETIME DEFAULT GETDATE()), is_active (BIT DEFAULT 1)
  - Purpose: Global notification center for LOTO and other PE alerts.

---

## 2026-08-26

### [ADD COLUMN] `STOCK_TRANSFER_ORDERS`
- **Agent**: Antigravity
- **SQL**: `ALTER TABLE dbo.STOCK_TRANSFER_ORDERS ADD tag_serial_no VARCHAR(100) NULL;`
- **Reason**: เพิ่ม column เพื่อเก็บ `serial_no` ของแท็กที่เกี่ยวข้องกับการโอนย้าย แทนการฝัง `[TAG: ...]` ไว้ใน `notes` — เสถียรกว่า, queryable, ไม่ต้อง parse string
- **Impact**: `NULL`able — ไม่กระทบ record เดิม

---

## 2026-09-05

### [ADD COLUMNS] `EMPLOYEE_GRADES` and `EMPLOYEE_GRADING_CRITERIA`
- **Agent**: Antigravity
- **SQL**:
  ```sql
  ALTER TABLE dbo.EMPLOYEE_GRADES
  ADD grade_iph VARCHAR(2) NULL,
      grade_5s VARCHAR(2) NULL,
      grade_attendance VARCHAR(2) NULL,
      grade_learning VARCHAR(2) NULL,
      grade_overall VARCHAR(2) NULL;

  ALTER TABLE dbo.EMPLOYEE_GRADING_CRITERIA
  ADD att_max_late_a INT NULL DEFAULT 0,
      att_max_late_b INT NULL DEFAULT 1,
      att_max_late_c INT NULL DEFAULT 2;
  ```
- **Reason**: Expand employee grading system into 4 distinct dimensions (IPH, 5S, Attendance, Learning).
- **Impact**: New columns allow storing multiple grades per employee/period instead of just a single overall grade. Nullable, so it doesn't break existing data.
