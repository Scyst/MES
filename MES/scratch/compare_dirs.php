<?php
$prodDir = __DIR__ . '/MES/MES';
$testDir = __DIR__ . '/MES_TEST';

function getDirContents($dir, &$results = array(), $base = '') {
    $files = scandir($dir);
    foreach ($files as $key => $value) {
        $path = realpath($dir . DIRECTORY_SEPARATOR . $value);
        if (!is_dir($path)) {
            $results[str_replace('\\', '/', $base . '/' . $value)] = filesize($path);
        } else if ($value != "." && $value != "..") {
            getDirContents($path, $results, $base . '/' . $value);
        }
    }
    return $results;
}

$prodFiles = getDirContents($prodDir);
$testFiles = getDirContents($testDir);

$diff = array(
    'onlyInProd' => array(),
    'onlyInTest' => array(),
    'differentSize' => array()
);

foreach ($prodFiles as $file => $size) {
    if (!array_key_exists($file, $testFiles)) {
        $diff['onlyInProd'][] = $file;
    } else {
        if ($size !== $testFiles[$file]) {
            $diff['differentSize'][] = array('file' => $file, 'prod' => $size, 'test' => $testFiles[$file]);
        }
    }
}

foreach ($testFiles as $file => $size) {
    if (!array_key_exists($file, $prodFiles)) {
        $diff['onlyInTest'][] = $file;
    }
}

header('Content-Type: application/json');
echo json_encode($diff, JSON_PRETTY_PRINT);
?>
