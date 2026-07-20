# User & Access Management Module (userManage)

## Overview
This module handles user authentication, role-based access control (RBAC), and individual permission overrides (PBAC) for the entire MES system. It includes features for syncing users from the HR database (Manpower) and defining granular access controls.

## Development Plans & Roadmap
- [x] Integrate standard Role-Based Access Control (RBAC).
- [x] **Individual Permissions (Overrides)**: Allow assigning or revoking specific permissions for individual users, superseding their default Role permissions.
- [x] **UI/UX Modernization**: Redesign `editUserModal` and `addUserModal` to use a 2-column layout with a grouped Data Table for permission assignment.
- [ ] **Team Planner Integration**: Connect user data and team assignments to the upcoming Planner module.
- [ ] Add bulk permission assignment features.

## Current Progress & Completed Tasks
- **Individual Permissions Architecture**: Implemented a system where `SYS_PERMISSIONS` tracks both `role_code` and `username`. When `username` is provided, it acts as a specific override for that user.
- **Frontend Refactor**: Upgraded the modals from an accordion-based layout to a clean, enterprise-grade `table-custom` Data Table grouped by modules.
- **Unified UI Design**: Synchronized the styling of the main page search bars, data tables, and modal input groups to use a cohesive, modern, and flat design language (seamless inputs, custom table headers).
- **Caching Fix**: Added a timestamp-based cache buster (`_t=Date.now()`) to the `get_permissions` API call to ensure immediate UI updates when permissions are modified.

## Critical Technical Details

### Database Structure
The permission system relies on three main concepts mapped in the database:
1. **Roles (`SYS_ROLES`)**: Defines the default permission template (e.g., `admin`, `planner`, `operator`).
2. **Users (`SYS_USERS`)**: Stores employee credentials, roles, and assignments (Team, Line).
3. **Permissions (`SYS_PERMISSIONS`)**: A bridging/mapping table that assigns a `perm_code` (e.g., `manage_users`, `view_reports`) to either a `role_code` OR a `username`.

**Key Logic:**
- If `SYS_PERMISSIONS` has `role_code = 'planner'` and `perm_code = 'edit_plan'`, all users with `role = 'planner'` get this permission.
- If `SYS_PERMISSIONS` has `username = 'emp100'` and `perm_code = 'delete_plan'`, ONLY `emp100` gets this permission regardless of their base role.

### API Endpoints
- **`userManage.php?action=get_permissions`**: 
  - Parameters: `id` (User ID), `role` (Role Code), `_t` (Cache buster timestamp).
  - Returns: JSON object containing:
    - `all`: Array of all available permissions in the system.
    - `role_perms`: Array of `perm_code` strings granted by the user's base role.
    - `user_perms`: Array of `perm_code` strings explicitly granted to the individual user.

### Frontend Components
- **`userManageUI.php`**: The main page layout containing the user list and master permission definitions.
- **`userManage.js`**: Core logic for handling CRUD operations, syncing manpower, and dynamically generating the Permissions Data Table in the modals (`loadPermissionsForModal`).
- **`components/addUserModal.php` & `components/editUserModal.php`**: 2-column Bootstrap Modals. The left column captures user info using seamless input-groups. The right column dynamically renders the Data Table based on `userManage.js`.

---
*Last Updated: July 2026*
