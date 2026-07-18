<?php
// config/config.php

// =========================================================
// LOAD .env FILE (ถ้ามี)
// =========================================================
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        if (strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!getenv($key)) {
            putenv("$key=$value");
        }
    }
}

// --- DEVELOPMENT SWITCH ---
// true = ชี้ไปที่ MESToolbox_Dev (URL: Clone/MES)
// false = ชี้ไปที่ IIOT_TOOLBOX (URL: MES/MES) 
define('IS_DEVELOPMENT', false); // เปลี่ยนเป็น true เมื่อพัฒนาในเครื่อง local หรือ staging server

// --- DATABASE CREDENTIALS (อ่านจาก .env) ---
define('DB_HOST', getenv('DB_SERVER') ?: '10.1.1.31');
$target_db = IS_DEVELOPMENT ? 'MESToolbox_Dev' : 'IIOT_TOOLBOX';
define('DB_DATABASE', getenv('DB_DATABASE') ?: $target_db);
define('DB_USER', getenv('DB_USER') ?: 'TOOLBOX');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');

// --- Production & Core Tables ---
define('LOCATIONS_TABLE', 'LOCATIONS');
define('ITEMS_TABLE', 'ITEMS');
define('ONHAND_TABLE', 'INVENTORY_ONHAND');
define('TRANSACTIONS_TABLE', 'STOCK_TRANSACTIONS');
define('BOM_TABLE', 'PRODUCT_BOM');
define('JOB_ORDERS_TABLE', 'JOB_ORDERS');
define('ROUTES_TABLE', 'MANUFACTURING_ROUTES');
define('STOP_CAUSES_TABLE', 'STOP_CAUSES');
define('MAINTENANCE_REQUESTS_TABLE', 'MAINTENANCE_REQUESTS');
define('SCHEDULES_TABLE', 'LINE_SCHEDULES');
define('MANUAL_COSTS_TABLE', 'MES_MANUAL_DAILY_COSTS');
define('PRODUCTION_PLANS_TABLE', 'PRODUCTION_PLANS');
define('LOT_SERIALS_TABLE', 'LOT_SERIALS');
define('SCAN_JOBS_TABLE', 'QR_SCAN_JOBS');
define('TRANSFER_ORDERS_TABLE', 'STOCK_TRANSFER_ORDERS');
define('OPERATOR_LOGS_TABLE', 'OPERATOR_DAILY_LOGS');
define('FORKLIFTS_TABLE', 'FORKLIFTS');
define('FORKLIFT_BOOKINGS_TABLE', 'FORKLIFT_BOOKINGS');

// =========================================================
// --- Barcode Scanner Module Tables & Columns ---
// =========================================================
define('SCAN_LOGS_TABLE', 'BARCODE_SCAN_DATA');
define('SCAN_ITEMS_TABLE', ITEMS_TABLE);         // อ้างอิงตารางหลัก
define('SCAN_LOCATIONS_TABLE', LOCATIONS_TABLE); // อ้างอิงตารางหลัก

define('COL_LOG_BARCODE',    'barcode_no');
define('COL_LOG_SAP',        'sap_no');
define('COL_LOG_LOTREF',     'lot_ref');
define('COL_LOG_LOC_ID',     'location_id');
define('COL_LOG_LOC_NAME',   'location_name');
define('COL_LOG_PROD_TYPE',  'production_type');
define('COL_LOG_LOGDATE',    'logdate');
define('COL_LOG_NOTES',      'notes');
define('COL_LOG_SCANNED_BY', 'scanned_by');

// --- Finance Tables ---
define('FINANCE_INVOICES_TABLE', 'FINANCE_INVOICES');
define('FINANCE_INVOICE_DETAILS_TABLE', 'FINANCE_INVOICE_DETAILS');
define('SP_FINANCE_IMPORT_INVOICE', 'sp_Finance_ImportInvoice');

// --- Loading Report Tables ---
define('SALES_ORDERS_TABLE', 'SALES_ORDERS');
define('LOADING_REPORTS_TABLE', 'LOADING_REPORTS');
define('LOADING_PHOTOS_TABLE', 'LOADING_PHOTOS');
define('LOADING_RESULTS_TABLE', 'LOADING_INSPECTION_RESULTS');

// --- QMS Tables ---
define('QMS_CASES_TABLE', 'QMS_CASES');
define('QMS_NCR_TABLE', 'QMS_NCR');
define('QMS_CAR_TABLE', 'QMS_CAR');
define('QMS_CLAIM_TABLE', 'QMS_CLAIM');
define('QMS_FILE_TABLE', 'QMS_FILE');

// --- Manpower Tables ---
define('MANPOWER_SHIFTS_TABLE', 'MANPOWER_SHIFTS');
define('MANPOWER_EMPLOYEES_TABLE', 'MANPOWER_EMPLOYEES');
define('MANPOWER_DAILY_LOGS_TABLE', 'MANPOWER_DAILY_LOGS');

