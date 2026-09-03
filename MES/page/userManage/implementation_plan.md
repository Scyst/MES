# แผนพัฒนา: User Profile & Self-Service System

ระบบบริหารจัดการข้อมูลส่วนตัวของผู้ใช้งาน รองรับการอัปโหลดรูปโปรไฟล์, เปลี่ยนรหัสผ่านด้วยตนเอง, และเป็นฐานข้อมูลสำหรับ Feature ในอนาคต

---

## บริบทปัจจุบัน (As-Is)

**`USERS` table** มีคอลัมน์: `id`, `username`, `password`, `role`, `created_at`, `line`, `emp_id`, `is_auto_generated`, `is_active`, `fullname`, `team_group`, `aka`

**ข้อสังเกต:**
- ยังไม่มีคอลัมน์สำหรับ `profile_picture`, `phone`, `last_login`, `password_changed_at`, `theme`, `language` ฯลฯ
- `top_header.php` แสดงแค่ Font Awesome icon (`fas fa-user-circle`) แทนรูปโปรไฟล์จริง
- ไม่มี endpoint สำหรับ self-service (ผู้ใช้แก้ข้อมูลตัวเองไม่ได้เลย)
- `MANPOWER_EMPLOYEES` เก็บข้อมูล HR (`position`, `department_api`, `start_date`) แยกต่างหาก

---

## User Review Required

> [!IMPORTANT]
> **Storage Strategy สำหรับรูปโปรไฟล์:** มี 2 ทางเลือก โปรดพิจารณาและเลือก
>
> **Option A — FTP File Storage** (แนะนำ): เก็บรูปจริงบน FTP server ที่ `/uploads/profile_pictures/<user_id>.webp` แล้วเก็บแค่ path string ใน DB → ขนาด DB เล็ก, ดู/แก้ไขง่าย
>
> **Option B — DB Binary (VARBINARY)**: เก็บไฟล์ใน `USERS` table โดยตรง → ไม่ต้องจัดการ FTP, แต่ DB จะหนักขึ้นเร็วมาก (แนะนำเฉพาะถ้าไม่มี FTP หรือผู้ใช้น้อยมาก)

> [!IMPORTANT]
> **โครงสร้างหน้า Profile:** ควรเป็น Modal ใน Dropdown ของ `top_header.php` หรือเป็น **หน้าใหม่** (`/page/profile/profileUI.php`) กันแน่?
>
> ถ้าเป็น Modal: เหมาะกับการแก้ข้อมูลน้อยๆ, ใช้ง่าย แต่จำกัดพื้นที่
> ถ้าเป็นหน้าใหม่: รองรับ Feature เพิ่มเติมในอนาคต (activity log, notification settings ฯลฯ)

> [!NOTE]
> **Password Policy:** ปัจจุบัน default password = 4 ตัวท้าย emp_id เมื่อ user เปลี่ยนรหัสผ่านเองแล้ว ควรมีการ track ว่า "รหัสผ่านถูกเปลี่ยนแล้ว" หรือไม่? (เช่น แสดง badge "กรุณาเปลี่ยนรหัสผ่าน" สำหรับ user ที่ยังไม่เคยเปลี่ยน)

---

## Open Questions

> [!WARNING]
> **Admin Override:** Admin ยังคงสามารถรีเซ็ตรหัสผ่านของ user ผ่านหน้า userManage ได้ตามเดิม (ไม่กระทบ flow ปัจจุบัน) — ยืนยัน?

> [!NOTE]
> **รูปโปรไฟล์ใน manpower:** ถ้า user อัปโหลดรูปโปรไฟล์แล้ว ต้องการให้แสดงในหน้า `/page/manpower/` ด้วย หรือแค่ใน header dropdown/profile page เท่านั้น?

> [!NOTE]
> **Phone / Contact info:** ต้องการเก็บข้อมูลเบอร์โทรศัพท์หรือข้อมูลอื่นๆ เพิ่มเติมจากที่ระบุไหม?

---

## Proposed Changes

### Phase 1 — Database Schema (Foundation)

