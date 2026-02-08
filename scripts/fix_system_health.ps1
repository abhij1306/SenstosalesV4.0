# fix_system_health.ps1
# This script resolves environment issues identified during system diagnostics.

Write-Host "Starting System Health Fix..." -ForegroundColor Cyan

# 1. Set HOME variable (Fixes Browser/Playwright errors)
Write-Host "Action: Setting HOME environment variable..." -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable("HOME", "C:\Users\abhij", "User")
$env:HOME = "C:\Users\abhij"
Write-Host "HOME set to C:\Users\abhij" -ForegroundColor Green

# 2. Cleanup PATH (Removes old Python versions)
Write-Host "Action: Cleaning up PATH..." -ForegroundColor Yellow
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathParts = $currentPath -split ';'
$cleanedParts = $pathParts | Where-Object { 
    $_ -notmatch "Python310" -and 
    $_ -notmatch "Python311"
}
$newPath = $cleanedParts -join ';'

[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
$env:Path = $newPath
Write-Host "Removed Python 3.10 and 3.11 from User PATH." -ForegroundColor Green

Write-Host "System Health Fix Complete. Please restart your terminal/editor to apply all changes." -ForegroundColor Cyan
