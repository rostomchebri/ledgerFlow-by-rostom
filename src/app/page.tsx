export default function HomePage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-6 py-16 text-center">
      <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        SETUP-01 · scaffold
      </span>

      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">LedgerFlow</h1>

      <p className="max-w-xl text-balance text-muted-foreground">
        Accounting productivity workspace for accountants and small firms — clients, documents,
        invoices and deadlines in one auditable place.
      </p>

      <p className="max-w-xl text-sm text-muted-foreground">
        الهيكل الأساسي جاهز. الخطوة التالية: <code className="font-mono">SETUP-02</code> (بيئة
        التطوير) ثم <code className="font-mono">SETUP-03</code> (Prisma + env).
      </p>
    </main>
  );
}
