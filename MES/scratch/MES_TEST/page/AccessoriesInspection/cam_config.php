<?php
/**
 * cam_config.php — Machine-specific upstream configuration
 *
 * คัดลอกไฟล์นี้เป็น cam_config.php แล้วแก้ค่าให้ตรงกับเครื่องที่ติดตั้ง
 * ไฟล์ cam_config.php ถูก exclude จาก git (แต่ละสายการผลิตมีค่าต่างกัน)
 *
 * ── Port convention ──────────────────────────────────────────────────────────
 *   ใช้ port ในช่วง 5700–5799 เพื่อลดการชนกับแอปอื่น
 *   ตัวอย่าง:
 *     สาย 1  → 5701   (config.json: "stream_port": 5701)
 *     สาย 2  → 5702
 *     สาย 3  → 5703
 */

define('CAM_UPSTREAM', 'http://172.101.9.130:5701');
define('CAM_API_KEY',  'assembly-line-Accessories-Inspection-2026');   // ต้องตรงกับ "api_key" ใน config.json ของ Python
