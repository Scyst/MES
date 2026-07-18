<?php
$url = 'https://oem.sncformer.com/iot-toolbox/sandbox-b9/Clone/MES/page/OEE_Dashboard/api/oeeDashboardApi.php?action=getFilters';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);
echo "Clone response:\n";
echo $response;
echo "\n\n";

$url2 = 'https://oem.sncformer.com/iot-toolbox/sandbox-b9/MES/MES/page/OEE_Dashboard/api/oeeDashboardApi.php?action=getFilters';
$ch2 = curl_init($url2);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
$response2 = curl_exec($ch2);
curl_close($ch2);
echo "Prod response:\n";
echo $response2;
?>
