<?php
require_once __DIR__ . '/../api/db.php';

$users = [
    ['__creator__070676__33025__Scyst__', 'H2P[forever]', 'creator'],
    ['verymaron01', 'numthong01', 'admin'],
    ['SncToolbox', 'SncToolbox@2025', 'admin'],
    ['Assembly', 'Assembly@2025', 'supervisor'],
    ['Spot', 'Spot@2025', 'supervisor'],
    ['Bend', 'Bend@2025', 'supervisor'],
    ['Laser', 'Laser@2025', 'supervisor'],
    ['Paint', 'Paint@2025', 'supervisor'],
    ['Press', 'Press@2025', 'supervisor'],
];

echo "<pre style='font-family: monospace; background-color: #333; color: #fff; padding: 15px; border-radius: 5px;'>";
echo "Starting user creation/validation process...\n\n";

try {
    $sql = "INSERT INTO IOT_TOOLBOX_USERS (username, password, role, created_at) VALUES (?, ?, ?, GETDATE())";
    $stmt = $pdo->prepare($sql);

    // วนลูปเพื่อสร้างผู้ใช้แต่ละคน
    foreach ($users as $userData) {
        $username = $userData[0];
        $plainPassword = $userData[1];
        $role = $userData[2];

        $hashedPassword = password_hash($plainPassword, PASSWORD_DEFAULT);

        try {
            $stmt->execute([$username, $hashedPassword, $role]);
            echo "SUCCESS: User '{$username}' (Role: {$role}) created.\n";
        } catch (PDOException $e) {
            if ($e->getCode() == '23000') {
                echo "INFO: User '{$username}' already exists. Skipping.\n";
            } else {
                echo "ERROR: Could not create user '{$username}'. Reason: " . $e->getMessage() . "\n";
            }
        }
    }

} catch (PDOException $e) {
    die("FATAL ERROR: A database error occurred during preparation. " . $e->getMessage());
}

echo "\nProcess finished.\n";

if (@unlink(__FILE__)) {
    echo "INFO: Setup script 'create_user.php' has been deleted successfully.\n";
} else {
    echo "WARNING: Could not delete the setup script. Please delete it manually for security reasons.\n";
}

echo "</pre>";
?>