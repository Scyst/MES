# Manpower & Profile Integration Guide

## Overview
This document serves as a guide for Agents or Developers looking to integrate the **User Profile System** (which includes `profile_picture` and extended personal info like `phone`, `bio`, and `emergency_contact`) into the **Manpower Module**.

Currently, the Manpower module reads employee data primarily from the `MANPOWER_EMPLOYEES` table. However, personal profile data and self-uploaded avatars are stored in the `USERS` table, linked by `emp_id`.

## Database Relationship
- **Core HR Data**: `MANPOWER_EMPLOYEES` (emp_id, name_th, position, line, department_api, etc.)
- **Extended Profile Data**: `USERS` (profile_picture, phone, bio, date_of_birth, etc.)
- **Foreign Key**: `USERS.emp_id` -> `MANPOWER_EMPLOYEES.emp_id`

*Note: Since standard employees are synced from Manpower to USERS automatically, it is safe to assume every active employee has a row in USERS.*

## Required Changes to Manpower API

To display profile pictures and personal info in the Manpower screens (e.g., Daily Shift Planning, Master Data), you must modify the SQL queries in `page/manpower/api/api_master_data.php`.

### Example: Modifying `read_employees` Endpoint
In `api_master_data.php` (case `read_employees`), update the query to perform a `LEFT JOIN` with `USERS`:

```sql
SELECT 
    E.emp_id, 
    E.name_th, 
    E.position, 
    E.line, 
    E.team_group,
    -- ... existing columns ...
    U.profile_picture,
    U.phone,
    U.bio,
    U.emergency_contact_name,
    U.emergency_contact_phone
FROM dbo.MANPOWER_EMPLOYEES E
LEFT JOIN dbo.USERS U ON E.emp_id = U.emp_id
-- ... existing joins ...
```

## Required Changes to Frontend UI

Once the API returns the profile data, update `page/manpower/manpowerUI.php` (or equivalent JS files) to render this data.

1. **Avatars in Data Tables**:
   Instead of just showing the employee's name, render a small circular avatar (e.g., 32x32px) next to their name. 
   - Fallback: If `profile_picture` is null, show a default generic icon or the user's initials.
   
2. **Employee Details Modal**:
   If there is a click action to view employee details, populate the modal with the new fields:
   - Bio / Notes (`bio`)
   - Phone Number (`phone`)
   - Emergency Contact details

## Syncing Considerations (External -> MES)
If the factory central system (Face Scan / HR) provides its own photos during the daily sync, ensure that `sync_from_api.php` is updated to inject or update the `profile_picture` column in the `USERS` table rather than altering the `MANPOWER_EMPLOYEES` schema.

## Summary Checklist for Next Agent
- [ ] Update `api_master_data.php` endpoints (`read_employees`, `read_single_employee`) to `LEFT JOIN USERS`.
- [ ] Modify `manpowerUI.php` (JS rendering) to display avatars in the main employee lists.
- [ ] Add phone/bio tooltips or modal fields for managers to easily see employee contact info.
