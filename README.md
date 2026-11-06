# LedgerFlow _(working name)_ — Accounting Productivity Web App

A web application for accountants and small accounting firms to manage **clients, documents, invoices, tasks and deadlines** in one auditable, multi-user workspace. Initial market: **Algeria**; architecture prepared for other countries.

> **Status: MVP implemented.** Authentication, firm workspace/RBAC/invitations, clients, documents, invoices, transactions, tasks and reminders, notifications, reports, the audit trail, background jobs, and the production deployment tooling are in place. Remaining work is tracked in [docs/tasks/README.md](docs/tasks/README.md).

## What the MVP does

Firm workspace with roles · client management · document library · invoice/receipt entry with validation and duplicate detection · tasks, templates and reminders · dashboard · Excel/CSV export · audit log. OCR, AI, bank reconciliation and client portal come later.

> ⚠️ **Legal notice:** No Algerian tax rate, deadline, or legal rule has been verified or hard-coded. The product will not provide tax or legal advice.

## Stack

Next.js + TypeScript · Tailwind + shadcn/ui · PostgreSQL + Prisma · Better Auth · S3-compatible storage · pg-boss jobs · Vitest + Playwright · Docker on a VPS.

## Repository layout

```
src/
  app/          Next.js App Router (routes + route handlers)
  components/   UI components (ui/ = shadcn primitives)
  lib/          db, auth, storage, jobs, rbac, audit, utils
  i18n/         FR / AR / EN messages + RTL helpers
prisma/         schema + migrations
docker/         compose.dev.yml (Postgres, MinIO, Mailpit)
tests/          unit (Vitest) + e2e (Playwright)
docs/           product & technical documentation
```

## Local setup

Prerequisites: Node.js 24 (see `.nvmrc`), pnpm 12 (pinned in `package.json`), Docker.

```bash
pnpm install
cp .env.example .env
docker compose -f docker/compose.dev.yml up -d   # Postgres, MinIO, Mailpit
pnpm db:migrate                                  # apply Prisma migrations
pnpm db:seed                                     # optional demo account
pnpm dev                                         # http://localhost:3000
pnpm jobs:worker                                 # separate terminal: background jobs
pnpm test                                        # unit tests
pnpm test:e2e                                    # Playwright (needs a seeded DB)
```

Mailpit UI: http://localhost:8025 · MinIO console: http://localhost:9001

## Neon (hosted Postgres)

The project is linked to a Neon project through `neon.ts` (`.neon` is
git-ignored). `neon deploy` provisions the services declared in `neon.ts` and
pulls the branch environment into `.env`; it writes both `DATABASE_URL` (pooled,
used by the app) and `DATABASE_URL_UNPOOLED` (direct, used by Prisma migrations
and the jobs worker). Apply migrations with:

```bash
neon deploy
pnpm db:deploy        # uses DATABASE_URL_UNPOOLED via prisma directUrl
pnpm db:seed          # optional demo account
```

For a feature branch, run `neon checkout <branch> --create` before starting the
app so the branch's pooled/direct URLs replace the ones in `.env`. When the CLI
is not installed globally, use `npx neon@latest <command>`.

## Internationalization (FR / AR / EN)

- Locale is stored in the `NEXT_LOCALE` cookie (no URL prefix), resolved in `src/i18n/request.ts`.
- Message catalogs live in `messages/<locale>.json`; all three files must keep identical keys
  (enforced by `tests/unit/i18n.test.ts`).
