<?php
// MES/page/Stop_Cause/print_job_order.php

// 1. เชื่อมต่อฐานข้อมูล
require_once __DIR__ . '/../db.php'; 
require_once __DIR__ . '/../../config/config.php';

// 2. เรียกใช้ไฟล์สร้าง PDF ตัวใหม่ (Compact Layout)
require_once __DIR__ . '/api/generate_job_pdf.php'; 

// 3. [SECURITY FIX] ตรวจสอบสิทธิ์ ห้ามข้าม Login เด็ดขาดเพื่อป้องกัน Information Disclosure
require_once __DIR__ . '/../../auth/check_auth.php';
// หากต้องการเช็คสิทธิ์ระดับ Permission ด้วย สามารถเพิ่ม: 
// requirePermission(['view_maintenance']);

// 4. รับค่า ID
if (!isset($_GET['id']) || empty($_GET['id'])) { 
    die("Error: Missing Job ID"); 
}

$id = intval($_GET['id']);

// 5. สั่งสร้าง PDF (false = แสดงผล Inline บน Browser ทันที)
$result = generateJobOrderPDF($pdo, $id, false);

if ($result === null) {
    die("Error: Job ID $id not found.");
}
?>