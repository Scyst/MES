<?php
// api/db.php

header('Content-Type: application/json; charset=utf-8');

// 1. เรียกใช้ไฟล์ config เป็นอันดับแรก
require_once __DIR__ . '/../config/config.php';

try {
    // 2. สร้าง DSN โดยใช้ค่าคงที่ (constants) จาก config.php
    $dsn = "sqlsrv:server=" . DB_HOST . ";database=" . DB_DATABASE . ";TrustServerCertificate=true";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    // 3. สร้าง Object PDO โดยใช้ค่าคงที่จาก config.php
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, $options);

} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    error_log("Database Connection Error: " . $e->getMessage());
    exit;
}
?>