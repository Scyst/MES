# Code Review: Multi-Dimensional Grading System

> [!NOTE]
> ตรวจสอบโค้ดจากทั้ง 3 ไฟล์หลัก: Backend API, Frontend PHP, Frontend JS
> เทียบกับ database schema จริงที่รันอยู่ (verified via MCP)

---

## ✅ สิ่งที่ทำได้ดี

1. **Database schema เป็น additive** — คอลัมน์ใหม่ทั้งหมดเป็น `NULL`able ไม่ทำลายข้อมูลเก่า
2. **Legacy backward-compatible** — ยังคงเก็บ `grade` column เดิมไว้ พร้อม map จาก `grade_overall`
3. **Attendance calculation ใช้ข้อมูลจริง** — ดึงจาก `MANPOWER_DAILY_LOGS` ตรง ไม่ได้เดามา
4. **Criteria modal ขยายรองรับ Attendance thresholds** — UX ถูกทาง ตั้งค่าแยก Line ได้
5. **Auto-calculate Overall Grade ฝั่ง client** — ผู้ใช้เห็นผลทันทีโดยไม่ต้อง save ก่อน

---

## 🐛 บัคที่ต้องแก้ (Confirmed Bugs)

### Bug 1: `late_days` / `absent_days` ไม่ได้ SELECT จาก main query

> [!CAUTION]
> SQL query ใน `get_grading_data` **ไม่ได้ SELECT `WAGE.late_days` และ `WAGE.absent_days`** ในส่วน outer SELECT clause

