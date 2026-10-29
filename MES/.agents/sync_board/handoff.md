# Handoff Document: Store Management (Cycle Count)

## Context / Goal
- พัฒนาระบบตรวจนับสินค้าในคลัง (Cycle Count) สำหรับใช้งานบนมือถือเป็นหลัก
- ปรับเปลี่ยน UI/UX จากเดิมที่เป็นปุ่มเรียงกันยาวๆ ให้เป็นรูปแบบ **Visual Warehouse Map (แผนผังจำลองคลังสินค้า)** เพื่อให้พนักงานเข้าใจโซนต่างๆ ได้ง่ายขึ้น
- ระบบต้องรองรับการนับแบบ "Blind Count" (ซ่อนจำนวนที่มีอยู่ในระบบจากสายตาพนักงาน)

## Completed Work (สิ่งที่ทำเสร็จแล้ว)
- [x] แก้ไขปัญหา Layout บนมือถือ (Padding ซ้ายขวาไม่เท่ากัน, Scroll บังเนื้อหา)
- [x] พัฒนาฟีเจอร์ Visual Map โดยใช้ Regex ตัดคำจากชื่อ Location อัตโนมัติ (เช่น นำหน้าด้วย A -> โซน A, นำหน้า BR- -> โซน B (ย่อย))
- [x] เพิ่ม Legend สถานะ (รอตรวจ/เทา, กำลังตรวจ/เหลืองลาย, เสร็จสิ้น/เขียว)
- [x] ทำปุ่ม "เริ่มตรวจนับ" แบบ Sticky ให้อยู่ด้านล่างสุดของจอเสมอ
- [x] เพิ่มคอลัมน์ `zone_name` ในตาราง `dbo.LOCATIONS` และบันทึกลง `db_changes.md`
- [x] สร้างหน้า UI Modal "จัดการโซนคลังสินค้า (Zone Settings)" พร้อม Batch Assignment และอัปเดต Visual Map ตามโซนจริง
- [x] แก้ไขบั๊ก `checkTagMatch` is not defined ใน `cycleCount.js`
- [x] บังคับใช้และส่ง CSRF Token ครบทุก Endpoint ใน Cycle Count
- [x] ปรับสถานะเซสชั่นเป็น `IN_PROGRESS` เมื่อเริ่มตรวจนับเพื่อให้สีปุ่มแสดงถูกต้อง
- [x] เชื่อมโยง Flow ยอดตรวจนับดิฟ/ของสูญหายเข้าตาราง `dbo.INVENTORY_CYCLE_COUNTS` เพื่อให้หัวหน้างานกด Approve/Reject ในหน้า `inventoryDashboard.php` ได้ทันที

## Actionable Next Steps (สิ่งที่ต้องทำต่อ / ยังไม่ได้ทำ)
- [ ] ติดตามการพัฒนาตาม Master Roadmap ใน [page/storeManagement/ROADMAP.md](../../page/storeManagement/ROADMAP.md):
  - **Phase 1:** Continuous Scan, Audio/Vibration Beep, ทดสอบ Flow อนุมัติจริงโดยหัวหน้างาน (ห้าม Auto-Approve), IRA Metrics
  - **Phase 2:** Refactor Master Data หมวดหมู่ย่อยสินค้า ดึงจาก DB แทน Hardcoded ใน 4 ไฟล์
  - **Phase 3:** Audit Reports (PDF/Excel), Two-Tier Recount Protocol, Offline Resilience
- [ ] **ข้อควรระวังสำคัญ:** ห้ามมีระบบ Auto-Approve เด็ดขาด และห้ามรื้อส่วนที่ `[x]` เสร็จแล้ว

## Exact Files to Modify (ไฟล์ที่เกี่ยวข้อง)
- `page/storeManagement/ROADMAP.md` (Master Tracker & Anti-Loop Documentation)
- `page/storeManagement/STORE_MANAGEMENT_DOC.md` (เอกสารสถาปัตยกรรมโมดูล)
- `page/storeManagement/cycleCount.php` (UI หลัก)
- `page/storeManagement/script/cycleCount.js` (สคริปต์ควบคุม UI)
- `page/storeManagement/api/api_store.php` (Backend API)


---

# 🌙 Handoff Section: Night-Shift System Architecture Migration & Workstation Sync (2026-10-29)

## Context / Goal
- จัดตั้งระบบทำงานคู่ขนาน **Daytime (Feature Development ที่ทำงาน)** ควบคู่กับ **Night-Shift (System Architecture Refactoring & Migration ที่บ้าน)**
- รองรับการส่งต่องานแบบไร้รอยต่อระหว่าง **Gemini 4 Argon** (วางแผน/วิเคราะห์โครงสร้าง) และ **Flash** (ลงมือ Refactor ตามแผนเมื่อสลับโควต้า)
- ซิงค์ MCP Server และ Skills ทั้งหมดจากเครื่องหลักที่ทำงาน (`E:\MES\MES\MES`) มายังเครื่องที่บ้าน (`C:\Users\USER\Desktop\Project\MES`)

