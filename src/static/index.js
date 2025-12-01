const info = {
  description: 'API Bridge - Sistem integrasi dengan Oracle NetSuite untuk sinkronisasi data customer dengan fitur on-demand sync, caching, dan background workers',
  version: '1.0.0',
  title: 'API Bridge Documentation',
  contact: {
    email: 'your-email@example.com'
  },
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT'
  }
}

const servers = [
  {
    url: '/api',
    description: 'Development server'
  },
  {
    url: 'https://your-production-url.com/api',
    description: 'Production server'
  }
]

// Import schemas
const commonSchema = require('./schema/common');
const customerSchema = require('./schema/customer');
const syncSchema = require('./schema/sync');
const apiClientSchema = require('./schema/api_client');

// Import paths
const customerPaths = require('./path/customer');
const syncPaths = require('./path/sync');
const apiClientPaths = require('./path/api_client');

// Combine all schemas
const schemas = {
  ...commonSchema,
  ...customerSchema,
  ...syncSchema,
  ...apiClientSchema,
};

// Combine all paths
const paths = {
  // ...examplePaths,
  ...customerPaths,
  ...syncPaths,
  ...apiClientPaths,
};

const index = {
  openapi: '3.0.0',
  info,
  servers,
  paths,
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Client-Key',
        description: 'API Client Key untuk autentikasi. Dapat juga menggunakan X-API-Key sebagai alternatif.',
      },
      ApiSecretAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Client-Secret',
        description: 'API Client Secret untuk autentikasi. Dapat juga menggunakan X-API-Secret sebagai alternatif.',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas
  }
}

module.exports = {
  index
}
