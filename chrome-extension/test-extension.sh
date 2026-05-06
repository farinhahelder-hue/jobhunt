#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api/jobs/save"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

echo "====================================="
echo "Chrome Extension E2E API Test Script"
echo "====================================="

if [ -z "$SUPABASE_TEST_EMAIL" ] || [ -z "$SUPABASE_TEST_PASSWORD" ]; then
  echo "❌ Error: SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD must be set in environment"
  exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in environment to fetch token"
  exit 1
fi

echo "1. Getting JWT Token from Supabase..."
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"${SUPABASE_TEST_EMAIL}"'",
    "password": "'"${SUPABASE_TEST_PASSWORD}"'"
  }')

ACCESS_TOKEN=$(echo $AUTH_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error: Failed to get access token"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Token acquired successfully"
echo ""

echo "2. Sending POST request to ${API_URL}..."
PAYLOAD='{
  "title": "Senior Frontend Developer",
  "company": "Test Company",
  "location": "Remote",
  "description": "Test description",
  "url": "https://www.linkedin.com/jobs/view/test-123",
  "source": "linkedin",
  "status": "saved"
}'

RESPONSE_1=$(curl -s -X POST "${API_URL}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

SUCCESS_1=$(echo $RESPONSE_1 | grep -o '"success":true')
JOB_ID_1=$(echo $RESPONSE_1 | grep -o '"job_id":"[^"]*' | cut -d'"' -f4)

if [ -n "$SUCCESS_1" ]; then
  echo "✅ First request successful!"
  echo "Job ID: $JOB_ID_1"
else
  echo "❌ First request failed"
  echo "Response: $RESPONSE_1"
  exit 1
fi

echo ""
echo "3. Sending duplicate POST request to test deduplication..."

RESPONSE_2=$(curl -s -X POST "${API_URL}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

SUCCESS_2=$(echo $RESPONSE_2 | grep -o '"success":true')
JOB_ID_2=$(echo $RESPONSE_2 | grep -o '"job_id":"[^"]*' | cut -d'"' -f4)

if [ -n "$SUCCESS_2" ]; then
  echo "✅ Second request successful!"
  if [ "$JOB_ID_1" == "$JOB_ID_2" ]; then
    echo "✅ Deduplication worked (Job ID is the same: $JOB_ID_2)"
  else
    echo "❌ Deduplication failed (Different Job IDs)"
    echo "First: $JOB_ID_1"
    echo "Second: $JOB_ID_2"
    exit 1
  fi
else
  echo "❌ Second request failed"
  echo "Response: $RESPONSE_2"
  exit 1
fi

echo ""
echo "🎉 All tests passed successfully!"