#### [MODIFY] `USERS` table — เพิ่ม columns ใหม่

```sql
ALTER TABLE dbo.USERS ADD
    profile_picture    NVARCHAR(500)  NULL,     -- FTP path หรือ NULL (ถ้าใช้ Option A)
    phone              VARCHAR(20)    NULL,     -- เบอร์โทรศัพท์ (optional)
    bio                NVARCHAR(500)  NULL,     -- คำแนะนำตัวสั้นๆ
    last_login         DATETIME       NULL,     -- timestamp การ login ล่าสุด
    pwd_changed_at     DATETIME       NULL,     -- ติดตามว่าเปลี่ยน password ครั้งล่าสุดเมื่อไหร่
    preferred_lang     VARCHAR(5)     NULL DEFAULT 'th',  -- 'th' / 'en'
    theme_preference   VARCHAR(10)    NULL DEFAULT 'light'; -- 'light' / 'dark'
```

> [!NOTE]
> `theme_preference` และ `preferred_lang` จะ **แทนที่** localStorage ที่ใช้อยู่ ทำให้ theme sync ข้ามอุปกรณ์ได้ (BYOD-ready)

---

### Phase 2 — Self-Service Profile Page (หน้าใหม่)

#### [NEW] `page/profile/profileUI.php`
หน้า Profile ส่วนตัวของผู้ใช้ เข้าถึงได้ทุก role (ยกเว้น guest) ประกอบด้วย:
- **ส่วน Avatar**: แสดงรูปโปรไฟล์ปัจจุบัน + ปุ่มอัปโหลด/เปลี่ยนรูป
- **ส่วน Personal Info**: แก้ไข `phone`, `bio`, `preferred_lang`, `theme_preference`
- **ส่วน Security**: เปลี่ยนรหัสผ่าน (ต้องใส่รหัสเดิมก่อน)
- **ส่วน Activity Log** *(Phase 3)*: ดู login history ย้อนหลัง

#### [NEW] `page/profile/api/api_profile.php`
API Endpoints สำหรับ self-service:
| Action | Method | Description |
|---|---|---|
| `get_my_profile` | GET | ดึงข้อมูล profile ของ user ที่ login อยู่ |
| `update_my_info` | POST | แก้ไข phone, bio, preferred_lang, theme |
| `upload_avatar` | POST | อัปโหลดรูปโปรไฟล์ (multipart/form-data) |
| `change_password` | POST | เปลี่ยนรหัสผ่าน (ต้องยืนยัน old password) |

**Security Rules:**
- ทุก endpoint ตรวจ `$_SESSION['user']` → บังคับ login
- `change_password` ต้องยืนยัน old password ด้วย `password_verify()` ก่อนเสมอ
- `upload_avatar`: ตรวจ MIME type (เฉพาะ image/jpeg, image/png, image/webp), ขนาดไม่เกิน 2MB, Resize เป็น 256×256 ก่อนบันทึก
- ทุก POST ต้องมี CSRF token

---

### Phase 3 — UI/UX Updates (Existing Files)

#### [MODIFY] [`top_header.php`](file:///e:/MES/MES/MES/page/components/php/top_header.php)
- เปลี่ยนจาก `<i class="fas fa-user-circle">` เป็น `<img>` tag แสดงรูปโปรไฟล์จริง (หรือ fallback เป็น icon)
- เพิ่ม "โปรไฟล์ของฉัน" link ใน dropdown (นำไปหน้า profileUI.php)
- Sync `theme_preference` จาก session แทน localStorage

#### [MODIFY] [`userManageUI.php`](file:///e:/MES/MES/MES/page/userManage/userManageUI.php)
- เพิ่มแสดง `profile_picture` (thumbnail) ในตาราง user list
- เพิ่มแสดง `pwd_changed_at` เพื่อให้ Admin เห็นว่า user เคยเปลี่ยน password แล้วหรือยัง
- เพิ่ม filter "ยังไม่เคยเปลี่ยนรหัสผ่าน" (pwd_changed_at IS NULL)

