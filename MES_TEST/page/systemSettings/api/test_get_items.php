<?php
session_start();
\['user'] = ['role' => 'admin'];
\['action'] = 'get_items';
\['filter_material'] = 'UNCLASSIFIED';
require 'e:\MES\MES\MES_TEST\page\systemSettings\api\itemMasterManage.php';
