# NetSuite Integration Guide

Dokumen ini menjelaskan implementasi integrasi dengan Oracle NetSuite API menggunakan OAuth 1.0.

## Overview

Sistem menggunakan service-based architecture untuk integrasi NetSuite:
- **OAuth Service**: Menangani OAuth 1.0 authentication dengan HMAC-SHA256
- **NetSuite Client**: HTTP client untuk komunikasi dengan NetSuite RESTlet API
- **Customer Service**: Service khusus untuk operasi customer

## Struktur Service

```
src/services/netsuite/
├── oauth.js              # OAuth 1.0 service untuk authentication
├── client.js             # NetSuite API client
├── customer-service.js   # Customer-specific operations
└── index.js              # Central exports
```

## Configuration

Tambahkan konfigurasi berikut ke file `.env`:

```env
# NetSuite API Configuration
NETSUITE_ENABLED=true
NETSUITE_BASE_URL=https://11970733-sb1.restlets.api.netsuite.com
NETSUITE_SCRIPT_ID=472
NETSUITE_DEPLOYMENT_ID=1
NETSUITE_CONSUMER_KEY=your_consumer_key
NETSUITE_CONSUMER_SECRET=your_consumer_secret
NETSUITE_TOKEN=your_token
NETSUITE_TOKEN_SECRET=your_token_secret
NETSUITE_REALM=11970733_SB1
NETSUITE_TIMEOUT=30000
```

### Mendapatkan Credentials

1. **Consumer Key & Consumer Secret**: 
   - Di NetSuite, buka Setup > Integration > Manage Integrations
   - Create new integration atau gunakan existing
   - Copy Consumer Key dan Consumer Secret

2. **Token & Token Secret**:
   - Di NetSuite, buka Setup > Users/Roles > Access Tokens
   - Create new access token untuk integration
   - Copy Token ID (token) dan Token Secret

3. **Realm**:
   - Account ID di NetSuite (contoh: 11970733_SB1 untuk sandbox)

4. **Script ID & Deployment ID**:
   - Script ID dari RESTlet script yang dibuat di NetSuite
   - Deployment ID dari deployment RESTlet tersebut

## OAuth 1.0 Authentication

Service menggunakan OAuth 1.0 dengan HMAC-SHA256 signature method, sesuai dengan konfigurasi Postman collection.

### Authorization Header Format

```
Authorization: OAuth realm="11970733_SB1", 
               oauth_consumer_key="...", 
               oauth_token="...", 
               oauth_signature_method="HMAC-SHA256", 
               oauth_timestamp="...", 
               oauth_nonce="...", 
               oauth_version="1.0", 
               oauth_signature="..."
```

## API Operations

### Customer Operations

#### 1. Get Customer by ID

```javascript
const { getNetSuiteCustomerService } = require('./services/netsuite');

const customerService = getNetSuiteCustomerService();
const customer = await customerService.getCustomer(customerId);
```

#### 2. Search Customers dengan Pagination

```javascript
const response = await customerService.searchCustomers({
  since: '2025-01-01T00:00:00Z',  // lastModifiedDate filter
  page: 1,
  pageSize: 500,
  netsuite_id: '123',  // optional: search specific customer
});
```

Response format:
```javascript
{
  items: [
    {
      netsuite_id: '123',
      name: 'Customer Name',
      email: 'email@example.com',
      phone: '123456789',
      data: { ...raw NetSuite data... },
      last_modified_netsuite: '2025-01-02T10:00:00Z',
    }
  ],
  hasMore: false,
  totalResults: 1,
}
```

#### 3. Create Customer

```javascript
const customerData = {
  companyname: 'PT ABC',
  email: 'abc@test.com',
  phone: '62128214884',
  subsidiary: '1',
  customform: '5',
  // ... other fields
};

const customer = await customerService.createCustomer(customerData);
```

#### 4. Update Customer

```javascript
const updatedCustomer = await customerService.updateCustomer(
  internalId,  // NetSuite internal ID
  customerData
);
```

## Error Handling

Service akan throw error jika:
- Credentials tidak valid
- Network error
- NetSuite API error
- Timeout (default: 30 seconds)

Error format:
```javascript
try {
  await customerService.getCustomer(id);
} catch (error) {
  console.error('NetSuite API error:', error.message);
  // Error message includes NetSuite response details
}
```

## Metrics & Monitoring

Service otomatis track metrics untuk Prometheus:

- `api_bridge_netsuite_requests_total{module, status}` - Total requests
- `api_bridge_sync_duration_seconds{module, type}` - Request duration

## Integration dengan Sync Worker

Customer sync worker sudah terintegrasi dengan NetSuite service:

```javascript
// Di customer_sync_worker.js
const { getNetSuiteCustomerService } = require('../services/netsuite/customer-service');

const customerService = getNetSuiteCustomerService();
const response = await customerService.searchCustomers({
  since: lastSyncDate,
  page: 1,
  pageSize: 500,
});
```

## Security Best Practices

1. **Jangan commit credentials ke Git**
   - Gunakan `.env` file (already in `.gitignore`)
   - Gunakan secret management (AWS Secrets Manager, HashiCorp Vault) di production

2. **Rotate credentials secara berkala**
   - Update Consumer Secret dan Token Secret secara berkala

3. **Gunakan HTTPS**
   - Semua komunikasi dengan NetSuite menggunakan HTTPS

4. **Rate Limiting**
   - NetSuite memiliki rate limits, service sudah implement retry mechanism

## Testing

### Test OAuth Connection

```javascript
const { getNetSuiteClient } = require('./services/netsuite');

const client = getNetSuiteClient();
const response = await client.get({ operation: 'read', customerId: '123' });
console.log(response);
```

### Test dengan Postman

Service menggunakan format yang sama dengan Postman collection:
- Import collection dari `MSI Integration (SB).postman_collection_local`
- Verify OAuth header format sama dengan service

## Troubleshooting

### Error: "OAuth credentials error"

- Check apakah semua credentials sudah di-set di `.env`
- Verify Consumer Key, Consumer Secret, Token, Token Secret, dan Realm

### Error: "NetSuite API error: 401 Unauthorized"

- Verify OAuth signature benar
- Check apakah Token ID sudah di-assign ke Integration
- Verify Realm (Account ID) benar

### Error: "NetSuite API error: 404 Not Found"

- Verify Script ID dan Deployment ID benar
- Check apakah RESTlet sudah deployed

### Error: Timeout

- Increase `NETSUITE_TIMEOUT` value
- Check network connectivity ke NetSuite

## Next Steps

1. ✅ OAuth 1.0 service sudah diimplementasikan
2. ✅ NetSuite client sudah diimplementasikan
3. ✅ Customer service sudah diimplementasikan
4. ✅ Sync worker sudah terintegrasi
5. ⏳ Test dengan NetSuite sandbox
6. ⏳ Implementasi additional operations (Products, Orders, dll)
7. ⏳ Implementasi batch operations
8. ⏳ Add retry mechanism untuk specific error codes

