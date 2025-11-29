#!/bin/bash

# PostgreSQL Automated Backup Script
# Performs full and incremental backups with retention policy

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/auditron/postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-auditron}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/auditron_${TIMESTAMP}.sql.gz"
BACKUP_CUSTOM="$BACKUP_DIR/auditron_${TIMESTAMP}.dump"

log "Starting PostgreSQL backup..."

# Full backup using pg_dump (SQL format, compressed)
log "Creating SQL backup..."
if PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --create \
    --encoding=UTF8 \
    | gzip > "$BACKUP_FILE"; then
    log "SQL backup created: $BACKUP_FILE"
else
    error "SQL backup failed"
    exit 1
fi

# Custom format backup (for parallel restore)
log "Creating custom format backup..."
if PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -f "$BACKUP_CUSTOM"; then
    log "Custom backup created: $BACKUP_CUSTOM"
else
    error "Custom backup failed"
    exit 1
fi

# Calculate backup sizes
SQL_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
CUSTOM_SIZE=$(du -h "$BACKUP_CUSTOM" | cut -f1)

log "Backup sizes: SQL=$SQL_SIZE, Custom=$CUSTOM_SIZE"

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    log "Uploading backups to S3..."
    
    if command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/postgres/$(basename $BACKUP_FILE)" && \
        aws s3 cp "$BACKUP_CUSTOM" "s3://$S3_BUCKET/postgres/$(basename $BACKUP_CUSTOM)"
        
        if [ $? -eq 0 ]; then
            log "Backups uploaded to S3 successfully"
        else
            error "S3 upload failed"
        fi
    else
        warn "AWS CLI not found, skipping S3 upload"
    fi
fi

# Clean old backups (retention policy)
log "Cleaning old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "auditron_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "auditron_*.dump" -mtime +$RETENTION_DAYS -delete

# Clean old S3 backups if configured
if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
    aws s3 ls "s3://$S3_BUCKET/postgres/" | while read -r line; do
        FILE_DATE=$(echo $line | awk '{print $1}')
        FILE_NAME=$(echo $line | awk '{print $4}')
        
        if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
            aws s3 rm "s3://$S3_BUCKET/postgres/$FILE_NAME"
            log "Deleted old S3 backup: $FILE_NAME"
        fi
    done
fi

# Verify backup integrity
log "Verifying backup integrity..."
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    log "Backup integrity verified"
else
    error "Backup integrity check failed"
    exit 1
fi

# Create backup metadata
METADATA_FILE="$BACKUP_DIR/auditron_${TIMESTAMP}.meta"
cat > "$METADATA_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "sql_file": "$(basename $BACKUP_FILE)",
  "custom_file": "$(basename $BACKUP_CUSTOM)",
  "sql_size": "$SQL_SIZE",
  "custom_size": "$CUSTOM_SIZE",
  "retention_days": $RETENTION_DAYS,
  "s3_bucket": "$S3_BUCKET"
}
EOF

log "Backup metadata saved: $METADATA_FILE"

# Summary
log "========================================="
log "Backup completed successfully!"
log "SQL Backup: $BACKUP_FILE ($SQL_SIZE)"
log "Custom Backup: $BACKUP_CUSTOM ($CUSTOM_SIZE)"
log "Metadata: $METADATA_FILE"
log "========================================="

exit 0
