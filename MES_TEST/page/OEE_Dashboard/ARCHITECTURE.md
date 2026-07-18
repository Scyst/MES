# OEE Dashboard Architecture & Calculations

เอกสารฉบับนี้อธิบายโครงสร้างและการคำนวณของ OEE Dashboard (Executive View และ Shopfloor View) เพื่อใช้เป็นแหล่งอ้างอิงสำหรับการพัฒนาต่อยอด

## 1. องค์ประกอบของระบบ (System Components)
ระบบถูกแบ่งออกเป็น 2 มุมมองหลัก:
- **Executive View (`OEE_Dashboard.php`)**: แสดงข้อมูลต้นทุน (Mat, DL, OH), ข้อมูลการเงิน (Revenue, Gross Profit) และประสิทธิภาพเครื่องจักรแบบภาพรวม
- **Shop Floor View (`OEE_Shopfloor.php`)**: แสดงบนจอทีวีในไลน์ผลิตเพื่อมอนิเตอร์สถานะ เน้นข้อมูลจำนวนชิ้นงาน (Good, Hold, Scrap) และ Revenue แบบ Real-time ตัวหนังสือขนาดใหญ่ และปิดซ่อนรายละเอียดต้นทุน 
- **API Backend**: 
  - `api/oeeDashboardApi.php`
  - `api/oeeShopfloorApi.php` (ต้องใช้ `API_KEY` ยืนยัน)

---

## 2. โครงสร้างฐานข้อมูลและการจัดเก็บข้อมูล (Data Sources)

ระบบใช้ตารางหลักในระบบ MES ดังนี้:
- `STOCK_TRANSACTIONS`: เก็บข้อมูลผลผลิต `PRODUCTION_FG`, `PRODUCTION_HOLD`, `PRODUCTION_SCRAP` รวมถึง Snapshot ต้นทุน `std_cost_mat_snapshot`, `std_cost_dl_snapshot`, `std_cost_oh_snapshot`
- `STOP_CAUSES`: เก็บเวลา Downtime ที่บันทึกโดยหน้าจอ Operator
- `MAINTENANCE_REQUESTS`: เก็บข้อมูลการแจ้งซ่อมที่ใช้คำนวณ Downtime เพื่อนำเสนอสาเหตุ Breakdown
- `LINE_SCHEDULES`: เก็บข้อมูลเวลาทำงานกะและเวลาพัก (Planned Time)
- `MANUFACTURING_ROUTES`: เก็บข้อมูลรุ่น (Model) และ Target Output (Parts/Hour)
- `MES_MANUAL_DAILY_COSTS`: เก็บข้อมูลค่าใช้จ่ายแรงงานจริง (Actual DL, OT)

---

## 3. ตรรกะการคำนวณ OEE (Stored Procedures)

การคำนวณ OEE ใช้วิธีนำข้อมูลจาก `STOCK_TRANSACTIONS`, `LINE_SCHEDULES`, และ `STOP_CAUSES` มาเข้าสูตรดังนี้

### สูตรหลักของการคำนวณ
- **Planned Minutes** = (เวลาเลิกงาน - เวลาเริ่มงาน) - เวลาพัก (จาก `LINE_SCHEDULES`)
- **Downtime Minutes** = ผลรวมเวลาหยุดเครื่อง (จาก `STOP_CAUSES`)
- **Run Time Minutes** = Planned Minutes - Downtime Minutes
- **Ideal Run Time Minutes** = จำนวนชิ้นงานที่ผลิตได้ × (60 / เป้าหมายผลิตต่อชั่วโมง `planned_output`)
- **Availability (A)** = (Run Time Minutes / Planned Minutes) × 100
- **Performance (P)** = (Ideal Run Time Minutes / Run Time Minutes) × 100
- **Quality (Q)** = (Good Count / Total Count) × 100
- **OEE** = Availability × Performance × Quality

### รายละเอียด Stored Procedures:

#### 1. `sp_CalculateOEE_Dashboard_PieChart`
- **หน้าที่**: คำนวณสรุปค่า OEE และยอดผลิตรวมในช่วงวันที่ที่กำหนด เพื่อแสดงผลใน Pie Chart/Gauge
- **Logic สำคัญ**:
  - หาก `EndDate` เท่ากับ "วันนี้" จะมีการคำนวณเวลา Planned Minutes แบบ Prorate (ตัดเฉพาะเวลาตั้งแต่ 08:00 ถึง ปัจจุบัน `GETDATE()`) เพื่อไม่ให้ Availability ติดลบเนื่องจากกะยังไม่จบ
  - TargetQty = `TotalCount` * (`RunTimeMinutes` / `IdealRunTimeMinutes`)

