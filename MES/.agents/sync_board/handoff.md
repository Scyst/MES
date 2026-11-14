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
  1. [x] อ่านไฟล์ `MES/.agents/WORKSTATION_SYNC_REQUEST.md` เพื่อนำ `MES/mcp_server/index.mjs` ออกจาก `.gitignore` (ปรับค่าลับเข้า `process.env` และทำ Relative Path แล้ว) และคัดลอก Global Skill (`mes_frontend_expert`) เข้ามาใน `MES/.agents/skills/` แล้ว Push ขึ้น Git (เสร็จสิ้น 2026-10-30)
  2. [x] ดึงไฟล์ใน `/MES/MES/page/AccessoriesInspection/` ทั้ง 7 ไฟล์จาก FTP ลงมาเทียบกับใน Git — ยืนยันว่าไม่มีโค้ดใหม่กว่าบน FTP และคงส่วนที่เก็บรูปใน `../../uploads/accessories_inspection/` เอาไว้ครบถ้วน (เสร็จสิ้น 2026-10-30)
  3. [x] เปลี่ยนชื่อโปรเจ็ค `MES/Toolbox2` เป็น `MES/Toolbox` ให้ตรงกับพาร์ทจริงใหม่บน FTP (`/Toolbox` -> `/iot-toolbox/sandbox-b9/Toolbox/#/`) ย้ายของเก่าไปสำรองที่ `/Toolbox_legacy` และตั้ง Smart Redirect จาก `/Toolbox2`, `/Toolbox/planner`, `/Toolbox/plannerAgent`, และ `/transport-system` เข้าสู่ `/Toolbox/#/...` ครบถ้วน (เสร็จสิ้น 2026-10-30)
  4. [ ] ตรวจสอบและดำเนินการต่อตาม **"แผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น (4-Layer Core Foundation Roadmap)"** ใน `MES/Toolbox/ARCHITECTURE.md` (เริ่มจาก Layer 1: Shared UI/API Utilities -> Layer 2: User Management 100% Parity -> Layer 3: System Settings -> Layer 4: Full Profile Page)
- [x] **[สำหรับงานพิมพ์เขียวผู้บริหาร (Visual Blueprint Extension)]:**
  - สร้างโมดูล Interactive Visual Blueprint (`MES/Toolbox/src/modules/SystemBlueprint/`) ภายใต้ Route `#/blueprint` สมบูรณ์ 100% ครอบคลุม 5 เลเยอร์สถาปัตยกรรม (ฮาร์ดแวร์/IoT, SAP ERP, SQL Server, API Gateway, แอปพลิเคชัน), 23 โหนดระบบ, 40+ ตารางฐานข้อมูล, 17 Data Pipelines พร้อมระบบตัวกรอง Domain, Search, และ Slide-over Node Inspector ละเอียดครบถ้วน (เสร็จสิ้น 2026-11-03)

## Exact Files to Modify / Reference
- `MES/docs/blueprint/MES_SYSTEM_BLUEPRINT.md` (พิมพ์เขียวแม่บทของระบบ MES & คู่มือส่งมอบงานผู้บริหาร)
- `MES/docs/blueprint/blueprint_graph.json` (Machine-Readable Node/Edge Graph Schema สำหรับสร้าง Visual Blueprint)
- `MES/Toolbox/ARCHITECTURE.md` (สถาปัตยกรรม 100% Self-Contained & แผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น)
- `MES/.agents/WORKSTATION_SYNC_REQUEST.md` (คำสั่งซิงค์ MCP/Skills และบันทึกการลบ/รวมศูนย์ API)
- `MES/.agents/ftp_structure.md` (โครงสร้างพาร์ทบน FTP Server)
- `MES/page/storeManagement/api/api_store.php` (Single Source of Truth API ของระบบคลังสินค้า)

---

# Handoff Section: Toolbox SPA Autonomous Migration Pause (2026-11-14)

## Context / Goal
- ดำเนินแผน `/goal` พอร์ตระบบ Legacy PHP (`page/*`) เข้าสู่ Toolbox SPA (`Toolbox/src/modules/` + `Toolbox/public/api/`) แบบ Self-Contained 100% และDeploy ขึ้น FTP Production (`/Toolbox/*`)
- หยุดพักตามคำขอของผู้ใช้ (ใกล้หมด Token/Quota) ณ จุดที่ปลอดภัยหลังจบ Phase 3.2

