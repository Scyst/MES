# 🏗️ Toolbox (MES V2 SPA) Architecture & Migration Guide

> **หมายเหตุโครงสร้างโฟลเดอร์:** โฟลเดอร์ใน Git ใช้ชื่อ `MES/Toolbox` เพื่อให้ตรงกับพาร์ทจริงบน FTP Server (`/Toolbox` -> `/iot-toolbox/sandbox-b9/Toolbox/`) แบบ 1:1

*Last Updated: 2026-10-29*

เอกสารนี้ใช้อธิบายโครงสร้างและแนวทางการพอร์ตระบบ MES จาก Legacy (PHP/Bootstrap) มาเป็น SPA (React/Vite/Tailwind) ที่พึ่งพาตัวเองได้ 100% (100% Self-Contained Architecture)

---

## 🛠️ 1. Tech Stack
*   **Core Framework:** React 19 (Component-based, Lazy-loaded per module)
*   **Build Tool:** Vite (Output ไปที่โฟลเดอร์ `dist/` พร้อมคัดลอก `public/api/*` เข้า `dist/api/*` อัตโนมัติ)
*   **Styling:** Tailwind CSS v4 + Lucide React / React Icons
*   **Routing:** React Router (`HashRouter` `#/` เพื่อให้เข้าถึงทุก Route บน Apache/FTP ได้ทันทีโดยไม่ติด 404)
*   **Entry Point:** `index.html`

---

## 🏗️ 2. โครงสร้างโฟลเดอร์ (100% Self-Contained Structure)
ห้ามเขียนโค้ดใน `Toolbox` ให้เรียก API ข้ามโฟลเดอร์ไปที่ `/MES/MES/page/...` หรือ `/Toolbox/planner/...` เด็ดขาด ทุกโมดูลที่พอร์ตเข้ามาต้องมีทั้ง Frontend และ Backend API อยู่ในโฟลเดอร์ `MES/Toolbox` เองทั้งหมด:

