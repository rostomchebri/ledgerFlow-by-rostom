import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { getFirmContext } from "@/lib/firm-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { firmName } = getFirmContext();

  return (
    <div className="min-h-screen bg-muted/20 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-e bg-background lg:flex lg:min-h-screen lg:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            LF
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">LedgerFlow</p>
            <p className="text-xs text-muted-foreground">Accounting workspace</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <AppNav />
        </div>

        <div className="border-t p-4">
          <p className="truncate text-sm font-medium">{firmName}</p>
          <p className="text-xs text-muted-foreground">Demo workspace · no auth yet</p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-8">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                LF
              </span>
              <span className="text-sm font-semibold">LedgerFlow</span>
            </Link>

            <div className="ms-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">{firmName}</span>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
              >
                DM
              </span>
            </div>
          </div>
          <div className="border-t px-2 py-1.5 lg:hidden">
            <AppNav className="flex-row gap-1 overflow-x-auto [&_a]:whitespace-nowrap [&_span]:whitespace-nowrap" />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
