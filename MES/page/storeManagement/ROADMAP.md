# 🗺️ Store Management Development Roadmap & Anti-Loop Tracker

> **Last Updated:** 2026-10-12  
> **Module Scope:** Warehouse & Inventory Management (`page/storeManagement`)  
> **Active Focus:** Cycle Count, Visual Warehouse Map, Master Category Refactoring, and Audit Controls  

---

## ⛔ CRITICAL GOVERNANCE RULES (MUST READ BEFORE DEVELOPING)

1. **STRICT NO AUTO-APPROVAL POLICY (นโยบายห้ามอนุมัติอัตโนมัติเด็ดขาด):**
   - **ห้ามสร้างหรือเปิดใช้งานระบบ Auto-Approve ในทุกกรณี**
   - การปรับยอดสต็อก, การตัดยอดสูญหาย, ยอดเกิน, และการสรุปผลการนับซ้ำ (Recount) **ต้องผ่านการตรวจสอบและกดยืนยันด้วยมือ (Manual Approval) โดยผู้จัดการคลังสินค้าเท่านั้น**
   - ห้ามมี Cron Job, Event Trigger, หรือ Background Script ที่ข้ามขั้นตอนการอนุมัติของมนุษย์
2. **ANTI-LOOPING DIRECTIVE (คำสั่งป้องกัน Agent วนลูปงานเดิม):**
   - หัวข้อใดที่มีเครื่องหมาย `[x]` ถือว่า **พัฒนาและทดสอบเสร็จสมบูรณ์แล้ว ห้ามรื้อหรือเขียนทับ**
   - หาก User ขอให้พัฒนาต่อ ให้ตรวจสอบหัวข้อที่ยังเป็น `[ ]` ตามลำดับ Phase เท่านั้น
   - ก่อนแตะต้องไฟล์เดิม ให้ตรวจสอบประวัติในเอกสารนี้และ `db_changes.md` เสมอ

---

## 📊 Summary Status Board

| Phase | หัวข้อหลัก | สถานะ | ความเสี่ยง / กฎเกณฑ์ |
| :--- | :--- | :---: | :--- |
| **Foundation** | Visual Map, Dynamic Zones, Blind Count, Manager Integration | `COMPLETED` | ห้ามรื้อถอน (Production Ready) |
| **Phase 1** | Continuous Scan, เสียงสังเคราะห์, Manual UAT, IRA KPI | `IN PROGRESS` (1.1 Done) | **Manual Approve 100%** |
| **Phase 2** | Refactor Master Data (แก้ Hardcode หมวด PKG ใน 4 ไฟล์) | `BACKLOG` | ห้ามกระทบ Logic สต็อก |
| **Phase 3** | Audit Report (PDF/Excel), Two-Tier Recount, Offline Sync | `BACKLOG` | **Strict Human Choice** |

---

## ✅ COMPLETED WORK TRACKER (เสร็จแล้ว 100% — ห้ามรื้อทำใหม่)

- [x] **Mobile-First Layout:** ปรับแต่งหน้าจอ `cycleCount.php` ให้รองรับมือถือ, แก้ไข Padding, Scroll บังเนื้อหา, และทำปุ่ม "เริ่มตรวจนับ" Sticky ด้านล่าง
- [x] **Blind Count System:** ปิดบังยอดสต็อกและปิดบังเลขแท็กที่ยังไม่ได้นับ (`maskTag`) เพื่อให้พนักงานนับจากของจริงหน้างาน
- [x] **Visual Warehouse Map (Initial):** สร้างแผนผังจำลองคลังสินค้า แสดงสถานะด้วยสี (เทา/รอตรวจ, เหลือง/กำลังตรวจ, เขียว/เสร็จสิ้น)
- [x] **Database Schema Alteration:** 
  - เพิ่มคอลัมน์ `zone_name NVARCHAR(50) NULL` ในตาราง `dbo.LOCATIONS`
  - Seed ข้อมูลเริ่มต้นให้คลังประเภท `STORE` ทั้ง 72 คลัง
  - บันทึกลง [db_changes.md](../../db_changes.md) เรียบร้อย
