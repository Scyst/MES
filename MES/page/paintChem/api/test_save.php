<?php
session_start();
$_POST['csrf_token'] = 'dummy';
$_SESSION['csrf_token'] = 'dummy';
$_SESSION['user'] = ['id' => 1, 'username' => 'verymaron01', 'role' => 'admin'];
$_POST['log_date'] = '2026-09-16';
$_POST['shift'] = 'DAY';
$_POST['time_slot'] = '15:00-16:00';
$_POST['station_no'] = 1;
$_POST['parameter_key'] = 'F_Al';
$_POST['before_value'] = '11.0';
$_POST['after_value'] = '';
$_POST['chemical_added_kg'] = '0.5';

require_once 'save_slot.php';
