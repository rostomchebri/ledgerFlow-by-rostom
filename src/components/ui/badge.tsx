import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 tracking-[0.01em] backdrop-blur-md transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary",
        secondary: "border-white/30 bg-secondary/70 text-secondary-foreground",
        outline:
          "border-[hsl(var(--border)/0.85)] bg-[hsl(var(--card)/0.45)] text-foreground dark:bg-white/[0.035]",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        success:
          "border-emerald-600/15 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-300",
        warning:
          "border-amber-600/15 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:text-amber-300",
        muted: "border-transparent bg-muted/70 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
