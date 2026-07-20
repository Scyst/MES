# MES Team Planner Documentation

## Architecture & Tech Stack
- **Frontend**: React.js (Vite), TailwindCSS, React Icons. 
- **Backend API**: PHP (RESTful endpoints located in `api/`)
- **Database**: Microsoft SQL Server (MSSQL).
- **Deployment Script**: Node.js `deploy.js` & `deploy-prd.js` using `basic-ftp`.

## Database Schema (TeamPlanner Prefix)
- `TeamPlanner_Tasks`: Stores all individual tasks with columns for Title, Description, Assignee, SpaceId, ProjectId, DueDate, Status.
- `TeamPlanner_Spaces`: Team Workspaces (Engineers, Design Team, etc.). Contains Id, Name, Icon, Color.
- `TeamPlanner_Projects`: Projects within spaces. Contains Title, Description, SpaceId, Status, Checklist.
- `TeamPlanner_Events`: Calendar events.
- `TeamPlanner_Links`: Helpful resources & links.
- `TeamPlanner_Activities`: Logs and recent activity feed.

## Key Frontend Components
- `App.jsx`: Central router and state manager. Handles global Modals (AddProjectModal, AddTaskModal) and fetches data from the API on mount (`fetchData`).
- `SpaceView.jsx`: The Workspace view, resolving projects and tasks assigned to a specific Space.
- `ProjectsTab.jsx`: A high-level overview of all Projects across all spaces.
- `Dashboard.jsx`: Executive summary of tasks, events, and quick actions.
- `TaskBoard.jsx`: Kanban-style drag-and-drop board.

## Deployment Instructions
1. Development build & deploy (To `PlannerDev`):
   ```powershell
   $env:PUPPETEER_SKIP_DOWNLOAD="true"; npm run build; node deploy.js
   ```
2. Production build & deploy (To `Planner`):
   ```powershell
   $env:PUPPETEER_SKIP_DOWNLOAD="true"; npm run build; node deploy-prd.js
   ```

## API Structure (`/api/`)
- `spaces.php` - GET, POST, PUT, DELETE for Workspaces.
- `projects.php` - GET, POST, PUT, DELETE for Projects.
- `tasks.php` - Handles task retrieval, sorting, status updates (Kanban drag-and-drop).
- `auth.php` - (Upcoming/Mocked) Handling session states.

## Notable Fixes
- Added case-insensitive matching for Space ID (both `.Id` and `.id`) from the PHP backend.
- Dynamically rendered the sidebar spaces mapping, replacing the old static/hardcoded layout.
- Synchronized frontend `SpaceId` mapping across Modals, `ProjectsTab`, and `SpaceView`.
