# AUDITRON Disaster Recovery Plan

## Overview

This document outlines the disaster recovery procedures for the AUDITRON system, including Recovery Time Objective (RTO), Recovery Point Objective (RPO), backup strategies, and step-by-step recovery procedures.

---

## Recovery Objectives

### RTO (Recovery Time Objective)

**Target: < 1 hour**

Maximum acceptable downtime for the AUDITRON system:
- **Critical Services**: 30 minutes
- **Full System**: 1 hour

### RPO (Recovery Point Objective)

**Target: < 15 minutes**

Maximum acceptable data loss:
- **Database**: 15 minutes (continuous WAL archiving)
- **File Storage**: 1 hour (hourly sync)
- **Configuration**: 0 (version controlled)

---

## Backup Strategy

### Database Backups

**Frequency**:
- Full backup: Daily at 2:00 AM UTC
- Incremental backup: Hourly
- WAL archiving: Continuous

**Retention**:
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year

**Location**:
- Primary: Local disk (`/var/backups/auditron/postgres`)
- Secondary: S3 bucket (`s3://auditron-backups/postgres`)
- Tertiary: Cross-region S3 replication

**Script**: `scripts/backup-database.sh`

### File Storage Backups (MinIO)

**Frequency**:
- Sync to S3: Hourly
- Snapshot: Daily

**Retention**:
- Hourly syncs: 7 days
- Daily snapshots: 30 days

**Location**:
- Primary: MinIO cluster
- Secondary: S3 bucket (`s3://auditron-backups/files`)

**Script**: `scripts/backup-minio.sh`

### Configuration Backups

**Method**: Git version control

**Frequency**: On every change

**Location**:
- GitHub repository (private)
- Kubernetes ConfigMaps/Secrets (encrypted)

---

## Disaster Scenarios & Recovery Procedures

### Scenario 1: Database Corruption

**Detection**:
- Health check failures
- Application errors
- Data inconsistencies

**Recovery Steps**:

1. **Assess Damage** (5 minutes)
   ```bash
   # Check database connectivity
   psql -h $DB_HOST -U postgres -d auditron -c "SELECT 1;"
   
   # Check for corruption
   psql -h $DB_HOST -U postgres -d auditron -c "SELECT * FROM pg_stat_database WHERE datname = 'auditron';"
   ```

2. **Stop Application** (2 minutes)
   ```bash
   # Kubernetes
   kubectl scale deployment auditron-api --replicas=0 -n auditron
   
   # Docker Compose
   docker-compose stop api
   ```

3. **Identify Latest Valid Backup** (3 minutes)
   ```bash
   # List available backups
   ls -lh /var/backups/auditron/postgres/
   
   # Check S3 backups
   aws s3 ls s3://auditron-backups/postgres/
   ```

4. **Restore Database** (15 minutes)
   ```bash
   # Download from S3 if needed
   aws s3 cp s3://auditron-backups/postgres/auditron_YYYYMMDD_HHMMSS.sql.gz /tmp/
   
   # Restore
   ./scripts/restore-database.sh /tmp/auditron_YYYYMMDD_HHMMSS.sql.gz
   ```

5. **Verify Restore** (5 minutes)
   ```bash
   # Check table counts
   psql -h $DB_HOST -U postgres -d auditron -c "SELECT COUNT(*) FROM \"User\";"
   psql -h $DB_HOST -U postgres -d auditron -c "SELECT COUNT(*) FROM \"Invoice\";"
   
   # Check latest records
   psql -h $DB_HOST -U postgres -d auditron -c "SELECT MAX(\"createdAt\") FROM \"Invoice\";"
   ```

6. **Restart Application** (5 minutes)
   ```bash
   # Kubernetes
   kubectl scale deployment auditron-api --replicas=3 -n auditron
   
   # Docker Compose
   docker-compose up -d api
   ```

7. **Verify Application** (5 minutes)
   ```bash
   # Health check
   curl https://api.auditron.ai/health
   
   # Test critical endpoints
   curl -H "Authorization: Bearer $TOKEN" https://api.auditron.ai/api/invoices
   ```

**Total Time**: ~40 minutes

---

### Scenario 2: Complete Infrastructure Failure

**Detection**:
- All services down
- No response from infrastructure

**Recovery Steps**:

1. **Activate DR Site** (10 minutes)
   - Switch DNS to DR region
   - Activate standby infrastructure

2. **Restore Database** (20 minutes)
   ```bash
   # Restore from S3 to new database
   aws s3 cp s3://auditron-backups/postgres/latest.sql.gz /tmp/
   ./scripts/restore-database.sh /tmp/latest.sql.gz
   ```

3. **Restore File Storage** (15 minutes)
   ```bash
   # Sync from S3 to new MinIO
   mc mirror s3/auditron-backups/files minio/auditron-files
   ```

4. **Deploy Application** (10 minutes)
   ```bash
   # Deploy to DR Kubernetes cluster
   kubectl apply -f k8s/ -n auditron
   ```

5. **Verify and Switch Traffic** (5 minutes)
   ```bash
   # Update DNS
   # Point api.auditron.ai to DR load balancer
   ```