- [x] **Dynamic Zone Settings UI & Modern Polish:**
  - สร้าง Modal "จัดการโซนคลังสินค้า (Zone Settings)" บน `cycleCount.php` (จำกัดสิทธิ์เฉพาะผู้มี `manage_warehouse`)
  - รองรับระบบ Batch Assign (เลือกหลายคลังพร้อมกัน -> กำหนดโซน -> บันทึก)
  - Visual Map อ่านค่าจาก `zone_name` ใน DB โดยมี Fallback Regex ป้องกันหน้าพัง
  - **Modern UI Redesign:** ปรับโฉม Modal ให้เข้าชุดกับระบบ Cycle Count ทั้งหมด (Header ซอฟต์การ์ดพร้อมไอคอนเลเยอร์, ช่องค้นหาและตัวกรองโซนสไตล์คลีน, กรอบ Batch Box พร้อม Pill Badge, ตารางคลังสินค้าสะอาดตาแบบ Monospace, และปุ่มบันทึก Gradient สีน้ำเงิน)
- [x] **Bug Fixes:**
  - แก้ไข JavaScript Error `checkTagMatch is not defined` ใน `cycleCount.js` รวมเป็น `openInputModalForTag()`
- [x] **Security & CSRF Enforcement:**
  - กำหนด CSRF Token ใน `<meta name="csrf-token">` และส่งผ่าน `FormData` ทุกคำขอ
  - บรรจุ `cc_start_session`, `cc_scan_tag`, `cc_finish_session`, `update_location_zones` ใน `$writeActions`
- [x] **Session & Approval Flow Integration:**
  - ปรับสถานะเซสชั่นตอนเริ่มนับเป็น `IN_PROGRESS` เพื่อให้ปุ่ม Visual Map แสดงสีเหลืองตรงตามการทำงาน
  - เมื่อกดจบงาน (`cc_finish_session`) ระบบจะส่งยอดดิฟทั้งหมดเข้าตาราง `dbo.INVENTORY_CYCLE_COUNTS` (สถานะ `PENDING`) อัตโนมัติ เพื่อให้ผู้จัดการเห็นในหน้า [inventoryDashboard.php](inventoryDashboard.php) ทันที

---

## 📍 Phase 1: Operational Polish & UAT (กำลังพัฒนา)

> **เป้าหมาย:** เพิ่มความเร็วในการตรวจนับหน้างานด้วยหัวยิงบาร์โค้ด และทดสอบ Flow การตัดยอดจริงโดยผู้จัดการ

