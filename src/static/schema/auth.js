/**
 * Swagger Schema Definitions for OAuth2 Authentication Module
 */

const authSchemas = {
  OAuth2TokenRequest: {
    type: 'object',
    required: ['grant_type'],
    properties: {
      grant_type: {
        type: 'string',
        enum: ['client_credentials', 'refresh_token'],
        description: 'OAuth2 grant type',
        example: 'client_credentials'
      },
      client_id: {
        type: 'string',
        description: 'Client ID (client_key) - required for client_credentials grant',
        example: 'apikey_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
      },
      client_secret: {
        type: 'string',
        description: 'Client Secret - required for client_credentials grant',
        example: 'abc123def456...'
      },
      refresh_token: {
        type: 'string',
        description: 'Refresh token - required for refresh_token grant',
        example: 'abc123def456ghi789...'
      }
    }
  },
  OAuth2TokenResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'Success'
      },
      data: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'JWT access token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhcGlrZXlfYWJjMTIzIiwiaWF0IjoxNjE2MjM5MDIyfQ...'
          },
          refresh_token: {
            type: 'string',
            description: 'Refresh token untuk mendapatkan access token baru',
            example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
          },
          token_type: {
            type: 'string',
            enum: ['Bearer'],
            description: 'Token type (selalu Bearer)',
            example: 'Bearer'
          },
          expires_in: {
            type: 'integer',
            description: 'Access token expiration time dalam detik',
            example: 3600
          },
          refresh_token_expires_in: {
            type: 'integer',
            description: 'Refresh token expiration time dalam detik',
            example: 2592000
          }
        }
      }
    }
  },
  OAuth2TokenErrorResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'boolean',
        example: false
      },
      message: {
        type: 'string',
        example: 'Error'
      },
      data: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            enum: ['invalid_request', 'invalid_client', 'invalid_token', 'unsupported_grant_type'],
            description: 'OAuth2 error code',
            example: 'invalid_client'
          },
          error_description: {
            type: 'string',
            description: 'Human-readable error description',
            example: 'Invalid client credentials'
          }
        }
      }
    }
  },
  OAuth2RevokeRequest: {
    type: 'object',
    required: ['refresh_token'],
    properties: {
      refresh_token: {
        type: 'string',
        description: 'Refresh token yang akan di-revoke',
        example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
      }
    }
  },
  OAuth2RevokeResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'Token revoked successfully'
      },
      data: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Token revoked successfully'
          }
        }
      }
    }
  }
};

module.exports = authSchemas;

