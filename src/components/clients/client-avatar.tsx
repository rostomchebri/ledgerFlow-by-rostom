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
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}
