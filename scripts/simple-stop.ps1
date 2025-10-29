# Simple script to just stop processes on ports 3000 and 5173

Write-Host "Stopping processes on ports 3000 and 5173..." -ForegroundColor Yellow

# Get PIDs from netstat
$pids = @()

try {
    $output = netstat -ano | Select-String ":(3000|5173).*LISTENING"
    foreach ($line in $output) {
        if ($line -match 'LISTENING\s+(\d+)') {
            $processId = [int]$matches[1]
            $pids += $processId
        }
    }

    if ($pids.Count -eq 0) {
        Write-Host "No processes found on ports 3000 or 5173" -ForegroundColor Green
    } else {
        $uniquePids = $pids | Select-Object -Unique
        Write-Host "Found $($uniquePids.Count) process(es) to stop" -ForegroundColor Cyan

        foreach ($processId in $uniquePids) {
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Write-Host "  Stopped PID $processId" -ForegroundColor Green
            } catch {
                Write-Host "  Could not stop PID $processId" -ForegroundColor Red
            }
        }

        Write-Host "`nDone! You can now start fresh with: npm run dev:full" -ForegroundColor Green
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

