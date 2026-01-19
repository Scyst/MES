<?php
// MES/page/components/init.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/php/check_dev_mode.php';
require_once __DIR__ . '/php/logger.php';

?>