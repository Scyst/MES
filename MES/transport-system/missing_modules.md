# 🔍 Missing Modules / Mocked Features (Transport System)
*(Updated: 2026-08-03)*

## 1. Backend API (PHP)
- `[ ]` **`/api/auth/login`**: ระบบยืนยันตัวตนสำหรับ Admin, Driver และ พนักงาน (ปัจจุบันใช้ Mock Session หรือ User Input ล้วน)
- `[ ]` **`/api/trips/{id}/billing`**: ระบบสรุปบิลลิ่งค่าใช้จ่ายรายเที่ยว
- `[ ]` **`/api/reports/daily`**: ระบบสร้างและส่งออกรายงานประจำวัน

## 2. Frontend (UI)
- `[ ]` **Survey API Integration**: `SurveyModal.jsx` ปัจจุบันแค่ Mock การบันทึกคะแนน
- `[ ]` **Admin Dashboard Real Data**: Dashboard ควรดึงข้อมูลผ่าน API รายงาน (Aggregated Data) แทนที่จะดึง Bookings ทั้งก้อนมาวนลูปคำนวณในฝั่ง Client
- `[ ]` **Driver Authenticity**: ระบบเลือกป้ายทะเบียนรถใน `DriverLogin.jsx` ยังไม่ได้ตรวจสอบรหัสผ่านจริง
