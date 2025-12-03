/**
 * Swagger API Path Definitions for Customer Module
 */

const customerPaths = {
  '/customers/get': {
    post: {
      tags: ['Customers'],
      summary: 'Get all customers',
      security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
      description: 'Retrieve all customers with pagination, filtering, and on-demand incremental sync. Format request: { pageSize, pageIndex, lastmodified, netsuite_id }. Format response: { success, pageIndex, pageSize, totalRows, totalPages, items }. Setiap item dalam response akan di-transform dan berisi: id, name, email, phone, entityId (dari data JSON), companyName (dari data JSON). Sistem akan secara otomatis: 1) Hit ke API NetSuite untuk mendapatkan data terbaru dengan looping untuk semua halaman (jika ada lebih dari pageSize data), 2) Bandingkan lastModifiedDate dari NetSuite dengan max(last_modified_netsuite) di DB, 3) Sync (insert/update) data yang lebih baru ke DB, 4) Skip jika tidak ada data yang lebih baru. Returns cached data if available, automatically syncs newer data from NetSuite if found.',
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CustomerGetRequest' },
            example: {
              pageSize: 50,
              pageIndex: 0,
              lastmodified: '2025-11-21T10:00:00+07:00',
              netsuite_id: null
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Success - Returns customer list. Automatically syncs newer data from NetSuite if found during the request.',
          headers: {
            'X-Sync-Triggered': {
              description: 'Indicates if an incremental sync job was triggered',
              schema: {
                type: 'string',
                example: 'true'
              }
            },
            'X-Job-Id': {
              description: 'Sync job ID if incremental sync was triggered',
              schema: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              }
            },
            'X-Sync-Reason': {
              description: 'Reason why sync was triggered (e.g., "Data is stale", "NetSuite has newer data")',
              schema: {
                type: 'string',
                example: 'NetSuite has newer data (NetSuite: 2025-12-01T10:00:00.000Z, DB: 2025-11-30T10:00:00.000Z)'
              }
            },
            'X-Synced-Count': {
              description: 'Number of customers synced from NetSuite',
              schema: {
                type: 'string',
                example: '3'
              }
            }
          },
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CustomerListResponse' }
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
  // '/customers/create': {
  //   post: {
  //     tags: ['Customers'],
  //     summary: 'Create customer',
  //     security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
  //     description: 'Create new customer in NetSuite and sync to local database. Mirrors "Customer (Create)" from Postman collection.',
  //     requestBody: {
  //       required: true,
  //       content: {
  //         'application/json': {
  //           schema: { $ref: '#/components/schemas/CustomerInput' },
  //           example: {
  //             customform: '5',
  //             isperson: 'F',
  //             firstname: '',
  //             lastname: '',
  //             companyname: 'PT ABC',
  //             subsidiary: '1',
  //             email: 'abc@test.com',
  //             phone: '62128214884',
  //             vatregnumber: '99.00.000.000',
  //             autoname: false,
  //             entityid: 'CST1200 - PT ABC',
  //             isinactive: false,
  //             transactionType: 'customer',
  //             address: [
  //               {
  //                 defaultshipping: 'TRUE',
  //                 defaultbilling: 'TRUE',
  //                 country: 'ID',
  //                 label: 'PT ABC',
  //                 override_initialvalue: 'TRUE',
  //                 addrtext: 'Jl. Kemanggisan No. 10'
  //               }
  //             ]
  //           }
  //         }
  //       }
  //     },
  //     responses: {
  //       201: {
  //         description: 'Customer created successfully',
  //         content: {
  //           'application/json': {
  //             schema: {
  //               type: 'object',
  //               properties: {
  //                 success: { type: 'boolean', example: true },
  //                 data: { $ref: '#/components/schemas/Customer' },
  //                 message: { type: 'string', example: 'Customer berhasil dibuat' }
  //               }
  //             }
  //           }
  //         }
  //       },
  //       400: {
  //         description: 'Bad request - validation error',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       },
  //       500: {
  //         description: 'Internal server error',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       }
  //     }
  //   }
  // },
  // '/customers/{id}': {
  //   get: {
  //     tags: ['Customers'],
  //     summary: 'Get customer by ID',
  //     security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
  //     description: 'Retrieve a single customer by database ID',
  //     parameters: [
  //       {
  //         name: 'id',
  //         in: 'path',
  //         required: true,
  //         description: 'Customer database ID',
  //         schema: {
  //           type: 'integer'
  //         }
  //       }
  //     ],
  //     responses: {
  //       200: {
  //         description: 'Success',
  //         content: {
  //           'application/json': {
  //             schema: {
  //               type: 'object',
  //               properties: {
  //                 success: { type: 'boolean', example: true },
  //                 data: { $ref: '#/components/schemas/Customer' }
  //               }
  //             }
  //           }
  //         }
  //       },
  //       404: {
  //         description: 'Customer not found',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       }
  //     }
  //   }
  // },
  // '/customers/netsuite/{netsuite_id}': {
  //   get: {
  //     tags: ['Customers'],
  //     summary: 'Get customer by NetSuite ID',
  //     security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
  //     description: 'Retrieve customer by NetSuite ID with on-demand incremental sync. Sistem akan cek lastupdate dari NetSuite dan DB internal, lalu trigger sync jika data lebih baru di NetSuite atau data stale. Triggers sync job if customer not found or data is stale.',
  //     parameters: [
  //       {
  //         name: 'netsuite_id',
  //         in: 'path',
  //         required: true,
  //         description: 'NetSuite Customer ID',
  //         schema: {
  //           type: 'string'
  //         }
  //       }
  //     ],
  //     responses: {
  //       200: {
  //         description: 'Success - Customer found',
  //         headers: {
  //           'X-Sync-Triggered': {
  //             description: 'Indicates if a sync job was triggered',
  //             schema: {
  //               type: 'string',
  //               example: 'true'
  //             }
  //           },
  //           'X-Job-Id': {
  //             description: 'Sync job ID if incremental sync was triggered',
  //             schema: {
  //               type: 'string',
  //               format: 'uuid',
  //               example: '123e4567-e89b-12d3-a456-426614174000'
  //             }
  //           },
  //           'X-Sync-Reason': {
  //             description: 'Reason why sync was triggered',
  //             schema: {
  //               type: 'string',
  //               example: 'Data is stale (12.5 hours since last sync)'
  //             }
  //           }
  //         },
  //         content: {
  //           'application/json': {
  //             schema: {
  //               type: 'object',
  //               properties: {
  //                 success: { type: 'boolean', example: true },
  //                 data: { $ref: '#/components/schemas/Customer' },
  //                 fromCache: {
  //                   type: 'boolean',
  //                   description: 'Indicates if response was served from cache',
  //                   example: false
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       },
  //       202: {
  //         description: 'Accepted - Customer not found, sync job triggered',
  //         headers: {
  //           'X-Sync-Triggered': {
  //             schema: {
  //               type: 'string',
  //               example: 'true'
  //             }
  //           },
  //           'X-Job-Id': {
  //             schema: {
  //               type: 'string',
  //               format: 'uuid'
  //             }
  //           }
  //         },
  //         content: {
  //           'application/json': {
  //             schema: {
  //               type: 'object',
  //               properties: {
  //                 success: { type: 'boolean', example: false },
  //                 message: {
  //                   type: 'string',
  //                   example: 'Customer tidak ditemukan. Sync job telah di-trigger.'
  //                 },
  //                 jobId: {
  //                   type: 'string',
  //                   format: 'uuid',
  //                   description: 'Sync job ID'
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       },
  //       404: {
  //         description: 'Customer not found',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       }
  //     }
  //   }
  // },
  // '/customers/netsuite/read': {
  //   get: {
  //     tags: ['Customers'],
  //     summary: 'Read customer from NetSuite',
  //     security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
  //     description: 'Read customer directly from NetSuite by customerId. Mirrors "Customer (Read)" from Postman collection.',
  //     parameters: [
  //       {
  //         name: 'customerId',
  //         in: 'query',
  //         required: true,
  //         description: 'NetSuite Customer ID',
  //         schema: {
  //           type: 'string'
  //         }
  //       }
  //     ],
  //     responses: {
  //       200: {
  //         description: 'Success',
  //         content: {
  //           'application/json': {
  //             schema: {
  //               type: 'object',
  //               properties: {
  //                 success: { type: 'boolean', example: true },
  //                 data: { $ref: '#/components/schemas/Customer' }
  //               }
  //             }
  //           }
  //         }
  //       },
  //       400: {
  //         description: 'Bad request - customerId required',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       },
  //       404: {
  //         description: 'Customer not found',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       },
  //       500: {
  //         description: 'Internal server error',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       }
  //     }
  //   }
  // },
  // '/customers/update': {
  //   post: {
  //     tags: ['Customers'],
  //     summary: 'Update customer',
  //     security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
  //     description: 'Update customer in NetSuite and sync to local database. Mirrors "Customer (Edit)" from Postman collection. Requires internalid in body.',
  //     requestBody: {
  //       required: true,
  //       content: {
  //         'application/json': {
  //           schema: { $ref: '#/components/schemas/CustomerInput' },
  //           example: {
  //             internalid: 420,
  //             customform: '5',
  //             isperson: 'F',
  //             firstname: '',
  //             lastname: '',
  //             companyname: 'PT ABC - 1234',
  //             subsidiary: '1',
  //             email: 'abc@test.com',
  //             phone: '62128214884',
  //             vatregnumber: '99.00.000.000',
  //             autoname: false,
  //             entityid: 'CST1200 - PT ABC - 1234',
  //             isinactive: false,
  //             transactionType: 'customer',
  //             address: [
  //               {
  //                 defaultshipping: 'TRUE',
  //                 defaultbilling: 'TRUE',
  //                 country: 'ID',
  //                 label: 'PT ABC',
  //                 override_initialvalue: 'TRUE',
  //                 addrtext: 'Jl. Kemanggisan No. 10'
  //               }
  //             ]
  //           }
  //         }
  //       }
  //     },
  //     responses: {
  //       200: {
  //         description: 'Customer updated successfully',
  //         content: {
  //           'application/json': {
  //             schema: {
  //               type: 'object',
  //               properties: {
  //                 success: { type: 'boolean', example: true },
  //                 data: { $ref: '#/components/schemas/Customer' },
  //                 message: { type: 'string', example: 'Customer berhasil diupdate' }
  //               }
  //             }
  //           }
  //         }
  //       },
  //       400: {
  //         description: 'Bad request - internalid required',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       },
  //       500: {
  //         description: 'Internal server error',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       }
  //     }
  //   }
  // },
  // '/customers/search': {
  //   post: {
  //     tags: ['Customers'],
  //     summary: 'Search customers from NetSuite',
  //     security: [{ ApiKeyAuth: [], ApiSecretAuth: [] }],
  //     description: 'Search customers directly from NetSuite with pagination. Mirrors "Get Customer Page" from Postman collection.',
  //     requestBody: {
  //       required: false,
  //       content: {
  //         'application/json': {
  //           schema: { $ref: '#/components/schemas/CustomerSearchRequest' },
  //           example: {
  //             pageIndex: 0,
  //             pageSize: 50,
  //             lastmodified: '2025-11-21T10:00:00+07:00',
  //             netsuite_id: null
  //           }
  //         }
  //       }
  //     },
  //     responses: {
  //       200: {
  //         description: 'Success',
  //         content: {
  //           'application/json': {
  //             schema: {
  //               type: 'object',
  //               properties: {
  //                 success: { type: 'boolean', example: true },
  //                 data: {
  //                   type: 'object',
  //                   properties: {
  //                     items: {
  //                       type: 'array',
  //                       items: { $ref: '#/components/schemas/Customer' }
  //                     },
  //                     hasMore: {
  //                       type: 'boolean',
  //                       example: false
  //                     },
  //                     totalResults: {
  //                       type: 'integer',
  //                       example: 4
  //                     },
  //                     pageIndex: {
  //                       type: 'integer',
  //                       example: 0
  //                     },
  //                     pageSize: {
  //                       type: 'integer',
  //                       example: 50
  //                     },
  //                     totalRows: {
  //                       type: 'integer',
  //                       example: 4
  //                     },
  //                     totalPages: {
  //                       type: 'integer',
  //                       example: 1
  //                     }
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       },
  //       500: {
  //         description: 'Internal server error',
  //         content: {
  //           'application/json': {
  //             schema: { $ref: '#/components/schemas/ErrorResponse' }
  //           }
  //         }
  //       }
  //     }
  //   }
  // }
};

module.exports = customerPaths;

