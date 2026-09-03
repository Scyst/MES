# User & Access Management Module (userManage)

## Overview
This module handles user authentication, role-based access control (RBAC), individual permission overrides (PBAC), and **self-service user profile management** for the entire MES system.

## Development Plans & Roadmap
- [x] Integrate standard Role-Based Access Control (RBAC).
- [x] **Individual Permissions (Overrides)**: Allow assigning or revoking specific permissions for individual users, superseding their default Role permissions.
- [x] **UI/UX Modernization**: Redesign `editUserModal` and `addUserModal` to use a 2-column layout with a grouped Data Table for permission assignment.
- [x] **User Profile System**: Self-service profile page with avatar upload, password change, personal info edit, and theme preferences.
- [x] **DB Schema Foundation**: Extended `USERS` table with profile_picture, phone, bio, last_login, pwd_changed_at, preferred_lang, theme_preference.
- [ ] **Team Planner Integration**: Connect user data and team assignments to the upcoming Planner module.
- [ ] Add bulk permission assignment features.

## Current Progress & Completed Tasks
- **Individual Permissions Architecture**: Implemented a system where `SYS_PERMISSIONS` tracks both `role_code` and `username`. When `username` is provided, it acts as a specific override for that user.
- **Frontend Refactor**: Upgraded the modals from an accordion-based layout to a clean, enterprise-grade `table-custom` Data Table grouped by modules.
- **Unified UI Design**: Synchronized the styling of the main page search bars, data tables, and modal input groups to use a cohesive, modern, and flat design language.
- **Caching Fix**: Added a timestamp-based cache buster (`_t=Date.now()`) to the `get_permissions` API call.
- **User Profile System (Sep 2026)**: Added self-service profile management with avatar upload (center-crop 256x256 WebP, FTP storage), password change (old password verification), personal info and theme preference editing.

## Critical Technical Details

### Database Structure
1. **Roles (`SYS_ROLES`)**: Defines the default permission template.
2. **Users (`USERS`)**: Stores employee credentials, roles, assignments, and extended profile data.
3. **Permissions (`SYS_PERMISSIONS`)**: Assigns a `perm_code` to either a `role_code` OR a `username`.

**`USERS` Table Columns (as of Sep 2026):**
| Column | Type | Notes |
|---|---|---|
| id, username, password, role | — | Core auth fields |
| line, emp_id, fullname, team_group, aka | — | HR sync fields |
| is_active, is_auto_generated, created_at | — | Status fields |
| profile_picture | NVARCHAR(500) | FTP path to WebP avatar |
| phone | VARCHAR(20) | Self-service editable |
| bio | NVARCHAR(500) | Short self-description |
| last_login | DATETIME | Updated on every login |
| pwd_changed_at | DATETIME | Set by CHANGE_PWD SP action |
| preferred_lang | VARCHAR(5) | 'th' / 'en' (default: 'th') |
| theme_preference | VARCHAR(10) | 'light' / 'dark' (default: 'light') |

**Key Logic:**
- If `SYS_PERMISSIONS` has `role_code = 'planner'` and `perm_code = 'edit_plan'`, all planners get this permission.
- If `SYS_PERMISSIONS` has `username = 'emp100'` and `perm_code = 'delete_plan'`, ONLY emp100 gets it.

### sp_ManageUser Actions
| @Action | Description |
|---|---|
| ADD | Create new user |
| EDIT | Admin updates user info |
| TOGGLE_STATUS | Enable/Disable user |
| RESET_PWD | Admin resets password (no old pwd required) |
| UPDATE_LAST_LOGIN | Called on every successful login |
| UPDATE_PROFILE | Self-service: phone, bio, lang, theme |
| UPDATE_AVATAR | Self-service: update profile_picture path |
| CHANGE_PWD | Self-service: requires PHP-verified old password |

### API Endpoints

**Admin API** (`page/userManage/api/userManage.php`):
- `action=read`: Returns users including profile_picture, pwd_changed_at, last_login
- `action=create|update|toggle_status`: CRUD operations
- `action=get_permissions|toggle_permission`: RBAC management
- `action=logs`: Audit log viewer with pagination

**Self-Service API** (`page/profile/api/api_profile.php`):
- `action=get_my_profile`: Returns full profile of logged-in user (no password)
- `action=update_my_info`: Update phone, bio, preferred_lang, theme_preference
- `action=change_password`: Requires old_password verification before hash update

**Avatar Upload API** (`page/profile/api/api_avatar_upload.php`):
- Accepts `multipart/form-data` with `avatar` field
- Validates: MIME type (JPEG/PNG/WebP only), size <= 2MB
- Processes: Center-crop + resize to 256x256, converts to WebP (quality 85)
- Storage: FTP at `/uploads/profile_pictures/profile_{id}.webp`, falls back to local

### Frontend Components
- **`userManageUI.php`**: Admin page — shows avatar thumbnails and pwd_changed_at in user table.
- **`userManage.js`**: CRUD logic — `renderTable()` shows avatar img with letter fallback.
- **`page/profile/profileUI.php`**: Self-service page (3 tabs: ข้อมูลส่วนตัว, ความปลอดภัย, การตั้งค่า).
- **`top_header.php`**: Shows real avatar (with FA icon fallback) + "โปรไฟล์ของฉัน" dropdown link.

### Session Data (post Sep 2026)
```php
$_SESSION['user'] = [
    'id', 'username', 'fullname', 'role', 'position',
    'line', 'emp_id', 'team_group',
    'profile_picture',   // FTP path or null
    'theme_preference',  // 'light' | 'dark'
    'preferred_lang',    // 'th' | 'en'
    'permissions'        // merged role + individual perms array
];
```

---
*Last Updated: September 2026*
