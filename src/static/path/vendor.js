/**
 * Swagger API Path Definitions for Vendor Module
 */

const vendorPaths = {
  '/vendors/get': {
    post: {
      tags: ['Vendors'],
      summary: 'Get all vendors',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Retrieve all vendors with pagination, filtering, and on-demand incremental sync. Format request: { pageSize, pageIndex, lastmodified }. Format response: { success, pageIndex, pageSize, totalRows, totalPages, items }. Sistem akan secara otomatis: 1) Hit ke API NetSuite untuk mendapatkan data terbaru dengan looping untuk semua halaman (jika ada lebih dari pageSize data), 2) Cek data lastupdate yang ada di DB internal, 3) Sync data yang lebih besar dari lastupdate-nya jika diperlukan. Returns cached data if available, triggers incremental sync if data is stale or newer data exists in NetSuite.',
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/VendorGetRequest' },
            example: {
              pageSize: 50,
              pageIndex: 0,
              lastmodified: '21/11/2025',
              email: null,
              name: null,
              netsuite_id: null
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Success - Returns vendor list. May trigger incremental sync in background if data is stale or newer data exists in NetSuite.',
          headers: {
            'X-Sync-Triggered': {
              description: 'Indicates if an incremental sync was triggered',
              schema: {
                type: 'string',
                example: 'true'
              }
            },
            'X-Synced-Count': {
              description: 'Number of vendors synced from NetSuite',
              schema: {
                type: 'string',
                example: '3'
              }
            }
          },
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VendorListResponse' }
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
  '/vendors/{id}': {
    get: {
      tags: ['Vendors'],
      summary: 'Get vendor by ID',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Retrieve a single vendor by database ID',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Vendor database ID',
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
                  data: { $ref: '#/components/schemas/Vendor' }
                }
              }
            }
          }
        },
        404: {
          description: 'Vendor not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/vendors/netsuite/{netsuite_id}': {
    get: {
      tags: ['Vendors'],
      summary: 'Get vendor by NetSuite ID',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Retrieve vendor by NetSuite ID',
      parameters: [
        {
          name: 'netsuite_id',
          in: 'path',
          required: true,
          description: 'NetSuite Vendor ID (internalId)',
          schema: {
            type: 'string'
          }
        }
      ],
      responses: {
        200: {
          description: 'Success - Vendor found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Vendor' },
                  fromCache: {
                    type: 'boolean',
                    description: 'Indicates if response was served from cache',
                    example: false
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Vendor not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/vendors/search': {
    post: {
      tags: ['Vendors'],
      summary: 'Search vendors from NetSuite',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Search vendors directly from NetSuite with pagination. Format: { pageSize, pageIndex, lastmodified }',
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/VendorSearchRequest' },
            example: {
              pageIndex: 0,
              pageSize: 50,
              lastmodified: '21/11/2025',
              netsuite_id: null
            }
          }
        }
      },
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
                        items: { $ref: '#/components/schemas/Vendor' }
                      },
                      hasMore: {
                        type: 'boolean',
                        example: false
                      },
                      totalResults: {
                        type: 'integer',
                        example: 3
                      },
                      pageIndex: {
                        type: 'integer',
                        example: 0
                      },
                      pageSize: {
                        type: 'integer',
                        example: 50
                      },
                      totalRows: {
                        type: 'integer',
                        example: 3
                      },
                      totalPages: {
                        type: 'integer',
                        example: 1
                      }
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
    }
  }
};

module.exports = vendorPaths;

