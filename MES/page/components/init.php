<?php
// MES/page/components/init.php

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/php/logger.php';
require_once __DIR__ . '/php/i18n.php';

// Force no-cache globally for all pages to prevent stale UI issues
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: 0");
?>