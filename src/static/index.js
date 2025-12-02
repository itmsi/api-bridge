const info = {
  description: 'API Bridge - Sistem integrasi dengan Oracle NetSuite untuk sinkronisasi data customer dengan fitur on-demand incremental sync (Last Updated Sync), caching, dan background workers. Sistem secara otomatis melakukan incremental sync dengan cara: 1) Hit ke API NetSuite untuk cek lastupdate all data, 2) Cek data lastupdate yang ada di DB internal, 3) Sync data yang lebih besar dari lastupdate-nya jika diperlukan.',
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
const vendorSchema = require('./schema/vendor');
const syncSchema = require('./schema/sync');
const apiClientSchema = require('./schema/api_client');
const netsuiteScriptsSchema = require('./schema/netsuite_scripts');

// Import paths
const customerPaths = require('./path/customer');
const vendorPaths = require('./path/vendor');
const syncPaths = require('./path/sync');
const apiClientPaths = require('./path/api_client');
const netsuiteScriptsPaths = require('./path/netsuite_scripts');

// Combine all schemas
const schemas = {
  ...commonSchema,
  ...customerSchema,
  ...vendorSchema,
  ...syncSchema,
  ...apiClientSchema,
  ...netsuiteScriptsSchema,
};

// Combine all paths
const paths = {
  // ...examplePaths,
  ...customerPaths,
  ...vendorPaths,
  ...syncPaths,
  ...apiClientPaths,
  ...netsuiteScriptsPaths,
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
