# Backend Verification Checklist

This document provides a comprehensive checklist to verify that the AUDITRON backend Phase 1 is functioning correctly.

## Prerequisites

Before running verification:
- [ ] Docker and Docker Compose installed
- [ ] Node.js 20+ installed
- [ ] `.env` file configured (copy from `.env.example`)
- [ ] All dependencies installed (`npm install`)

## Infrastructure Verification

### 1. Docker Containers

Check that all required containers are running:

```bash
docker-compose ps
```

Expected output:
- ✅ `auditron-postgres` - Running on port 5432
- ✅ `auditron-redis` - Running on port 6379
- ✅ `auditron-minio` - Running on ports 9000 (API) and 9001 (Console)

**Verification Steps:**
```bash
# Check PostgreSQL
docker exec auditron-postgres pg_isready -U auditron

# Check Redis
docker exec auditron-redis redis-cli ping

# Check MinIO
curl http://localhost:9000/minio/health/live
```

### 2. Database Migrations

Verify Prisma migrations are applied:

```bash
npx prisma migrate status
```

Expected: All migrations applied, no pending migrations.

**Verification Steps:**
```bash
# View database schema
npx prisma studio

# Check tables exist
docker exec auditron-postgres psql -U auditron -d auditron_db -c "\dt"
```

Expected tables:
- organizations
- users
- invoices
- transactions
- ledger_entries
- reconciliations
- reconciliation_matches
- reports
- agent_jobs
- audit_logs

### 3. MinIO/S3 Storage

Verify MinIO bucket exists and is accessible:

```bash
# Access MinIO Console
open http://localhost:9001
```

Login credentials (from `.env`):
- Username: `minioadmin`
- Password: `minioadmin`

**Verification:**
- [ ] Bucket `auditron-files` exists
- [ ] Can upload files via console
- [ ] Files are accessible via signed URLs

## API Verification

### 1. Server Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-29T..."
}
```

### 2. Swagger Documentation

Open in browser:
```
http://localhost:3000/docs
```

**Verification:**
- [ ] Swagger UI loads successfully
- [ ] All endpoints documented
- [ ] Can execute test requests from Swagger
- [ ] Bearer auth configured

### 3. Authentication & Authorization

#### JWT Token Generation
```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "firstName": "Test",
    "lastName": "User",
    "organizationName": "Test Org",
    "organizationEmail": "org@example.com"
  }'
```

**Verification:**
- [ ] Returns 200 status
- [ ] Response includes `token` field
- [ ] Response includes `user` object with `id`, `email`, `role`
- [ ] Response includes `organizationId`

#### RBAC (Role-Based Access Control)

Test with different roles:

1. **Admin User** (from seed data):
   - Email: `admin@auditron.ai`
   - Password: `admin123`
   - Can access all endpoints

2. **CA User**:
   - Email: `ca@auditron.ai`
   - Password: `ca123`
   - Can access most endpoints

3. **Regular User**:
   - Email: `user@auditron.ai`
   - Password: `user123`
   - Limited access

**Verification:**
- [ ] Admin can update organization settings
- [ ] Regular user cannot update organization settings (403 Forbidden)
- [ ] All roles can create transactions
- [ ] Unauthorized requests return 401

### 4. File Upload (MinIO Integration)

```bash
# Upload invoice (requires valid JWT token)
curl -X POST http://localhost:3000/api/invoice/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/test-invoice.pdf"
```

**Verification:**
- [ ] File uploaded successfully (200 status)
- [ ] File appears in MinIO bucket
- [ ] Invoice record created in database
- [ ] `fileUrl` contains correct path
- [ ] Audit log entry created

### 5. Transaction Management

```bash
# Create transaction
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionDate": "2025-01-29T00:00:00.000Z",
    "description": "Test transaction",
    "amount": 1000,
    "type": "DEBIT",
    "category": "Office Expenses"
  }'
```

**Verification:**
- [ ] Transaction created (200 status)
- [ ] Can list transactions with pagination
- [ ] Can filter by category, date range
- [ ] Can update transaction
- [ ] Can delete transaction
- [ ] Audit logs created for all operations

### 6. Reconciliation Jobs

```bash
# Start reconciliation
curl -X POST http://localhost:3000/api/reconcile/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Reconciliation",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-01-31T23:59:59.000Z"
  }'
```

**Verification:**
- [ ] Job created with status `PENDING`
- [ ] Can check job status
- [ ] Job ID returned in response
- [ ] Can retrieve results when completed

### 7. Report Generation

Test all report types:

```bash
# P&L Report
curl "http://localhost:3000/api/reports/pnl?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Balance Sheet
curl "http://localhost:3000/api/reports/balance-sheet?date=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# GST Report
curl "http://localhost:3000/api/reports/gst?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verification:**
- [ ] All reports return valid JSON
- [ ] Response structure matches expected format
- [ ] Can generate and save reports
- [ ] Can list saved reports

