/**
 * Swagger Schema Definitions for Vendor Module
 */

const vendorSchemas = {
  Vendor: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Vendor ID',
        example: 1
      },
      name: {
        type: 'string',
        description: 'Vendor name',
        example: 'PT ABC'
      },
      email: {
        type: 'string',
        nullable: true,
        format: 'email',
        description: 'Vendor email',
        example: ''
      },
      phone: {
        type: 'string',
        nullable: true,
        description: 'Vendor phone',
        example: ''
      },
      entityId: {
        type: 'string',
        description: 'Entity ID from NetSuite',
        example: 'VND001 - PT ABC'
      },
      companyName: {
        type: 'string',
        description: 'Company name from NetSuite',
        example: 'PT ABC'
      }
    }
  },
  VendorListResponse: {
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
            items: { $ref: '#/components/schemas/Vendor' }
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
  VendorGetRequest: {
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
        example: '731'
      }
    }
  },
  VendorSearchRequest: {
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
        example: '731'
      }
    }
  }
};

module.exports = vendorSchemas;

