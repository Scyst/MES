<?php

function logAction(PDO $pdo, string $actor, string $action, ?string $target = null, ?string $detail = null): void {
    if (empty($actor) || empty($action)) {
        return;
    }

    $sql = "INSERT INTO " . USER_LOGS_TABLE . " (action_by, action_type, target_user, detail, created_at) VALUES (?, ?, ?, ?, GETDATE())";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$actor, $action, $target, $detail]);
    } catch (PDOException $e) {
        error_log("Failed to log user action: " . $e->getMessage());
    }
}
?>