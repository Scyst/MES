# 📌 Active Task Tracker

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

## ⏸️ Next Up / Ready to Resume
1. **Layer 4: Full Profile Page** (หน้าโปรไฟล์ผู้ใช้ฉบับสมบูรณ์ พร้อมสถิติ 4 มิติ และการตั้งค่าระบบ)
2. **System Blueprint Visual Extensions** (ต่อยอดฟีเจอร์เพิ่มเติมเมื่อโครงสร้างระบบมีการขยายตัว)
