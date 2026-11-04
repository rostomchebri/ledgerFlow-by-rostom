import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRoundX } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ClientNotFound() {
  const t = await getTranslations("clients.detail");

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <EmptyState
        icon={UserRoundX}
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
        action={
          <Link href="/clients" className={buttonVariants({ variant: "outline" })}>
            {t("backToClients")}
          </Link>
        }
      />
    </div>
  );
}
