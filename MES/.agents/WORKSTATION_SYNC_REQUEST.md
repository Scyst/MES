# 🔄 Workstation ↔ Home Environment Sync & Architecture Handoff

> **Created At:** 2026-10-29 20:40 (Home Session)  
> **Target Audience:** Daytime Primary Agent (Workstation `E:\MES\MES\MES`) & Night-Shift Agents (Argon / Flash)

---

## 🚨 1. ACTION REQUIRED BY WORKSTATION AGENT (เครื่องที่ทำงาน)

จากการตรวจสอบที่เครื่องบ้าน (`C:\Users\USER\Desktop\Project\MES`) พบว่าสกิลและกฎใน `MES/.agents/` ถูกซิงค์ลงมาเรียบร้อยแล้ว แต่ **Custom MCP Server (`mes-custom-mcp`)** และสกิล Global บางส่วนยังไม่ถูกซิงค์ผ่าน Git เนื่องจากติด `.gitignore`

**คำสั่งสำหรับ Agent เครื่องหลักที่ทำงาน (เมื่อผู้ใช้เปิดงานตอนเช้า) — ✅ ดำเนินการเสร็จสิ้น (2026-10-30):**
1. **[x] ปลดล็อก `mcp_server/` ใน `MES/.gitignore`:**
   - ตรวจพบข้อมูล DB IP/User/Password และ Path แบบ Hardcode ใน `MES/mcp_server/index.mjs` จึงปรับให้ดึงจาก `process.env` (`DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`) และ `path.join(__dirname, "../ProjectRules.md")` เรียบร้อยแล้วก่อนนำ `mcp_server/` ออกจาก `MES/.gitignore` และ Push ขึ้น Git
2. **[x] ตรวจสอบ Global Skills บนเครื่องที่ทำงาน:**
   - คัดลอกสกิล `mes-frontend-expert` จาก Global Plugin มาไว้ที่ `MES/.agents/skills/mes_frontend_expert/SKILL.md` และ Push ขึ้น Git เรียบร้อยแล้ว (รวมเป็น 4 สกิลหลักใน `MES/.agents/skills/`)
3. **[x] ดึงโค้ดล่าสุดของ `AccessoriesInspection` จาก FTP มาเทียบ:**
   - ดึงไฟล์ทั้ง 7 รายการจาก `/MES/MES/page/AccessoriesInspection/` บน FTP มาเทียบกับ Git แบบบรรทัดต่อบรรทัด ยืนยันว่าฝั่งเพื่อนไม่มีการแก้โค้ดเพิ่มเติมนอกเหนือจากใน Git และโค้ดใน Git ปัจจุบันใช้พาร์ทกลาง `../../uploads/accessories_inspection/` พร้อม Fallback 3 ชั้นครบถ้วนแล้ว

---

## ✅ 2. สิ่งที่เครื่องที่บ้าน (Home Agent) ตั้งค่าและเตรียมพร้อมไว้แล้ว

1. **Root-Level Skill & Rule Discovery (`.agents/skills.json` & `AGENTS.md`):**
   - สร้างไฟล์ `.agents/skills.json` ที่ระดับ Root ของ Repository เพื่อชี้ไปยัง `MES/.agents/skills` ทำให้ไม่ว่าคุณจะเปิด Workspace ที่โฟลเดอร์นอก (`MES`) หรือโฟลเดอร์ใน (`MES/MES`) ตัว Agent จะมองเห็นสกิลทั้งหมดโดยอัตโนมัติ
   - สร้างไฟล์ `AGENTS.md` ที่ระดับ Root เพื่อเชื่อมโยงกฎเหล็กทั้งหมดจาก `MES/.agents/AGENTS.md`
2. **Global MCP Configuration (`C:\Users\USER\.gemini\config\mcp_config.json`):**
   - ตั้งค่า `mcp_config.json` บนเครื่องที่บ้านให้ชี้ Path มาที่ `C:/Users/USER/Desktop/Project/MES/MES` แทน `e:/MES/MES/MES` เรียบร้อยแล้ว (รอเพียงไฟล์ `mcp_server/index.mjs` จากเครื่องที่ทำงาน และ VPN/LAN สำหรับเชื่อม DB ภายในโรงงานหากต้องการต่อ DB ตรง)

---

## 🏗️ 3. Master Plan สำหรับกะกลางคืน (Night-Shift Architecture Migration) & Argon ↔ Flash Handoff

เพื่อรองรับการสลับโมเดลระหว่าง **Gemini 4 Argon** (วางแผน/วิเคราะห์เชิงลึก) และ **Flash** (ลงมือ Refactor จำนวนมากอย่างรวดเร็วเมื่อโควต้า Argon ใกล้หมด) ให้ยึดแนวทางดังนี้:

