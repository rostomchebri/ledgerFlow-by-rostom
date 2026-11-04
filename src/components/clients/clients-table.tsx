import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Client } from "@prisma/client";

import { ClientAvatar } from "@/components/clients/client-avatar";
import { ClientStatusBadge, ClientTypeBadge } from "@/components/clients/client-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  clientInitials,
  clientReference,
  formatClientAddress,
  formatDate,
} from "@/lib/clients/format";
import { clientDetailRoute } from "@/lib/client-routes";

type ClientsTableProps = {
  clients: Client[];
  locale: string;
};

export async function ClientsTable({ clients, locale }: ClientsTableProps) {
  const t = await getTranslations("clients");

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="ps-4">{t("table.client")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("table.type")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("table.contact")}</TableHead>
            <TableHead className="hidden xl:table-cell">{t("table.location")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("table.status")}</TableHead>
            <TableHead className="hidden xl:table-cell">{t("table.updated")}</TableHead>
            <TableHead className="w-10 pe-4">
              <span className="sr-only">{t("table.open")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const href = clientDetailRoute(client.id);
            const location = formatClientAddress(client);

            return (
              <TableRow key={client.id} className="group">
                <TableCell className="ps-4">
                  <div className="flex items-center gap-3">
                    <ClientAvatar name={client.name} initials={clientInitials(client.name)} />
                    <div className="min-w-0">
                      <Link
                        href={href}
                        className="block truncate font-medium underline-offset-4 hover:underline"
                      >
                        {client.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {client.taxId
                          ? t("table.taxId", { taxId: client.taxId })
                          : clientReference(client.id, client.reference)}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <ClientTypeBadge type={client.type} />
                </TableCell>

                <TableCell className="hidden max-w-56 lg:table-cell">
                  <p className="truncate">{client.email ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{client.phone ?? ""}</p>
                </TableCell>

                <TableCell className="hidden max-w-48 truncate text-muted-foreground xl:table-cell">
                  {location || "—"}
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <ClientStatusBadge status={client.status} />
                </TableCell>

                <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                  {formatDate(client.updatedAt, locale)}
                </TableCell>

                <TableCell className="pe-4">
                  <Link
                    href={href}
                    aria-label={t("table.openClient", { name: client.name })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
