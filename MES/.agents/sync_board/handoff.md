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
- [ ] ทดสอบ E2E ร่วมกับผู้ใช้งานจริงบนหน้างาน (User Acceptance Testing):
  - ทดสอบความเร็วในการตอบสนองของเครื่องสแกนบาร์โค้ด (Camera/Hardware Scanner) หน้างานจริง
  - ทดสอบให้หัวหน้างานกด Approve ในหน้า `inventoryDashboard.php` เพื่อยืนยันว่ายอด Onhand และ Serial Tags ปรับยอดถูกต้องตาม Business Logic

## Exact Files to Modify (ไฟล์ที่เกี่ยวข้อง)
- `db_changes.md` (บันทึก Schema)
- `page/storeManagement/cycleCount.php` (UI หลัก)
- `page/storeManagement/script/cycleCount.js` (สคริปต์ควบคุม UI และการตั้งค่าโซน)
- `page/storeManagement/api/api_store.php` (Backend API)