```text
MES/Toolbox/
├── public/                     # Backend PHP & Static Assets (ถูกก๊อปปี้เข้า dist/ ตอน build)
│   ├── config.php              # ไฟล์ตั้งค่ากลาง & ตาราง DB ทั้งหมดของ Toolbox
│   ├── db.php                  # จุดเชื่อมต่อ PDO SQL Server (IIOT_TOOLBOX)
│   ├── login.php               # API เข้าสู่ระบบ + บันทึก SYSTEM_LOGS
│   ├── check.php               # API ตรวจสอบเซสชั่น + Heartbeat (?silent=1) + กู้คืน Permissions
│   ├── logout.php              # API ออกจากระบบ + บันทึก SYSTEM_LOGS
│   ├── utils/
│   │   ├── check_auth.php      # Middleware ตรวจสอบสิทธิ์ RBAC / PBAC / Line Permission
│   │   └── logger.php          # ฟังก์ชันบันทึก Audit Log ลง dbo.SYSTEM_LOGS
│   └── api/                    # Self-Contained Module APIs
│       ├── dailyLog/           # API สมุดบันทึกกะ & Morning Brief
│       ├── manpower/           # API คำนวณเกรด 4 มิติ (A/B/C/D) & ค่าผลงาน IPH
│       ├── profile/            # API จัดการบัญชีผู้ใช้ & อัปโหลดรูปโปรไฟล์
│       ├── paintChem/          # API ระบบบันทึกเคมีสี & SPC Analytics (10 ไฟล์)
│       ├── planner/            # API ระบบกระดานแผนงานและปฏิทินทีม (22 ไฟล์)
│       ├── transport/          # API ระบบจองรถรับส่งพนักงาน
│       └── userManage.php      # API จัดการผู้ใช้งาน สิทธิ์ RBAC และดูประวัติ SYSTEM_LOGS
└── src/
    ├── app/
    │   └── App.jsx             # ตัวจัดการ Routes กลาง + Global ErrorBoundary
    ├── shared/                 # โครงสร้างพื้นฐานส่วนกลาง (Core Foundation)
    │   ├── components/
    │   │   ├── AppLayout.jsx           # โครงหน้าหลัก + Top Header (นาฬิกาจริง, เกรด A/B/C/D, IPH)
    │   │   ├── DesktopSidebar.jsx      # แถบเมนูด้านข้าง + Mobile Navigation Drawer
    │   │   ├── AccountSettingsModal.jsx# หน้าต่างตั้งค่าบัญชี & เปลี่ยนรหัสผ่าน & อัปโหลดรูป
    │   │   ├── InactivityTimeoutModal.jsx # หน้าต่างเตือนและตัดออกจากระบบเมื่อไม่มีการเคลื่อนไหว (60m + 30s)
    │   │   └── ErrorBoundary.jsx       # เกราะป้องกันจอขาว (White-Screen Guard)
    │   ├── contexts/
    │   │   └── AuthContext.jsx         # ระบบ Auth + Cross-Tab Login/Logout Sync (mes_auth_channel)
    │   └── services/
    │       ├── dailyLogApi.js
    │       └── userManageApi.js
    └── modules/                # โมดูลระบบงานที่พอร์ตแล้ว
        ├── Auth/               # หน้า Login (#/login)
        ├── Home/               # หน้าแรก TOOLBOX OS + ปฏิทินกะ + Morning Brief (#/)
        ├── Transport/          # ระบบจองรถรับส่งพนักงาน (#/transport/*)
        ├── TeamPlanner/        # ระบบกระดานแผนงานและปฏิทินทีม (#/planner/*)
        ├── PaintChem/          # ระบบบันทึกเคมีสีและวิเคราะห์แนวโน้ม (#/paint-chem)
        ├── InboundHub/         # ศูนย์กลางเชื่อมเอกสารและตู้สินค้า ลูกค้า–SCM–Store (#/inbound-hub, #/partner-portal)
        ├── SystemBlueprint/    # พิมพ์เขียวสถาปัตยกรรมดิจิทัล 5 เลเยอร์ & แผนผังระบบโรงงาน (#/blueprint)
        └── Admin/              # ระบบจัดการผู้ใช้งานและสิทธิ์ (#/admin/users)
```

---

## 🧱 3. แผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น (4-Layer Core Foundation Roadmap)
> **สำหรับ Agent ตัวหลักที่ทำงาน & กะกลางคืน:** ให้ดำเนินการพัฒนาตามลำดับชั้นนี้ก่อนพอร์ตโมดูลหน้างานขนาดใหญ่ เพื่อให้ทุกโมดูลใช้โครงสร้างพื้นฐานชุดเดียวกัน:

### ชั้นที่ 1: Shared UI & Core Utilities (`src/shared/`) — *เทียบเท่า `MES/page/components/js/`*
- [x] **1.1 Global Toast & Confirm Dialog System (`useToast` & `useConfirm`):**
  - สร้าง Context และ Component แจ้งเตือน Toast มุมจอ (Success / Warning / Error) และหน้าต่างยืนยันแบบ Industrial Grade แทนการใช้ `window.alert()` และ `window.confirm()` ดิบๆ (`src/shared/contexts/FeedbackContext.jsx`)
- [x] **1.2 Standardized API Client (`src/shared/services/apiClient.js`):**
  - ตัวครอบ Axios กลางที่แนบ `X-CSRF-TOKEN`, จัดการ Loading State, แปลง Error เป็น Toast ภาษาไทยอัตโนมัติ และรองรับ Retry สำหรับ Network/5xx errors
