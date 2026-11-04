# LedgerFlow _(working name)_ — Accounting Productivity Web App

A web application for accountants and small accounting firms to manage **clients, documents, invoices, tasks and deadlines** in one auditable, multi-user workspace. Initial market: **Algeria**; architecture prepared for other countries.

> **Status: implementation in progress.** Foundation, authentication, firm workspace/RBAC/invitations, client management, the storage abstraction and the background-job infrastructure are implemented. Documents, invoices, tasks, notifications and reports are next.

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

Prerequisites: Node.js 24 (see `.nvmrc`), pnpm 11, Docker.

```bash
pnpm install
cp .env.example .env
docker compose -f docker/compose.dev.yml up -d   # Postgres, MinIO, Mailpit
pnpm db:migrate                                  # apply Prisma migrations
pnpm db:seed                                     # optional demo account
pnpm dev                                         # http://localhost:3000
pnpm jobs:worker                                 # separate terminal: background jobs
pnpm test                                        # unit tests
```

Mailpit UI: http://localhost:8025 · MinIO console: http://localhost:9001

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
- **AUTH-02 — verification and password reset:** one-hour single-use links. Reset
  tokens are invalidated after use and every existing session is revoked when the
  password changes.
- **AUTH-03 — sessions and route protection:** `/dashboard`, `/clients`, `/settings`,
  `/onboarding` and `/invitations` require a session. `/login`, `/register` and
  `/forgot-password` are guest-only. Middleware performs an optimistic cookie check;
  server layouts and API handlers validate the session with Better Auth
  (`requireSession`, `requireApiSession`).
- **AUTH-04 — rate limiting:** database-backed limits survive restarts and apply to
  sign-in, sign-up, verification and password-reset endpoints. Policy values live in
  `src/lib/rate-limit-policy.ts`.

### Local e-mail

With `docker compose -f docker/compose.dev.yml up -d`, Mailpit captures every
verification and reset e-mail at <http://localhost:8025>. If `SMTP_HOST` is unset,
development builds log the message and link to the terminal instead.

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
so verification and reset links point to the right host.

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

## Documents and background jobs (DOC-01, NOTIF-02)

- **DOC-01 — storage abstraction:** `src/lib/storage` defines a `StorageAdapter`
  with an S3-compatible implementation (AWS S3, MinIO, R2) and an in-memory one for
  tests. Object keys are generated and sanitised in `keys.ts` — user paths are never
  used directly. Storage is configured with the `S3_*` variables and stays optional
  until document features (DOC-03/05) use it.
- **NOTIF-02 — pg-boss:** the web process only enqueues jobs
  (`src/lib/jobs/boss.ts`); a separate worker process (`pnpm jobs:worker`) owns
  supervision, scheduling and execution. Queues isolate their tables in the
  `JOBS_SCHEMA` schema (default `pgboss`). The e-mail reminder handler arrives with
  NOTIF-03.

## Scripts

| Command                        | Purpose                  |
| ------------------------------ | ------------------------ |
| `pnpm dev`                     | Start dev server         |
| `pnpm build` / `pnpm start`    | Production build / serve |
| `pnpm lint` / `pnpm typecheck` | Static checks            |
| `pnpm test`                    | Vitest unit tests        |
| `pnpm test:e2e`                | Playwright end-to-end    |
| `pnpm db:generate`             | Regenerate Prisma client |
| `pnpm db:migrate`              | Prisma migrate (dev)     |
| `pnpm db:seed`                 | Seed the demo account    |
| `pnpm db:studio`               | Prisma Studio            |
| `pnpm jobs:worker`             | Run the pg-boss worker   |

## Task tracking

52 tasks across 11 epics (SETUP, AUTH, FIRM, CLIENT, AUDIT, DOC, INV, TASK, NOTIF, REPORT, OPS). See [docs/tasks/README.md](docs/tasks/README.md).

## License

To be decided.
