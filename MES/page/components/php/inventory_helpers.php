<?php
/**
 * inventory_helpers.php
 * * รวมฟังก์ชันที่จำเป็นสำหรับจัดการสต็อกสินค้า (Inventory)
 * ไฟล์นี้ถูกสร้างขึ้นใหม่โดยคัดลอกเฉพาะฟังก์ชันที่ยังใช้งานอยู่จากไฟล์ helper เดิม
 */

if (!function_exists('updateOnhandBalance')) {
    /**
     * อัปเดตยอดสต็อกคงเหลือ (On-hand) ในฐานข้อมูล
     * ฟังก์ชันนี้จะบวกหรือลบสต็อกตามจำนวนที่เปลี่ยนแปลง และสามารถรองรับสต็อกติดลบได้
     *
     * @param PDO $pdo Object สำหรับเชื่อมต่อฐานข้อมูล
     * @param int $item_id ID ของสินค้าที่ต้องการอัปเดต
     * @param int $location_id ID ของคลังที่ต้องการอัปเดต
     * @param float $quantity_change จำนวนที่เปลี่ยนแปลง (บวกสำหรับเพิ่ม, ลบสำหรับลด)
     * @return bool คืนค่า true เสมอเมื่อทำงานสำเร็จ
     */
    function updateOnhandBalance(PDO $pdo, int $item_id, int $location_id, float $quantity_change): bool
    {
        // ใช้คำสั่ง MERGE เพื่อจัดการการอัปเดต (ถ้ามีข้อมูลอยู่แล้ว) หรือเพิ่มข้อมูลใหม่ (ถ้ายังไม่มี) ได้ในคำสั่งเดียว
        $mergeSql = "MERGE " . ONHAND_TABLE . " AS target 
                        USING (SELECT ? AS item_id, ? AS location_id) AS source 
                        ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) 
                        WHEN MATCHED THEN 
                            UPDATE SET quantity = target.quantity + ?, last_updated = GETDATE() 
                        WHEN NOT MATCHED THEN 
                            INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
        
        $stmt = $pdo->prepare($mergeSql);
        
        // สำหรับรายการใหม่ (WHEN NOT MATCHED) ค่า quantity เริ่มต้นก็คือค่าที่เปลี่ยนแปลงนั่นเอง
        $stmt->execute([$item_id, $location_id, $quantity_change, $item_id, $location_id, $quantity_change]);
        
        return true; // ฟังก์ชันนี้จะคืนค่า true เสมอเมื่อทำงานสำเร็จ
    }
}