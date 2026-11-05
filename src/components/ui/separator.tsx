import * as React from "react";

import { cn } from "@/lib/utils";

export function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      className={cn(
        "h-px w-full bg-gradient-to-r from-transparent via-[hsl(var(--border)/0.8)] to-transparent",
        className,
      )}
      {...props}
    />
  );
}