- Arabic switches the document to `dir="rtl"`; use logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`)
  and `rtl:-scale-x-100` for directional icons.
- Use `useTranslations()` in client components and `getTranslations()` in server components.
  The language switcher (`src/components/i18n/locale-switcher.tsx`) updates the cookie and refreshes.
- Design tokens are CSS variables in `src/app/globals.css`, mapped in `tailwind.config.ts`.

## Authentication (AUTH-01 → AUTH-04)

Authentication is handled by [Better Auth](https://www.better-auth.com/) with the Prisma adapter.

- **AUTH-01 — registration and sign-in:** email + password, with a 12–128 character
  policy (letter + number, small deny-list). E-mail verification is required before
  the first sign-in.
- **AUTH-02 — verification and password reset:** e-mail verification uses a
  10-minute, single-use 6-digit code (stored hashed). Password reset uses one-hour
  single-use links; reset tokens are invalidated after use and every existing
  session is revoked when the password changes.
- **AUTH-03 — sessions and route protection:** `/dashboard`, `/clients`, `/settings`,
  `/onboarding` and `/invitations` require a session. `/login`, `/register` and
  `/forgot-password` are guest-only. Middleware performs an optimistic cookie check;
  server layouts and API handlers validate the session with Better Auth
  (`requireSession`, `requireApiSession`).
- **AUTH-04 — rate limiting:** database-backed limits survive restarts and apply to
  sign-in, sign-up, verification and password-reset endpoints. Policy values live in
  `src/lib/rate-limit-policy.ts`.

### E-mail delivery

`EMAIL_PROVIDER=auto` (the default) uses **Resend** when `RESEND_API_KEY` is set,
otherwise **SMTP**. For Resend, verify the sender/domain in the Resend dashboard
and set `EMAIL_FROM` to that address. Resend's `onboarding@resend.dev` test sender
only delivers to the Resend account owner's address; verify a domain before
sending to other recipients. For SMTP, set `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` (or `SMTP_FROM`).

With `docker compose -f docker/compose.dev.yml up -d`, Mailpit captures every
verification code and reset e-mail at <http://localhost:8025>. If neither Resend
nor SMTP is configured, development builds print the message (including the
6-digit code) to the terminal instead.

### Demo account

`pnpm db:seed` creates a verified local account and the demo firm/clients:

| Email                   | Password            |
| ----------------------- | ------------------- |
| `demo@ledgerflow.local` | `LedgerFlowDemo123` |

Override these with `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` before seeding. The
seed is for local development only — never run it against a shared database with
the default password.

### Required environment

Generate a secret with `openssl rand -base64 32` and set `BETTER_AUTH_SECRET` in
production. `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must match the public origin
so verification and reset e-mails point to the right host. Configure either
`RESEND_API_KEY` + `EMAIL_FROM` or the `SMTP_*` settings for real delivery.

## Firm workspace, roles and team (FIRM-01 → FIRM-05)

- **FIRM-01 — onboarding:** a signed-in user without a membership is sent to
  `/onboarding` to create a firm. Creating it also creates an `OWNER` membership in
  the same transaction. `getFirmContext()` / `requireFirmContext()` resolve the tenant
  from the session and the `FirmMember` table; the firm id is never read from request
  input.
- **FIRM-02 — roles and permissions:** `src/lib/rbac.ts` is a pure permission matrix
  (`OWNER`, `ADMIN`, `ACCOUNTANT`, `VIEWER`). API routes enforce permissions with
  `assertPermission()`; the UI hides controls the role cannot use.
- **FIRM-03 — invitations:** owners/admins invite a teammate by e-mail. The invitation
  is an opaque random token, valid for 7 days. Accepting requires the signed-in
  e-mail to match the invited address. Ownership cannot be granted by invitation.
- **FIRM-05 — tenant isolation:** every firm-scoped row carries `firmId` and is
  queried with the tenant resolved from the session. `src/lib/tenancy.ts` provides
  the shared guards; cross-tenant access is indistinguishable from a missing row.
- **Team page:** `/settings/team` lists members, pending invitations and the invite
  form (visible only to roles with `member.invite`).

## Client management (CLIENT-01 → CLIENT-05)

`/clients` provides a searchable, filterable and paginated list plus create, edit and
detail pages. `DELETE /api/clients/:id` archives a client (soft delete) and
`POST /api/clients/:id/restore` restores it. Archived clients stay out of the default
list but keep all their data; the detail page exposes archive/restore actions to
roles with `client.archive`.

## Documents (DOC-01 → DOC-08)

- **Storage abstraction (DOC-01):** `src/lib/storage` defines a `StorageAdapter`
  with an S3-compatible implementation (AWS S3, MinIO, R2) and an in-memory one
  for tests. Object keys are generated and sanitised in `keys.ts` — user paths
  are never used directly.
- **Upload and library (DOC-03/04):** `/documents` lists, filters and searches
  uploaded files; `/documents/new` uploads with a 25 MB cap, an accounting MIME
  allow-list, an optional client, category and tags.
- **Access (DOC-05/06):** downloads are proxied through a tenant-scoped route;
  delete is a soft delete (`deletedAt`) with a restore endpoint, and the bucket
  stays private.

## Invoices and transactions (INV-01 → INV-05, FIN-01)

- **Invoices:** `/invoices` is the register with search, status filters and
  summary totals; `/invoices/new` and `/invoices/:id/edit` manage an invoice and
  its line items. Status transitions are enforced server-side
  (`DRAFT → SENT → PAID/OVERDUE`) and can also be applied in bulk.
- **Transactions:** `/transactions` records income and expenses with category,
  client, status and date filters, and supports create/edit/delete.
