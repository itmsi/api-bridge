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
    description: 'Response format sesuai dengan NetSuite pagination format',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      pageIndex: {
        type: 'integer',
        description: 'Current page index (0-based)',
        example: 0
      },
      pageSize: {
        type: 'integer',
        description: 'Items per page',
        example: 50
      },
      totalRows: {
        type: 'integer',
        description: 'Total number of rows',
        example: 5
      },
      totalPages: {
        type: 'integer',
        description: 'Total number of pages',
        example: 1
      },
      items: {
        type: 'array',
        description: 'Array of customer items',
        items: { $ref: '#/components/schemas/Customer' }
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
      pageSize: {
        type: 'integer',
        description: 'Items per page (NetSuite format)',
        default: 50,
        minimum: 1,
        maximum: 1000,
        example: 50
      },
      pageIndex: {
        type: 'integer',
        description: 'Page index (0-based, NetSuite format)',
        default: 0,
        minimum: 0,
        example: 0
      },
      lastmodified: {
        type: 'string',
        nullable: true,
        description: 'Filter by last modified date (format: ISO 8601 dengan timezone, contoh: YYYY-MM-DDTHH:mm:ss+07:00). Jika tidak disediakan, akan menggunakan max(last_modified_netsuite) dari DB.',
        example: '2025-11-21T10:00:00+07:00'
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
        description: 'Filter by last modified date (format: ISO 8601 dengan timezone, contoh: YYYY-MM-DDTHH:mm:ss+07:00)',
        example: '2025-11-21T10:00:00+07:00'
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