## Completed Work (เสร็จสิ้นและ Push/Deploy แล้ว 100%)
- **Batch 1 (Cleanups & Store Offline Queue)**, **Phase 2.1 (`#/production`, `#/scan-barcode`)**, **Phase 2.2 (`#/pe/*`)**, **Phase 2.3 (`#/qms`)**
- **Phase 3.1 (`cfad60d4`)**: Manpower 7-Tab (`#/manpower`) + Daily Command Center / Planning (`#/planning`) — Verified + FTP Deployed + Pushed
- **Phase 3.2 (`9345858d`)**: Sales & Shipping Schedule (`#/sales`), Loading Report C-TPAT (`#/loading-report`), Auto Invoice & Packing List (`#/auto-invoice`) — Verified (8/8 CDP views) + FTP Deployed + HTTP Checked + Pushed
- **สถานะภาพรวม (`docs/blueprint/MES_LEGACY_VS_TOOLBOX_GAP_ANALYSIS.md`)**: Ported 100% = **18** | Partial = **1** (`InboundHub`) | On Hold = **1** (`MES Analytics`) | Unported = **6** (`Management`, `OEE_Dashboard`, `DailyPL`, `AreaAccess`, `AccessoriesInspection`, `CCTV_Downloader`)
- **Pre-work สำหรับ Phase 3.3 (ยังไม่ได้แก้ไขโค้ด Working Tree สะอาด)**:
  - ตรวจสอบ `describe_table` ครบแล้วสำหรับ: `MES_MANUAL_DAILY_COSTS`, `PL_STRUCTURE`, `DAILY_PL_ENTRIES`, `MONTHLY_PL_TARGETS`, `DAILY_PL_STATUS`, `STOCK_TRANSACTIONS`, `ITEMS`, `LOCATIONS`, `MANUFACTURING_ROUTES`, `MAINTENANCE_REQUESTS`, `PRODUCTION_PLANS`, `PE_MACHINES`, `MANPOWER_CALENDAR`
  - ยืนยันว่า `Toolbox/public/sap_db.php` และ `Toolbox/public/config.php` มี Stored Procedures & Config พร้อมใช้แล้ว (`SP_CALC_OEE_PIE`, `SP_CALC_OEE_HOURLY`, `SP_CALC_OEE_LINE`, `SP_GET_DAILY_PROD`, `SP_CALC_STD_COST`, `SP_CALC_ACTUAL_COST`, `SP_GET_PL_ENTRY`, `SP_SAVE_MONTHLY_TARGET`, `SP_GET_DASHBOARD_STATS`, `SP_GET_PL_REPORT_RANGE`, `SP_UPDATE_CARRYOVER`, `SP_AUTO_GENERATE_PLAN`)

## Actionable Next Steps (ทำต่อทันทีเมื่อเปิดเซสชันใหม่)
1. [ ] **Phase 3.3 — Management (`#/management`), OEE Dashboard (`#/oee`), Daily P&L (`#/daily-pl`)**:
   - สร้าง Backend API ภายใต้ `Toolbox/public/api/management/`, `Toolbox/public/api/oee/`, `Toolbox/public/api/dailyPl/` (เพิ่ม `oeeApi.php` + Shopfloor View โดยคง auth/permission check และรองรับ SAP scrap lookup ผ่าน `sap_db.php`)
   - สร้าง Frontend SPA ใน `Toolbox/src/modules/Management/` (`managementDashboard` + `executiveDashboard`), `Toolbox/src/modules/OEE/` (`OEE_Dashboard` + `OEE_Shopfloor` toggle), `Toolbox/src/modules/DailyPL/` (`pl_entry` Entry/Report/Statement/Executive + `pl_setting` Tree/Formula/Import/Export/Reorder)
   - เชื่อม Routes ใน `Toolbox/src/app/App.jsx` และสลับลิงก์ Legacy PHP ใน `Toolbox/src/shared/components/DesktopSidebar.jsx` และ `Toolbox/src/modules/Home/pages/HomeDashboard.jsx` (บรรทัด 187 `OEE_Shopfloor.php`, 226 `managementDashboard.php`, 231 `pl_entry.php`)
   - รัน `php -l`, ทดสอบ SQL/SP via MCP, `npx oxlint`, `npx vite build`, Headless Chrome CDP (Desktop `1280×900` & Mobile `375×812`), อัปโหลด FTP, เช็ก `http_request`, อัปเดตเอกสาร และ `git commit` + `git push`
2. [ ] **Phase 3.4 — Area Access (`#/area-access`), Accessories Inspection (`#/accessories-inspection`), CCTV Downloader (`#/cctv-downloader`)**:
   - ตรวจสอบ `page/areaAccess/`, `page/AccessoriesInspection/`, `page/cctv_downloader/` + `describe_table` สำหรับ `AREA_ACCESS_LOGS`, `ACCESSORIES_INSPECTION_LOG` และข้อจำกัดด้าน Hardware/RTSP/FFmpeg (หากมี)
3. *(ข้าม `Inbound Hub` ตามคำสั่งเดิมจนกว่าจะมีเอกสารตัวอย่างจากผู้บริหาร และอย่าลืมรายการ #4 เกี่ยวกับมาร์คบรรทัด MDB ใหม่ใน Utility หากยังไม่ได้ทำ/ต้องยืนยันเพิ่มเติม)*

## Exact Files to Modify / Reference Next
- `Toolbox/src/app/App.jsx`
- `Toolbox/src/shared/components/DesktopSidebar.jsx`
- `Toolbox/src/modules/Home/pages/HomeDashboard.jsx`
- `page/management/*`, `page/OEE_Dashboard/*`, `page/dailyPL/*`
- `page/areaAccess/*`, `page/AccessoriesInspection/*`, `page/cctv_downloader/*`
- `docs/blueprint/MES_LEGACY_VS_TOOLBOX_GAP_ANALYSIS.md`, `task.md`, `.agents/ftp_structure.md`, `.agents/sync_board/`
