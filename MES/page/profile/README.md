# Profile Module

This module handles user profile viewing and preferences for the MES system. 

## Current Implementation
- **Basic Info (Read-Only):** Fields like Name, Position, Line, and Department are synced from the `MANPOWER_EMPLOYEES` table and cannot be edited by the user directly.
- **Extended Info (Editable):** Users can edit contact info, social links, and emergency contacts, which are stored in the `USERS` table.
- **Performance Widget:** Displays the user's latest performance grade and metrics fetched from the Manpower API.
- **Settings:** Theme and Language preferences are currently disabled and marked as "Under Development" to prevent confusion while core functionalities are being built.

## Future Enhancements (Backlog)
1. **Theme Syncing (Dark Mode):** 
   - Integrate `theme-switcher.js` with `api_profile.php` so that switching themes via the top header automatically saves the preference to the database without page reload, ensuring cross-device consistency.
   - Re-enable the Theme selector in `profileUI.php`.
2. **Multi-Language Support (i18n):**
   - Implement a standardized localization system (TH/EN) across the MES.
   - Re-enable the Language selector in `profileUI.php`.
3. **Notification Preferences:**
   - Add a new section in Settings for users to opt-in/out of specific system notifications (e.g., Line alerts, Job Status changes).
4. **Automated HR Sync:**
   - Instead of relying solely on session regeneration, implement a background sync or WebSocket event that instantly updates the read-only basic info if HR changes it in the Manpower system.
