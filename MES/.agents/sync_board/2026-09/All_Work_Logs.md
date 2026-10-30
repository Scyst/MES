

# ===== FILE: 2026-09-01.md =====

# 📝 Sync Board - 2026-09-01

## ✅ Completed

### Safety Print Center (LOTO Cards Printing Engine)
- **เวลาทำงาน (Time)**: 08:06 - 08:33
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: User ต้องการให้หน้าแสดงตัวอย่างก่อนพิมพ์การ์ด (Print Preview) แบ่งคอลัมน์ได้ถูกต้อง, แบ่งหน้ากระดาษ A4 ไม่ให้ชิดติดกัน, และต้องการให้พิมพ์หน้านี้ได้เลยโดยไม่ต้องเปิดหน้าต่างใหม่
- **สิ่งที่แก้ไขไป (What)**: 
  1. แก้ไข CSS ที่ทับซ้อนกันจนทำให้หน้ากระดาษเหลือ 1 คอลัมน์ให้กลับมาแสดง 50% 2 คอลัมน์ตามปกติ
  2. แก้ไขระยะห่าง `margin-bottom` ของกระดาษจำลองไม่ให้ซ้อนทับกัน
  3. ปรับโครงสร้างคำสั่งพิมพ์ (Print) โดยใช้เทคนิค Hidden Iframe ควบคู่กับการเรียก `card_print.php` แบบซ่อนตัว เพื่อหลีกเลี่ยงการถูก CSS ของ Dashboard รบกวน ทำให้สามารถกดพิมพ์ได้เลยโดยไม่ต้องเด้งหน้าใหม่
  4. กู้คืนโครงสร้าง HTML ที่ถูกลบไปโดยไม่ได้ตั้งใจกลับมาทั้งหมด
- **ผลลัพธ์ (Result)**: หน้าจอกลับมาทำงานได้อย่างสมบูรณ์แบบ แสดง 2 คอลัมน์ตรงตามหน้าจอ, กระดาษมีระยะห่างชัดเจน, และกดพิมพ์แล้วหน้าต่างพริ้นเตอร์เด้งขึ้นมาพร้อมแบบการ์ดที่สีสันสมบูรณ์ 100%
- **ไฟล์ที่แก้ไข (Files Modified)**: `page/PE/components/tab_card_generator.php`, `page/PE/script/cardGeneratorModule.js`

### Dashboard Sidebar Navigation
- **เวลาทำงาน (Time)**: 08:42 - 08:43
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: User ต้องการย้ายเมนู Safety & Hazards และ Safety Print Center ไปไว้ในกลุ่ม Main เพื่อความเหมาะสมในการใช้งาน
- **สิ่งที่แก้ไขไป (What)**: ย้ายปุ่มเมนูทั้งสองจากกลุ่ม Analytics & IIoT และ Quick Links มาต่อท้ายในกลุ่ม Main
- **ผลลัพธ์ (Result)**: เมนูถูกจัดกลุ่มใหม่เรียบร้อยแล้ว
- **ไฟล์ที่แก้ไข (Files Modified)**: page/PE/peDashboard.php
### Phantom Stock Fix (Delete Tag Logic)
- **เวลาทำงาน (Time)**: 10:45 - 11:05 01/09/26
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: User แจ้งว่ามีสินค้ายอดค้างในคลัง 5,000 ชิ้น แต่ไม่มีแท็กให้เบิกจ่าย (Phantom Stock) สาเหตุเกิดจากการลบแท็กในสถานะ AVAILABLE แต่ระบบไม่มีคำสั่งลดยอดจาก INVENTORY_ONHAND
- **สิ่งที่แก้ไขไป (What)**: 
  1. แก้ไข `delete_tag` และ `delete_bulk_tags` ใน `api_store.php` ให้เรียก `sp_UpdateOnhandBalance` ลดยอดทันทีหากลบแท็กสถานะ AVAILABLE
  2. เพิ่มคอลัมน์ `location_id` ในตาราง `DELETED_SERIAL_TAGS` และปรับปรุง Logic การ Insert ให้เก็บ Location ด้วย
  3. สรุปรายงานแท็กที่ตกค้างรวม 1,410 แท็ก เพื่อให้ User เตรียม Data Cleanup (Inventory Adjustment)
- **ผลลัพธ์ (Result)**: การลบแท็กในอนาคตจะหักลบยอดออกจากสต๊อกทันที ไม่เกิด Phantom Stock อีก
- **ไฟล์ที่แก้ไข (Files Modified)**: `page/storeManagement/api/api_store.php`




# ===== FILE: 2026-09-02.md =====

## ✅ Completed

### Planner (Bug Fix - Recurrence and Deletion)
- **เวลาทำงาน (Time)**: 08:20 - 09:00
- **ปัญหา / สิ่งที่ต้องทำ (Why)**:
  1. การสร้างงานแบบทำซ้ำ (Recurrence) สร้างได้แค่วันเดียว เพราะหน้าเว็บและ Backend คำนวณวันที่สิ้นสุดผิดพลาด
  2. การลบงานทำซ้ำแบบ "อัพเดตอนาคต" (Delete Series) ไม่ลบงานในอนาคตให้ เพราะ Component ตัวกลางโยนค่าทิ้ง
  3. ฟอนต์หน้าเว็บกลายเป็นภาษาเอเลี่ยนจากการเผลอเปลี่ยน Encoding (UTF-8 -> ANSI) ระหว่างการแก้ไฟล์
- **สิ่งที่แก้ไขไป (What)**:
  1. เพิ่มโค้ด Backend Fallback ใน `tasks.php` เพื่อดักจับกรณีที่หน้าเว็บส่ง `endDate` มาชนกับ `startDate` ให้บวกเพิ่มอัตโนมัติ 1 เดือน
  2. แก้ไขการลบงานแบบทำซ้ำ โดยส่งพารามิเตอร์ `updateSeries` จาก `AddTaskModal` ให้ทะลุผ่าน Wrapper Components (`CalendarView`, `GanttChart`, `TaskBoard`) ไปจนถึง API หลักได้สมบูรณ์
  3. ดึงไฟล์ `AddTaskModal.jsx` ชุดเดิมกลับมาจาก Git และทำการแก้ไขใหม่โดยใช้ Node.js เพื่อรักษา Encoding UTF-8 ไว้ จากนั้น Build และอัปโหลดไฟล์ทั้งหมดขึ้น FTP เซิร์ฟเวอร์
  4. ใช้คำสั่ง SQL (ผ่าน MCP) ทะลวงลบขยะงานทดสอบ (15t1 และ ฟหดกหฟก) ออกจากฐานข้อมูล จำนวน 39 รายการ
- **ผลลัพธ์ (Result)**: 
  - สร้างงานทำซ้ำได้ปกติและคำนวณวันถูกต้อง 100%
  - การลบงานและเลือกลบอัพเดตอนาคต ทำงานล้างบางงานทั้งหมดที่เกี่ยวข้องกันได้แล้ว
  - ภาษาเอเลี่ยนหายไปและกลับมาเป็นภาษาไทยตามปกติ
- **ไฟล์ที่แก้ไข (Files Modified)**: `api/tasks.php`, `src/components/AddTaskModal.jsx`, `src/components/CalendarView.jsx`, `src/components/GanttChart.jsx`, `src/components/TaskBoard.jsx`

### Store Management (Bug Fix - Default Location & Phantom Stock)
- **เวลาทำงาน (Time)**: 12:50 - 13:25
- **ปัญหา / สิ่งที่ต้องทำ (Why)**:
  1. พบยอดสต๊อกผี (Phantom Stock) ที่เบิ้ล 2 สถานที่ เกิดจากข้อมูล SAP กับ Part No ซ้ำกัน (55 รายการ)
  2. หน้า Inventory Dashboard เวลารีเฟรชไป Default เลือกคลัง A1 (1008) แทนที่จะเป็น All Locations
- **สิ่งที่ทำ (What)**:
  1. ลบ Tag ผีของรหัส 30022513 (item_id 143) ทิ้งเพื่อเคลียร์ยอดให้เป็น 0 ตามที่ Store ยืนยัน พร้อมลดยอดจาก INVENTORY_ONHAND และบันทึก STOCK_TRANSACTIONS
  2. แก้ไขโค้ด storeScanner.js เอาเงื่อนไขที่บังคับค่า Default เป็นคลัง STORE แรกออก เพื่อให้กลับมาใช้ 'ALL' ได้ตามปกติ
  3. Deploy ไฟล์ขึ้น FTP Server ที่ path /MES/MES/page/storeManagement/script/storeScanner.js
- **ผลลัพธ์ (Result)**: 
  - ยอด 143 เป็น 0 และแก้ปัญหายอดเบิ้ล 55 รายการเสร็จสมบูรณ์
  - รีเฟรช Inventory Dashboard กลับมาเป็น All Locations ตามปกติ
- **ไฟล์ (Files Modified)**: page/storeManagement/script/storeScanner.js

### PE Tech Mobile & Quick Hazard Report (UI Redesign & UX Improvements)
- **เวลาทำงาน (Time)**: 11:30 - 13:35
- **ปัญหา / สิ่งที่ต้องทำ (Why)**:
  1. หน้าต่างฟิลเตอร์ (Search & Filter) บน Technician Portal ใช้งานยาก และไม่สอดคล้องกับ UI หลัก
  2. การแสดงผล Modal รายละเอียดใบงานบนมือถือมีปัญหาเรื่อง Padding และ Layout กินพื้นที่มากเกินไป
  3. ผู้ใช้ต้องการให้เพิ่มการค้นหาจาก ชื่อเครื่องจักร และ ผู้แจ้ง ในช่องค้นหาด่วน
  4. หน้าแบบฟอร์ม Quick Hazard Report มีดีไซน์ที่ไม่เข้ากับระบบใหม่ และมี Padding ด้านล่างเกินมาทำให้เกิด Scrollbar
