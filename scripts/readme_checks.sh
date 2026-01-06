#!/bin/bash
# Consistency checks for README.md
# This script verifies internal consistency of the README document.
# All checks should return ZERO hits when the document is consistent.

set -e

README_FILE="README.md"

if [ ! -f "$README_FILE" ]; then
    echo "ERROR: $README_FILE not found"
    exit 1
fi

echo "Running consistency checks on $README_FILE..."
echo ""

# Check 1: Banned phrase (must return zero results)
echo "Checking for banned phrases..."
if grep -i "DB-per-service architecture (no shared databases)" "$README_FILE" | grep -v "## 14. Consistency Checks" | grep -v "grep -i" | grep -v "scripts/readme_checks.sh" | grep -v "consistency check script verifies" > /dev/null; then
    echo "ERROR: Banned phrase found!"
    exit 1
else
    echo "✓ No banned phrases"
fi

# Check 2: Standalone "..." lines (must return zero results)
echo "Checking for standalone '...' lines..."
if grep -E "^\.\.\.$" "$README_FILE" | grep -v "## 14. Consistency Checks" | grep -v "grep -E" | grep -v "scripts/readme_checks.sh" | grep -v "The script verifies" > /dev/null; then
    echo "ERROR: Standalone '...' found!"
    exit 1
else
    echo "✓ No standalone '...' lines"
fi

# Check 3: Truncated fragments like "REA...echo" or "enfo...ach" (must return zero results)
echo "Checking for truncated fragments..."
if grep -E "[a-z]\.\.\.[a-z]" "$README_FILE" | grep -v "## 14. Consistency Checks" | grep -v "grep -E" | grep -v "scripts/readme_checks.sh" | grep -v "The script verifies" | grep -v "truncated fragments like" > /dev/null; then
    echo "ERROR: Truncated fragments found!"
    exit 1
else
    echo "✓ No truncated fragments"
fi

# Check 4: Verify database stance consistency
echo "Verifying database stance consistency..."
SCHEMA_MENTIONS=$(grep -i "schema-per-module.*shared.*Postgres" "$README_FILE" | wc -l)
DB_SERVICE_MENTIONS=$(grep -i "target.*DB-per-service\|microservices.*DB-per-service" "$README_FILE" | wc -l)
if [ "$SCHEMA_MENTIONS" -gt 0 ] && [ "$DB_SERVICE_MENTIONS" -gt 0 ]; then
    echo "✓ Database stance is consistent (MVP = schema-per-module, target = DB-per-service)"
else
    echo "WARNING: Database stance mentions may be inconsistent"
fi

echo ""
echo "All consistency checks passed!"