- [x] **1.1 Hardware Barcode Gun & Continuous Scan Mode & Mobile UI Polish**
  - [x] ดักจับ Global Keystrokes ที่ส่งมาจากเครื่องยิงบาร์โค้ด (ความห่างแต่ละตัวอักษร $< 50\text{ ms}$)
  - [x] สวิตช์เปิด-ปิด "โหมดนับต่อเนื่อง (Continuous Scan)" บนหน้าจอ (ตั้ง Default: ปิด/OFF บังคับนับของจริง 100% เว้นแต่จะเปิดอย่างตั้งใจ)
  - [x] Logic Auto-Confirm สำหรับรายการปกติ (เฉพาะเมื่อเปิดโหมดต่อเนื่อง เพื่อความเร็วสูงสุด)
  - [x] Auto-Pause: หยุดโหมดต่อเนื่องและบังคับเด้ง Modal เมื่อเจอ "ของหลงคลัง" หรือ "ยอดไม่ตรง"
  - [x] ระบบเสียงและสั่นผ่าน Web Audio API & Vibration API (Success Beep / Error Alarm)
  - [x] **Modern UI/UX Redesign:** ปรับโฉมหน้าตรวจนับ (`viewCounting`) เป็นดีไซน์อุตสาหกรรมเกรดพรีเมียม:
    - **Interactive Location Pill (`.btn-location-pill`):** รวมการแสดงชื่อ Location และปุ่มย้อนกลับเข้าด้วยกันในพิลล์เดียว กดที่ชื่อเพื่อเปลี่ยนคลังสินค้า/ย้อนกลับ ประหยัดพื้นที่หน้าจอและดูทันสมัย
    - **Visual Map Redesign:** ปรับโฉมหน้าแผนผังคลังสินค้า (`viewSelectLocation`) ให้เข้าชุดกับหน้าตรวจนับ (การ์ดหัวข้อแบบซอฟต์การ์ด, แถบ Legend Tool-bar ไม่ล้นจอ, การ์ดโซนสไตล์โมเดิร์นพร้อมแท็กนับจำนวน, ช่องคลังสินค้าสถานะ 3 สีชัดเจน, ปุ่มเริ่มตรวจนับสไตล์โมเดิร์น)
    - แถบ Scanner Toolbar ดีไซน์แบบการ์ดซอฟต์การ์ด จัดวางสวิตช์และปุ่มตัดเสียงสมดุล
    - Unified Barcode Search Group (ปุ่มกล้องสแกนสี Slate เข้ม + ช่องพิมพ์ไร้ขอบ + ปุ่มค้นหาสีน้ำเงิน)
    - Segmented Navigation Tabs (สไตล์ iOS Track `#f1f5f9` พร้อม Active Pill สีขาวและ Badges ซอฟต์พิลล์)
    - **Shelf Monitor UI Redesign:** ปรับโฉมแผนผังจำลองชั้นวางสต็อก (Shelf Monitor) บนจอ PC ให้เข้าชุด: Header ซอฟต์การ์ดพร้อมไอคอนและ Badge แสดงคลัง, Legend Toolbar 3 สีพร้อมยอดรวมพาเลท, Pallet Cards สไตล์ Industrial Soft Tint (รอนับ=ขาว, นับแล้ว=เขียวพาสเทล, หลงคลัง=ส้มพาสเทล), และ Empty State สบายตา
    - ปุ่มสรุปผลตรวจนับสีเขียวมรกต Gradient
  - [x] **Zero-Count Session Safety & Clean Back Navigation:**
    - เซสชั่นสร้างในสถานะ `PENDING` และจะเปลี่ยนเป็น `IN_PROGRESS` เมื่อเริ่มนับชิ้นแรกเท่านั้น
    - หากกดย้อนกลับโดยยังไม่ได้นับอะไรเลย (`countedCount === 0`): ระบบจะลบ Empty Session ทิ้งอัตโนมัติผ่าน `cc_cancel_empty_session` และคงสถานะคลังบน Visual Map เป็นสีเทา (ไม่กลายเป็น In-Progress หลอก)
    - หากนับไปแล้ว (`countedCount > 0`): เด้งถามยืนยันก่อนออก และคงสถานะ In-Progress ไว้ให้กลับมานับต่อได้
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/cycleCount.php`, `page/storeManagement/script/cycleCount.js`, `page/storeManagement/api/api_store.php`

- [x] **1.2 End-to-End Manual Approval Verification (UAT หน้างานจริง)**
  - [x] ทดสอบสร้างเซสชั่น -> สแกนของจริง -> สรุปผลจบงาน
  - [x] **ทดสอบการกด Approve ด้วยมือ** ในหน้า `inventoryDashboard.php`:
    - [x] ตรวจสอบยอดคงเหลือใน `dbo.INVENTORY_ONHAND` (ปรับยอดตาม diff_qty แม่นยำ)
    - [x] ตรวจสอบยอดแท็กใน `dbo.RM_SERIAL_TAGS` (ปรับ current_qty และซิงค์ location_id เมื่อเป็นของหลงคลัง)
    - [x] ตรวจสอบประวัติ Ledger ใน `dbo.STOCK_TRANSACTIONS` (Reference: `CC-<count_id>`, ประเภท `ADJ_IN`/`ADJ_OUT`)
  - [x] **ทดสอบการกด Reject ด้วยมือ**: ยืนยันว่าสต็อกคงเดิม 100% ไม่สร้าง Transaction หลอก และบันทึกสถานะ REJECTED พร้อมผู้อนุมัติถูกต้อง
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/inventoryDashboard.php`, `page/storeManagement/script/inventoryDashboard.js`, `page/storeManagement/api/api_store.php`, `mes-toolbox/public/api/v1/inventory.php`

