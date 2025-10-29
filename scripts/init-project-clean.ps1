# FilaPrint Project Initialization Script
# PowerShell version - Clean conversion from bash

param(
    [switch]$SkipGit,
    [switch]$SkipDependencies,
    [switch]$SkipDatabase,
    [switch]$SkipMCP,
    [switch]$Verbose
)

# Configuration
$PROJECT_ROOT = "C:\dev\FilaPrint"
$GITHUB_REPO = "https://github.com/Marcus-Murray/filaprint.git"
$LOG_FILE = "$PROJECT_ROOT\logs\init.log"

# Create project directory
if (!(Test-Path $PROJECT_ROOT)) {
    New-Item -ItemType Directory -Path $PROJECT_ROOT -Force | Out-Null
}

# Create logs directory
if (!(Test-Path "$PROJECT_ROOT\logs")) {
    New-Item -ItemType Directory -Path "$PROJECT_ROOT\logs" -Force | Out-Null
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
    param([string]$ErrorMessage, [string]$Step)
    Write-Log "ERROR: $ErrorMessage" "ERROR"
    Write-Host "❌ Failed at step: $Step" -ForegroundColor Red
    exit 1
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
        Handle-Error $_.Exception.Message "Git initialization"
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
    Handle-Error $_.Exception.Message "Project structure creation"
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
    Handle-Error $_.Exception.Message "Package.json creation"
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
        "# For production: DATABASE_URL=postgresql://user:password@localhost:5432/filaprint",
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
    Handle-Error $_.Exception.Message "Environment configuration"
}

# Step 5: Create TypeScript Configuration
Write-Host "⚙️ Creating TypeScript configuration..." -ForegroundColor Yellow
try {
    $tsConfig = @{
        compilerOptions = @{
            target = "ES2022"
            lib = @("ES2022", "DOM", "DOM.Iterable")
            allowJs = $true
            skipLibCheck = $true
            esModuleInterop = $true
            allowSyntheticDefaultImports = $true
            strict = $true
            forceConsistentCasingInFileNames = $true
            noFallthroughCasesInSwitch = $true
            module = "ESNext"
            moduleResolution = "node"
            resolveJsonModule = $true
            isolatedModules = $true
            noEmit = $true
            jsx = "react-jsx"
            noImplicitAny = $true
            noImplicitReturns = $true
            noImplicitThis = $true
            noUnusedLocals = $true
            noUnusedParameters = $true
            exactOptionalPropertyTypes = $true
            baseUrl = "."
            paths = @{
                "@/*" = @("./*")
                "@/client/*" = @("./client/*")
                "@/server/*" = @("./server/*")
                "@/shared/*" = @("./shared/*")
            }
        }
        include = @("**/*.ts", "**/*.tsx")
        exclude = @("node_modules", "dist", "build")
    }

    $tsConfig | ConvertTo-Json -Depth 10 | Set-Content "$PROJECT_ROOT\tsconfig.json"
    Write-Log "TypeScript configuration created"
    Write-Host "✅ TypeScript configuration ready" -ForegroundColor Green
}
catch {
    Handle-Error $_.Exception.Message "TypeScript configuration"
}

# Step 6: Create ESLint Configuration
Write-Host "🔍 Creating ESLint configuration..." -ForegroundColor Yellow
try {
    $eslintConfig = @{
        env = @{
            browser = $true
            es2022 = $true
            node = $true
        }
        extends = @(
            "eslint:recommended",
            "@typescript-eslint/recommended",
            "@typescript-eslint/recommended-requiring-type-checking"
        )
        parser = "@typescript-eslint/parser"
        parserOptions = @{
            ecmaVersion = "latest"
            sourceType = "module"
            project = "./tsconfig.json"
        }
        plugins = @("@typescript-eslint")
        rules = @{
            "@typescript-eslint/no-explicit-any" = "error"
            "@typescript-eslint/no-unused-vars" = "error"
            "@typescript-eslint/explicit-function-return-type" = "warn"
            "@typescript-eslint/no-non-null-assertion" = "error"
            "@typescript-eslint/prefer-nullish-coalescing" = "error"
            "@typescript-eslint/prefer-optional-chain" = "error"
            "no-console" = "warn"
            "no-debugger" = "error"
            "no-eval" = "error"
            "no-implied-eval" = "error"
            "no-new-func" = "error"
            "no-script-url" = "error"
            "no-alert" = "error"
        }
        ignorePatterns = @("dist/", "build/", "node_modules/", "*.js")
    }

    $eslintConfig | ConvertTo-Json -Depth 10 | Set-Content "$PROJECT_ROOT\.eslintrc.json"
    Write-Log "ESLint configuration created"
    Write-Host "✅ ESLint configuration ready" -ForegroundColor Green
}
catch {
    Handle-Error $_.Exception.Message "ESLint configuration"
}

