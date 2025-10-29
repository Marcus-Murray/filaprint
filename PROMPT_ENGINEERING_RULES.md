# FilaPrint Prompt Engineering Rules

## 🎯 Prompt Engineering Framework

Based on [PromptingGuide.ai](https://promptingguide.ai) best practices, this document defines the prompt engineering rules and techniques for the FilaPrint project.

## 🧠 Core Prompt Engineering Techniques

### 1. Chain-of-Thought (CoT) Prompting

```typescript
// Use CoT for complex problem solving
const cotPrompt = `
Analyze the Bambu Labs H2D MQTT connection issue step by step:

1. First, identify the connection parameters (IP, port, credentials)
2. Then, check the network connectivity and firewall settings
3. Next, validate the MQTT message format and parsing
4. Finally, implement error handling and reconnection logic

Provide your reasoning for each step.
`;
```

### 2. Few-Shot Prompting

```typescript
// Provide examples for consistent output
const fewShotPrompt = `
Example 1: Bambu Labs H2D Temperature Data
Input: {"nozzle_temp": [220, 225], "bed_temp": 60, "chamber_temp": 45}
Output: "Nozzle 1: 220°C, Nozzle 2: 225°C, Bed: 60°C, Chamber: 45°C"

Example 2: AMS2 Pro Humidity Data
Input: {"humidity": [12, 15, 18, 22], "slots": 4}
Output: "Slot 1: 12% (Good), Slot 2: 15% (Good), Slot 3: 18% (Warning), Slot 4: 22% (Critical)"

Now process this data: {"nozzle_temp": [200, 205], "bed_temp": 55, "chamber_temp": 40, "humidity": [10, 14, 16, 20]}
`;
```

### 3. Self-Consistency Prompting

```typescript
// Generate multiple solutions and choose the best
const selfConsistencyPrompt = `
Generate 3 different approaches to handle MQTT connection failures in the Bambu Labs H2D:

Approach 1: [Your first solution]
Approach 2: [Your second solution]
Approach 3: [Your third solution]

Then evaluate each approach and select the most robust solution.
`;
```

### 4. Meta Prompting

```typescript
// Use meta prompts for better AI assistance
const metaPrompt = `
You are an expert in Bambu Labs printer integration and MQTT protocols.

Your task is to help debug connection issues with the H2D printer.

When I ask about connection problems, you should:
1. Ask clarifying questions about the specific error
2. Provide step-by-step troubleshooting
3. Suggest code improvements
4. Explain the underlying MQTT protocol details

How would you approach debugging a "Connection refused" error?
`;
```

### 5. ReAct (Reasoning + Acting)

```typescript
// Combine reasoning with action for complex tasks
const reactPrompt = `
I need to implement live data monitoring for the Bambu Labs H2D.

Thought: I need to understand the MQTT message structure first.
Action: Search for Bambu Labs H2D MQTT documentation
Observation: Found that H2D sends JSON messages every 2 seconds

Thought: Now I need to parse the temperature data from the JSON.
Action: Create a TypeScript interface for the MQTT message structure
Observation: Defined interfaces for nozzle, bed, and chamber temperatures

Thought: I should implement error handling for connection failures.
Action: Add try-catch blocks and reconnection logic
Observation: Implemented exponential backoff for reconnection

What's the next step to complete this implementation?
`;
```

## 🛡️ Security-Focused Prompting

### 1. Input Validation Prompts

```typescript
const securityPrompt = `
When processing user input for the FilaPrint application, ensure:

1. Validate all inputs using Zod schemas
2. Sanitize data to prevent XSS attacks
3. Check for SQL injection patterns
4. Implement rate limiting for API endpoints
5. Log security events for monitoring

Generate secure input validation code for user registration.
`;
```

### 2. Authentication Prompts

```typescript
const authPrompt = `
Implement secure authentication for FilaPrint following OWASP guidelines:

Requirements:
- JWT tokens with short expiration
- Password hashing with bcrypt
- Session management
- Role-based access control
- Multi-factor authentication (future)

Generate the authentication middleware code.
`;
```

## 🔧 Code Quality Prompts

### 1. TypeScript Best Practices

```typescript
const typescriptPrompt = `
Write TypeScript code for the FilaPrint project following these standards:

1. Use strict mode and explicit types
2. Implement proper error handling
3. Follow naming conventions (camelCase, PascalCase)
4. Use interfaces for data structures
5. Implement proper async/await patterns

Generate a TypeScript service class for MQTT communication.
`;
```

### 2. React Component Prompts

```typescript
const reactPrompt = `
Create a React component for displaying Bambu Labs H2D live data:

Requirements:
- Use TypeScript with proper typing
- Implement error boundaries
- Use React hooks (useState, useEffect, useCallback)
- Follow accessibility guidelines
- Implement responsive design

Generate the LiveDataDisplay component.
`;
```

## 📊 Performance Optimization Prompts

### 1. Database Optimization

```typescript
const dbOptimizationPrompt = `
Optimize the FilaPrint database for performance:

Considerations:
- Index frequently queried columns
- Implement connection pooling
- Use prepared statements
- Optimize query patterns
- Implement caching strategies

Generate optimized database queries for filament inventory.
`;
```

### 2. Frontend Performance

```typescript
const frontendPerformancePrompt = `
Optimize the FilaPrint frontend for performance:

Requirements:
- Implement code splitting
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize bundle size
- Use lazy loading for images

Generate performance-optimized components.
`;
```

## 🧪 Testing Prompts

### 1. Unit Testing

```typescript
const unitTestPrompt = `
Write comprehensive unit tests for the FilaPrint MQTT service:

Test Cases:
- Successful connection establishment
- Message parsing and validation
- Error handling and reconnection
- Connection timeout scenarios
- Invalid message format handling

Generate Jest test cases with proper mocking.
`;
```

### 2. Integration Testing

```typescript
const integrationTestPrompt = `
Create integration tests for the FilaPrint API:

Test Scenarios:
- User registration and authentication
- Printer connection and data retrieval
- Filament inventory management
- Error handling and validation
- API rate limiting

Generate Supertest integration tests.
`;
```

## 📚 Documentation Prompts

### 1. API Documentation

```typescript
const apiDocPrompt = `
Generate comprehensive API documentation for FilaPrint:

Include:
- OpenAPI specification
- Request/response examples
- Error codes and messages
- Authentication requirements
- Rate limiting information

Generate the OpenAPI specification.
`;
```

### 2. User Guide Prompts

```typescript
const userGuidePrompt = `
Create user documentation for FilaPrint:

Sections:
- Getting started guide
- Printer setup instructions
- Troubleshooting common issues
- Feature explanations
- FAQ section

Generate the user guide content.
`;
```

## 🔄 Continuous Improvement Prompts

### 1. Code Review Prompts

```typescript
const codeReviewPrompt = `
Review this FilaPrint code for improvements:

Focus Areas:
- Security vulnerabilities
- Performance optimizations
- Code readability and maintainability
- Error handling completeness
- Testing coverage

Provide specific recommendations for improvement.
`;
```

### 2. Architecture Review Prompts

```typescript
const architecturePrompt = `
Evaluate the FilaPrint architecture for scalability:

Considerations:
- Microservices vs monolith
- Database design and relationships
- API design and versioning
- Caching strategies
- Monitoring and logging

Suggest architectural improvements.
`;
```

## 🎯 Prompt Engineering Best Practices

### 1. Clear Instructions

- Use specific, actionable language
- Provide context and constraints
- Include examples when helpful
- Break complex tasks into steps

### 2. Context Management

- Provide relevant background information
- Include current project state
- Reference previous decisions
- Maintain conversation history

### 3. Error Handling

- Ask for error scenarios
- Request troubleshooting steps
- Include fallback strategies
- Validate solutions

### 4. Iterative Improvement

- Start with basic prompts
- Refine based on results
- Test different approaches
- Document successful patterns

## 🚀 Implementation Strategy

### Phase 1: Core Prompts

1. **MQTT Connection** prompts
2. **Security** validation prompts
3. **Code Quality** review prompts
4. **Testing** generation prompts

### Phase 2: Advanced Prompts

1. **Performance** optimization prompts
2. **Documentation** generation prompts
3. **Architecture** review prompts
4. **Deployment** automation prompts

### Phase 3: Specialized Prompts

1. **Bambu Labs** specific prompts
2. **Maker Community** focused prompts
3. **Compliance** validation prompts
4. **User Experience** optimization prompts

## 📋 Prompt Templates

### Code Generation Template

```
Generate [TYPE] code for [FEATURE] in the FilaPrint project:

Requirements:
- [REQUIREMENT 1]
- [REQUIREMENT 2]
- [REQUIREMENT 3]

Constraints:
- [CONSTRAINT 1]
- [CONSTRAINT 2]

Examples:
[EXAMPLE CODE]

Generate the implementation following these specifications.
```

### Problem Solving Template

```
I'm experiencing [PROBLEM] with [COMPONENT] in FilaPrint.

Context:
- [CONTEXT 1]
- [CONTEXT 2]

What I've tried:
- [ATTEMPT 1]
- [ATTEMPT 2]

Expected behavior:
[EXPECTED BEHAVIOR]

Please help me troubleshoot this issue step by step.
```

### Review Template

```
Please review this [CODE/DESIGN/ARCHITECTURE] for the FilaPrint project:

[CODE/DESIGN TO REVIEW]

Focus areas:
- Security vulnerabilities
- Performance issues
- Code quality
- Best practices
- Maintainability

Provide specific recommendations for improvement.
```

---

_This prompt engineering framework ensures consistent, high-quality AI assistance throughout the FilaPrint development process._