- [x] **1.3 Reusable Industrial Data Table & Pagination (`<DataTable />` & `<Pagination />`):**
  - คอมโพเนนต์ตารางมาตรฐานโรงงาน (`w-full`, ค้นหา Debounce 300ms, กรอง, เรียงลำดับ, แบ่งหน้า, และ Export Excel) เพื่อใช้ซ้ำในทุกโมดูล (`src/shared/components/DataTable.jsx`, `Pagination.jsx`) พร้อมปรับใช้จริงใน `UserManagement.jsx` แล้ว

### ชั้นที่ 2: อัปเกรดระบบจัดการผู้ใช้งานและสิทธิ์ (`Admin / User Management` — `#/admin/users`) ให้ครบ 100%
- [x] **2.1 Backend Parity (`public/api/userManage.php`):**
  - เพิ่ม Action `reset_password_default` (รีเซ็ตรหัสผ่านเป็น `123456` ในคลิกเดียว) และอัปเดต `action=read` ให้ดึง `profile_picture`, `pwd_changed_at`, `last_login` เหมือน `MES/page/userManage/api/userManage.php`
- [x] **2.2 Frontend Parity (`src/modules/Admin/pages/UserManagement.jsx`):**
  - แสดงรูปโปรไฟล์ (`profile_picture`), เวลาเข้าใช้งานล่าสุด (`last_login`), วันที่เปลี่ยนรหัสผ่าน (`pwd_changed_at`), และปุ่ม Reset Password ในตารางผู้ใช้งาน
  - สลับลิงก์ **User Manager** ใน `HomeDashboard.jsx` และ `DesktopSidebar.jsx` มาใช้ `#/admin/users` ของ `Toolbox` เต็มตัว 100% พร้อมทดสอบ Build ผ่านสมบูรณ์

### ชั้นที่ 3: ศูนย์ตั้งค่าข้อมูลหลักของโรงงาน (`System Settings & Master Data` — `#/system-settings`)
พอร์ตโมดูล `MES/page/systemSettings` และ API ทั้ง 6 ไฟล์เข้าสู่ `MES/Toolbox/src/modules/SystemSettings/` และ `public/api/systemSettings/` ครอบคลุม 5 แท็บหลัก:
- [x] **3.1 Item Master (`ITEMS`)**: ทะเบียนสินค้า วัตถุดิบ และต้นทุนมาตรฐาน พร้อม Modal จัดการ 3 แท็บ (ข้อมูลพื้นฐาน, โลจิสติกส์ & ต้นทุน, เส้นทางผลิต), Where-Used, Activity Log และ Bulk Import Excel (SheetJS)
- [x] **3.2 BOM Manager (`PRODUCT_BOM`)**: สูตรการผลิต (Bill of Materials) แบ่งตามเวอร์ชัน, เพิ่ม/ลบ/แก้ไขชิ้นส่วน, คำนวณ Rollup Standard Cost, ออกเอกสาร ECN สร้าง Revision Draft, อนุมัติสูตร Active, คัดลอกสูตร Copy BOM และส่งออก Excel
- [x] **3.3 Locations (`LOCATIONS`)**: พิกัดและโซนคลังสินค้า (RM, SEMI, FG, STORE, MAINTENANCE, TOOL) ผูกไลน์ผลิต และสลับสถานะ Active
- [x] **3.4 Line Schedules (`LINE_SCHEDULES`)**: ตารางเวลาทำงานและกะของแต่ละไลน์ผลิต คำนวณเวลาทำงานสุทธิ (Net Working Minutes) หักเวลาพักเบรกสำหรับคิด OEE
- [x] **3.5 SAP Valuation (`sap_staging_*` vs `ITEMS`)**: แดชบอร์ดวิเคราะห์เปรียบเทียบมูลค่าคลังสินค้าและต้นทุนระหว่าง SAP ERP กับ MES พร้อมปุ่ม Sync SAP Costs to MES บันทึกทับลง Item Master อัตโนมัติ
- [x] **3.6 Authorization & Cutover**: รวมระบบตรวจสอบสิทธิ์แบบไฮบริด (Hybrid PBAC & Role Fallback) ทั้ง Frontend/Backend และสลับลิงก์เมนู `System Settings` ใน Sidebar และ HomeDashboard เข้าสู่ `#/system-settings` เต็มตัว 100%