#### 2. `sp_CalculateOEE_Hourly_Trend`
- **หน้าที่**: คำนวณ OEE แบ่งย่อยเป็นรายชั่วโมงย้อนหลัง 24 ชั่วโมง 
- **Logic สำคัญ**:
  - ใช้ `AnchorTime` (หากเลือกวันนี้ใช้เวลาปัจจุบันเป็นตัวตั้ง, หากเลือกอดีตใช้ 08:00 ของวันถัดไป)
  - แบ่งเวลาออกเป็น 24 ช่วง (HourStart - HourEnd) แล้ว Group by หาผลรวม OEE ของแต่ละชั่วโมง
  - มีการ Prorate ชั่วโมงปัจจุบันหากยังไม่ครบ 60 นาที 

#### 3. `sp_CalculateOEE_Dashboard_LineChart`
- **หน้าที่**: คำนวณ OEE เป็นรายวันเพื่อวาด Line Chart
- **Logic สำคัญ**:
  - Group by วันที่จาก `MANPOWER_CALENDAR`
  - หากวันใดคือ "วันนี้" ระบบจะใช้วิธี Prorate `ElapsedMinutesSinceStart` (เวลาตั้งแต่ 08:00 จนถึงปัจจุบัน) ในการหา PlannedMinutes ของวันนั้นแทนที่จะใช้เต็มกะ

---

## 4. ตรรกะการคำนวณต้นทุนและการเงิน (Financial Calculations)

#### 1. `sp_CalculateProductionCostSummary` (Standard Cost)
- **หน้าที่**: คำนวณต้นทุนและรายได้มาตรฐานจาก Snapshot ใน Stock Transactions
- **สูตร**:
  - `TotalMatCost` = SUM(quantity × `std_cost_mat_snapshot`)
  - `TotalDLCost` = SUM(quantity × `std_cost_dl_snapshot`)
  - `TotalOHCost` = SUM(quantity × `std_cost_oh_snapshot`)
  - `TotalStdCost` = Mat + DL + OH
  - `Revenue` = SUM(quantity × (`std_price_snapshot` หรือ `std_price_usd_snapshot` × `exchange_rate`))

#### 2. `sp_CalculateActualCostSummary` (Actual Cost)
- **หน้าที่**: ดึงต้นทุนค่าแรงจริงที่บันทึกโดย HR/บัญชี
- **สูตร**:
  - ดึงข้อมูลจากตาราง `MES_MANUAL_DAILY_COSTS` โดยที่ `cost_category = 'LABOR'`
  - แยกผลรวม `DIRECT_LABOR` และ `OVERTIME`

#### การคำนวณ Financial Metrics เพิ่มเติม (ใน API PHP):
- **Cost Per Unit (CPU)** = `TotalStdCost` / `TotalFG`
- **Scrap Cost Value** = `ScrapQty` × (`TotalMatCost` / `TotalFG`)
- **Labor Efficiency** = `TotalStdRevenue` / `Actual DLCost` (แสดงเป็น X เท่า)
- **Gross Profit (GP)** = `TotalStdRevenue` - `TotalStdCost`

---

## 5. การวิเคราะห์ปัญหาเครื่องจักร (Downtime & Breakdown)

ในโมดูลการวิเคราะห์สาเหตุการหยุดเครื่อง (Bar Chart) มีการใช้ข้อมูลจากตาราง **`MAINTENANCE_REQUESTS`** ไม่ใช่แค่ Stop Causes:
- **Logic การหาเวลาหยุด (ใน `oeeDashboardApi.php`)**:
  - `actual_repair_minutes` (หากช่างบันทึกเวลาจริง)
  - `DATEDIFF(MINUTE, request_date, resolved_at)` (ใช้เวลาตั้งแต่แจ้งจนถึงซ่อมเสร็จ)
  - `DATEDIFF(MINUTE, request_date, GETDATE())` (ถ้ารายการยังซ่อมไม่เสร็จ)

---

## 6. แนวทางการพัฒนาฟีเจอร์ในอนาคต (Development Plan)
- *รอการกำหนดจากผู้ใช้งาน...*
