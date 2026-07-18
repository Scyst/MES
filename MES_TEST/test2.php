<?php
$_GET = ['action' => 'get_items', 'page' => '1', 'limit' => '50'];
$_REQUEST = $_GET;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'dummy';
session_start();
$_SESSION['csrf_token'] = 'dummy';
$_SESSION['user'] = ['role' => 'admin', 'username' => 'System'];
chdir('e:/MES/MES/MES_TEST/page/systemSettings/api');
require 'itemMasterManage.php';
