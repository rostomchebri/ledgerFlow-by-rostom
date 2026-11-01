# Task Index

Each task is a small unit that can be implemented, tested, and reviewed independently. Plan & ordering: [IMPLEMENTATION_PLAN](../IMPLEMENTATION_PLAN.md). Scope: [MVP_SCOPE](../MVP_SCOPE.md). Workflow: [DEVELOPMENT_WORKFLOW](../DEVELOPMENT_WORKFLOW.md).

## Conventions
- **ID format**: `EPIC-NN` (e.g. `INV-05`). IDs are permanent; never reuse. Numbers reflect creation order, **not** execution order — use the dependency lists and [IMPLEMENTATION_PLAN](../IMPLEMENTATION_PLAN.md).
- **File location**: `docs/tasks/<epic-folder>/<ID>-<slug>.md`, using the template in the project brief (Objective, User Story, Scope, Technical Notes, Dependencies, Acceptance Criteria, Testing, Definition of Done, Priority and Effort).
- **Priority**: P0 required for MVP · P1 important/MVP if time allows · P2 post-MVP (MVP+).
- **Effort**: XS ≈ ½ day · S ≈ 1 day · M ≈ 2–3 days · L ≈ 4–5 days (one developer incl. tests and review).
- **No duplication**: shared requirements live in docs (SECURITY, API_SPECIFICATION, DATABASE_SCHEMA) and tasks reference them rather than restate them.
- **One task = one PR.** If a task grows beyond its effort, split it and add new IDs.
- **Legal safety**: tasks must not introduce tax rates, deadlines, or legal rules; use configurable data and flag open questions ([OPEN_QUESTIONS](../OPEN_QUESTIONS.md)).
- Tick acceptance-criteria boxes in the PR description, not in these files (files stay as specifications).

## Epics

### SETUP — Foundation

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [SETUP-01](setup/SETUP-01-scaffold-repository-and-tooling.md) | Scaffold repository and tooling | P0 | S | — |
| [SETUP-02](setup/SETUP-02-local-development-environment-docker-compose.md) | Local development environment (Docker Compose) | P0 | S | SETUP-01 |
| [SETUP-03](setup/SETUP-03-prisma-setup-and-typed-environment-configuration.md) | Prisma setup and typed environment configuration | P0 | S | SETUP-02 |
| [SETUP-04](setup/SETUP-04-continuous-integration-pipeline.md) | Continuous integration pipeline | P0 | S | SETUP-01 |
| [SETUP-05](setup/SETUP-05-ui-shell-design-tokens-and-internationalization-fr.md) | UI shell, design tokens, and internationalization (FR/AR/EN, RTL) | P0 | M | SETUP-01 |
| [SETUP-06](setup/SETUP-06-api-conventions-error-model-and-logging.md) | API conventions, error model, and logging | P0 | M | SETUP-03 |

### AUTH — Authentication

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [AUTH-01](auth/AUTH-01-registration-and-login.md) | Registration and login | P0 | M | SETUP-03, SETUP-05, SETUP-06 |
| [AUTH-02](auth/AUTH-02-email-verification-and-password-reset.md) | Email verification and password reset | P0 | M | AUTH-01 |
| [AUTH-03](auth/AUTH-03-session-handling-and-route-protection.md) | Session handling and route protection | P0 | S | AUTH-01 |
| [AUTH-04](auth/AUTH-04-rate-limiting-and-abuse-protection.md) | Rate limiting and abuse protection | P1 | S | AUTH-01 |

### FIRM — Firm workspace and roles

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [FIRM-01](firm/FIRM-01-firm-workspace-creation-and-onboarding.md) | Firm workspace creation and onboarding | P0 | M | AUTH-03 |
| [FIRM-05](firm/FIRM-05-tenant-isolation-guard-and-cross-tenant-test-harne.md) | Tenant isolation guard and cross-tenant test harness | P0 | M | FIRM-01 |
| [FIRM-02](firm/FIRM-02-role-based-access-control-policy-module.md) | Role-based access control policy module | P0 | M | FIRM-05 |
| [FIRM-03](firm/FIRM-03-team-invitations.md) | Team invitations | P0 | M | FIRM-02, AUTH-02 |
| [FIRM-04](firm/FIRM-04-member-management.md) | Member management | P1 | S | FIRM-03 |

### CLIENT — Client management

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [CLIENT-01](client/CLIENT-01-client-model-and-crud-api.md) | Client model and CRUD API | P0 | M | FIRM-02, FIRM-05 |
| [CLIENT-02](client/CLIENT-02-client-list-page.md) | Client list page | P0 | M | CLIENT-01, SETUP-05 |
| [CLIENT-03](client/CLIENT-03-client-create-edit-form-and-detail-page.md) | Client create/edit form and detail page | P0 | M | CLIENT-01, CLIENT-02 |
| [CLIENT-04](client/CLIENT-04-client-assignment-to-team-members.md) | Client assignment to team members | P1 | S | CLIENT-01, FIRM-03 |
| [CLIENT-05](client/CLIENT-05-archive-and-restore-clients.md) | Archive and restore clients | P1 | XS | CLIENT-01 |

### AUDIT — Audit and history

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [AUDIT-01](audit/AUDIT-01-audit-log-service-and-schema.md) | Audit log service and schema | P0 | M | FIRM-05 |
| [AUDIT-02](audit/AUDIT-02-instrument-core-actions-with-audit-events.md) | Instrument core actions with audit events | P1 | S | AUDIT-01, CLIENT-01, FIRM-03 |
| [AUDIT-03](audit/AUDIT-03-audit-log-viewer.md) | Audit log viewer | P1 | M | AUDIT-01, SETUP-05 |

