/**
 * Swagger Schema Definitions for NetSuite Scripts Module
 */

const netsuiteScriptsSchemas = {
  NetSuiteScript: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'NetSuite Script Configuration ID',
        example: 1
      },
      module: {
        type: 'string',
        description: 'Module name (e.g., customer, order, item)',
        example: 'customer'
      },
      operation: {
        type: 'string',
        description: 'Operation name (e.g., read, create, update, getPage, search)',
        example: 'getPage'
      },
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
      }
    }
  },
  NetSuiteScriptInput: {
    type: 'object',
    required: ['module', 'operation', 'script_id'],
    properties: {
      module: {
        type: 'string',
        description: 'Module name (e.g., customer, order, item)',
        example: 'customer'
      },
      operation: {
        type: 'string',
        description: 'Operation name (e.g., read, create, update, getPage, search)',
        example: 'getPage'
      },
      script_id: {
        type: 'string',
        description: 'NetSuite Script ID',
        example: '532'
      },
      deployment_id: {
        type: 'string',
        description: 'NetSuite Deployment ID (default: "1")',
        default: '1',
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
        description: 'Active status (default: true)',
        default: true,
        example: true
      }
    }
  },
  NetSuiteScriptListResponse: {
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
            items: { $ref: '#/components/schemas/NetSuiteScript' }
          },
          pagination: { $ref: '#/components/schemas/Pagination' }
        }
      }
    }
  }
};

module.exports = netsuiteScriptsSchemas;

