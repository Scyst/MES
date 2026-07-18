# System Settings Module Architecture

## Overview
The System Settings module is responsible for managing the Material Master Data (Item Master) within the MES system. It provides functionalities to view, create, edit, delete, and synchronize material items from SAP.

## File Structure
- systemSettings.php: Main UI entry point containing the HTML structure and DataTables container.
- script/systemSettings.js: Client-side logic for rendering DataTables, handling CRUD modals, and interacting with APIs.
- components/allSettingModal.php: Contains the HTML structure for the item creation/editing modal.
- pi/itemMasterManage.php: Backend API for CRUD operations on items, including quick_classify.
- pi/sync_sap_items.php: Backend API for synchronizing items from SAP staging tables.

## Database Relationships
- **Main Table:** dbo.ITEMS (Material Master).
- **SAP Staging Tables:** 
  - dbo.SAP_STG_ALL_STOCK (Primary source for Mat_No and MatDesc).
  - dbo.SAP_STG_OPERATION_SLIP (Secondary source for completeness).

### ITEMS Table Key Columns
- item_id (PK): Auto-incremented ID.
- sap_no (Unique): The material code from SAP.
- part_description: Material description (MatDesc).
- material_type: E.g., UNCLASSIFIED, FG, RM, SEMI, WIP, PKG, CON, SP, TOOL, OTHER.
- material_sub_type: Sub-classification of the material.

## Key Workflows & Logic

### 1. SAP Synchronization (sync_sap_items.php)
- **Source:** Reads unique Mat_No and MatDesc from SAP_STG_ALL_STOCK and SAP_STG_OPERATION_SLIP.
- **Insertion Logic:** Any Mat_No found in staging but missing in ITEMS is inserted with material_type = 'UNCLASSIFIED'.
- **Update/Overwrite Logic:** 
  - If a material exists and its material_type is UNCLASSIFIED, the script checks if the description (part_description) matches SAP (MatDesc).
  - If they do not match, the system **overwrites** the local description with the SAP description and flags it as an UPDATE.
  - **Important:** If material_type is anything other than UNCLASSIFIED (e.g., FG, RM), the system assumes it has been manually verified and **ignores** it, preserving user modifications.
- **UI Interaction:** After syncing, a modal (sapSyncResultModal) displays the newly inserted and updated items, allowing users to rapidly classify them via a Quick Classify dropdown.

### 2. Item Master Management (itemMasterManage.php)
- **Security:** Requires dmin, creator, or supervisor roles. POST requests require a valid X-CSRF-TOKEN header.
- **Quick Classify (ction=quick_classify):** An endpoint optimized for the SAP Sync result modal to rapidly update the material_type of an item via AJAX.

## Critical Technical Details (Gotchas)
- **Browser Caching on Sync:** The etch call for sync_sap_items.php in systemSettings.js must include cache-busting mechanisms (e.g., ?t=timestamp and cache: 'no-store'). Otherwise, the browser caches the JSON response and the sync appears to silently fail on subsequent manual clicks.
- **CSRF Token:** Any AJAX POST request (like quick_classify) must manually extract and append the X-CSRF-TOKEN from the <meta name="csrf-token"> tag to bypass the CSRF middleware.
- **Auto-Type Logic:** When editing an item's SAP No. in the UI, systemSettings.js attempts to auto-classify the material based on the first two digits (e.g., 10 -> RM, 20 -> PKG, 30 -> SEMI, 40 -> FG). Be mindful of this when testing manual classifications.

## Development Progress
- [x] Integrate UNCLASSIFIED into UI dropdowns.
- [x] Fix escapeHtml error when dealing with null/undefined values.
- [x] Implement selective overwrite logic (overwrite ONLY UNCLASSIFIED items during sync).
- [x] Fix browser caching issue for manual sync button.
- [x] Implement Quick Classify CSRF token inclusion.
- [ ] Future: Support bulk classification or deeper SAP property mapping.
