# Encryption Key Setup Guide

## Quick Setup

I've automatically generated a secure encryption key and added it to your `.env` file. The key is:

```
ENCRYPTION_KEY=c099e22a7ad0bd430b3f78495987cdf29c7ec13ba77dcf7ea2fcda2083c16dba
```

This key is **already set** in your `.env` file, so encryption should work immediately.

## Important Security Notes

### ✅ What's Protected
- The `.env` file is already in `.gitignore` - your key won't be committed
- Encryption key is used to encrypt:
  - Printer access codes
  - MQTT passwords
  - Any other sensitive credentials

### ⚠️ Critical Warnings

1. **Never commit `.env` to Git** - Already protected, but double-check
2. **Backup your key** - If you lose it, encrypted data becomes unreadable
3. **Production requires a secure key management system**:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Environment variables in your hosting platform

### Generating a New Key

If you need to generate a new encryption key:

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using PowerShell:**
```powershell
-join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})
```

**Using OpenSSL:**
```bash
openssl rand -hex 32
```

The key must be at least 32 bytes (64 hex characters). Longer keys are automatically hashed to 32 bytes.

## Verification

### Check if the key is set:
```bash
# Windows PowerShell
Get-Content .env | Select-String "ENCRYPTION_KEY"

# Should output:
# ENCRYPTION_KEY=c099e22a7ad0bd430b3f78495987cdf29c7ec13ba77dcf7ea2fcda2083c16dba
```

### Test encryption/decryption:
The encryption utility automatically uses the key from `process.env.ENCRYPTION_KEY`. If the key is not set, it will:
- Log a warning
- Use a default key (INSECURE - only for development)
- Still encrypt data, but with a deterministic key

## Production Deployment

### For Production:

1. **Generate a new secure key** (don't reuse the development key):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Store securely**:
   - Use a secrets management service
   - Set as an environment variable in your hosting platform
   - Never hardcode in your application

3. **Rotate keys** (when needed):
   - Generate new key
   - Decrypt data with old key
   - Encrypt with new key
   - Update environment variable

4. **Backup strategy**:
   - Store key backup in secure location
   - Use multiple administrators with access
   - Document key rotation procedures

## Troubleshooting

### Issue: "ENCRYPTION_KEY not set - using default"
**Solution**: Make sure `.env` file exists and contains `ENCRYPTION_KEY=...`

### Issue: Data can't be decrypted
**Possible causes**:
- Key was changed after encryption
- Key was incorrectly copied (extra spaces, wrong format)
- Key encoding issue

**Solution**: Use the same key that was used for encryption

### Issue: Encryption fails
**Solution**:
- Verify key is at least 32 bytes (64 hex characters)
- Check for special characters that need escaping
- Ensure `.env` file is properly loaded by dotenv

## Migration

If you have existing unencrypted data in your database, run the migration script after setting the encryption key:

```bash
npx tsx scripts/migrate-encryption.ts
```

This will encrypt all existing printer credentials using your new key.

---

**Status**: ✅ Encryption key is configured and ready to use!


