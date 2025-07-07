<?php
//-- ตั้งค่า Header เริ่มต้นสำหรับไฟล์ที่เรียกใช้ ให้เป็น JSON --
header('Content-Type: application/json; charset=utf-8');

//-- กำหนดค่าเชื่อมต่อฐานข้อมูลสำหรับ Server ของบริษัท --
$serverName = getenv('DB_SERVER')   ?: "10.1.1.31";      // <-- แก้ไข: IP Server ที่ถูกต้อง
$database   = getenv('DB_DATABASE') ?: "IIOT_TOOLBOX";   // <-- แก้ไข: ชื่อ Database ใหม่
$user       = getenv('DB_USER')     ?: "TOOLBOX";        // <-- แก้ไข: User ใหม่
$password   = getenv('DB_PASSWORD') ?: "I1o1@T@#1boX";   // <-- แก้ไข: Password ใหม่

try {
    //-- สร้าง DSN (Data Source Name) สำหรับการเชื่อมต่อ --
    // TrustServerCertificate=true ใช้ในกรณีที่เซิร์ฟเวอร์ใช้ Self-signed certificate
    $dsn = "sqlsrv:server=$serverName;database=$database;TrustServerCertificate=true";
    
    //-- ตั้งค่า Options สำหรับ PDO เพื่อจัดการ Error และรูปแบบการดึงข้อมูล --
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // ให้แสดง Error ในรูปแบบ Exception
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,     // ให้ดึงข้อมูลเป็น Associative Array เป็นค่าเริ่มต้น
    ];

    //-- สร้าง Object PDO เพื่อเชื่อมต่อฐานข้อมูล --
    $pdo = new PDO($dsn, $user, $password, $options);

} catch (PDOException $e) {
    //-- กรณีเชื่อมต่อฐานข้อมูลไม่สำเร็จ --
    http_response_code(503); // Service Unavailable
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    
    //-- บันทึก Log ข้อผิดพลาดจริงไว้ในฝั่ง Server --
    error_log("Database Connection Error: " . $e->getMessage());
    
    //-- หยุดการทำงานของสคริปต์ทันที --
    exit;
}
?>