### DOC — Documents

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [DOC-01](doc/DOC-01-storage-abstraction-and-s3-compatible-adapter.md) | Storage abstraction and S3-compatible adapter | P0 | M | SETUP-02, SETUP-03 |
| [DOC-02](doc/DOC-02-document-metadata-categories-and-tags.md) | Document metadata, categories, and tags | P0 | M | CLIENT-01, FIRM-05 |
| [DOC-03](doc/DOC-03-secure-file-upload.md) | Secure file upload | P0 | L | DOC-01, DOC-02, AUDIT-01 |
| [DOC-04](doc/DOC-04-document-library-ui.md) | Document library UI | P0 | M | DOC-03, CLIENT-02 |
| [DOC-05](doc/DOC-05-secure-download-and-preview.md) | Secure download and preview | P0 | S | DOC-03 |
| [DOC-06](doc/DOC-06-soft-delete-and-restore-documents.md) | Soft delete and restore documents | P1 | S | DOC-02 |

### INV — Invoices and receipts

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [INV-01](inv/INV-01-invoice-model-and-crud-api.md) | Invoice model and CRUD API | P0 | L | DOC-02, CLIENT-01 |
| [INV-04](inv/INV-04-invoice-validation-rules.md) | Invoice validation rules | P0 | M | INV-01 |
| [INV-05](inv/INV-05-duplicate-invoice-detection.md) | Duplicate invoice detection | P0 | M | INV-01, DOC-03 |
| [INV-03](inv/INV-03-invoice-status-workflow.md) | Invoice status workflow | P0 | M | INV-01, INV-04 |
| [INV-02](inv/INV-02-invoice-entry-ui-with-document-viewer.md) | Invoice entry UI with document viewer | P0 | L | INV-01, DOC-05 |
| [INV-06](inv/INV-06-invoice-list-filters-and-bulk-actions.md) | Invoice list, filters, and bulk actions | P0 | M | INV-03, CLIENT-02 |

### TASK — Tasks and deadlines

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [TASK-01](task/TASK-01-task-model-and-crud-api.md) | Task model and CRUD API | P0 | M | CLIENT-01 |
| [TASK-02](task/TASK-02-task-list-and-board-ui.md) | Task list and board UI | P0 | M | TASK-01, SETUP-05 |
| [TASK-03](task/TASK-03-task-templates-and-recurrence.md) | Task templates and recurrence | P1 | L | TASK-01, NOTIF-02 |
| [TASK-05](task/TASK-05-deadline-calendar-view.md) | Deadline calendar view | P1 | M | TASK-02 |
| [TASK-04](task/TASK-04-task-comments-and-checklists.md) | Task comments and checklists | P2 | M | TASK-01 |

### NOTIF — Notifications

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [NOTIF-02](notif/NOTIF-02-background-job-infrastructure-pg-boss.md) | Background job infrastructure (pg-boss) | P0 | M | SETUP-03 |
| [NOTIF-01](notif/NOTIF-01-notification-model-and-in-app-notification-center.md) | Notification model and in-app notification center | P0 | M | FIRM-05, SETUP-05 |
| [NOTIF-03](notif/NOTIF-03-email-reminders-for-due-and-overdue-tasks.md) | Email reminders for due and overdue tasks | P0 | M | NOTIF-01, NOTIF-02, TASK-01, AUTH-02 |

### REPORT — Reports and exports

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [REPORT-01](report/REPORT-01-operational-dashboard.md) | Operational dashboard | P0 | M | TASK-01, INV-03, DOC-02 |
| [REPORT-02](report/REPORT-02-invoice-register-report.md) | Invoice register report | P1 | M | INV-06 |
| [REPORT-03](report/REPORT-03-excel-and-csv-export.md) | Excel and CSV export | P0 | M | INV-06, CLIENT-02, TASK-02 |
| [REPORT-04](report/REPORT-04-pdf-export-of-invoice-register.md) | PDF export of invoice register | P2 | M | REPORT-02 |

### OPS — Release and operations

| ID | Title | Priority | Effort | Depends on |
|----|-------|----------|--------|-----------|
| [OPS-04](ops/OPS-04-end-to-end-tests-for-critical-journeys.md) | End-to-end tests for critical journeys | P0 | L | INV-06, TASK-02, FIRM-03, NOTIF-03 |
| [OPS-01](ops/OPS-01-production-deployment.md) | Production deployment | P0 | L | SETUP-04, DOC-01, NOTIF-02 |
| [OPS-02](ops/OPS-02-backups-and-restore-drill.md) | Backups and restore drill | P0 | M | OPS-01 |
| [OPS-03](ops/OPS-03-monitoring-and-error-tracking.md) | Monitoring and error tracking | P1 | S | OPS-01 |
| [OPS-05](ops/OPS-05-security-review-and-privacy-readiness.md) | Security review and privacy readiness | P0 | M | OPS-01, FIRM-05, DOC-05, OPS-02 |

## Summary
- Total tasks: **52** (39 P0, 11 P1, 2 P2)
- Estimated MVP effort (P0+P1): **≈ 117 developer-days** (planning estimate; excludes meetings, design, legal waiting time, and uncertainty buffer of 25–40%).

## Epic prefix glossary
SETUP foundation · AUTH authentication · FIRM workspace & roles · CLIENT clients · AUDIT audit · DOC documents · INV invoices · TASK tasks & deadlines · NOTIF notifications · REPORT reports & exports · OPS release & operations.
