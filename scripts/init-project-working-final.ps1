# FilaPrint Project Initialization Script - Minimal Working Version
param(
    [switch]$SkipGit,
    [switch]$SkipDependencies,
    [switch]$SkipMCP
)

$PROJECT_ROOT = "C:\dev\FilaPrint"
$GITHUB_REPO = "https://github.com/Marcus-Murray/filaprint.git"
$LOG_FILE = "$PROJECT_ROOT\logs\init.log"

# Create directories
if (!(Test-Path $PROJECT_ROOT)) {
    New-Item -ItemType Directory -Path $PROJECT_ROOT -Force | Out-Null
}
if (!(Test-Path "$PROJECT_ROOT\logs")) {
    New-Item -ItemType Directory -Path "$PROJECT_ROOT\logs" -Force | Out-Null
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
            git init | Out-Null
            git remote add origin $GITHUB_REPO | Out-Null
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
        "client\src\hooks",
        "client\src\lib",
        "client\src\types",
        "server\routes",
        "server\middleware",
        "server\services",
        "server\models",
        "server\utils",
        "shared\types",
        "shared\schemas",
        "shared\constants",
        "docs\api",
        "docs\architecture",
        "docs\user-guides",
        "scripts",
        ".cursor",
        ".mcp",
        "tests\unit",
        "tests\integration",
        "tests\e2e",
        "logs"
    )

    foreach ($dir in $directories) {
        $fullPath = Join-Path $PROJECT_ROOT $dir
        if (!(Test-Path $fullPath)) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
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
            "build:client" = "cd client; npm run build"
            "build:server" = "cd server; npm run build"
            test = "npm run test:unit; npm run test:integration; npm run test:e2e"
            "test:unit" = "jest"
            "test:integration" = "jest --config jest.integration.config.js"
            "test:e2e" = "playwright test"
            "db:setup" = "cd server; npm run db:setup"
            "db:migrate" = "cd server; npm run db:migrate"
            "db:seed" = "cd server; npm run db:seed"
            lint = "eslint . --ext .ts,.tsx"
            "lint:fix" = "eslint . --ext .ts,.tsx --fix"
            format = "prettier --write ."
            "format:check" = "prettier --check ."
            "security:scan" = "npm audit; snyk test"
            "mcp:start" = "powershell -ExecutionPolicy Bypass -File scripts\start-mcp-servers.ps1"
            "mcp:stop" = "powershell -ExecutionPolicy Bypass -File scripts\stop-mcp-servers.ps1"
        }
        dependencies = @{
            express = "^4.18.2"
            cors = "^2.8.5"
            helmet = "^7.1.0"
            bcrypt = "^5.1.1"
            jsonwebtoken = "^9.0.2"
            mqtt = "^5.3.4"
            drizzle-orm = "^0.29.0"
            better-sqlite3 = "^9.2.2"
            zod = "^3.22.4"
            winston = "^3.11.0"
            dotenv = "^16.3.1"
        }
        devDependencies = @{
            "@types/node" = "^20.10.0"
            "@types/express" = "^4.17.21"
            "@types/cors" = "^2.8.17"
            "@types/bcrypt" = "^5.0.2"
            "@types/jsonwebtoken" = "^9.0.5"
            "@types/mqtt" = "^3.0.8"
            "@types/better-sqlite3" = "^7.6.8"
            typescript = "^5.3.0"
            tsx = "^4.6.0"
            concurrently = "^8.2.2"
            jest = "^29.7.0"
            "@types/jest" = "^29.5.8"
            playwright = "^1.40.0"
            eslint = "^8.55.0"
            "@typescript-eslint/eslint-plugin" = "^6.13.0"
            "@typescript-eslint/parser" = "^6.13.0"
            prettier = "^3.1.0"
            husky = "^8.0.3"
            lint-staged = "^15.2.0"
            snyk = "^1.1248.0"
        }
        keywords = @("bambu-labs", "3d-printer", "mqtt", "filament-management", "maker-tools")
        author = "Marcus Murray"
        license = "MIT"
        repository = @{
            type = "git"
            url = $GITHUB_REPO
        }
        engines = @{
            node = ">=20.9.0"
            npm = ">=10.0.0"
        }
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
    $envLines = @(
        "# FilaPrint Environment Configuration",
        "NODE_ENV=development",
        "PORT=5000",
        "",
        "# Database Configuration",
        "DATABASE_URL=sqlite:./database.db",
        "",
        "# Security Configuration",
        "SESSION_SECRET=your-session-secret-here",
        "JWT_SECRET=your-jwt-secret-here",
        "JWT_EXPIRES_IN=24h",
        "",
        "# Rate Limiting",
        "RATE_LIMIT_WINDOW_MS=900000",
        "RATE_LIMIT_MAX_REQUESTS=100",
        "",
        "# MQTT Configuration",
        "MQTT_TIMEOUT=15000",
        "MQTT_KEEPALIVE=60",
        "MQTT_RECONNECT_PERIOD=5000",
        "",
        "# Bambu Labs Configuration",
        "BAMBU_DEFAULT_PORT=8883",
        "BAMBU_DEFAULT_USERNAME=bblp",
        "",
        "# Logging Configuration",
        "LOG_LEVEL=info",
        "LOG_FILE=logs/app.log",
        "",
        "# File Storage",
        "UPLOAD_MAX_SIZE=10485760",
        "STORAGE_PATH=uploads",
        "",
        "# CORS Configuration",
        "CORS_ORIGIN=http://localhost:3000",
        "CORS_CREDENTIALS=true",
        "",
        "# Monitoring",
        "HEALTH_CHECK_INTERVAL=30000",
        "METRICS_ENABLED=true"
    )

    $envContent = $envLines -join "`n"
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
        $mcpDirs = @(
            ".mcp\security-compliance",
            ".mcp\code-quality",
            ".mcp\documentation",
            ".mcp\testing",
            ".mcp\deployment"
        )

        foreach ($dir in $mcpDirs) {
            $fullPath = Join-Path $PROJECT_ROOT $dir
            if (!(Test-Path $fullPath)) {
                New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            }
        }

        $mcpConfig = @{
            mcpServers = @{
                "security-compliance" = @{
                    command = "npx"
                    args = @("@filaprint/mcp-security-compliance")
                    env = @{
                        NODE_ENV = "development"
                        LOG_LEVEL = "info"
                    }
                }
                "code-quality" = @{
                    command = "npx"
                    args = @("@filaprint/mcp-code-quality")
                    env = @{
                        ESLINT_CONFIG = ".eslintrc.json"
                        PRETTIER_CONFIG = ".prettierrc"
                    }
                }
                "documentation" = @{
                    command = "npx"
                    args = @("@filaprint/mcp-documentation")
                    env = @{
                        API_DOCS_PATH = "docs/api"
                        README_PATH = "README.md"
                    }
                }
                "testing" = @{
                    command = "npx"
                    args = @("@filaprint/mcp-testing")
                    env = @{
                        TEST_CONFIG = "jest.config.js"
                        COVERAGE_THRESHOLD = "80"
                    }
                }
                "deployment" = @{
                    command = "npx"
                    args = @("@filaprint/mcp-deployment")
                    env = @{
                        CI_CONFIG = ".github/workflows"
                        DEPLOY_ENV = "staging"
                    }
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
        git commit -m "Initial project setup with MCP servers and configurations"
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
Write-Host "   • Git Repository: $GITHUB_REPO" -ForegroundColor White
Write-Host "   • Log File: $LOG_FILE" -ForegroundColor White
Write-Host "   • MCP Servers: 5 configured" -ForegroundColor White
Write-Host "   • Dependencies: Installed" -ForegroundColor White

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review the project structure" -ForegroundColor White
Write-Host "   2. Configure your environment variables" -ForegroundColor White
Write-Host "   3. Start MCP servers: npm run mcp:start" -ForegroundColor White
Write-Host "   4. Begin development: npm run dev" -ForegroundColor White

Write-Host "`n💡 Tips:" -ForegroundColor Magenta
Write-Host "   • Use -Skip[Step] to skip specific steps" -ForegroundColor White
Write-Host "   • Check logs at: $LOG_FILE" -ForegroundColor White
Write-Host "   • MCP servers will auto-start with IDE" -ForegroundColor White

Write-Log "Project initialization completed successfully"