### ชั้นที่ 4: หน้าจัดการโปรไฟล์ผู้ใช้งานเต็มรูปแบบ (`Full Profile Page` — `#/profile`)
- [x] **4.1 Full Welfare & Personal Info Form:**
  - ต่อยอดจาก `AccountSettingsModal.jsx` ให้รองรับข้อมูลสวัสดิการพนักงานครบทุกฟิลด์ตาม `MES/page/profile/profileUI.php` (วิธีเดินทาง `commute_method`, ทะเบียนรถ `vehicle_registration`, ไซส์เสื้อ/รองเท้า `shirt_size`/`shoe_size`, วันเกิด `date_of_birth`, สถานะสมรส/บุตร, ที่อยู่ปัจจุบัน)
- [x] **4.2 4D Performance & Competencies Evaluation:**
  - แสดงผลเกรดการประเมิน 4 มิติ (Overall Grade, IPH, 5S, Attendance, Learning Hub) พร้อมกราฟแนวโน้ม Recharts และตารางประวัติย้อนหลัง
- [x] **4.3 Security & Display Preferences:**
  - ฟอร์มเปลี่ยนรหัสผ่านยืนยันตัวตน, สลับโหมดสีสว่าง/มืด (Light/Dark) และภาษาที่ต้องการใช้งาน
- [x] **4.4 Activity Logs & Avatar Photo Upload:**
  - อัปโหลดรูปโปรไฟล์ด้วยกล้อง/เลือกไฟล์ พร้อมบันทึกประวัติการเข้าใช้งานล่าสุด 20 รายการ
- [x] **4.5 Navigation Cutover:**
  - สลับลิงก์โปรไฟล์ใน Profile Dropdown (Header) และเพิ่มเมนูใน `DesktopSidebar.jsx` เข้าสู่ `#/profile` เต็มรูปแบบ 100%

---

## 🏁 สรุปผลการดำเนินงานแผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น (Complete 4-Layer Foundation)
- [x] **Layer 1: Shared UI & API Core Utilities** — Complete
- [x] **Layer 2: User Management & PBAC Permission Matrix (Parity 100%)** — Complete
- [x] **Layer 3: System Settings & Master Data (Parity 100%)** — Complete
- [x] **Layer 4: Full Profile & 4D Performance Evaluation (Parity 100%)** — Complete
- [x] **Layer 5: Executive Visual Architecture Blueprint (`#/blueprint`)** — Complete (ผังดิจิทัล 5 เลเยอร์, 23 โหนด, 40+ ตาราง, 17 Pipelines)

---

## 🎨 4. มาตรฐานการออกแบบ UI/UX ระดับอุตสาหกรรม (Unified Industrial Design Tokens & Spacing Protocol)
> **สำหรับ AI Agent และนักพัฒนาทุกคน:** ทุกหน้า/โมดูลที่สร้างขึ้นใหม่หรือพอร์ตเข้ามาในระบบ Toolbox **ต้องปฏิบัติตามมาตรฐานนี้อย่างเคร่งครัด 100%** เพื่อให้ผู้ใช้งานได้รับประสบการณ์ที่เนียนตา คมชัด เป็นมืออาชีพ และเป็นมาตรฐานเดียวกันทั้งโรงงาน:

