<?php
// api/helpers/inventory_helper.php

/**
 * ค้นหา location_id จาก location_name (เช่น ชื่อ Line จากระบบเก่า)
 * @return int|null คืนค่า location_id หรือ null หากไม่พบ
 */
function getLocationId($pdo, $locationName) {
    // สมมติว่าชื่อ Line ในระบบเก่าตรงกับ location_name ในระบบใหม่
    $stmt = $pdo->prepare("SELECT location_id FROM " . LOCATIONS_TABLE . " WHERE location_name = ?");
    $stmt->execute([$locationName]);
    $result = $stmt->fetchColumn();
    return $result ? (int)$result : null;
}

/**
 * ค้นหา item_id จากข้อมูลระบบเก่า (Part No, Line, Model)
 * @return int|null คืนค่า item_id หรือ null หากไม่พบ
 */
function getItemId($pdo, $partNo, $line, $model) {
    // 1. ค้นหา SAP No. จากตาราง PARAMETER_TEST ก่อน
    $paramStmt = $pdo->prepare(
        "SELECT sap_no FROM " . PARAM_TABLE . " WHERE part_no = ? AND line = ? AND model = ?"
    );
    $paramStmt->execute([$partNo, $line, $model]);
    $sap_no = $paramStmt->fetchColumn();

    if (!$sap_no) {
        return null; // ไม่พบ Parameter ที่ตรงกัน
    }

    // 2. ใช้ SAP No. ที่ได้ไปค้นหา item_id ในตาราง ITEMS_TEST
    $itemStmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
    $itemStmt->execute([$sap_no]);
    $result = $itemStmt->fetchColumn();
    
    return $result ? (int)$result : null;
}

/**
 * ฟังก์ชันหลักสำหรับอัปเดตยอดคงเหลือในตาราง INVENTORY_ONHAND_TEST
 * @param PDO $pdo - PDO connection object
 * @param int $itemId - ID ของสินค้าจากตาราง ITEMS_TEST
 * @param int $locationId - ID ของสถานที่จากตาราง LOCATIONS_TEST
 * @param float $quantityChange - จำนวนที่เปลี่ยนแปลง (บวกสำหรับเพิ่ม, ลบสำหรับลด)
 * @return bool - คืนค่า true หากสำเร็จ
 */
function updateOnhandBalance($pdo, $itemId, $locationId, $quantityChange) {
    if ($itemId === null || $locationId === null) {
        // ไม่สามารถอัปเดตได้หากไม่มี item_id หรือ location_id
        error_log("UpdateOnhandBalance failed: Missing itemId or locationId.");
        return false;
    }
    
    // ใช้ MERGE statement เพื่อ อัปเดตถ้ามีรายการอยู่แล้ว หรือ เพิ่มใหม่ถ้ายังไม่มี
    $sql = "
        MERGE " . ONHAND_TABLE . " AS target
        USING (SELECT ? AS item_id, ? AS location_id) AS source
        ON (target.parameter_id = source.item_id AND target.location_id = source.location_id)
        WHEN MATCHED THEN
            UPDATE SET quantity = target.quantity + ?, last_updated = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (parameter_id, location_id, quantity, last_updated) 
            VALUES (source.item_id, source.location_id, ?, GETDATE());
    ";
    
    $stmt = $pdo->prepare($sql);
    // สำหรับ WHEN NOT MATCHED (INSERT) ค่าเริ่มต้นคือ 0 + quantityChange
    $initialQuantity = max(0, $quantityChange); 
    
    return $stmt->execute([$itemId, $locationId, $quantityChange, $initialQuantity]);
}
?>