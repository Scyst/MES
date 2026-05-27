<?php
session_start();
$_SESSION['user'] = ['id' => 1, 'role' => 'admin', 'username' => 'admin', 'team_group' => 'TEAM 1'];
$_GET['action'] = 'get_initial_data';
require 'e:\MES\MES\MES\page\dailyLog\api\dailyLogManage.php';