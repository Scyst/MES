# DB Changes Log

All schema changes to the production database must be documented here.

---

## 2026-10-24 — Industry 4.0 Skills in SKILL_DEFINITIONS

**Agent:** Antigravity  
**Feature:** ลงทะเบียนทักษะหลักสูตร Industry 4.0 จำนวน 7 หลักสูตร เข้าสู่ตาราง `dbo.SKILL_DEFINITIONS`

### Data Inserted: `dbo.SKILL_DEFINITIONS`

| skill_id | skill_code | skill_name | category | line | display_order | is_active |
|---|---|---|---|---|---|---|
| 15 | `SKILL_ENTERPRISE_APP` | Enterprise Application Design & Development | โปรแกรมและระบบดิจิทัล | ALL | 15 | 1 |
| 16 | `SKILL_MACHINE_VISION` | Machine Vision & Image Processing | เครื่องจักรและวิศวกรรมการผลิต | ALL | 16 | 1 |
| 17 | `SKILL_CAD_CAM` | Advanced CAD/CAM & Mold Engineering | เครื่องจักรและวิศวกรรมการผลิต | ALL | 17 | 1 |
| 18 | `SKILL_CNC_MACHINING` | CNC 4.0 & High Precision Machining | เครื่องจักรและวิศวกรรมการผลิต | ALL | 18 | 1 |
| 19 | `SKILL_EV_BATTERY` | EV Conversion & Battery Technology | เครื่องจักรและวิศวกรรมการผลิต | ALL | 19 | 1 |
| 20 | `SKILL_PLC_AUTOMATION` | PLC Automation & Industrial IoT | เครื่องจักรและวิศวกรรมการผลิต | ALL | 20 | 1 |
| 21 | `SKILL_ROBOTICS` | Industrial Robot & Cobot Automation | เครื่องจักรและวิศวกรรมการผลิต | ALL | 21 | 1 |

---

## 2026-10-19 — MES Learning Hub & Employee Grading Integration

**Agent:** Antigravity  
**Feature:** เชื่อมต่อผลการอบรม MES Learning Hub เข้ากับระบบประเมินเกรดพนักงาน (Employee Grading Dimension 4: Learning / Multi-skill)

### Tables Created

#### `dbo.LEARNING_RECORDS`
บันทึกประวัติการอบรม การสอบวัดผล (Post-Test) และใบรับรองสมรรถนะ (Certificate) รายบุคคลตามมาตรฐาน ISO 9001:2015 Clause 7.2

| Column | Type | Notes |
|---|---|---|
| id | INT IDENTITY PK | |
| emp_id | VARCHAR(50) NOT NULL | รหัสพนักงาน (FK to MANPOWER_EMPLOYEES) |
| course_id | VARCHAR(100) NOT NULL | รหัสหลักสูตร e.g. 'c-ppap', 'c-iso-9001' |
| course_title | NVARCHAR(255) NOT NULL | ชื่อหลักสูตร |
| category | NVARCHAR(100) NULL | หมวดหมู่หลักสูตร |
| status | VARCHAR(30) NOT NULL | 'in_progress', 'completed', 'failed' |
| quiz_score | INT DEFAULT 0 | คะแนนสอบที่ทำได้ |
| quiz_total | INT DEFAULT 0 | จำนวนข้อสอบทั้งหมด |
| quiz_percentage | INT DEFAULT 0 | เปอร์เซ็นต์คะแนนสอบ |
| passed | BIT DEFAULT 0 | 1 = ผ่านเกณฑ์ (≥ 80%), 0 = ไม่ผ่าน |
| certificate_id | VARCHAR(50) NULL | รหัสใบรับรอง เช่น 'SNC-CERT-2026-4115' |
| completed_at | DATETIME NULL | วันที่และเวลาที่สอบผ่านการอบรม |
| created_at | DATETIME DEFAULT GETDATE() | |
| updated_at | DATETIME DEFAULT GETDATE() | |
| CONSTRAINT UQ_Emp_Course | UNIQUE (emp_id, course_id) | พนักงาน 1 คน มี 1 record ต่อหลักสูตร |

