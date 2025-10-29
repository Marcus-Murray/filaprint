# Compliance and Health Monitoring Script
# Runs in background to continuously monitor MCP servers and rule compliance

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$PID_FILE = "$PROJECT_ROOT\logs\mcp-servers.pid"
$COMPLIANCE_LOG = "$PROJECT_ROOT\logs\prompting-compliance.log"

function Write-ComplianceLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $COMPLIANCE_LOG -Value $logEntry
}

# Compliance checkpoints based on promptingguide.ai and cursor.directory rules
function Check-Compliance {
    $issues = @()

    # Check TypeScript configuration
    $tsconfig = "$PROJECT_ROOT\tsconfig.json"
    if (Test-Path $tsconfig) {
        $tsContent = Get-Content $tsconfig -Raw
        if (!$tsContent.Contains('"strict": true')) {
            $issues += "TypeScript strict mode not enabled"
        }
    }

    # Check ESLint configuration
    $eslintConfig = "$PROJECT_ROOT\.eslintrc.json"
    if (!(Test-Path $eslintConfig)) {
        $issues += "ESLint configuration missing"
    }

    # Check security headers in server
    $serverIndex = "$PROJECT_ROOT\server\index.ts"
    if (Test-Path $serverIndex) {
        $serverContent = Get-Content $serverIndex -Raw
        if (!$serverContent.Contains('helmet')) {
            $issues += "Security headers (Helmet) not configured"
        }
        if (!$serverContent.Contains('rateLimit') -and !$serverContent.Contains('rate-limit')) {
            $issues += "Rate limiting not configured"
        }
    }

    # Check input validation
    $zodSchema = "$PROJECT_ROOT\shared\schemas\validation.ts"
    if (!(Test-Path $zodSchema)) {
        $issues += "Zod validation schemas missing"
    }

    return $issues
}

# Health check function
function Check-ServerHealth {
    if (!(Test-Path $PID_FILE)) {
        Write-ComplianceLog "WARNING: PID file not found - servers may not be running" "WARN"
        return $false
    }

    $pids = Get-Content $PID_FILE -ErrorAction SilentlyContinue
    $allRunning = $true

    foreach ($pidEntry in $pids) {
        if ([string]::IsNullOrWhiteSpace($pidEntry)) { continue }

        $parts = $pidEntry.Split(":")
        if ($parts.Length -ne 2) { continue }

        $serverName = $parts[0]
        $pid = [int]$parts[1]

        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if (-not $process) {
                Write-ComplianceLog "WARNING: Server $serverName (PID: $pid) is not running" "WARN"
                $allRunning = $false
            }
        } catch {
            Write-ComplianceLog "ERROR: Could not check process for $serverName" "ERROR"
            $allRunning = $false
        }
    }

    return $allRunning
}

# Main monitoring loop
Write-ComplianceLog "Starting compliance and health monitoring"
Write-Host "🩺 Compliance monitoring started" -ForegroundColor Cyan

$healthCheckInterval = 60  # seconds
$complianceCheckInterval = 300  # 5 minutes
$lastComplianceCheck = 0

while ($true) {
    try {
        $currentTime = (Get-Date).TimeOfDay.TotalSeconds

        # Health check every minute
        if ($currentTime % $healthCheckInterval -lt 5) {
            $healthy = Check-ServerHealth
            if ($healthy) {
                Write-ComplianceLog "Health check: All servers running" "INFO"
            }
        }

        # Compliance check every 5 minutes
        if (($currentTime - $lastComplianceCheck) -ge $complianceCheckInterval) {
            $issues = Check-Compliance
            if ($issues.Count -eq 0) {
                Write-ComplianceLog "Compliance check: All rules passing" "INFO"
            } else {
                Write-ComplianceLog "Compliance check: Issues found - $($issues -join ', ')" "WARN"
            }
            $lastComplianceCheck = $currentTime
        }

        Start-Sleep -Seconds 10
    }
    catch {
        Write-ComplianceLog "ERROR in monitoring loop: $($_.Exception.Message)" "ERROR"
        Start-Sleep -Seconds 30
    }
}


