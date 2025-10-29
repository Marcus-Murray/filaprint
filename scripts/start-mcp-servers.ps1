# FilaPrint MCP Servers Autostart Script
# Run this script when starting Cursor IDE

param(
    [switch]$Verbose,
    [switch]$SkipSecurity,
    [switch]$SkipQuality,
    [switch]$SkipDocumentation,
    [switch]$SkipTesting,
    [switch]$SkipDeployment
)

# Configuration
$PROJECT_ROOT = "C:\dev\FilaPrint"
$LOG_FILE = "$PROJECT_ROOT\logs\mcp-autostart.log"
$PID_FILE = "$PROJECT_ROOT\logs\mcp-servers.pid"

# Create logs directory if it doesn't exist
if (!(Test-Path "$PROJECT_ROOT\logs")) {
    New-Item -ItemType Directory -Path "$PROJECT_ROOT\logs" -Force
}

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $LOG_FILE -Value $logEntry
}

# Error handling
function Handle-Error {
    param([string]$ErrorMessage, [string]$ServerName)
    Write-Log "ERROR: $ErrorMessage" "ERROR"
    Write-Host "[ERROR] Failed to start $ServerName" -ForegroundColor Red
}

# Start MCP Server function
function Start-MCPServer {
    param(
        [string]$ServerName,
        [string]$ServerPath,
        [hashtable]$Environment = @{}
    )

    try {
        Write-Log "Starting $ServerName server..."

        # Check if server directory exists
        if (!(Test-Path $ServerPath)) {
            Write-Log "ERROR: Server directory not found: $ServerPath" "ERROR"
            Write-Host "ERROR: ${ServerName}: Directory not found: $ServerPath" -ForegroundColor Red
            return $null
        }

        # Install dependencies if needed
        $nodeModulesPath = Join-Path $ServerPath "node_modules"
        if (!(Test-Path $NodeModulesPath)) {
            Write-Log "Installing dependencies for $ServerName..."
            Push-Location $ServerPath
            try {
                npm install --silent 2>&1 | Out-Null
            }
            finally {
                Pop-Location
            }
        }

        # Build TypeScript if needed
        $distPath = Join-Path $ServerPath "dist"
        $srcPath = Join-Path $ServerPath "src"
        if (!(Test-Path $distPath) -and (Test-Path $srcPath)) {
            Write-Log "Building TypeScript for $ServerName..."
            Push-Location $ServerPath
            try {
                npm run build --silent 2>&1 | Out-Null
            }
            finally {
                Pop-Location
            }
        }

        # Set environment variables
        $env:PROJECT_ROOT = $PROJECT_ROOT
        foreach ($key in $Environment.Keys) {
            Set-Item -Path "env:$key" -Value $Environment[$key]
        }

        # Determine entry point
        $entryPoint = Join-Path $ServerPath "dist/index.js"
        if (!(Test-Path $entryPoint)) {
            # Try dev mode with tsx
            $entryPoint = Join-Path $ServerPath "src/index.ts"
            if (Test-Path $entryPoint) {
                $Command = "npx"
                $Arguments = @("tsx", $entryPoint)
            } else {
                Write-Log "ERROR: No entry point found for $ServerName" "ERROR"
                return $null
            }
        } else {
            $Command = "node"
            $Arguments = @($entryPoint)
        }

        # Start the server process
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = $Command
        $processInfo.Arguments = $Arguments -join " "
        $processInfo.WorkingDirectory = $ServerPath
        $processInfo.UseShellExecute = $false
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.CreateNoWindow = $true

        $process = [System.Diagnostics.Process]::Start($processInfo)

        # Store PID for cleanup
        Add-Content -Path $PID_FILE -Value "${ServerName}:$($process.Id)"

        Write-Log "$ServerName server started with PID $($process.Id)" "SUCCESS"
        Write-Host "[OK] $ServerName server started (PID: $($process.Id))" -ForegroundColor Green

        return $process
    }
    catch {
        Handle-Error $_.Exception.Message $ServerName
        return $null
    }
}

# Main execution
Write-Host "[START] Starting FilaPrint MCP Servers..." -ForegroundColor Green
Write-Log "Starting MCP servers autostart process"

# Set global environment variables
$env:NODE_ENV = "development"
$env:LOG_LEVEL = "info"
$env:PROJECT_ROOT = $PROJECT_ROOT

# Start Security Compliance Server
if (!$SkipSecurity) {
    $securityProcess = Start-MCPServer -ServerName "Security-Compliance" -ServerPath "$PROJECT_ROOT\servers\mcp-security-compliance" -Environment @{
        "SECURITY_CONFIG" = "$PROJECT_ROOT\.security\config.json"
        "OWASP_RULES" = "$PROJECT_ROOT\.security\owasp-rules.json"
        "GDPR_CONFIG" = "$PROJECT_ROOT\.security\gdpr-config.json"
    }
}

