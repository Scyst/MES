# 📊 PE Dashboard - Calculation Logics & Formulas

This document records the exact mathematical logic used in the PE (Production Engineering) Module to calculate critical KPIs. The formulas implemented here strictly follow international TPM (Total Productive Maintenance) and accounting standards.

---

## 1. OEE (Overall Equipment Effectiveness)
OEE is calculated in `iiotAPI.php` on the fly for each machine based on real-time telemetry and shift parameters.

**Formula:** 
`OEE (%) = Availability × Performance × Quality`

### 1.1 Availability (ความพร้อมใช้งาน)
Measures the percentage of time the machine was online compared to the total time passed in the current shift.
- **Online Seconds:** Fetched from `live_counter` updates in `PE_IIOT_TELEMETRY`.
- **Passed Seconds:** Time elapsed from the start of the shift until now (or shift end).
- `Availability = (Online Seconds / Passed Seconds) * 100`

### 1.2 Performance (ประสิทธิภาพการเดินเครื่อง)
Measures the actual output speed against the theoretical maximum speed.
- **Expected Output:** `(Online Seconds / 3600) * planned_output_ph` (from `PE_MACHINES`).
- **Actual Output:** `live_counter`.
- `Performance = (Actual Output / Expected Output) * 100`
- *Note:* Capped at 100% to prevent inflation from overly conservative targets.

### 1.3 Quality (คุณภาพการผลิต)
Measures the ratio of Good Parts to Total Parts produced.
- **Total Produced:** `live_counter`.
- **Defects:** Fetched dynamically from `STOCK_TRANSACTIONS` where type is `PRODUCTION_HOLD` or `PRODUCTION_SCRAP`.
- `Quality = ((Total Produced - Defects) / Total Produced) * 100`

---

## 2. Maintenance Costs (ต้นทุนงานซ่อมบำรุง)
Calculated in `analyticsAPI.php` and `sparePartsAPI.php` to track maintenance budget utilization.

**Formula:**
`Total Cost = Spare Parts Cost + Labor Cost`

### 2.1 Spare Parts Cost (ต้นทุนค่าอะไหล่)
When a technician issues spare parts to a Work Order, the system calculates the absolute cost.
- `Parts Cost = SUM( Issued Quantity × Unit Price from LOCATIONS/ITEMS )`

### 2.2 Technician Labor Cost (ต้นทุนค่าแรงช่าง)
Calculated based on the hours spent repairing multiplied by the technician's hourly rate.
- **Repair Time:** `repair_minutes` (from `PE_WORK_ORDERS`).
- **Hourly Rate Conversion:** 
  - If rate is set to `DAILY`: `Daily Rate / 8 hours`.
  - If rate is set to `MONTHLY`: `(Monthly Rate / 30 days) / 8 hours`.
  - *Fallback:* Defaults to 200 THB/hr if no rate is specified in `MANPOWER_POSITION_RATES`.
- `Labor Cost = (repair_minutes / 60) * Hourly Rate`

---

## 3. Reliability Metrics (ความน่าเชื่อถือของเครื่องจักร)
Calculated in `analyticsAPI.php` to assess machine health and maintenance team responsiveness.

### 3.1 MTBF (Mean Time Between Failures - ระยะเวลาเฉลี่ยก่อนเครื่องเสีย)
The average time a machine runs perfectly before breaking down.
- **Total Operating Hours:** `(Days × Hours Per Day) × Number of Machines`.
- **Uptime Hours:** `Total Operating Hours - Total Downtime Hours`.
- `MTBF = Uptime Hours / Total Breakdown Events`

### 3.2 MTTR (Mean Time To Repair - ระยะเวลาเฉลี่ยในการซ่อม)
The average time it takes the maintenance team to diagnose and repair a breakdown.
- `MTTR = Average of 'repair_minutes' across all completed Work Orders.`
- *Fallback:* If no work orders exist, it falls back to the raw `avg_duration` logged directly in the `PE_DOWNTIME_LOG`.
