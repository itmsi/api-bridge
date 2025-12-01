/**
 * Swagger API Path Definitions for Sync (Admin) Module
 */

const syncPaths = {
  '/admin/sync': {
    post: {
      tags: ['Sync (Admin)'],
      summary: 'Trigger manual sync',
      description: 'Manually trigger a sync job for a specific module',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SyncTriggerRequest' }
          }
        }
      },
      responses: {
        202: {
          description: 'Sync job triggered successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SyncTriggerResponse' }
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
  '/admin/sync/job/{jobId}': {
    get: {
      tags: ['Sync (Admin)'],
      summary: 'Get sync job status',
      description: 'Retrieve the status of a sync job by job ID',
      parameters: [
        {
          name: 'jobId',
          in: 'path',
          required: true,
          description: 'Sync job UUID',
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
                  data: { $ref: '#/components/schemas/SyncJob' }
                }
              }
            }
          }
        },
        404: {
          description: 'Job not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/admin/sync/status/{module}': {
    get: {
      tags: ['Sync (Admin)'],
      summary: 'Get sync tracker status',
      description: 'Retrieve sync tracker status for a specific module',
      parameters: [
        {
          name: 'module',
          in: 'path',
          required: true,
          description: 'Module name',
          schema: {
            type: 'string',
            enum: ['customer']
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
                  data: { $ref: '#/components/schemas/SyncTracker' }
                }
              }
            }
          }
        }
      }
    }
  },
  '/admin/sync/failed': {
    get: {
      tags: ['Sync (Admin)'],
      summary: 'Get failed jobs',
      description: 'Retrieve list of failed sync jobs',
      parameters: [
        {
          name: 'module',
          in: 'query',
          description: 'Filter by module',
          required: false,
          schema: {
            type: 'string',
            enum: ['customer']
          }
        },
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
                        items: { $ref: '#/components/schemas/FailedJob' }
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
    }
  },
  '/admin/sync/failed/{jobId}/retry': {
    post: {
      tags: ['Sync (Admin)'],
      summary: 'Retry failed job',
      description: 'Retry a failed sync job by creating a new job with the same parameters',
      parameters: [
        {
          name: 'jobId',
          in: 'path',
          required: true,
          description: 'Failed job UUID',
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      responses: {
        202: {
          description: 'Job retry triggered successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      jobId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'New job ID'
                      },
                      previousJobId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'Original failed job ID'
                      },
                      module: {
                        type: 'string',
                        example: 'customer'
                      }
                    }
                  },
                  message: {
                    type: 'string',
                    example: 'Job telah di-retry'
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Failed job not found',
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

module.exports = syncPaths;

