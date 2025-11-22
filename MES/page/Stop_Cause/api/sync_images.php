<?php
// ใช้สำหรับ Sync รูปภาพที่อัปโหลดไปยัง Database ในกรณีโดนล้างข้อมูลในตาราง
// tools/sync_images.php
require_once __DIR__ . '/../db.php'; // ปรับ Path ให้ตรงกับไฟล์ db.php ของคุณ

// โฟลเดอร์รูปภาพ
$dir = __DIR__ . '/../uploads/maintenance/';
$files = scandir($dir);

echo "Starting Sync...<br>";

foreach ($files as $file) {
    if ($file == '.' || $file == '..') continue;

    // แกะชื่อไฟล์: before_ID_timestamp.ext หรือ after_ID_timestamp.ext
    if (preg_match('/^(before|after)_(\d+)_\d+\.\w+$/', $file, $matches)) {
        $type = $matches[1]; // before หรือ after
        $id = $matches[2];   // เลข ID
        
        // Path ที่ถูกต้องเพื่อบันทึกลง DB
        $dbPath = '../uploads/maintenance/' . $file;
        
        // ชื่อคอลัมน์ที่จะอัปเดต
        $column = ($type == 'before') ? 'photo_before_path' : 'photo_after_path';
        
        // อัปเดตลง Database (ทั้งตารางจริงและ Test)
        // หมายเหตุ: ต้องระวังเรื่อง ID ซ้ำถ้าใช้ทั้ง Test/Prod ปนกัน
        $sql = "UPDATE MAINTENANCE_REQUESTS_TEST SET $column = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$dbPath, $id]);
        
        if ($stmt->rowCount() > 0) {
            echo "Updated ID $id ($type) -> $dbPath <br>";
        }
    }
}
echo "Done.";
?>