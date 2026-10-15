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
- **Backend Variance Correction:** Updated `cc_scan_tag` so wrong location tags record `system_qty = 0.0` and `variance_qty = +actual_qty`, ensuring surplus entries are pushed to `INVENTORY_CYCLE_COUNTS` for Manager Approval.



