# 📌 Active Task Tracker

## ✅ [COMPLETED] Document Center (Windows-Style Rename Modal, Action Dropdown & UX Overhaul)
- **Task ID (Planner)**: 6562
- **Assignee**: Oat (ณภัทร นุ่มทอง)
- **Timeline**: 2026-11-04 (11:35 - 12:15)
- **Status**: COMPLETED

### Checklist
- [x] Backend API `documentCenterAPI.php`: เพิ่ม action `rename` (รองรับทั้งไฟล์และโฟลเดอร์ พร้อม Cascade subcategories ใน SQL Server และป้องกันอักขระต้องห้ามของ Windows)
- [x] Modal Component `renameDocModal.php`: สร้าง UI เปลี่ยนชื่อแบบ Windows แยกชื่อไฟล์ออกจากนามสกุลอัตโนมัติ
- [x] Details Modal `viewDocModal.php`: เพิ่ม input `editDocFileName` เพื่อให้สามารถแก้ชื่อไฟล์จากหน้า Details ได้
- [x] Table & Interaction `documentCenterUI.php` & `documentCenter.js`: รวมคอลัมน์ Actions เป็นเมนูจุดไข่ปลา `⋮` และปรับ Row Click ให้เปิดดูไฟล์/โฟลเดอร์โดยตรง ไม่เผลอเปิด Details Modal
- [x] Keyboard Shortcut: เพิ่มคีย์ลัด `F2` บนแถวที่เมาส์ชี้ เพื่อเปิดเปลี่ยนชื่อแบบ Windows
- [x] ตรวจสอบ Syntax และ Deploy ขึ้น FTP เรียบร้อยครบทั้ง 5 ไฟล์

---

## ✅ [COMPLETED] Profile Page Standardization & 4D Performance Polish (Layer 4 UI/UX Alignment)
- **Task ID (Planner)**: 6560
- **Assignee**: Oat (ณภัทร นุ่มทอง)
- **Space**: Developer Team (ID: 3)
- **Timeline**: 2026-11-04 (09:00 - 10:30)
- **Status**: COMPLETED

### Checklist
- [x] ปรับแต่ง `ProfilePage.jsx` ให้ใช้ `.mes-page-header`, `.mes-page-title` และ `.mes-tab-nav` สไตล์ Underline เดียวกับ System Settings & User Management
- [x] ปรับฟอร์ม `ProfileWelfareTab.jsx` ให้ใช้ `.mes-input`, `.mes-select`, `.mes-btn-primary` และจัด Grid ให้กระชับ
- [x] ปรับฟอร์ม `ProfileSecurityTab.jsx` และตาราง `ProfileActivityLogsTab.jsx` ให้เข้าคู่กับระบบ
- [x] Build, Deploy FTP และรัน E2E Verification ตรวจสอบหน้าจอทั้ง PC และ Mobile

---

## ✅ [COMPLETED] Team Planner Performance Optimization (Hot/Cold Data & Filtered Index)
- **Task ID (Planner)**: 6559
- **Assignee**: Oat (ณภัทร นุ่มทอง)
- **Space**: Developer Team (ID: 3)
- **Timeline**: 2026-11-04 (08:00 - 09:00)
- **Status**: COMPLETED

### Checklist
- [x] ออกแบบสถาปัตยกรรม Hot vs Cold Data & Shallow Payload
- [x] สร้าง Filtered Index `IX_TeamPlanner_ActiveTasks` บน SQL Server 2016
- [x] ปรับปรุง Backend API `tasks.php` รองรับ Active 30-Day Window & Include Archived
- [x] ปรับปรุง Frontend `TeamPlannerApp.jsx` และตัวสลับมุมมอง Include Archived
- [x] Build, Deploy FTP และรัน E2E Benchmark ตรวจวัดความเร็ว

---

## 🔮 Team Planner Future Scalability Roadmap (Backlog ในอนาคต)
1. **Delta Sync (Incremental Polling Engine - Phase 3)**:
   - *เป้าหมาย*: ส่งเฉพาะงานที่มีการอัปเดต/ลบในรอบ 30 วินาที ผ่าน `?since=<timestamp>` เพื่อลดโหลดเน็ตเวิร์กลงอีก 95%
   - *เหตุผลที่ยังไม่ทำตอนนี้*: ตาราง `dbo.TeamPlanner_Tasks` ยังไม่มีคอลัมน์ `UpdatedAt` และยังใช้ Hard Delete การทำระบบนี้อย่างถูกต้องต้องเพิ่ม Schema, ทำ Soft-delete/Tombstone table และแก้ React State Reducer ซึ่งมีความเสี่ยงกระทบระบบเดิมสูงเกินความจำเป็นในเวลานี้ เพราะความเร็วปัจจุบันอยู่ที่ **136ms** อยู่แล้ว
2. **DOM Virtualization สำหรับ Timeline/Gantt (Phase 4)**:
   - *เป้าหมาย*: ใช้ `@tanstack/react-virtual` เรนเดอร์เฉพาะงานในกรอบสายตา
   - *เหตุผลที่ยังไม่ทำตอนนี้*: บอร์ด Kanban มีการจำกัดแถวในแต่ละคอลัมน์ไว้ที่ 20 การ์ดอยู่แล้ว (`colLimits || 20`) DOM Node จึงไม่ล้น และมุมมองไทม์ไลน์ปัจจุบันลื่นไหลดีอยู่แล้ว จะจำเป็นเมื่อต้องเรนเดอร์งานข้ามปีพร้อมกันหลักพันชิ้น

---

## ▶️ Active Backlog (`/goal` Phase 1 Finish & Phase 2–3 Porting)
- [x] Layer 4 Full Profile Page & Interactive System Blueprint (เสร็จสิ้นในรอบก่อนหน้า)
- [x] Batch 1: Housekeeping (`HomeDashboard` FTP Link Audit, Sync Gap Docs & `task.md`, Store IndexedDB Offline Queue + Utility MDB Exclusion Marker)
- [x] Phase 2.1: Production Execution + Scan Barcode (`#/production`, `#/scan-barcode`) — Complete (14/11/2026)
- [ ] Phase 2.2: PE Enterprise & Maintenance (`#/pe/*` Sub-phase A & B)
- [ ] Phase 2.3: QMS (`#/qms`)
- [ ] Phase 3: Manpower & Planning, Sales/Loading/AutoInvoice, Management/OEE/DailyPL, AreaAccess/Accessories/CCTV