- [x] **1.3 Inventory Record Accuracy (IRA) & Zone Health Metrics**
  - [x] พัฒนาฟังก์ชันคำนวณสูตร IRA ระดับรายการ (Item-level IRA: $\frac{\text{Accurate Items}}{\text{Counted Items}} \times 100\%$) และระดับมูลค่า (Value-weighted IRA: $\max(0, 1 - \frac{\sum |\text{diff}| \times \text{Price}}{\sum \text{system\_qty} \times \text{Price}}) \times 100\%$)
  - [x] ออกแบบและติดตั้งแถบภาพรวมความแม่นยำคลัง (Warehouse IRA & Health Mini-Bar) แสดงสถิติ IRA รายชิ้น, IRA มูลค่า, และความคืบหน้ารอบตรวจนับ
  - [x] แสดงการ์ดคะแนนสุขภาพสต็อก (เกรด A/B/C/ยังไม่ตรวจ) แยกตามโซนบน Visual Map
  - [x] พัฒนา Interactive Zone Health Details Modal แสดงผลแจกแจงละเอียด (ยอดตรง, ยอดดิฟ, มูลค่าระบบ, ผลต่างสุทธิ) พร้อมระบบให้คำแนะนำในการบริหารสต็อก (Operational Action Guidance)
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/api/zone_health_helper.php`, `page/storeManagement/api/api_store.php`, `page/storeManagement/cycleCount.php`, `page/storeManagement/script/cycleCount.js`

---

## 📍 Phase 2: Refactoring Master Data Architecture (Backlog)

> **เป้าหมาย:** แก้หนี้ทางเทคนิคตาม `STORE_MANAGEMENT_DOC.md` ข้อ 5 นำหมวดหมู่ย่อยออกจาก Hardcoded

- [x] **2.1 Database Taxonomy & Central API**
  - [x] ออกแบบดึงหมวดหมู่ย่อยจาก `dbo.ITEMS` แบบ Dynamic พร้อมจัดกลุ่มตาม `material_type`
  - [x] สร้าง Action `get_material_categories` ใน `api_store.php` พร้อมแมปชื่อภาษาไทยและรหัสมาตรฐาน
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/api/api_store.php`

- [x] **2.2 Unified Frontend Consumption (ปรับปรุง 4 ไฟล์หลัก)**
  - [x] สร้างฟังก์ชันกลาง `loadMaterialCategories()` ใน `script/storeCommon.js` พร้อม sessionStorage Cache
  - [x] ปรับปรุง [materialReq.php](materialReq.php) & [materialReq.js](script/materialReq.js) รองรับชิปหมวดหมู่หลักและหมวดหมู่ย่อยแบบ Dynamic
  - [x] ปรับปรุง [inventoryDashboard.js](script/inventoryDashboard.js) โหลดตัวกรองหมวดหมู่ย่อยแบบ Dynamic
  - [x] ปรับปรุง [stockLedger.js](script/stockLedger.js) โหลดตัวกรองหมวดหมู่ย่อยแบบ Dynamic
  - [x] ทดสอบความเข้ากันได้ของตัวกรอง (Filters) ทุกหน้าจอผ่าน E2E Puppeteer ว่าแสดงผลหมวดหมู่ตรงกัน 100%

---

## 📍 Phase 3: Advanced Enterprise Warehouse Operations (In Progress)

> **เป้าหมาย:** ระบบตรวจสอบบัญชี, การป้องกันสินค้าสูญหายมูลค่าสูง, และความทนทานต่อมุมอับสัญญาณ

