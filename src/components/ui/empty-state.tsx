import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-soft flex flex-col items-center justify-center gap-4 rounded-2xl border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/50 bg-[hsl(var(--card)/0.55)] text-primary shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_12px_30px_-18px_rgba(15,23,42,0.4)] backdrop-blur-xl dark:border-white/[0.08]">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <div className="space-y-1.5">
        <p className="font-semibold tracking-[-0.01em]">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
