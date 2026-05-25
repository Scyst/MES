$lines = Get-Content -Path "e:\MES\MES\MES\page\manpowerCopy\components\manpower_modals_bundle.php" -Encoding UTF8
$newLines = @()

for ($i = 0; $i -lt $lines.Length; $i++) {
    $lineNum = $i + 1
    
    if ($lineNum -ge 153 -and $lineNum -le 181) { continue }
    if ($lineNum -ge 205 -and $lineNum -le 312) { continue }
    if ($lineNum -ge 435 -and $lineNum -le 484) { continue }
    if ($lineNum -ge 812 -and $lineNum -le 853) { continue }

    $newLines += $lines[$i]
}

$newLines += ""
$newLines += "<?php require_once __DIR__ . '/master_settings_modal.php'; ?>"

$newLines | Set-Content -Path "e:\MES\MES\MES\page\manpowerCopy\components\manpower_modals_bundle.php" -Encoding UTF8
Write-Host "Modals refactored successfully!"
