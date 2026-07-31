# QMS Module Roadmap & Documentation

## QA/QC Schedule Module (New Feature)
**Completed:**
- Created `qa_schedule.php` UI with stats KPI cards (Total, Waiting, In Progress, Passed, Failed).
- Added modern pill-shaped date filter bar (Today, This Week, This Month, Last Month, Custom Date).
- Implemented `qa_schedule_api.php` for fetching data from `SALES_ORDERS`, updating inspection results, and removing schedules.
- Added visual cues for approaching/overdue loading dates (custom pastel rows with colored left borders) set to a 7-day warning threshold.
- Enhanced table column alignment and added "Inspection Date" column for better context.
- Implemented robust remove logic: simple removal for WAITING items, and strict force-confirmation for IN_PROGRESS/DONE items to protect QA data integrity while preserving Sales data.

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
