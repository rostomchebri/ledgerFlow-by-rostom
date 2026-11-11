-- Composite indexes for the dashboard aggregates, register filters and
-- per-client history. Existing single-column indexes stay in place for
-- queries that only filter on `firmId` plus one dimension.

CREATE INDEX "transactions_firmId_type_occurredAt_idx"
  ON "transactions"("firmId", "type", "occurredAt");

CREATE INDEX "transactions_firmId_category_occurredAt_idx"
  ON "transactions"("firmId", "category", "occurredAt");

CREATE INDEX "transactions_firmId_clientId_occurredAt_idx"
  ON "transactions"("firmId", "clientId", "occurredAt");

CREATE INDEX "invoices_firmId_status_issueDate_idx"
  ON "invoices"("firmId", "status", "issueDate");

CREATE INDEX "invoices_firmId_clientId_issueDate_idx"
  ON "invoices"("firmId", "clientId", "issueDate");

CREATE INDEX "invoices_firmId_dueDate_idx"
  ON "invoices"("firmId", "dueDate");
