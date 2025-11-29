#!/bin/bash

# Database Restore Script
# Restores PostgreSQL database from backup

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/auditron/postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-auditron}"
DB_USER="${DB_USER:-postgres}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    error "Usage: $0 <backup_file>"
    error "Available backups:"
    ls -lh "$BACKUP_DIR"/auditron_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log "Restore configuration:"
log "  Backup file: $BACKUP_FILE"
log "  Database: $DB_NAME"
log "  Host: $DB_HOST:$DB_PORT"
log "  User: $DB_USER"

# Confirm restore
warn "This will REPLACE the current database with the backup!"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Restore cancelled"
    exit 0
fi

# Create backup of current database before restore
log "Creating safety backup of current database..."
SAFETY_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    | gzip > "$SAFETY_BACKUP"
log "Safety backup created: $SAFETY_BACKUP"

# Terminate existing connections
log "Terminating existing database connections..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Restore database
log "Restoring database from backup..."
if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    # SQL format backup
    gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres
elif [[ "$BACKUP_FILE" == *.dump ]]; then
    # Custom format backup (parallel restore)
    PGPASSWORD="$DB_PASSWORD" pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --jobs=4 \
        "$BACKUP_FILE"
else
    error "Unknown backup format"
    exit 1
fi

if [ $? -eq 0 ]; then
    log "Database restored successfully!"
else
    error "Database restore failed!"
    warn "You can restore from safety backup: $SAFETY_BACKUP"
    exit 1
fi

# Verify restore
log "Verifying database..."
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

log "Tables found: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt 0 ]; then
    log "========================================="
    log "Restore completed successfully!"
    log "Safety backup: $SAFETY_BACKUP"
    log "========================================="
else
    error "Restore verification failed - no tables found"
    exit 1
fi

exit 0
