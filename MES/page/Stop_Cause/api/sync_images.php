<?php
// tools/sync_images.php
require_once __DIR__ . '/../db.php';

$dir = __DIR__ . '/../uploads/maintenance/';
$files = scandir($dir);

echo "Starting Sync...<br>";

foreach ($files as $file) {
    if ($file == '.' || $file == '..') continue;

    if (preg_match('/^(before|after)_(\d+)_\d+\.\w+$/', $file, $matches)) {
        $type = $matches[1];
        $id = $matches[2];
        $dbPath = '../uploads/maintenance/' . $file;
        $column = ($type == 'before') ? 'photo_before_path' : 'photo_after_path';
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