### เป้าหมายสถาปัตยกรรมใหม่ (Target System Architecture)
- **Unified Modular Frontend (`MES/Toolbox2` — เปลี่ยนชื่อจาก `MES/mes-v2` ให้ตรงกับพาร์ทจริงบน FTP `/Toolbox2` แบบ 1:1):**
  - ใช้ React 18+ + Vite + TailwindCSS + HashRouter (`#/`) โครงสร้าง `src/modules/<ModuleName>/` และ `src/shared/`
  - ค่อยๆ พอร์ตโมดูลจาก Legacy PHP (`MES/page/*`) และรวมโปรเจ็คย่อย (`MES/transport-system`, `MES/mes-team-planner`) เข้ามาไว้ใน `MES/Toolbox2` เป็นหนึ่งเดียว
- **Single Source of Truth Backend API (`MES/page/<module>/api/*.php`):**
  - เลิกคัดลอกไฟล์ API แยกไปไว้ในหลายโฟลเดอร์ ให้ทุก Frontend เรียกใช้ REST/JSON API ที่ `MES/page/<module>/api/` ร่วมกัน โดยใช้ Session & PBAC Permission (`check_auth.php`) ชุดเดียวกัน
- **Zero-Disruption Guarantee (ห้ามกระทบงานกลางวัน):**
  - ก่อนเริ่มงานกะกลางคืน ต้องรัน `git pull origin main --rebase` และอ่าน `MES/.agents/sync_board/<YYYY-MM-DD>.md` ของวันนั้นเสมอ เพื่อดูว่าตอนกลางวันผู้ใช้กำลังแก้โมดูลไหนอยู่ และหลีกเลี่ยงการแก้ทับไฟล์เดียวกัน

### 🧹 บันทึกการทำความสะอาดระบบและจัดระเบียบ Repository (2026-10-29 Night-Shift)
> **⚠️ สำคัญมากสำหรับ Agent ทุกตัว (Workstation & Home):** โฟลเดอร์และไฟล์ต่อไปนี้ถูกจัดการ/ลบออกจาก Git เรียบร้อยแล้ว ห้ามสร้างซ้ำหรืออ้างอิงถึงอีก:
1. **ลบ `MES/mes-toolbox` และรวมศูนย์ API คลังสินค้าสู่ `MES/page/storeManagement/api/api_store.php`:**
   - จากการตรวจสอบเปรียบเทียบ Switch-Case Actions ทั้งหมด พบว่า `MES/page/storeManagement/api/api_store.php` มีครบ **72 Actions** (206 KB) ซึ่งเป็น Superset 100% ของ `MES/mes-toolbox/public/api/v1/inventory.php` ที่มีเพียง 50 Actions (และไม่มี Action ใดเลยที่มีเฉพาะใน `inventory.php`)
   - สคริปต์ทั้งหมดใน `MES/page/storeManagement/script/*.js` เรียกใช้ `api/api_store.php` อยู่แล้ว 100%
   - ดังนั้นจึงทำการลบ `MES/mes-toolbox/` ทิ้งทั้งหมด และกำหนดให้ **`MES/page/storeManagement/api/api_store.php` เป็น Single Source of Truth เพียงจุดเดียว**
2. **แยก `SystemMonitorBackend` และ `SystemMonitorTauri` ออกเป็น Standalone Repository:**
   - ย้ายออกจากโปรเจ็ค `MES` ไปยัง Git Repository แยกต่างหากที่ `C:\Users\USER\Desktop\Project\SystemMonitor` เพื่อไม่ให้ปะปนกับระบบโรงงาน
3. **ลบโฟลเดอร์ทดสอบ/ซ้ำซ้อน/ไม่ได้ใช้งานแล้ว (ลดขนาด Repo ไปกว่า 213 MB / 2,383 ไฟล์):**
   - `MES_TEST/` (1,567 ไฟล์, 121.77 MB — Staging mirror เก่า)
   - `MES/Toolbox2/` (โฟลเดอร์เก็บไฟล์ Build `dist` เก่าที่ซ้ำซ้อน — เคลียร์พื้นที่เพื่อเตรียมเปลี่ยนชื่อ `MES/mes-v2` มาใช้ชื่อ `MES/Toolbox2` ให้ตรงกับพาร์ทบน FTP `/Toolbox2`)
   - `MES/estate-crm/` (โปรเจ็คทดสอบอสังหาฯ ไม่เกี่ยวกับโรงงาน)
   - `MES/page/AccessoriesInspection/img/` (ลบเฉพาะไฟล์รูปภาพสำรอง 176 ไฟล์ ~58.8 MB ออกจาก Git และใส่ `.gitignore` แต่เก็บรักษาโค้ดทั้ง 7 ไฟล์ของระบบ `MES/page/AccessoriesInspection/` ไว้ครบ 100%)
   - `MES/page/managementCopy/`, `MES/page/salesCopy/`, `MES/page/maintenancePE/`, `MES/page/SAP_Sync/`, `MES/page/sap_db.php` (โมดูลสำเนา/ทดสอบที่เลิกใช้แล้ว พร้อมถอดลิงก์ออกจาก Navbar)
   - ไฟล์รายงานและ Log ชั่วคราว (`MES/Executive_Report_*.html`, `MES/timeline.json`, `mqtt_system_profile.json`, `recovery_plan.md`)
