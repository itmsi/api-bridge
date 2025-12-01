/**
 * Swagger API Path Definitions for API Client (Admin) Module
 */

const apiClientPaths = {
  '/admin/api-clients': {
    get: {
      tags: ['API Clients (Admin)'],
      summary: 'Get all API clients',
      description: 'Retrieve all registered API clients with pagination',
      parameters: [
        {
          name: 'page',
          in: 'query',
          description: 'Page number',
          required: false,
          schema: {
            type: 'integer',
            default: 1,
            minimum: 1
          }
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Items per page',
          required: false,
          schema: {
            type: 'integer',
            default: 50,
            minimum: 1,
            maximum: 100
          }
        }
      ],
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      items: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ApiClient' }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        },
        500: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    post: {
      tags: ['API Clients (Admin)'],
      summary: 'Register new API client',
      description: 'Register new API client untuk mendapatkan client_key dan client_secret. URL API yang didaftarkan akan bisa mengakses API Bridge dengan credentials tersebut.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiClientRegisterRequest' },
            example: {
              name: 'Internal API - Order Service',
              description: 'API untuk order service internal',
              api_url: 'https://api.internal.com/order-service',
              ip_whitelist: ['192.168.1.1', '10.0.0.1'],
              rate_limit_per_minute: 100,
              rate_limit_per_hour: 1000,
              notes: 'Production API'
            }
          }
        }
      },
      responses: {
        201: {
          description: 'API client registered successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiClientRegisterResponse' }
            }
          }
        },
        400: {
          description: 'Bad request - validation error or API URL already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        500: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/admin/api-clients/{id}': {
    get: {
      tags: ['API Clients (Admin)'],
      summary: 'Get API client by ID',
      description: 'Retrieve API client details by ID (client_secret tidak ditampilkan untuk security)',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'API Client ID',
          schema: {
            type: 'integer'
          }
        }
      ],
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/ApiClient' }
                }
              }
            }
          }
        },
        404: {
          description: 'API client not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    put: {
      tags: ['API Clients (Admin)'],
      summary: 'Update API client',
      description: 'Update API client information (cannot change client_key, use regenerate-secret for secret)',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'API Client ID',
          schema: {
            type: 'integer'
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiClientUpdateRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/ApiClient' },
                  message: { type: 'string', example: 'API client berhasil diupdate' }
                }
              }
            }
          }
        },
        404: {
          description: 'API client not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    delete: {
      tags: ['API Clients (Admin)'],
      summary: 'Delete API client',
      description: 'Delete API client (permanent deletion)',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'API Client ID',
          schema: {
            type: 'integer'
          }
        }
      ],
      responses: {
        200: {
          description: 'Deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'API client berhasil dihapus' }
                }
              }
            }
          }
        },
        404: {
          description: 'API client not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/admin/api-clients/{id}/regenerate-secret': {
    post: {
      tags: ['API Clients (Admin)'],
      summary: 'Regenerate client secret',
      description: 'Generate new client_secret untuk API client. Secret lama akan tidak berlaku lagi.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'API Client ID',
          schema: {
            type: 'integer'
          }
        }
      ],
      responses: {
        200: {
          description: 'Secret regenerated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      client_key: { type: 'string' },
                      client_secret: {
                        type: 'string',
                        description: 'New client secret (save this securely - only shown once)'
                      }
                    }
                  },
                  message: {
                    type: 'string',
                    example: 'Client secret berhasil di-regenerate. Simpan secret baru dengan aman!'
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'API client not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/admin/api-clients/{id}/toggle-status': {
    post: {
      tags: ['API Clients (Admin)'],
      summary: 'Toggle active status',
      description: 'Aktifkan atau nonaktifkan API client',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'API Client ID',
          schema: {
            type: 'integer'
          }
        }
      ],
      responses: {
        200: {
          description: 'Status updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/ApiClient' },
                  message: {
                    type: 'string',
                    example: 'API client berhasil diaktifkan'
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'API client not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  }
};

module.exports = apiClientPaths;

