const express = require('express')
// const { verifyToken } = require('../../middlewares')

const routing = express();
const API_TAG = '/api';

/* RULE
naming convention endpoint: using plural
Example:
- GET /api/examples
- POST /api/examples
- GET /api/examples/:id
- PUT /api/examples/:id
- DELETE /api/examples/:id
*/

// Example Module (Template untuk module Anda)
const exampleModule = require('../../modules/example')
routing.use(`${API_TAG}/examples`, exampleModule)

// Customer Module
const customerModule = require('../../modules/customer')
routing.use(`${API_TAG}/customers`, customerModule)

// Sync Module (Admin)
const syncModule = require('../../modules/sync')
routing.use(`${API_TAG}/admin/sync`, syncModule)

// API Client Module (Admin)
const apiClientModule = require('../../modules/api_client')
routing.use(`${API_TAG}/admin/api-clients`, apiClientModule)

// Tambahkan routes module Anda di sini
// Example:
// const yourModule = require('../../modules/yourModule')
// routing.use(`${API_TAG}/your-endpoint`, yourModule)

module.exports = routing;
