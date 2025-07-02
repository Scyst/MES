<?php
header('Content-Type: application/json; charset=utf-8');

$serverName = getenv('DB_SERVER') ?: "10.1.1.21"; // Or your local server name
$database   = getenv('DB_NAME')   ?: "SNC_SCAN";
$username   = getenv('DB_USER')   ?: "sa-scan-oem"; // Your local username
$password   = getenv('DB_PASS')   ?: "SnC!#@2023";  // Your local password

try {

    $dsn = "sqlsrv:server=$serverName;database=$database;TrustServerCertificate=true";
    
    // PDO connection options for robust error handling and encoding
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Set error mode to throw exceptions
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Set default fetch mode to associative array
    ];

    // Create a new PDO instance
    $pdo = new PDO($dsn, $username, $password, $options);

} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    
    error_log("Database Connection Error: " . $e->getMessage());
    
    exit;
}

?>