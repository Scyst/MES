<?php
// MES/page/Stop_Cause/print_job_order.php

// 1. เชื่อมต่อฐานข้อมูล
require_once __DIR__ . '/../db.php'; 
require_once __DIR__ . '/../../config/config.php';

// 2. เรียกใช้ไฟล์สร้าง PDF ตัวกลาง (ที่เราเพิ่งแก้ไป)
// ไฟล์นี้มีฟังก์ชัน generateJobOrderPDF() ที่ดึงชื่อจริงและจัด Layout สวยๆ ไว้แล้ว
require_once __DIR__ . '/api/generate_job_pdf.php'; 

// 3. ตรวจสอบสิทธิ์ (ถ้าต้องการให้เฉพาะคนล็อกอินดูได้ ให้ Uncomment บรรทัดล่าง)
// require_once __DIR__ . '/../../auth/check_auth.php';

// 4. รับค่า ID
if (!isset($_GET['id']) || empty($_GET['id'])) { 
    die("Error: Missing Job ID"); 
}

$id = intval($_GET['id']);

// 5. สั่งสร้าง PDF
// พารามิเตอร์ตัวสุดท้ายเป็น false = สั่งให้แสดงผลทางหน้าจอ (I - Inline) ทันที
$result = generateJobOrderPDF($pdo, $id, false);

// ถ้าฟังก์ชัน return null แสดงว่าหา Job ID ไม่เจอ
if ($result === null) {
    die("Error: Job ID $id not found.");
}
?>