**Total Time**: ~60 minutes

---

### Scenario 3: Data Loss (Accidental Deletion)

**Detection**:
- User reports missing data
- Audit logs show deletion

**Recovery Steps**:

1. **Identify Deletion Time** (5 minutes)
   ```bash
   # Check audit logs
   psql -h $DB_HOST -U postgres -d auditron -c "SELECT * FROM \"AuditLog\" WHERE action = 'DELETE' ORDER BY \"createdAt\" DESC LIMIT 10;"
   ```

2. **Find Backup Before Deletion** (5 minutes)
   ```bash
   # List backups before deletion time
   ls -lh /var/backups/auditron/postgres/ | grep "auditron_YYYYMMDD"
   ```

3. **Restore to Temporary Database** (10 minutes)
   ```bash
   # Create temp database
   createdb auditron_temp
   
   # Restore backup
   gunzip -c /var/backups/auditron/postgres/auditron_YYYYMMDD_HHMMSS.sql.gz | psql -d auditron_temp
   ```

4. **Extract Deleted Data** (10 minutes)
   ```bash
   # Export deleted records
   psql -d auditron_temp -c "COPY (SELECT * FROM \"Invoice\" WHERE id IN (...)) TO '/tmp/deleted_invoices.csv' CSV HEADER;"
   ```

5. **Import to Production** (5 minutes)
   ```bash
   # Import deleted records
   psql -d auditron -c "COPY \"Invoice\" FROM '/tmp/deleted_invoices.csv' CSV HEADER;"
   ```

6. **Verify Recovery** (5 minutes)
   ```bash
   # Check recovered records
   psql -d auditron -c "SELECT * FROM \"Invoice\" WHERE id IN (...);"
   ```

**Total Time**: ~40 minutes

---

## Backup Verification

### Weekly Backup Test

**Schedule**: Every Sunday at 3:00 AM

**Procedure**:
1. Download latest backup from S3
2. Restore to test database
3. Run verification queries
4. Generate test report

**Script**: `scripts/test-backup.sh`

### Monthly DR Drill

**Schedule**: First Saturday of each month

**Procedure**:
1. Simulate complete infrastructure failure
2. Execute full DR procedure
3. Measure RTO/RPO
4. Document lessons learned
5. Update DR plan

---

## Monitoring & Alerts

### Backup Monitoring

**Metrics**:
- Backup success/failure rate
- Backup size trends
- Backup duration
- Time since last successful backup

**Alerts**:
- Backup failure (immediate)
- Backup size anomaly (warning)
- No backup in 25 hours (critical)

### Recovery Monitoring

**Metrics**:
- Recovery test success rate
- Actual RTO vs target
- Actual RPO vs target

**Alerts**:
- Recovery test failure (warning)
- RTO/RPO target miss (critical)

---

## Runbook Quick Reference

### Emergency Contacts

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| On-Call Engineer | TBD | +1-XXX-XXX-XXXX | Primary |
| Database Admin | TBD | +1-XXX-XXX-XXXX | Secondary |
| Infrastructure Lead | TBD | +1-XXX-XXX-XXXX | Escalation |
| CTO | TBD | +1-XXX-XXX-XXXX | Final |

### Critical Commands

```bash
# Check system health
curl https://api.auditron.ai/health

# List recent backups
ls -lh /var/backups/auditron/postgres/ | tail -10

# Restore database
./scripts/restore-database.sh <backup_file>

# Scale down application
kubectl scale deployment auditron-api --replicas=0 -n auditron

# Scale up application
kubectl scale deployment auditron-api --replicas=3 -n auditron

# Check application logs
kubectl logs -f deployment/auditron-api -n auditron

# Check database connections
psql -h $DB_HOST -U postgres -d auditron -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Post-Incident Review

After any disaster recovery event:

1. **Document Timeline**
   - When was issue detected?
   - When was recovery initiated?
   - When was service restored?
   - Actual RTO/RPO achieved

2. **Root Cause Analysis**
   - What caused the incident?
   - Why wasn't it prevented?
   - What monitoring gaps exist?

3. **Action Items**
   - Update DR procedures
   - Improve monitoring
   - Add preventive measures
   - Schedule follow-up drills

4. **Communication**
   - Notify stakeholders
   - Update status page
   - Send post-mortem report

---

## Appendix

### Backup Locations

| Type | Primary | Secondary | Tertiary |
|------|---------|-----------|----------|
| Database | Local disk | S3 us-east-1 | S3 eu-west-1 |
| Files | MinIO cluster | S3 us-east-1 | S3 eu-west-1 |
| Config | Git | Kubernetes | S3 |

### Backup Encryption

All backups are encrypted:
- **At Rest**: AES-256
- **In Transit**: TLS 1.3
- **Keys**: AWS KMS / HashiCorp Vault

### Compliance

- **SOC 2**: Backup retention meets requirements
- **GDPR**: Right to be forgotten implemented
- **HIPAA**: N/A (not handling health data)

---

**Last Updated**: 2025-01-15  
**Next Review**: 2025-04-15  
**Version**: 1.0