// --- Manpower Mapping & Summary ---
define('MANPOWER_CATEGORY_MAPPING_TABLE', 'MANPOWER_CATEGORY_MAPPING');
define('MANPOWER_SECTION_MAPPING_TABLE', 'MANPOWER_SECTION_MAPPING');
define('VW_MANPOWER_EXEC_SUMMARY', 'vw_Manpower_Executive_Summary');

// --- Daily Meetings Table ---
define('DAILY_MEETINGS_TABLE', 'DAILY_MEETINGS');

// --- Maintenance Tables ---
define('MT_ITEMS_TABLE', 'MT_ITEMS');
define('MT_LOCATIONS_TABLE', 'MT_LOCATIONS');
define('MT_ONHAND_TABLE', 'MT_INVENTORY_ONHAND');
define('MT_TRANSACTIONS_TABLE', 'MT_TRANSACTIONS');

// --- PE Enterprise Tables ---
define('PE_MACHINES_TABLE', 'PE_MACHINES');
define('PE_WORK_ORDERS_TABLE', 'PE_WORK_ORDERS');
define('PE_DOWNTIME_LOG_TABLE', 'PE_DOWNTIME_LOG');
define('PE_MACHINE_HISTORY_TABLE', 'PE_MACHINE_HISTORY');

// --- System & User Tables ---
define('USERS_TABLE', 'USERS');
define('USER_LOGS_TABLE', 'USER_LOGS');
define('DOCUMENTS_TABLE', 'DOCUMENTS');
define('DOCUMENT_LOGS_TABLE', 'DOCUMENT_ACCESS_LOGS');

// --- P&L Tables ---
define('PL_STRUCTURE_TABLE', 'PL_STRUCTURE');
define('DAILY_PL_ENTRIES_TABLE', 'DAILY_PL_ENTRIES');
define('MONTHLY_PL_TARGETS_TABLE', 'MONTHLY_PL_TARGETS');

// =========================================================
// STORED PROCEDURES (Cleaned)
// =========================================================
define('SP_CALC_STD_COST', 'sp_CalculateProductionCostSummary');
define('SP_CALC_ACTUAL_COST', 'sp_CalculateActualCostSummary');
define('SP_CALC_OEE_PIE', 'sp_CalculateOEE_Dashboard_PieChart');
define('SP_CALC_OEE_HOURLY', 'sp_CalculateOEE_Hourly_Trend');
define('SP_CALC_OEE_LINE', 'sp_CalculateOEE_Dashboard_LineChart');
define('SP_GET_DAILY_PROD', 'sp_GetDailyProductionSummary');
define('SP_EXECUTE_PRODUCTION', 'sp_ExecuteProduction');
define('SP_UPDATE_ONHAND', 'sp_UpdateOnhandBalance');
define('SP_UPDATE_CARRYOVER', 'sp_UpdatePlanCarryOver');
define('SP_AUTO_GENERATE_PLAN', 'sp_AutoGenerateProductionPlan');

// P&L Entry & Dashboard
define('SP_GET_PL_ENTRY', 'sp_GetPLEntryData_WithTargets');
define('SP_UPSERT_PL_ENTRY', 'sp_UpsertDailyPLEntry');
define('SP_SAVE_MONTHLY_TARGET', 'sp_SaveMonthlyTarget');
define('SP_GET_DASHBOARD_STATS', 'sp_GetDashboardStats');
define('SP_CALCULATE_DAILY_COST', 'sp_CalculateDailyCost');

// Report
define('SP_GET_PL_REPORT_RANGE', 'sp_GetPLReport_Range');

// Utilities 
define('SP_GET_WORKING_DAYS', 'sp_GetWorkingDays');
define('SP_MANAGE_CONTAINER', 'sp_ManageContainerRate');
define('SP_MANAGE_EXCHANGE', 'sp_ManageExchangeRate');
define('SP_SAVE_CALENDAR', 'sp_SaveCalendarEvent');

// =========================================================
// EMAIL CONFIG (อ่านจาก .env)
// =========================================================
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 587));
define('SMTP_SECURE', getenv('SMTP_SECURE') ?: 'tls');
define('EMAIL_FROM', getenv('EMAIL_FROM') ?: getenv('SMTP_USER') ?: '');
define('EMAIL_FROM_NAME', getenv('EMAIL_FROM_NAME') ?: 'MES Maintenance Report');
define('EMAIL_TO_REPORT', getenv('EMAIL_TO_REPORT') ?: '');
define('EMAIL_CC_REPORT', getenv('EMAIL_CC_REPORT') ?: '');

// =========================================================
// SYSTEM CONFIG (Base URL)
// =========================================================
define('BASE_URL', IS_DEVELOPMENT 
    ? 'https://oem.sncformer.com/iot-toolbox/sandbox-b9/Clone/MES'
    : 'https://oem.sncformer.com/iot-toolbox/sandbox-b9/MES_TEST'
);

define('SYSTEM_API_KEY', getenv('SYSTEM_API_KEY') ?: '');
?>