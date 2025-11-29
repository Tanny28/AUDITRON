# AUDITRON Operations Runbook

## Quick Reference

**Service URLs**:
- API: `https://api.auditron.ai`
- Frontend: `https://app.auditron.ai`
- Grafana: `https://monitoring.auditron.ai`
- Prometheus: `https://prometheus.auditron.ai`

**Emergency Contacts**: See [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md)

---

## Common Operations

### 1. Checking System Health

```bash
# API health check
curl https://api.auditron.ai/health

# Detailed health (requires auth)
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://api.auditron.ai/health/detailed

# Check all pods
kubectl get pods -n auditron

# Check services
kubectl get svc -n auditron
```

### 2. Viewing Logs

```bash
# API logs (last 100 lines)
kubectl logs -n auditron deployment/auditron-api --tail=100

# Follow logs in real-time
kubectl logs -n auditron deployment/auditron-api -f

# Logs for specific pod
kubectl logs -n auditron <pod-name>

# Logs from all pods
kubectl logs -n auditron -l app=auditron-api --all-containers=true
```

### 3. Scaling Services

```bash
# Scale API
kubectl scale deployment auditron-api --replicas=5 -n auditron

# Check current replicas
kubectl get deployment auditron-api -n auditron

# Auto-scaling status
kubectl get hpa -n auditron
```

### 4. Restarting Services

```bash
# Rolling restart
kubectl rollout restart deployment/auditron-api -n auditron

# Check rollout status
kubectl rollout status deployment/auditron-api -n auditron

# Rollback if needed
kubectl rollout undo deployment/auditron-api -n auditron
```

### 5. Database Operations

```bash
# Connect to database
kubectl exec -it <postgres-pod> -n auditron -- psql -U postgres -d auditron

# Run migration
kubectl exec -it <api-pod> -n auditron -- npm run prisma:migrate deploy

# Check database size
psql -h $DB_HOST -U postgres -d auditron -c "SELECT pg_size_pretty(pg_database_size('auditron'));"

# Active connections
psql -h $DB_HOST -U postgres -d auditron -c "SELECT count(*) FROM pg_stat_activity;"
```

### 6. Cache Operations

```bash
# Connect to Redis
kubectl exec -it <redis-pod> -n auditron -- redis-cli

# Check cache size
redis-cli DBSIZE

# Flush cache (use with caution!)
redis-cli FLUSHALL

# Monitor cache operations
redis-cli MONITOR
```

### 7. Queue Operations

```bash
# Check queue length
curl https://api.auditron.ai/api/admin/queue/stats

# Pause queue
curl -X POST https://api.auditron.ai/api/admin/queue/pause

# Resume queue
curl -X POST https://api.auditron.ai/api/admin/queue/resume

# Clean old jobs
curl -X POST https://api.auditron.ai/api/admin/queue/clean
```

---

## Troubleshooting

### High CPU Usage

**Symptoms**: Slow response times, high CPU metrics

**Diagnosis**:
```bash
# Check pod CPU usage
kubectl top pods -n auditron

# Check node CPU
kubectl top nodes

# View detailed metrics in Grafana
```

**Resolution**:
1. Check for slow queries in database
2. Review recent code changes
3. Scale up if needed: `kubectl scale deployment auditron-api --replicas=5 -n auditron`
4. Check for infinite loops or memory leaks

### High Memory Usage

**Symptoms**: OOMKilled pods, slow performance

**Diagnosis**:
```bash
# Check memory usage
kubectl top pods -n auditron

# Check for memory leaks
kubectl logs <pod-name> -n auditron | grep "heap"
```

**Resolution**:
1. Restart affected pods
2. Increase memory limits if legitimate
3. Check for memory leaks in code
4. Review cache size

### Database Connection Issues

**Symptoms**: "Too many connections" errors

**Diagnosis**:
```bash
# Check active connections
psql -h $DB_HOST -U postgres -d auditron -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection limit
psql -h $DB_HOST -U postgres -d auditron -c "SHOW max_connections;"
```

**Resolution**:
1. Kill idle connections:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' 
   AND state_change < current_timestamp - interval '5 minutes';
   ```
2. Increase connection pool size
3. Scale database if needed

### Queue Backlog

**Symptoms**: Jobs not processing, queue length growing

**Diagnosis**:
```bash
# Check queue stats
curl https://api.auditron.ai/api/admin/queue/stats

# Check worker logs
kubectl logs -n auditron deployment/auditron-worker -f
```

**Resolution**:
1. Check for failing jobs
2. Increase worker count
3. Check external API availability (OpenAI, Stripe)
4. Review dead-letter queue

### Slow API Responses

**Symptoms**: High response times, timeouts

**Diagnosis**:
```bash
# Check p95 latency in Grafana
# Check slow queries
psql -h $DB_HOST -U postgres -d auditron -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Resolution**:
1. Enable query caching
2. Add database indexes
3. Optimize slow queries
4. Scale API pods
5. Check external API latency