#### [MODIFY] [`page/userManage/api/userManage.php`](file:///e:/MES/MES/MES/page/userManage/api/userManage.php)
- เพิ่ม action `update_last_login` — เรียกจาก `auth/login.php` หลัง login สำเร็จ
- `read` action: เพิ่ม `profile_picture`, `pwd_changed_at` ใน SELECT

#### [MODIFY] `auth/login.php`
- บันทึก `last_login` timestamp เมื่อ login สำเร็จ
- โหลด `theme_preference` เข้า `$_SESSION['user']` เพื่อ sync ข้าม device

---

### Phase 4 — File Upload Infrastructure

#### [NEW] `page/profile/api/api_avatar_upload.php`
Dedicated endpoint สำหรับ image upload โดยเฉพาะ:
- รับ `multipart/form-data`
- Validate: MIME type, size ≤ 2MB
- Resize เป็น 256×256 WebP ด้วย PHP GD / Imagick
- Upload ไป FTP path: `/uploads/profile_pictures/{user_id}.webp` ผ่าน `mes-custom-mcp/ftp_upload_file`
- อัปเดต `USERS.profile_picture` = `/uploads/profile_pictures/{user_id}.webp`
- Return URL เพื่อ update UI ทันที

---

### Phase 5 — Stored Procedure Updates

#### [MODIFY] `sp_ManageUser` (SQL Server)
เพิ่ม `@Action='UPDATE_LAST_LOGIN'` และ `@Action='UPDATE_PROFILE'`

---

### Phase 6 — Enterprise UI Refinements

#### [MODIFY] `page/profile/profileUI.php`
- ปรับลดขนาดตัวอักษรและระยะห่างของแท็บทั้งหมดให้เป็นมาตรฐาน Enterprise (Compact & Clean)
- นำ Design System (`pro-section-header`, `pro-field-group`, `pro-notice`) มาใช้เพื่อให้ทุกแท็บมีรูปแบบสอดคล้องกัน
- ฝังตัวนับจำนวนตัวอักษร (Char Counter) ของฟิลด์คำแนะนำตัว ลงใน textarea overlay เพื่อประหยัดพื้นที่แนวตั้ง

---

## Architecture Overview

```
[User Browser]
    │
    ├── top_header.php (dropdown) ──→ profileUI.php (new)
    │                                     │
    │                               api_profile.php
    │                                     │
    │                            ┌────────┴─────────┐
    │                       USERS table        FTP Server
    │                       (metadata)         (images)
    │
    └── userManageUI.php (admin) ──→ userManage.php (existing API)
```

---

## Verification Plan

### Automated/Script Tests
- SQL: `SELECT * FROM USERS WHERE profile_picture IS NOT NULL` — ตรวจหลัง upload
- PHP lint: `php -l` ทุกไฟล์ใหม่ก่อน deploy

### Manual Verification
1. Login เป็น operator → เข้าหน้า Profile → อัปโหลดรูป → ตรวจว่า header แสดงรูปใหม่
2. เปลี่ยนรหัสผ่าน → logout → login ด้วยรหัสใหม่ → ต้องผ่าน
3. ใส่รหัสเดิมผิด → ต้อง reject ด้วย error message ที่ชัดเจน
4. Admin เปิด userManage → ตรวจว่าเห็น thumbnail และ `pwd_changed_at`
5. ลอง upload ไฟล์ที่ไม่ใช่รูปภาพ → ต้อง reject

---

## Estimated Scope

| Phase | งาน | ความซับซ้อน |
|---|---|---|
| 1 | DB Schema (ALTER TABLE) | ต่ำ |
| 2 | Profile Page + API | ปานกลาง |
| 3 | UI Updates (header, userManage) | ต่ำ-ปานกลาง |
| 4 | File Upload + FTP | ปานกลาง |
| 5 | SP Updates | ต่ำ |

> [!TIP]
> แนะนำให้ทำ Phase 1 → 3 ก่อน แล้วค่อย deploy Phase 4 (file upload) แยก เพื่อ risk management ที่ดีขึ้น
