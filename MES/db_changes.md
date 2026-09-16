# DB Changes Log

All schema changes to the production database must be documented here.

---

## 2026-09-07 — Employee Grading Phase 2

**Agent:** Antigravity (Phase 2 Feature Agent)  
**Commit:** `38d10eb`

### Tables Created

#### `dbo.AUDIT_5S`
Stores 5S cross-audit results per production line.

| Column | Type | Notes |
|---|---|---|
| audit_id | INT IDENTITY PK | |
| line | VARCHAR(100) | Production line name |
| audit_date | DATE | Date of audit |
| auditor_emp_id | VARCHAR(50) | Who did the audit (cross-audit) |
| score_seiri/seiton/seiso/seiketsu/shitsuke | INT (0-20 each) | 5 S scores |
| total_score | Computed PERSISTED | Sum of 5 scores |
| grade | Computed PERSISTED | A>=85, B>=70, C>=55, D<55 |
| remarks | NVARCHAR(500) | Optional notes |
| created_at | DATETIME | |

#### `dbo.SKILL_DEFINITIONS`
Master table for skill catalog.

| Column | Type | Notes |
|---|---|---|
| skill_id | INT IDENTITY PK | |
| skill_code | VARCHAR(50) UNIQUE | e.g. WELD_MIG |
| skill_name | NVARCHAR(200) | Thai/English skill name |
| category | NVARCHAR(100) | e.g. Machine, Process, Quality |
| line | VARCHAR(100) NULL | NULL = all lines |
| display_order | INT | Sort order in matrix |
| is_active | BIT | Soft delete |
| created_at | DATETIME | |

#### `dbo.EMP_SKILLS`
Employee skill assessments with level tracking.

| Column | Type | Notes |
|---|---|---|
| id | INT IDENTITY PK | |
| emp_id | VARCHAR(50) | FK to MANPOWER_EMPLOYEES |
| skill_id | INT FK | FK to SKILL_DEFINITIONS |
| level | INT (1-4) | 1=รู้จัก, 2=ทำได้, 3=ชำนาญ, 4=สอนได้ |
| certified_at | DATE NULL | Auto-set when level >= 3 first time |
| certified_by | VARCHAR(50) NULL | emp_id of assessor |
| notes | NVARCHAR(500) | |
| updated_at | DATETIME | |
| updated_by | INT NULL | user_id |
| UNIQUE (emp_id, skill_id) | Constraint | One record per employee per skill |

**Business Logic:**
- `system_grade_learning` = A if skill_count>=5, B>=3, C>=1, D=0 (where skill_count = level>=2 skills)
- `system_grade_5s` = latest AUDIT_5S.grade for the employee's line within the current period

---

## 2026-09-16 — PAINT Line Chemical Control Check Sheet

**Agent:** Antigravity
**Feature:** ระบบบันทึกเคมีสีไลน์ PAINT (Parameter & Chemicals Control Check Sheet)

### Tables Created

#### `dbo.PAINT_CHEM_SHEET_HEADER`
Header สำหรับใบบันทึกแต่ละวัน/กะ

| Column | Type | Notes |
|---|---|---|
| header_id | INT IDENTITY PK | |
| log_date | DATE NOT NULL | วันที่บันทึก |
| shift | VARCHAR(10) NOT NULL | 'DAY' หรือ 'NIGHT' |
| conveyor_speed | DECIMAL(5,2) | Speed Conveyor (m/min) — Painting Condition |
| bake_oven_temp | DECIMAL(6,2) | Bake Oven Temp (°C) |
| dry_oven_temp | DECIMAL(6,2) | Dry Oven Temp (°C) |
| note | NVARCHAR(1000) | หมายเหตุ |
| prepared_by | INT FK → USERS.id | ผู้เตรียม |
| checked_by | INT FK → USERS.id | ผู้ตรวจสอบ |
| approved_by | INT FK → USERS.id | ผู้อนุมัติ |
| status | VARCHAR(20) | 'DRAFT' / 'SUBMITTED' / 'APPROVED' |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| UNIQUE(log_date, shift) | Constraint | 1 ใบต่อวัน/กะ |

#### `dbo.PAINT_CHEM_LOG`
Log ค่าพารามิเตอร์แต่ละ Station × Time Slot

| Column | Type | Notes |
|---|---|---|
| log_id | INT IDENTITY PK | |
| header_id | INT FK → PAINT_CHEM_SHEET_HEADER | |
| time_slot | VARCHAR(20) | เช่น '08:00-09:00', '20:00-22:00' |
| station_no | TINYINT (1–9) | หมายเลข Station |
| parameter_key | VARCHAR(50) | เช่น 'F_Al', 'Temperature', 'Pressure' |
| before_value | DECIMAL(10,3) | ค่าก่อนปรับ |
| after_value | DECIMAL(10,3) | ค่าหลังปรับ |
| chemical_added_kg | DECIMAL(10,3) | กก. ที่เติม (เฉพาะบาง parameter) |
| is_overflow | BIT | สำหรับ Water level / Flow check |
| is_out_of_range | BIT DEFAULT 0 | คำนวณ server-side |
| recorded_by | INT FK → USERS.id | |
| recorded_at | DATETIME | |
| note | NVARCHAR(500) | |
| UNIQUE(header_id, time_slot, station_no, parameter_key) | Constraint | UPSERT safe |

**Indexes:** `IX_PCL_HEADER(header_id)`, `IX_PCL_DATE_SLOT(header_id, time_slot)`
