# MES Team Planner - Roadmap

## 🎯 Project Vision
A seamless, modern, and responsive team planning and task management application designed for MES teams.

## ✅ Completed (Phase 1: UI & UX Foundations)
- [x] Initial React + Vite Setup
- [x] Integrate Tailwind CSS with modern UI trends (Dark Mode, Glassmorphism, Micro-animations)
- [x] **Dashboard Tab**:
  - High-level metrics & stats cards
  - Today's Context (Leaves, Due Today)
  - Workload analysis and status breakdown
  - Recent activity feed
- [x] **Task Board (Kanban) Tab**:
  - Drag and drop columns (To Do, In Progress, Done)
  - Task cards with priority indicators, subtasks progress, and tags
  - Compact mobile responsive design
- [x] **Gantt Chart (ตารางงานรายวัน) Tab**:
  - Horizontal scroll timeline view
  - Expandable/Collapsible user rows
  - Responsive single-row toolbar for better mobile usability
- [x] **Calendar Tab**:
  - Month view calendar with event indicators
  - Detailed daily event listing panel
- [x] **Link Hub (คลังข้อมูล) Tab**:
  - Centralized categorized link management
  - Clean grid layout for easy access
- [x] **UI/UX Refinements**:
  - Improved form layout density and typography (AddTaskModal)
  - Implemented intuitive tooltips for complex form rules
- [x] Layout optimizations for PC & Mobile across all tabs

## 🛠️ Current Phase (Phase 2: Backend Integration & Database)
- [ ] Define MySQL database schemas (tasks, events, links, activities)
- [ ] Set up PHP RESTful API backend (`/server/api`)
- [ ] Connect React frontend components to PHP backend
- [ ] Implement data fetching, creation, updating, and deletion (CRUD)

## 🚀 Upcoming Features (Phase 3: Advanced Functionality)
- [ ] **Authentication & User Roles**: Login system to distinguish Admin vs normal users.
- [ ] **Real-time Notifications**: WebSockets or polling for live updates on task changes.
- [ ] **File Attachments**: Ability to upload images/documents to tasks.
- [ ] **Reporting & Export**: Export task boards to PDF or Excel.
- [ ] **Dark/Light Mode Toggle**: Allow users to switch themes if necessary.
