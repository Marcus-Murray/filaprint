# Simple test script
param([switch]$SkipGit)

Write-Host "Starting script..." -ForegroundColor Green

if (!$SkipGit) {
    Write-Host "Git section" -ForegroundColor Yellow
    try {
        Write-Host "Git test" -ForegroundColor White
    }
    catch {
        Write-Host "Error" -ForegroundColor Red
    }
}

Write-Host "Script completed" -ForegroundColor Green
