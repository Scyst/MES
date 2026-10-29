# 🏗️ Toolbox2 (MES V2 SPA) Architecture & Migration Guide

> **หมายเหตุโครงสร้างโฟลเดอร์:** โฟลเดอร์ใน Git ใช้ชื่อ `MES/Toolbox2` เพื่อให้ตรงกับพาร์ทจริงบน FTP Server (`/Toolbox2` -> `/iot-toolbox/sandbox-b9/Toolbox2/`) แบบ 1:1

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
ห้ามเขียนโค้ดใน `Toolbox2` ให้เรียก API ข้ามโฟลเดอร์ไปที่ `/MES/MES/page/...` หรือ `/Toolbox/planner/...` เด็ดขาด ทุกโมดูลที่พอร์ตเข้ามาต้องมีทั้ง Frontend และ Backend API อยู่ในโฟลเดอร์ `MES/Toolbox2` เองทั้งหมด:

```text
MES/Toolbox2/
├── public/                     # Backend PHP & Static Assets (ถูกก๊อปปี้เข้า dist/ ตอน build)
│   ├── config.php              # ไฟล์ตั้งค่ากลาง & ตาราง DB ทั้งหมดของ Toolbox2
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
        └── Admin/              # ระบบจัดการผู้ใช้งานและสิทธิ์ (#/admin/users)
```

---

## 🧱 3. แผนตอกเสาเข็มโครงสร้างพื้นฐาน 4 ชั้น (4-Layer Core Foundation Roadmap)
> **สำหรับ Agent ตัวหลักที่ทำงาน & กะกลางคืน:** ให้ดำเนินการพัฒนาตามลำดับชั้นนี้ก่อนพอร์ตโมดูลหน้างานขนาดใหญ่ เพื่อให้ทุกโมดูลใช้โครงสร้างพื้นฐานชุดเดียวกัน:

### ชั้นที่ 1: Shared UI & Core Utilities (`src/shared/`) — *เทียบเท่า `MES/page/components/js/`*
- [ ] **1.1 Global Toast & Confirm Dialog System (`useToast` & `useConfirm`):**
  - สร้าง Context และ Component แจ้งเตือน Toast มุมจอ (Success / Warning / Error) และหน้าต่างยืนยันแบบ Industrial Grade แทนการใช้ `window.alert()` และ `window.confirm()` ดิบๆ
- [ ] **1.2 Standardized API Client (`src/shared/services/apiClient.js`):**
  - ตัวครอบ Axios กลางที่แนบ `X-CSRF-TOKEN`, จัดการ Loading State, แปลง Error เป็น Toast ภาษาไทยอัตโนมัติ และรองรับ Retry เหมือน `MES/page/components/js/apiClient.js`
- [ ] **1.3 Reusable Industrial Data Table & Pagination (`<DataTable />` & `<Pagination />`):**
  - คอมโพเนนต์ตารางมาตรฐานโรงงาน (`w-full`, ค้นหา, กรอง, เรียงลำดับ, แบ่งหน้า, และ Export Excel) เพื่อใช้ซ้ำในทุกโมดูล

### ชั้นที่ 2: อัปเกรดระบบจัดการผู้ใช้งานและสิทธิ์ (`Admin / User Management` — `#/admin/users`) ให้ครบ 100%
- [ ] **2.1 Backend Parity (`public/api/userManage.php`):**
  - เพิ่ม Action `reset_password_default` (รีเซ็ตรหัสผ่านเป็น `123456` ในคลิกเดียว) และอัปเดต `action=read` ให้ดึง `profile_picture`, `pwd_changed_at`, `last_login` เหมือน `MES/page/userManage/api/userManage.php`
- [ ] **2.2 Frontend Parity (`src/modules/Admin/pages/UserManagement.jsx`):**
  - แสดงรูปโปรไฟล์ (`profile_picture`), เวลาเข้าใช้งานล่าสุด (`last_login`), วันที่เปลี่ยนรหัสผ่าน (`pwd_changed_at`), และปุ่ม Reset Password ในตารางผู้ใช้งาน
  - เมื่อทดสอบผ่านด้วย Puppeteer 100% ให้สลับลิงก์ **User Manager** ใน `HomeDashboard.jsx` และ `DesktopSidebar.jsx` มาใช้ `#/admin/users` ของ `Toolbox2` เต็มตัว

### ชั้นที่ 3: ศูนย์ตั้งค่าข้อมูลหลักของโรงงาน (`System Settings & Master Data` — `#/system-settings`)
พอร์ตโมดูล `MES/page/systemSettings` และ API ทั้ง 6 ไฟล์เข้าสู่ `MES/Toolbox2/src/modules/SystemSettings/` และ `public/api/systemSettings/` ครอบคลุม 5 แท็บหลัก:
- [ ] **3.1 Item Master (`ITEMS`)**: ทะเบียนสินค้า วัตถุดิบ และต้นทุนมาตรฐาน
- [ ] **3.2 BOM Manager (`PRODUCT_BOM`)**: สูตรการผลิต (Bill of Materials) + นำเข้า/ส่งออก Excel
- [ ] **3.3 Locations (`LOCATIONS`)**: พิกัดและโซนคลังสินค้า
- [ ] **3.4 Line Schedules (`LINE_SCHEDULES`)**: ตารางเวลาทำงานและกะของแต่ละไลน์ผลิต
- [ ] **3.5 SAP Valuation (`sap_staging_*` vs `ITEMS`)**: แดชบอร์ดเทียบต้นทุนและสต็อกระหว่าง SAP กับ MES พร้อมปุ่ม Sync ต้นทุน

### ชั้นที่ 4: หน้าจัดการโปรไฟล์ผู้ใช้งานเต็มรูปแบบ (`Full Profile Page` — `#/profile`)
- [ ] **4.1 Full Welfare & Personal Info Form:**
  - ต่อยอดจาก `AccountSettingsModal.jsx` ให้รองรับข้อมูลสวัสดิการพนักงานครบทุกฟิลด์ตาม `MES/page/profile/profileUI.php` (วิธีเดินทาง `commute_method`, ทะเบียนรถ `vehicle_registration`, ไซส์เสื้อ/รองเท้า `shirt_size`/`shoe_size`, วันเกิด `date_of_birth`, สถานะสมรส/บุตร, ที่อยู่ปัจจุบัน)