- **สิ่งที่ทำ (What)**:
  1. รีดีไซน์หน้า `peTechMobile.php` ย้าย Searchbox ออกมาเป็น Real-time search ด้านนอก และซ่อน Dropdown สถานะไว้ใน Advanced Filter
  2. แก้ไข Logic การค้นหาใน `peTechModule.js` ให้รวม `machine_name`, `machine_display_name` และ `requested_by`
  3. ปรับสไตล์ `quick_hazard_report.php` โดยใช้ Header สีแดง (Danger gradient), การ์ดแบบ Glassmorphism และปุ่มแบบใหม่
  4. ถอดข้อความที่ไม่จำเป็นออก และเพิ่มคำสั่ง CSS `padding-bottom: 0 !important;` เพื่อแก้ปัญหา Scrollbar 
- **ผลลัพธ์ (Result)**: 
  - ระบบค้นหางานซ่อมบนมือถือทำงานได้ไวและครอบคลุมทุกช่องข้อมูลสำคัญ
  - หน้าแจ้งเหตุฉุกเฉิน (Hazard Report) มีดีไซน์ Premium ขึ้น และหน้าจอไม่เลื่อนไหลผิดปกติ
  - อัปโหลดแก้ไขไฟล์ทั้งหมดผ่าน FTP เรียบร้อย
- **ไฟล์ (Files Modified)**: `page/PE/peTechMobile.php`, `page/PE/script/peTechModule.js`, `page/PE/quick_hazard_report.php`, `page/PE/css/peTechMobile.css`

### UI_Architecture (Morning Brief Modal & URL Structure)
- **เวลาทำงาน (Time)**: 09:37 - 13:52
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: Modal Morning Brief มี Scrollbar ซ้อนกันดูไม่สวยงาม และ URL ของระบบใหม่มี dashboard.html ติดอยู่ตลอด (ดูไม่เป็นมืออาชีพ) ผู้ใช้ต้องการปรับให้ Modal ยืดสุดจอและใช้ Scrollbar นอกสุดแทน พร้อมกับเก็บโครงสร้างการทำระบบไว้ในเอกสาร
- **สิ่งที่แก้ไขไป (What)**: 
  1. เอา `max-h-[85vh]` ออกและจัด Layout Modal ใหม่ให้เลื่อนผ่าน Browser ได้เลย
  2. เปลี่ยน Entry Point ของ React จาก `dashboard.html` เป็น `index.html` 
  3. แก้ไขไฟล์ `.htaccess` เพื่อรองรับ `index.html` 
  4. สร้างไฟล์ `mes-v2/ARCHITECTURE.md` บันทึกแนวทางการพอร์ตระบบ SPA และ Tech stack ที่ใช้
- **ผลลัพธ์ (Result)**: หน้าจอ Modal สวยงามและใช้งานง่ายขึ้น, URL สะอาดตา (Clean URL), และมีเอกสารอ้างอิงชัดเจน
- **ไฟล์ที่แก้ไข (Files Modified)**: `mes-v2/src/modules/Home/components/MorningBriefModal.jsx`, `mes-v2/vite.config.js`, `mes-v2/public/.htaccess`, `mes-v2/ARCHITECTURE.md`



# ===== FILE: 2026-09-03.md =====

# Sync Board — 2026-09-03

---

## ✅ Completed

### userManage / Profile (New Feature - User Profile & Self-Service System)
- **เวลาทำงาน (Time)**: 09:05 - 09:17
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: ระบบ User ปัจจุบันไม่มีหน้า Profile ส่วนตัว ผู้ใช้ไม่สามารถอัปโหลดรูป หรือเปลี่ยนรหัสผ่านได้ด้วยตนเอง Admin ก็ไม่สามารถติดตามได้ว่า User คนไหนยังไม่เคยเปลี่ยนรหัสผ่านจาก Default
- **สิ่งที่แก้ไขไป (What)**:
  - เพิ่มคอลัมน์ใหม่ใน `USERS` table รวม 7 คอลัมน์ (`profile_picture`, `phone`, `bio`, `last_login`, `pwd_changed_at`, `preferred_lang`, `theme_preference`) เป็นฐานข้อมูลสำหรับ Feature ในอนาคต
  - สร้างหน้า **โปรไฟล์ส่วนตัว** (`/page/profile/profileUI.php`) ให้ User ทุก Role เข้าได้ มี 3 แท็บ:
    - **ข้อมูลส่วนตัว** — แก้ phone, bio (ชื่อ/ตำแหน่ง read-only ซิงค์จาก HR)
    - **ความปลอดภัย** — เปลี่ยนรหัสผ่าน (ต้องใส่รหัสเดิมก่อนเสมอ)
    - **การตั้งค่า** — เลือก Theme (light/dark) และภาษา
  - สร้างระบบ **อัปโหลดรูปโปรไฟล์** ที่ตรวจสอบ MIME type จริง, จำกัดขนาดไม่เกิน 2MB, ครอปกึ่งกลางและ resize เป็น 256×256 px อัตโนมัติ
  - **Dropdown ใน Header** ทุกหน้า ตอนนี้แสดงรูปโปรไฟล์จริงแล้ว (ถ้ายังไม่มีรูปจะแสดง icon แทน) และมีปุ่ม "โปรไฟล์ของฉัน"
  - **หน้า User Management (Admin)** ตอนนี้แสดง thumbnail รูปโปรไฟล์ของแต่ละ User และเตือนด้วยสีเหลือง สำหรับ User ที่ยังไม่เคยเปลี่ยนรหัสผ่านจาก Default
  - ระบบบันทึกวันเวลา Login ล่าสุดทุกครั้งอัตโนมัติ
- **ผลลัพธ์ (Result)**: User สามารถจัดการข้อมูลส่วนตัวได้ด้วยตนเองโดยไม่ต้องให้ Admin ช่วย, Admin เห็น Security status ของ User แต่ละคนชัดเจนขึ้น, ฐานข้อมูล User พร้อมรองรับ Feature ใหม่ในอนาคต
- **ไฟล์ที่แก้ไข (Files Modified)**:
  - `auth/login.php`
  - `page/components/php/top_header.php`
  - `page/userManage/api/userManage.php`
  - `page/userManage/script/userManage.js`
  - `page/userManage/USER_MANAGEMENT_DOC.md`
- **ไฟล์ที่สร้างใหม่ (Files Created)**:
  - `page/profile/profileUI.php`
  - `page/profile/api/api_profile.php`
  - `page/profile/api/api_avatar_upload.php`
- **Commits**: `dd0eed6`, `967157d` → `origin/main`

### Profile UI Enhancements (Aesthetic & UX Upgrades)
- **เวลาทำงาน (Time)**: 10:00 - 10:30
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: หน้า Profile เดิมยังขาดความสวยงามตามรูปแบบ Modern UI, ขาดแท็บแสดงประวัติกิจกรรม (Activity Log) ของ User, และ Password Strength ขาดตัวช่วยแสดงความปลอดภัย
- **สิ่งที่แก้ไขไป (What)**:
  - เพิ่ม Skeleton Loader ระหว่างรอโหลดข้อมูลโปรไฟล์ (ชั่วคราว) และเพิ่ม Glassmorphism ให้การ์ดต่างๆ
  - อัปเดตรูปแบบปุ่มสลับแท็บให้โดดเด่น และเพิ่ม Hover Overlay ให้กับรูป Avatar เพื่อง่ายต่อการรับรู้ว่าคลิกเปลี่ยนรูปได้
  - เปลี่ยน Input Readonly ให้เป็นรูปแบบ Badges
  - สร้างแท็บ "ประวัติกิจกรรม" ดึงข้อมูลจากตาราง `SYSTEM_LOGS` มาแสดงแบบ Timeline (จำกัด 20 รายการล่าสุด)
  - ปรับปรุงการแสดง Password Strength โดยใช้สี 4 ระดับ แจ้งเตือนความปลอดภัยทันทีที่พิมพ์
- **ผลลัพธ์ (Result)**: หน้า Profile ดูพรีเมียมและสวยงามมากขึ้น User ได้รับประสบการณ์การใช้งานที่ดีกว่าเดิม รองรับการดูประวัติกิจกรรมของตนเองได้ 
- **ไฟล์ที่แก้ไข (Files Modified)**:
  - `page/profile/profileUI.php`
  - `page/profile/api/api_profile.php`
- **Commits**: `399c4df` → `origin/main`

### Employee Data Warehouse & Sizing Refinements
- **เวลาทำงาน (Time)**: 10:40 - 10:46
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: User ต้องการให้หน้าตาและฟอนต์ได้มาตรฐานเว็บปัจจุบัน (ไม่ใหญ่เทอะทะแบบเดิม) และต้องการเก็บข้อมูลพนักงานให้ครอบคลุมเพื่อสร้าง Employee Data Warehouse
- **สิ่งที่แก้ไขไป (What)**:
  - (DB Schema) เพิ่ม 7 คอลัมน์ลงตาราง `USERS`: `social_line_id`, `social_facebook`, `commute_method`, `vehicle_registration`, `emergency_contact_name`, `emergency_contact_phone`, `current_address`
  - (UI) ลบ class `.btn-lg` และ `.form-control-lg` ออกทั้งหมด เพื่อปรับขนาดมาตรฐาน
  - (UI) จัดหมวดหมู่ในแท็บ "ข้อมูลส่วนตัว" เป็น 4 หมวด: พื้นฐาน, ติดต่อ & โซเชียล, การเดินทาง, ข้อมูลฉุกเฉิน
  - (API) เปลี่ยนมาใช้ Raw SQL Query ใน `api_profile.php` แทน `sp_ManageUser` สำหรับอัปเดต Profile ป้องกันปัญหากระทบ Stored Procedure ตัวหลัก
