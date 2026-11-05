import { cn } from "@/lib/utils";

type ClientAvatarProps = {
  name: string;
  initials: string;
  className?: string;
};

/** Monogram avatar. Deterministic colour keeps the list calm and scannable. */
export function ClientAvatar({ name, initials, className }: ClientAvatarProps) {
  return (
    <span
      aria-hidden="true"
      title={name}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/50 bg-gradient-to-br from-primary/[0.16] to-[hsl(var(--chart-4)/0.12)] text-xs font-bold text-primary shadow-[0_1px_0_rgba(255,255,255,0.5)_inset] dark:border-white/[0.08]",
        className,
      )}
    >
      {initials}
    </span>
  );
}
