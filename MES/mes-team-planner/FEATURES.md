# 📋 Features Overview (MES Team Planner)

This document lists all the major features and capabilities of the MES Team Planner application.

## 1. Global Dashboard (`Dashboard.jsx`)
- **KPI Metrics:** Displays high-level stats like Open Tasks, Overdue Tasks, Tasks Due Today, and Total Completed.
- **Workload Analysis:** Visual pie/doughnut chart showing the distribution of task statuses.
- **Today's Context:** Quick view of employees on leave/holiday today, and tasks that are strictly due today.
- **Activity Feed:** Real-time log of recent actions (e.g., "User A completed Task B").

## 2. Task Board (Kanban) (`TaskBoard.jsx`)
- **Drag & Drop:** Fully interactive columns (To Do, In Progress, Done) allowing users to drag tasks to change status.
- **Task Cards:** Rich cards displaying Title, Assignee, Due Date, Priority (colored tags), and Subtask progress (e.g., 2/4).
- **Responsive Design:** Converts to a scrollable vertical list on small mobile screens to prevent cramped UI.

## 3. Gantt Chart / Daily Schedule (`GanttChart.jsx`)
- **Timeline View:** Horizontal scrolling 30-day timeline.
- **User Grouping:** Tasks and events are grouped by Assignee, with collapsible/expandable rows for clean viewing.
- **Mobile Toolbar:** A sticky, single-row top toolbar for navigating dates without cluttering the screen.

## 4. Calendar (`CalendarView.jsx`)
- **Monthly Grid:** A standard calendar view displaying tasks and events as pill-shaped indicators on specific days.
- **Detailed Daily Panel:** Clicking a day opens a side panel detailing every task, holiday, and meeting scheduled for that day.
- **Dynamic User Resolution:** Converts raw User IDs into display names dynamically.

## 5. Projects & Spaces (`SpaceView.jsx`, `ProjectsTab.jsx`)
- **Workspaces:** Group tasks and projects by Teams or Departments.
- **Space Members:** Manage who has access to the space with role assignments.
- **Project Drill-down:** Clickable project cards that open detailed modal editors.

## 6. Profile & Settings (`ProfileSettingsModal.jsx`)
- **Avatar Customization:** Upload and crop custom profile pictures natively within the app.
- **User Preferences:** Form layouts for managing personal settings and UI preferences.

## 7. Link Hub (`LinkHub.jsx`)
- **Bookmarks:** Centralized repository for important links, categorized for quick access.

## 8. Robust Modals & Form UX
- **Unsaved Warning (`ConfirmDialog`):** All complex forms (AddTask, AddEvent, AddProject) will warn the user before closing if there are unsaved changes.
- **Modern Form Elements:** Uses interactive radio cards, custom multi-select dropdowns, and date pickers.
- **No Native Alerts:** Completely avoids `window.alert()` and `window.confirm()` in favor of customized React UI dialogs.

## 9. Security & Backend (`PHP / SQL Server`)
- **Role-Based Access Control (RBAC):** Edit/Delete actions are restricted to Admins, Managers, and the specific Creator or Assignee of the task.
- **Zero LocalStorage:** Fully migrated to a RESTful API communicating securely with MSSQL.