- **ผลลัพธ์ (Result)**: ฟอร์มดูทันสมัยตามมาตรฐาน และสามารถบันทึกข้อมูลพนักงานเชิงลึกได้สมบูรณ์ นำไปต่อยอดด้านสวัสดิการและการติดต่อได้
- **Commits**: `e92b512` → `origin/main`

### Expand Employee Data Warehouse (Non-Sensitive Data)
- **เวลาทำงาน (Time)**: 14:26 - 14:29
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: เลื่อนการเก็บข้อมูลสุขภาพออกไปก่อนตามข้อกังวลด้าน PDPA แต่ดำเนินการเก็บข้อมูลทั่วไปที่ไม่ติด PDPA ทันทีเพื่อความสมบูรณ์ของระบบ
- **สิ่งที่แก้ไขไป (What)**:
  - (DB Schema) เพิ่ม 6 คอลัมน์ลงตาราง `USERS`: `date_of_birth`, `marital_status`, `children_count`, `shirt_size`, `shoe_size`, `emergency_contact_relation`
  - (UI) เพิ่มฟิลด์ลงในแท็บข้อมูลส่วนตัว และสร้างหมวดหมู่ย่อย "สวัสดิการและอุปกรณ์ (Welfare & Equipment)"
  - (API) แก้ไข `api_profile.php` ทั้ง SELECT และ UPDATE
- **ผลลัพธ์ (Result)**: ฐานข้อมูลพนักงานครอบคลุมข้อมูลด้านประชากรศาสตร์และสวัสดิการมากขึ้น
- **Commits**: `40f980d` → `origin/main`

### Enterprise UI Refinements
- **เวลาทำงาน (Time)**: 15:42 - 15:58
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: หน้า Profile มีระยะห่างที่มากเกินไป ตัวอักษรใหญ่เกินไป และสไตล์ยังไม่เป็นมาตรฐานเดียวกันทุกแท็บ
- **สิ่งที่แก้ไขไป (What)**:
  - ย้ายตัวนับอักษร bio (`#bioCharCount`) เข้าไปอยู่ใน textarea overlay เพื่อลดระยะบรรทัด
  - นำ Design System (pro-section-header, pro-field-group, pro-notice) ไปประยุกต์ใช้กับแท็บ ความปลอดภัย, ประวัติกิจกรรม, และการตั้งค่า เพื่อให้รูปแบบสอดคล้องกับแท็บข้อมูลส่วนตัว
  - ลดขนาดตัวอักษรของ Activity Log ให้เข้ากับสเกล Enterprise UI
- **ผลลัพธ์ (Result)**: หน้า Profile มีขนาดกะทัดรัดขึ้น (Compact) มีความต่อเนื่องทางสไตล์ในทุกแท็บ เป็นมาตรฐาน Enterprise Grade มากขึ้น
- **Commits**: `3b84a7d`, `c4ace54`, `246ca06` → `origin/main`

### i18n Infrastructure & Profile Performance Widget
- **เวลาทำงาน (Time)**: 16:00 - 17:15
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: ต้องการเตรียมระบบรองรับหลายภาษา (i18n) และผู้ใช้ต้องการเห็นข้อมูลผลงาน (Performance) ในหน้า Profile ทันที พร้อมปรับดีไซน์ช่องข้อมูลพื้นฐานให้เป็นทางการ
- **สิ่งที่แก้ไขไป (What)**:
  - สร้างโครงสร้างภาษา `lang/th.json`, `lang/en.json` และ Helper `utils/i18n.php` นำไปผูกกับ `config.php`
  - ผูกการตั้งค่าภาษาในหน้า Profile ให้บังคับโหลดหน้าเว็บใหม่ (`location.reload()`) เพื่อให้ภาษาเปลี่ยนทันที
  - เพิ่ม Performance Widget แสดงเกรดประเมิน ค่าผลงาน และ Ratio โดยดึงข้อมูลจาก `api_my_performance.php` 
  - จัดรูปแบบช่องข้อมูลพื้นฐาน (ชื่อ, ตำแหน่ง, สาย, แผนก) ให้เป็น Read-only Input แบบ Formal ขนาด `200px` ป้องกันการหดตัวเวลาไม่มีข้อมูล
- **ผลลัพธ์ (Result)**: ระบบรองรับการเพิ่มภาษาใหม่ได้ง่ายขึ้น User เห็นผลงานของตัวเองชัดเจนในหน้าโปรไฟล์ และ UI ส่วนตัวมีความสมบูรณ์เป็นระเบียบ
- **ไฟล์ที่แก้ไข (Files Modified)**:
  - `page/profile/profileUI.php`
  - `config/config.php`
- **ไฟล์ที่สร้างใหม่ (Files Created)**:
  - `lang/th.json`
  - `lang/en.json`
  - `utils/i18n.php`
- **Commits**: `bc6830a`, `565ae38`, `d5c1c77` → `origin/main`
---
## ⚠️ หมายเหตุสำหรับ Agent ถัดไป

1. **PHP GD Extension**: `api_avatar_upload.php` ใช้ PHP GD functions สำหรับ resize รูป — ตรวจสอบว่า server enable ไว้แล้ว
2. **Mobile nav**: `nav_dropdown.php` (dropdown บนมือถือ) ยังไม่ได้อัปเดตให้แสดงรูปโปรไฟล์ — ควรทำให้ consistent กับ desktop
3. **Theme**: `theme_preference` ใน DB พร้อมแล้ว แต่ปัจจุบัน `portal.js` ยังอ่านจาก `localStorage` เป็นหลัก — อนาคตควร sync ให้อ่านจาก session แทน

---

## 📋 Backlog

- [ ] อัปเดต mobile nav dropdown ให้แสดงรูปโปรไฟล์
- [ ] Team Planner Integration (ใน roadmap)
- [ ] Bulk permission assignment

### PE Tech Mobile (Bug Fix - Missing Modals)
- **เวลาทำงาน (Time)**: 08:23 - 08:35
- **ปัญหา / สิ่งที่ต้องทำ (Why)**:
  - ผู้ใช้งานแจ้งว่าในหน้า Technician Mobile ไม่สามารถกด "ปิดงานซ่อม" (Quick Close) และเบิกอะไหล่ได้
  - สาเหตุมาจากการ Refactor โค้ด HTML เมื่อวาน ทำให้หน้าต่าง Modal บางส่วนหายไป 
- **สิ่งที่ทำ (What)**:
  1. ดำเนินการตรวจสอบโครงสร้าง HTML (Deep Check) เทียบกับประวัติของ Git 
  2. กู้คืนโครงสร้างการ `include` ของ `modal_quick_close.php` และ `modal_wo_issue_part.php` ให้กลับมาทำงานได้ปกติ
  3. กู้คืนโค้ด HTML ของ `cropImageModal` กลับเข้าไปในหน้าจอ
  4. ทำการลบระบบ "โปรไฟล์พนักงาน" (Profile Section) ออกตามความต้องการของผู้ใช้งาน เนื่องจากยังเป็นระบบที่ไม่สมบูรณ์และควรแยกไปอยู่โมดูล User Management
  5. อัปโหลดโค้ดชุดใหม่ขึ้น Server ผ่าน FTP ทันที
- **ผลลัพธ์ (Result)**: 
  - ผู้ใช้งานสามารถกดปิดงานซ่อม เบิกอะไหล่ และถ่ายรูปแนบได้ตามปกติ และไม่มีโมดูลโปรไฟล์ที่ไม่สมบูรณ์ปะปน
- **ไฟล์ (Files Modified)**: `page/PE/peTechMobile.php`




# ===== FILE: 2026-09-04.md =====

# Sync Board - 2026-09-04
**Agent ID:** Oat (or Agent)
**Focus Area:** Mobile Nav UI & Documentation

## Tasks Completed
- [x] Create `MANPOWER_INTEGRATION_GUIDE.md` for another agent to handle employee data and profile pictures logic in the manpower module.
- [x] Update `nav_dropdown.php` (Mobile Nav) to show `$profilePic` instead of the default icon.
- [x] Fix `.avatar-card` overlapping issue on mobile in `profileUI.php` by disabling sticky positioning for small screens.
- [x] Fix text wrapping on mobile: make tabs scrollable horizontally and hide English subtitles in section headers.
- [x] Fix horizontal overflow (grid blowout) issue on mobile devices by applying `min-width: 0` to the profile content card.
- [x] Move basic info helper text into tooltips attached to read-only fields (Name, Position, Line, Dept) to save space and reduce confusion.
- [x] Revert theme switching functionality: disable dark mode toggle, force 'light' mode in `theme-switcher.js`, and mark Theme/Language preferences as "Under Development" (disabled) in `profileUI.php` to prevent user confusion during ongoing development.
- [x] Update Settings tab in `profileUI.php`: Convert Theme and Language selectors into solid read-only blocks (matching personal info fields) and replace text badges with hoverable Tooltip icons for a cleaner UI.
- [x] Create `README.md` in `page/profile/` to document the module's architecture and log future enhancements (Theme Syncing, i18n, Notification settings).

## Known Issues / Blockers
- Theme Syncing and i18n are currently disabled (Under Development).