### 4.1 Token และคลาสส่วนกลาง (`src/index.css`)
*   **Page Header (`.mes-page-header`):** หัวหน้ากระชับ สะอาดตา มี Breadcrumbs นำทาง ขนาดหัวข้อ `text-lg font-bold text-slate-900 dark:text-white`
*   **Header Margin Spacing:** ระยะห่างระหว่าง Page Header กับแถบแท็บ (Tab Navigation) หรือเนื้อหาด้านล่าง **ต้องกำหนดเป็น `mb-4` (16px) เสมอ** ห้ามใส่ `mb-6` หรือ `mb-8` ที่ทำให้หน้าเวิ้งว้างเกินไป
*   **Tab Buttons (`.mes-tab-btn`):**
    *   เมื่อ Active: `bg-blue-600 text-white shadow-2xs font-medium`
    *   เมื่อ Inactive: `bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700`
    *   ขนาดความสูง: `h-8` หรือ `py-1.5 px-3` พร้อมไอคอนขนาด `w-3.5 h-3.5`
*   **Buttons (`.mes-btn-primary`, `.mes-btn-secondary`, `.mes-btn-danger`):**
    *   ความสูงมาตรฐาน: `h-[34px]` หรือ `h-8` สำหรับปุ่มบน Tool bar
    *   ขนาดตัวอักษร: `text-xs font-medium` (Industrial High-Density Standard)
    *   รัศมีขอบ: `rounded-lg` หรือ `rounded-xl`
*   **Form Inputs & Selects (`.mes-input`, `.mes-select`):**
    *   พื้นหลังต้องคมชัด อ่านง่าย: ใช้ `bg-white dark:bg-slate-800` เสมอ (ห้ามใช้สีโปร่งใส `bg-slate-50/50` ที่ทำให้ช่องกรอกจมหรือกลืนกับพื้นหลัง)
    *   ขอบและเงา: `border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500/20`
*   **Data Table Density (`<DataTable />`):**
    *   ส่วนหัว (Table Header): `px-3 py-2 text-xs font-semibold uppercase bg-slate-50 dark:bg-slate-800/80`
    *   เนื้อหาแถว (Table Row): `px-3 py-2 text-xs text-slate-800 dark:text-slate-100 hover:bg-blue-50/30`
    *   ตัวควบคุมตาราง: ช่องค้นหาและปุ่ม Action ด้านบนตารางมีความสูง `h-[34px]`

---

## ⚡ 5. แนวทางวิศวกรรมประสิทธิภาพ (Performance Engineering Guidelines)
เพื่อป้องกันไม่ให้ระบบช้าลงเมื่อมีข้อมูลสะสมปริมาณมากในสายการผลิต:

1.  **Decouple Heavy Calculations from Initial Page Loads:**
    *   ห้ามใส่ฟังก์ชันคำนวณต้นทุน, ยอดสรุปกะ (Morning Brief), หรือ Cross-Module Aggregate หนักๆ ลงใน API โหลดหน้าหลัก (เช่น `get_initial_data`)
    *   ให้แยกเป็น Endpoint ย่อย (เช่น `get_morning_brief`) และเรียกแบบ On-Demand เมื่อเปิด Modal หรือคลิกแท็บเท่านั้น
2.  **Two-Stage CTE Pagination in SQL Server:**
    *   เมื่อตารางมีข้อมูลมากกว่า 500 แถว และต้องทำ Correlated Subquery (เช่น `STUFF(... FOR XML PATH)` หรือ `COUNT(...)` ข้ามตาราง):
    *   **ห้ามรัน Subquery ใน CTE แรกก่อนแบ่งหน้าเด็ดขาด** (เพราะ SQL Server จะคำนวณทุกแถวในฐานข้อมูล)
    *   **ให้ทำ Two-Stage CTE:** คัดกรองและแบ่งหน้าเฉพาะ `item_id` (หรือ Primary Key) ให้เหลือ 25–50 แถวก่อน แล้วค่อย `JOIN` กลับมารัน Subquery บน 25–50 แถวเป้าหมาย (ลดเวลา Query จาก 6.2 วินาที เหลือต่ำกว่า 0.3 วินาที)
