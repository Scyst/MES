<?php
session_start();
$_SESSION['user'] = ['id' => 1, 'role' => 'admin', 'username' => 'admin', 'team_group' => 'TEAM 1'];
$_GET['action'] = 'read';
$_GET['entry_date'] = date('Y-m-d');
$_GET['section'] = 'ALL';
$_GET['team'] = 'TEAM 1';
require 'e:\MES\MES\MES\page\dailyPL\api\manage_pl_entry.php';