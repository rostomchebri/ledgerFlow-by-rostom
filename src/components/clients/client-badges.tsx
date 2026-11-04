"use client";

import { useTranslations } from "next-intl";
import type { Client } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

export function ClientStatusBadge({ status }: { status: Client["status"] }) {
  const t = useTranslations("clients.statuses");
  return <Badge variant={status === "ACTIVE" ? "success" : "muted"}>{t(status)}</Badge>;
}

export function ClientTypeBadge({ type }: { type: Client["type"] }) {
  const t = useTranslations("clients.types");
  return <Badge variant="outline">{t(type)}</Badge>;
}
