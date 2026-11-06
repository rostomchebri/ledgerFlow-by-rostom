-- DOC-05 — keep the original upload filename so downloads preserve the exact
-- name and extension instead of the user-editable display name.
ALTER TABLE "documents" ADD COLUMN "originalFilename" TEXT;
