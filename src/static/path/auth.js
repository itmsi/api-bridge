/**
 * Swagger API Path Definitions for OAuth2 Authentication Module
 */

const authPaths = {
  '/auth/token': {
    post: {
      tags: ['OAuth2 Authentication'],
      summary: 'Get OAuth2 Access Token',
      description: 'Endpoint untuk mendapatkan access token dan refresh token menggunakan OAuth2. Mendukung grant type: client_credentials (dengan client_key dan client_secret) dan refresh_token (dengan refresh_token yang sudah ada).',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OAuth2TokenRequest' },
            examples: {
              clientCredentials: {
                summary: 'Client Credentials Grant',
                description: 'Menggunakan client_key dan client_secret untuk mendapatkan token',
                value: {
                  grant_type: 'client_credentials',
                  client_id: 'apikey_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
                  client_secret: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
                }
              },
              refreshToken: {
                summary: 'Refresh Token Grant',
                description: 'Menggunakan refresh_token untuk mendapatkan access token baru',
                value: {
                  grant_type: 'refresh_token',
                  refresh_token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
                }
              }
            }
          },
          'application/x-www-form-urlencoded': {
            schema: { $ref: '#/components/schemas/OAuth2TokenRequest' }
          }
        }
      },
      security: [],
      responses: {
        200: {
          description: 'Token berhasil di-generate',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuth2TokenResponse' },
              example: {
                status: true,
                message: 'Success',
                data: {
                  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhcGlrZXlfYWJjMTIzIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE2MTYyNDI2MjJ9...',
                  refresh_token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
                  token_type: 'Bearer',
                  expires_in: 3600,
                  refresh_token_expires_in: 2592000
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - invalid grant type atau missing required fields',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuth2TokenErrorResponse' },
              examples: {
                invalidRequest: {
                  summary: 'Invalid Request',
                  value: {
                    status: false,
                    message: 'Error',
                    data: {
                      error: 'invalid_request',
                      error_description: 'grant_type is required'
                    }
                  }
                },
                unsupportedGrantType: {
                  summary: 'Unsupported Grant Type',
                  value: {
                    status: false,
                    message: 'Error',
                    data: {
                      error: 'unsupported_grant_type',
                      error_description: "Grant type 'authorization_code' is not supported"
                    }
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized - invalid client credentials atau invalid refresh token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuth2TokenErrorResponse' },
              examples: {
                invalidClient: {
                  summary: 'Invalid Client Credentials',
                  value: {
                    status: false,
                    message: 'Error',
                    data: {
                      error: 'invalid_client',
                      error_description: 'Invalid client credentials'
                    }
                  }
                },
                invalidToken: {
                  summary: 'Invalid Refresh Token',
                  value: {
                    status: false,
                    message: 'Error',
                    data: {
                      error: 'invalid_client',
                      error_description: 'Invalid refresh token'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    get: {
      tags: ['OAuth2 Authentication'],
      summary: 'Get OAuth2 Access Token (Alternative)',
      description: 'Alternatif endpoint untuk mendapatkan access token menggunakan query parameters. Juga mendukung Basic Authentication header.',
      parameters: [
        {
          name: 'grant_type',
          in: 'query',
          required: true,
          description: 'OAuth2 grant type',
          schema: {
            type: 'string',
            enum: ['client_credentials', 'refresh_token']
          }
        },
        {
          name: 'client_id',
          in: 'query',
          required: false,
          description: 'Client ID (client_key) - required for client_credentials grant',
          schema: {
            type: 'string'
          }
        },
        {
          name: 'client_secret',
          in: 'query',
          required: false,
          description: 'Client Secret - required for client_credentials grant',
          schema: {
            type: 'string'
          }
        },
        {
          name: 'refresh_token',
          in: 'query',
          required: false,
          description: 'Refresh token - required for refresh_token grant',
          schema: {
            type: 'string'
          }
        }
      ],
      security: [
        {
          BasicAuth: []
        }
      ],
      responses: {
        200: {
          description: 'Token berhasil di-generate',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuth2TokenResponse' }
            }
          }
        },
        400: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuth2TokenErrorResponse' }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuth2TokenErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/auth/revoke': {
    post: {
      tags: ['OAuth2 Authentication'],
      summary: 'Revoke Refresh Token',
      description: 'Revoke refresh token agar tidak bisa digunakan lagi untuk mendapatkan access token baru.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OAuth2RevokeRequest' },
            example: {
              refresh_token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
            }
          },
          'application/x-www-form-urlencoded': {
            schema: { $ref: '#/components/schemas/OAuth2RevokeRequest' }
          }
        }
      },
      security: [],
      responses: {
        200: {
          description: 'Token berhasil di-revoke',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuth2RevokeResponse' },
              example: {
                status: true,
                message: 'Token revoked successfully',
                data: {
                  message: 'Token revoked successfully'
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - refresh_token tidak ditemukan atau sudah di-revoke',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                status: false,
                message: 'Error',
                data: {
                  error: 'invalid_request',
                  error_description: 'Refresh token not found or already revoked'
                }
              }
            }
          }
        }
      }
    }
  }
};

module.exports = authPaths;

