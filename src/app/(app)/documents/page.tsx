import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, FolderOpen, Plus, Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { DocumentArchiveButton } from "@/components/documents/document-archive-button";
import { DocumentFilters } from "@/components/documents/document-filters";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/clients/format";
import { formatFileSize } from "@/lib/documents/format";
import { parseDocumentListQuery, type DocumentListQuery } from "@/lib/documents/schema";
import { listDocuments } from "@/lib/documents/service";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("documents.meta");
  return { title: t("title"), description: t("description") };
}

type DocumentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildHref(query: DocumentListQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category !== "ALL") params.set("category", query.category);
  if (query.status !== "active") params.set("status", query.status);
  if (query.tag) params.set("tag", query.tag);
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/documents?${suffix}` : "/documents";
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const t = await getTranslations("documents");
  const locale = await getLocale();
  const { firmId, role } = await requireFirmContext();
  const query = parseDocumentListQuery(await searchParams);
  const result = await listDocuments(firmId, query);
  const canWrite = can(role, "document.write");

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/90">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            />
            {t("eyebrow")}
          </p>
          <h1 className="text-gradient text-[30px] font-bold leading-tight tracking-[-0.04em] sm:text-[34px]">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("description")}</p>
        </div>
        {canWrite ? (
          <Link href="/documents/new" className={buttonVariants({ variant: "default" })}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            {t("uploadButton")}
          </Link>
        ) : null}
      </div>

      <DocumentFilters query={query} />

      {result.tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t("tagsLabel")}:</span>
          {result.tags.slice(0, 16).map((tag) => (
            <Link
              key={tag}
              href={`/documents?tag=${encodeURIComponent(tag)}`}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                query.tag === tag
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.45)] text-muted-foreground hover:text-foreground",
              )}
            >
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}

      {result.items.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("table.emptyTitle")}
          description={t("table.emptyBody")}
          action={
            canWrite ? (
              <Link href="/documents/new" className={buttonVariants({ variant: "default" })}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t("uploadButton")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.32)] text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-5 py-3 text-start font-medium">{t("table.name")}</th>
                    <th className="hidden px-3 py-3 text-start font-medium md:table-cell">
                      {t("table.category")}
                    </th>
                    <th className="hidden px-3 py-3 text-start font-medium lg:table-cell">
                      {t("table.client")}
                    </th>
                    <th className="hidden px-3 py-3 text-start font-medium sm:table-cell">
                      {t("table.size")}
                    </th>
                    <th className="hidden px-3 py-3 text-start font-medium xl:table-cell">
                      {t("table.uploaded")}
                    </th>
                    <th className="px-5 py-3 text-end font-medium">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((document) => (
                    <tr
                      key={document.id}
                      className="border-b border-[hsl(var(--border)/0.5)] transition-colors last:border-0 hover:bg-[hsl(var(--card)/0.45)]"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/documents/${document.id}`}
                          className="flex items-center gap-2 font-medium hover:underline"
                        >
                          <FileText aria-hidden="true" className="h-4 w-4 text-primary" />
                          <span className="max-w-64 truncate">{document.name}</span>
                        </Link>
                        {document.deletedAt ? (
                          <Badge variant="muted" className="mt-1">
                            {t("archived")}
                          </Badge>
                        ) : null}
                      </td>
                      <td className="hidden px-3 py-3.5 md:table-cell">
                        <Badge variant="outline">{t(`categories.${document.category}`)}</Badge>
                      </td>
                      <td className="hidden max-w-40 truncate px-3 py-3.5 text-muted-foreground lg:table-cell">
                        {document.client?.name ?? "—"}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3.5 text-muted-foreground sm:table-cell">
                        {formatFileSize(document.size, locale)}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3.5 text-muted-foreground xl:table-cell">
                        {formatDate(document.createdAt, locale)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/api/documents/${document.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                            title={t("download")}
                          >
                            {document.deletedAt ? (
                              <FolderOpen aria-hidden="true" className="h-3.5 w-3.5" />
                            ) : (
                              <Download aria-hidden="true" className="h-3.5 w-3.5" />
                            )}
                            <span className="sr-only">{t("download")}</span>
                          </a>
                          {canWrite ? (
                            <DocumentArchiveButton
                              documentId={document.id}
                              archived={Boolean(document.deletedAt)}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("pagination.showing", {
                from: (result.page - 1) * result.pageSize + 1,
                to: Math.min(result.page * result.pageSize, result.total),
                total: result.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              {result.page > 1 ? (
                <Link
                  href={buildHref(query, result.page - 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("pagination.previous")}
                </Link>
              ) : null}
              <span className="px-2 text-xs text-muted-foreground">
                {result.page} / {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <Link
                  href={buildHref(query, result.page + 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("pagination.next")}
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
