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
- [x] **Dynamic Zone Settings UI:**
  - สร้าง Modal "จัดการโซนคลังสินค้า (Zone Settings)" บน `cycleCount.php` (จำกัดสิทธิ์เฉพาะผู้มี `manage_warehouse`)
  - รองรับระบบ Batch Assign (เลือกหลายคลังพร้อมกัน -> กำหนดโซน -> บันทึก)
  - Visual Map อ่านค่าจาก `zone_name` ใน DB โดยมี Fallback Regex ป้องกันหน้าพัง
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
    - ปุ่มย้อนกลับทรงกลม 38px (`.btn-nav-back`) พร้อมแสดงชื่อ Location ชัดเจน ไม่แตกแถว
    - แถบ Scanner Toolbar ดีไซน์แบบการ์ดซอฟต์การ์ด จัดวางสวิตช์และปุ่มตัดเสียงสมดุล
    - Unified Barcode Search Group (ปุ่มกล้องสแกนสี Slate เข้ม + ช่องพิมพ์ไร้ขอบ + ปุ่มค้นหาสีน้ำเงิน)
    - Segmented Navigation Tabs (สไตล์ iOS Track `#f1f5f9` พร้อม Active Pill สีขาวและ Badges ซอฟต์พิลล์)
    - Part Cards ขอบซ้าย 4px บางประณีต พร้อมแสดงผล monospace tag สบายตา
    - ปุ่มสรุปผลตรวจนับสีเขียวมรกต Gradient
  - [x] **Zero-Count Session Safety & Clean Back Navigation:**
    - เซสชั่นสร้างในสถานะ `PENDING` และจะเปลี่ยนเป็น `IN_PROGRESS` เมื่อเริ่มนับชิ้นแรกเท่านั้น
    - หากกดย้อนกลับโดยยังไม่ได้นับอะไรเลย (`countedCount === 0`): ระบบจะลบ Empty Session ทิ้งอัตโนมัติผ่าน `cc_cancel_empty_session` และคงสถานะคลังบน Visual Map เป็นสีเทา (ไม่กลายเป็น In-Progress หลอก)
    - หากนับไปแล้ว (`countedCount > 0`): เด้งถามยืนยันก่อนออก และคงสถานะ In-Progress ไว้ให้กลับมานับต่อได้
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/cycleCount.php`, `page/storeManagement/script/cycleCount.js`, `page/storeManagement/api/api_store.php`

- [ ] **1.2 End-to-End Manual Approval Verification (UAT หน้างานจริง)**
  - [ ] ทดสอบสร้างเซสชั่น -> สแกนของจริง -> สรุปผลจบงาน
  - [ ] **ทดสอบการกด Approve ด้วยมือ** ในหน้า `inventoryDashboard.php`:
    - ตรวจสอบยอดคงเหลือใน `dbo.INVENTORY_ONHAND`
    - ตรวจสอบยอดแท็กใน `dbo.RM_SERIAL_TAGS`
    - ตรวจสอบประวัติ Ledger ใน `dbo.STOCK_TRANSACTIONS` (Reference: `CC-<count_id>`)
  - [ ] **ทดสอบการกด Reject ด้วยมือ**: ยืนยันว่าสต็อกคงเดิมและบันทึกเหตุผลถูกต้อง
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/inventoryDashboard.php`, `page/storeManagement/api/api_store.php`

- [ ] **1.3 Inventory Record Accuracy (IRA) & Zone Health Metrics**
  - [ ] พัฒนาฟังก์ชันคำนวณสูตร IRA ระดับรายการและระดับมูลค่า
  - [ ] แสดงการ์ดคะแนนสุขภาพสต็อก (เกรด A/B/C) แยกตามโซนบน Visual Map
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/cycleCount.php`, `page/storeManagement/api/api_store.php`

---

## 📍 Phase 2: Refactoring Master Data Architecture (Backlog)

> **เป้าหมาย:** แก้หนี้ทางเทคนิคตาม `STORE_MANAGEMENT_DOC.md` ข้อ 5 นำหมวดหมู่ย่อยออกจาก Hardcoded

- [ ] **2.1 Database Taxonomy & Central API**
  - [ ] ออกแบบตาราง Master หรือ View ดึงหมวดหมู่ย่อยจาก `dbo.ITEMS` แบบ Dynamic
  - [ ] สร้าง Action `get_material_categories` ใน `api_store.php` พร้อม Memory Cache
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/api/api_store.php`

- [ ] **2.2 Unified Frontend Consumption (ปรับปรุง 4 ไฟล์หลัก)**
  - [ ] สร้างฟังก์ชันกลาง `loadMaterialCategories()` ใน `script/storeCommon.js`
  - [ ] ปรับปรุง [materialReq.php](materialReq.php) & [materialReq.js](script/materialReq.js)
  - [ ] ปรับปรุง [inventoryDashboard.js](script/inventoryDashboard.js)
  - [ ] ปรับปรุง [stockLedger.js](script/stockLedger.js)
  - [ ] ทดสอบความเข้ากันได้ของตัวกรอง (Filters) ทุกหน้าจอว่าแสดงผลหมวดหมู่ตรงกัน 100%

---

## 📍 Phase 3: Advanced Enterprise Warehouse Operations (Backlog)

> **เป้าหมาย:** ระบบตรวจสอบบัญชี, การป้องกันสินค้าสูญหายมูลค่าสูง, และความทนทานต่อมุมอับสัญญาณ

- [ ] **3.1 Audit Report & Official Sign-off Engine**
  - [ ] หน้าสรุปผลการตรวจนับประวัติย้อนหลัง (Cycle Count History View)
  - [ ] Export ตารางเปรียบเทียบยอดระบบ vs ยอดจริงในรูปแบบ Excel (.xlsx / CSV BOM)
  - [ ] Export เอกสารทางการรับรองผลการตรวจนับรูปแบบ PDF พร้อมช่องลงนาม (พนักงาน/หัวหน้าคลัง/ผู้ตรวจบัญชี)
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/inventoryDashboard.php`, `page/storeManagement/api/api_store.php`

- [ ] **3.2 Two-Tier Blind Recount Protocol (นับซ้ำเมื่อดิฟสูง - Strict Manual Decision)**
  - [ ] กำหนดเกณฑ์ Trigger ยอดดิฟสูง (เช่น ผลต่าง $> \pm 10,000$ บาท หรือ $> \pm 10\%$)
  - [ ] เปลี่ยนสถานะรายการเป็น `FLAGGED_FOR_RECOUNT` (ระงับการส่งอนุมัติชั่วคราว)
  - [ ] ส่งงานให้พนักงานคนที่สองนับซ้ำแบบ Blind Count (ไม่เห็นยอดระบบและยอดคนแรก)
  - [ ] หน้าจอเปรียบเทียบ 3 คอลัมน์บนโต๊ะผู้จัดการ: **ผู้จัดการต้องเป็นผู้เลือกด้วยมือเท่านั้นว่าจะใช้ยอดใด** (ห้าม Auto-Approve)
  - *ไฟล์ที่เกี่ยวข้อง:* `page/storeManagement/cycleCount.php`, `page/storeManagement/inventoryDashboard.php`, `page/storeManagement/api/api_store.php`

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
