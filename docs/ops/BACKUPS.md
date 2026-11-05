# Backups and restore drill (OPS-02)

Backups cover **PostgreSQL** (the system of record: firms, users, clients,
invoices, documents metadata, tasks, notifications, audit logs) and **object
storage** (uploaded files). Losing either independently leaves the workspace
inconsistent.

## What to back up

| Asset              | Method                                                        | Frequency | Retention |
| ------------------ | ------------------------------------------------------------- | --------- | --------- |
| PostgreSQL         | `pg_dump --format=custom` via `scripts/backup.sh`             | Daily     | 14 days local, 90 days off-host |
| Object storage     | `mc mirror` / `aws s3 sync` of `S3_BUCKET` to a second bucket | Daily     | 30 days   |
| Secrets            | Password manager / sealed secret store                        | On change | —         |
| Image digests      | Deploy log                                                    | Per deploy| —         |

The database dump alone is not enough: document rows reference object keys in
`S3_BUCKET`. Keep storage snapshots aligned to the same schedule (or enable
bucket versioning + object lock on the off-host copy).

## Daily database backup

On the host with `pg_dump` 16 installed:

```bash
DATABASE_URL="postgresql://..." \
BACKUP_DIR=/var/backups/ledgerflow \
RETENTION_DAYS=14 \
S3_BACKUP_URI=s3://ledgerflow-backups/db \
./scripts/backup.sh
```

The script:

1. dumps in custom format with owner/privilege metadata stripped,
2. verifies the archive with `pg_restore --list`,
3. writes a SHA-256 sidecar file,
4. optionally uploads both files to S3,
5. prunes local archives older than `RETENTION_DAYS`.

Schedule it with cron/systemd timers, e.g.:

```cron
15 2 * * * cd /srv/ledgerflow && set -a && . ./.env.production && set +a && BACKUP_DIR=/var/backups/ledgerflow S3_BACKUP_URI=s3://ledgerflow-backups/db ./scripts/backup.sh >> /var/log/ledgerflow-backup.log 2>&1
```

Inside Compose, `./backups` is mounted into the Postgres container so a manual
dump can also be written there:

```bash
docker compose -f docker/compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "backups/ledgerflow-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

## Object storage backup

```bash
mc mirror --overwrite --remove minio/ledgerflow s3/ledgerflow-backups/files
```

or, with AWS CLI against any S3-compatible endpoint:

```bash
aws --endpoint-url "$S3_ENDPOINT" s3 sync "s3://$S3_BUCKET" "s3://ledgerflow-backups/files"
```

Enable versioning on the destination bucket so accidental deletes propagate
only after the retention window.

## Restore drill (quarterly, mandatory)

Never restore directly over production first. Drill into a scratch database:

```bash
createdb -h localhost -U postgres ledgerflow_restore_check
DATABASE_URL=postgresql://postgres:...@localhost:5432/ledgerflow_restore_check \
BACKUP_FILE=/var/backups/ledgerflow/ledgerflow-20260101T021500Z.dump \
CONFIRM_RESTORE=yes ./scripts/restore.sh
```

Then verify:

1. `SELECT count(*)` on `firms`, `clients`, `invoices`, `documents`, `tasks`,
   `audit_logs` matches the source snapshot.
2. Run `pnpm prisma migrate status` against the restored DB — it must be
   up to date or one migration behind, never ahead.
3. Start the app against the scratch DB and sign in with a known account.
4. Download one document and confirm the object exists in the storage copy.
5. Record the drill in the table below, including RTO/RPO actually achieved.

| Drill date | Backup used | Restore duration | Row checks | Storage check | Performed by |
| ---------- | ----------- | ---------------- | ---------- | ------------- | ------------ |
| _pending_  |             |                  |            |               |              |

### Targets

- **RPO:** ≤ 24 hours (daily dump; consider WAL archiving if a tighter target is required).
- **RTO:** ≤ 2 hours for a single-VPS deployment, including DNS/TLS checks.
- Backups are stored off the primary host so a host loss does not lose both copies.

## Restore into production (incident only)

1. Announce downtime and stop `web` and `worker` (`docker compose stop web worker`).
2. Take a safety dump of the current database even if it is damaged.
3. Restore with `CONFIRM_RESTORE=yes` after double-checking `DATABASE_URL`.
4. Start `web`, check `/api/health`, then start `worker`.
5. Smoke-test sign-in, clients, invoices, tasks, document download, audit log.
6. Document the incident, data-loss window, and follow-up actions.

## Encryption

`pg_dump` output is not encrypted by the script. Either:

- store backups on an encrypted volume (LUKS) and use an encrypted S3 bucket, or
- pipe the dump through `age`/`gpg` before upload and store the key separately.

Choose one before the first production backup is retained off-host.
