# Security review and privacy readiness (OPS-05)

> This is an engineering checklist, not legal advice. Qualified Algerian
> counsel must validate the final privacy notice, lawful basis, retention
> periods, and cross-border transfer terms before launch. The application does
> not hard-code any tax, deadline, or legal rule.

## 1. Threat model (MVP)

| Asset | Threat | Mitigation |
| ----- | ------ | ---------- |
| Tenant data (clients, invoices, documents, tasks) | Cross-tenant access via IDOR or missing `firmId` filter | Every firm-scoped query derives `firmId` from the session (`requireFirmContext`/`requireApiFirmContext`), never from request input. `src/lib/tenancy.ts` + cross-tenant unit tests. |
| Credentials | Credential stuffing, brute force | Better Auth e-mail + password, 12–128 char policy, DB-backed rate limits (`AUTH_RATE_LIMIT_ENABLED`), verified e-mail before first sign-in. |
| Sessions | Session theft, fixation | HttpOnly/Secure cookies via Better Auth, configurable lifetime (`AUTH_SESSION_EXPIRES_IN_DAYS`), sessions revoked on password change. |
| Object storage | Malicious upload, path traversal, public bucket | Allow-list of accounting MIME types, 25 MB cap, generated object keys (user paths never used), tenant-scoped download route, bucket must be private. |
| Documents at rest | Unauthorised read if bucket leaks | Private bucket + short-lived signed URLs or app-proxied downloads; encryption at rest at the provider/MinIO volume; off-host backups encrypted. |
| Privilege abuse | Member escalates role or removes owners | RBAC matrix (`src/lib/rbac.ts`); only owners/admins manage members; cannot assign a role equal/higher than own; owner removal blocked. |
| Audit tampering | Repudiation | Append-only `audit_logs`; application never updates/deletes entries. Database role separation recommended in production. |
| E-mail abuse | Spoofing, phishing links | Verified sender domain (SPF/DKIM/DMARC), links use `NEXT_PUBLIC_APP_URL`, tokens are random and single-use/expiring. |
| Jobs | Retry storms, duplicate reminders | pg-boss retry/backoff, singleton keys per task/day, bounded batches, separate worker process. |
| Secrets | Leak via git or logs | `.env*` git-ignored, `.env.example` only placeholders, production refuses dev `BETTER_AUTH_SECRET`, structured logs must not contain tokens/passwords. |
| Supply chain | Vulnerable dependency | `pnpm-lock.yaml` committed, CI `--frozen-lockfile`, `pnpm audit` in the release checklist, Dependabot/renovate recommended. |

## 2. Data inventory

| Category | Examples | Purpose | Storage | Retention (proposal) |
| -------- | -------- | ------- | ------- | -------------------- |
| Account | name, e-mail, password hash, sessions | Authentication | PostgreSQL | Life of account + 30 days |
| Firm membership | role, invitations | Authorisation | PostgreSQL | Life of firm + 30 days |
| Client records | name, contact, tax ID, address, notes | Accounting work | PostgreSQL | Life of firm; archive instead of delete |
| Invoices/transactions | amounts, line items, statuses | Accounting records | PostgreSQL | Per statutory accounting retention; **counsel to confirm** |
| Documents | files, metadata, tags | Document library | S3-compatible storage + PostgreSQL metadata | Per firm policy; archive + configurable purge |
| Tasks | titles, assignments, comments, checklists | Workflow | PostgreSQL | Life of firm |
| Notifications | task/invoice alerts | In-app inbox | PostgreSQL | 90 days (proposal) |
| Audit logs | actor, action, entity, metadata, IP, user agent | Security & accountability | PostgreSQL | 12 months minimum (proposal) |
| E-mail delivery | recipient, subject | Transactional e-mail | SMTP provider | Provider policy |

Minimise: do not add national ID numbers, bank statements, or payroll data
without a documented need and updated retention. Document uploads can contain
personal data — treat the bucket as sensitive.

## 3. Controls checklist

### Authentication and sessions

- [x] E-mail verification before first sign-in; one-hour single-use reset tokens.
- [x] Password policy + deny-list; sessions revoked after password change.
- [x] DB-backed rate limiting on sign-in, sign-up, verification, reset.
- [x] Optimistic middleware check + server-side session validation.
- [ ] Enforce MFA for OWNER/ADMIN (post-MVP; document decision).
- [x] Production secret validation and unique `BETTER_AUTH_SECRET`.

### Authorisation and tenancy

- [x] Central RBAC matrix with `assertPermission` on API routes and UI guards.
- [x] Tenant resolution from session only; cross-tenant unit harness.
- [x] Member role guards (no self-escalation, no owner removal).
- [x] Invitations bound to the invited e-mail and expiring.
- [ ] Periodic access review (quarterly) — operational process.

### Input, output, and files

