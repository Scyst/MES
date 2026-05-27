$baseUrl = "https://oem.sncformer.com/iot-toolbox/sandbox-b9/MES/MES"

try {
    Write-Host "Triggering External API Sync..."
    $response1 = Invoke-RestMethod -Uri "$baseUrl/page/manpower/api/sync_from_api.php" -Method GET
    Write-Host "External Sync Result: $($response1 | ConvertTo-Json -Depth 5)"
    
    Write-Host "Triggering User Sync..."
    $response2 = Invoke-RestMethod -Uri "$baseUrl/page/userManage/api/userManage.php?action=sync_manpower&actionBy=SYSTEM" -Method GET
    Write-Host "User Sync Result: $($response2 | ConvertTo-Json -Depth 5)"
} catch {
    Write-Error "Sync failed: $(_)"
}
