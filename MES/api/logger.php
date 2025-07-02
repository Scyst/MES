<?php
/**
 * 
 *
 * @param PDO $pdo Object การเชื่อมต่อฐานข้อมูล
 * @param string $actor ชื่อผู้ใช้ที่กระทำ
 * @param string $action ประเภทของการกระทำ (เช่น 'CREATE USER', 'UPDATE PART')
 * @param ?string $target ID หรือชื่อของสิ่งที่ถูกกระทำ
 * @param ?string $detail รายละเอียดเพิ่มเติม
 * @return void
 */
function logAction(PDO $pdo, string $actor, string $action, ?string $target = null, ?string $detail = null): void {
    if (empty($actor) || empty($action)) {
        return;
    }

    $sql = "INSERT INTO IOT_TOOLBOX_USER_LOGS (action_by, action_type, target_user, detail, created_at) VALUES (?, ?, ?, ?, GETDATE())";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$actor, $action, $target, $detail]);
    } catch (PDOException $e) {
        error_log("Failed to log user action: " . $e->getMessage());
    }
}
?>