### 8. AI Agent Jobs

```bash
# Run agent job
curl -X POST http://localhost:3000/api/agent/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CATEGORIZATION",
    "input": {
      "transactionId": "TRANSACTION_ID"
    }
  }'
```

**Verification:**
- [ ] Job queued successfully
- [ ] Job ID returned
- [ ] Can check job status
- [ ] Job status updates correctly (QUEUED → RUNNING → COMPLETED)

## Security Verification

### 1. Rate Limiting

```bash
# Send 150 requests rapidly
for i in {1..150}; do
  curl http://localhost:3000/health
done
```

**Verification:**
- [ ] After ~100 requests, returns 429 (Too Many Requests)
- [ ] Rate limit resets after time window

### 2. Security Headers

```bash
curl -I http://localhost:3000/health
```

**Verification:**
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `X-Frame-Options` present
- [ ] `X-XSS-Protection` present
- [ ] CORS headers configured correctly

### 3. Input Validation

Test with invalid data:

```bash
# Invalid email
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "password": "123"}'
```

**Verification:**
- [ ] Returns 400 Bad Request
- [ ] Error message includes validation details
- [ ] Zod validation errors are clear

### 4. Audit Logging

```bash
# Check audit logs in database
docker exec auditron-postgres psql -U auditron -d auditron_db \
  -c "SELECT action, entity_type, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

**Verification:**
- [ ] LOGIN actions logged
- [ ] CREATE_TRANSACTION actions logged
- [ ] UPDATE_ORGANIZATION actions logged
- [ ] IP address and user agent captured
- [ ] User ID and organization ID present

## Performance Verification

### 1. Response Times

Use the smoke test script:

```bash
bash scripts/smoke-test.sh
```

**Verification:**
- [ ] All endpoints respond within 500ms
- [ ] No timeout errors
- [ ] Concurrent requests handled correctly

### 2. Database Queries

Check Prisma query logs (in development mode):

**Verification:**
- [ ] No N+1 query problems
- [ ] Proper use of `include` for relations
- [ ] Indexes used for common queries

## Automated Testing

### 1. Smoke Test Suite

```bash
bash scripts/smoke-test.sh
```

**Expected:**
- ✅ All 16 tests pass
- ✅ No errors or warnings
- ✅ Summary shows all green checkmarks

### 2. Postman Collection

Import and run the Postman collection:

```bash
# Import: postman/Auditron-Phase1-API.postman_collection.json
```

**Verification:**
- [ ] All requests execute successfully
- [ ] Variables auto-populate (token, IDs)
- [ ] Can run entire collection
- [ ] All tests pass

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Symptom:** `Error: Can't reach database server`

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check DATABASE_URL in .env
```

#### 2. MinIO Connection Error

**Symptom:** `MinIO initialization error`

**Solution:**
```bash
# Check MinIO is running
docker-compose ps minio

# Access MinIO console
open http://localhost:9001

# Verify credentials in .env match MinIO
```

#### 3. Redis Connection Error

**Symptom:** `Redis connection error`

**Solution:**
```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker exec auditron-redis redis-cli ping

# Check REDIS_URL in .env
```

#### 4. Migration Errors

**Symptom:** `Migration failed`

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev

# Seed database
npm run prisma:seed
```

#### 5. JWT Token Errors

**Symptom:** `Invalid token` or `Unauthorized`

**Solution:**
- Check JWT_SECRET in .env is at least 32 characters
- Ensure token is passed in Authorization header: `Bearer TOKEN`
- Token may have expired (default: 7 days)

## Sign-Off Checklist

Before proceeding to Phase 2 (Frontend), verify:

- [ ] All Docker containers running
- [ ] Database migrations applied
- [ ] Seed data loaded
- [ ] Swagger docs accessible
- [ ] Smoke test passes (16/16 tests)
- [ ] Postman collection works
- [ ] File upload to MinIO works
- [ ] JWT authentication works
- [ ] RBAC enforced correctly
- [ ] Rate limiting active
- [ ] Audit logs being written
- [ ] All report endpoints return data
- [ ] No console errors or warnings

## Next Steps

Once all verifications pass:

1. ✅ Phase 1 Backend Complete
2. → Proceed to Phase 2: Frontend Development
3. → Begin Next.js setup and design system

---

**Last Updated:** 2025-01-29  
**Phase:** 1 - Backend Core  
**Status:** Ready for Validation
