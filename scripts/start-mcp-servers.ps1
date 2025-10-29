# FilaPrint Autostart Script

## 🚀 MCP Servers Autostart Configuration

This PowerShell script automatically starts all MCP servers when Cursor IDE launches.

```powershell
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
    Write-Host "❌ Failed to start $ServerName" -ForegroundColor Red
}

# Start MCP Server function
function Start-MCPServer {
    param(
        [string]$ServerName,
        [string]$Command,
        [array]$Arguments,
        [hashtable]$Environment = @{}
    )

    try {
        Write-Log "Starting $ServerName server..."

        # Set environment variables
        foreach ($key in $Environment.Keys) {
            Set-Item -Path "env:$key" -Value $Environment[$key]
        }

        # Start the server process
        $process = Start-Process -FilePath $Command -ArgumentList $Arguments -WindowStyle Hidden -PassThru

        # Store PID for cleanup
        Add-Content -Path $PID_FILE -Value "$ServerName:$($process.Id)"

        Write-Log "$ServerName server started with PID $($process.Id)" "SUCCESS"
        Write-Host "✅ $ServerName server started" -ForegroundColor Green

        return $process
    }
    catch {
        Handle-Error $_.Exception.Message $ServerName
        return $null
    }
}

# Main execution
Write-Host "🚀 Starting FilaPrint MCP Servers..." -ForegroundColor Green
Write-Log "Starting MCP servers autostart process"

# Set global environment variables
$env:NODE_ENV = "development"
$env:LOG_LEVEL = "info"
$env:PROJECT_ROOT = $PROJECT_ROOT

# Start Security Compliance Server
if (!$SkipSecurity) {
    $securityProcess = Start-MCPServer -ServerName "Security-Compliance" -Command "npx" -Arguments @("@filaprint/mcp-security-compliance") -Environment @{
        "SECURITY_CONFIG" = "$PROJECT_ROOT\.security\config.json"
        "OWASP_RULES" = "$PROJECT_ROOT\.security\owasp-rules.json"
        "GDPR_CONFIG" = "$PROJECT_ROOT\.security\gdpr-config.json"
    }
}

# Start Code Quality Server
if (!$SkipQuality) {
    $qualityProcess = Start-MCPServer -ServerName "Code-Quality" -Command "npx" -Arguments @("@filaprint/mcp-code-quality") -Environment @{
        "ESLINT_CONFIG" = "$PROJECT_ROOT\.eslintrc.json"
        "PRETTIER_CONFIG" = "$PROJECT_ROOT\.prettierrc"
        "TSCONFIG" = "$PROJECT_ROOT\tsconfig.json"
        "SONAR_CONFIG" = "$PROJECT_ROOT\sonar-project.properties"
    }
}

# Start Documentation Server
if (!$SkipDocumentation) {
    $docProcess = Start-MCPServer -ServerName "Documentation" -Command "npx" -Arguments @("@filaprint/mcp-documentation") -Environment @{
        "API_DOCS_PATH" = "$PROJECT_ROOT\docs\api"
        "README_PATH" = "$PROJECT_ROOT\README.md"
        "ARCHITECTURE_PATH" = "$PROJECT_ROOT\docs\architecture"
        "USER_GUIDES_PATH" = "$PROJECT_ROOT\docs\user-guides"
    }
}

# Start Testing Server
if (!$SkipTesting) {
    $testingProcess = Start-MCPServer -ServerName "Testing" -Command "npx" -Arguments @("@filaprint/mcp-testing") -Environment @{
        "JEST_CONFIG" = "$PROJECT_ROOT\jest.config.js"
        "PLAYWRIGHT_CONFIG" = "$PROJECT_ROOT\playwright.config.ts"
        "COVERAGE_THRESHOLD" = "80"
        "TEST_REPORTS_PATH" = "$PROJECT_ROOT\test-reports"
    }
}

# Start Deployment Server
if (!$SkipDeployment) {
    $deploymentProcess = Start-MCPServer -ServerName "Deployment" -Command "npx" -Arguments @("@filaprint/mcp-deployment") -Environment @{
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

Write-Host "✅ Successfully started $($runningServers.Count) MCP servers:" -ForegroundColor Green
foreach ($server in $runningServers) {
    Write-Host "   • $server" -ForegroundColor Cyan
}

Write-Log "MCP servers autostart completed successfully"
Write-Host "🔗 MCP Servers are now active and monitoring your project" -ForegroundColor Cyan

# Display status information
Write-Host "`n📊 Server Status:" -ForegroundColor Yellow
Write-Host "   • Log file: $LOG_FILE" -ForegroundColor White
Write-Host "   • PID file: $PID_FILE" -ForegroundColor White
Write-Host "   • Project root: $PROJECT_ROOT" -ForegroundColor White

# Cleanup function for when IDE closes
function Stop-MCPServers {
    Write-Host "🛑 Stopping MCP servers..." -ForegroundColor Yellow

    if (Test-Path $PID_FILE) {
        $pids = Get-Content $PID_FILE
        foreach ($pidEntry in $pids) {
            $parts = $pidEntry.Split(":")
            $serverName = $parts[0]
            $pid = $parts[1]

            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "✅ Stopped $serverName (PID: $pid)" -ForegroundColor Green
            }
            catch {
                Write-Host "⚠️ Could not stop $serverName (PID: $pid)" -ForegroundColor Yellow
            }
        }

        Remove-Item $PID_FILE -Force
    }

    Write-Host "🔚 MCP servers stopped" -ForegroundColor Green
}

# Register cleanup function
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-MCPServers }

Write-Host "`n💡 Tips:" -ForegroundColor Magenta
Write-Host "   • Use -Verbose for detailed logging" -ForegroundColor White
Write-Host "   • Use -Skip[Server] to skip specific servers" -ForegroundColor White
Write-Host "   • Check logs at: $LOG_FILE" -ForegroundColor White
Write-Host "   • Servers will auto-stop when IDE closes" -ForegroundColor White
