#!/bin/bash
# Database restore script
# Restores a database dump from backups/ folder

set -e

if [ $# -lt 1 ]; then
    echo "ERROR: Backup file path is required"
    echo "Usage: bash scripts/db-restore.sh <path-to-backup-file>"
    echo ""
    echo "Example:"
    echo "  bash scripts/db-restore.sh backups/backup_20240115_120000.sql"
    echo "  bash scripts/db-restore.sh backups/backup_20240115_120000.custom"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Get database URL from environment
DATABASE_URL="${DATABASE_URL:-${DATABASE_URL_LISTINGS}}"

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL or DATABASE_URL_LISTINGS environment variable is not set"
    echo "Usage: DATABASE_URL=postgresql://user:pass@host:port/dbname bash scripts/db-restore.sh <backup-file>"
    exit 1
fi

# Parse database URL to extract components
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

echo "🔄 Restoring database from backup..."
echo "   Backup file: $BACKUP_FILE"
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST:$DB_PORT"
echo ""
echo "⚠️  WARNING: This will overwrite existing data in the database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Set PGPASSWORD if password is in URL
if [ -n "$DB_PASS" ]; then
    export PGPASSWORD="$DB_PASS"
fi

# Check if backup file is custom format (.custom) or SQL format
if [[ "$BACKUP_FILE" == *.custom ]]; then
    echo "📦 Detected custom format backup, restoring..."
    if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        "$BACKUP_FILE" 2>/dev/null; then
        echo "✅ Database restored successfully from: $BACKUP_FILE"
        exit 0
    fi
    
    # Try with connection string directly
    if pg_restore -d "$DATABASE_URL" \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        "$BACKUP_FILE" 2>/dev/null; then
        echo "✅ Database restored successfully from: $BACKUP_FILE"
        exit 0
    fi
else
    echo "📄 Detected SQL format backup, restoring..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$BACKUP_FILE" 2>/dev/null; then
        echo "✅ Database restored successfully from: $BACKUP_FILE"
        exit 0
    fi
    
    # Try with connection string directly
    if psql "$DATABASE_URL" -f "$BACKUP_FILE" 2>/dev/null; then
        echo "✅ Database restored successfully from: $BACKUP_FILE"
        exit 0
    fi
fi

echo "❌ Restore failed. Please check:"
echo "   1. PostgreSQL client tools (pg_restore/psql) are installed"
echo "   2. Database connection details are correct"
echo "   3. You have permissions to access the database"
echo "   4. The backup file is valid and not corrupted"
exit 1

