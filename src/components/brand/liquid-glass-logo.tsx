import Image from "next/image";
import type { CSSProperties } from "react";

import mark from "@/assets/brand/ledgerflow-mark.png";
import { cn } from "@/lib/utils";

type LiquidGlassLogoProps = {
  /** Rendered tile size in pixels. The mark scales with it. */
  size?: number;
  className?: string;
  /** Preload the asset; use it for the logo above the fold. */
  priority?: boolean;
  /** Accessible name. Omit when the logo is decorative (next to a wordmark). */
  label?: string;
};

/**
 * LedgerFlow brand mark presented as a piece of liquid glass: a translucent,
 * blurred pane with a soft aura, an inner rim highlight and a slow specular
 * sweep across the surface.
 */
export function LiquidGlassLogo({
  size = 40,
  className,
  priority = false,
  label,
}: LiquidGlassLogoProps) {
  return (
    <span
      className={cn("liquid-glass-logo", className)}
      style={{ "--logo-size": `${size}px` } as CSSProperties}
      aria-hidden={label ? undefined : true}
    >
      <span aria-hidden="true" className="liquid-glass-logo__aura" />
      <Image
        src={mark}
        alt={label ?? ""}
        priority={priority}
        sizes={`${size}px`}
        className="liquid-glass-logo__mark"
      />
      <span aria-hidden="true" className="liquid-glass-logo__sheen" />
      <span aria-hidden="true" className="liquid-glass-logo__rim" />
    </span>
  );
}
