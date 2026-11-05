#!/usr/bin/env bash
# OPS-02 — restore drill helper.
#
# Restoring overwrites the target database. This script refuses to run unless
# CONFIRM_RESTORE=yes is set, and it uses a single transaction so a failed
# restore leaves the current database untouched.
#
# Usage:
#   DATABASE_URL=postgresql://... BACKUP_FILE=/var/backups/ledgerflow-....dump \
#     CONFIRM_RESTORE=yes ./scripts/restore.sh
#
# Always restore into a scratch database first as part of the quarterly drill.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"

if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "Refusing to restore without CONFIRM_RESTORE=yes" >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "==> Verifying archive"
pg_restore --list "$BACKUP_FILE" >/dev/null

echo "==> Restoring $BACKUP_FILE into the target database"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --dbname="$DATABASE_URL" \
  "$BACKUP_FILE"

echo "==> Restore complete. Run smoke checks:"
echo "    curl -fsS \"\$NEXT_PUBLIC_APP_URL/api/health\""
echo "    sign in, open clients/invoices/tasks, confirm counts"
