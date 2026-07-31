# MES Team Planner - Architecture & Documentation

## Overview
**MES Team Planner** is a task and project management web application tailored for offline and air-gapped industrial environments (MES - Manufacturing Execution System). It allows teams (Engineers, Developers, Design, etc.) to collaborate, track tasks, manage projects, and communicate in a unified workspace.

## Tech Stack
*   **Frontend:** React.js, Tailwind CSS, Vite
*   **Backend API:** PHP 8.x (RESTful architecture)
*   **Database:** Microsoft SQL Server (MSSQL)
*   **State Management:** React Hooks (`useState`, `useEffect`, `useMemo`) combined with Prop Drilling and lifting state up to `App.jsx`.
*   **Deployment:** Custom FTP deployment script (`deploy.js`) uploading production builds (`npm run build`) to an Apache/IIS server.

---

## Core Features Implemented

### 1. Spaces (Team Management)
*   **Concept:** Spaces act as isolated workspaces or groups where teams can gather their projects and tasks.
*   **Features:**
    *   Dynamic loading of Spaces from the database (`TeamPlanner_Spaces` table).
    *   Sidebar Integration: Spaces are automatically mapped into the main sidebar for quick access.
    *   Space Creation/Editing: Users can add new spaces, choose icons (`FiUsers`, `FiFolder`, etc.), and assign a theme color.
    *   **SpaceView Component:** Renders the active space, showing associated projects and recent tasks.

### 2. My Workspace (`MyTasks.jsx`)
*   **Concept:** A personalized dashboard for the logged-in user to see their immediate priorities.
*   **Features:**
    *   **Focus Mode:** Pinpoints the highest priority task (overdue or due today) and displays it prominently at the top.
    *   **Interactive Tasks:** The Focus Mode card and all sub-task cards (`HeavyTaskCard`) are clickable, automatically opening the `AddTaskModal` for editing.
    *   **Status Toggles:** Quick action buttons (`Start Working` / `Mark as Done`) communicate with the backend to instantly update `Status` to `in-progress` or `done`.
    *   **Real-time UI updates:** Changes to task statuses immediately reflect in the UI without requiring a full page refresh.

### 3. Task Management (`AddTaskModal.jsx` & `TaskBoard.jsx`)
*   **Concept:** Comprehensive CRUD (Create, Read, Update, Delete) operations for granular tasks.
*   **Features:**
    *   Tasks contain Title, Description, Status, Priority, Due Date, and Assignee.
    *   **Subtasks & Checklists:** Users can break tasks down into smaller, trackable subtasks.
    *   **Project Integration:** Tasks can be linked to a specific Project checklist.
    *   **Comments System:** Integrated chat/commenting system within each task for team communication.
    *   **Recurring Tasks:** Tasks can be scheduled to repeat daily, weekly, monthly, or on custom dates. 
        *   **Server-Side Generation:** Recurrence generation is handled server-side in `api/tasks.php` (up to a 365-day limit) to optimize performance, linking related tasks together via a `GroupId` and storing settings in `RecurrenceSettings`. Users can edit/delete an entire series of tasks at once.
        *   **Custom Recurrence Logic (OR Condition):** If a user selects both specific days of the week (e.g., Thursday) AND specific dates of the month (e.g., the 5th) under "Custom", the backend evaluates this using an **OR condition**. It will generate tasks for every Thursday AND the 5th of every month independently.
        *   **UI/UX:** The recurrence End Date input was replaced with modern preset duration buttons (+1 Month, +3 Months, +6 Months, +1 Year) that calculate the precise `recurrenceEndDate` client-side before submission.

### 4. Global Search & Notifications
*   **Concept:** Quick accessibility and awareness.
*   **Features:**
    *   Magnifying Glass (Sidebar) opens a global search modal (`showSearchModal`).
    *   Notifications ring (Bell icon) alerts users to mentions or overdue tasks.
    *   Add Space Button (`FiPlus`) dynamically triggers the `AddSpaceModal`.

---

## Database Schema & Relations (MSSQL)

The backend handles connections using PDO via `api/db_helper.php`.

### 1. `TeamPlanner_Spaces`
*   **Purpose:** Stores team workspaces.
*   **Fields:** `Id` (PK), `Name`, `Icon`, `Color`, `CreatedAt`

### 2. `TeamPlanner_Projects`
*   **Purpose:** Stores high-level projects that belong to Spaces.
*   **Fields:** `Id` (PK), `Title`, `Description`, `Status`, `Assignee`, `StartDate`, `DueDate`, `Tags`, `Priority`, `Checklist` (JSON String), `SpaceId` (FK)
*   **Relation:** `SpaceId` maps a project to a specific `TeamPlanner_Spaces`.

### 3. `TeamPlanner_Tasks`
*   **Purpose:** Stores individual tasks.
*   **Fields:** `Id` (PK), `Title`, `Status`, `Visibility`, `Assignee`, `DueDate`, `StartDate`, `StartTime`, `EndTime`, `Priority`, `Description`, `Subtasks` (JSON), `Tags`, `Recurrence`, `ProjectId` (FK), `SpaceId` (FK), `CreatedBy`, `GroupId`, `RecurrenceSettings` (JSON)
*   **Relation:** 
    *   `ProjectId`: Associates the task with a specific Project.
    *   `SpaceId`: Directly associates the task with a Team Space if it's not bound to a project.
    *   `GroupId`: Links recurring tasks together as a series (prefixed with `grp_`).

### 4. Other Tables
*   `TeamPlanner_Events`: For calendar events.
*   `TeamPlanner_Comments`: For task-specific discussions.
*   `TeamPlanner_Activities`: Audit logs and history tracking.
*   `TeamPlanner_Links`: Resource links sharing.
*   `Users` (External/Legacy): Contains user accounts for AKA and fullname mapping.

---

## Development Notes & Future Roadmap

*   **API Interception:** The React app uses Axios interceptors in `main.jsx` to map `/api/*` endpoints directly to `api/*.php` to bypass React Router restrictions.
*   **State Propagation:** Currently, `App.jsx` handles fetching and holding all major states (`tasks`, `projects`, `spaces`). When an update occurs, the specific state array is mapped and updated to trigger a re-render.
*   **Known Challenges Fixed:**
    *   *Hardcoded Navigation:* Previously, `spacesNav` was hardcoded to mock teams. It was refactored to dynamically render `spaces` array from `api/spaces.php`.
    *   *Focus Mode Reactivity:* Fixed issues where the UI didn't update the `Start Working` button state correctly when the backend updated successfully.
*   **Future Improvements:**
    *   Implement robust user authentication mapping (AKA to User IDs).
    *   Implement WebSocket or Polling for real-time multiplayer updates.
    *   Optimize Vite chunk sizes (`index.js` > 500kb) by utilizing React `lazy()` and Suspense for modals.
