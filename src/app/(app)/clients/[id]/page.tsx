import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Building2, FileText, Pencil, Receipt, UserRound } from "lucide-react";

import { ClientAvatar } from "@/components/clients/client-avatar";
import { ClientArchiveButton } from "@/components/clients/client-archive-button";
import { ClientStatusBadge, ClientTypeBadge } from "@/components/clients/client-badges";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clientInitials,
  clientReference,
  formatClientAddress,
  formatDate,
} from "@/lib/clients/format";
import { getClient } from "@/lib/clients/service";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { clientEditRoute } from "@/lib/client-routes";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ClientDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { firmId } = await requireFirmContext();
  const client = await getClient(firmId, id);
  const t = await getTranslations("clients.meta");

  if (!client) return { title: t("notFoundTitle") };
  return {
    title: client.name,
    description: t("detailDescription", { name: client.name }),
  };
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">
        {children || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const { firmId, role } = await requireFirmContext();
  const client = await getClient(firmId, id);

  if (!client) notFound();

  const t = await getTranslations("clients.detail");
  const locale = await getLocale();
  const address = formatClientAddress(client);
  const isIndividual = client.type === "INDIVIDUAL";
  const canWrite = can(role, "client.write");
  const canArchive = can(role, "client.archive");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="space-y-3">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          {t("back")}
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <ClientAvatar
              name={client.name}
              initials={clientInitials(client.name)}
              className="h-12 w-12 text-sm"
            />
            <div className="min-w-0 space-y-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight">{client.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <ClientTypeBadge type={client.type} />
                <ClientStatusBadge status={client.status} />
                <span className="text-xs text-muted-foreground">
                  {clientReference(client.id, client.reference)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            {canWrite ? (
              <Link
                href={clientEditRoute(client.id)}
                className={buttonVariants({ variant: "outline", className: "self-start" })}
              >
                <Pencil className="h-4 w-4" />
                {t("edit")}
              </Link>
            ) : null}
            {canArchive ? (
              <ClientArchiveButton clientId={client.id} archived={client.status === "ARCHIVED"} />
            ) : null}
          </div>
        </div>
      </div>

      {client.status === "ARCHIVED" ? <Alert>{t("archived")}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isIndividual ? (
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                {isIndividual ? t("personalTitle") : t("companyTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2">
                <DetailItem label={t("contactPerson")}>{client.contactName}</DetailItem>
                <DetailItem label={t("email")}>
                  {client.email ? (
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={`mailto:${client.email}`}
                    >
                      {client.email}
                    </a>
                  ) : null}
                </DetailItem>
                <DetailItem label={t("phone")}>
                  {client.phone ? (
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={`tel:${client.phone}`}
                    >
                      {client.phone}
                    </a>
                  ) : null}
                </DetailItem>
                <DetailItem label={t("taxId")}>{client.taxId}</DetailItem>
                <DetailItem label={t("commercialRegister")}>{client.commercialRegister}</DetailItem>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("addressTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {address ? (
                <address className="text-sm not-italic leading-6">{address}</address>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noAddress")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("notesTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {client.notes ? (
                <p className="whitespace-pre-line text-sm leading-6">{client.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noNotes")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("recordTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <DetailItem label={t("reference")}>
                  {clientReference(client.id, client.reference)}
                </DetailItem>
                <DetailItem label={t("created")}>{formatDate(client.createdAt, locale)}</DetailItem>
                <DetailItem label={t("lastUpdated")}>
                  {formatDate(client.updatedAt, locale)}
                </DetailItem>
                <DetailItem label={t("internalId")}>
                  <span className="font-mono text-xs text-muted-foreground">{client.id}</span>
                </DetailItem>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("relatedTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("documentsSoon")}
              </p>
              <p className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                {t("invoicesSoon")}
              </p>
              <p className="text-xs">{t("relatedNote")}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