---

## Maintenance Tasks

### Daily

- [ ] Check Grafana dashboards
- [ ] Review error logs
- [ ] Check backup success
- [ ] Monitor queue length

### Weekly

- [ ] Review security alerts
- [ ] Check disk usage
- [ ] Test backup restore
- [ ] Review performance metrics
- [ ] Update dependencies

### Monthly

- [ ] DR drill
- [ ] Security audit
- [ ] Performance review
- [ ] Capacity planning
- [ ] Update documentation

---

## Deployment Procedures

### Standard Deployment

```bash
# 1. Create release tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 2. GitHub Actions will automatically:
#    - Run tests
#    - Build Docker image
#    - Deploy to production

# 3. Monitor deployment
kubectl rollout status deployment/auditron-api -n auditron

# 4. Verify health
curl https://api.auditron.ai/health
```

### Hotfix Deployment

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug main

# 2. Make fix and test
npm test

# 3. Deploy directly (skip staging)
git tag -a v1.2.4-hotfix -m "Hotfix: Critical bug"
git push origin v1.2.4-hotfix

# 4. Monitor closely
kubectl logs -n auditron deployment/auditron-api -f
```

### Rollback

```bash
# Quick rollback
kubectl rollout undo deployment/auditron-api -n auditron

# Rollback to specific revision
kubectl rollout undo deployment/auditron-api --to-revision=2 -n auditron

# Check rollout history
kubectl rollout history deployment/auditron-api -n auditron
```

---

## Monitoring & Alerts

### Key Metrics to Watch

1. **API Response Time**: p95 < 200ms
2. **Error Rate**: < 0.1%
3. **Database Connections**: < 80% of max
4. **Queue Length**: < 100 jobs
5. **CPU Usage**: < 70%
6. **Memory Usage**: < 80%

### Alert Severity Levels

- **Critical**: Immediate action required (page on-call)
- **Warning**: Action needed within 1 hour
- **Info**: Informational, review during business hours

### Common Alerts

| Alert | Severity | Action |
|-------|----------|--------|
| API Down | Critical | Follow DR procedure |
| High Error Rate | Critical | Check logs, rollback if needed |
| Database Down | Critical | Restore from backup |
| High Latency | Warning | Scale up, optimize queries |
| Queue Backlog | Warning | Increase workers |
| Disk Space Low | Warning | Clean old data |

---

## Security Procedures

### Rotating Secrets

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Update Kubernetes secret
kubectl create secret generic auditron-secrets \
  --from-literal=jwt-secret=$NEW_SECRET \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Rolling restart
kubectl rollout restart deployment/auditron-api -n auditron
```

### Revoking API Keys

```bash
# Via API
curl -X POST https://api.auditron.ai/api/admin/api-keys/<key-id>/revoke \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Via database
psql -h $DB_HOST -U postgres -d auditron -c \
  "UPDATE \"ApiKey\" SET active = false WHERE id = '<key-id>';"
```

### Security Incident Response

1. **Identify**: Determine scope of incident
2. **Contain**: Disable affected accounts/keys
3. **Eradicate**: Remove malicious code/access
4. **Recover**: Restore from clean backup
5. **Review**: Post-incident analysis

---

## Performance Optimization

### Database Optimization

```sql
-- Analyze tables
ANALYZE;

-- Vacuum database
VACUUM ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Find missing indexes
SELECT * FROM pg_stat_user_tables
WHERE seq_scan > 1000 AND idx_scan = 0;
```

### Cache Optimization

```bash
# Check cache hit rate
redis-cli INFO stats | grep keyspace_hits

# Monitor cache size
redis-cli INFO memory

# Identify hot keys
redis-cli --hotkeys
```

---

## Useful Commands

### Kubernetes

```bash
# Get all resources
kubectl get all -n auditron

# Describe pod
kubectl describe pod <pod-name> -n auditron

# Execute command in pod
kubectl exec -it <pod-name> -n auditron -- /bin/sh

# Port forward
kubectl port-forward <pod-name> 3000:3000 -n auditron

# View events
kubectl get events -n auditron --sort-by='.lastTimestamp'
```

### Docker

```bash
# View running containers
docker ps

# View logs
docker logs <container-id> -f

# Execute command
docker exec -it <container-id> /bin/sh

# Clean up
docker system prune -a
```

### Database

```bash
# Backup
pg_dump -h $DB_HOST -U postgres auditron | gzip > backup.sql.gz

# Restore
gunzip -c backup.sql.gz | psql -h $DB_HOST -U postgres auditron

# Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

**Last Updated**: 2025-01-15  
**Version**: 1.0
