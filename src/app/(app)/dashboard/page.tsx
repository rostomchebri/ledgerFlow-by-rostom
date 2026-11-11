import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Banknote,
  CreditCard,
  PiggyBank,
  ReceiptText,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/clients/format";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercentChange,
} from "@/lib/finance/format";
import { parseDashboardRange, resolvePeriod } from "@/lib/finance/ranges";
import { getFinanceOverview } from "@/lib/finance/service";
import { requireFirmContext } from "@/lib/firm-context";
import { requireSession } from "@/lib/session";

const CATEGORY_COLORS: Record<string, string> = {
  OPERATIONS: "hsl(var(--chart-1))",
  MARKETING: "hsl(var(--chart-3))",
  SOFTWARE: "hsl(var(--chart-4))",
  PAYROLL: "hsl(var(--chart-2))",
  SALES: "hsl(var(--chart-1))",
  SERVICES: "hsl(var(--chart-2))",
  OTHER: "hsl(var(--muted-foreground))",
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-500",
  SENT: "bg-blue-500",
  OVERDUE: "bg-rose-500",
  DRAFT: "bg-slate-400",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title"), description: t("subtitle", { name: "" }) };
}

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { user } = await requireSession();
  const { firmId } = await requireFirmContext();
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const range = parseDashboardRange((await searchParams).range);
  const overview = await getFinanceOverview(firmId, range, locale);

  const period = resolvePeriod(range);
  const periodFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const periodLabel = `${periodFormatter.format(period.start)} — ${periodFormatter.format(
    new Date(period.end.getTime() - 1),
  )}`;

  const rangeLabels = {
    month: t("ranges.month"),
    "last-month": t("ranges.lastMonth"),
    year: t("ranges.year"),
  } as const;

  const expenseSlices: DonutSlice[] = overview.expenseBreakdown.map((slice) => ({
    key: slice.category,
    label: t(`categories.${slice.category}`),
    value: slice.amount,
    color: CATEGORY_COLORS[slice.category] ?? "hsl(var(--muted-foreground))",
  }));

  const maxClientRevenue = Math.max(1, ...overview.topClients.map((client) => client.revenue));

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-7">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("welcome", { name: user.name.split(/\s+/)[0] ?? user.name })}
        description={t("subtitle")}
        actions={
          <>
            <RangeSelector range={range} labels={rangeLabels} periodLabel={periodLabel} />
            <Link
              href="/reports"
              className={buttonVariants({
                variant: "outline",
                className: "h-[46px] rounded-xl",
              })}
            >
              <BarChart3 aria-hidden="true" className="h-4 w-4" />
              {t("quick.viewReports")}
            </Link>
          </>
        }
      />

      <section
        aria-label={t("eyebrow")}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label={t("kpi.revenue")}
          value={formatCurrency(overview.totals.revenue, locale)}
          change={overview.changes.revenue}
          changeLabel={formatPercentChange(overview.changes.revenue, locale)}
          comparisonLabel={t("kpi.vsPrevious")}
          trend={overview.series.map((point) => point.revenue)}
          icon={TrendingUp}
          tone="blue"
        />
        <KpiCard
          label={t("kpi.expenses")}
          value={formatCurrency(overview.totals.expenses, locale)}
          change={overview.changes.expenses}
          changeLabel={formatPercentChange(overview.changes.expenses, locale)}
          comparisonLabel={t("kpi.vsPrevious")}
          trend={overview.series.map((point) => point.expenses)}
          icon={CreditCard}
          tone="rose"
          positiveIsGood={false}
        />
        <KpiCard
          label={t("kpi.net")}
          value={formatCurrency(overview.totals.net, locale)}
          change={overview.changes.net}
          changeLabel={formatPercentChange(overview.changes.net, locale)}
          comparisonLabel={t("kpi.vsPrevious")}
          trend={overview.series.map((point) => point.revenue - point.expenses)}
          icon={PiggyBank}
          tone="emerald"
        />
        <KpiCard
          label={t("kpi.invoices")}
          value={formatNumber(overview.totals.invoices, locale)}
          change={overview.changes.invoices}
          changeLabel={formatPercentChange(overview.changes.invoices, locale)}
          comparisonLabel={t("kpi.vsPrevious")}
          trend={overview.series.map((point) => point.invoices)}
          icon={ReceiptText}
          tone="purple"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader className="gap-3 pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{t("chart.title")}</CardTitle>
                <CardDescription>{t("chart.description")}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-1" />
                  {t("chart.revenue")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-2" />
                  {t("chart.expenses")}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {overview.totals.revenue === 0 && overview.totals.expenses === 0 ? (
              <div className="glass-soft flex h-64 items-center justify-center rounded-2xl border-dashed text-sm text-muted-foreground">
                {t("chart.empty")}
              </div>
            ) : (
              <AreaChart
                data={overview.series}
                locale={locale}
                ariaLabel={t("chart.aria")}
                revenueLabel={t("chart.revenue")}
                expensesLabel={t("chart.expenses")}
              />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("expenses.title")}</CardTitle>
            <CardDescription>{t("expenses.description")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <DonutChart
              slices={expenseSlices}
              total={overview.totals.expenses}
              locale={locale}
              centerLabel={t("expenses.total")}
              emptyLabel={t("expenses.empty")}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="min-w-0 overflow-hidden xl:col-span-8">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("recent.title")}</CardTitle>
              <CardDescription>{t("recent.description")}</CardDescription>
            </div>
            <Link
              href="/transactions"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {t("recent.viewAll")}
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rtl:-scale-x-100" />
            </Link>
          </CardHeader>

          {overview.recentTransactions.length === 0 ? (
            <CardContent>
              <div className="glass-soft flex h-40 items-center justify-center rounded-2xl border-dashed text-sm text-muted-foreground">
                {t("recent.empty")}
              </div>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.32)] text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-6 py-2.5 text-start font-medium">
                      {t("recent.descriptionLabel")}
                    </th>
                    <th className="hidden px-3 py-2.5 text-start font-medium md:table-cell">
                      {t("recent.client")}
                    </th>
                    <th className="hidden px-3 py-2.5 text-start font-medium sm:table-cell">
                      {t("recent.date")}
                    </th>
                    <th className="px-6 py-2.5 text-end font-medium">{t("recent.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-[hsl(var(--border)/0.5)] transition-colors last:border-0 hover:bg-[hsl(var(--card)/0.45)]"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={
                              transaction.type === "INCOME"
                                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                            }
                          >
                            <Banknote aria-hidden="true" className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{transaction.description}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {transaction.reference ?? t(`categories.${transaction.category}`)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden max-w-40 truncate px-3 py-3.5 text-muted-foreground md:table-cell">
                        {transaction.clientName ?? "—"}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3.5 text-muted-foreground sm:table-cell">
                        {formatDate(transaction.occurredAt, locale)}
                      </td>
                      <td
                        className={
                          transaction.type === "INCOME"
                            ? "whitespace-nowrap px-6 py-3.5 text-end font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                            : "whitespace-nowrap px-6 py-3.5 text-end font-semibold tabular-nums text-rose-600 dark:text-rose-400"
                        }
                      >
                        {transaction.type === "INCOME" ? "+" : "−"}
                        {formatCurrency(transaction.amount, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6 xl:col-span-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg">{t("invoices.title")}</CardTitle>
                <CardDescription>{t("invoices.description")}</CardDescription>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <ReceiptText aria-hidden="true" className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="glass-soft rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("invoices.outstanding")}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                  {formatCurrency(overview.openInvoices.amount, locale)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("invoices.count", { count: overview.openInvoices.count })}
                </p>
              </div>

              <ul className="space-y-3">
                {overview.invoiceStatus.map((entry) => (
                  <li key={entry.status} className="flex items-center gap-2.5 text-sm">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${INVOICE_STATUS_STYLES[entry.status]}`}
                    />
                    <span className="flex-1 text-muted-foreground">
                      {t(`invoices.${entry.status.toLowerCase()}`)}
                    </span>
                    <span className="text-xs text-muted-foreground">{entry.count}</span>
                    <span className="w-24 text-end font-semibold tabular-nums">
                      {formatCompactCurrency(entry.amount, locale)}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/invoices"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.45)] px-3 py-2 text-xs font-semibold backdrop-blur-xl transition-colors hover:bg-[hsl(var(--card)/0.75)]"
              >
                {t("invoices.viewAll")}
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t("topClients.title")}</CardTitle>
              <CardDescription>{t("topClients.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {overview.topClients.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("topClients.empty")}
                </p>
              ) : (
                <ul className="space-y-3.5">
                  {overview.topClients.map((client, index) => (
                    <li key={client.clientId} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.55)] text-[10px] font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{client.name}</span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums">
                          {formatCompactCurrency(client.revenue, locale)}
                        </span>
                      </div>
                      <div className="ms-8 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted)/0.8)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--chart-4))] shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
                          style={{ width: `${(client.revenue / maxClientRevenue) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          href="/transactions"
          icon={Banknote}
          label={t("quick.newTransaction")}
          description={t("recent.title")}
          tone="blue"
        />
        <QuickAction
          href="/invoices"
          icon={ReceiptText}
          label={t("quick.newInvoice")}
          description={t("invoices.title")}
          tone="purple"
        />
        <QuickAction
          href="/clients/new"
          icon={Users}
          label={t("quick.addClient")}
          description={t("topClients.title")}
          tone="emerald"
        />
        <QuickAction
          href="/reports"
          icon={BarChart3}
          label={t("quick.viewReports")}
          description={t("chart.title")}
          tone="orange"
        />
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  tone: "blue" | "purple" | "emerald" | "orange";
}) {
  const tones = {
    blue: "border-blue-500/15 bg-blue-500/10 text-blue-600 dark:text-blue-300",
    purple: "border-violet-500/15 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    emerald: "border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    orange: "border-orange-500/15 bg-orange-500/10 text-orange-600 dark:text-orange-300",
  } as const;

  return (
    <Link
      href={href}
      className="glass-card glass-card-hover group flex items-center gap-3 rounded-2xl p-4 hover:-translate-y-0.5"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone]}`}
      >
        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
      />
    </Link>
  );
}
