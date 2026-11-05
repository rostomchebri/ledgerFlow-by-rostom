import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[-0.01em] transition-all duration-200 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary/25 bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.8),inset_0_1px_0_rgba(255,255,255,0.28)] hover:-translate-y-px hover:shadow-[0_16px_34px_-14px_hsl(var(--primary)/0.85),inset_0_1px_0_rgba(255,255,255,0.32)]",
        destructive:
          "border border-destructive/25 bg-gradient-to-b from-destructive to-destructive/90 text-destructive-foreground shadow-[0_10px_24px_-12px_hsl(var(--destructive)/0.7),inset_0_1px_0_rgba(255,255,255,0.24)] hover:-translate-y-px hover:bg-destructive",
        outline:
          "border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.5)] text-foreground shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_8px_20px_-18px_rgba(15,23,42,0.4)] backdrop-blur-xl hover:-translate-y-px hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--card)/0.78)] dark:bg-white/[0.045] dark:hover:bg-white/[0.08]",
        secondary:
          "border border-white/40 bg-secondary/70 text-secondary-foreground shadow-sm backdrop-blur-xl hover:bg-secondary dark:border-white/[0.06]",
        ghost:
          "text-muted-foreground hover:bg-[hsl(var(--card)/0.5)] hover:text-foreground hover:backdrop-blur-xl dark:hover:bg-white/[0.06]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
