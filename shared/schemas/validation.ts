import { z } from 'zod';

// Base validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// User authentication schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions')
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Printer connection schemas
export const printerConnectionSchema = z.object({
  name: z.string().min(1, 'Printer name is required').max(100, 'Printer name too long'),
  ipAddress: z.string().ip('Invalid IP address format'),
  accessCode: z.string().min(1, 'Access code is required').max(50, 'Access code too long'),
  model: z.enum(['H2D', 'X1C', 'P1S', 'A1'], { errorMap: () => ({ message: 'Invalid printer model' }) }),
  description: z.string().max(500, 'Description too long').optional()
});

export const mqttMessageSchema = z.object({
  timestamp: z.string().datetime(),
  printerId: z.string().uuid(),
  data: z.record(z.unknown()),
  messageType: z.enum(['status', 'progress', 'error', 'complete'])
});

// Filament management schemas
export const filamentSchema = z.object({
  name: z.string().min(1, 'Filament name is required').max(100, 'Filament name too long'),
  brand: z.string().min(1, 'Brand is required').max(50, 'Brand name too long'),
  material: z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'NYLON', 'WOOD', 'METAL'], {
    errorMap: () => ({ message: 'Invalid material type' })
  }),
  color: z.string().min(1, 'Color is required').max(30, 'Color name too long'),
  weight: z.number().positive('Weight must be positive').max(10000, 'Weight too large'),
  remainingWeight: z.number().min(0, 'Remaining weight cannot be negative').max(10000, 'Remaining weight too large'),
  diameter: z.number().positive('Diameter must be positive').max(10, 'Diameter too large'),
  temperature: z.object({
    nozzle: z.number().min(100, 'Nozzle temperature too low').max(400, 'Nozzle temperature too high'),
    bed: z.number().min(20, 'Bed temperature too low').max(150, 'Bed temperature too high')
  }),
  amsSlot: z.number().int().min(1).max(4).optional(),
  status: z.enum(['active', 'low', 'empty', 'stored'], {
    errorMap: () => ({ message: 'Invalid filament status' })
  })
});

// Print job schemas
export const printJobSchema = z.object({
  name: z.string().min(1, 'Job name is required').max(100, 'Job name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  printerId: z.string().uuid('Invalid printer ID'),
  filamentId: z.string().uuid('Invalid filament ID'),
  estimatedTime: z.number().positive('Estimated time must be positive').max(86400, 'Estimated time too long'), // max 24 hours
  priority: z.enum(['low', 'normal', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Invalid priority level' })
  }),
  settings: z.object({
    layerHeight: z.number().positive().max(1, 'Layer height too large'),
    infillPercentage: z.number().min(0).max(100, 'Infill percentage must be between 0-100'),
    printSpeed: z.number().positive().max(300, 'Print speed too high'),
    supportEnabled: z.boolean(),
    raftEnabled: z.boolean()
  })
});

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.string().optional(),
    timestamp: z.string().datetime(),
    requestId: z.string().uuid()
  }).optional(),
  meta: z.object({
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
    total: z.number().int().min(0).optional(),
    totalPages: z.number().int().min(0).optional()
  }).optional()
});

// Security validation schemas
export const sanitizedStringSchema = z.string().transform(val => {
  // Remove potentially dangerous characters
  return val
    .replace(/[<>\"'&]/g, '') // Remove HTML/XML characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
});

export const sqlInjectionSafeSchema = z.string().refine(val => {
  // Check for common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/i
  ];

  return !sqlPatterns.some(pattern => pattern.test(val));
}, 'Input contains potentially dangerous SQL patterns');

export const xssSafeSchema = z.string().refine(val => {
  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /<link[^>]*>.*?<\/link>/gi,
    /<meta[^>]*>.*?<\/meta>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi
  ];

  return !xssPatterns.some(pattern => pattern.test(val));
}, 'Input contains potentially dangerous XSS patterns');

// Rate limiting schemas
export const rateLimitSchema = z.object({
  windowMs: z.number().positive('Window must be positive'),
  maxRequests: z.number().int().positive('Max requests must be positive'),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false)
});

// Audit logging schemas
export const auditLogSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().min(1, 'Action is required'),
  resource: z.string().min(1, 'Resource is required'),
  ipAddress: z.string().ip('Invalid IP address'),
  userAgent: z.string().max(500, 'User agent too long'),
  timestamp: z.string().datetime(),
  success: z.boolean(),
  details: z.record(z.unknown()).optional()
});

// Export types
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type PrinterConnectionData = z.infer<typeof printerConnectionSchema>;
export type MQTTMessageData = z.infer<typeof mqttMessageSchema>;
export type FilamentData = z.infer<typeof filamentSchema>;
export type PrintJobData = z.infer<typeof printJobSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitSchema>;
export type AuditLogData = z.infer<typeof auditLogSchema>;


