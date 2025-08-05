<?php
// config/config.php

// --- DEVELOPMENT SWITCH ---
// ตั้งเป็น true เมื่อทำงานบนเครื่องตัวเอง, ตั้งเป็น false เมื่อนำขึ้น Server จริง
define('IS_DEVELOPMENT', true);

// --- DATABASE CREDENTIALS ---
// พยายามดึงค่าจาก Environment Variables ก่อน, ถ้าไม่มีให้ใช้ค่า Default
define('DB_HOST', getenv('DB_SERVER') ?: "10.1.1.31");
define('DB_DATABASE', getenv('DB_DATABASE') ?: "IIOT_TOOLBOX");
define('DB_USER', getenv('DB_USER') ?: "TOOLBOX");
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: "I1o1@T@#1boX");

// --- TABLE NAME DEFINITIONS ---
// ใช้ IS_DEVELOPMENT เพื่อสลับชื่อตารางโดยอัตโนมัติ
define('LOCATIONS_TABLE', IS_DEVELOPMENT ? 'LOCATIONS_TEST' : 'LOCATIONS');
define('ITEMS_TABLE', IS_DEVELOPMENT ? 'ITEMS_TEST' : 'ITEMS');
define('ONHAND_TABLE', IS_DEVELOPMENT ? 'INVENTORY_ONHAND_TEST' : 'INVENTORY_ONHAND');
define('TRANSACTIONS_TABLE', IS_DEVELOPMENT ? 'STOCK_TRANSACTIONS_TEST' : 'STOCK_TRANSACTIONS');
define('USERS_TABLE', IS_DEVELOPMENT ? 'USERS_TEST' : 'USERS');
// --- ตาราง Legacy (ถ้ายังต้องใช้ในบางหน้า) ---
define('PARTS_TABLE', IS_DEVELOPMENT ? 'PARTS_TEST' : 'PARTS');
define('PARAM_TABLE', IS_DEVELOPMENT ? 'PARAMETER_TEST' : 'PARAMETER');
define('WIP_TABLE', IS_DEVELOPMENT ? 'WIP_ENTRIES_TEST' : 'WIP_ENTRIES');
define('BOM_TABLE', IS_DEVELOPMENT ? 'PRODUCT_BOM_TEST' : 'PRODUCT_BOM');
define('ROUTES_TABLE', IS_DEVELOPMENT ? 'MANUFACTURING_ROUTES_TEST' : 'MANUFACTURING_ROUTES');

?>