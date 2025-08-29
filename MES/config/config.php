<?php
// config/config.php

// --- DEVELOPMENT SWITCH ---
// ตั้งเป็น true เมื่อทำงานบนเครื่องตัวเอง, ตั้งเป็น false เมื่อนำขึ้น Server จริง
define('IS_DEVELOPMENT', false);
// ตั้งเป็น true เมื่อจะใช้การคำนวนจากระบบใหม่, ตั้งเป็น false เมื่อจะใช้การคำนวนจากระบบเก่า
define('USE_NEW_OEE_CALCULATION', true);

// --- DATABASE CREDENTIALS ---
// พยายามดึงค่าจาก Environment Variables ก่อน, ถ้าไม่มีให้ใช้ค่า Default
define('DB_HOST', getenv('DB_SERVER') ?: "10.1.1.31");
define('DB_DATABASE', getenv('DB_DATABASE') ?: "IIOT_TOOLBOX");
define('DB_USER', getenv('DB_USER') ?: "TOOLBOX");
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: "I1o1@T@#1boX");

// --- TABLE NAME DEFINITIONS ---
define('LOCATIONS_TABLE', IS_DEVELOPMENT ? 'LOCATIONS_TEST' : 'LOCATIONS');
define('ITEMS_TABLE', IS_DEVELOPMENT ? 'ITEMS_TEST' : 'ITEMS');
define('ONHAND_TABLE', IS_DEVELOPMENT ? 'INVENTORY_ONHAND_TEST' : 'INVENTORY_ONHAND');
define('TRANSACTIONS_TABLE', IS_DEVELOPMENT ? 'STOCK_TRANSACTIONS_TEST' : 'STOCK_TRANSACTIONS');
define('BOM_TABLE', IS_DEVELOPMENT ? 'PRODUCT_BOM_TEST' : 'PRODUCT_BOM'); // แก้ไขให้ถูกต้อง
define('ROUTES_TABLE', IS_DEVELOPMENT ? 'MANUFACTURING_ROUTES_TEST' : 'MANUFACTURING_ROUTES');

// --- Legacy System Tables ---
define('PARTS_TABLE', IS_DEVELOPMENT ? 'PARTS_TEST' : 'PARTS');
define('PARAMETER_TABLE', IS_DEVELOPMENT ? 'PARAMETER_TEST' : 'PARAMETER'); // แก้ไขให้ถูกต้อง
define('LEGACY_PARAMETER_TABLE', IS_DEVELOPMENT ? 'PARAMETER' : 'PARAMETER');
define('LEGACY_BOM_TABLE', IS_DEVELOPMENT ? 'PRODUCT_BOM' : 'PRODUCT_BOM');
define('STOP_CAUSES_TABLE', IS_DEVELOPMENT ? 'STOP_CAUSES_TEST' : 'STOP_CAUSES'); // แก้ไขให้ถูกต้อง
define('WIP_TABLE', IS_DEVELOPMENT ? 'WIP_ENTRIES_TEST' : 'WIP_ENTRIES');
define('SCHEDULES_TABLE', IS_DEVELOPMENT ? 'LINE_SCHEDULES_TEST' : 'LINE_SCHEDULES');

// --- System Tables ---
define('USERS_TABLE', IS_DEVELOPMENT ? 'USERS_TEST' : 'USERS');
define('USER_LOGS_TABLE', IS_DEVELOPMENT ? 'USER_LOGS_TEST' : 'USER_LOGS');

?>