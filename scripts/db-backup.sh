#!/bin/bash
# Database backup script
# Creates a timestamped dump of the database to backups/ folder

set -e

# Get database URL from environment
DATABASE_URL="${DATABASE_URL:-${DATABASE_URL_LISTINGS}}"

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL or DATABASE_URL_LISTINGS environment variable is not set"
    echo "Usage: DATABASE_URL=postgresql://user:pass@host:port/dbname bash scripts/db-backup.sh"
    exit 1
fi

# Parse database URL to extract components
# Format: postgresql://[user[:password]@][host][:port][/database]
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# If parsing failed, try alternative method
if [ -z "$DB_NAME" ]; then
    DB_NAME=$(echo "$DATABASE_URL" | awk -F'/' '{print $NF}' | awk -F'?' '{print $1}')
fi

if [ -z "$DB_HOST" ]; then
    DB_HOST="localhost"
fi

if [ -z "$DB_PORT" ]; then
    DB_PORT="5432"
fi

if [ -z "$DB_USER" ]; then
    DB_USER="postgres"
fi

# Create backups directory if it doesn't exist
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
BACKUP_FILE_CUSTOM="${BACKUP_DIR}/backup_${TIMESTAMP}.custom"

echo "🗄️  Creating database backup..."
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST:$DB_PORT"
echo ""

# Use pg_dump with custom format (allows selective restore)
# Set PGPASSWORD if password is in URL
if [ -n "$DB_PASS" ]; then
    export PGPASSWORD="$DB_PASS"
fi

# Try custom format first (compressed, allows selective restore)
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom \
    --no-owner \
    --no-acl \
    --file="$BACKUP_FILE_CUSTOM" 2>/dev/null; then
    echo "✅ Backup created successfully: $BACKUP_FILE_CUSTOM"
    echo ""
    echo "To restore this backup, run:"
    echo "  bash scripts/db-restore.sh $BACKUP_FILE_CUSTOM"
    exit 0
fi

# Fallback to SQL format if custom format fails
echo "⚠️  Custom format failed, trying SQL format..."
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --file="$BACKUP_FILE" 2>/dev/null; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    echo ""
    echo "To restore this backup, run:"
    echo "  bash scripts/db-restore.sh $BACKUP_FILE"
    exit 0
fi

# If both fail, try with connection string directly
echo "⚠️  Direct connection failed, trying with connection string..."
if pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-acl \
    --file="$BACKUP_FILE" 2>/dev/null; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    echo ""
    echo "To restore this backup, run:"
    echo "  bash scripts/db-restore.sh $BACKUP_FILE"
    exit 0
fi

echo "❌ Backup failed. Please check:"
echo "   1. PostgreSQL client tools (pg_dump) are installed"
echo "   2. Database connection details are correct"
echo "   3. You have permissions to access the database"
exit 1

