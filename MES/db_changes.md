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