ดูบรรทัดที่ 39-62 ของ [api_employee_grading.php](file:///e:/MES/MES/MES/page/manpower/api/api_employee_grading.php#L39-L62):

```sql
SELECT 
    E.emp_id, E.name_th, E.position, E.line, E.team_group,
    G.grade, G.notes,
    ISNULL(INC.income_per_head, 0) AS income_per_head,
    ISNULL(WAGE.total_wage, 350.0) AS total_wage,
    ISNULL(WAGE.dl_wage, 350.0) AS dl_wage,
    ISNULL(WAGE.ot_wage, 0.0) AS ot_wage,
    ISNULL(WAGE.ot_hours, 0.0) AS ot_hours,
    -- ❌ WAGE.late_days ไม่ได้อยู่ใน SELECT!
    -- ❌ WAGE.absent_days ไม่ได้อยู่ใน SELECT!
    C.threshold_a, C.threshold_b, C.threshold_c,
    ...
```

แต่ PHP code บรรทัด 195-196 เรียกใช้ `$emp['late_days']` / `$emp['absent_days']` →  
ค่าจะเป็น `null` ตลอด → `$infractions` = 0 เสมอ → **ทุกคนจะได้ Attendance Grade = A**

**Fix:** เพิ่ม `ISNULL(WAGE.late_days, 0) AS late_days, ISNULL(WAGE.absent_days, 0) AS absent_days` เข้าไปใน outer SELECT

---

### Bug 2: Analytics Charts ยังอ้าง `emp.grade` (ไม่ใช่ `grade_overall`)

[employeeGrading.js บรรทัด 373](file:///e:/MES/MES/MES/page/manpower/script/employeeGrading.js#L373):
```javascript
if (emp.grade && ['A','B','C','D'].includes(emp.grade)) {
```

ตอนนี้ `emp.grade` จะเป็น legacy field ที่ค่าว่างเปล่าสำหรับข้อมูลใหม่ →  
**Chart "Grade Distribution" จะแสดง "Unassigned" เกือบทุกคน** แม้ว่าจะมี grade_overall แล้วก็ตาม

**Fix:** เปลี่ยนเป็น `emp.grade_overall`

---

### Bug 3: `colspan="7"` ล้าสมัย — ควรเป็น `11`

[employeeGrading.js บรรทัด 298](file:///e:/MES/MES/MES/page/manpower/script/employeeGrading.js#L298):
```javascript
html = `<tr><td colspan="7" ...>No employees found...</td></tr>`;
```

ตอนนี้มี 11 คอลัมน์ (EmpID, Name, Position, Income, Wage, IPH, 5S, Attd, Learn, Overall, Notes) ถ้า colspan ไม่ตรง row จะไม่ span เต็มความกว้าง

---

### Bug 4: Attendance Grade fallback defaults ไม่สมเหตุสมผล

[api_employee_grading.php บรรทัด 200-202](file:///e:/MES/MES/MES/page/manpower/api/api_employee_grading.php#L200-L202):
```php
$maxA = isset($emp['att_max_late_a']) ? (int)$emp['att_max_late_a'] : 0;
$maxB = isset($emp['att_max_late_b']) ? (int)$emp['att_max_late_b'] : 1;
$maxC = isset($emp['att_max_late_c']) ? (int)$emp['att_max_late_c'] : 2;
```

ถ้า Line ที่ยังไม่ได้ตั้ง criteria (ไม่มี row ใน `EMPLOYEE_GRADING_CRITERIA`) → `att_max_late_a` จะเป็น `null` ไม่ใช่ `0` →
ตรงนี้ `isset` จะ return false → fallback ใช้ค่า 0, 1, 2 ซึ่งอาจจะถูกหรือไม่ก็ได้

**แต่ปัญหาจริงคือ**: ถ้าค่าใน DB เป็น `0` (ค่าที่ตั้ง default) แล้ว `isset` return `true` → `(int)0` = 0 → ใช้ค่า 0 ถูกต้อง  
แต่ถ้าค่าเป็น `NULL` จาก DB → PDO จะ return PHP `null` → `isset(null)` = false → ใช้ fallback  
**ผลลัพธ์**: พฤติกรรมถูกต้อง แต่ไม่ต้องการให้ระบบคำนวณเกรดให้อัตโนมัติถ้ายังไม่ได้ตั้งเกณฑ์  

**คำแนะนำ**: ถ้า LINE ไม่มีเกณฑ์ attendance เลย ควร return `attGrade = 'N/A'` แทนที่จะ hardcode fallback

---

## ⚠️ ข้อกังวลด้านออกแบบ (Design Concerns)

### 1. Overall Grade = Simple Average → อาจไม่ตรงความต้องการจริง

ตอนนี้ใช้ค่าเฉลี่ยแบบถ่วงน้ำหนักเท่ากัน (A=4, B=3, C=2, D=1):
```
Overall = average of non-empty dimensions
>= 3.5 → A, >= 2.5 → B, >= 1.5 → C, else D
```

**ตั้งข้อสังเกต**:
- ถ้ามี IPH = A(4) + 5S = D(1) → เฉลี่ย 2.5 → ได้ **B** ← สมเหตุไหม?
- ถ้ามีแค่ IPH = A → เฉลี่ย 4.0 → ได้ **A** (จากแค่ 1 มิติ) ← ควรต้องมีขั้นต่ำกี่มิติ?
- ผู้บริหารอาจต้องการ **น้ำหนักต่างกัน** (เช่น IPH สำคัญ 40%, 5S 20%, Attendance 30%, Learning 10%)

> [!IMPORTANT]
> **แนะนำ**: สอบถามผู้บริหารก่อน deploy ว่า:
> 1. ต้องการถ่วงน้ำหนักแต่ละมิติต่างกันไหม?
> 2. มีจำนวนมิติขั้นต่ำที่ต้องมีก่อนที่จะออก Overall ไหม?
> 3. ถ้ามิติใดมิติหนึ่ง = D แล้ว Overall ควร cap ที่ C ไหม? (เช่น ขาดงานเยอะ แม้ผลิตดี ก็ไม่ควรได้ A)

### 2. Attendance เกณฑ์เป็น "per Line" → ทำไมไม่ใช้ค่าเดียวทั้งโรงงาน?

ตอนนี้ att_max_late_a/b/c ผูกกับ `EMPLOYEE_GRADING_CRITERIA.line`  
หมายความว่าแต่ละ Line จะตั้งเกณฑ์ขาดลามาสายแตกต่างกัน ซึ่ง:
- **IPH Ratio** → ตั้งแยก Line สมเหตุสมผล (แต่ละ Line ผลิตของต่างกัน ต้นทุนต่างกัน)
- **Attendance** → ปกตินโยบายบริษัทจะเป็นเกณฑ์เดียวกันทุก Line  

**ไม่ใช่บัค** แต่ควรถามว่าผู้บริหารต้องการตั้งค่า attendance แยก line จริงหรือเปล่า ถ้าไม่ ควรแยกเป็นตารางกลางหรือ global config

### 3. 5S Grade ไม่มี System Grade → ต้อง Manual ทั้งหมด

ไม่มี system recommendation สำหรับ 5S → ผู้ใช้ต้องเลือกทุกคนเอง ซึ่ง:
- ถ้ามีพนักงาน 200 คน ต้องกดเลือก 200 ครั้ง
- **คำแนะนำ**: เพิ่มปุ่ม "Set Default 5S for Line" ให้ตั้งเกรดเริ่มต้นทั้ง Line แล้วแก้เฉพาะคนที่พิเศษ

---

## 💡 ข้อเสนอแนะเพิ่มเติม

| # | เรื่อง | รายละเอียด |
|---|--------|-----------|
| 1 | **แสดง Late/Absent Days ใน UI** | ตอนนี้ API ส่ง `late_days` และ `absent_days` มาแล้ว แต่ UI ไม่แสดง → ผู้ประเมินไม่เห็นข้อมูลสนับสนุน ควรแสดงเป็น tooltip หรือ small text ใต้ Attd grade |
| 2 | **Export ยังใช้โครงสร้างเก่า** | ฟังก์ชัน `createWorksheetFromData` และ `exportToCSV` ยังอ้าง `emp.system_grade`, `emp.adjusted_grade`, `emp.final_grade` ซึ่งไม่มีอยู่ใน JSON payload ใหม่แล้ว → Excel export จะแสดง `-` ทุกช่อง |
| 3 | **Sorting บน grade columns ใหม่จะพัง** | Sorting logic ใน `renderTable` ใช้ `a[col]` โดยตรง แต่ค่า grade เป็น `'A'`, `'B'`, `'C'`, `'D'`, `''` ← sort ตัวอักษรจะทำงานได้ค่อนข้างถูก **แต่ค่าว่าง `''` จะถูก sort ก่อน A** ซึ่งอาจไม่ใช่สิ่งที่ต้องการ |
| 4 | **Audit trail หายไป** | `save_grades` ไม่ได้เรียก `writeLog()` เลย → ถ้ามีคนเปลี่ยนเกรดพนักงาน จะไม่มี log ว่าใครเปลี่ยน เมื่อไหร่ อะไรเปลี่ยน (ละเมิด AGENTS.md: AUDIT_COMPLETENESS) |

---

## 📋 สรุปสิ่งที่ต้องแก้ก่อน Deploy

| ลำดับ | ความสำคัญ | รายการ |
|-------|-----------|--------|
| 1 | 🔴 Critical | เพิ่ม `WAGE.late_days`, `WAGE.absent_days` ใน SQL outer SELECT |
| 2 | 🟡 Medium | เปลี่ยน chart aggregation จาก `emp.grade` → `emp.grade_overall` |
| 3 | 🟢 Low | แก้ `colspan="7"` → `"11"` |
| 4 | 🟡 Medium | อัพเดต Export functions ให้ใช้ field names ใหม่ |
| 5 | 🟡 Medium | เพิ่ม `writeLog()` ใน `save_grades` |

---

คุณต้องการให้ผมแก้บัค Critical ก่อนเลยไหมครับ? หรือจะ confirm เรื่อง Overall Grade weighting กับผู้บริหารก่อน?