# Step 7: Create Prettier Configuration
Write-Host "🎨 Creating Prettier configuration..." -ForegroundColor Yellow
try {
    $prettierConfig = @{
        semi = $true
        trailingComma = "es5"
        singleQuote = $true
        printWidth = 80
        tabWidth = 2
        useTabs = $false
        bracketSpacing = $true
        arrowParens = "avoid"
        endOfLine = "lf"
    }

    $prettierConfig | ConvertTo-Json -Depth 10 | Set-Content "$PROJECT_ROOT\.prettierrc"
    Write-Log "Prettier configuration created"
    Write-Host "✅ Prettier configuration ready" -ForegroundColor Green
}
catch {
    Handle-Error $_.Exception.Message "Prettier configuration"
}

# Step 8: Create Git Configuration
Write-Host "📝 Creating Git configuration..." -ForegroundColor Yellow
try {
    $gitignoreLines = @(
        "# Dependencies",
        "node_modules/",
        "npm-debug.log*",
        "yarn-debug.log*",
        "yarn-error.log*",
        "",
        "# Production builds",
        "dist/",
        "build/",
        "*.tgz",
        "",
        "# Environment variables",
        ".env",
        ".env.local",
        ".env.development.local",
        ".env.test.local",
        ".env.production.local",
        "",
        "# Database",
        "*.db",
        "*.sqlite",
        "*.sqlite3",
        "",
        "# Logs",
        "logs/",
        "*.log",
        "",
        "# Runtime data",
        "pids/",
        "*.pid",
        "*.seed",
        "*.pid.lock",
        "",
        "# Coverage directory used by tools like istanbul",
        "coverage/",
        "*.lcov",
        "",
        "# nyc test coverage",
        ".nyc_output",
        "",
        "# Dependency directories",
        "jspm_packages/",
        "",
        "# Optional npm cache directory",
        ".npm",
        "",
        "# Optional eslint cache",
        ".eslintcache",
        "",
        "# Optional REPL history",
        ".node_repl_history",
        "",
        "# Output of 'npm pack'",
        "*.tgz",
        "",
        "# Yarn Integrity file",
        ".yarn-integrity",
        "",
        "# dotenv environment variables file",
        ".env",
        "",
        "# parcel-bundler cache (https://parceljs.org/)",
        ".cache",
        ".parcel-cache",
        "",
        "# next.js build output",
        ".next",
        "",
        "# nuxt.js build output",
        ".nuxt",
        "",
        "# vuepress build output",
        ".vuepress/dist",
        "",
        "# Serverless directories",
        ".serverless",
        "",
        "# FuseBox cache",
        ".fusebox/",
        "",
        "# DynamoDB Local files",
        ".dynamodb/",
        "",
        "# TernJS port file",
        ".tern-port",
        "",
        "# Stores VSCode versions used for testing VSCode extensions",
        ".vscode-test",
        "",
        "# IDE files",
        ".vscode/",
        ".idea/",
        "*.swp",
        "*.swo",
        "*~",
        "",
        "# OS generated files",
        ".DS_Store",
        ".DS_Store?",
        "._*",
        ".Spotlight-V100",
        ".Trashes",
        "ehthumbs.db",
        "Thumbs.db",
        "",
        "# Temporary files",
        "tmp/",
        "temp/"
    )

    $gitignoreContent = $gitignoreLines -join "`n"
    $gitignoreContent | Set-Content "$PROJECT_ROOT\.gitignore"
    Write-Log "Git configuration created"
    Write-Host "✅ Git configuration ready" -ForegroundColor Green
}
catch {
    Handle-Error $_.Exception.Message "Git configuration"
}

# Step 9: Install Dependencies
if (!$SkipDependencies) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    try {
        Set-Location $PROJECT_ROOT
        npm install
        Write-Log "Dependencies installed"
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    }
    catch {
        Handle-Error $_.Exception.Message "Dependency installation"
    }
}

# Step 10: Create MCP Server Configurations
if (!$SkipMCP) {
    Write-Host "🔧 Creating MCP server configurations..." -ForegroundColor Yellow
    try {
        # Create MCP directory structure
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

        # Create MCP server configurations
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
        Handle-Error $_.Exception.Message "MCP server configuration"
    }
}

# Step 11: Create Initial Commit
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
        Handle-Error $_.Exception.Message "Initial commit"
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
Write-Host "   • Use -Verbose for detailed logging" -ForegroundColor White
Write-Host "   • Use -Skip[Step] to skip specific steps" -ForegroundColor White
Write-Host "   • Check logs at: $LOG_FILE" -ForegroundColor White
Write-Host "   • MCP servers will auto-start with IDE" -ForegroundColor White

Write-Log "Project initialization completed successfully"
