<?php
$url = "https://api.github.com/repos/torvalds/linux/commits/136df058b753066a3cc4c1fb7058fbca3f4337b5";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["User-Agent: MES-Team-Planner"]);
$output = curl_exec($ch);
$data = json_decode($output, true);
print_r($data["stats"] ?? "No stats");
?>