- [x] **3.1 Audit Report & Official Sign-off Engine**
  - [x] ปรับรอบการนับและการคำนวณ IRA ทั้งหมดเป็นรอบประจำเดือน (Monthly Cycle) รีเซ็ตความก้าวหน้าอัตโนมัติทุกวันที่ 1 ของเดือน
  - [x] หน้าสรุปผลการตรวจนับประวัติย้อนหลัง (Cycle Count History View & Audit Ledger Modal) พร้อม Quick Period Filters (เดือนนี้/เดือนก่อน/30 วันล่าสุด) และ Location/Status Filters
  - [x] สรุปตัวชี้วัดความแม่นยำสต็อกและกระทบยอดเงิน (System vs Actual Qty, Net Variance Value THB)
  - [x] Export ตารางเปรียบเทียบยอดระบบ vs ยอดจริงในรูปแบบ Excel (.csv พร้อม UTF-8 BOM รองรับภาษาไทย 100%)
  - [x] Export ใบรับรองผลการตรวจนับทางการรูปแบบ PDF / Print Ready (`print_cycle_count_audit.php`) พร้อมสรุปเกรดสุขภาพคลัง และ 3 ช่องลงนาม (พนักงานตรวจนับ / หัวหน้าแผนกสโตร์ / ผู้จัดการโรงงาน-บัญชี) ตามมาตรฐาน ISO 9001 / IATF 16949
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/components/InventoryModal.php`, `page/storeManagement/script/inventoryDashboard.js`, `page/storeManagement/print_cycle_count_audit.php`, `page/storeManagement/api/api_store.php`, `page/storeManagement/api/zone_health_helper.php`, `page/storeManagement/cycleCount.php`

- [x] **3.2 Two-Tier Blind Recount Protocol (นับซ้ำเมื่อดิฟสูง - Strict Manual Decision)**
  - [x] กำหนดเกณฑ์ Trigger ยอดดิฟสูง ($|\text{diff}| \times \text{Price} \ge 10,000$ บาท หรือ $|\text{diff}| \ge 10\%$ และ $\ge 5$ ชิ้น)
  - [x] เปลี่ยนสถานะรายการเป็น `FLAGGED_FOR_RECOUNT` บันทึกยอดรอบแรกและระงับการอนุมัติ
  - [x] ส่งงานให้พนักงานนับซ้ำหน้างานแบบ Blind Count 100% (ไม่แสดงยอดระบบและยอดรอบแรก) ผ่าน `#tier2RecountModal` และแบนเนอร์แจ้งเตือน
  - [x] หน้าจอเปรียบเทียบ 3 คอลัมน์บนโต๊ะผู้จัดการ (`#recountDecisionModal`): แสดงยอดระบบเดิม / ยอดนับรอบ 1 / ยอดนับซ้ำรอบ 2 พร้อมผลต่างมูลค่าและผู้ตรวจนับ
  - [x] บังคับให้ผู้จัดการเลือกยอดด้วยมือเท่านั้น (Strict Manual Decision: COUNT_1, RECOUNT, SYSTEM) พร้อมระบุเหตุผล (Decision Reason) เป็น Audit Trail ตาม ISO/IATF
  - [x] ปรับ Layout & Padding ฝั่งซ้าย-ขวาบนจอ PC ให้ชิดขอบบนเท่ากันเสมอกัน 100% (`top: 79px, height: 65px`)
  - [x] จัดการความยาวข้อความและ Badges ในแถบ IRA Health Mini-Bar ให้อยู่ในบรรทัดเดียว ไม่ซ้อนหลายบรรทัดบนมือถือ
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/cycleCount.php`, `page/storeManagement/script/cycleCount.js`, `page/storeManagement/components/InventoryModal.php`, `page/storeManagement/script/inventoryDashboard.js`, `page/storeManagement/api/api_store.php`

- [ ] **3.3 Offline Resilience & Network Drop Protection**
  - [ ] ระบบตรวจจับสัญญาณเครือข่าย (`online` / `offline` event) พร้อมแบนเนอร์แจ้งเตือนสถานะ
  - [ ] บันทึกข้อมูลการสแกนลง `IndexedDB` ชั่วคราวเมื่ออยู่ในมุมอับสัญญาณ
  - [ ] ล็อกการกดจบงาน (`cc_finish_session`) ขณะออฟไลน์
  - [ ] ซิงค์ข้อมูลขึ้นเซิร์ฟเวอร์อัตโนมัติเมื่อต่อสัญญาณติด (FIFO Queue)
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/script/cycleCount.js`

---

## 🔄 Change Log & Multi-Agent History