**Business Integration Logic:**
- เมื่อพนักงานสอบผ่านแบบทดสอบ Post-Test (≥ 80%) ข้อมูลจะถูกบันทึกลง `dbo.LEARNING_RECORDS`
- ข้อมูลจะถูกนำไปอัปเดตลง `dbo.EMP_SKILLS` ให้มีระดับทักษะ `level = 3` (ชำนาญ/Certified)
- ใน `api_employee_grading.php`: `skill_count` (นับจาก `dbo.EMP_SKILLS WHERE level >= 2`) จะเพิ่มขึ้น ส่งผลให้ `grade_learning` ปรับเป็น A (≥5 ทักษะ), B (≥3), C (≥1), D (0)

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

### 2026-10-05 — PAINT_CHEM_LOG: station 10 (Ovens) and slot-level extras
- `CK_PCL_STATION` now allows `station_no` 1-10 (was 1-9). Station 10 = Ovens.
- Station 10 `parameter_key` values: `BakeOvenTemp`, `DryOvenTemp`, `ConveyorSpeed` (value in `before_value`), `SlotNote` (text in `note`, max 500 chars, one row per time slot).
- `PAINT_CHEM_SHEET_HEADER.conveyor_speed / bake_oven_temp / dry_oven_temp` are no longer written by the application (legacy columns kept; `note` kept as legacy read-only text shown first in the PDF Note box).

---

## 2026-10-12 — Store Management: Warehouse Zone Mapping for Cycle Count

**Agent:** Antigravity  
**Feature:** จัดการโซนคลังสินค้า (Dynamic Zone Mapping for Cycle Count)

### Column Added to `dbo.LOCATIONS`

| Column | Type | Notes |
|---|---|---|
| `zone_name` | NVARCHAR(50) NULL | ชื่อโซนสำหรับจัดกลุ่มคลังสินค้า เช่น 'โซน A (Zone A)', 'โซน B (ย่อย)' เพื่อแสดงใน Visual Map |

```sql
ALTER TABLE dbo.LOCATIONS ADD zone_name NVARCHAR(50) NULL;
```

---

## 2026-10-14 — Store Management: Cycle Count Manual Approval Stored Procedure Update

**Agent:** Antigravity  
**Feature:** Phase 1.2 End-to-End Manual Approval & Location Synchronization

### Stored Procedure Updated: `dbo.sp_Store_ApproveCycleCount`
- **Location Synchronization:** When approving a count for a specific pallet/tag (`@serial_no IS NOT NULL`), synchronizes `RM_SERIAL_TAGS.location_id = @location_id` so that pallets discovered in wrong locations (ของหลงคลัง) correctly transfer to their counted location upon approval.
- **Negative Variance Safety:** Protects against negative variance underflow with `CASE WHEN current_qty + @diff_qty < 0 THEN 0 ELSE current_qty + @diff_qty END`.
- **Ledger Auditability:** Preserves `STOCK_TRANSACTIONS` logging with `reference_id = 'CC-' + CAST(@count_id AS VARCHAR)` and transaction types `ADJ_IN` / `ADJ_OUT`.

---

## 2026-10-14 — Store Management: Two-Tier Blind Recount Protocol (Phase 3.2)

**Agent:** Antigravity  
**Feature:** Phase 3.2 Two-Tier Blind Recount Protocol & Strict Manual Decision

### Columns Added to `dbo.INVENTORY_CYCLE_COUNTS`

