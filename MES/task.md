# 📌 Active Task Tracker

## [IN PROGRESS] Team Planner Performance Optimization (Hot/Cold Data & Filtered Index)
- **Task ID (Planner)**: 6559
- **Assignee**: Oat (ณภัทร นุ่มทอง)
- **Space**: Developer Team (ID: 3)
- **Timeline**: 2026-11-04 (08:00 - 09:00)
- **Status**: IN_PROGRESS

### Checklist
- [x] ออกแบบสถาปัตยกรรม Hot vs Cold Data & Shallow Payload
- [x] สร้าง Filtered Index `IX_TeamPlanner_ActiveTasks` บน SQL Server 2016
- [x] ปรับปรุง Backend API `tasks.php` รองรับ Active 30-Day Window & Include Archived
- [x] ปรับปรุง Frontend `TeamPlannerApp.jsx` และตัวสลับมุมมอง Include Archived
- [x] Build, Deploy FTP และรัน E2E Benchmark ตรวจวัดความเร็ว

---

## ⏸️ On-Hold Tasks
1. **Layer 4: Full Profile Page** (พักไว้ชั่วคราวตามคำสั่งผู้ใช้ เพื่อทำระบบความเร็ว Planner ก่อน)
2. **System Blueprint Visual Extensions** (สมบูรณ์ 100% ในระดับใช้งานได้จริงแล้ว พักการต่อขยายไว้ชั่วคราว)
