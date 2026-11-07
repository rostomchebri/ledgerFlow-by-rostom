"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
      : cn(
          "text-muted-foreground hover:text-foreground",
          // The moving glass capsule is the only hover surface on desktop. On
          // touch layouts, keep a pressed-state wash so taps still feel alive.
          orientation === "horizontal" && "active:bg-[var(--dock-item-hover)]",
        ),
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
 * The dock's navigation list. Two measured surfaces share the same geometry
 * model: the active surface rests on the current route, while the hover
 * surface follows the pointer between slots. Both are single elements, so the
 * highlight physically travels instead of being re-painted per item.
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
  const [activeIndicator, setActiveIndicator] = useState<IndicatorGeometry | null>(null);
  const [hoverIndicator, setHoverIndicator] = useState<IndicatorGeometry | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const resolvedActiveKey =
    activeKey ?? (action?.active ? action.key : findActiveNavItem(pathname)?.key);

  const registerRef = useCallback((key: string, node: HTMLElement | null) => {
    if (node) slotRefs.current.set(key, node);
    else slotRefs.current.delete(key);
  }, []);

  const measure = useCallback(() => {
    const nav = navRef.current;

    if (!nav) {
      setActiveIndicator(null);
      setHoverIndicator(null);
      return;
    }

    const navRect = nav.getBoundingClientRect();

    const geometryFor = (key: string | null | undefined): IndicatorGeometry | null => {
      const node = key ? slotRefs.current.get(key) : undefined;
      if (!node) return null;

      const slotRect = node.getBoundingClientRect();
      return {
        top: slotRect.top - navRect.top,
        left: slotRect.left - navRect.left,
        width: slotRect.width,
        height: slotRect.height,
      };
    };

    const nextActive = geometryFor(resolvedActiveKey);
    const nextHover = geometryFor(hoveredKey ?? resolvedActiveKey);

    setActiveIndicator((previous) => {
      if (!nextActive) return null;
      return sameGeometry(previous, nextActive) ? previous : nextActive;
    });
    setHoverIndicator((previous) => {
      if (!nextHover) return null;
      return sameGeometry(previous, nextHover) ? previous : nextHover;
    });
  }, [hoveredKey, resolvedActiveKey]);

  useEffect(() => {
    measure();
  }, [measure, compact, orientation]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(nav);
    return () => observer.disconnect();
  }, [measure]);

  /**
   * Pointer delegation keeps the effect to one listener per dock. Only true
   * mice drive the hover surface; touch and pen input keep the active state.
   */
  const handlePointerOver = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;

    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-dock-key]")
        : null;
    const key = target?.dataset.dockKey;

    if (key) setHoveredKey(key);
  }, []);

  const handlePointerLeave = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    setHoveredKey(null);
  }, []);

  return (
    <nav
      id={id}
      ref={navRef}
      aria-label={t("mainLabel")}
      onPointerOver={handlePointerOver}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative flex",
        orientation === "vertical" ? "flex-col gap-0.5" : "items-stretch gap-0.5",
        className,
      )}
    >
      {activeIndicator ? (
        <span
          aria-hidden="true"
          className="dock-indicator dock-indicator--active"
          data-orientation={orientation}
          data-hovering={hoveredKey ? "true" : undefined}
          style={{
            width: `${activeIndicator.width}px`,
            height: `${activeIndicator.height}px`,
            transform: `translate3d(${activeIndicator.left}px, ${activeIndicator.top}px, 0)`,
          }}
        >
          <span aria-hidden="true" className="dock-indicator__glint" />
        </span>
      ) : null}

      {hoverIndicator ? (
        <span
          aria-hidden="true"
          className="dock-indicator dock-indicator--hover"
          data-orientation={orientation}
          data-visible={hoveredKey ? "true" : "false"}
          style={{
            width: `${hoverIndicator.width}px`,
            height: `${hoverIndicator.height}px`,
            transform: `translate3d(${hoverIndicator.left}px, ${hoverIndicator.top}px, 0)`,
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
              data-dock-key={item.key}
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
          data-dock-key={action.key}
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
