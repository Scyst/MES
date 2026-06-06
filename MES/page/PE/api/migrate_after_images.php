<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

$stmt = $pdo->query("
    SELECT PE.wo_id, PE.legacy_id, MR.photo_after_path 
    FROM PE_WORK_ORDERS PE 
    INNER JOIN MAINTENANCE_REQUESTS MR ON PE.legacy_id = MR.id 
    WHERE MR.photo_after_path IS NOT NULL AND PE.photo_after IS NULL
");

$count = 0;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $oldPath = __DIR__ . '/../../' . str_replace('../', '', $row['photo_after_path']);
    if (file_exists($oldPath)) {
        $fileInfo = pathinfo($oldPath);
        $newName = 'LEGACY_AFTER_' . $row['legacy_id'] . '_' . time() . '.' . ($fileInfo['extension'] ?? 'jpg');
        $newAbsPath = __DIR__ . '/../../../uploads/pe_images/' . $newName;
        
        if (copy($oldPath, $newAbsPath)) {
            $photoAfter = 'uploads/pe_images/' . $newName;
            $update = $pdo->prepare("UPDATE PE_WORK_ORDERS SET photo_after = ? WHERE wo_id = ?");
            $update->execute([$photoAfter, $row['wo_id']]);
            $count++;
        }
    }
}

echo "Migrated $count photo_after_path images.";
?>