| Column | Type | Notes |
|---|---|---|
| `is_flagged_recount` | BIT NOT NULL DEFAULT 0 | 1 = ตรวจพบยอดดิฟสูง เข้าเกณฑ์ต้องนับซ้ำรอบที่ 2 (Tier 2 Blind Recount) |
| `count1_qty` | DECIMAL(18,4) NULL | ยอดที่ตรวจนับได้ในรอบแรก |
| `count1_user_id` | INT NULL | รหัสพนักงานที่ตรวจนับรอบแรก |
| `count1_at` | DATETIME NULL | เวลาที่ตรวจนับรอบแรก |
| `recount_qty` | DECIMAL(18,4) NULL | ยอดที่ตรวจนับได้ในรอบที่ 2 (Blind Recount) |
| `recount_user_id` | INT NULL | รหัสพนักงานที่ตรวจนับรอบที่ 2 |
| `recount_at` | DATETIME NULL | เวลาที่ตรวจนับรอบที่ 2 |
| `manager_choice` | VARCHAR(30) NULL | ทางเลือกที่ผู้จัดการตัดสินใจ ('USE_COUNT_1', 'USE_RECOUNT', 'KEEP_SYSTEM') |
| `decision_reason` | NVARCHAR(255) NULL | เหตุผลกำกับการตัดสินใจของผู้จัดการ |

---

## 2026-10-15 — Store Management: Wrong Location Pallet Relocation & Approval Fix

**Agent:** Antigravity  
**Feature:** Automatic Relocation Synchronization for Wrong Location Pallets

### Stored Procedure Updated: `dbo.sp_Store_ApproveCycleCount`
- **Physical Tag Relocation:** When `@final_actual > 0` (e.g., pallet found in wrong location B with physical count), updates `RM_SERIAL_TAGS.location_id = @location_id` and sets `current_qty = @final_actual` directly to match the counted quantity on the pallet.
- **Relocation Preservation on Missing Tag Approval:** When `@final_actual = 0` (e.g., location A writes off missing tag), only sets `current_qty = 0` if `RM_SERIAL_TAGS.location_id == @location_id`. If the tag has already been discovered and transferred to another location, preserves the tag's new location and quantity intact.
---

## 2026-10-16 — Store Management: Two-Sided Atomic Relocation & Status Revive

**Agent:** Antigravity  
**Feature:** Single-Click Two-Sided Atomic Relocation in Cycle Count Approval & Tag Revival

### Stored Procedure Updated: `dbo.sp_Store_ApproveCycleCount`
- **Two-Sided Atomic Stock Relocation:** When a tag is discovered at location B but recorded at location A (`@tag_current_loc != @location_id`), approving location B executes an atomic relocation:
  1. Deducts `@final_actual` from location A (`sp_UpdateOnhandBalance -@final_actual`, logged as `RELOC_OUT`).
  2. Adds `@final_actual` to location B (`sp_UpdateOnhandBalance +@final_actual`, logged as `RELOC_IN`).
  3. Updates `RM_SERIAL_TAGS`: `location_id = @location_id`, `current_qty = @final_actual`, `status = 'AVAILABLE'`.
  4. Automatically resolves pending cycle count records for this tag at location A (`status = 'APPROVED'`, `manager_choice = 'AUTO_RELOCATED'`), eliminating double-approvals and zeroing total warehouse stock impact (net stock change = 0).
  5. Includes safety guard against double-deduction if location A was already previously approved.
- **Tag Status Revival (`status = 'AVAILABLE'`):** Whenever a tag is approved with `@final_actual > 0` (including PRD returned tags or normal counts), its status is restored to `'AVAILABLE'`, making it immediately visible and eligible for Material Requisition.

---

## 2026-10-22 — In-process Quality System (IQS) Phase 1: Pull Test & Spot Weld Inspection

**Agent:** Antigravity  
**Feature:** ระบบบันทึกผลการทดสอบแรงดึง (Pull Test), เช็คเคาะ, เช็คระยะ และพารามิเตอร์ตู้คอนโทรลสำหรับไลน์เครื่องจักร Spot Welding แทนการส่งใน Line / ใบกระดาษ เพื่อรองรับการ Audit ตามมาตรฐานสากล

