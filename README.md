# LedgerFlow *(working name)* — Accounting Productivity Web App

A web application for accountants and small accounting firms to manage **clients, documents, invoices, tasks and deadlines** in one auditable, multi-user workspace. Initial market: **Algeria**; architecture prepared for other countries.

> **Status: planning complete — implementation in progress.** Phase 0 (`SETUP`) is underway. No production features yet.

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
pnpm prisma migrate dev
pnpm dev                                         # http://localhost:3000
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

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` / `pnpm typecheck` | Static checks |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright end-to-end |
| `pnpm db:migrate` | Prisma migrate (dev) |
| `pnpm db:studio` | Prisma Studio |

## Task tracking

52 tasks across 11 epics (SETUP, AUTH, FIRM, CLIENT, AUDIT, DOC, INV, TASK, NOTIF, REPORT, OPS). See [docs/tasks/README.md](docs/tasks/README.md).

## License

To be decided.