# Start Code Quality Server
if (!$SkipQuality) {
    $qualityProcess = Start-MCPServer -ServerName "Code-Quality" -ServerPath "$PROJECT_ROOT\servers\mcp-code-quality" -Environment @{
        "ESLINT_CONFIG" = "$PROJECT_ROOT\.eslintrc.json"
        "PRETTIER_CONFIG" = "$PROJECT_ROOT\.prettierrc"
        "TSCONFIG" = "$PROJECT_ROOT\tsconfig.json"
        "SONAR_CONFIG" = "$PROJECT_ROOT\sonar-project.properties"
    }
}

# Start Documentation Server
if (!$SkipDocumentation) {
    $docProcess = Start-MCPServer -ServerName "Documentation" -ServerPath "$PROJECT_ROOT\servers\mcp-documentation" -Environment @{
        "API_DOCS_PATH" = "$PROJECT_ROOT\docs\api"
        "README_PATH" = "$PROJECT_ROOT\README.md"
        "ARCHITECTURE_PATH" = "$PROJECT_ROOT\docs\architecture"
        "USER_GUIDES_PATH" = "$PROJECT_ROOT\docs\user-guides"
    }
}

# Start Testing Server
if (!$SkipTesting) {
    $testingProcess = Start-MCPServer -ServerName "Testing" -ServerPath "$PROJECT_ROOT\servers\mcp-testing" -Environment @{
        "JEST_CONFIG" = "$PROJECT_ROOT\jest.config.js"
        "PLAYWRIGHT_CONFIG" = "$PROJECT_ROOT\playwright.config.ts"
        "COVERAGE_THRESHOLD" = "80"
        "TEST_REPORTS_PATH" = "$PROJECT_ROOT\test-reports"
    }
}

# Start Deployment Server
if (!$SkipDeployment) {
    $deploymentProcess = Start-MCPServer -ServerName "Deployment" -ServerPath "$PROJECT_ROOT\servers\mcp-deployment" -Environment @{
        "CI_CONFIG" = "$PROJECT_ROOT\.github\workflows"
        "DEPLOY_ENV" = "staging"
        "DOCKER_CONFIG" = "$PROJECT_ROOT\docker"
        "KUBERNETES_CONFIG" = "$PROJECT_ROOT\k8s"
    }
}

# Verify all servers are running
$runningServers = @()
if ($securityProcess) { $runningServers += "Security-Compliance" }
if ($qualityProcess) { $runningServers += "Code-Quality" }
if ($docProcess) { $runningServers += "Documentation" }
if ($testingProcess) { $runningServers += "Testing" }
if ($deploymentProcess) { $runningServers += "Deployment" }

Write-Host "[OK] Successfully started $($runningServers.Count) MCP servers:" -ForegroundColor Green
foreach ($server in $runningServers) {
    Write-Host "   - $server" -ForegroundColor Cyan
}

Write-Log "MCP servers autostart completed successfully"
Write-Host "[INFO] MCP Servers are now active and monitoring your project" -ForegroundColor Cyan

# Start compliance monitoring in background
Write-Host "`n[INFO] Starting compliance and health monitoring..." -ForegroundColor Yellow
$monitorScript = Join-Path $PROJECT_ROOT "scripts\compliance-monitor.ps1"
if (Test-Path $monitorScript) {
    Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$monitorScript`"" -WindowStyle Hidden
    Write-Host "[OK] Compliance monitoring started" -ForegroundColor Green
} else {
    Write-Host "[WARN] Compliance monitor script not found" -ForegroundColor Yellow
}

# Display status information
Write-Host "`n[STATUS] Server Status:" -ForegroundColor Yellow
Write-Host "   - Log file: $LOG_FILE" -ForegroundColor White
Write-Host "   - Compliance log: $PROJECT_ROOT\logs\prompting-compliance.log" -ForegroundColor White
Write-Host "   - PID file: $PID_FILE" -ForegroundColor White
Write-Host "   - Project root: $PROJECT_ROOT" -ForegroundColor White

# Cleanup function for when IDE closes
function Stop-MCPServers {
    Write-Host "[STOP] Stopping MCP servers..." -ForegroundColor Yellow

    if (Test-Path $PID_FILE) {
        $pids = Get-Content $PID_FILE
        foreach ($pidEntry in $pids) {
            $parts = $pidEntry.Split(":")
            $serverName = $parts[0]
            $pid = $parts[1]

            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "[OK] Stopped $serverName (PID: $pid)" -ForegroundColor Green
            }
            catch {
                Write-Host "[WARN] Could not stop $serverName (PID: $pid)" -ForegroundColor Yellow
            }
        }

        Remove-Item $PID_FILE -Force
    }

    Write-Host "[DONE] MCP servers stopped" -ForegroundColor Green
}

# Register cleanup function
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-MCPServers }

Write-Host "`n[TIPS] Tips:" -ForegroundColor Magenta
Write-Host "   - Use -Verbose for detailed logging" -ForegroundColor White
Write-Host "   - Use -Skip[Server] to skip specific servers" -ForegroundColor White
Write-Host "   - Check logs at: $LOG_FILE" -ForegroundColor White
Write-Host "   - Servers will auto-stop when IDE closes" -ForegroundColor White
