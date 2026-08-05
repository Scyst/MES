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
- [x] Define Microsoft SQL Server (MSSQL) database schemas (tasks, events, links, activities, spaces)
- [x] Fix the UI of `AddTaskModal` (remove Recurrence label, fix tooltip, adjust padding/card layout to be flatter and wider max-w-2xl).
- [x] Integrate full interactivity to `SpaceView` and `MyTasks`:
  - Added "New Task" and "New Project" creation buttons.
  - Allowed clicking on recent tasks to edit them.
  - Enabled status changes directly from the team view.
  - Made project cards clickable to open the project editing modal.
- [x] Set up PHP RESTful API backend (`api/` folder) replacing legacy node mock.
- [x] Connect React frontend components to PHP backend via Axios and Vite proxy.
- [x] Implement data fetching, creation, updating, and deletion (CRUD).
- [x] Fix RBAC (Role-Based Access Control) permissions allowing Task Creators to edit their own tasks.
- [x] Fix UI misalignment bugs in Calendar/Schedule view (added `min-w-0` to prevent grid blowout).
- [x] Deploy frontend build to the live FTP server (`/Toolbox/plannerAgent`) and verify UI fixes in production environment.
- [x] Implement Avatar Cropper feature in Profile Settings.
- [x] Standardize unsaved changes warning across all modals using a custom `ConfirmDialog`.
- [x] Implement robust error handling on the backend (e.g. handling missing task IDs gracefully).

## 🚀 Upcoming Features (Phase 3: Advanced Functionality)
- [x] **Chat System**: Messenger-style real-time chat with Task rooms and 1-on-1 private messaging.
- [x] **Authentication & User Roles**: Inherits secure login and roles (Admin/User) from the main MES Toolbox session.
- [x] **Real-time Notifications**: Polling for live chat updates and chat notifications.
- [x] **File Attachments**: Ability to upload images/documents to tasks and chats.
- [x] **Reporting & Export**: Export task boards to PDF or Excel.
