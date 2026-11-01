import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

const icons = {
  info: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
};

const styles = {
  info: "border-border bg-muted/50 text-foreground",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  destructive:
    "border-destructive/30 bg-destructive/5 text-destructive dark:bg-destructive/10",
};

export type AlertProps = React.ComponentProps<"div"> & {
  variant?: keyof typeof styles;
};

export function Alert({ className, variant = "info", children, ...props }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div
      role={variant === "destructive" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md border p-4 text-sm", styles[variant], className)}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
