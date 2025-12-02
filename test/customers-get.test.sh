#!/bin/bash

# Test script untuk endpoint POST /api/customers/get
# File ini digunakan untuk testing endpoint customer dengan curl

# Konfigurasi
BASE_URL="${BASE_URL:-http://localhost:9575}"
API_KEY="${X_CLIENT_KEY:-apikey_f488c471cb741aff3e13f51bcb069d1c}"
API_SECRET="${X_CLIENT_SECRET:-2954f3647730280c23715f64c9434e0945385b195c597809e9db5e81e7d62e3f}"

# Colors untuk output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Testing POST /api/customers/get"
echo "=========================================="
echo ""

# Test 1: Basic request dengan pagination
echo -e "${YELLOW}Test 1: Basic request dengan pagination${NC}"
echo "Request: POST ${BASE_URL}/api/customers/get"
echo "Body: { page: 1, limit: 10 }"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X 'POST' \
  "${BASE_URL}/api/customers/get" \
  -H 'accept: application/json' \
  -H "X-Client-Key: ${API_KEY}" \
  -H "X-Client-Secret: ${API_SECRET}" \
  -H 'Content-Type: application/json' \
  -d '{
  "page": 1,
  "limit": 10,
  "email": null,
  "name": null,
  "netsuite_id": null
}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Check sync headers
SYNC_TRIGGERED=$(echo "$RESPONSE" | grep -i "X-Sync-Triggered" || echo "")
JOB_ID=$(echo "$RESPONSE" | grep -i "X-Job-Id" || echo "")
SYNC_REASON=$(echo "$RESPONSE" | grep -i "X-Sync-Reason" || echo "")

if [ ! -z "$SYNC_TRIGGERED" ]; then
  echo -e "${GREEN}✓ Sync triggered: $SYNC_TRIGGERED${NC}"
  echo -e "${GREEN}✓ Job ID: $JOB_ID${NC}"
  echo -e "${GREEN}✓ Sync Reason: $SYNC_REASON${NC}"
else
  echo -e "${YELLOW}⚠ Sync tidak di-trigger (mungkin data masih fresh atau tidak ada data di NetSuite)${NC}"
fi

echo ""
echo "----------------------------------------"
echo ""

# Test 2: Request dengan filter email
echo -e "${YELLOW}Test 2: Request dengan filter email${NC}"
echo "Request: POST ${BASE_URL}/api/customers/get"
echo "Body: { page: 1, limit: 10, email: 'test@example.com' }"
echo ""

RESPONSE2=$(curl -s -w "\n%{http_code}" -X 'POST' \
  "${BASE_URL}/api/customers/get" \
  -H 'accept: application/json' \
  -H "X-Client-Key: ${API_KEY}" \
  -H "X-Client-Secret: ${API_SECRET}" \
  -H 'Content-Type: application/json' \
  -d '{
  "page": 1,
  "limit": 10,
  "email": "test@example.com",
  "name": null,
  "netsuite_id": null
}')

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | sed '$d')

echo "HTTP Status Code: $HTTP_CODE2"
echo "Response Body:"
echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
echo ""
echo "----------------------------------------"
echo ""

# Test 3: Request dengan filter netsuite_id
echo -e "${YELLOW}Test 3: Request dengan filter netsuite_id${NC}"
echo "Request: POST ${BASE_URL}/api/customers/get"
echo "Body: { page: 1, limit: 10, netsuite_id: '123' }"
echo ""

RESPONSE3=$(curl -s -w "\n%{http_code}" -X 'POST' \
  "${BASE_URL}/api/customers/get" \
  -H 'accept: application/json' \
  -H "X-Client-Key: ${API_KEY}" \
  -H "X-Client-Secret: ${API_SECRET}" \
  -H 'Content-Type: application/json' \
  -d '{
  "page": 1,
  "limit": 10,
  "email": null,
  "name": null,
  "netsuite_id": "123"
}')

HTTP_CODE3=$(echo "$RESPONSE3" | tail -n1)
BODY3=$(echo "$RESPONSE3" | sed '$d')

echo "HTTP Status Code: $HTTP_CODE3"
echo "Response Body:"
echo "$BODY3" | jq '.' 2>/dev/null || echo "$BODY3"
echo ""
echo "=========================================="
echo ""

# Summary
echo -e "${GREEN}Testing selesai!${NC}"
echo ""
echo "Catatan:"
echo "- Jika data tidak tampil, cek apakah sync job sudah berjalan"
echo "- Cek log aplikasi untuk melihat error atau warning"
echo "- Pastikan consumer RabbitMQ sedang berjalan: npm run consumer"
echo "- Cek database untuk melihat apakah ada data di tabel customers"
echo "- Cek sync_jobs table untuk melihat status sync job"

