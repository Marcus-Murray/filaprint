# MCP Servers Rules Implementation

Based on [cursor.directory/rules](http://cursor.directory/rules) and best practices from PromptingGuide.ai

## 🎯 Implemented Rules

### Security & Compliance (OWASP, GDPR, SOC2)

✅ **Dependency Scanning**
- Automated npm audit checks
- Vulnerability detection and reporting
- Security patches recommendations

✅ **OWASP Top 10 Compliance**
- SQL injection prevention checks
- XSS vulnerability scanning
- Authentication/authorization validation
- Input sanitization verification

✅ **GDPR Compliance**
- Data minimization checks
- Consent management validation
- Data deletion capabilities verification

### Code Quality Rules

✅ **TypeScript Strict Mode**
- Enforces strict type checking
- Prevents implicit any types
- Validates configuration

✅ **ESLint & Prettier**
- Consistent code formatting
- Best practice enforcement
- Security rule validation

✅ **Complexity Management**
- Function complexity limits (max 10)
- File length limits (max 200 lines)
- Naming convention validation

### Documentation Standards

✅ **JSDoc Validation**
- Ensures functions have documentation
- Validates comment completeness
- API documentation generation

✅ **README Maintenance**
- Section completeness checks
- Installation instructions validation
- Code example verification

### Testing Requirements

✅ **Coverage Enforcement**
- Maintains 80%+ coverage requirement
- Unit test generation suggestions
- Integration test validation

✅ **Test Types**
- Unit tests (Jest)
- Integration tests
- E2E tests (Playwright)

### Deployment Standards

✅ **CI/CD Validation**
- GitHub Actions workflow checks
- Environment configuration validation
- Security headers verification

## 🔧 Server Capabilities

### Security Compliance Server
- `scan_dependencies` - Scan for vulnerabilities
- `check_owasp_compliance` - OWASP Top 10 validation
- `validate_input_sanitization` - Input validation checks
- `check_authentication` - Auth implementation verification
- `check_gdpr_compliance` - GDPR compliance checks

### Code Quality Server
- `run_linter` - ESLint code checking
- `check_typescript` - TypeScript validation
- `check_formatting` - Prettier formatting checks
- `analyze_complexity` - Code complexity analysis
- `check_naming_conventions` - Naming validation

### Documentation Server
- `validate_readme` - README completeness
- `check_jsdoc` - JSDoc comment validation
- `validate_api_docs` - API documentation checks

### Testing Server
- `run_unit_tests` - Execute Jest tests
- `check_coverage` - Coverage percentage validation
- `run_e2e_tests` - Playwright E2E tests

### Deployment Server
- `validate_ci_cd` - CI/CD pipeline checks
- `check_environment_config` - Environment validation
- `validate_security_headers` - Security headers verification

## 🚀 Usage

Start all servers:
```powershell
.\scripts\start-mcp-servers.ps1
```

Individual servers run via MCP protocol and can be accessed through Cursor IDE's MCP integration.

## 📋 Compliance Monitoring

Compliance is monitored continuously via `scripts/compliance-monitor.ps1`:
- Health checks every 60 seconds
- Compliance validation every 5 minutes
- Automatic issue detection and logging

## 🔗 References

- [cursor.directory/rules](http://cursor.directory/rules)
- [PromptingGuide.ai](https://www.promptingguide.ai/)
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- GDPR Guidelines: https://gdpr.eu/