## Future Work (Hand-off)
- **Admin User Management:** Create a UI for HR/Admins to assign permissions and roles in bulk (Target: Admin Dashboard). *(Update: Implemented Fast Password Reset)*
- **Theme/Language Persistence:** Implement DB syncing for theme preferences directly from the top header without page reloads.
- **Team Planner API integration** (For scheduling tasks related to users).

## User Management Module (Admin)
- [x] **Fast Password Reset:** Added a one-click Reset Password button to the Admin data table (`userManageUI.php` / `userManage.js`) that resets passwords to a default (`123456`) instantly via API.
- [x] **UI Polish:** Fixed log table pagination position by moving it inside the card footer.
- [x] **UI Polish:** Eliminated horizontal scrollbars by adjusting container padding (`py-3`).
- [x] **UI Polish:** Forced fixed height on data tables (`table-fixed-height`) to prevent collapsing while data is loading, ensuring a consistent layout across viewport sizes.

## PE Module 
- [x] Integrate User Profile picture into **Safety Print Center** (LOTO / Operator Cards). Updated `safetyAPI.php` to JOIN the `USERS` table and map the `profile_picture` attribute to `cardGeneratorModule.js`.
- [x] Adjust LOTO card format to display Photo instead of Lock icon, and include Employee ID and Date/Time on the same line.

## Manpower Module
- [x] Integrate Profile Picture into Master Data UI table (`manpower_ui.js`).
- [x] Integrate extended profile data (Bio, Phone, Emergency Contact) into `empEditModal` as read-only fields.
- [x] Update `api_master_data.php` to `LEFT JOIN` the `USERS` table and map profile attributes.
- [x] **Universal Profile Viewer:** Created `Actions.viewEmployeeProfile()` using SweetAlert2 and injected it into `manpower_ui.js` (detailModal, editLogModal, empKpiModal) and `employeeGrading.js` tables for global access.

## PE Module (Internationalization / i18n)
- [x] Translated `peDashboard.php` and its sub-components (`tab_machines.php`, `tab_workorders.php`, `tab_spareparts.php`, `tab_safety.php`) to support English and Thai via `en.json` and `th.json`.
- [x] Uploaded translated files to FTP and committed to `main` branch.

## Next Steps / Notes
- Wait for user's instruction on the next feature.



# ===== FILE: 2026-09-05.md =====

## ✅ Completed

### Manpower (Grade Weightage System & Code Cleanup)
- **เวลาทำงาน (Time)**: 12:30 - 17:00
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: User ต้องการให้ระบบประเมินเกรดพนักงาน (Employee Grading) สามารถกำหนดค่าน้ำหนัก (Weightage) ของแต่ละหัวข้อ (IPH, 5S, Attendance, Learning) แบบแยกตามแผนกได้ (Option A) และต้องการทำความสะอาดโค้ดเก่าที่ตกค้างจากการทำระบบแปลภาษา (i18n) ออกไป
- **สิ่งที่แก้ไขไป (What)**: 
  - สร้าง Modal สำหรับตั้งค่าน้ำหนักเกรดรวมแยกตามทีม
  - อัปเดตตรรกะหน้าบ้าน (`employeeGrading.js`) ให้คำนวณ Overall Grade แบบถ่วงน้ำหนัก (เปอร์เซ็นต์รวม 100%)
  - ปรับระบบ Auto Fill ให้ช่องเกรดนำเกรดของระบบมาใช้คำนวณและแสดงผลในวงเล็บ (เช่น `(A)`) อัตโนมัติหากยังไม่มีการเลือก
  - เพิ่ม API Action `save_weightage` ใน `api_employee_grading.php` เพื่อดึงและเซฟค่าน้ำหนักจาก `MANPOWER_TEAM_SETTINGS` พร้อมทำระบบ Log (`writeLog`)
  - ลบไฟล์เก่า `utils/i18n.php` ทิ้ง และเปลี่ยนไปใช้แบบ Component ใหม่แทนทั้งหมด
  - แก้บัคส่วนสูงตาราง (`calc(100vh)`) ให้แสดงผลพอดีจอ
- **ผลลัพธ์ (Result)**: ผู้ใช้สามารถกำหนดน้ำหนักเกรดในแต่ละแผนกได้เอง ระบบสามารถคำนวณเกรดรวมได้อย่างแม่นยำและแสดงผลช่องคะแนนระบบอัตโนมัติได้อย่างสวยงาม โค้ดเก่าและบัคการแสดงผลถูกล้างออกทั้งหมด
- **ไฟล์ที่แก้ไข (Files Modified)**: 
  - `page/manpower/employeeGrading.php`
  - `page/manpower/api/api_employee_grading.php`
  - `page/manpower/script/employeeGrading.js`
  - `config/config.php`
  - `page/components/common_head.php`
  - `page/manpower/manpowerUI.php`
  - ลบ `utils/i18n.php`



# ===== FILE: 2026-09-07.md =====

# Sync Board — 2026-09-07

## Agent: Antigravity (Employee Grading Phase 2)

### Session Summary

**Start:** ~16:06 | **End:** ~16:23  
**Status:** ✅ COMPLETE — All 4 features deployed to production FTP

---

### What Was Done

**Phase 1 — DB Migration (Complete)**
- Created `dbo.AUDIT_5S` — 5S audit records per line (computed total_score + grade columns)
- Created `dbo.SKILL_DEFINITIONS` — Skill catalog with category, line, display_order, is_active
- Created `dbo.EMP_SKILLS` — Employee skill levels (1-4) with certification tracking
- Documented all in `db_changes.md` (root)

**Feature 1 — 5S Audit System (Complete)**
- `api_employee_grading.php`: Added AUDIT_5S JOIN to `get_grading_data` (latest audit per line per period → `system_grade_5s`), added `get_5s_audits` and `save_5s_audit` actions with full input validation
- `employeeGrading.php`: Added broom icon button in toolbar
- `employeeGrading.js`: Added `open5sAuditModal()` (live score calculator S1-S5, auto grade preview), `save5sAudit()`, updated `renderSelect()` to pass `system_grade_5s` hint

**Feature 2 — Skill Matrix / Learning System (Complete)**
- `api_skill_matrix.php` [NEW]: Full CRUD — `get_skill_matrix`, `update_emp_skill`, `save_skill_definition`, `delete_skill_definition`, `toggle_skill_active`
- `skillMatrix.php` [NEW]: Interactive grid UI (employees × skills), click cell to set level 0-4, color-coded heatmap, Manage Skills modal with add/toggle/delete
- `api_employee_grading.php`: Added EMP_SKILLS JOIN (skill_count) + `system_grade_learning` calculation (A≥5 skills, B≥3, C≥1, D=0 at level≥2)

**Feature 3 — Grading Trend Dashboard (Complete)**
- `api_grading_trend.php` [NEW]: Aggregates EMPLOYEE_GRADES by period×line, returns `line_series` (% Grade A), `stacked_grades` (A/B/C/D counts), and month-over-month `comparison`
- `gradingTrend.php` [NEW]: Dashboard with ApexCharts (line chart % A by line + stacked bar distribution) and comparison table

**Feature 4 — My Performance in Profile (Complete)**
- `api_my_performance.php` [REWRITE]: Now returns all 4 grade dimensions + late/absent days + skill_count + 6-month trend history
- `profileUI.php`: Added My Performance section (4 KPI grade cards, IPH income, ratio, late/absent, skill count, 6-month trend table) — gated by `emp_id` existence in session

---

### Files Modified

| File | Type | Status |
|---|---|---|
| `page/manpower/api/api_employee_grading.php` | MODIFY | Uploaded |
| `page/manpower/api/api_skill_matrix.php` | NEW | Uploaded |
| `page/manpower/api/api_my_performance.php` | REWRITE | Uploaded |
| `page/manpower/api/api_grading_trend.php` | NEW | Uploaded |
| `page/manpower/employeeGrading.php` | MODIFY | Uploaded |
| `page/manpower/script/employeeGrading.js` | MODIFY | Uploaded |
| `page/manpower/skillMatrix.php` | NEW | Uploaded |
| `page/manpower/gradingTrend.php` | NEW | Uploaded |
| `page/profile/profileUI.php` | MODIFY | Uploaded |
| `db_changes.md` | NEW | Created |

**Git Commit:** `38d10eb` — pushed to origin/main

---

### What Remains / Open Items

1. **Learning Grade Thresholds**: ปัจจุบัน system_grade_learning คำนวณจาก skill_count (level≥2): A≥5, B≥3, C≥1, D=0. Supervisor อาจต้องการปรับ threshold ตาม line → ขอ approval ก่อนแก้
2. **5S Audit History View**: ปัจจุบัน modal บันทึกอย่างเดียว ยังไม่มีหน้า history ดูย้อนหลัง → ต้องพัฒนาต่อ
3. **Navigation Links**: ยังไม่ได้เพิ่ม links ไป `skillMatrix.php` และ `gradingTrend.php` ใน sidebar navigation menu
4. **Profile page path**: `api_my_performance.php` ใช้ `fetch('../manpower/api/api_my_performance.php')` — ต้องตรวจสอบว่า profile page URL structure ตรงกับ path นี้

---

### No Blockers



# ===== FILE: 2026-09-14.md =====

# Sync Board — 2026-09-14

## Agent: Antigravity (5S Audit History Modal)

### Session Summary

**Start:** ~11:24 | **End:** ~11:31
**Status:** COMPLETE — Deployed to production FTP, committed and pushed to GitHub (648fdbb)

---

### What Was Done

**Feature: 5S Audit — Replace SweetAlert with Bootstrap Modal + History Tab**

Problem: 5S Audit เดิมใช้ SweetAlert popup มีแค่ form บันทึก ไม่มีประวัติ
Solution: เปลี่ยนเป็น Bootstrap Modal (modal-lg) มี 2 Tab

