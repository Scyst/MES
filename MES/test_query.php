<?php require 'config/config.php'; require 'config/database.php'; \ = \->query('SELECT TOP 1 * FROM STOCK_TRANSACTIONS'); print_r(\->fetch(PDO::FETCH_ASSOC)); ?>