- [x] Zod validation at every API boundary; strict schemas where practical.
- [x] Upload MIME allow-list, size limit, generated object keys.
- [x] React escaping by default; no `dangerouslySetInnerHTML` with user data.
- [x] Security headers in `next.config.ts`.
- [ ] Add a Content-Security-Policy once the final third-party script list is known (see §7).
- [ ] Malware scanning for uploads (recommended before scaling; optional for MVP).

### Data protection

- [x] Passwords hashed by Better Auth; no plaintext secret storage in app tables.
- [x] Audit logging is best-effort and append-only (never rolls back business actions).
- [x] Private storage configuration expected; document bucket policy in deployment.
- [ ] Encryption-at-rest verification for Postgres volume, MinIO volume, and off-host backups.
- [ ] Field-level encryption for tax identifiers if counsel requires it.
- [ ] Data export/erasure workflow for data-subject requests (see §5).

### Operations

- [x] `/api/health`, structured logs, queue inspection queries.
- [x] Backups + quarterly restore drill documented.
- [ ] Off-host encrypted backup verified in production.
- [ ] Error tracker configured with PII redaction.
- [ ] Dependency audit and image scanning in the release checklist.
- [ ] Least-privilege database roles (app role cannot `TRUNCATE`/alter audit tables).
- [ ] Reverse-proxy TLS + HSTS; firewall denies 5432/9000/9001 from the internet.

## 4. Privacy principles

- **Lawful basis and notice:** publish a privacy notice covering controller
  identity, purposes, categories, recipients (hosting, e-mail, backups),
  retention, and rights. Counsel must confirm the applicable basis under
  Algerian Law 18-07 and any sector rules.
- **Purpose limitation:** client and document data is used only to deliver the
  accounting workspace; no secondary marketing use.
- **Data minimisation:** collect only what the firm needs; free-form legal
  identifiers are optional and not validated against legal rules.
- **Accuracy:** firms can edit client records; archived records remain available
  for correction.
- **Storage limitation:** retention values in §2 are proposals; make them
  configurable and document the final decision.
- **Integrity and confidentiality:** tenant isolation, RBAC, private storage,
  encrypted backups, audit trail.
- **Accountability:** this document, the audit log, and the restore/monitoring
  runbooks are the evidence trail.

## 5. Data-subject requests (operational procedure)

1. Verify the requester's identity and authority (firm owner/admin or the data
   subject themselves).
2. **Access/portability:** export firm-scoped data via the CSV exports and, if
   needed, a documented database export. Never include another tenant's rows.
3. **Rectification:** correct records in the UI; audit entries are immutable
   records of the change and should not be edited.
4. **Erasure:** distinguish statutory accounting retention from deletable data.
   Delete or anonymise what can be deleted, archive the rest, and record the
   decision. Counsel defines what must be retained.
5. **Response window:** track the request in the incident/request log and meet
   the statutory deadline set by counsel.
6. Never send documents or personal data to an unverified recipient.

## 6. Vendor and transfer register

| Vendor | Data | Location | Safeguards |
| ------ | ---- | -------- | ---------- |
| VPS/hosting provider | All application data | Choose region; document | Contract, firewall, encrypted disk, backups |
| S3-compatible storage | Documents | Choose region; document | Private bucket, encryption, versioning |
| SMTP provider | E-mail addresses, message content | Provider region | DPA, TLS, SPF/DKIM/DMARC |
| Error tracker (if added) | Logs/errors, redacted | Provider region | DPA, PII redaction, sampling |

Update this register before onboarding any new processor. Cross-border transfers
require counsel review and appropriate safeguards.

## 7. Open items before public launch

- [ ] Finalise privacy notice and terms; legal review of retention and transfers.
- [ ] Add CSP after confirming fonts/scripts. Current build uses self-hosted
      fonts and no third-party runtime scripts, so a strict `default-src 'self'`
      policy is feasible; validate inline styles required by Next/Tailwind.
- [ ] Penetration test or at least an external review of auth, uploads, and
      tenant isolation.
- [ ] Configure log retention and PII redaction at the log sink.
- [ ] Confirm database least-privilege roles and that the app role cannot alter
      `audit_logs`.
- [ ] Verify backup restore and object-storage restore in production.
- [ ] Add malware scanning decision for uploads.
- [ ] Confirm e-mail domain authentication (SPF, DKIM, DMARC).
- [ ] Define an incident-response contact and 72-hour breach assessment process.

## 8. Release security checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- [ ] `pnpm audit --prod` reviewed; no unpatched critical/high findings.
- [ ] `.env.production` not committed; secrets rotated after any exposure.
- [ ] Database and storage ports not publicly reachable.
- [ ] TLS certificate valid; HSTS enabled at the proxy.
- [ ] Backup age < 26 h and a restore drill is on record.
- [ ] Audit log writes observed after deploy.
- [ ] Worker and reminder sweep logs observed after deploy.