### Tables Created

#### 1. `dbo.IQS_ROUND_TEMPLATES`
ตารางแม่แบบช่วงเวลาการทดสอบมาตรฐาน (Configurable Standard Time Slots)
| Column | Type | Notes |
|---|---|---|
| `template_id` | INT IDENTITY PRIMARY KEY | รหัสแม่แบบ |
| `template_code` | VARCHAR(50) NOT NULL | เช่น 'ROUND_0830', 'ROUND_1030', 'ROUND_1300' |
| `template_name` | NVARCHAR(100) NOT NULL | เช่น N'รอบเช้า (08:30)', N'รอบสาย (10:30)' |
| `std_time` | TIME(0) NULL | เวลามาตรฐาน เช่น '08:30:00' |
| `shift` | VARCHAR(20) DEFAULT 'Day' | กะทำงาน ('Day', 'Night', 'OT') |
| `sort_order` | INT DEFAULT 1 | ลำดับการแสดงผล |
| `is_active` | BIT DEFAULT 1 | 1 = ใช้งาน, 0 = ปิดใช้งาน |
| `created_at` | DATETIME DEFAULT GETDATE() | |

#### 2. `dbo.IQS_ROUNDS`
ตารางบันทึกหัวรอบการทดสอบ (Inspection Round Header)
| Column | Type | Notes |
|---|---|---|
| `round_id` | INT IDENTITY PRIMARY KEY | รหัสรอบ |
| `round_number` | VARCHAR(50) NOT NULL UNIQUE | รหัสอ้างอิง เช่น 'IQS-20261022-R01' |
| `plan_date` | DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE) | วันที่ทดสอบ |
| `template_id` | INT NULL | FK to IQS_ROUND_TEMPLATES (NULL ถ้าเป็นรอบเปิดเองพิเศษ) |
| `round_name` | NVARCHAR(100) NOT NULL | ชื่อรอบ |
| `shift` | VARCHAR(20) DEFAULT 'Day' | |
| `primary_tester_id` | INT NOT NULL | FK to USERS.id (ผู้ล็อกอินหลัก) |
| `co_tester_id_1` | INT NULL | FK to USERS.id (ผู้ร่วมทดสอบคนที่ 2) |
| `co_tester_id_2` | INT NULL | FK to USERS.id (ผู้ร่วมทดสอบคนที่ 3) |
| `status` | VARCHAR(30) NOT NULL DEFAULT 'OPEN' | 'OPEN', 'SUBMITTED', 'COMPLETED_WITH_NG', 'VOID' |
| `started_at` | DATETIME NOT NULL DEFAULT GETDATE() | เวลาเริ่มรอบ (จาก Server ห้ามย้อนหลัง) |
| `submitted_at` | DATETIME NULL | เวลาส่ง/ปิดรอบ |
| `notes` | NVARCHAR(500) NULL | หมายเหตุเพิ่มเติม |
| `created_at` | DATETIME DEFAULT GETDATE() | |

