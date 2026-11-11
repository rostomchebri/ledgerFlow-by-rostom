import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Download,
  PiggyBank,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercentChange,
} from "@/lib/finance/format";
import { parseDashboardRange, resolvePeriod } from "@/lib/finance/ranges";
import { getFinanceOverview } from "@/lib/finance/service";
import { requireFirmContext } from "@/lib/firm-context";

const CATEGORY_COLORS: Record<string, string> = {
  OPERATIONS: "hsl(var(--chart-1))",
  MARKETING: "hsl(var(--chart-3))",
  SOFTWARE: "hsl(var(--chart-4))",
  PAYROLL: "hsl(var(--chart-2))",
  SALES: "hsl(var(--chart-1))",
  SERVICES: "hsl(var(--chart-2))",
  OTHER: "hsl(var(--muted-foreground))",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports.meta");
  return { title: t("title"), description: t("description") };
}

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const t = await getTranslations("reports");
  const tDashboard = await getTranslations("dashboard");
  const locale = await getLocale();
  const { firmId } = await requireFirmContext();
  const range = parseDashboardRange((await searchParams).range);
  const [overview, yearOverview] = await Promise.all([
    getFinanceOverview(firmId, range, locale),
    range === "year" ? Promise.resolve(null) : getFinanceOverview(firmId, "year", locale),
  ]);
  const trend = yearOverview ?? overview;

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
    month: tDashboard("ranges.month"),
    "last-month": tDashboard("ranges.lastMonth"),
    year: tDashboard("ranges.year"),
  } as const;

  const margin =
    overview.totals.revenue > 0 ? (overview.totals.net / overview.totals.revenue) * 100 : 0;

  const expenseSlices: DonutSlice[] = overview.expenseBreakdown.map((slice) => ({
    key: slice.category,
    label: tDashboard(`categories.${slice.category}`),
    value: slice.amount,
    color: CATEGORY_COLORS[slice.category] ?? "hsl(var(--muted-foreground))",
  }));

  const maxClientRevenue = Math.max(1, ...overview.topClients.map((client) => client.revenue));

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <RangeSelector range={range} labels={rangeLabels} periodLabel={periodLabel} />
            <Link
              href="/reports/invoices"
              className={buttonVariants({
                variant: "outline",
                className: "h-[46px] rounded-xl",
              })}
            >
              <ReceiptText aria-hidden="true" className="h-4 w-4" />
              {t("invoiceRegister.title")}
            </Link>
            <Link
              href={`/api/reports/transactions/export?range=${range}`}
              className={buttonVariants({
                variant: "outline",
                className: "h-[46px] rounded-xl",
              })}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("export")}
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpi
          label={t("kpis.revenue")}
          value={formatCurrency(overview.totals.revenue, locale)}
          change={formatPercentChange(overview.changes.revenue, locale)}
          icon={TrendingUp}
          tone="blue"
        />
        <ReportKpi
          label={t("kpis.expenses")}
          value={formatCurrency(overview.totals.expenses, locale)}
          change={formatPercentChange(overview.changes.expenses, locale)}
          icon={CreditCard}
          tone="rose"
        />
        <ReportKpi
          label={t("kpis.net")}
          value={formatCurrency(overview.totals.net, locale)}
          change={formatPercentChange(overview.changes.net, locale)}
          icon={PiggyBank}
          tone="emerald"
        />
        <ReportKpi
          label={t("kpis.margin")}
          value={`${formatNumber(Math.round(margin), locale)}%`}
          icon={BarChart3}
          tone="purple"
        />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("chartTitle")}</CardTitle>
              <CardDescription>{t("chartDescription")}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-1" />
                {tDashboard("chart.revenue")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-2" />
                {tDashboard("chart.expenses")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {overview.totals.revenue === 0 && overview.totals.expenses === 0 ? (
            <div className="glass-soft flex h-64 items-center justify-center rounded-2xl border-dashed text-sm text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            <AreaChart
              data={overview.series}
              locale={locale}
              ariaLabel={t("chartTitle")}
              revenueLabel={tDashboard("chart.revenue")}
              expensesLabel={tDashboard("chart.expenses")}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("expenseTitle")}</CardTitle>
            <CardDescription>{t("expenseDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              slices={expenseSlices}
              total={overview.totals.expenses}
              locale={locale}
              centerLabel={tDashboard("expenses.total")}
              emptyLabel={tDashboard("expenses.empty")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("clientsTitle")}</CardTitle>
            <CardDescription>{t("clientsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.topClients.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {tDashboard("topClients.empty")}
              </p>
            ) : (
              <ul className="space-y-4">
                {overview.topClients.map((client, index) => (
                  <li key={client.clientId} className="space-y-1.5">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.55)] text-[11px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{client.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatCurrency(client.revenue, locale)}
                      </span>
                    </div>
                    <div className="ms-10 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted)/0.8)]">
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

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">{t("monthlyTitle")}</CardTitle>
            <CardDescription>{t("monthlyDescription")}</CardDescription>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:flex">
            <ReceiptText aria-hidden="true" className="h-3.5 w-3.5" />
            {tDashboard("ranges.year")}
          </span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.32)] text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <th className="px-6 py-3 text-start font-medium">{t("columns.month")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("columns.revenue")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("columns.expenses")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("columns.net")}</th>
                <th className="px-6 py-3 text-end font-medium">{t("columns.invoices")}</th>
              </tr>
            </thead>
            <tbody>
              {trend.series.map((row) => {
                const net = row.revenue - row.expenses;
                return (
                  <tr
                    key={row.label}
                    className="border-b border-[hsl(var(--border)/0.5)] transition-colors last:border-0 hover:bg-[hsl(var(--card)/0.45)]"
                  >
                    <td className="px-6 py-3.5 font-medium">{row.label}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-end tabular-nums">
                      {formatCompactCurrency(row.revenue, locale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-end tabular-nums text-muted-foreground">
                      {formatCompactCurrency(row.expenses, locale)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3.5 text-end font-semibold tabular-nums ${
                        net >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatCompactCurrency(net, locale)}
                    </td>
                    <td className="px-6 py-3.5 text-end tabular-nums text-muted-foreground">
                      {formatNumber(row.invoices, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-6 py-3">
          <p className="text-xs text-muted-foreground">{t("exportHint")}</p>
          <Link
            href={`/api/reports/transactions/export?range=${range}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {t("export")}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </Link>
        </div>
      </Card>
    </div>
  );
}

function ReportKpi({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  change?: string;
  changeLabel?: string;
  icon: typeof TrendingUp;
  tone: "blue" | "rose" | "emerald" | "purple";
}) {
  const tones = {
    blue: "border-blue-500/15 bg-blue-500/10 text-blue-600 dark:text-blue-300",
    rose: "border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    emerald: "border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    purple: "border-violet-500/15 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  } as const;

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        {change ? (
          <span className="rounded-full border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.45)] px-2 py-1 text-xs font-semibold text-muted-foreground backdrop-blur-md">
            {change}
            {changeLabel ? ` · ${changeLabel}` : ""}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-[27px] font-bold tabular-nums tracking-[-0.03em]">{value}</p>
    </div>
  );
}