3.  **Selective Background Polling:**
    *   การ Polling อัปเดตข้อมูลอัตโนมัติในพื้นหลัง (เช่น Team Planner ทุก 30 วินาที) ต้องเรียกเฉพาะข้อมูลที่มีการเคลื่อนไหวแบบ Real-time (`tasks`, `events`, `activities`) เท่านั้น
    *   ห้าม Polling ซ้ำข้อมูล Master/โครงสร้างที่ไม่ค่อยเปลี่ยนแปลง (`projects`, `spaces`, `users`) ในลูป 30 วินาที
4.  **Vendor Bundle Splitting (Vite manualChunks):**
    *   แยกไลบรารีขนาดใหญ่ที่ใช้เฉพาะทาง (`xlsx` ~424kB, `jspdf`/`html2canvas` ~660kB) ออกจาก Core Engine ผ่าน `rollupOptions.output.manualChunks`
    *   เพื่อให้เบราว์เซอร์ดาวน์โหลดไฟล์เครื่องยนต์หลัก (`mes-engine-*.js`) ในขนาดเพียง ~110kB (Gzip ~34kB) หน้าเว็บจะเปิดติดในเสี้ยววินาทีบนทุกอุปกรณ์
5.  **Hot/Cold Data Separation & Filtered Database Indexing:**
    *   ตารางงานหรือธุรกรรมที่มีการบันทึกต่อเนื่องสะสมหลักพันถึงแสนรายการ (เช่น `TeamPlanner_Tasks`) ต้องแบ่งแยกข้อมูลร้อน (Active / Recent 30 Days) ออกจากข้อมูลเย็น (ประวัติงานเก่า)
    *   ใช้ Filtered Index บน SQL Server 2016 (เช่น `IX_TeamPlanner_Tasks_Active` กรอง `WHERE Status <> 'done'`) เพื่อให้การคิวรีเข้ากระดานงานประจำวันวิ่งตรงเข้า RAM ความเร็วระดับ Microseconds
    *   ค่าเริ่มต้นของระบบจะดึงเฉพาะงาน Active + งานที่ปิดไม่เกิน 30 วัน และจัดเตรียม On-Demand Archive Toggle (`include_archived=1`) ให้ผู้ใช้กดดูประวัติทั้งหมดได้เมื่อต้องการ

---

## 🚀 6. แผนแม่บทสถาปัตยกรรมในอนาคตของ Team Planner (Future Scalability Roadmap)

| ระยะการพัฒนา | ฟีเจอร์ / ยุทธศาสตร์ | วัตถุประสงค์ & ประโยชน์ | สาเหตุที่ยังไม่ได้ทำในตอนนี้ (Why not now?) |
| :--- | :--- | :--- | :--- |
| **ระยะที่ 3** | **Delta Sync (Incremental Polling Engine)** | ส่งเฉพาะงานที่ถูกเพิ่ม/แก้ไข/ลบ ในรอบ 30 วินาที ผ่าน `?since=<timestamp>` เพื่อประหยัด Bandwidth ลงอีก 95% | **ต้องปรับโครงสร้างฐานข้อมูล (Schema Migration):** ตาราง `dbo.TeamPlanner_Tasks` เดิมมีเฉพาะ `CreatedAt` ยังไม่มีคอลัมน์ `UpdatedAt` และยังใช้ Hard Delete (ลบถาวร) การทำ Delta Sync อย่างถูกต้องจำเป็นต้องเพิ่ม `UpdatedAt`, ทำระบบ Soft-delete หรือ Tombstone Table และปรับ React State Reducer ซึ่งมีความเสี่ยงกระทบระบบเดิมสูงเกินความจำเป็นในเวลานี้ เพราะความเร็วปัจจุบันอยู่ที่ **136ms** อยู่แล้ว จึงควรรอทำเมื่อมีผู้ใช้ Concurrent หลักร้อยคน |
| **ระยะที่ 4** | **DOM Virtualization (Timeline & Multi-Year Gantt)** | ใช้ `@tanstack/react-virtual` เรนเดอร์เฉพาะแถวที่อยู่ในกรอบสายตา เพื่อรองรับการดู Gantt Chart ขนาดหลายพันงานพร้อมกัน | **หน้ากระดานปัจจุบันมี Column Slice อยู่แล้ว:** ใน `TaskBoard.jsx` มีการจำกัดแถวในแต่ละคอลัมน์ไว้ที่ 20 การ์ด (`colLimits || 20`) อยู่แล้ว ทำให้ DOM Node ไม่ล้นจอ และการเลื่อนไทม์ไลน์ 1-3 เดือนยังคงทำงานได้ที่ 60 FPS อย่างลื่นไหล จึงเก็บไว้ทำเมื่อมีการขยายสเกลดูมุมมองข้ามปี |


