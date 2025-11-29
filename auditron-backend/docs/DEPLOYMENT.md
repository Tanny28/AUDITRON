# AUDITRON Deployment Guide

## Prerequisites

Before deploying AUDITRON, ensure you have:

- [ ] Kubernetes cluster (1.28+)
- [ ] kubectl configured
- [ ] Docker registry access
- [ ] Domain name configured
- [ ] SSL certificates (Let's Encrypt recommended)
- [ ] Cloud provider account (AWS/GCP/Azure)

---

## Quick Start (Development)

```bash
# 1. Clone repository
git clone https://github.com/your-org/auditron.git
cd auditron/auditron-backend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start infrastructure
docker-compose up -d

# 5. Run migrations
npm run prisma:generate
npm run prisma:migrate

# 6. Start development server
npm run dev
```

Access API at `http://localhost:3000`

---

## Production Deployment

### Option 1: Kubernetes (Recommended)

#### Step 1: Prepare Infrastructure

```bash
# Create namespace
kubectl create namespace auditron

# Create secrets
kubectl create secret generic auditron-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=redis-url="redis://..." \
  --from-literal=jwt-secret="..." \
  --from-literal=openai-api-key="..." \
  --from-literal=stripe-secret-key="..." \
  -n auditron
```

#### Step 2: Deploy Database

```bash
# Option A: Use managed database (recommended)
# Configure RDS/Cloud SQL connection in secrets

# Option B: Deploy PostgreSQL in cluster
kubectl apply -f k8s/postgres-statefulset.yml -n auditron
```

#### Step 3: Deploy Redis

```bash
# Option A: Use managed Redis (recommended)
# Configure ElastiCache/Memorystore connection

# Option B: Deploy Redis in cluster
kubectl apply -f k8s/redis-statefulset.yml -n auditron
```

#### Step 4: Deploy Application

```bash
# Apply all manifests
kubectl apply -f k8s/ -n auditron

# Verify deployment
kubectl get pods -n auditron
kubectl get svc -n auditron
kubectl get ingress -n auditron
```

#### Step 5: Run Migrations

```bash
# Get API pod name
POD=$(kubectl get pods -n auditron -l app=auditron-api -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -it $POD -n auditron -- npm run prisma:migrate deploy
```

#### Step 6: Configure DNS

```bash
# Get load balancer IP
kubectl get ingress auditron-api -n auditron

# Point your domain to the load balancer IP
# api.auditron.ai → <LOAD_BALANCER_IP>
```

#### Step 7: Verify Deployment

```bash
# Health check
curl https://api.auditron.ai/health

# Check logs
kubectl logs -n auditron deployment/auditron-api --tail=100
```

---

### Option 2: Docker Compose (Small Scale)

```bash
# 1. Clone repository
git clone https://github.com/your-org/auditron.git
cd auditron/auditron-backend

# 2. Configure environment
cp .env.example .env
# Edit .env with production values

# 3. Build and start
docker-compose -f docker-compose.prod.yml up -d

# 4. Run migrations
docker-compose exec api npm run prisma:migrate deploy

# 5. Verify
curl http://localhost:3000/health
```

---

### Option 3: Cloud Platform (Serverless)

#### AWS (ECS + Fargate)

```bash
# 1. Build and push Docker image
docker build -t auditron-api .
docker tag auditron-api:latest <ECR_REPO>:latest
docker push <ECR_REPO>:latest

# 2. Create ECS task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# 3. Create ECS service
aws ecs create-service --cli-input-json file://ecs-service.json

# 4. Configure load balancer
# Point ALB to ECS service
```

#### Google Cloud (Cloud Run)

```bash
# 1. Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/auditron-api

# 2. Deploy
gcloud run deploy auditron-api \
  --image gcr.io/PROJECT_ID/auditron-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# 3. Configure custom domain
gcloud run domain-mappings create --service auditron-api --domain api.auditron.ai
```

---

## Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/auditron

# Redis
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=<32+ character random string>
JWT_EXPIRES_IN=7d

# MinIO/S3
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_ACCESS_KEY=<access_key>
MINIO_SECRET_KEY=<secret_key>
MINIO_BUCKET=auditron-files

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Sentry (for error tracking)
SENTRY_DSN=https://...@sentry.io/...

# App URLs
APP_URL=https://app.auditron.ai
API_URL=https://api.auditron.ai
```

### Optional Environment Variables

```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@auditron.ai
SMTP_PASS=<app_password>

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_TIMEWINDOW=1 minute

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
```

---

## Post-Deployment Checklist

### Security

- [ ] SSL/TLS certificates configured
- [ ] Secrets stored securely (not in code)
- [ ] Database access restricted
- [ ] API rate limiting enabled
- [ ] CORS configured correctly
- [ ] Security headers enabled (Helmet.js)

### Monitoring

- [ ] Prometheus scraping metrics
- [ ] Grafana dashboards configured
- [ ] Sentry error tracking active
- [ ] Log aggregation configured
- [ ] Alerts configured

### Backups

- [ ] Database backups scheduled (daily)
- [ ] File storage backups configured
- [ ] Backup retention policy set (30 days)
- [ ] Backup restore tested
- [ ] DR plan documented

### Performance

- [ ] Auto-scaling configured (HPA)
- [ ] Cache warming implemented
- [ ] Database indexes created
- [ ] CDN configured for static assets
- [ ] Connection pooling optimized

### Documentation

- [ ] API documentation published
- [ ] Runbook created
- [ ] Architecture documented
- [ ] DR procedures documented
- [ ] Team trained on operations

---

## Scaling Guide

### Horizontal Scaling

```bash
# Scale API pods
kubectl scale deployment auditron-api --replicas=10 -n auditron

# Configure auto-scaling
kubectl apply -f k8s/hpa.yml -n auditron
```

### Vertical Scaling

```bash
# Update resource limits
kubectl edit deployment auditron-api -n auditron

# Increase CPU/memory in deployment.yml
resources:
  requests:
    cpu: 1000m
    memory: 1Gi
  limits:
    cpu: 4000m
    memory: 4Gi
```

### Database Scaling

```bash
# Add read replicas
# Configure in DATABASE_URL with read/write split

# Increase connection pool
# Update Prisma connection pool size
```

---

## Monitoring Setup

### Prometheus

```bash
# Deploy Prometheus
kubectl apply -f k8s/prometheus.yml -n monitoring

# Verify scraping
curl http://prometheus.auditron.ai/targets
```

### Grafana

```bash
# Deploy Grafana
kubectl apply -f k8s/grafana.yml -n monitoring

# Import dashboards
# Upload grafana/dashboards/*.json
```

### Sentry

```bash
# Configure Sentry DSN in environment
SENTRY_DSN=https://...@sentry.io/...

# Verify error tracking
# Trigger test error and check Sentry dashboard
```

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n auditron

# Check logs
kubectl logs <pod-name> -n auditron

# Common issues:
# - Missing secrets
# - Image pull errors
# - Resource limits too low
```

### Database Connection Errors

```bash
# Test database connectivity
kubectl exec -it <pod-name> -n auditron -- psql $DATABASE_URL

# Check secrets
kubectl get secret auditron-secrets -n auditron -o yaml

# Verify network policies
kubectl get networkpolicies -n auditron
```

### High Memory Usage

```bash
# Check memory usage
kubectl top pods -n auditron

# Increase memory limits
kubectl edit deployment auditron-api -n auditron

# Check for memory leaks
kubectl logs <pod-name> -n auditron | grep "heap"
```

---

## Rollback Procedure

```bash
# View deployment history
kubectl rollout history deployment/auditron-api -n auditron

# Rollback to previous version
kubectl rollout undo deployment/auditron-api -n auditron

# Rollback to specific revision
kubectl rollout undo deployment/auditron-api --to-revision=2 -n auditron

# Verify rollback
kubectl rollout status deployment/auditron-api -n auditron
```

---

## Maintenance Windows

### Planned Maintenance

1. **Notify users** 24 hours in advance
2. **Enable maintenance mode**
3. **Scale down to 0 replicas**
4. **Perform maintenance**
5. **Scale back up**
6. **Verify health**
7. **Notify users** maintenance complete

### Zero-Downtime Deployment

```bash
# Use rolling update strategy (default)
kubectl set image deployment/auditron-api auditron-api=<new-image> -n auditron

# Monitor rollout
kubectl rollout status deployment/auditron-api -n auditron
```

---

## Support

For deployment issues:
- **Documentation**: https://docs.auditron.ai
- **GitHub Issues**: https://github.com/your-org/auditron/issues
- **Email**: support@auditron.ai
- **Slack**: #auditron-support

---

**Last Updated**: 2025-01-15  
**Version**: 1.0
