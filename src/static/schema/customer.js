/**
 * Swagger Schema Definitions for Customer Module
 */

const customerSchemas = {
  Customer: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Customer ID',
        example: 50
      },
      name: {
        type: 'string',
        description: 'Customer name',
        example: 'KH1020019 - PT. OSEAN KONSTRUKSI ENERGI'
      },
      email: {
        type: 'string',
        nullable: true,
        format: 'email',
        description: 'Customer email',
        example: ''
      },
      phone: {
        type: 'string',
        nullable: true,
        description: 'Customer phone',
        example: ''
      },
      entityId: {
        type: 'string',
        description: 'Entity ID from NetSuite',
        example: 'KH1020019 - PT. OSEAN KONSTRUKSI ENERGI'
      },
      companyName: {
        type: 'string',
        description: 'Company name from NetSuite',
        example: 'KH1020019 - PT. OSEAN KONSTRUKSI ENERGI'
      }
    }
  },
  CustomerListResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Customer' }
          },
          pagination: { $ref: '#/components/schemas/Pagination' }
        }
      },
      fromCache: {
        type: 'boolean',
        description: 'Indicates if response was served from cache',
        example: false
      }
    }
  },
  SyncTriggerResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            format: 'uuid',
            description: 'Sync job ID',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          module: {
            type: 'string',
            example: 'customer'
          },
          status: {
            type: 'string',
            example: 'pending'
          },
          params: {
            type: 'object',
            additionalProperties: true
          }
        }
      },
      message: {
        type: 'string',
        example: 'Sync job telah di-trigger'
      }
    }
  },
  CustomerInput: {
    type: 'object',
    required: ['companyname'],
    properties: {
      customform: {
        type: 'string',
        description: 'Custom form ID',
        example: '5'
      },
      isperson: {
        type: 'string',
        enum: ['T', 'F'],
        description: 'Is person flag',
        example: 'F'
      },
      firstname: {
        type: 'string',
        description: 'First name (for person)',
        example: ''
      },
      lastname: {
        type: 'string',
        description: 'Last name (for person)',
        example: ''
      },
      companyname: {
        type: 'string',
        description: 'Company name',
        example: 'PT ABC'
      },
      subsidiary: {
        type: 'string',
        description: 'Subsidiary ID',
        example: '1'
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Customer email',
        example: 'abc@test.com'
      },
      phone: {
        type: 'string',
        description: 'Customer phone',
        example: '62128214884'
      },
      vatregnumber: {
        type: 'string',
        description: 'VAT registration number',
        example: '99.00.000.000'
      },
      autoname: {
        type: 'boolean',
        description: 'Auto name flag',
        example: false
      },
      entityid: {
        type: 'string',
        description: 'Entity ID',
        example: 'CST1200 - PT ABC'
      },
      isinactive: {
        type: 'boolean',
        description: 'Is inactive flag',
        example: false
      },
      transactionType: {
        type: 'string',
        description: 'Transaction type',
        example: 'customer'
      },
      address: {
        type: 'array',
        description: 'Customer addresses',
        items: {
          type: 'object',
          properties: {
            defaultshipping: {
              type: 'string',
              enum: ['TRUE', 'FALSE'],
              example: 'TRUE'
            },
            defaultbilling: {
              type: 'string',
              enum: ['TRUE', 'FALSE'],
              example: 'TRUE'
            },
            country: {
              type: 'string',
              example: 'ID'
            },
            label: {
              type: 'string',
              example: 'PT ABC'
            },
            override_initialvalue: {
              type: 'string',
              enum: ['TRUE', 'FALSE'],
              example: 'TRUE'
            },
            addrtext: {
              type: 'string',
              example: 'Jl. Kemanggisan No. 10'
            }
          }
        }
      },
      internalid: {
        type: 'integer',
        description: 'NetSuite internal ID (required for update)',
        example: 420
      }
    }
  },
  CustomerGetRequest: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        description: 'Page number',
        default: 1,
        minimum: 1,
        example: 1
      },
      limit: {
        type: 'integer',
        description: 'Items per page',
        default: 10,
        minimum: 1,
        maximum: 100,
        example: 10
      },
      email: {
        type: 'string',
        nullable: true,
        description: 'Filter by email (partial match)',
        example: 'abc@example.com'
      },
      name: {
        type: 'string',
        nullable: true,
        description: 'Filter by name (partial match)',
        example: 'PT ABC'
      },
      netsuite_id: {
        type: 'string',
        nullable: true,
        description: 'Filter by NetSuite ID',
        example: '123'
      }
    }
  },
  CustomerSearchRequest: {
    type: 'object',
    properties: {
      pageIndex: {
        type: 'integer',
        description: 'Page index (0-based)',
        default: 0,
        minimum: 0,
        example: 0
      },
      pageSize: {
        type: 'integer',
        description: 'Items per page',
        default: 50,
        minimum: 1,
        maximum: 1000,
        example: 50
      },
      lastmodified: {
        type: 'string',
        nullable: true,
        description: 'Filter by last modified date (format: DD/MM/YYYY)',
        example: '21/11/2025'
      },
      // Legacy support
      page: {
        type: 'integer',
        description: 'Page number (1-based, will be converted to pageIndex)',
        minimum: 1,
        example: 1
      },
      since: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Filter by last modified date (legacy format, will be converted to lastmodified)',
        example: '2025-01-01T00:00:00.000Z'
      },
      netsuite_id: {
        type: 'string',
        nullable: true,
        description: 'Filter by NetSuite ID',
        example: '123'
      }
    }
  }
};

module.exports = customerSchemas;

