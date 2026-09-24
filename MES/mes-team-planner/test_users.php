<?php
require_once 'api/db_helper.php';
\ = \->query("SELECT username, fullname, role, aka FROM USERS WHERE is_active = 1 ORDER BY fullname ASC");
while (\ = \->fetch(PDO::FETCH_ASSOC)) {
    if (\['fullname'] === 'ณภัทร นุ่มทอง') {
        echo json_encode(\) . "\n";
    }
}
?>
