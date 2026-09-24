$files = @(
  "src\components\AddEventModal.jsx",
  "src\components\AddProjectModal.jsx",
  "src\components\AddSpaceModal.jsx",
  "src\components\InviteTeamModal.jsx",
  "src\components\ProfileSettingsModal.jsx",
  "src\components\SpaceView.jsx",
  "src\components\TaskBoard.jsx",
  "src\components\MyTasks.jsx",
  "src\components\LinkHub.jsx",
  "src\components\workload\MemberWorkloadModal.jsx"
)

foreach ($file in $files) {
  Write-Host "=== $file ===" -ForegroundColor Cyan
  $submitLines = Select-String -Path $file -Pattern "onSubmit|handleSubmit|handleSave|onSave\(" | Select-Object LineNumber, Line
  $guardLines  = Select-String -Path $file -Pattern "isSaving|isSubmitting|isLoading|disabled.*submit" | Select-Object LineNumber, Line
  Write-Host "  SUBMIT handlers:" 
  $submitLines | ForEach-Object { Write-Host "    L$($_.LineNumber): $($_.Line.Trim())" }
  Write-Host "  GUARDS:"
  $guardLines  | ForEach-Object { Write-Host "    L$($_.LineNumber): $($_.Line.Trim())" }
  Write-Host ""
}
