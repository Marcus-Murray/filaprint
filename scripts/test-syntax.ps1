# Test script to verify PowerShell syntax
param(
    [switch]$SkipGit,
    [switch]$SkipDependencies
)

$PROJECT_ROOT = "C:\dev\FilaPrint"

# Test function
function Write-Log {
    param([string]$Message)
    Write-Host $Message
}

# Test conditional block
if (!$SkipGit) {
    Write-Host "Git section" -ForegroundColor Yellow
    try {
        Write-Log "Git test"
    }
    catch {
        Write-Host "Error" -ForegroundColor Red
    }
}

# Test another conditional block
if (!$SkipDependencies) {
    Write-Host "Dependencies section" -ForegroundColor Yellow
    try {
        Write-Log "Dependencies test"
    }
    catch {
        Write-Host "Error" -ForegroundColor Red
    }
}

Write-Host "Script completed" -ForegroundColor Green