---

## 🛡️ 7. มาตรฐานระบบประวัติการกระทำและตรวจสอบย้อนกลับระดับอุตสาหกรรม (Industrial Audit Trail Protocol & Standard Contract)

เพื่อให้การพอร์ตระบบในอนาคต (และระบบเดิมที่พอร์ตเข้ามาแล้วทั้งหมด) มีมาตรฐานการตรวจสอบย้อนกลับ (Audit Traceability) และความมั่นคงปลอดภัยตามเกณฑ์ ISO/IEC 27001 และ IATF 16949 สำหรับโรงงานอุตสาหกรรม โดยไม่ต้องเขียนโค้ดซ้ำซ้อน:

### 1. โครงสร้างตารางส่วนกลาง (`dbo.SYSTEM_LOGS`)
ทุกการเปลี่ยนแปลงสถานะ (State Mutation: INSERT, UPDATE, DELETE, APPROVE, UNLOCK) จะต้องถูกบันทึกลงตารางกลาง `dbo.SYSTEM_LOGS` ในฐานข้อมูล `IIOT_TOOLBOX`:

| คอลัมน์ | ชนิดข้อมูล | หน้าที่ & คำอธิบาย |
| :--- | :--- | :--- |
| `id` | `INT IDENTITY(1,1)` | Primary Key ของรายการประวัติ |
| `user_id` | `INT NULL` | ID ของผู้กระทำ (ดึงจาก `$_SESSION['user']['id']` อัตโนมัติ) |
| `username` | `NVARCHAR(100)` | Username ผู้กระทำ หรือชื่อระบบ เช่น `SYSTEM_FAST_TRACK` |
| `role` | `NVARCHAR(50)` | Role ผู้กระทำ เช่น `admin`, `supervisor`, `operator` |
| `action` | `NVARCHAR(100)` | กริยาการกระทำตามมาตรฐาน เช่น `CREATE_ITEM`, `UPDATE_USER`, `APPROVE_PAINT_SHEET` |
| `module` | `NVARCHAR(50)` | รหัสโมดูล เช่น `SYSTEM_SETTINGS`, `USER_MANAGE`, `PAINT_CHEM`, `PROFILE` |
| `ref_id` | `NVARCHAR(100)` | รหัสอ้างอิงเป้าหมาย เช่น `item_id`, `user_id`, `header_id` หรือ `sap_no` |
| `old_value` | `NVARCHAR(MAX)` | **JSON Snapshot ข้อมูลก่อนแก้ไข** (Before state) |
| `new_value` | `NVARCHAR(MAX)` | **JSON Snapshot ข้อมูลหลังแก้ไข** (After state) |
| `remark` | `NVARCHAR(MAX)` | ข้อความสรุปแบบอ่านเข้าใจง่าย (Human-readable summary) |
| `ip_address` | `NVARCHAR(50)` | หมายเลข IP จริง (รองรับ Reverse Proxy / Cloudflare ผ่าน `X-Forwarded-For`) |
| `user_agent` | `NVARCHAR(500)` | ข้อมูลเบราว์เซอร์และอุปกรณ์ของผู้ใช้งาน |
| `created_at` | `DATETIME` | วัน-เวลาที่เกิดการกระทำ (`GETDATE()`) |

