# FilaPrint Project Initialization Script - Minimal Working Version
param(
    [switch]$SkipGit,
    [switch]$SkipDependencies,
    [switch]$SkipMCP
)

$PROJECT_ROOT = "C:\dev\FilaPrint"
$LOG_FILE = "$PROJECT_ROOT\logs\init.log"

# Create project directory
if (!(Test-Path $PROJECT_ROOT)) {
    New-Item -ItemType Directory -Path $PROJECT_ROOT -Force
}

# Create logs directory
if (!(Test-Path "$PROJECT_ROOT\logs")) {
    New-Item -ItemType Directory -Path "$PROJECT_ROOT\logs" -Force
}

# Logging function
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $LOG_FILE -Value $logEntry
}

# Step 1: Initialize Git Repository
if (!$SkipGit) {
    Write-Host "🔧 Initializing Git repository..." -ForegroundColor Yellow
    try {
        Set-Location $PROJECT_ROOT
        if (!(Test-Path ".git")) {
            git init
            Write-Log "Git repository initialized"
        } else {
            Write-Log "Git repository already exists"
        }
        Write-Host "✅ Git repository ready" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Git initialization failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 2: Create Project Structure
Write-Host "📁 Creating project structure..." -ForegroundColor Yellow
try {
    $directories = @(
        "client\src\components",
        "client\src\pages",
        "server\routes",
        "server\services",
        "shared\types",
        "docs\api",
        "scripts",
        "logs"
    )

    foreach ($dir in $directories) {
        $fullPath = Join-Path $PROJECT_ROOT $dir
        if (!(Test-Path $fullPath)) {
            New-Item -ItemType Directory -Path $fullPath -Force
        }
    }

    Write-Log "Project structure created"
    Write-Host "✅ Project structure ready" -ForegroundColor Green
}
catch {
    Write-Host "❌ Project structure creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Create Package.json
Write-Host "📦 Creating package.json..." -ForegroundColor Yellow
try {
    $packageJson = @{
        name = "filaprint"
        version = "1.0.0"
        description = "Professional Bambu Labs Printer Management System"
        main = "server/index.ts"
        scripts = @{
            dev = "concurrently `"npm run dev:client`" `"npm run dev:server`""
            "dev:client" = "cd client; npm run dev"
            "dev:server" = "cd server; npm run dev"
            build = "npm run build:client; npm run build:server"
            test = "jest"
            lint = "eslint . --ext .ts,.tsx"
        }
        dependencies = @{
            express = "^4.18.2"
            cors = "^2.8.5"
            helmet = "^7.1.0"
        }
        devDependencies = @{
            "@types/node" = "^20.10.0"
            "@types/express" = "^4.17.21"
            typescript = "^5.3.0"
            jest = "^29.7.0"
            eslint = "^8.55.0"
        }
        keywords = @("bambu-labs", "3d-printer", "mqtt", "filament-management")
        author = "Marcus Murray"
        license = "MIT"
    }

    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "$PROJECT_ROOT\package.json"
    Write-Log "package.json created"
    Write-Host "✅ Package.json ready" -ForegroundColor Green
}
catch {
    Write-Host "❌ Package.json creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Create Environment Configuration
Write-Host "🔐 Creating environment configuration..." -ForegroundColor Yellow
try {
    $envContent = "NODE_ENV=development`nPORT=5000`nDATABASE_URL=sqlite:./database.db`nSESSION_SECRET=your-session-secret-here`nJWT_SECRET=your-jwt-secret-here"
    $envContent | Set-Content "$PROJECT_ROOT\.env.example"
    $envContent | Set-Content "$PROJECT_ROOT\.env"
    Write-Log "Environment configuration created"
    Write-Host "✅ Environment configuration ready" -ForegroundColor Green
}
catch {
    Write-Host "❌ Environment configuration failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Install Dependencies
if (!$SkipDependencies) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    try {
        Set-Location $PROJECT_ROOT
        npm install
        Write-Log "Dependencies installed"
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Dependency installation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 6: Create MCP Server Configurations
if (!$SkipMCP) {
    Write-Host "🔧 Creating MCP server configurations..." -ForegroundColor Yellow
    try {
        $mcpDirs = @(".mcp\security-compliance", ".mcp\code-quality", ".mcp\documentation")
        foreach ($dir in $mcpDirs) {
            $fullPath = Join-Path $PROJECT_ROOT $dir
            if (!(Test-Path $fullPath)) {
                New-Item -ItemType Directory -Path $fullPath -Force
            }
        }

        $mcpConfig = @{
            mcpServers = @{
                "security-compliance" = @{
                    command = "npx"
                    args = @("@filaprint/mcp-security-compliance")
                }
                "code-quality" = @{
                    command = "npx"
                    args = @("@filaprint/mcp-code-quality")
                }
            }
        }

        $mcpConfig | ConvertTo-Json -Depth 10 | Set-Content "$PROJECT_ROOT\.mcp\config.json"
        Write-Log "MCP server configurations created"
        Write-Host "✅ MCP server configurations ready" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ MCP server configuration failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 7: Create Initial Commit
if (!$SkipGit) {
    Write-Host "📝 Creating initial commit..." -ForegroundColor Yellow
    try {
        Set-Location $PROJECT_ROOT
        git add .
        git commit -m "Initial project setup"
        Write-Log "Initial commit created"
        Write-Host "✅ Initial commit ready" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Initial commit failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final Summary
Write-Host "`n🎉 FilaPrint Project Initialization Complete!" -ForegroundColor Green
Write-Host "`n📊 Project Summary:" -ForegroundColor Yellow
Write-Host "   • Project Root: $PROJECT_ROOT" -ForegroundColor White
Write-Host "   • Log File: $LOG_FILE" -ForegroundColor White

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review the project structure" -ForegroundColor White
Write-Host "   2. Configure your environment variables" -ForegroundColor White
Write-Host "   3. Begin development: npm run dev" -ForegroundColor White

Write-Log "Project initialization completed successfully"
