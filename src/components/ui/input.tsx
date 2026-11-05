import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "glass-field flex h-10 w-full rounded-xl px-3.5 py-1 text-sm text-foreground outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
