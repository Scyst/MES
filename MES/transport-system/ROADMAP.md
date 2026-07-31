# SNC Transport System — ROADMAP

> ระบบจองและบริหารรถรับ-ส่งพนักงาน
> Stack: React + Vite + TailwindCSS + localStorage (Frontend-only, awaiting backend)
> สถานะ: **ขั้นตอน UI/UX Design and Prototyping**

---

## สถานะปัจจุบัน (2026-07-31)

### สิ่งที่ทำเสร็จแล้ว

| Feature | หมายเหตุ |
|---------|---------|
| Employee App — จองรถ | Date strip, filter สาย, จองล่วงหน้าหลายวัน |
| Employee App — ตั๋ว/Scanner | หน้า QR scanner (จำลอง), success animation, Survey Modal |
| Admin — Dashboard | KPI cards, Demand vs Capacity, BU Billing, Trip Modal |
| Admin — Manage Schedules | จัดการรอบรถ, Add/Edit Modal, Date strip, Filter |
| Admin — Master Data | Fleet (รถ+คนขับ), Routes (เส้นทาง+จุดจอด), TimeSlots, Departments |
| CheckIn (QR Landing) | หน้าสแกน QR สำหรับคนขับ (ใช้ Zustand store เก่า — ต้องแก้) |
| Dark Mode | ครอบคลุมทุกหน้า |
| Responsive Layout | Mobile-first, Admin sidebar responsive |

---

## UI/UX — งานที่กำลังทำ (In Progress)

### Phase 1: แก้ปัญหา Critical UX

#### 1.1 ~~แทน confirm() ด้วย Custom Modal~~ ✅ DONE (2026-07-31)
ไฟล์ที่เกี่ยวข้อง:
- BookingHome.jsx — ยืนยันจอง (single + multi-day)
- MyTicket.jsx — ยกเลิกการจอง
- ManageSchedules.jsx — ลบรอบรถ

แนวทาง: สร้าง ConfirmModal component กลาง ใช้ได้ทุกที่
Design: Modal แสดงรายละเอียดสิ่งที่จะทำ (สาย, วันที่, เวลา) + ปุ่มยืนยัน/ยกเลิก

#### 1.2 ~~แก้ Routes Filter ให้ดึงจาก Master Data~~ ✅ DONE (2026-07-31)
ไฟล์ที่เกี่ยวข้อง:
- BookingHome.jsx:112 — Hardcoded routes list

#### 1.3 ~~แก้ CheckInPassenger ให้ใช้ localStorage แทน Zustand~~ ✅ DONE (2026-07-31)
ไฟล์ที่เกี่ยวข้อง:
- CheckInPassenger.jsx — ใช้ useStore() (Zustand) แทน localStorage fleet

#### 1.4 ~~แปล Status Badge เป็นภาษาไทย~~ ✅ DONE (2026-07-31)
- MyTicket.jsx:110 — BOARDED = ขึ้นรถแล้ว, CONFIRMED = จองแล้ว

#### 1.5 ~~Multi-day Booking — แจ้งเตือนเมื่อวันที่ไม่มีรอบ~~ ✅ DONE (2026-07-31)
- BookingHome.jsx — ปัจจุบันข้ามวันที่ไม่มีรอบโดยไม่แจ้ง user

---

### Phase 2: เพิ่ม Feature UX ใหม่

#### 2.1 ~~Employee App — Bottom Navigation Bar~~ ✅ DONE (2026-07-31)
- ปุ่มนำทาง: จองรถ / ตั๋วของฉัน / โปรไฟล์
- Sticky bottom บนมือถือ

#### 2.2 ~~Employee App — ประวัติการจอง~~ ✅ DONE (2026-07-31)
- แสดงรายการจองที่ผ่านมา ยกเลิกได้ถ้ายังไม่เดินทาง

#### 2.3 ~~Admin — Real-time Refresh~~ ✅ DONE (2026-07-31)
- Dashboard โหลดข้อมูลใหม่เมื่อ focus window กลับมา

#### 2.4 ~~Employee App — Profile / Identity~~ ✅ DONE (2026-07-31)
- หน้าตั้งค่าโปรไฟล์ (empId, name, bu) ก่อนใช้งาน

---

### Phase 3: Driver App (แอปพลิเคชันสำหรับคนขับ)

#### 3.1 ~~Driver Layout & Login~~ ✅ DONE (2026-07-31)
- จำลองการเข้าระบบด้วยการเลือกรถจาก Master Data

#### 3.2 ~~Driver Trips & Trip Details~~ ✅ DONE (2026-07-31)
- ดูรายการรอบรถในวันนี้
- ดูรายชื่อผู้โดยสาร (รอขึ้นรถ / ขึ้นรถแล้ว)
- สามารถกด Manual Check-in ได้
- สามารถเพิ่มผู้โดยสาร Walk-in (เสริม) ได้

---

## Backend — งานในอนาคต (Planned)

หมายเหตุ: เริ่มหลัง UI/UX ได้รับการยืนยันว่าใช้งานได้ดีแล้ว

### API Endpoints (PHP + SQL Server)

| Endpoint | Method | หน้าที่ |
|----------|--------|---------|
| /api/auth/login | POST | Login พนักงาน |
| /api/employees/{id} | GET | ข้อมูลพนักงาน |
| /api/fleet | GET/POST/PUT/DELETE | จัดการยานพาหนะ |
| /api/routes | GET/POST/PUT/DELETE | จัดการเส้นทาง |
| /api/time-slots | GET/POST/PUT/DELETE | จัดการช่วงเวลา |
| /api/departments | GET/POST/PUT/DELETE | จัดการแผนก |
| /api/schedules | GET/POST/PUT/DELETE | จัดการรอบรถ |
| /api/bookings | GET/POST | จอง / ดูการจอง |
| /api/bookings/{id}/cancel | PUT | ยกเลิกจอง |
| /api/checkin | POST | สแกนขึ้นรถ |
| /api/trips/{id}/billing | GET | สรุปค่าใช้จ่าย |
| /api/reports/daily | GET | รายงานประจำวัน |

### Database Tables (SQL Server)

- EMPLOYEES — ข้อมูลพนักงาน
- DEPARTMENTS — แผนก/ฝ่าย (BU)
- FLEET — ยานพาหนะ
- ROUTES — เส้นทาง + จุดจอด
- TIME_SLOTS — ช่วงเวลา
- SCHEDULED_TRIPS — รอบรถล่วงหน้า
- BOOKINGS — การจอง
- AUDIT_LOG — log ทุก action สำคัญ

---

## Known Issues / Technical Debt

| Issue | ไฟล์ | ความรุนแรง |
|-------|------|-----------|
| confirm() ทุกที่ | BookingHome, MyTicket, ManageSchedules | HIGH |
| Hardcoded routes filter | BookingHome.jsx:112 | HIGH |
| empId/name/bu hardcoded | BookingHome.jsx:61-63 | MEDIUM |
| Multi-day booking ไม่แจ้งวันที่ข้าม | BookingHome.jsx | MEDIUM |
| Status badge เป็นภาษาอังกฤษ | MyTicket.jsx | LOW |



