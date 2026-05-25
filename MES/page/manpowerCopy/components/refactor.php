<?php
$file = __DIR__ . '/manpower_modals_bundle.php';
$lines = file($file);

$newLines = [];

for ($i = 0; $i < count($lines); $i++) {
    $lineNum = $i + 1;
    
    // Skip shiftPlannerModal (153-181)
    if ($lineNum >= 153 && $lineNum <= 181) continue;
    
    // Skip empListModal (205-312)
    if ($lineNum >= 205 && $lineNum <= 312) continue;
    
    // Skip mappingModal (435-484)
    if ($lineNum >= 435 && $lineNum <= 484) continue;
    
    // Skip teamSettingsModal (812-853)
    if ($lineNum >= 812 && $lineNum <= 853) continue;

    $newLines[] = $lines[$i];
}

$newLines[] = "\n";
$newLines[] = "<?php require_once __DIR__ . '/master_settings_modal.php'; ?>\n";

file_put_contents($file, implode("", $newLines));
echo "Done refactoring modals.";
