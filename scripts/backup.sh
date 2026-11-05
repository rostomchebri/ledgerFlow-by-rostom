#!/usr/bin/env bash
# OPS-02 — encrypted-at-rest-ready PostgreSQL backup.
#
# Usage (on the host, with pg_dump 16+ installed):
#   DATABASE_URL=postgresql://... BACKUP_DIR=/var/backups/ledgerflow ./scripts/backup.sh
#
# Or inside the compose network:
#   docker compose -f docker/compose.prod.yml exec -T postgres \
#     pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > backups/ledgerflow-$(date -u +%Y%m%dT%H%M%SZ).dump
#
# Optional: set S3_BACKUP_URI=s3://bucket/prefix to upload a copy. The script
# verifies the archive with `pg_restore --list` before considering it valid.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="${STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"

mkdir -p "$BACKUP_DIR"
TARGET="$BACKUP_DIR/ledgerflow-$STAMP.dump"
TMP="$TARGET.partial"

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT

echo "==> Dumping database to $TARGET"
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --compress=9 \
  --file="$TMP" \
  "$DATABASE_URL"

echo "==> Verifying archive"
pg_restore --list "$TMP" >/dev/null

mv "$TMP" "$TARGET"
trap - EXIT

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$TARGET" >"$TARGET.sha256"
else
  shasum -a 256 "$TARGET" >"$TARGET.sha256"
fi
echo "==> Checksum written to $TARGET.sha256"

if [ -n "${S3_BACKUP_URI:-}" ]; then
  echo "==> Uploading to $S3_BACKUP_URI"
  aws s3 cp "$TARGET" "$S3_BACKUP_URI/$(basename "$TARGET")"
  aws s3 cp "$TARGET.sha256" "$S3_BACKUP_URI/$(basename "$TARGET").sha256"
fi

echo "==> Pruning archives older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -type f \( -name 'ledgerflow-*.dump' -o -name 'ledgerflow-*.dump.sha256' \) \
  -mtime "+$RETENTION_DAYS" -print -delete

echo "==> Backup complete: $(du -h "$TARGET" | cut -f1)"
