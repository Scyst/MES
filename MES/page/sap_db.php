<?php
// e:\MES\MES\MES\page\sap_db.php
// Connection to SAP Database (10.0.0.4)

$sap_host = '10.0.0.4';
$sap_dbname = 'SNC-SAP';
$sap_username = 'SNC-IIoT-Toolbox';
$sap_password = 'SnC@11oT#TOOlbOX';

try {
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    $dsn_sap = "sqlsrv:server=$sap_host;database=$sap_dbname;TrustServerCertificate=true";
    $pdo_sap = new PDO($dsn_sap, $sap_username, $sap_password, $options);
} catch (PDOException $e) {
    // Return standard error format if connection fails
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'SAP Database Connection Failed: ' . $e->getMessage()
    ]);
    exit;
}
?>