## Completed Work (สิ่งที่ทำเสร็จแล้วคืนนี้)
- [x] ดึง Git เวอร์ชันล่าสุด (`git fetch --all` & `git pull origin main` -> `b2612d59`)
- [x] สำรวจโครงสร้างโปรเจ็คทั้งหมด (`MES/page/*` 30 โมดูล, `mes-v2`, `mes-toolbox`, `mes-learning-hub`, `mes-mobile-app`, `mes-team-planner`, `transport-system`, `estate-crm`, `SystemMonitorTauri`)
- [x] ตั้งค่า Root Skill & Rule Discovery ที่เครื่องบ้าน (`.agents/skills.json` และ `AGENTS.md` ที่ระดับ Root) เพื่อให้โหลดสกิลใน `MES/.agents/skills/` ได้อัตโนมัติ
- [x] ตั้งค่า Global MCP Config (`C:\Users\USER\.gemini\config\mcp_config.json`) สำหรับเครื่องที่บ้าน
- [x] สร้างเอกสารแจ้งตัวหลักที่ทำงานและแผนแม่บทสถาปัตยกรรมใน `MES/.agents/WORKSTATION_SYNC_REQUEST.md`
- [x] แก้ปัญหา GitHub Reject ไฟล์ขนาดใหญ่เกิน 100MB (`MES/AutoBot/AutoBot.exe` 115MB) โดยเพิ่มเข้า `.gitignore`
- [x] แยกโปรเจ็ค `SystemMonitorBackend` และ `SystemMonitorTauri` ออกไปยัง Git Repository แยกต่างหากที่ `C:\Users\USER\Desktop\Project\SystemMonitor`
- [x] ตรวจสอบยืนยันว่า `MES/page/storeManagement/api/api_store.php` (72 actions) เป็น Superset 100% ของ `MES/mes-toolbox/public/api/v1/inventory.php` (50 actions) และลบ `MES/mes-toolbox/` ออกอย่างปลอดภัย
- [x] ลบโฟลเดอร์และไฟล์ที่ไม่ได้ใช้แล้วรวม 2,376 ไฟล์ (~213.4 MB): `MES_TEST/`, `MES/Toolbox2/` (โฟลเดอร์เก็บ build เก่า), `MES/estate-crm/`, `MES/mes-toolbox/`, `MES/page/AccessoriesInspection/img/` (ลบเฉพาะรูปสำรอง 176 รูป แต่เก็บโค้ดระบบไว้ครบ), `MES/page/managementCopy/`, `MES/page/salesCopy/`, `MES/page/maintenancePE/`, `MES/page/SAP_Sync/`, `MES/page/sap_db.php` และไฟล์รายงานชั่วคราว พร้อมถอดลิงก์ที่ตายแล้วออกจาก `nav_dropdown.php`

- [x] เปลี่ยนชื่อโฟลเดอร์ `MES/mes-v2` เป็น `MES/Toolbox2` (`git mv MES/mes-v2 MES/Toolbox2`) เพื่อให้ตรงกับพาร์ทจริงบน FTP (`/Toolbox2`) แบบ 1:1 และปรับ `upload.cjs` ให้ใช้ `path.join(__dirname, 'dist')`
- [x] ย้ายระบบจองรถรับส่งพนักงาน (`MES/transport-system`) เข้าสู่ `MES/Toolbox2/src/modules/Transport/` และ API ไปที่ `MES/Toolbox2/public/api/transport/` พร้อมเชื่อมเมนูใน `DesktopSidebar.jsx` & `HomeDashboard.jsx` และรัน `vite build` ผ่าน 100%
- [x] พอร์ตระบบ `MES/mes-team-planner` เข้าสู่ `MES/Toolbox2/src/modules/TeamPlanner/` (Route `#/planner/*`) โดยคงโฟลเดอร์ `MES/mes-team-planner` เดิมไว้ 100% พร้อมแก้บั๊ก `require('react-router-dom').useLocation()` ใน `App.jsx`, เพิ่ม `ErrorBoundary.jsx`, และรันบอท Puppeteer ทดสอบครบ 20 หน้า/แท็บย่อย ยืนยัน `0 errors` ไร้จอขาว 100%
- [x] ลบโมดูลจำลองที่ไม่สมบูรณ์ (`QMS`, `MoodInsight`) ใน `MES/Toolbox2` และชี้ลิงก์ใน `HomeDashboard.jsx` กลับไปที่ `MES/page` พร้อมอัปเกรดโครงสร้างพื้นฐาน (`AuthContext.jsx`, `InactivityTimeoutModal.jsx`, `AppLayout.jsx`, `DesktopSidebar.jsx`, `login.php`, `check.php`, `logout.php`) ให้รองรับ Cross-Tab Logout/Login Sync (`mes_auth_channel`), Inactivity Auto-Logout (60m + 30s countdown), Live Session Heartbeat (45s), และ Live Header Performance (`api_my_performance.php`) ทดสอบผ่านด้วย Puppeteer Multi-Tab E2E 100%
- [x] ยกระดับ `MES/Toolbox2` ให้พึ่งพาตัวเองได้ 100% (**100% Self-Contained Architecture**): พอร์ต Backend PHP API ทั้งหมดเข้าสู่ `MES/Toolbox2/public/api/` (`dailyLog/`, `manpower/`, `profile/`, `paintChem/` 10 ไฟล์, `planner/` 22 ไฟล์) และสร้าง `AccountSettingsModal.jsx` ใน `Toolbox2` ยืนยันผ่าน Puppeteer E2E ว่าไม่มีการยิง API ออกนอก `/Toolbox2/` แม้แต่รายการเดียว (`External API Calls: 0`)
- [x] บันทึก **"แผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น (4-Layer Core Foundation Roadmap)"** ลงใน `MES/Toolbox2/ARCHITECTURE.md` เพื่อส่งต่อให้ Agent ตัวหลักที่ทำงานหรือกะถัดไปดำเนินการตามลำดับ
- [x] จัดทำ **"พิมพ์เขียวแม่บทของระบบ (MES System Master Blueprint)"** ตามคำสั่งผู้บริหาร ทั้งในรูปแบบเอกสารวิศวกรรม/คู่มือรับช่วงต่อ (`MES/docs/blueprint/MES_SYSTEM_BLUEPRINT.md`) และไฟล์โครงสร้างกราฟ JSON (`MES/docs/blueprint/blueprint_graph.json`) สำหรับนำไปสร้างเป็น Interactive Visual Blueprint ต่อได้ทันที

