# Cleanup and Restart Script for FilaPrint
# Simple, safe script to stop processes and restart servers

param(
    [switch]$SkipRestart
)

$ErrorActionPreference = "Continue"

Write-Host "=== FilaPrint Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Find processes on ports 3000 and 5173
Write-Host "Finding processes on ports 3000 and 5173..." -ForegroundColor Yellow

$processesToStop = @()

# Check port 3000
try {
    $netstat3000 = netstat -ano | Select-String ":3000.*LISTENING"
    if ($netstat3000) {
        foreach ($line in $netstat3000) {
            if ($line -match 'LISTENING\s+(\d+)') {
                $processId = $matches[1]
                $processesToStop += $processId
                Write-Host "  Port 3000: PID $processId" -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "  Could not check port 3000" -ForegroundColor Red
}

# Check port 5173
try {
    $netstat5173 = netstat -ano | Select-String ":5173.*LISTENING"
    if ($netstat5173) {
        foreach ($line in $netstat5173) {
            if ($line -match 'LISTENING\s+(\d+)') {
                $processId = $matches[1]
                $processesToStop += $processId
                Write-Host "  Port 5173: PID $processId" -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "  Could not check port 5173" -ForegroundColor Red
}

# Step 2: Stop found processes
if ($processesToStop.Count -eq 0) {
    Write-Host "No processes found on ports 3000 or 5173" -ForegroundColor Green
} else {
    Write-Host "`nStopping $($processesToStop.Count) process(es)..." -ForegroundColor Yellow
    $uniquePids = $processesToStop | Select-Object -Unique

    foreach ($processId in $uniquePids) {
        try {
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Stopping PID $processId..." -ForegroundColor Cyan
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Start-Sleep -Milliseconds 500
            }
        } catch {
            Write-Host "  Warning: Could not stop PID $processId" -ForegroundColor Red
        }
    }

    Write-Host "Waiting 2 seconds for cleanup..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

# Step 3: Verify
Write-Host "`nVerifying ports..." -ForegroundColor Yellow
$still3000 = netstat -ano | Select-String ":3000.*LISTENING"
$still5173 = netstat -ano | Select-String ":5173.*LISTENING"

if ($still3000 -or $still5173) {
    Write-Host "Warning: Some ports may still be in use" -ForegroundColor Yellow
} else {
    Write-Host "All ports are free!" -ForegroundColor Green
}

# Step 4: Start servers (unless skipped)
if (-not $SkipRestart) {
    Write-Host "`n=== Starting FilaPrint ===" -ForegroundColor Cyan
    Write-Host "Backend:  http://localhost:3000" -ForegroundColor White
    Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
    Write-Host "`nPress Ctrl+C to stop both servers" -ForegroundColor Yellow
    Write-Host ""

    # Change to project directory
    Set-Location $PSScriptRoot\..

    # Start development servers
    npm run dev:full
} else {
    Write-Host "`nSkipping restart. To start manually, run: npm run dev:full" -ForegroundColor Cyan
}