#### 3. `dbo.IQS_TEST_RECORDS`
ตารางบันทึกผลการทดสอบแยกตามเครื่องจักร (Per Machine Inspection Record)
| Column | Type | Notes |
|---|---|---|
| `record_id` | INT IDENTITY PRIMARY KEY | รหัสบันทึก |
| `round_id` | INT NOT NULL | FK to IQS_ROUNDS.round_id |
| `machine_id` | INT NOT NULL | FK to PE_MACHINES.machine_id |
| `machine_code` | NVARCHAR(50) NOT NULL | รหัสเครื่องจักร เช่น 'ROB-SPOT-001', 'SPOT-35K-001' |
| `sku` | NVARCHAR(100) NULL | รุ่นสินค้า / Part SKU (กรอกเอง เช่น '56 TC') |
| `po_no` | NVARCHAR(100) NULL | เลขที่ PO (กรอกเอง) |
| `thickness` | DECIMAL(10,3) NULL | ความหนาวัสดุ T (มม.) |
| `pull_result` | VARCHAR(10) NOT NULL | ผลทดสอบแรงดึง: 'OK', 'NG', 'SKIP' |
| `knock_check_val` | DECIMAL(10,3) NULL | ผลเช็คเคาะ (กรอกตัวเลขมม./ค่าตรวจวัด) |
| `distance_check_val` | DECIMAL(10,3) NULL | ผลเช็คระยะ (กรอกตัวเลขมม./ระยะ Pitch) |
| `recorded_at` | DATETIME NOT NULL DEFAULT GETDATE() | เวลาบันทึกจริงจาก Server (Real-time Audit Timestamp) |
| `is_skipped` | BIT DEFAULT 0 | 1 = เครื่องหยุดงาน/ไม่มีงานในรอบนี้ |
| `skip_reason` | NVARCHAR(255) NULL | เหตุผลที่ข้ามเครื่อง |
| `ng_status` | VARCHAR(30) NULL | 'PENDING_APPROVAL', 'APPROVED', 'RETESTED' |
| `ng_remark` | NVARCHAR(500) NULL | อาการ NG / รายละเอียด |
| `approved_by` | INT NULL | FK to USERS.id (หัวหน้างานที่อนุมัติผล NG) |
| `approved_at` | DATETIME NULL | เวลาที่อนุมัติ |
| `created_at` | DATETIME DEFAULT GETDATE() | |

#### 4. `dbo.IQS_ATTACHMENTS`
ตารางจัดเก็บไฟล์รูปถ่ายหลักฐานการทดสอบ (Photos Audit Proof)
| Column | Type | Notes |
|---|---|---|
| `attach_id` | INT IDENTITY PRIMARY KEY | รหัสไฟล์แนบ |
| `record_id` | INT NOT NULL | FK to IQS_TEST_RECORDS.record_id |
| `attach_type` | VARCHAR(30) NOT NULL | 'PULL_TEST' (รูปชิ้นงานดึง), 'CONTROL_PANEL' (รูปหน้าตู้คอนโทรล), 'OTHER' |
| `file_path` | NVARCHAR(500) NOT NULL | ที่อยู่ไฟล์ (uploads/iqs/YYYY-MM/...) |
| `file_name` | NVARCHAR(255) NOT NULL | ชื่อไฟล์เดิม |
| `file_size` | INT NOT NULL | ขนาดไฟล์ (bytes) |
| `sha256_hash` | CHAR(64) NOT NULL | ลายพิมพ์ดิจิทัล SHA-256 ป้องกันการปลอมแปลง |
| `uploaded_at` | DATETIME DEFAULT GETDATE() | วันเวลาที่อัปโหลด |

#### 5. `dbo.IQS_AUDIT_LOGS`
ตารางบันทึก Audit Trail ของระบบ IQS
| Column | Type | Notes |
|---|---|---|
| `log_id` | INT IDENTITY PRIMARY KEY | รหัสบันทึก |
| `record_id` | INT NULL | FK to IQS_TEST_RECORDS |
| `round_id` | INT NULL | FK to IQS_ROUNDS |
| `action_type` | VARCHAR(50) NOT NULL | 'CREATE_ROUND', 'SUBMIT_RECORD', 'SUBMIT_ROUND', 'NG_ACTION', 'UPDATE_RECORD' |
| `user_id` | INT NOT NULL | FK to USERS.id |
| `user_fullname` | NVARCHAR(200) NULL | |
| `old_data` | NVARCHAR(MAX) NULL | JSON ข้อมูลเดิมก่อนแก้ไข |
| `new_data` | NVARCHAR(MAX) NULL | JSON ข้อมูลใหม่ |
| `ip_address` | VARCHAR(50) NULL | |
| `logged_at` | DATETIME DEFAULT GETDATE() | |




