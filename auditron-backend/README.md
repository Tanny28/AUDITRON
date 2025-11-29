# AUDITRON Backend API

AI-driven accounting automation platform backend built with Fastify, Prisma, and PostgreSQL.

## Features

- ✅ JWT Authentication with RBAC (Admin, CA, User)
- ✅ Multi-tenant organization support
- ✅ Invoice upload & OCR processing
- ✅ Transaction management
- ✅ Reconciliation workflows
- ✅ Report generation (P&L, Balance Sheet, GST, Tax)
- ✅ Agentic AI job management
- ✅ File storage with MinIO/S3
- ✅ Job queues with BullMQ
- ✅ Comprehensive audit logging
- ✅ API documentation with Swagger

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Cache**: Redis
- **Storage**: MinIO (S3-compatible)
- **Queue**: BullMQ
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd auditron-backend
```

2. Install dependencies
```bash
npm install
```

3. Copy environment variables
```bash
cp .env.example .env
```

**Important:** Edit `.env` and set:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure secret (min 32 characters)
- `OPENAI_API_KEY` - Your OpenAI API key (optional for Phase 1)

4. Start infrastructure with Docker Compose
```bash
docker-compose up -d postgres redis minio
```

Wait ~10 seconds for containers to be ready.

5. Run database migrations
```bash
npm run prisma:migrate
```

6. Generate Prisma Client
```bash
npm run prisma:generate
```

7. Seed database with demo data
```bash
npm run prisma:seed
```

This creates demo users:
- **Admin**: `admin@auditron.ai` / `admin123`
- **CA**: `ca@auditron.ai` / `ca123`
- **User**: `user@auditron.ai` / `user123`

8. Start development server
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

API Documentation: `http://localhost:3000/docs`

## Phase 1 Validation

After setup, validate the backend is working correctly:

### Quick Validation

Run the automated smoke test:

```bash
bash scripts/smoke-test.sh
```

This runs 16 comprehensive tests covering:
- ✅ Health check
- ✅ User registration & login
- ✅ JWT authentication
- ✅ Organization management
- ✅ Transaction CRUD
- ✅ Reconciliation jobs
- ✅ Report generation (P&L, Balance Sheet, GST)
- ✅ AI agent jobs
- ✅ Invoice management
- ✅ API documentation

Expected output: `✓ All smoke tests passed!`

### Manual Validation

#### 1. Check Docker Containers

```bash
docker-compose ps
```

All containers should show "Up" status:
- `auditron-postgres` (port 5432)
- `auditron-redis` (port 6379)
- `auditron-minio` (ports 9000, 9001)

#### 2. Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@auditron.ai","password":"admin123"}'
```

#### 3. Access Swagger Documentation

Open in browser: `http://localhost:3000/docs`

Try executing requests directly from Swagger UI.

#### 4. Access MinIO Console

Open in browser: `http://localhost:9001`

Login: `minioadmin` / `minioadmin`

Verify bucket `auditron-files` exists.

### Postman Collection

Import the Postman collection for comprehensive API testing:

```
postman/Auditron-Phase1-API.postman_collection.json
```

The collection includes:
- All Phase 1 endpoints
- Auto-populated variables (token, IDs)
- Example requests and responses
- Test scripts

### Detailed Verification

For a complete verification checklist, see:

📋 [Backend Verification Checklist](docs/backend-verification.md)

This includes:
- Infrastructure verification
- Security testing
- Performance checks
- Troubleshooting guide

### Troubleshooting

#### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### MinIO Connection Issues

```bash
# Check MinIO is running
docker-compose ps minio

# Access MinIO console
open http://localhost:9001

# Verify MINIO_* variables in .env
```

#### Redis Connection Issues

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis
docker exec auditron-redis redis-cli ping
# Should return: PONG
```

#### Migration Errors

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev

# Seed again
npm run prisma:seed
```

#### Port Already in Use

If port 3000 is already in use:

```bash
# Change PORT in .env
PORT=3001

# Or kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

## Project Structure

```
src/
├── config/           # Configuration & environment
├── lib/              # Shared libraries (Prisma, Redis, MinIO)
├── middleware/       # Custom middleware (auth, etc.)
├── modules/          # Feature modules
│   ├── auth/         # Authentication
│   ├── org/          # Organizations
│   ├── invoice/      # Invoice management
│   ├── transaction/  # Transactions
│   ├── reconciliation/ # Reconciliation
│   ├── reports/      # Report generation
│   └── agent/        # AI agents
└── server.ts         # Main server file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user & organization
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Organization
- `GET /api/org/:id` - Get organization
- `PATCH /api/org/:id` - Update organization

### Invoices
- `POST /api/invoice/upload` - Upload invoice
- `GET /api/invoice/list` - List invoices
- `GET /api/invoice/:id` - Get invoice
- `POST /api/invoice/:id/ocr` - Start OCR processing

### Transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Reconciliation
- `POST /api/reconcile/start` - Start reconciliation
- `GET /api/reconcile/:id/status` - Get status
- `GET /api/reconcile/:id/results` - Get results
- `GET /api/reconcile/list` - List reconciliations

### Reports
- `POST /api/reports/generate` - Generate report
- `GET /api/reports/pnl` - Get P&L report
- `GET /api/reports/balance-sheet` - Get Balance Sheet
- `GET /api/reports/gst` - Get GST report
- `GET /api/reports/list` - List reports
- `GET /api/reports/:id` - Get report

### AI Agents
- `POST /api/agent/run` - Run agent job
- `GET /api/agent/status/:id` - Get job status
- `GET /api/agent/list` - List agent jobs

## Environment Variables

See `.env.example` for all required environment variables.

## Database Schema

The database includes the following main models:
- Organization
- User
- Invoice
- Transaction
- LedgerEntry
- Reconciliation
- ReconciliationMatch
- Report
- AgentJob
- AuditLog

## Development

### Run in development mode
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Run production build
```bash
npm start
```

### Database operations
```bash
# Create migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio

# Reset database
npx prisma migrate reset
```

## Docker

### Build Docker image
```bash
docker build -t auditron-api .
```

### Run with Docker Compose
```bash
docker-compose up
```

## Testing

```bash
npm test
```

## License

MIT
