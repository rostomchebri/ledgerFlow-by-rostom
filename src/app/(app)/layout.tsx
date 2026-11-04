import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/shell/app-shell";
import { requireFirmContext } from "@/lib/firm-context";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const { firmName, role } = await requireFirmContext();
  const tRoles = await getTranslations("roles");

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      initials={initials}
      firmName={firmName}
      roleLabel={tRoles(role)}
    >
      {children}
    </AppShell>
  );
}
