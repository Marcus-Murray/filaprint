# FilaPrint Project Setup Guide

## 🎯 Project Overview

**FilaPrint** - Professional Bambu Labs Printer Management System

- **Target**: Bambu Labs H2D with AMS2 Pro integration
- **Focus**: Live data monitoring, filament management, and maker community tool
- **Repository**: https://github.com/Marcus-Murray/filaprint.git

## 🏗️ Project Architecture

### Core Technology Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (development) / PostgreSQL (production)
- **MQTT**: Secure connection to Bambu Labs printers
- **Authentication**: JWT + bcrypt
- **Security**: Helmet, CORS, Rate Limiting, Input Validation

### Key Features Priority

1. **Bambu Labs H2D + AMS2 Pro Connection** (CRITICAL)
2. **Live Data Monitoring** (Temperature, humidity, progress)
3. **Filament Management System**
4. **User Authentication & Security**
5. **Professional UI/UX**

## 🔧 Development Environment Setup

### Prerequisites

- Node.js 20.9+
- Git
- Windows PowerShell
- Cursor IDE

### Project Structure

```
C:\dev\FilaPrint\
├── client/                 # React frontend
├── server/                 # Express backend
├── shared/                 # Shared types/schemas
├── docs/                   # Documentation
├── scripts/                # Automation scripts
├── .cursor/                # Cursor IDE configuration
├── .mcp/                   # MCP server configurations
└── README.md
```

## 🛡️ Security & Compliance Framework

### Security Standards

- **OWASP Top 10** compliance
- **GDPR** data protection
- **SOC 2** security controls
- **ISO 27001** information security
- **NIST Cybersecurity Framework**

### Code Quality Standards

- **ESLint** with security rules
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **TypeScript** strict mode
- **Jest** for testing
- **SonarQube** for code analysis

## 📋 MCP Servers Configuration

### Core MCP Servers

1. **Security Compliance Server**

   - OWASP vulnerability scanning
   - Dependency security auditing
   - Code security analysis

2. **Code Quality Server**

   - ESLint integration
   - Prettier formatting
   - TypeScript type checking
   - Code complexity analysis

3. **Documentation Server**

   - API documentation generation
   - Code comment analysis
   - README maintenance

4. **Testing Server**

   - Unit test generation
   - Integration test setup
   - Coverage reporting

5. **Deployment Server**
   - Environment configuration
   - CI/CD pipeline setup
   - Production deployment

## 🚀 Getting Started

### 1. Clone Repository

```bash
cd C:\dev\FilaPrint
git clone https://github.com/Marcus-Murray/filaprint.git .
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
# Configure your environment variables
```

### 4. Database Setup

```bash
npm run db:setup
npm run db:migrate
```

### 5. Start Development

```bash
npm run dev
```

## 🔐 Security Checklist

### Authentication & Authorization

- [ ] JWT token implementation
- [ ] Password hashing (bcrypt)
- [ ] Session management
- [ ] Role-based access control
- [ ] Multi-factor authentication (future)

### Data Protection

- [ ] Input validation (Zod)
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] CORS configuration

### Infrastructure Security

- [ ] HTTPS enforcement
- [ ] Security headers (Helmet)
- [ ] Environment variable protection
- [ ] Database encryption
- [ ] Log sanitization

## 📊 Monitoring & Logging

### Logging Strategy

- **Winston** for structured logging
- **Sensitive data sanitization**
- **Request/response logging**
- **Error tracking**
- **Performance monitoring**

### Monitoring Tools

- **Health check endpoints**
- **Database connection monitoring**
- **MQTT connection status**
- **API response times**
- **Error rates**

## 🧪 Testing Strategy

### Test Types

- **Unit Tests**: Jest + Testing Library
- **Integration Tests**: Supertest
- **E2E Tests**: Playwright
- **Security Tests**: OWASP ZAP
- **Performance Tests**: Artillery

### Test Coverage

- **Minimum 80% code coverage**
- **Critical path testing**
- **Security vulnerability testing**
- **Performance benchmarking**

## 📚 Documentation Standards

### Code Documentation

- **JSDoc** for functions/classes
- **README** for each module
- **API documentation** (OpenAPI)
- **Architecture diagrams**
- **Deployment guides**

### User Documentation

- **Setup instructions**
- **User guides**
- **Troubleshooting guides**
- **FAQ section**
- **Video tutorials**

## 🔄 CI/CD Pipeline

### Development Workflow

1. **Feature branch** creation
2. **Code review** process
3. **Automated testing**
4. **Security scanning**
5. **Deployment** to staging
6. **Production deployment**

### Quality Gates

- **All tests passing**
- **Security scan clean**
- **Code coverage > 80%**
- **Performance benchmarks met**
- **Documentation updated**

## 🎨 UI/UX Standards

### Design System

- **Consistent color palette**
- **Typography hierarchy**
- **Component library**
- **Responsive design**
- **Accessibility compliance**

### User Experience

- **Intuitive navigation**
- **Clear error messages**
- **Loading states**
- **Success feedback**
- **Mobile responsiveness**

## 📈 Performance Standards

### Frontend Performance

- **Lighthouse score > 90**
- **First Contentful Paint < 2s**
- **Largest Contentful Paint < 2.5s**
- **Cumulative Layout Shift < 0.1**

### Backend Performance

- **API response time < 200ms**
- **Database query optimization**
- **Caching strategy**
- **Memory usage monitoring**

## 🚨 Error Handling

### Error Categories

- **Validation errors**
- **Authentication errors**
- **Database errors**
- **MQTT connection errors**
- **System errors**

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message",
    "details": "Technical details",
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid"
  }
}
```

## 🔧 Development Tools

### IDE Configuration

- **Cursor IDE** with MCP servers
- **ESLint** integration
- **Prettier** formatting
- **TypeScript** support
- **Git** integration

### Debugging Tools

- **VS Code debugger**
- **Browser dev tools**
- **Network monitoring**
- **Database query analysis**
- **MQTT message inspection**

## 📝 Code Standards

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### ESLint Rules

- **Security-focused rules**
- **TypeScript-specific rules**
- **React best practices**
- **Accessibility rules**
- **Performance rules**

## 🎯 Success Metrics

### Technical Metrics

- **Uptime > 99.9%**
- **Response time < 200ms**
- **Error rate < 0.1%**
- **Security vulnerabilities: 0**

### User Metrics

- **User satisfaction > 4.5/5**
- **Task completion rate > 95%**
- **Support tickets < 5/month**
- **User retention > 80%**

## 🚀 Deployment Strategy

### Environments

- **Development**: Local development
- **Staging**: Pre-production testing
- **Production**: Live application

### Deployment Process

1. **Code review** and approval
2. **Automated testing** execution
3. **Security scanning**
4. **Staging deployment**
5. **User acceptance testing**
6. **Production deployment**
7. **Post-deployment monitoring**

## 📞 Support & Maintenance

### Support Channels

- **GitHub Issues** for bug reports
- **Documentation** for user guides
- **Email support** for critical issues
- **Community forum** for discussions

### Maintenance Schedule

- **Weekly** dependency updates
- **Monthly** security patches
- **Quarterly** feature updates
- **Annual** architecture review

---

## 🎉 Next Steps

1. **Review this setup guide**
2. **Configure your development environment**
3. **Set up MCP servers**
4. **Initialize the project**
5. **Start with Bambu Labs H2D connection**
6. **Implement core features**
7. **Deploy to production**

**Remember**: The Bambu Labs H2D + AMS2 Pro connection is the foundation of this project. Everything else builds upon this critical feature.

---

_This guide will be updated as the project evolves and new requirements emerge._
