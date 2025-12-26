<?php
// MES/page/components/init.php

// 1. เริ่ม Session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 2. เรียก Config
// Path: จาก MES/page/components/ -> ถอย 2 ชั้น (../../) ไปที่ root ของ MES
require_once __DIR__ . '/../../config/config.php';

// 3. เรียก Authentication
// Path: ถอย 2 ชั้น (../../) เช่นกัน
require_once __DIR__ . '/../../auth/check_auth.php';

// 4. เรียก Check Dev Mode
// Path: ไฟล์นี้อยู่ในโฟลเดอร์ php ที่อยู่ในระดับเดียวกัน (ต้องมุดเข้าไป)
require_once __DIR__ . '/php/check_dev_mode.php';

?>