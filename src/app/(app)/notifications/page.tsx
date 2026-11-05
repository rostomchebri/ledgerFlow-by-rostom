import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { NotificationList } from "@/components/notifications/notification-list";
import { listNotifications } from "@/lib/notifications/service";
import { requireFirmContext } from "@/lib/firm-context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications.meta");
  return { title: t("title"), description: t("description") };
}

/** NOTIF-01 — full in-app notification center. */
export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  const { firmId, userId } = await requireFirmContext();
  const notifications = await listNotifications(firmId, userId, { limit: 100 });

  const items = notifications.map((notification) => ({
    ...notification,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
  }));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
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

      <NotificationList initialItems={items} />
    </div>
  );
}
