"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

import { findActiveNavItem, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type Orientation = "vertical" | "horizontal";

type NavAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  expanded?: boolean;
  controls?: string;
  onSelect: () => void;
};

type AppNavProps = {
  items: readonly NavItem[];
  orientation?: Orientation;
  /** Desktop rail mode: icons only, with accessible tooltips. */
  compact?: boolean;
  /** Force a slot to be active (used by the mobile "More" control). */
  activeKey?: string;
  action?: NavAction;
  className?: string;
  id?: string;
  onNavigate?: () => void;
};

type IndicatorGeometry = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function sameGeometry(a: IndicatorGeometry | null, b: IndicatorGeometry): boolean {
  if (!a) return false;
  return (
    Math.abs(a.top - b.top) < 0.25 &&
    Math.abs(a.left - b.left) < 0.25 &&
    Math.abs(a.width - b.width) < 0.25 &&
    Math.abs(a.height - b.height) < 0.25
  );
}

function itemClasses(orientation: Orientation, compact: boolean, active: boolean) {
  return cn(
    "group relative z-10 flex select-none flex-col items-center justify-center outline-none",
    "transition-[color,background-color] duration-200 ease-out-soft",
    "focus-visible:ring-2 focus-visible:ring-ring/40",
    orientation === "vertical"
      ? cn(
          "rounded-[1rem]",
          compact ? "mx-auto h-11 w-11" : "dock-item--vertical w-full px-1",
        )
      : "dock-item--horizontal min-w-0 flex-1 rounded-[1.15rem]",
    active
      ? "text-primary"
      : "text-muted-foreground hover:bg-[var(--dock-item-hover)] hover:text-foreground",
  );
}

function ItemContent({
  icon: Icon,
  label,
  active,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  compact: boolean;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center transition-transform duration-300 ease-out-soft group-active:scale-90",
          active ? "scale-[1.07]" : "group-hover:scale-[1.05]",
          active && "drop-shadow-[0_2px_6px_var(--dock-glow)]",
        )}
      >
        <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.15 : 1.9} />
      </span>

      {compact ? (
        <span aria-hidden="true" className="nav-tooltip">
          {label}
        </span>
      ) : (
        <span
          className={cn(
            "max-w-full truncate leading-none transition-[font-weight,opacity] duration-200",
            "mt-[3px] text-[10px] tracking-[0.01em] max-[380px]:text-[9px] max-[380px]:tracking-[-0.01em]",
            active ? "font-semibold opacity-100" : "font-medium opacity-90",
          )}
        >
          {label}
        </span>
      )}
    </>
  );
}

/**
 * The dock's navigation list. One shared indicator is measured against the
 * active slot and glides between items, so the highlight feels continuous
 * rather than being re-created on every route change.
 */
export function AppNav({
  items,
  orientation = "vertical",
  compact = false,
  activeKey,
  action,
  className,
  id,
  onNavigate,
}: AppNavProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const navRef = useRef<HTMLElement>(null);
  const slotRefs = useRef(new Map<string, HTMLElement>());
  const [indicator, setIndicator] = useState<IndicatorGeometry | null>(null);
  const [positioned, setPositioned] = useState(false);

  const resolvedActiveKey =
    activeKey ?? (action?.active ? action.key : findActiveNavItem(pathname)?.key);

  const registerRef = useCallback((key: string, node: HTMLElement | null) => {
    if (node) slotRefs.current.set(key, node);
    else slotRefs.current.delete(key);
  }, []);

  const measure = useCallback(() => {
    const nav = navRef.current;
    const node = resolvedActiveKey ? slotRefs.current.get(resolvedActiveKey) : undefined;

    if (!nav || !node) {
      setIndicator(null);
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const slotRect = node.getBoundingClientRect();
    const next = {
      top: slotRect.top - navRect.top,
      left: slotRect.left - navRect.left,
      width: slotRect.width,
      height: slotRect.height,
    };

    setIndicator((previous) => (sameGeometry(previous, next) ? previous : next));
  }, [resolvedActiveKey]);

  useEffect(() => {
    measure();
  }, [measure, compact, orientation]);

  useEffect(() => {
    if (!indicator || positioned) return;
    const frame = window.requestAnimationFrame(() => setPositioned(true));
    return () => window.cancelAnimationFrame(frame);
  }, [indicator, positioned]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(nav);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <nav
      id={id}
      ref={navRef}
      aria-label={t("mainLabel")}
      className={cn(
        "relative flex",
        orientation === "vertical" ? "flex-col gap-0.5" : "items-stretch gap-0.5",
        className,
      )}
    >
      {indicator ? (
        <span
          aria-hidden="true"
          className="dock-indicator"
          data-orientation={orientation}
          style={{
            width: `${indicator.width}px`,
            height: `${indicator.height}px`,
            opacity: positioned ? 1 : 0,
            transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
          }}
        >
          <span aria-hidden="true" className="dock-indicator__glint" />
        </span>
      ) : null}

      {items.map((item, index) => {
        const active = item.key === resolvedActiveKey;
        const Icon = item.icon;
        const label = t(item.key);
        const showDivider =
          orientation === "vertical" && index > 0 && item.group !== items[index - 1]?.group;

        return (
          <Fragment key={item.key}>
            {showDivider ? <span aria-hidden="true" className="dock-divider" /> : null}
            <Link
              href={item.href}
              ref={(node) => registerRef(item.key, node)}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              aria-label={compact ? label : undefined}
              className={itemClasses(orientation, compact, active)}
            >
              <ItemContent icon={Icon} label={label} active={active} compact={compact} />
            </Link>
          </Fragment>
        );
      })}

      {action ? (
        <button
          type="button"
          ref={(node) => registerRef(action.key, node)}
          onClick={action.onSelect}
          aria-current={action.active ? "page" : undefined}
          aria-expanded={action.expanded}
          aria-controls={action.controls}
          className={itemClasses(orientation, compact, Boolean(action.active))}
        >
          <ItemContent
            icon={action.icon}
            label={action.label}
            active={Boolean(action.active)}
            compact={compact}
          />
        </button>
      ) : null}
    </nav>
  );
}
