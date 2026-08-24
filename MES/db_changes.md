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
