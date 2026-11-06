# Production deployment (OPS-01)

LedgerFlow ships as one Dockerfile with three targets:

| Target    | Purpose                                        | Compose service |
| --------- | ---------------------------------------------- | --------------- |
| `runner`  | Next.js standalone web server (non-root)       | `web`           |
| `worker`  | pg-boss worker + NOTIF-03 reminder scheduler   | `worker`        |
| `migrator`| One-shot `prisma migrate deploy`               | `migrate`       |

`docker/compose.prod.yml` wires them together with PostgreSQL 16, MinIO, and a bucket bootstrap job. Only the web port is published; PostgreSQL and MinIO are bound to loopback and should stay behind the host firewall.

## 1. Prerequisites

- A Linux VPS with Docker Engine 24+ and the Compose plugin.
- A DNS name pointing at the server and a TLS-terminating reverse proxy
  (Caddy, nginx, or Traefik). Never serve the app over plain HTTP.
- E-mail delivery credentials for verification codes, reset links, invitations,
  and reminders: either a Resend API key with a verified sender/domain, or SMTP
  credentials.
- A backup destination (local disk plus off-host/S3 copy).

## 2. First deploy

```bash
git clone <repository> /srv/ledgerflow && cd /srv/ledgerflow
cp .env.production.example .env.production
# Fill every value. Generate secrets:
#   openssl rand -base64 32   (BETTER_AUTH_SECRET, DB/storage/SMTP passwords)
docker compose -f docker/compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker/compose.prod.yml ps
curl -fsS https://app.example.com/api/health
```

The `migrate` service must exit `0` before `web`/`worker` start. Check it with:

```bash
docker compose -f docker/compose.prod.yml logs migrate
```

Then create the first firm through `/register` (e-mail verification is required) or seed a controlled demo workspace.

## 3. Reverse proxy

Example Caddyfile:

```caddy
app.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

TLS and HSTS are terminated at the proxy. The app already sends
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and
`Permissions-Policy`; add HSTS at the proxy:

```caddy
header Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

## 4. Environment contract

All variables are validated by `src/lib/env.ts`. Production refuses to start
with the development `BETTER_AUTH_SECRET`.

Required at runtime: `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`,
`BETTER_AUTH_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `S3_BUCKET`, the
storage credentials, and the `POSTGRES_*` variables used by the database
container. `DATABASE_URL` is the pooled application connection;
`DATABASE_URL_UNPOOLED` is the direct connection used by Prisma migrations and
the jobs worker. On a self-hosted Postgres without a pooler, both can point at
the same database. `REMINDER_CRON` and `REMINDER_TIMEZONE` control the NOTIF-03
sweep and are safe to change per deployment.

Storage accepts either the explicit `S3_ENDPOINT`, `S3_REGION`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` variables (MinIO/S3/R2) or the
standard `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY` variables that Neon Object Storage injects.
`S3_BUCKET` is always required, and `S3_FORCE_PATH_STYLE=true` is the safe
default for path-style providers such as Neon and MinIO.

E-mail requires **one** of these configurations:

- **Resend:** `RESEND_API_KEY` + `EMAIL_FROM` (a verified sender/domain).
  `onboarding@resend.dev` works only for the Resend account owner's address;
  verify a domain before sending to clients or team members.
- **SMTP:** `SMTP_HOST`, `SMTP_PORT`, and usually `SMTP_USER` / `SMTP_PASSWORD`,
  plus `EMAIL_FROM` or `SMTP_FROM`.

`EMAIL_PROVIDER=auto` (default) prefers Resend when a key exists and otherwise
uses SMTP. Verification e-mails contain a 6-digit code that expires after 10
minutes; password reset e-mails contain a one-hour link.

`NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, and the public origin **must match**
exactly, otherwise verification and reset links point at the wrong host.

## 5. Upgrades and rollback

```bash
# Build new images without touching running containers
docker compose -f docker/compose.prod.yml --env-file .env.production build

# Apply migrations (one-shot, idempotent)
docker compose -f docker/compose.prod.yml --env-file .env.production run --rm migrate

# Recreate web + worker
docker compose -f docker/compose.prod.yml --env-file .env.production up -d web worker
```

- Migrations are forward-only. Take a backup before every deploy that includes a migration.
- To roll back application code, redeploy the previous image digest. Do **not**
  roll back a migration unless a tested down-migration exists; restore from the
  pre-deploy backup instead.
- Keep at least the last two image digests on the host.

## 6. Post-deploy smoke checklist

- [ ] `/api/health` returns `200` with `checks.database: "ok"`.
- [ ] Sign-in works and the session cookie is `Secure` behind TLS.
- [ ] Registration delivers a 6-digit verification code to a real inbox and the
      code activates the account.
- [ ] A client, invoice, task, and document can be created.
- [ ] A reminder sweep can be triggered by temporarily setting `REMINDER_CRON` to the next minute (or manually enqueue `notifications.reminder-sweep` in a staging copy); Mailpit/SMTP receives the reminder.
- [ ] Audit log at `/settings/audit` records the smoke-test actions.
- [ ] Worker logs show `jobs.worker_ready` with the expected cron and timezone.
