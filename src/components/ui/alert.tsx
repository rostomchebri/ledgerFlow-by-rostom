import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

const icons = {
  info: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
};

const styles = {
  info: "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.5)] text-foreground",
  success:
    "border-emerald-600/15 bg-emerald-500/[0.08] text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08] dark:text-emerald-200",
  destructive:
    "border-destructive/25 bg-destructive/[0.07] text-destructive dark:bg-destructive/10",
};

export type AlertProps = React.ComponentProps<"div"> & {
  variant?: keyof typeof styles;
};

export function Alert({ className, variant = "info", children, ...props }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] backdrop-blur-xl",
        styles[variant],
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
