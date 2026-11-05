import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-3xl shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_30px_80px_-40px_rgba(15,23,42,0.5)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-16 -top-24 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
      />
      <CardHeader className="space-y-5 p-7 pb-0 sm:p-8 sm:pb-0">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-gradient-to-br from-primary via-primary to-[hsl(var(--chart-4))] text-primary-foreground shadow-[0_12px_28px_-12px_hsl(var(--primary)/0.9),inset_0_1px_0_rgba(255,255,255,0.35)]">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="space-y-1.5">
          <CardTitle className="text-[22px] font-bold tracking-[-0.025em]">{title}</CardTitle>
          <CardDescription className="leading-6">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-7 pt-6 sm:p-8 sm:pt-6">{children}</CardContent>
    </Card>
  );
}
