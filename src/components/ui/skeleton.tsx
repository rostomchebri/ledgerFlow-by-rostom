import * as React from "react";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-muted/60 via-[hsl(var(--card)/0.65)] to-muted/60 bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}
