<?php
// Mock server variables to avoid notices
$_SERVER['REQUEST_METHOD'] = 'GET';
$_REQUEST['action'] = 'sync_manpower';
$_REQUEST['actionBy'] = 'SYSTEM';
$_GET['actionBy'] = 'SYSTEM';

echo "Running Manpower External Sync...\n";
require_once __DIR__ . '/page/manpower/api/sync_from_api.php';

echo "\n\nRunning User Internal Sync...\n";
require_once __DIR__ . '/page/userManage/api/userManage.php';
echo "\nSync Complete.\n";
