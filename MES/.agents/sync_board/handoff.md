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

