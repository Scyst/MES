<?php
require_once __DIR__ . '/../config/config.php';

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$dsn = "sqlsrv:server=" . DB_HOST . ";database=" . DB_DATABASE . ";TrustServerCertificate=true";
$pdo = new PDO($dsn, DB_USER, DB_PASSWORD, $options);

?>