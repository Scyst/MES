<?php

//-- ฟังก์ชันสำหรับบันทึกการกระทำของผู้ใช้ (User Action Log) ลงในฐานข้อมูล --
function logAction(PDO $pdo, string $actor, string $action, ?string $target = null, ?string $detail = null): void {
    //-- ป้องกันการบันทึก Log หากไม่มีข้อมูลผู้กระทำหรือประเภทการกระทำ --
    if (empty($actor) || empty($action)) {
        return;
    }

    //-- เตรียมคำสั่ง SQL สำหรับเพิ่มข้อมูล Log --
    $sql = "INSERT INTO USER_LOGS (action_by, action_type, target_user, detail, created_at) VALUES (?, ?, ?, ?, GETDATE())";
    
    //-- พยายามบันทึก Log และดักจับข้อผิดพลาด (ถ้ามี) โดยไม่หยุดการทำงานหลัก --
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$actor, $action, $target, $detail]);
    } catch (PDOException $e) {
        //-- หากบันทึก Log ไม่สำเร็จ ให้บันทึก Error ไว้ในฝั่ง Server แทน --
        error_log("Failed to log user action: " . $e->getMessage());
    }
}
?>