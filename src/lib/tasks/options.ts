import "server-only";

import { db } from "@/lib/db";

/** Options shared by the task form, filters and detail page. */
export async function listTaskFormOptions(firmId: string) {
  const [clients, members] = await Promise.all([
    db.client.findMany({
      where: { firmId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.firmMember.findMany({
      where: { firmId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    clients,
    members: members.map((member) => member.user),
  };
}
