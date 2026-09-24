<?php
require_once 'api/db_helper.php';
\ = \->query("SELECT username, fullname, aka FROM USERS WHERE username = 'verymaron01'");
\ = \->fetch(PDO::FETCH_ASSOC);
echo json_encode(\);
?>