---

### 2. สเปกการเรียกใช้งานฟังก์ชันมาตรฐาน (`logger.php`)
เรียกผ่านฟังก์ชันกลาง `writeLog()` หรือ `writeAuditLog()` ใน `Toolbox/public/utils/logger.php`:

```php
require_once __DIR__ . '/../../utils/logger.php';

writeLog(
    PDO $pdo,
    string $action,           // เช่น 'UPDATE_ITEM', 'DEACTIVATE_LOCATION'
    string $module,           // เช่น 'SYSTEM_SETTINGS', 'USER_MANAGE'
    string|int $refId,        // Primary Key หรือ Identifier ของข้อมูลเป้าหมาย
    array|null $oldData,      // Array จำลองข้อมูลก่อนแก้ไข (Before Snapshot)
    array|null $newData,      // Array จำลองข้อมูลหลังแก้ไข (After Snapshot)
    string $remark = ''       // ข้อความสรุปที่กระชับ ชัดเจน
);
```

#### คุณสมบัติพิเศษที่ระบบจัดการให้อัตโนมัติ:
1. **Auto Identity Extraction:** หากไม่ส่ง `$userId` / `$username` เข้ามา ตัวฟังก์ชันจะดึงจาก `$_SESSION['user']` ให้อัตโนมัติ ป้องกันการลืมส่งข้อมูลตัวตน
2. **Safe JSON Serialization:** รองรับทั้ง associative array, stdClass หรือ JSON string โดยจะไม่ทำการ Double-Encode (`"\"...\""`) เด็ดขาด และรองรับภาษาไทย (`JSON_UNESCAPED_UNICODE`)
3. **True Client IP Detection:** ฟังก์ชัน `getClientIpAddress()` จะตรวจสอบ Headers เรียงลำดับ `HTTP_CF_CONNECTING_IP` -> `HTTP_X_FORWARDED_FOR` -> `HTTP_X_REAL_IP` -> `REMOTE_ADDR` และตัดเฉพาะ Valid Public/Private IP เพื่อป้องกัน IP Spoofing
4. **Fail-Safe Operation:** หากเกิดข้อผิดพลาดในการบันทึก Log จะดักจับผ่าน try-catch และเขียนลง error log ของเครื่อง โดยไม่ทำให้ Transaction หลักของโมดูลล้มเหลว (Non-blocking audit)

---

### 3. กฎเหล็ก "Snapshot Pattern" สำหรับทุก Endpoint ที่พอร์ตเข้ามา
1. **ห้ามส่ง ID เปล่าๆ เข้า `$oldData`:**
   * ❌ *ผิด:* `writeLog($pdo, 'UPDATE_PROFILE', 'PROFILE', $username, $currentId, null, ...);` (ทำให้ `old_value` บันทึกเป็นแค่เลข ID)
   * ✅ *ถูก:* `writeLog($pdo, 'UPDATE_PROFILE', 'PROFILE', (string)$currentId, $oldProfile, $input, ...);`
2. **ต้อง SELECT ข้อมูลเดิมก่อน UPDATE หรือ DELETE:**
   * ก่อนสั่งรันคำสั่ง SQL ที่เปลี่ยนแปลงข้อมูลในตารางหลัก ให้ทำการ `SELECT * FROM <TABLE> WHERE id = ?` เก็บไว้ในตัวแปร `$oldData` เสมอ
3. **การแสดงผลความเปลี่ยนแปลงบน Frontend (Diff Viewer):**
   * โมดูลที่มีหน้าจอ Audit Trail (เช่น `ItemAuditModal.jsx`) จะต้องเปรียบเทียบความต่างระหว่าง `$old_value` และ `$new_value` เพื่อไฮไลต์ฟิลด์ที่มีการเปลี่ยนแปลง (Before/After) ให้เห็นชัดเจน 1:1