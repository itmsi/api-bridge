/**
 * Swagger API Path Definitions for NetSuite Scripts (Admin) Module
 */

const netsuiteScriptsPaths = {
  '/admin/netsuite-scripts': {
    get: {
      tags: ['NetSuite Scripts (Admin)'],
      summary: 'Get all NetSuite script configurations',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Retrieve all NetSuite script configurations dengan pagination. Script configurations menentukan script ID dan deployment ID yang digunakan untuk setiap module dan operation.',
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
        },
        {
          name: 'module',
          in: 'query',
          description: 'Filter by module name',
          required: false,
          schema: {
            type: 'string',
            example: 'customer'
          }
        },
        {
          name: 'operation',
          in: 'query',
          description: 'Filter by operation name',
          required: false,
          schema: {
            type: 'string',
            example: 'getPage'
          }
        },
        {
          name: 'is_active',
          in: 'query',
          description: 'Filter by active status',
          required: false,
          schema: {
            type: 'boolean',
            example: true
          }
        }
      ],
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NetSuiteScriptListResponse' }
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
      tags: ['NetSuite Scripts (Admin)'],
      summary: 'Create or update NetSuite script configuration',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Create atau update NetSuite script configuration. Jika sudah ada dengan module dan operation yang sama, akan di-update. Jika belum ada, akan di-create.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/NetSuiteScriptInput' },
            example: {
              module: 'customer',
              operation: 'getPage',
              script_id: '532',
              deployment_id: '1',
              description: 'Get Customer Page - Get paginated customer list from NetSuite',
              is_active: true
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Script configuration created/updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/NetSuiteScript' },
                  message: { 
                    type: 'string', 
                    example: 'NetSuite script configuration berhasil dibuat/diupdate' 
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - validation error',
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
  '/admin/netsuite-scripts/module/{module}': {
    get: {
      tags: ['NetSuite Scripts (Admin)'],
      summary: 'Get all script configurations for a module',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Retrieve all script configurations untuk module tertentu',
      parameters: [
        {
          name: 'module',
          in: 'path',
          required: true,
          description: 'Module name',
          schema: {
            type: 'string',
            example: 'customer'
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
                    type: 'array',
                    items: { $ref: '#/components/schemas/NetSuiteScript' }
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Module not found',
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
  '/admin/netsuite-scripts/{module}/{operation}': {
    get: {
      tags: ['NetSuite Scripts (Admin)'],
      summary: 'Get script configuration by module and operation',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Retrieve script configuration untuk module dan operation tertentu',
      parameters: [
        {
          name: 'module',
          in: 'path',
          required: true,
          description: 'Module name',
          schema: {
            type: 'string',
            example: 'customer'
          }
        },
        {
          name: 'operation',
          in: 'path',
          required: true,
          description: 'Operation name',
          schema: {
            type: 'string',
            example: 'getPage'
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
                  data: { $ref: '#/components/schemas/NetSuiteScript' }
                }
              }
            }
          }
        },
        404: {
          description: 'Script configuration not found',
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
    },
    put: {
      tags: ['NetSuite Scripts (Admin)'],
      summary: 'Update NetSuite script configuration',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Update NetSuite script configuration untuk module dan operation tertentu',
      parameters: [
        {
          name: 'module',
          in: 'path',
          required: true,
          description: 'Module name',
          schema: {
            type: 'string',
            example: 'customer'
          }
        },
        {
          name: 'operation',
          in: 'path',
          required: true,
          description: 'Operation name',
          schema: {
            type: 'string',
            example: 'getPage'
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                script_id: {
                  type: 'string',
                  description: 'NetSuite Script ID',
                  example: '532'
                },
                deployment_id: {
                  type: 'string',
                  description: 'NetSuite Deployment ID',
                  example: '1'
                },
                description: {
                  type: 'string',
                  nullable: true,
                  description: 'Description of the script configuration',
                  example: 'Get Customer Page - Get paginated customer list from NetSuite'
                },
                is_active: {
                  type: 'boolean',
                  description: 'Active status',
                  example: true
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Script configuration updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/NetSuiteScript' },
                  message: { 
                    type: 'string', 
                    example: 'NetSuite script configuration berhasil diupdate' 
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Script configuration not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        400: {
          description: 'Bad request - validation error',
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
    },
    delete: {
      tags: ['NetSuite Scripts (Admin)'],
      summary: 'Delete NetSuite script configuration',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Soft delete NetSuite script configuration (set is_active = false) untuk module dan operation tertentu',
      parameters: [
        {
          name: 'module',
          in: 'path',
          required: true,
          description: 'Module name',
          schema: {
            type: 'string',
            example: 'customer'
          }
        },
        {
          name: 'operation',
          in: 'path',
          required: true,
          description: 'Operation name',
          schema: {
            type: 'string',
            example: 'getPage'
          }
        }
      ],
      responses: {
        200: {
          description: 'Script configuration deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { 
                    type: 'string', 
                    example: 'NetSuite script configuration berhasil dihapus' 
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Script configuration not found',
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
  }
};

module.exports = netsuiteScriptsPaths;