- **CSV export:** `/api/reports/invoices/export`, `/api/reports/transactions/export`,
  `/api/reports/tasks/export` and `/api/reports/clients/export` stream
  tenant-scoped CSV files.

## Tasks, templates and reminders (TASK-01 → TASK-05, NOTIF-03)

- **Tasks:** list, board and calendar views at `/tasks`, plus create, detail,
  comments and checklist items. Templates at `/tasks/templates` create a task in
  one click.
- **Reminders (NOTIF-03):** the worker schedules a configurable sweep
  (`REMINDER_CRON`, `REMINDER_TIMEZONE`). Due/overdue tasks create an idempotent
  in-app notification and enqueue one e-mail per task; the handler re-checks the
  task before sending.

## Notifications, reports and audit (NOTIF-01, AUDIT-01, REPORT-01)

- **Notification center:** `/notifications` and the top-bar bell read the
  tenant-scoped inbox; items can be opened and marked read.
- **Reports:** `/reports` is the finance overview; `/reports/invoices` is the
  invoice register.
- **Audit trail:** `/settings/audit` lists append-only audit entries for client,
  invoice, document, task, member and transaction actions. Audit writes are
  best-effort so a logging failure never rolls back the business action.

## Background jobs (NOTIF-02)

The web process only enqueues jobs (`src/lib/jobs/boss.ts`); a separate worker
process (`pnpm jobs:worker`) owns supervision, scheduling and execution. Queues
isolate their tables in the `JOBS_SCHEMA` schema (default `pgboss`). Production
runs the worker from the `worker` Docker target.

## End-to-end tests (OPS-04)

Playwright specs live in `tests/e2e`. They require a running PostgreSQL instance
with migrations applied and the demo data seeded:

```bash
pnpm db:deploy        # or pnpm db:migrate in development
pnpm db:seed          # creates the verified demo account used by auth.setup.ts
pnpm exec playwright install   # all local engines; CI installs chromium only
pnpm test:e2e
```

The config builds and starts a production server (`pnpm build && pnpm start`)
before running the suite, so route content is ready immediately and the tests
exercise the same server used in production. `auth.setup.ts` signs in once and
stores the session in `tests/e2e/.auth/user.json` (git-ignored); browser projects
reuse it. Specs set `NEXT_LOCALE=en` for stable selectors and create uniquely
named data on every run. CI uses Chromium only and provisions PostgreSQL as a
service.

## Production deployment and operations (OPS-01 → OPS-05)

- [Deployment guide](docs/ops/DEPLOYMENT.md) — Docker targets (`runner`,
  `worker`, `migrator`), Compose topology, upgrades and rollback.
- [Backups and restore drill](docs/ops/BACKUPS.md) — `scripts/backup.sh`,
  `scripts/restore.sh`, retention and RTO/RPO targets.
- [Monitoring](docs/ops/MONITORING.md) — `/api/health`, structured log events,
  queue queries and alert thresholds.
- [Security and privacy](docs/ops/SECURITY_PRIVACY.md) — threat model, controls,
  data inventory and launch checklist.

Production secrets are generated with `openssl rand -base64 32`; the app refuses
to start with the development `BETTER_AUTH_SECRET`. TLS/HSTS terminate at the
reverse proxy, and PostgreSQL/MinIO must never be exposed publicly.

## Scripts

| Command                        | Purpose                           |
| ------------------------------ | --------------------------------- |
| `pnpm dev`                     | Start dev server                  |
| `pnpm build` / `pnpm start`    | Production build / serve          |
| `pnpm lint` / `pnpm typecheck` | Static checks                     |
| `pnpm test`                    | Vitest unit tests                 |
| `pnpm test:e2e`                | Playwright end-to-end (seeded DB) |
| `pnpm db:generate`             | Regenerate Prisma client          |
| `pnpm db:migrate`              | Prisma migrate (dev)              |
| `pnpm db:deploy`               | Apply migrations (prod)           |
| `pnpm db:seed`                 | Seed the demo account             |
| `pnpm db:studio`               | Prisma Studio                     |
| `pnpm jobs:worker`             | Run the pg-boss worker            |
| `./scripts/backup.sh`          | PostgreSQL backup                 |
| `./scripts/restore.sh`         | Restore drill (guarded)           |

## Task tracking

52 tasks across 11 epics (SETUP, AUTH, FIRM, CLIENT, AUDIT, DOC, INV, TASK, NOTIF, REPORT, OPS). See [docs/tasks/README.md](docs/tasks/README.md).

## License

To be decided.
