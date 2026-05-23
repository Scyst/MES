<?php
function searchDir($dir, $pattern) {
    $results = [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getExtension() === 'php') {
            $content = file_get_contents($file->getPathname());
            if (preg_match_all($pattern, $content, $matches, PREG_OFFSET_CAPTURE)) {
                foreach ($matches[0] as $match) {
                    $lines = explode("\n", substr($content, 0, $match[1]));
                    $lineNo = count($lines);
                    $results[] = $file->getPathname() . ':' . $lineNo . ' => ' . trim($match[0]);
                }
            }
        }
    }
    return $results;
}

$patterns = [
    'SQL_INJECTION' => '/(query|prepare|exec)\s*\(\s*["\'][^"\']*?\$_(GET|POST|REQUEST|COOKIE).*?["\']\s*\)/i',
    'SQL_CONCAT' => '/(query|prepare|exec)\s*\(\s*["\'].*?["\']\s*\.\s*\$_(GET|POST|REQUEST|COOKIE).*?\)/i',
    'XSS_ECHO' => '/echo\s+.*\$_(GET|POST|REQUEST).*?;/i',
    'FILE_INCLUSION' => '/(include|require)(_once)?\s*\(?\s*.*\$_(GET|POST|REQUEST).*?\)?\s*;/i',
    'COMMAND_INJECTION' => '/(exec|system|shell_exec|passthru|popen|proc_open)\s*\(\s*.*\$_(GET|POST|REQUEST).*?\s*\)/i'
];

foreach ($patterns as $name => $pattern) {
    echo "=== $name ===\n";
    $results = searchDir('E:/MES/MES/MES/page', $pattern);
    if (empty($results)) {
        echo "None found.\n";
    } else {
        foreach ($results as $res) {
            echo "$res\n";
        }
    }
    echo "\n";
}
?>
