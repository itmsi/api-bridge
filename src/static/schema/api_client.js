/**
 * Swagger Schema Definitions for API Client Module
 */

const apiClientSchemas = {
  ApiClient: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'API Client ID',
        example: 1
      },
      name: {
        type: 'string',
        description: 'Client name',
        example: 'Internal API - Order Service'
      },
      description: {
        type: 'string',
        nullable: true,
        description: 'Client description',
        example: 'API untuk order service internal'
      },
      api_url: {
        type: 'string',
        description: 'Registered API URL',
        example: 'https://api.internal.com/order-service'
      },
      client_key: {
        type: 'string',
        description: 'Client key (for authentication)',
        example: 'apikey_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
      },
      is_active: {
        type: 'boolean',
        description: 'Active status',
        example: true
      },
      rate_limit_per_minute: {
        type: 'integer',
        description: 'Rate limit per minute',
        example: 100
      },
      rate_limit_per_hour: {
        type: 'integer',
        description: 'Rate limit per hour',
        example: 1000
      },
      ip_whitelist: {
        type: 'array',
        nullable: true,
        description: 'IP whitelist (optional)',
        items: {
          type: 'string'
        },
        example: ['192.168.1.1', '10.0.0.1']
      },
      notes: {
        type: 'string',
        nullable: true,
        description: 'Additional notes',
        example: null
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp',
        example: '2025-01-02T10:00:00.000Z'
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp',
        example: '2025-01-02T10:00:00.000Z'
      },
      last_used_at: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Last used timestamp',
        example: '2025-01-02T10:00:00.000Z'
      }
    }
  },
  ApiClientRegisterRequest: {
    type: 'object',
    required: ['name', 'api_url'],
    properties: {
      name: {
        type: 'string',
        description: 'Client name',
        example: 'Internal API - Order Service'
      },
      description: {
        type: 'string',
        nullable: true,
        description: 'Client description',
        example: 'API untuk order service internal'
      },
      api_url: {
        type: 'string',
        format: 'uri',
        description: 'Registered API URL yang akan menggunakan API Bridge',
        example: 'https://api.internal.com/order-service'
      },
      ip_whitelist: {
        type: 'array',
        nullable: true,
        description: 'IP whitelist (optional)',
        items: {
          type: 'string'
        },
        example: ['192.168.1.1', '10.0.0.1']
      },
      rate_limit_per_minute: {
        type: 'integer',
        description: 'Rate limit per minute',
        default: 100,
        example: 100
      },
      rate_limit_per_hour: {
        type: 'integer',
        description: 'Rate limit per hour',
        default: 1000,
        example: 1000
      },
      notes: {
        type: 'string',
        nullable: true,
        description: 'Additional notes',
        example: null
      }
    }
  },
  ApiClientRegisterResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1
          },
          name: {
            type: 'string',
            example: 'Internal API - Order Service'
          },
          api_url: {
            type: 'string',
            example: 'https://api.internal.com/order-service'
          },
          client_key: {
            type: 'string',
            description: 'Client key (save this securely)',
            example: 'apikey_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
          },
          client_secret: {
            type: 'string',
            description: 'Client secret (save this securely - only shown once)',
            example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6'
          },
          is_active: {
            type: 'boolean',
            example: true
          }
        }
      },
      message: {
        type: 'string',
        example: 'API client berhasil didaftarkan. Simpan client_key dan client_secret dengan aman!'
      }
    }
  },
  ApiClientUpdateRequest: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Client name'
      },
      description: {
        type: 'string',
        nullable: true
      },
      api_url: {
        type: 'string',
        format: 'uri'
      },
      is_active: {
        type: 'boolean'
      },
      ip_whitelist: {
        type: 'array',
        nullable: true,
        items: {
          type: 'string'
        }
      },
      rate_limit_per_minute: {
        type: 'integer'
      },
      rate_limit_per_hour: {
        type: 'integer'
      },
      notes: {
        type: 'string',
        nullable: true
      }
    }
  }
};

module.exports = apiClientSchemas;