## Actionable Next Steps (สำหรับตัวหลักที่ทำงาน & กะกลางคืนถัดไป)
- [ ] **[สำหรับตัวหลักที่ทำงานพรุ่งนี้เช้า]:**
  1. อ่านไฟล์ `MES/.agents/WORKSTATION_SYNC_REQUEST.md` เพื่อนำ `MES/mcp_server/index.mjs` ออกจาก `.gitignore` (หากไม่มีข้อมูลลับ หรือแยกเข้า `.env` แล้ว) และคัดลอก Global Skills อื่นๆ (ถ้ามี) เข้ามาใน `MES/.agents/skills/` แล้ว Push ขึ้น Git
  2. ดึงไฟล์ใน `/MES/MES/page/AccessoriesInspection/` จาก FTP ลงมาเทียบกับใน Git (เผื่อเพื่อนอัปเดตโค้ดขึ้น FTP โดยตรง) โดยคงส่วนที่เก็บรูปใน `../../uploads/accessories_inspection/` เอาไว้
  3. ตรวจสอบและดำเนินการต่อตาม **"แผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น (4-Layer Core Foundation Roadmap)"** ใน `MES/Toolbox2/ARCHITECTURE.md` (เริ่มจาก Layer 1: Shared UI/API Utilities -> Layer 2: User Management 100% Parity -> Layer 3: System Settings -> Layer 4: Full Profile Page)
- [ ] **[สำหรับงานพิมพ์เขียวผู้บริหาร (Visual Blueprint Extension)]:**
  - หากผู้บริหารต้องการหน้าจอ Interactive Visual Blueprint (คล้ายผังไฟฟ้า/เครื่องจักรที่คลิกดูสถานะสดได้) ให้ Agent อ่าน `MES/docs/blueprint/MES_SYSTEM_BLUEPRINT.md` (หัวข้อที่ 8) และใช้ข้อมูลโหนด/เส้นเชื่อมจาก `MES/docs/blueprint/blueprint_graph.json` สร้างโมดูล `MES/Toolbox2/src/modules/SystemBlueprint/` ได้ทันที

## Exact Files to Modify / Reference
- `MES/docs/blueprint/MES_SYSTEM_BLUEPRINT.md` (พิมพ์เขียวแม่บทของระบบ MES & คู่มือส่งมอบงานผู้บริหาร)
- `MES/docs/blueprint/blueprint_graph.json` (Machine-Readable Node/Edge Graph Schema สำหรับสร้าง Visual Blueprint)
- `MES/Toolbox2/ARCHITECTURE.md` (สถาปัตยกรรม 100% Self-Contained & แผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น)
- `MES/.agents/WORKSTATION_SYNC_REQUEST.md` (คำสั่งซิงค์ MCP/Skills และบันทึกการลบ/รวมศูนย์ API)
- `MES/.agents/ftp_structure.md` (โครงสร้างพาร์ทบน FTP Server)
- `MES/page/storeManagement/api/api_store.php` (Single Source of Truth API ของระบบคลังสินค้า)
