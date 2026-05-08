<?php
// ----- ข้อมูลการเชื่อมต่อ Server -----
define('DB_HOST',   '10.1.1.31');  // หรือ 'localhost,1433' หรือ IP เช่น '192.168.1.100,1433'
define('DB_NAME',   'IIOT_TOOLBOX');           // ชื่อ Database หลัก (ตาราง logs)
define('DB_USER',   'TOOLBOX');                      // SQL Server username
define('DB_PASS',   'I1o1@T@#1boX');            // SQL Server password

define('USE_WINDOWS_AUTH', false);

// ตาราง Master ของสินค้า (IIOT_TOOLBOX)
define('TBL_PRODUCTS',         '[IIOT_TOOLBOX].[dbo].[ITEMS]');
define('COL_PROD_BARCODE',       'barcode');
define('COL_PROD_SAP',           'sap_no');
define('COL_PROD_PART_NO',       'part_no');
define('COL_PROD_PART_DESC',     'part_description');
define('COL_PROD_MATERIAL_TYPE', 'material_type');

// ตาราง Location (IIOT_TOOLBOX)
define('TBL_LOCATIONS',        '[IIOT_TOOLBOX].[dbo].[LOCATIONS]');
define('COL_LOC_ID',           'location_id');
define('COL_LOC_NAME',         'location_name');

// ตาราง Log (IIOT_TOOLBOX)
define('TBL_SCAN_LOGS',        '[IIOT_TOOLBOX].[dbo].[BARCODE_SCAN_DATA]');
define('COL_LOG_BARCODE',      'barcode_no');
define('COL_LOG_SAP',          'sap_no');
define('COL_LOG_LOTREF',       'lot_ref');
define('COL_LOG_LOC_ID',       'location_id');
define('COL_LOG_LOC_NAME',     'location_name');
define('COL_LOG_PROD_TYPE',    'production_type');
define('COL_LOG_LOGDATE',      'logdate');
define('COL_LOG_NOTES',        'notes');

// ============================================
// PDO Connection
// ============================================
function getDBConnection() {
    try {
        $dsn = "sqlsrv:Server=" . DB_HOST . ";Database=" . DB_NAME;

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        if (USE_WINDOWS_AUTH) {
            $pdo = new PDO($dsn, null, null, $options);
        } else {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        }

        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database Connection Failed: ' . $e->getMessage()
        ]);
        exit;
    }
}

// Header สำหรับ API ทุกตัว
function setApiHeaders() {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}
