import { Badge } from "@/components/ui/badge";
import type { Client } from "@prisma/client";

import { clientStatusLabel, clientTypeLabel } from "@/lib/clients/format";

export function ClientStatusBadge({ status }: { status: Client["status"] }) {
  return (
    <Badge variant={status === "ACTIVE" ? "success" : "muted"}>{clientStatusLabel(status)}</Badge>
  );
}

export function ClientTypeBadge({ type }: { type: Client["type"] }) {
  return <Badge variant="outline">{clientTypeLabel(type)}</Badge>;
}
