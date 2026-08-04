# 📋 Audit & Remaining Work (Transport System)
*(Updated: 2026-08-03)*

เอกสารนี้ใช้สำหรับติดตามสถานะของ Technical Debt และงาน UI/UX ที่ค้างอยู่

## 🚨 Security & Technical Debt (Critical)

- `[ ]` **`localStorage` PII Violation:**
  - นำ `passenger_empId`, `passenger_name`, `passenger_bu`, `passenger_phone` ออกจาก `localStorage` โดยด่วน
  - สาเหตุ: ละเมิดกฎใน `AGENTS.md` (ห้ามเก็บข้อมูลความลับของบริษัท/พนักงานลงใน Persistent Storage ฝั่ง Client)
  - วิธีแก้: สร้าง Auth Provider (React Context หรือ Zustand) เพื่อดึงและเก็บ State นี้ไว้ใน Memory แทน
  - ไฟล์ที่กระทบ: `ProfilePage.jsx`, `BookingHome.jsx`, `CheckInPassenger.jsx`, `MyTicket.jsx`, `BookingHistory.jsx`

- `[ ]` **Driver Auth Risk:**
  - หน้า `DriverLogin.jsx` ใช้วิธีเก็บ `driver_vehicle_id` ลงใน `localStorage`
  - วิธีแก้: ต้องเปลี่ยนเป็นหน้า Login ที่ตรวจสอบรหัสผ่านจริง และเก็บลง Secure State เช่นกัน

## 🎨 UI/UX Refinements

- `[ ]` **Survey Modal Feedback:**
  - `SurveyModal.jsx` เมื่อกดส่งแล้วควรมี Alert ยืนยันว่าบันทึกสำเร็จ (รอเชื่อม Backend API ก่อน)
- `[ ]` **Time Slot Sort/Display:**
  - ตรวจสอบให้แน่ใจว่าหน้า จองรถ (BookingHome) เรียงลำดับเวลา (Time Slot) จากเช้าไปเย็นเสมอ

## 📈 Performance & Scaling

- `[ ]` **Dashboard Offloading:**
  - สรุปตัวเลขต่างๆ บน `AdminDashboard.jsx` ไม่ควรโหลด Booking ทั้งหมดมานับเอง (N+1/Heavy Load risk) ควรให้ Backend API ทำ Aggregate ให้
