# Data Migration Script for Encryption
# This script migrates existing plaintext credentials to encrypted format

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$DB_PATH = "$PROJECT_ROOT\database.db"

Write-Host "Starting encryption migration..." -ForegroundColor Yellow

# Note: This requires Node.js to run the actual migration
# The migration should:
# 1. Read all printers from database
# 2. Check if accessCode/mqttPassword are encrypted
# 3. Encrypt unencrypted values
# 4. Update database

Write-Host "Run migration from Node.js:" -ForegroundColor Cyan
Write-Host "  node scripts/migrate-encryption.js" -ForegroundColor White


