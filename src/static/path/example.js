/**
 * Swagger API Path Definitions for Example Module
 */

const examplePaths = {
  '/examples': {
    get: {
      tags: ['Examples'],
      summary: 'Get all examples',
      description: 'Retrieve all examples with pagination',
      parameters: [
        {
          name: 'page',
          in: 'query',
          description: 'Page number',
          required: false,
          schema: {
            type: 'integer',
            default: 1
          }
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Items per page',
          required: false,
          schema: {
            type: 'integer',
            default: 10
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
                        items: { $ref: '#/components/schemas/Example' }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Examples'],
      summary: 'Create new example',
      description: 'Create a new example item',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ExampleInput' }
          }
        }
      },
      responses: {
        201: {
          description: 'Created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Example' },
                  message: { type: 'string', example: 'Data berhasil dibuat' }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/examples/{id}': {
    get: {
      tags: ['Examples'],
      summary: 'Get example by ID',
      description: 'Retrieve a single example by ID',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Example UUID',
          schema: {
            type: 'string',
            format: 'uuid'
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
                  data: { $ref: '#/components/schemas/Example' }
                }
              }
            }
          }
        },
        404: {
          description: 'Not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    put: {
      tags: ['Examples'],
      summary: 'Update example',
      description: 'Update an existing example',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Example UUID',
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ExampleInput' }
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
                  data: { $ref: '#/components/schemas/Example' },
                  message: { type: 'string', example: 'Data berhasil diupdate' }
                }
              }
            }
          }
        },
        404: {
          description: 'Not found'
        }
      }
    },
    delete: {
      tags: ['Examples'],
      summary: 'Delete example',
      description: 'Soft delete an example (sets deleted_at timestamp)',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Example UUID',
          schema: {
            type: 'string',
            format: 'uuid'
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
                  message: { type: 'string', example: 'Data berhasil dihapus' }
                }
              }
            }
          }
        },
        404: {
          description: 'Not found'
        }
      }
    }
  },
  '/examples/{id}/restore': {
    post: {
      tags: ['Examples'],
      summary: 'Restore deleted example',
      description: 'Restore a soft-deleted example',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Example UUID',
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      responses: {
        200: {
          description: 'Restored successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Example' },
                  message: { type: 'string', example: 'Data berhasil direstore' }
                }
              }
            }
          }
        },
        404: {
          description: 'Not found'
        }
      }
    }
  }
};

module.exports = examplePaths;