| วันที่ | Agent | กิจกรรมที่ทำ | ไฟล์ที่แก้ไข |
| :--- | :--- | :--- | :--- |
| **2026-10-10** | Manager Agent | ปรับปรุง Layout มือถือ, สร้าง Visual Map ด้วย Regex เบื้องต้น | `cycleCount.php`, `cycleCount.js` |
| **2026-10-12** | Antigravity | เพิ่มคอลัมน์ `zone_name`, สร้าง UI จัดการโซน, แก้บั๊ก `checkTagMatch`, เชื่อมระบบอนุมัติผู้จัดการ, บังคับ CSRF, สร้าง Roadmap Tracker | `db_changes.md`, `cycleCount.php`, `cycleCount.js`, `api_store.php`, `ROADMAP.md` |
| **2026-10-12** | Antigravity | พัฒนา Phase 1.1: Barcode Gun Keystrokes Listener, Continuous Scan Mode (Auto-Confirm), Auto-Pause เมื่อเจอของหลงคลัง, เสียงสังเคราะห์ Web Audio API และการสั่น | `cycleCount.php`, `cycleCount.js`, `api_store.php`, `ROADMAP.md` |
| **2026-10-12** | Antigravity | ปรับปรุง UX/UI: เพิ่มปุ่มย้อนกลับไปเปลี่ยน Location, รวมแถบสแกนให้กะทัดรัด, แปลงข้อความอธิบายเป็น Tooltips ลดพื้นที่แนวตั้ง | `cycleCount.php`, `cycleCount.js`, `ROADMAP.md` |
| **2026-10-14** | Antigravity | ปรับปรุง Shelf Legend Spacing & Red Status Indicator, พัฒนาและทดสอบ Phase 1.2 End-to-End Manual Approval Verification (UAT): อัปเดต `sp_Store_ApproveCycleCount` ซิงค์ location_id ป้องกัน underflow, แสดง Serial No. ใน Approval Modal, ตรวจสอบ Onhand, Tag Qty และ Stock Ledger ครบถ้วน | `cycleCount.php`, `cycleCount.js`, `inventoryDashboard.js`, `api_store.php`, `inventory.php`, `db_changes.md`, `ROADMAP.md` |
| **2026-10-14** | Antigravity | พัฒนา Phase 1.3: Inventory Record Accuracy (IRA) & Zone Health Metrics: สร้าง `zone_health_helper.php`, เพิ่ม Action `get_zone_health_metrics`, เพิ่มแถบ Warehouse IRA Mini-Bar, Grade Badges A/B/C บน Visual Map, และ Interactive Zone Health Drilldown Modal พร้อมคำแนะนำเกรดสต็อก | `zone_health_helper.php`, `api_store.php`, `cycleCount.php`, `cycleCount.js`, `ROADMAP.md` |
| **2026-10-14** | Antigravity | พัฒนา Phase 2: Refactoring Master Data Architecture (2.1 & 2.2): สร้าง Dynamic Taxonomy API `get_material_categories`, สร้าง `loadMaterialCategories()` พร้อม sessionStorage caching ใน `storeCommon.js`, ลบ Hardcoded Sub-types ใน `inventoryDashboard.js`, `stockLedger.js`, `materialReq.js` และทดสอบ E2E สมบูรณ์ | `api_store.php`, `storeCommon.js`, `inventoryDashboard.js`, `stockLedger.js`, `materialReq.js`, `ROADMAP.md` |
| **2026-10-14** | Antigravity | ปรับรอบการตรวจนับเป็น Monthly Cycle ประจำเดือน และพัฒนา Phase 3.1 Audit Report & Official Sign-off Engine: ออกแบบและสร้าง `print_cycle_count_audit.php` (A4 Landscape, ISO Certificate, 3 Signature Blocks), ปรับปรุง `ccHistoryModal` ใน `InventoryModal.php` ให้มีตัวกรองช่วงเวลา/คลัง/สถานะและแถบ KPI กระทบยอด, พัฒนา `exportCcHistoryExcel()` (UTF-8 BOM), และทดสอบ E2E สมบูรณ์ | `zone_health_helper.php`, `cycleCount.php`, `api_store.php`, `InventoryModal.php`, `inventoryDashboard.js`, `print_cycle_count_audit.php`, `ROADMAP.md` |
