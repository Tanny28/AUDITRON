# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and MinIO
docker-compose up -d
```

Wait ~10 seconds for containers to initialize.

### 2. Setup Database

```bash
# Install dependencies
npm install

# Run migrations
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate

# Seed demo data
npm run prisma:seed
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env
```

The defaults work for local development. For production, update:
- `JWT_SECRET` - Use a secure random string (min 32 chars)
- `DATABASE_URL` - Your production database
- `OPENAI_API_KEY` - Your OpenAI key (for AI features)

### 4. Start Server

```bash
npm run dev
```

Server starts at: `http://localhost:3000`

### 5. Verify Setup

```bash
# Run smoke tests
bash scripts/smoke-test.sh
```

Expected: ✅ All tests pass

## 📚 What's Next?

- **API Docs**: http://localhost:3000/docs
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Prisma Studio**: `npm run prisma:studio`

## 🔑 Demo Credentials

After seeding:

- **Admin**: admin@auditron.ai / admin123
- **CA**: ca@auditron.ai / ca123
- **User**: user@auditron.ai / user123

## 🧪 Testing

```bash
# Automated smoke tests
bash scripts/smoke-test.sh

# Import Postman collection
postman/Auditron-Phase1-API.postman_collection.json
```

## 🐛 Troubleshooting

**Port 3000 in use?**
```bash
# Change PORT in .env
PORT=3001
```

**Database connection error?**
```bash
docker-compose restart postgres
```

**MinIO not accessible?**
```bash
docker-compose restart minio
```

For detailed troubleshooting, see [Backend Verification](docs/backend-verification.md).

## 📖 Full Documentation

- [Complete README](README.md)
- [Verification Checklist](docs/backend-verification.md)
- [API Documentation](http://localhost:3000/docs)