4. **โมดูลที่เก็บรักษาไว้และย้ายเข้าสถาปัตยกรรมใหม่ตามคำสั่งผู้ใช้:**
   - `MES/page/areaAccess/` (เก็บไว้ — โปรเจ็คตามคำสั่งผู้บริหาร)
   - `MES/mes-mobile-app/` (เก็บไว้ก่อนเพื่อความปลอดภัยของพนักงานหน้างาน)
   - `MES/transport-system/` -> **ย้ายเข้าสู่ `MES/Toolbox2/src/modules/Transport/` และ `MES/Toolbox2/public/api/transport/` เรียบร้อยแล้ว** (Route: `#/transport/*`, เชื่อมต่อฐานข้อมูลกลาง `config.php` และลบโฟลเดอร์ `MES/transport-system` เดิมออกแล้ว)
   - `MES/mes-team-planner/` (ห้ามลบโฟลเดอร์เดิมเด็ดขาด — **พอร์ตเข้าสู่ `MES/Toolbox2/src/modules/TeamPlanner/` เรียบร้อยแล้ว** ภายใต้ Route `#/planner/*` พร้อมพอร์ต PHP API ทั้ง 22 ไฟล์เข้าสู่ `MES/Toolbox2/public/api/planner/` ให้พึ่งพาตัวเองได้ 100% และผ่านการทดสอบ Puppeteer E2E ครบทุกแท็บ `0 errors`)
   - ลบโมดูลจำลองที่ไม่สมบูรณ์ (`MES/Toolbox2/src/modules/QMS` และ `MoodInsight`) และชี้ลิงก์กลับสู่ระบบหลักใน `MES/page` พร้อมอัปเกรด `AuthContext.jsx`, `InactivityTimeoutModal.jsx`, `AccountSettingsModal.jsx`, และ `AppLayout.jsx` ให้ซิงค์ Cross-Tab Login/Logout (`mes_auth_channel`) ร่วมกับ `MES/page` และ `LearningHub` แบบ 100% และพอร์ต Backend API ทั้งหมด (`dailyLog`, `manpower`, `profile`, `paintChem`, `planner`) เข้าสู่ `MES/Toolbox2/public/api/` เพื่อให้ `MES/Toolbox2` พึ่งพาตัวเองได้ 100% (Zero External API Dependencies)

### 🏛️ แผนงานถัดไป: แผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น & พิมพ์เขียวระบบ (System Blueprint)
1. **แผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น (ดูรายละเอียดเต็มใน `MES/Toolbox2/ARCHITECTURE.md`):**
   - **Layer 1:** Shared UI & API Core Utilities (`apiClient.js`, `ToastContext.jsx`, `ConfirmModal.jsx`, `useSSE.js`)
   - **Layer 2:** User Management & PBAC Permission Matrix 100% Parity (`#/admin/users`)
   - **Layer 3:** System Settings & Master Data (`#/admin/settings`)
   - **Layer 4:** Full Employee Profile & 4D Grading Page (`#/profile`)
2. **พิมพ์เขียวแม่บทของระบบสำหรับผู้บริหารและการส่งมอบงาน (`MES/docs/blueprint/`):**
   - เอกสารพิมพ์เขียวฉบับสมบูรณ์: `MES/docs/blueprint/MES_SYSTEM_BLUEPRINT.md`
   - ข้อมูลกราฟโหนดและเส้นเชื่อมสำหรับสร้าง Visual Blueprint: `MES/docs/blueprint/blueprint_graph.json`

### ขั้นตอนการทำงานเมื่อเปลี่ยนจาก Argon เป็น Flash
1. เมื่อสลับเป็น **Flash** ให้โมเดลอ่านไฟล์นี้ (`MES/.agents/WORKSTATION_SYNC_REQUEST.md`) และ `MES/.agents/sync_board/handoff.md` เป็นอันดับแรก
2. ทำงานทีละ Task ย่อยตาม Checklist ที่ Argon วางไว้ โดยทดสอบ (`npm run build` หรือ `php -l`) ทุกครั้งก่อน Commit
3. อัปเดตความคืบหน้าแบบ Non-destructive (`[x]`) ลงใน Handoff และ Sync Board เสมอ

