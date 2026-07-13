<?php
require_once __DIR__ . '/../../../db.php';
require_once __DIR__ . '/../../../config/config.php';

$teamSql = "SELECT DISTINCT team_group FROM " . USERS_TABLE . " WITH (NOLOCK) WHERE team_group IS NOT NULL AND team_group != '' ORDER BY team_group ASC";
$teams = $pdo->query($teamSql)->fetchAll(PDO::FETCH_COLUMN);
echo json_encode($teams);
?>
