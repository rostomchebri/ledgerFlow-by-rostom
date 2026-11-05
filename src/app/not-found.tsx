import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Root not-found — rendered for any unmatched URL, without requiring a session
 * or firm context (the `(app)` layout is not applied here).
 */
export default async function RootNotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <EmptyState
        icon={SearchX}
        title={t("title")}
        description={t("description")}
        action={
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {t("back")}
          </Link>
        }
      />
    </div>
  );
}
