<?php
require_once __DIR__ . '/config.php';

$sap_host = getenv('SAP_DB_SERVER') ?: '10.0.0.4';
$sap_dbname = getenv('SAP_DB_DATABASE') ?: 'SNC-SAP';
$sap_username = getenv('SAP_DB_USER') ?: 'SNC-IIoT-Toolbox';
$sap_password = getenv('SAP_DB_PASSWORD') ?: '';

try {
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    $dsn_sap = "sqlsrv:server=$sap_host;database=$sap_dbname;TrustServerCertificate=true";
    $pdo_sap = new PDO($dsn_sap, $sap_username, $sap_password, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'SAP Database Connection Failed: ' . $e->getMessage()
    ]);
    exit;
}
?>