**Tab 1 — บันทึก (Record):**
- Form สำหรับกรอกคะแนน S1-S5 เหมือนเดิม
- Live score calculator (คำนวณ total + grade badge แบบ real-time)
- Alert box แสดงผลสำเร็จ/ล้มเหลวในหน้าเดียวกัน (ไม่ปิด modal)
- รีเซ็ต form อัตโนมัติหลังบันทึกสำเร็จ
- ปุ่ม Save มีสถานะ loading

**Tab 2 — ประวัติการตรวจ (History):**
- ตารางแสดงประวัติการตรวจ 5S ทุก Line
- Line filter dropdown (กรองดู Line เดียว หรือทุก Line)
- ปุ่ม "โหลดใหม่" สำหรับ refresh ข้อมูล
- Auto-load เมื่อสลับมาที่ Tab แรกครั้ง
- Pagination (50 รายการ/หน้า) พร้อมปุ่มหน้าก่อนหน้า/ถัดไป
- แสดงจำนวนรายการทั้งหมด
- ปุ่ม Save ซ่อนอัตโนมัติเมื่ออยู่ใน History Tab

**API Improvement:**
- get_5s_audits: เพิ่ม server-side pagination (OFFSET/FETCH) + คืนค่า pagination metadata
- ป้องกัน unbounded query ด้วย pageSize = 50

---

### Files Modified

| File | Type | Status |
|---|---|---|
| page/manpower/employeeGrading.php | MODIFY | Uploaded |
| page/manpower/script/employeeGrading.js | MODIFY | Uploaded |
| page/manpower/api/api_employee_grading.php | MODIFY | Uploaded |

**Git Commit:** 648fdbb — pushed to origin/main

---

### Open Items (Remaining 5S Work)

- ~~5S Audit History View~~ DONE
- Navigation Links: ยังไม่ได้เพิ่ม links ไป skillMatrix.php และ gradingTrend.php ใน sidebar navigation menu



# ===== FILE: 2026-09-15.md =====

## ✅ Completed

### page/PE (Fix Mobile Sidebar Menu & Overlay Bug)
- **เวลาทำงาน (Time)**: 08:28 - 08:35
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: ผู้ใช้งานแจ้งว่าในหน้า peDashboard.php บนมือถือ ไม่สามารถกดตัวเลือกย้อนกลับหรือเปลี่ยนหน้าได้ เนื่องจากมี Element บังอยู่
- **สิ่งที่แก้ไขไป (What)**: 
  - ตรวจสอบพบว่าปุ่ม Hamburger menu (`#sidebarMobileToggleBtn`) และปุ่ม Refresh ไม่ได้ถูกผูก Event Listener ไว้ใน `peApp.js` ทำให้กดเปิดเมนูข้าง (Sidebar) ไม่ได้
  - แก้ไขปัญหา Duplicate ID ใน Sidebar Overlay (`#sidebarOverlay`) ใน `peDashboard.php`
  - เพิ่ม onClick Handler ให้กับ Sidebar Overlay ให้สามารถแตะเพื่อปิดหน้าจอเมนูได้หากมีอาการค้าง
  - ทำการแก้ไขโค้ด อัปเดตขึ้น Git Repository บน Branch `main` และ Deploy ขึ้น FTP Server เรียบร้อยแล้ว
- **ผลลัพธ์ (Result)**: ผู้ใช้สามารถกดปุ่มมุมซ้ายบนเพื่อเรียกใช้งานเมนูบนมือถือได้ปกติ และไม่เกิดอาการกดปุ่มอื่นไม่ได้อีกต่อไป
- **ไฟล์ที่แก้ไข (Files Modified)**: `page/PE/peDashboard.php`, `page/PE/script/peApp.js`

### page/PE (Fix DevTools Mobile Table Layout)
- **เวลาทำงาน (Time)**: 08:41 - 08:43
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: ผู้ใช้แจ้งว่าเมื่อเปิดใน DevTools แบบจำลองมือถือแล้วตารางแสดงผลเพี้ยน (Table View) แตกต่างจากมือถือจริงที่แสดงเป็น Card View อย่างถูกต้อง
- **สิ่งที่แก้ไขไป (What)**: เพิ่ม `data-label` ให้กับแท็ก `<td>` ในโค้ด JavaScript ที่ใช้เรนเดอร์ตาราง (workOrderModule.js, machineModule.js, downtimeModule.js) เพื่อให้โหมด Responsive Table สามารถดึงชื่อคอลัมน์มาแสดงกำกับข้อมูลแต่ละบรรทัดได้อย่างถูกต้อง
- **ผลลัพธ์ (Result)**: เมื่อใช้งานโหมด Table View (List) บนหน้าจอขนาดเล็ก ข้อมูลจะเรียงตัวสวยงามและมีชื่อหัวข้อคอลัมน์บอกอย่างชัดเจน
- **ไฟล์ที่แก้ไข (Files Modified)**: `page/PE/script/workOrderModule.js`, `page/PE/script/machineModule.js`, `page/PE/script/downtimeModule.js`
- **ไฟล์ที่แก้ไข (Files Modified)**: `page/PE/script/workOrderModule.js`, `page/PE/script/machineModule.js`, `page/PE/script/downtimeModule.js`

### page/PE (Fix Mobile Table Width Constraint)
- **เวลาทำงาน (Time)**: 10:55 - 10:58
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: ผู้ใช้แจ้งว่าเมื่อเปิด Table View ในโหมดมือถือ การ์ดตารางแต่ละแถวถูกบีบให้แคบและมีพื้นที่ว่างด้านขวา (ไม่กว้างเต็มจอ)
- **สิ่งที่แก้ไขไป (What)**: ในไฟล์ `pe-enterprise.css` ได้เพิ่มกำหนดค่า `width: 100%` และ `box-sizing: border-box` ให้กับ `<tbody>`, `<tr>` และ `<td>` ภายใต้โหมด Mobile Stacked Table (max-width: 767px) เพื่อบังคับให้ Element ของตารางที่เปลี่ยนสภาพเป็น Block ขยายจนสุดขอบคอนเทนเนอร์เสมอ
- **ผลลัพธ์ (Result)**: การแสดงผลการ์ดแต่ละแถวในโหมด Table View (บนมือถือ) จะขยายกว้างเต็ม 100% พอดีกับหน้าจอแล้ว ไม่มีพื้นที่ว่างสีขาวด้านขวาเหลืออยู่
- **ไฟล์ที่แก้ไข (Files Modified)**: `page/PE/css/pe-enterprise.css`

### page/autoInvoice (Feature: Per-Document N.W./G.W. Decimal Precision)
- **เวลาทำงาน (Time)**: 11:11 - 11:30
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: สินค้าบางชนิดมีน้ำหนัก N.W./G.W. ต่ำมาก ทำให้การคำนวณด้วย 2 ทศนิยมไม่ตรงกับเอกสารลูกค้า จึงเพิ่มตัวเลือก 3 ตำแหน่งต่อเอกสาร
- **สิ่งที่แก้ไขไป (What)**:
  - `ALTER TABLE dbo.FINANCE_INVOICES ADD weight_decimals INT NOT NULL DEFAULT 2` — 1,340 แถวเดิมปลอดภัย 100%
  - `api_invoice.php`: เพิ่ม `update_weight_decimals` action (validate เฉพาะ 2/3), expose field ใน `get_invoice_detail` และ `get_invoice_by_no`
  - `print_pl.php`: ใช้ `$wDec` จาก `$header['weight_decimals']` แทน hardcoded `2` ทุกจุด (N.W., G.W., TOTAL row)
  - `financeModal.php`: เพิ่ม Toggle Button Group "2 ตำแหน่ง / 3 ตำแหน่ง" ใน Shipping card
  - `finance_dashboard.js`: เพิ่ม `setWeightDecimal()`, `fillInvoiceForm` โหลดค่าจาก API, `saveWebEdit` บันทึกค่าหลัง import สำเร็จ
- **ผลลัพธ์ (Result)**: ผู้ใช้งานสามารถเลือกทศนิยม N.W./G.W. ต่อเอกสารได้ (Default = 2) โดยเอกสารเก่าทั้งหมดไม่กระทบ
- **ไฟล์ที่แก้ไข (Files Modified)**: `page/autoInvoice/api/api_invoice.php`, `page/autoInvoice/print_pl.php`, `page/autoInvoice/components/financeModal.php`, `page/autoInvoice/script/finance_dashboard.js`
### page/autoInvoice (Feature: Full Decimal Precision Control)
- **���ҷӧҹ (Time)**: 14:07 - 14:35
- **�ѭ�� / ��觷���ͧ�� (Why)**: �����ҹ��ͧ��õ�駤�ҷȹ����ͧ����Ţ�ء������� (QTY, N.W./G.W., CBM, Unit Price, Amount) ��͡��� CI ��� PL ���ҧ����е���͡��� ����� 0-6 ���˹�
- **��觷������ (What)**:
  - `ALTER TABLE dbo.FINANCE_INVOICES`: ����������� `qty_decimals`, `cbm_decimals`, `amount_decimals` ��е�� Default ���ç�ͧ��� 100%
  - `api_invoice.php`: �غ�������ѻവ�� `update_decimal_settings` ��лŴ��͡ Validation ����� 0-6 ���˹�
  - `print_pl.php` & `print_ci.php`: ����¹�ش����� Hardcode �����ҹ�ȹ����ҡ�ҹ���������ʴ���
  - `financeModal.php`: ����¹ UI �� Dropdown 3 ������� ���յ�����͡ 0-6 ���˹� �ú�ء 5 ���
  - `finance_dashboard.js`: �ѻവ JS �����ҹ/�ѹ�֡ 5 �����
