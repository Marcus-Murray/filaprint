module.exports = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FilaPrint API',
      version: '1.0.0',
      description: 'Professional Bambu Labs Printer Management System API',
      contact: {
        name: 'Marcus Murray',
        email: 'marcus@filaprint.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://staging.filaprint.com/api',
        description: 'Staging server'
      },
      {
        url: 'https://filaprint.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            isActive: { type: 'boolean' },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Printer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            model: { type: 'string', enum: ['H2D', 'X1C', 'P1S', 'A1'] },
            ipAddress: { type: 'string', format: 'ipv4' },
            serialNumber: { type: 'string' },
            description: { type: 'string' },
            isActive: { type: 'boolean' },
            connectionStatus: { type: 'string', enum: ['connected', 'disconnected', 'error'] },
            lastConnectedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Filament: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            brand: { type: 'string' },
            material: { type: 'string', enum: ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'NYLON', 'WOOD', 'METAL'] },
            color: { type: 'string' },
            weight: { type: 'number' },
            remainingWeight: { type: 'number' },
            diameter: { type: 'number' },
            nozzleTemperature: { type: 'integer' },
            bedTemperature: { type: 'integer' },
            amsSlot: { type: 'integer', minimum: 1, maximum: 4 },
            status: { type: 'string', enum: ['active', 'low', 'empty', 'stored'] },
            purchaseDate: { type: 'string', format: 'date' },
            purchasePrice: { type: 'number' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        PrintJob: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['queued', 'printing', 'paused', 'completed', 'failed', 'cancelled'] },
            priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
            estimatedTime: { type: 'integer' },
            actualTime: { type: 'integer' },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            layerHeight: { type: 'number' },
            infillPercentage: { type: 'number', minimum: 0, maximum: 100 },
            printSpeed: { type: 'number' },
            supportEnabled: { type: 'boolean' },
            raftEnabled: { type: 'boolean' },
            gcodeFile: { type: 'string' },
            stlFile: { type: 'string' },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './server/routes/*.ts',
    './server/middleware/*.ts',
    './server/services/*.ts'
  ]
};


