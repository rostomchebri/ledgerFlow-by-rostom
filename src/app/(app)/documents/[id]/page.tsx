import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Download } from "lucide-react";

import { DocumentArchiveButton } from "@/components/documents/document-archive-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/clients/format";
import { formatFileSize } from "@/lib/documents/format";
import { getDocument } from "@/lib/documents/service";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";

type DocumentDetailPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: DocumentDetailPageProps): Promise<Metadata> {
  const { firmId } = await requireFirmContext();
  const { id } = await params;
  const document = await getDocument(firmId, id);
  const t = await getTranslations("documents.detail");
  return { title: document?.name ?? t("fallbackTitle") };
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const t = await getTranslations("documents");
  const locale = await getLocale();
  const { firmId, role } = await requireFirmContext();
  const { id } = await params;
  const document = await getDocument(firmId, id);
  if (!document) notFound();

  const canWrite = can(role, "document.write");
  const src = `/api/documents/${document.id}/download`;
  const canPreview = document.mimeType.startsWith("image/") || document.mimeType === "application/pdf";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/documents" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
          {t("detail.back")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`${src}?download=1`}
            className={buttonVariants({ variant: "outline" })}
            download
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("download")}
          </a>
          {canWrite ? (
            <DocumentArchiveButton
              documentId={document.id}
              archived={Boolean(document.deletedAt)}
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{t(`categories.${document.category}`)}</Badge>
          {document.deletedAt ? <Badge variant="muted">{t("archived")}</Badge> : null}
        </div>
        <h1 className="text-gradient text-[28px] font-bold tracking-[-0.035em]">{document.name}</h1>
        {document.description ? (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{document.description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">{t("detail.previewTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {document.deletedAt ? (
              <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                {t("detail.archivedBody")}
              </p>
            ) : canPreview ? (
              document.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={document.name}
                  className="mx-auto max-h-[32rem] w-auto rounded-xl border object-contain"
                />
              ) : (
                <iframe
                  src={src}
                  title={document.name}
                  className="h-[32rem] w-full rounded-xl border"
                />
              )
            ) : (
              <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                {t("detail.noPreview")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{t("detail.infoTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{t("detail.category")}</dt>
                <dd className="font-medium">{t(`categories.${document.category}`)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{t("detail.client")}</dt>
                <dd className="max-w-36 truncate font-medium">{document.client?.name ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{t("detail.size")}</dt>
                <dd className="font-medium">{formatFileSize(document.size, locale)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{t("detail.uploadedBy")}</dt>
                <dd className="max-w-36 truncate font-medium">
                  {document.uploadedBy?.name ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{t("detail.uploadedAt")}</dt>
                <dd className="font-medium">{formatDate(document.createdAt, locale)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{t("detail.type")}</dt>
                <dd className="max-w-36 truncate font-medium">{document.mimeType}</dd>
              </div>
            </dl>

            {document.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[hsl(var(--border)/0.5)] pt-4">
                {document.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