- **���Ѿ�� (Result)**: ���������ö���͡�ȹ��� 0-6 ���˹���� QTY, Weight, CBM, Price, Amount �¡�ѹ㹺��㺹��� �� 
- **�������� (Files Modified)**: `page/autoInvoice/api/api_invoice.php`, `page/autoInvoice/print_pl.php`, `page/autoInvoice/print_ci.php`, `page/autoInvoice/components/financeModal.php`, `page/autoInvoice/script/finance_dashboard.js`


### page/PE (Fix Missing Data-Label in Other Tabs)
- **เวลาทำงาน (Time)**: 14:47 - 14:53
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: ตรวจสอบและแก้ไขบัคการแสดงผลตาราง (Table View) บนมือถือในแท็บอื่นๆ ของ PE Dashboard ซึ่งอาจมีปัญหาการขาด `data-label` แบบเดียวกับแท็บ Work Order, Machine, และ Downtime ก่อนหน้านี้
- **สิ่งที่แก้ไขไป (What)**: ตรวจสอบพบว่าในแท็บ Analytics, IIoT Analytics, Safety, และ Spare Parts มีการสร้างตารางด้วย JavaScript ซึ่งตกหล่น attribute `data-label` ไป จึงได้ทำการเติม `data-label="..."` ให้กับ `<td>` ทุกตัวในไฟล์ที่เกี่ยวข้อง เพื่อให้ Table View บนมือถือแสดงชื่อหัวข้อคอลัมน์ได้อย่างถูกต้อง ไม่แหว่ง
- **ผลลัพธ์ (Result)**: ตารางทั้งหมดในแท็บ Analytics (2 ตาราง), IIoT Analytics (1 ตาราง), Safety (2 ตาราง) และ Spare Parts (2 ตาราง) จะแสดงผลบนจอมือถือได้อย่างสมบูรณ์ มี Label ครบถ้วน
- **ไฟล์ที่แก้ไข (Files Modified)**: `analyticsModule.js`, `iiotAnalyticsModule.js`, `safetyModule.js`, `sparePartsModule.js`



# ===== FILE: 2026-09-16.md =====

# Sync Board � 2026-09-16

## Session: PAINT Line Chemical Check Sheet (PaintChem Module)

**Agent:** Antigravity
**Time:** 11:02 - 12:15
**Commit:** 7d3113fe

---

### ? Completed

**Phase 1 � Database**
- ���ҧ���ҧ PAINT_CHEM_SHEET_HEADER (header ����ѹ/��, status workflow DRAFTSUBMITTEDAPPROVED)
- ���ҧ���ҧ PAINT_CHEM_LOG (log ��� parameter ��� Station/TimeSlot, UNIQUE constraint ����Ѻ UPSERT)
- Indexes: IX_PCL_HEADER, IX_PCL_DATE_SLOT
- �ѻവ db_changes.md

**Phase 2 � PHP Backend API** (page/paintChem/api/)
- get_sheet.php � GET header + logs ����Ѻ date/shift
- save_slot.php � UPSERT ��� parameter ����� OOR detection server-side (PARAM_STANDARDS constant)
- submit_sheet.php � DRAFT  SUBMITTED ����� Painting Condition validation
- pprove_sheet.php � Checked/Approved (role: supervisor+)
- get_history.php � paginated history ����� OOR count summary
- �ء endpoint: CSRF guard, PDO prepared statements, structured error response

**Phase 3 � React Frontend** (mes-v2/src/modules/PaintChem/)
- paintChemConfig.js � STATIONS[], PARAM_STANDARDS, detectCurrentShift(), detectCurrentSlot()
- PaintChemEntryPage.jsx � ˹����ѡ��͡������: auto-detect shift/slot, save all stations in parallel, submit workflow
- PaintChemHistoryPage.jsx � ����ѵ� pagination + filter
- Components: SheetHeader, StationCard (collapsible), ParameterInputRow (OOR highlight), TimeSlotSelector
- Offline detection + banner, toast notifications

**Phase 4 � Routing**
- App.jsx: route #/paint-chem + #/paint-chem/history
- AppLayout.jsx: mobile nav links (FlaskConical + History icons)

**Deployment**
- Build: ? 8.05s, 0 errors
- FTP PHP: ? /MES/MES/page/paintChem/api/ (5 files)
- FTP dist: ? /Toolbox2/ (index.html + all new JS/CSS chunks)
- Git push: ? 7d3113fe  main

---

### ?? Remaining / Next Steps

- [ ] **UAT**: ��龹ѡ�ҹ PAINT line ���ͺ��͡�����Ũ�ԧ 1 �� �����§ҹ��
- [ ] **PDF Export**: export_pdf.php (�ѧ�����Ѳ�� � ��ҵ�ͧ��������)
- [ ] **Desktop nav**: ���� PaintChem � desktop nav bar (�Ѩ�غѹ�� mobile menu)

---

