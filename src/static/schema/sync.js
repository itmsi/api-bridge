/**
 * Swagger Schema Definitions for Sync Module
 */

const syncSchemas = {
  SyncJob: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Sync job database ID',
        example: 1
      },
      job_id: {
        type: 'string',
        format: 'uuid',
        description: 'Sync job UUID',
        example: '123e4567-e89b-12d3-a456-426614174000'
      },
      module: {
        type: 'string',
        description: 'Module name',
        example: 'customer'
      },
      params: {
        type: 'object',
        nullable: true,
        description: 'Job parameters',
        additionalProperties: true
      },
      status: {
        type: 'string',
        enum: ['pending', 'processing', 'success', 'failed'],
        description: 'Job status',
        example: 'pending'
      },
      attempts: {
        type: 'integer',
        description: 'Number of retry attempts',
        example: 0
      },
      last_error: {
        type: 'string',
        nullable: true,
        description: 'Last error message',
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
      started_at: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Job start timestamp',
        example: null
      },
      completed_at: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Job completion timestamp',
        example: null
      }
    }
  },
  SyncTracker: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Tracker ID',
        example: 1
      },
      module: {
        type: 'string',
        description: 'Module name',
        example: 'customer'
      },
      last_sync_at: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Last sync timestamp',
        example: '2025-01-02T10:00:00.000Z'
      },
      last_synced_batch_max: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Maximum lastModifiedDate from last batch',
        example: '2025-01-02T10:00:00.000Z'
      },
      status: {
        type: 'string',
        enum: ['idle', 'syncing', 'success', 'failed'],
        description: 'Sync status',
        example: 'idle'
      },
      remark: {
        type: 'string',
        nullable: true,
        description: 'Sync remarks',
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
      }
    }
  },
  SyncTriggerRequest: {
    type: 'object',
    required: ['module'],
    properties: {
      module: {
        type: 'string',
        description: 'Module to sync',
        example: 'customer',
        enum: ['customer']
      },
      since: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Sync since this date (optional, uses last sync if not provided)',
        example: '2025-01-01T00:00:00.000Z'
      },
      type: {
        type: 'string',
        enum: ['incremental_sync', 'full_sync'],
        default: 'incremental_sync',
        description: 'Sync type',
        example: 'incremental_sync'
      }
    }
  },
  FailedJob: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Failed job ID',
        example: 1
      },
      job_id: {
        type: 'string',
        format: 'uuid',
        description: 'Original job ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
      },
      module: {
        type: 'string',
        description: 'Module name',
        example: 'customer'
      },
      payload: {
        type: 'object',
        nullable: true,
        description: 'Job payload',
        additionalProperties: true
      },
      error: {
        type: 'string',
        nullable: true,
        description: 'Error message',
        example: 'NetSuite API error: Connection timeout'
      },
      stack_trace: {
        type: 'string',
        nullable: true,
        description: 'Error stack trace',
        example: null
      },
      attempts: {
        type: 'integer',
        description: 'Number of attempts before failure',
        example: 3
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp',
        example: '2025-01-02T10:00:00.000Z'
      }
    }
  }
};

module.exports = syncSchemas;

