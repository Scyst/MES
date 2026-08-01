<?php
// transport-system/api/db.php

// 1. กำหนด Header ให้รองรับ CORS และ JSON (สำหรับ React SPA)
header("Access-Control-Allow-Origin: *"); // ใน Production ควรจำกัดให้ตรงกับ Domain ฝั่ง Frontend
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle Preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 2. โหลด Config เฉพาะของ Module นี้จากไฟล์ .env ภายในโฟลเดอร์เดียวกัน
$envPath = __DIR__ . '/.env';

if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
} else {
    sendResponse(false, null, "ระบบขัดข้อง: ไม่พบไฟล์ .env ภายในโมดูล", 500);
}

// 3. ฟังก์ชันเชื่อมต่อฐานข้อมูล SQL Server ด้วย PDO
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $host = defined('DB_HOST') ? DB_HOST : (getenv('DB_SERVER') ?: '127.0.0.1');
            $dbName = defined('DB_DATABASE') ? DB_DATABASE : (getenv('DB_DATABASE') ?: 'IIOT_TOOLBOX');
            $user = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: 'TOOLBOX');
            $pass = defined('DB_PASSWORD') ? DB_PASSWORD : (getenv('DB_PASSWORD') ?: '');

            $dsn = "sqlsrv:Server=$host;Database=$dbName";
            $pdo = new PDO($dsn, $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            sendResponse(false, null, "Database Connection Error: " . $e->getMessage(), 500);
        }
    }
    return $pdo;
}

// 4. ฟังก์ชันส่งข้อมูล JSON กลับไปยัง Frontend ตามโครงสร้างมาตรฐาน
function sendResponse($success, $data = null, $message = "", $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// 5. Utility: อ่าน JSON Payload
function getJsonInput() {
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?: [];
}
?>
