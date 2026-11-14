# QMS Module Roadmap & Documentation

## QA/QC Schedule Module (New Feature)
**Completed:**
- Created `qa_schedule.php` UI with stats KPI cards (Total, Waiting, In Progress, Passed, Failed).
- Added modern pill-shaped date filter bar (Today, This Week, This Month, Last Month, Custom Date).
- Implemented `qa_schedule_api.php` for fetching data from `SALES_ORDERS`, updating inspection results, and removing schedules.
- Added visual cues for approaching/overdue loading dates (custom pastel rows with colored left borders) set to a 7-day warning threshold.
- Enhanced table column alignment and added "Inspection Date" column for better context.
- Implemented robust remove logic: simple removal for WAITING items, and strict force-confirmation for IN_PROGRESS/DONE items to protect QA data integrity while preserving Sales data.
- **Advanced Search & Filtering:** Added a detailed search panel in the main NCR/CAR dashboard.
- **Global Search Capability:** Added real-time text-based search filtering across all main tabs (Concession, QA/QC Schedule) to instantly search by Ticket No, PO, SKU, Week, Inspector, and DC Location.
- **Interactive KPIs:** Made the KPI summary cards on the QA Schedule clickable so they can actively filter the data table in combination with the date filters.

**QA/QC Calendar Redesign & Features Update:**
- **Reorder Tabs:** `NCR/CAR` > `Concession` > `QA/QC Planner` > `QA/QC Schedule` for better workflow.
- **Replace FullCalendar:** Switched to Custom CSS Grid for better performance and customization.
- **Fix Modal Backdrop Bug:** Centralized modals in `qa_schedule_modals.php` to fix Z-index conflicts.
- **Assign Jobs:** Drag-and-drop jobs from "Pending Jobs" sidebar directly onto the calendar grid.
- **Reschedule Jobs:** Drag-and-drop existing event pills across days in the calendar to reschedule.
- **View Day Jobs:** Clicking a day cell opens a Daily Jobs Modal showing all jobs for that day with statuses.
- **Bulk Update in Day View:** Support selecting multiple jobs in the Day Jobs Modal to assign tickets and inspectors in one go.
- **Scope & Conflict Fixes:** Removed old tab-switching logic and resolved JS reference errors.
- **Multi-Round Inspection History & Data Integrity Fixes (2026-11-14):**
  - Created `dbo.QMS_PO_INSPECTION_HISTORY` (`round_no`, `is_latest`, `scheduled_date`, `actual_inspection_date`, `inspection_status`, `inspection_result`, `source_action`) and backfilled 1,324 Round 1 rows so re-opening/re-scheduling completed POs never erases prior inspection records (archived rounds open as Read-Only with an inline "+ เปิดตรวจรอบใหม่" workflow and per-PO round timeline).
  - Recovered 63 PO rows in `dbo.SALES_ORDERS` (including 8 `FAIL` POs) whose `inspection_date` had been nulled and `inspection_status` overwritten to `'Pass'` by Sales CSV imports; logged full JSON before/after snapshot in `dbo.SYSTEM_LOGS`.
  - Fixed `FAIL`-vs-`Pass` evaluation precedence across `qa_schedule_api.php`, `qa_schedule_script.php`, `manage_sales_orders.php`, `manage_shipping.php`, `salesDashboard.js`, `shipping_loading.js`, and Toolbox SPA (`qaScheduleApi.php`, `qmsFormatters.js`, `QaScheduleTab.jsx`, `QaInspectionModals.jsx`, `QaPlannerCalendarTab.jsx`).
  - Hardened Sales CSV & Shipping CSV imports (`MERGE`) and inline toggles against overwriting QA-owned `inspection_date`, `ticket_number`, `inspection_status`, `inspection_result`, `inspect_type`, added CSRF validation + `writeLog()`/`writeErrorLog()`, and fixed `assignToMe` display name lookup.

**Pending / Next Steps:**
- Gather feedback from QA/QC team after initial trial usage.
- Potentially add detailed reporting or export-to-Excel functionality if requested by QA team.

## Concession Module
**Pending Decision: Customer Approver Workflow**
Currently, the concession module assigns approvals. However, since the final approver may be an external customer (who does not have a system account), we need a workflow to handle this.
Three potential solutions have been proposed to QA/QC:
1. **Online Token Link (Recommended):** Generate a unique link similar to CAR, allowing the customer to review and approve without a login.
2. **Offline Print & Sign:** Select "External Customer" as the approver, print the blank PDF, get a physical signature, and upload the signed document back into the system to close the case.
3. **Proxy Approval:** The internal user approves on behalf of the customer, but the system strictly requires an evidence file upload (e.g., email confirmation screenshot or PDF).

*Awaiting final decision from QA/QC team before implementation.*
