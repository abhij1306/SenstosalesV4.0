
$Source = "c:\Projects\SenstoSales"
$TempDir = "C:\Projects\SenstoSales_Temp"
$ZipPath = "C:\Projects\SenstoSales_Source_Backup.zip"

Write-Host "Creating clean staging copy (Skipping node_modules, dist, .next)..." -ForegroundColor Cyan

# Remove temp if exists
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }

# Robocopy with Exclusions (/XD)
# Excludes: node_modules, .next (NextJS build), dist (EXE build), build (Pyinstaller temp), __pycache__, .git
robocopy $Source $TempDir /E /XD node_modules .next dist build __pycache__ backend_dist .git .agent /R:1 /W:1 /NFL /NDL /NJH /NJS

# Robocopy returns exit codes that aren't always 0 for success (1=files copied)
if ($LASTEXITCODE -ge 8) {
    Write-Host "Robocopy failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Zipping clean source..." -ForegroundColor Cyan
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }

Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force

Write-Host "Cleanup..."
Remove-Item -Recurse -Force $TempDir

Write-Host "Backup Complete: $ZipPath" -ForegroundColor Green
