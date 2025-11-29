#!/bin/bash

# MinIO Backup Script
# Syncs MinIO data to S3 or another MinIO instance

set -e

# Configuration
MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-auditron-files}"
BACKUP_BUCKET="${BACKUP_BUCKET:-auditron-files-backup}"
S3_ENDPOINT="${S3_ENDPOINT:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

# Check if mc (MinIO Client) is installed
if ! command -v mc &> /dev/null; then
    error "MinIO Client (mc) not found. Install from: https://min.io/docs/minio/linux/reference/minio-mc.html"
    exit 1
fi

log "Starting MinIO backup..."

# Configure MinIO client
log "Configuring MinIO client..."
mc alias set source "http://$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

if [ -n "$S3_ENDPOINT" ]; then
    # Backup to S3
    log "Configuring S3 destination..."
    mc alias set dest "$S3_ENDPOINT" "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY"
    
    log "Syncing to S3..."
    mc mirror --preserve source/"$MINIO_BUCKET" dest/"$BACKUP_BUCKET"
else
    # Backup to local directory
    BACKUP_DIR="/var/backups/auditron/minio/$TIMESTAMP"
    mkdir -p "$BACKUP_DIR"
    
    log "Syncing to local directory: $BACKUP_DIR"
    mc mirror --preserve source/"$MINIO_BUCKET" "$BACKUP_DIR"
fi

# Get statistics
OBJECT_COUNT=$(mc ls --recursive source/"$MINIO_BUCKET" | wc -l)
TOTAL_SIZE=$(mc du source/"$MINIO_BUCKET" | awk '{print $1}')

log "========================================="
log "MinIO backup completed!"
log "Objects backed up: $OBJECT_COUNT"
log "Total size: $TOTAL_SIZE"
log "========================================="

exit 0
