# OAuth2 Authentication Module

Module ini menyediakan implementasi OAuth2 untuk autentikasi API clients menggunakan access token dan refresh token.

## Alur OAuth2

1. **Registrasi API Client**: Admin mendaftarkan API client menggunakan endpoint `/api/v1/bridge/admin/api-clients`
2. **Dapatkan Client Credentials**: Setelah registrasi, client akan mendapatkan `client_key` dan `client_secret`
3. **Request Access Token**: Client menggunakan `client_key` dan `client_secret` untuk mendapatkan access token
4. **Gunakan Access Token**: Client menggunakan access token untuk mengakses endpoint protected (customer, vendor, dll)
5. **Refresh Token**: Ketika access token expired, client bisa menggunakan refresh token untuk mendapatkan access token baru

## Endpoints

### 1. Get Access Token

**Endpoint**: `POST /api/v1/bridge/auth/token`

**Grant Type**: `client_credentials`

**Request Body**:
```json
{
  "grant_type": "client_credentials",
  "client_id": "apikey_xxxxx",
  "client_secret": "xxxxx"
}
```

**Response**:
```json
{
  "status": true,
  "message": "Success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "abc123...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token_expires_in": 2592000
  }
}
```

**Alternatif menggunakan Basic Auth**:
```bash
curl -X POST https://api-bridge.motorsights.com/api/v1/bridge/auth/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'client_id:client_secret' | base64)" \
  -d '{"grant_type": "client_credentials"}'
```

### 2. Refresh Access Token

**Endpoint**: `POST /api/v1/bridge/auth/token`

**Grant Type**: `refresh_token`

**Request Body**:
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "abc123..."
}
```

**Response**:
```json
{
  "status": true,
  "message": "Success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "xyz789...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token_expires_in": 2592000
  }
}
```

### 3. Revoke Refresh Token

**Endpoint**: `POST /api/v1/bridge/auth/revoke`

**Request Body**:
```json
{
  "refresh_token": "abc123..."
}
```

**Response**:
```json
{
  "status": true,
  "message": "Token revoked successfully",
  "data": {
    "message": "Token revoked successfully"
  }
}
```

## Menggunakan Access Token

Setelah mendapatkan access token, gunakan di header Authorization:

```bash
curl -X POST https://api-bridge.motorsights.com/api/v1/bridge/customers/get \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Konfigurasi

Konfigurasi token expire time dapat diatur di file `.env`:

```env
# OAuth2 Token Configuration (API Client)
OAUTH2_ACCESS_TOKEN_EXPIRES_IN=1h
OAUTH2_REFRESH_TOKEN_EXPIRES_IN=30d
OAUTH2_SECRET=your-oauth2-secret-key-change-in-production
```

Format waktu yang didukung:
- `s` - seconds (e.g., `3600s`)
- `m` - minutes (e.g., `60m`)
- `h` - hours (e.g., `1h`)
- `d` - days (e.g., `30d`)

## Middleware

Untuk melindungi endpoint dengan OAuth2 token, gunakan middleware `verifyOAuth2Token`:

```javascript
const { verifyOAuth2Token } = require('../../middlewares');

router.post('/protected-endpoint', verifyOAuth2Token, controller.method);
```

Middleware akan:
- Memverifikasi access token dari header `Authorization: Bearer <token>`
- Menambahkan informasi client ke `req.oauth2Client`
- Menambahkan decoded token ke `req.oauth2Decoded`

## Contoh Penggunaan Lengkap

```bash
# 1. Daftarkan API Client (sebagai admin)
curl -X POST https://api-bridge.motorsights.com/api/v1/bridge/admin/api-clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API ITI",
    "description": "API untuk ITI",
    "api_url": "https://api.iti.com/order-service",
    "ip_whitelist": ["192.168.1.1", "10.0.0.1"],
    "rate_limit_per_minute": 100,
    "rate_limit_per_hour": 1000,
    "notes": "Production API ITI"
  }'

# Response akan berisi client_key dan client_secret

# 2. Dapatkan Access Token
curl -X POST https://api-bridge.motorsights.com/api/v1/bridge/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "apikey_xxxxx",
    "client_secret": "xxxxx"
  }'

# 3. Gunakan Access Token untuk akses endpoint
curl -X POST https://api-bridge.motorsights.com/api/v1/bridge/customers/get \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# 4. Refresh token ketika access token expired
curl -X POST https://api-bridge.motorsights.com/api/v1/bridge/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "<refresh_token>"
  }'
```

## Database Schema

Module ini menggunakan tabel `oauth2_refresh_tokens` untuk menyimpan refresh token. Schema dapat dilihat di migration file:
`src/repository/postgres/migrations/20250102000008_create_oauth2_refresh_tokens_table.js`

## Error Responses

### Invalid Client Credentials
```json
{
  "status": false,
  "message": "Error",
  "data": {
    "error": "invalid_client",
    "error_description": "Invalid client credentials"
  }
}
```

### Invalid or Expired Token
```json
{
  "status": false,
  "message": "Error",
  "data": {
    "error": "invalid_token",
    "error_description": "Invalid or expired access token"
  }
}
```

### Missing Token
```json
{
  "status": false,
  "message": "Error",
  "data": {
    "error": "invalid_token",
    "error_description": "Access token required. Provide Authorization: Bearer <token> header."
  }
}
```

