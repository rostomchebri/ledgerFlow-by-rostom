"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Replays a short entrance animation whenever the route changes. The wrapper
 * is not remounted (so client state survives); only the CSS animation is
 * restarted. `prefers-reduced-motion` disables it in globals.css.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(pathname);

  useEffect(() => {
    const node = ref.current;
    if (!node || previous.current === pathname) return;

    previous.current = pathname;
    node.classList.remove("page-enter");
    // Force a reflow so the animation restarts for the new route.
    void node.offsetWidth;
    node.classList.add("page-enter");
  }, [pathname]);

  return (
    <div ref={ref} className="page-enter">
      {children}
    </div>
  );
}