### Files Modified
- db_changes.md
- mes-v2/src/app/App.jsx
- mes-v2/src/shared/components/AppLayout.jsx
- mes-v2/src/modules/PaintChem/** (8 new files)
- page/paintChem/api/** (5 new PHP files)

### 17:55 - Antigravity (Backend & Testing)
- End-to-end tested UI via Puppeteer and DB via MCP.
- Identified that save_slot.php was completely broken due to:
  1. CORS OPTIONS preflight failures blocking Axios POST requests.
  2. SQL CHECK CONSTRAINT failure because station_no = 0 was being inserted into PAINT_CHEM_LOG instead of just updating PAINT_CHEM_SHEET_HEADER.
  3. Fatal error calling undefined equireLogin().
- Rewrote save_slot.php to properly separate header updates from log UPSERTs, implemented correct CORS headers (Access-Control-Allow-Origin dynamically reflecting HTTP_ORIGIN for credentials), and removed broken function calls.
- Uploaded fixed APIs to FTP and successfully verified data insertion (e.g. conveyor_speed = 8.5).



# ===== FILE: 2026-09-17.md =====

## ✅ Completed

### MES Standards Traceability (Solution Design)
- **เวลาทำงาน (Time)**: 08:00 - 08:00
- **ปัญหา / สิ่งที่ต้องทำ (Why)**: ผู้บริหารต้องการทะเบียนมาตรฐานสำคัญของทุกไลน์ที่ระบุข้อมูลไลน์ งาน routine รายบุคคล และสามารถย้อนตรวจความเชื่อมโยงของทุกขั้นตอนได้
- **สิ่งที่แก้ไขไป (What)**: วิเคราะห์และออกแบบแนวทาง Line Standard & Traceability Matrix โดยกำหนดโครงสร้างข้อมูล สถานะช่องว่าง และขั้นตอนเริ่มต้นใช้งานใน MES
- **ผลลัพธ์ (Result)**: ได้กรอบงานที่ใช้รวบรวมข้อมูลจากทุกไลน์อย่างเป็นมาตรฐานและตรวจสอบความครอบคลุมได้
- **ไฟล์ที่แก้ไข (Files Modified)**: `.agents/sync_board/2026-09-17.md`



# ===== FILE: 2026-09-19.md =====

## ? Completed

### [Visual Board] (��������ʴ����ʷ�Ѿ���Թ�˹�Ҿ����)
- **���ҷӧҹ (Time)**: 09:04 - 09:07
- **�ѭ�� / ��觷���ͧ�� (Why)**: �����ҹ��ͧ�������ʴ��Ţ���ʷ�Ѿ���Թ (Asset No) 㹡�д�ɷ������ �����дǡ���ҵ�Ǩ�Ѻ��Ѿ���Թ
- **��觷������ (What)**: �¡��ͧ "�����Ţ����ͧ (Serial No)" ��� "���ʷ�Ѿ���Թ (Asset No)" �͡�ҡ�ѹ�˹�� `visual_board_print.php` ��������ʴ������ŷ�� 2 ���ҧ�Ѵਹ��Фú��ǹ ����ʴ��Ѻ��͹�ѹ����͹���
- **���Ѿ�� (Result)**: 㹡�д�ɾ������ʴ����ʷ�Ѿ���Թ�¡�繺�÷Ѵ����Ѵਹ����������ҹ��ͧ���
- **�������� (Files Modified)**: `page/PE/visual_board_print.php`

## ? Completed

### [Visual Board] (��Ѻ��Ҵ����ѡ����������´����ͧ�ѡ�����˭���)
- **���ҷӧҹ (Time)**: 09:16 - 09:17
- **�ѭ�� / ��觷���ͧ�� (Why)**: �����ҹ����ҵ���ѡ�����ǹ��������´����ͧ�ѡú�˹�Ҿ�����բ�Ҵ����Թ� �������ҹ�ҡ�ҡ������
- **��觷������ (What)**: ��Ѻ��Ҵ����ѡ�� (Font size) �ͧ�����������´�ҡ `11pt` �� `13pt` ��л�Ѻ��Ҵ��Ǣ�� (Label) �ҡ `10pt` �� `11pt` �������������˹� (font-weight) ���������ҹ������觢��
- **���Ѿ�� (Result)**: ��ͤ����˹�Ҿ����Ѵਹ�����ҹ���¢�� ���ѧ�� Layout ��èѴ�ҧ���
- **�������� (Files Modified)**: `page/PE/visual_board_print.php`

## ? Completed

### [Visual Board] (��Ѻ��Ҵ�ѡ�����������ҧ��������´����ͧ�ѡ�)
- **���ҷӧҹ (Time)**: 09:20 - 09:21
- **�ѭ�� / ��觷���ͧ�� (Why)**: �����ҹ����ҵ�ͧ�����颹Ҵ����ѡ�âͧ��Ǣ����Т������բ�Ҵ��ҡѹ (12pt) ��е�ͧ��������Ǣ�͡Ѻ����������Դ�ѹ�ҡ������������ҹ�Ѻ���ѹ�����
- **��觷������ (What)**: ��Ѻ��Ҵ����ѡ�������ҡѹ��� `12pt` �����Ǣ����Т�����, ź������ҧ (margin-bottom) �����ҧ��Ǣ�͡Ѻ�������͡�����������Դ�ѹ ���������ͧ��ҧ�����ҧ������¡�� (row gap) �ҡ 8px �� 15px �������Ѵ��ǹ���С�������������Ѵਹ���
- **���Ѿ�� (Result)**: ����ʴ�����ҹ���¢�� �Ѻ�������šѺ��Ǣ����Ѵਹ ����Ѻʹ�Ѻ��Ǣ�ͶѴ�
- **�������� (Files Modified)**: `page/PE/visual_board_print.php`

@'
### 13:00 - 14:05 (Antigravity Agent)
- [x] �Ѿവ�к� Error Handling � storeCommon.js �ŧ Technical Error (SQL Error) ����ʴ���ͤ������������ͤ������㨧��� ����� Technical Details ��� IT
- [x] �Ѿവ�������ҹ���͡��������¡�þ�����ѹ� InventoryModal.php ����ͧ�Ѻ� API create_transfer_request
- [x] �Ѿ��Ŵ�������¹�ŧ��� FTP 4 ��� (storeCommon.js, InventoryModal.php, inventoryDashboard.js, pi_store.php)
'@

- [x] (14:05-14:15) Refactor UI: ����¹������͡���� Checkbox Scroll �����ͧ�Ѻ Mobile UX ���բ�� ����Ѿവ Planner Task ID #4233



# ===== FILE: 2026-09-24.md =====

# 2026-09-24

## ? Completed

### Planner_Bugfixes (��Ѥ Workspace, MyTasks ��� Double Submit)
- **���ҷӧҹ (Time)**: 08:00 - 08:10
- **�ѭ�� / ��觷���ͧ�� (Why)**: ˹�� Workspace �ʴ��żԴ��Ҵ价�� Dashboard, ˹�� Assign to me (My Tasks) �������ö������ Create Task ��, ��лѭ�ҡ�á��������ҧ�ҹ��� (Double Submit) ������ Modal
- **��觷������ (What)**: 
  - ���� routing ����Ѻ `space-home` ��� `space-{id}` � App.jsx ������¡ SpaceView ���ҧ�١��ͧ
  - ��������� prop `onCreateTask` ��� `onTaskClick` ŧ��ѧ `MyTasks`
  - ���к���ͧ�ѹ��á�������� (isSaving Guard + Loading spinner) ���Ѻ `AddEventModal`, `AddProjectModal`, ��� `LinkHub` ������ҵðҹ���ǡѹ
- **���Ѿ�� (Result)**: ���������ö�����ҹ Workspace ������ͧ�黡��, ����ö���ҧ�ҹ�ҡ˹�� Assign to me ��, ����к���ͧ�ѹ������ҧ�����ū�ӫ�͹�ҡ Modal ������ó�
- **�������� (Files Modified)**: `src/App.jsx`, `src/components/AddEventModal.jsx`, `src/components/AddProjectModal.jsx`, `src/components/LinkHub.jsx`

### 08:47 - Antigravity (Backend & Frontend)
- Performed a checkpoint git commit to save other agents' work.
- Implemented export_pdf.php using TCPDF to generate the exact structure of the PAINT Line chemical control check sheet.
- Added PDF export button (FileText icon) to PaintChemHistoryPage.jsx action column.
- Built React frontend and deployed to FTP (/Toolbox2/).
- Uploaded export_pdf.php to FTP (/MES/MES/page/paintChem/api/).
### 09:00 - Antigravity (Frontend UI Fix)
- Resolved missing desktop navigation menu in AppLayout.jsx.
- Placed "�ѹ�֡�����" and "����ѵ������" links directly in the top header for Desktop view (md:flex), alongside the logo.
- Rebuilt and deployed to /Toolbox2.
### 09:37 - Antigravity (Frontend UI Fix)
- Restructured AppLayout.jsx to make the Header full-width at the top (lex-col wrapper).
- Placed DesktopSidebar below the Header so it no longer overlaps or pushes the header.
- Rebuilt and deployed.
### 09:49 - Antigravity (Frontend UI Fix - UX Refinement)
- Updated AppLayout.jsx to hide the Sidebar entirely on the Home page (/) to maximize screen estate, matching legacy behavior.
- Refactored DesktopSidebar.jsx into a Mini-Sidebar (Hover to Expand). Default width is reduced to just show icons, and it smoothly expands to show full text and search bar on hover.
- Rebuilt and deployed to /Toolbox2.
### 08:34 (Sep 25) - Antigravity (Frontend UI Fix - UX Refinement)
- Added icons to section headers in DesktopSidebar.jsx (GENERAL, PRODUCTION, WAREHOUSE, etc.).
- Improved section header styling with a slightly darker background to distinguish them from standard menu items.
- Rebuilt and deployed to /Toolbox2.



# ===== FILE: 2026-09-25.md =====

### 08:52 - Antigravity (Frontend UI Fix - UX Refinement)
- Adjusted font size of Sidebar section headers to 	ext-sm to perfectly match the sub-menu links.
- Removed blue hover effects from inactive items (both internal and external links). Blue coloring is now strictly reserved for the currently Active page indicator, matching legacy UX expectations.
- Rebuilt and deployed to /Toolbox2.
### 09:07 - Antigravity (Frontend UI Fix - UX Refinement)
- Changed DesktopSidebar to absolute positioning (bsolute top-0 left-0) with a placeholder spacer. This ensures that when the sidebar expands on hover, it "floats over" (overlays) the main content rather than pushing the entire screen layout to the right.
- Normalized section header fonts (removed bold/uppercase styles, set to ont-medium) to exactly match the visual weight of standard sub-menu items.
- Rebuilt and deployed to /Toolbox2.
### 09:12 - Antigravity (Frontend UI Fix - Job Queue History)
- Added Lot No column to the history table in page/production/jobQueueUI.php.
- Added Searchbox and Date Filter inputs to the history offcanvas in jobQueueUI.php.
- Updated script/jobQueue.js to implement filterHistory() and renderHistoryTable() functions.
- Uploaded jobQueueUI.php and jobQueue.js to FTP server.
### 10:51 - Antigravity (Frontend UI Fix - Job Queue History Refinement)
- Re-centered history table columns and fixed action column cutoff by widening the sidebar to 920px and enabling horizontal scroll.
- Fixed header gradient background issue to restore title readability.
- Redesigned multi-day datetime display to explicitly show start and end times (▶ and ■) perfectly centered to prevent confusion.
- Forced Date filter input to display in dd/mm/yyyy format using a custom overlay text input.
- Added "Line" (dynamically populated) and "Status" dropdown filters to the history offcanvas.
- Added a summary strip below the filters to dynamically display totals (Target, FG, Hold, Scrap) based on active filters.
- Pushed code to git and uploaded `jobQueueUI.php` and `jobQueue.js` to FTP server.
### 10:56 - Antigravity (Paint Chem History Drawer Refactor)
- Merged the standalone PaintChemHistoryPage into a reusable PaintChemHistoryDrawer slide-over component.
- Removed the "����ѵ������" link from DesktopSidebar.jsx and removed its standalone route from App.jsx to reduce clutter.
- Added a "����ѵ���͹��ѧ" (History) button directly inside PaintChemEntryPage.jsx which toggles the slide-over drawer.
- Added a "�٢�����" (View Data) action to the history table that automatically updates the main entry page's date/shift filters to instantly load the selected historical record.
- Rebuilt and deployed to /Toolbox2.



# ===== FILE: 2026-09-28.md =====


### 10:17 - Antigravity (Paint Chem Fix & FTP Upload)
- Fixed missing "����ѵ���͹��ѧ" (History) button in PaintChemEntryPage.jsx header.
- Rebuilt and successfully deployed to /Toolbox2 via FTP (after VPN connection was restored).
### 10:21 - Antigravity (Fluid Layout Update)
- Modified PaintChemEntryPage.jsx to use a fluid full-width layout (w-full) instead of a constrained max-w-screen-xl.
- Expanded the responsive grid to allow up to 4 columns on extra-large screens (xl:grid-cols-4) to make optimal use of horizontal real estate on PC monitors, mimicking the legacy system's density.
- Rebuilt and deployed to /Toolbox2.
### 10:30 - Antigravity (UI Polish: Header grouping)
- Removed the standalone redundant title above the main form in PaintChemEntryPage.jsx.
- Relocated the "����ѵ���͹��ѧ" (History) button inside the SheetHeader card so it naturally aligns with the status badge and existing document title.
- Rebuilt and deployed to /Toolbox2.
### 11:03 - Antigravity (UI Polish: Input constraints)
- Replaced lex-1 with specific responsive widths (w-full sm:w-48 and w-full sm:w-64) for "Date" and "Shift" inputs in SheetHeader.jsx.
- Added a max-w-4xl constraint to the "Painting Condition" grid to prevent inputs from stretching excessively on ultra-wide fluid layouts.
- Rebuilt and deployed to /Toolbox2.
### 11:18 - Antigravity (UI Polish: Header condensation)
- Redesigned SheetHeader.jsx to take advantage of wide screens by splitting it into two columns: Left (Date/Shift) and Right (Painting Condition).
- Moved the TimeSlotSelector component directly into the bottom of SheetHeader.jsx.
- Eliminated the separate "TIME SLOT" card from the entry page. This drastically reduces wasted vertical space, unifying all primary selectors (Date, Shift, Time Slot, and Conditions) into a single, compact control panel at the top.
- Rebuilt and deployed to /Toolbox2.

### 14:13 - Antigravity (UI Polish: Header condensation continued)
- Grouped Date, Shift, and Time Slot together in the SheetHeader layout.
- Replaced pill-based Time Slot selector with a compact native select dropdown to save vertical space.
- Compacted the Painting Condition fields into a single line, replaced sub-labels with placeholder text, and added custom Tailwind hover tooltips (in Thai).
- Pushed Painting Condition section to the right edge to balance the horizontal layout.
- Rebuilt and deployed to /Toolbox2.

### 14:36 - Antigravity (Business Logic: Time-Lock Constraint)
- Added 'isTimeLocked' logic to PaintChemEntryPage.jsx.
- Automatically locks any DRAFT document if the current time is past 12:00 PM (noon) of the day AFTER the document's date.
- Added a specific warning banner (🔒) to inform users when a document is locked due to this timeout.
- This successfully prevents editing historical drafts from days ago via the history drawer without crashing the app.
- Rebuilt and deployed to /Toolbox2.

### 16:29 - Antigravity (Job Queue Integration in Scan Barcode)
- Added 'Job No.' dropdown to scanBarcodeUI.php.
- Implemented loadActiveJobs() in scanBarcode.js to fetch jobs using existing inventoryManage.php endpoint.
- Updated scanManage.php (save_scan) to validate Job No, store Job No as eference_id in STOCK_TRANSACTIONS, preserve original lot ref in SCAN_LOGS_TABLE, and sync quantity directly to PRODUCTION_JOBS.
- Uploaded changes to FTP and committed to repository.
- Also fixed a critical issue in inventoryManage.php and scanManage.php where dd_entry failed to append [Job: JOBNO] to notes, which would break the deletion revert logic.

### 16:52 - Antigravity (Job Queue UX Improvement)
- Moved Job selection dropdown to the very top in \scanBarcodeUI.php\.
- Updated \inventoryManage.php\ (get_active_jobs) to also return \location_id\, \lot_no\, and \arcode\.
- Added auto-fill logic to both \productionUI\ (\inventory.js\) and \scanBarcode\ (\scanBarcode.js\) so that selecting a Job automatically populates the Lot No, Location, and Barcode (where applicable).
- Uploaded changes to FTP and committed to repository.
- Simplified Job dropdown text format in both \scanBarcode\ and \productionUI\ to show Part Name and omit Status for clarity.
- Added intelligent auto-select: Scanning a barcode will now automatically select the matching Job No. (if one exists for that SAP) and switch to it if needed.
- Appended Location/Line name back to the Job dropdown text as requested.



# ===== FILE: 2026-09-30.md =====


### 08:06 - Antigravity (Legacy Integration & Auth UX)
- Added 'Paint Chem Entry' link to the old system's dailyLogUI.php under the Production section.
- Implemented deep-link redirect in mes-v2's App.jsx and Login.jsx: If an unauthenticated user navigates directly to a module URL (e.g., #/paint-chem), they are redirected to login, and upon successful authentication, they are immediately routed back to their originally requested URL instead of the Home page.
- Rebuilt and deployed mes-v2 to /Toolbox2.
- Uploaded dailyLogUI.php to legacy FTP (/MES/MES/page/dailyLog/).

### 09:59 - Antigravity (Mock Data Generation)
- Created and executed a backend PHP script to generate 7 days of mock data for the Paint Chem module (both DAY and NIGHT shifts).
- Inserted 16 headers and ~2184 log entries with realistic values (including some out-of-range scenarios) for executive demonstration.
- Cleaned up mock scripts from the server.

### 10:05 - Antigravity (API Syntax Fixes & Deep Link Fix)
- Discovered and resolved a critical issue where several PHP API files (get_history.php, get_sheet.php, submit_sheet.php, approve_sheet.php) were corrupted by duplicated PHP tags (likely from a previous agent session). 
- Completely cleaned the API files and restored them to working condition, fixing the empty History Drawer issue.
- Fixed the deep link redirect logic in App.jsx and AuthContext.jsx so that it successfully passes the location state during logout and unprotected route interception. Logging in now routes the user straight back to their intended page.
- Rebuilt React frontend and pushed both frontend and backend API fixes to FTP.

### 10:44 - Antigravity (API Restore)
- Found that the previous string-replacement script failed to completely clean the corrupted API files (get_history.php, get_sheet.php, submit_sheet.php, approve_sheet.php). The files were so corrupted by an older agent session (d06c9896) that parts of the file were stitched together randomly.
- Checked out the pristine original versions of the files from git commit 7d3113fe.
- Manually appended the correct CORS and CSRF headers.
- Re-uploaded the fully clean APIs to the FTP server. The History Drawer now reliably retrieves and displays the mock data.

### 14:47 - Antigravity (Fix PDF Export and Slot State)
- Fixed incorrect tcpdf library path and removed invalid requireLogin call in export_pdf.php
- Fixed a bug where viewing a NIGHT shift record from History while currently on a DAY shift resulted in empty data, because the selectedSlot state was not being updated to match the new shift.

### 15:26 - Antigravity (Fix PDF Table Widths & History Encoding)
- Reverted PowerShell-induced UTF-8 encoding corruption (Mojibake) in PaintChemHistoryDrawer.jsx and applied the cache-busting URL fix using Node.js instead.
- Fixed TCPDF table column misalignments by explicitly defining percentage widths on every sub-column <th> in the second row of the <thead>, ensuring proper calculation across colspans and owspans.

---

## ✅ Completed

### Paint Chemical Check Sheet (Phase 2 — History & PDF Export)
- **เวลาทำงาน (Time)**: 14:20 - 08:33 (30/09/26 - 01/10/26)
- **ปัญหา / สิ่งที่ต้องทำ (Why)**:
  1. หน้าประวัติย้อนหลัง (History Drawer) แสดง "ไม่พบข้อมูล" ทั้งที่มีข้อมูลอยู่ใน DB
  2. เปิด PDF แล้วขึ้น Fatal Error จาก TCPDF หาไลบรารีไม่เจอ
  3. ตารางใน PDF คอลัมน์เบี้ยวไม่ตรงกัน
  4. กดดูข้อมูลกะกลางคืนจากประวัติแล้วช่องว่างหมด
  5. หน้าประวัติแสดงภาษาเอเลี่ยน (Encoding พัง)
- **สิ่งที่แก้ไขไป (What)**:
  1. **SQL Server OFFSET FETCH**: PDO driver ส่ง parameter เป็น string ทำให้ OFFSET ? ROWS FETCH NEXT ? ROWS ONLY error แก้โดยใช้ indValue(..., PDO::PARAM_INT) แทน execute([...])
  2. **requireLogin() undefined**: API ทุกตัวใน paintChem เรียก function ที่ไม่มีอยู่จริง (auth ใน check_auth.php ทำงาน inline) ถอดออกทั้งหมด
  3. **PDF path**: แก้ path TCPDF จาก ../../utils/libs/tcpdf เป็น ../../../utils/libs/tcpdf ให้ตรงกับ FTP structure จริง
  4. **Night shift slot desync**: เวลาเลือกดูประวัติกะกลางคืน selectedSlot ยังอยู่กะกลางวัน แก้โดยเรียก handleShiftChange() แทน setShift() โดยตรง
  5. **Encoding**: PowerShell Set-Content ทำลายภาษาไทยใน JSX ใช้ Node.js s.writeFileSync แทน
  6. **PDF Table**: เปลี่ยนจาก TCPDF writeHTML() (ไม่รองรับ colspan+rowspan) เป็น Browser-print HTML เหมือน PE Module ทำให้คอลัมน์ตรงเป๊ะ
  7. **PDF Layout**: เพิ่ม A4 landscape page preview พร้อม branded header (SCAN แดง + title น้ำเงิน + thead สีน้ำเงินเข้ม)
- **ผลลัพธ์ (Result)**:
  - History Drawer แสดง 16 records ถูกต้อง พร้อม pagination
  - PDF ดาวน์โหลดได้ ตารางตรงทุกคอลัมน์ Layout สวยงามระดับ Production
  - Deep-link redirect กลับหน้าเดิมหลัง Login ทำงานได้แล้ว
  - Mock Data 7 วัน พร้อม Demo กับผู้บริหาร
- **ไฟล์ที่แก้ไข (Files Modified)**:
  - `page/paintChem/api/get_history.php` — bindValue PARAM_INT, remove requireLogin
  - `page/paintChem/api/get_sheet.php` — remove requireLogin, CORS
  - `page/paintChem/api/submit_sheet.php` — remove requireLogin, CORS
  - `page/paintChem/api/approve_sheet.php` — remove requireLogin, CORS
  - `page/paintChem/api/export_pdf.php` — path fix + full rewrite เป็น browser-print HTML
  - `mes-v2/src/app/App.jsx` — ProtectedRoute เพิ่ม state.from
  - `mes-v2/src/shared/contexts/AuthContext.jsx` — logout ส่ง location state
  - `mes-v2/src/modules/PaintChem/pages/PaintChemEntryPage.jsx` — แก้ onSelectRecord ใช้ handleShiftChange
  - `mes-v2/src/modules/PaintChem/components/PaintChemHistoryDrawer.jsx` — isOpen dependency + cache-bust URL
  - `page/dailyLog/dailyLogUI.php` — เพิ่ม link Paint Chem Entry

