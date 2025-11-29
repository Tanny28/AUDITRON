#!/usr/bin/env bash

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="$BASE_URL/api"

echo "=================================="
echo "🧪 AUDITRON Backend Smoke Test"
echo "=================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Helper function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Helper function to print error and exit
error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Helper function to print info
info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Health Check
info "Testing health endpoint..."
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json "$BASE_URL/health")
if [ "$HEALTH" != "200" ]; then
    error "Health check failed (HTTP $HEALTH)"
fi
success "Health check OK"

# Test 2: Register new user
info "Registering new user..."
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test-'$(date +%s)'@auditron.ai",
        "password": "Test123456",
        "firstName": "Test",
        "lastName": "User",
        "organizationName": "Test Org",
        "organizationEmail": "org-'$(date +%s)'@auditron.ai"
    }')

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    error "Registration failed (HTTP $HTTP_CODE)"
fi

TOKEN=$(echo "$REGISTER_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$REGISTER_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
ORG_ID=$(echo "$REGISTER_BODY" | grep -o '"organizationId":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    error "Failed to extract token from registration response"
fi

success "User registered (ID: ${USER_ID:0:8}...)"
success "JWT token obtained"

# Test 3: Login
info "Testing login..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@auditron.ai",
        "password": "admin123"
    }')

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "Login failed (HTTP $HTTP_CODE)"
fi
success "Login OK"

# Test 4: Get current user
info "Testing /auth/me endpoint..."
ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "Get current user failed (HTTP $HTTP_CODE)"
fi
success "Get current user OK"

# Test 5: Get organization
info "Testing get organization..."
ORG_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/org/$ORG_ID" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$ORG_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "Get organization failed (HTTP $HTTP_CODE)"
fi
success "Get organization OK"

# Test 6: Create transaction
info "Creating test transaction..."
TRANSACTION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/transactions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "transactionDate": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
        "description": "Test transaction",
        "amount": 1000.50,
        "type": "DEBIT",
        "category": "Office Supplies",
        "gstRate": 18,
        "gstAmount": 180.09
    }')

HTTP_CODE=$(echo "$TRANSACTION_RESPONSE" | tail -n1)
TRANSACTION_BODY=$(echo "$TRANSACTION_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    error "Create transaction failed (HTTP $HTTP_CODE)"
fi

TRANSACTION_ID=$(echo "$TRANSACTION_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
success "Transaction created (ID: ${TRANSACTION_ID:0:8}...)"

# Test 7: List transactions
info "Listing transactions..."
LIST_TRANS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/transactions?page=1&limit=10" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$LIST_TRANS_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "List transactions failed (HTTP $HTTP_CODE)"
fi
success "List transactions OK"

# Test 8: Start reconciliation
info "Starting reconciliation job..."
RECON_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/reconcile/start" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test Reconciliation",
        "startDate": "'$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S.000Z)'",
        "endDate": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    }')

HTTP_CODE=$(echo "$RECON_RESPONSE" | tail -n1)
RECON_BODY=$(echo "$RECON_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    error "Start reconciliation failed (HTTP $HTTP_CODE)"
fi

RECON_ID=$(echo "$RECON_BODY" | grep -o '"reconciliationId":"[^"]*' | cut -d'"' -f4)
success "Reconciliation job queued (ID: ${RECON_ID:0:8}...)"

# Test 9: Check reconciliation status
info "Checking reconciliation status..."
RECON_STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/reconcile/$RECON_ID/status" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RECON_STATUS_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "Get reconciliation status failed (HTTP $HTTP_CODE)"
fi
success "Reconciliation status OK"

# Test 10: Get P&L report
info "Fetching P&L report..."
PNL_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/reports/pnl?startDate=$(date -u -d '30 days ago' +%Y-%m-%d)&endDate=$(date -u +%Y-%m-%d)" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$PNL_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "Get P&L report failed (HTTP $HTTP_CODE)"
fi
success "P&L report OK"

# Test 11: Get Balance Sheet
info "Fetching Balance Sheet..."
BS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/reports/balance-sheet?date=$(date -u +%Y-%m-%d)" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$BS_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "Get Balance Sheet failed (HTTP $HTTP_CODE)"
fi
success "Balance Sheet OK"

# Test 12: Get GST report
info "Fetching GST report..."
GST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/reports/gst?startDate=$(date -u -d '30 days ago' +%Y-%m-%d)&endDate=$(date -u +%Y-%m-%d)" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$GST_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "Get GST report failed (HTTP $HTTP_CODE)"
fi
success "GST report OK"

# Test 13: Run agent job
info "Running AI agent job..."
AGENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/agent/run" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "CATEGORIZATION",
        "input": {
            "transactionId": "'$TRANSACTION_ID'"
        }
    }')

HTTP_CODE=$(echo "$AGENT_RESPONSE" | tail -n1)
AGENT_BODY=$(echo "$AGENT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    error "Run agent job failed (HTTP $HTTP_CODE)"
fi

AGENT_JOB_ID=$(echo "$AGENT_BODY" | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)
success "Agent job queued (ID: ${AGENT_JOB_ID:0:8}...)"

# Test 14: Check agent job status
info "Checking agent job status..."
AGENT_STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/agent/status/$AGENT_JOB_ID" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$AGENT_STATUS_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "Get agent job status failed (HTTP $HTTP_CODE)"
fi
success "Agent job status OK"

# Test 15: List invoices
info "Listing invoices..."
INVOICE_LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/invoice/list?page=1&limit=10" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$INVOICE_LIST_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    error "List invoices failed (HTTP $HTTP_CODE)"
fi
success "List invoices OK"

# Test 16: Swagger docs accessible
info "Checking Swagger documentation..."
SWAGGER_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/docs")
if [ "$SWAGGER_RESPONSE" != "200" ]; then
    error "Swagger docs not accessible (HTTP $SWAGGER_RESPONSE)"
fi
success "Swagger docs accessible"

echo ""
echo "=================================="
echo -e "${GREEN}✓ All smoke tests passed!${NC}"
echo "=================================="
echo ""
echo "Summary:"
echo "  • Health check: OK"
echo "  • Authentication: OK"
echo "  • Organizations: OK"
echo "  • Transactions: OK"
echo "  • Reconciliation: OK"
echo "  • Reports (P&L, BS, GST): OK"
echo "  • AI Agents: OK"
echo "  • Invoices: OK"
echo "  • API Documentation: OK"
echo ""
