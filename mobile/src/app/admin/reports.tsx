import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { reportsApi } from '../../api/aquatap-api';
import {
  AppText,
  Banner,
  Card,
  Divider,
  ErrorView,
  IconButton,
  KeyValueRow,
  LoadingView,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatCard,
} from '../../components/ui';
import { queryKeys } from '../../hooks/query-keys';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import type { MonthlyBusinessFigures } from '../../types/api.types';
import { expenseCategoryLabels, formatCurrency } from '../../utils/format';

const CHART_HEIGHT = 140;

/** Admin business summary: monthly and yearly figures (the web admin will extend this later). */
export default function BusinessReportsScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const summaryQuery = useQuery({ queryKey: queryKeys.businessSummary(year), queryFn: () => reportsApi.getBusinessSummary(year) });
  const summary = summaryQuery.data;

  return (
    <Screen
      header={<ScreenHeader title="Business reports" subtitle="Sales, expenses and gallons for the year" showBackButton />}
      isRefreshing={summaryQuery.isRefetching}
      onRefresh={() => void summaryQuery.refetch()}
    >
      <Card className="flex-row items-center py-2">
        <IconButton icon="chevron-back" accessibilityLabel="Previous year" onPress={() => setYear(year - 1)} />
        <AppText variant="title" align="center" className="flex-1">
          {year}
        </AppText>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel="Next year"
          color={year < currentYear ? colors.text : colors.borderStrong}
          onPress={() => year < currentYear && setYear(year + 1)}
        />
      </Card>

      {summaryQuery.isLoading ? (
        <LoadingView message="Computing the year's figures…" />
      ) : summaryQuery.isError || !summary ? (
        <ErrorView error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : (
        <>
          <Card className="gap-1 border-brand-line bg-brand-soft">
            <AppText variant="overline" className="text-brand">
              Net income (sales minus expenses)
            </AppText>
            <AppText
              className={cn('font-display text-[36px] leading-[44px]', summary.totals.netIncome >= 0 ? 'text-success' : 'text-danger')}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {formatCurrency(summary.totals.netIncome)}
            </AppText>
            <AppText variant="caption" className="text-ink-muted">
              {formatCurrency(summary.totals.sales)} sales, {formatCurrency(summary.totals.expenses)} expenses
            </AppText>
          </Card>

          <View className="flex-row flex-wrap gap-3">
            <StatCard label="Gallons delivered" value={String(summary.totals.gallonsDelivered)} icon="water" tone="primary" />
            <StatCard label="Delivered orders" value={String(summary.totals.deliveredOrders)} icon="checkmark-done" tone="success" />
            <StatCard label="Sales" value={formatCurrency(summary.totals.sales)} icon="trending-up" tone="success" />
            <StatCard label="Money collected" value={formatCurrency(summary.totals.collections)} icon="wallet-outline" tone="accent" />
            <StatCard label="Expenses" value={formatCurrency(summary.totals.expenses)} icon="receipt-outline" tone="danger" />
            <StatCard label="Not yet paid (utang)" value={formatCurrency(summary.outstandingCredits)} icon="time-outline" tone="warning" caption="All time" />
            <StatCard label="New customers" value={String(summary.totals.newCustomers)} icon="person-add-outline" tone="info" />
            <StatCard label="All customers" value={String(summary.totalCustomers)} icon="people-outline" tone="neutral" />
          </View>

          <SectionHeader title="Sales and expenses each month" />
          <Card className="gap-3">
            <ChartLegend items={[{ label: 'Sales', color: colors.primary }, { label: 'Expenses', color: colors.danger }]} />
            <MonthlyBarChart
              months={summary.months}
              series={[
                { color: colors.primary, getValue: (month) => month.sales },
                { color: colors.danger, getValue: (month) => month.expenses },
              ]}
              formatValue={formatCurrency}
            />
          </Card>

          <SectionHeader title="Gallons delivered each month" />
          <Card className="gap-3">
            <MonthlyBarChart
              months={summary.months}
              series={[{ color: colors.accent, getValue: (month) => month.gallonsDelivered }]}
              formatValue={(value) => `${value} gal`}
              showTopValue
            />
          </Card>

          <SectionHeader title="Month by month" />
          <Card className="gap-1">
            {summary.months.map((month, index) => (
              <View key={month.month}>
                {index > 0 ? <Divider /> : null}
                <View className="flex-row items-center gap-3 py-2">
                  <AppText variant="bodyStrong" className="w-10">
                    {month.monthLabel}
                  </AppText>
                  <View className="flex-1">
                    <AppText variant="caption" className="text-ink-muted">
                      {month.gallonsDelivered} gal · {month.deliveredOrders} orders · {month.newCustomers} new customer(s)
                    </AppText>
                    <AppText variant="caption" className="text-ink-muted">
                      Expenses {formatCurrency(month.expenses)}
                    </AppText>
                  </View>
                  <View className="items-end">
                    <AppText variant="bodyStrong">{formatCurrency(month.sales)}</AppText>
                    <AppText variant="tiny" className={month.netIncome >= 0 ? 'text-success' : 'text-danger'}>
                      Net {formatCurrency(month.netIncome)}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
          </Card>

          <SectionHeader title="Expenses by type" />
          <Card className="gap-1">
            {summary.expensesByCategory.length === 0 ? (
              <AppText className="text-ink-muted">No expenses recorded this year.</AppText>
            ) : (
              summary.expensesByCategory.map((category) => (
                <KeyValueRow key={category.expenseCategory} label={expenseCategoryLabels[category.expenseCategory]} value={formatCurrency(category.amount)} />
              ))
            )}
          </Card>

          <Banner
            tone="info"
            icon="desktop-outline"
            title="More reports on the web"
            message="Bigger charts, exports and year-to-year comparisons will be on the AquaTap website."
          />
        </>
      )}
    </Screen>
  );
}

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View className="flex-row gap-4">
      {items.map((item) => (
        <View key={item.label} className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: item.color }} />
          <AppText variant="caption" className="text-ink-muted">
            {item.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

interface MonthlyBarChartProps {
  months: MonthlyBusinessFigures[];
  series: { color: string; getValue: (month: MonthlyBusinessFigures) => number }[];
  formatValue: (value: number) => string;
  showTopValue?: boolean;
}

/** Simple bar chart drawn with Views (no chart library needed). */
function MonthlyBarChart({ months, series, formatValue, showTopValue = false }: MonthlyBarChartProps) {
  const maxValue = Math.max(1, ...months.flatMap((month) => series.map((item) => item.getValue(month))));
  const peakMonth = months.reduce((best, month) => (series[0].getValue(month) > series[0].getValue(best) ? month : best), months[0]);

  return (
    <View>
      <View
        className="flex-row items-end gap-1 border-b border-line pb-1"
        style={{ height: CHART_HEIGHT + 22 }}
        accessibilityLabel={`Highest month: ${peakMonth.monthLabel}, ${formatValue(series[0].getValue(peakMonth))}`}
      >
        {months.map((month) => (
          <View key={month.month} className="flex-1 items-center justify-end gap-1">
            <View className="flex-row items-end gap-0.5" style={{ height: CHART_HEIGHT }}>
              {series.map((item, seriesIndex) => {
                const value = item.getValue(month);
                return (
                  <View
                    key={seriesIndex}
                    className="w-[7px] rounded-t-[4px]"
                    style={{ backgroundColor: item.color, height: value > 0 ? Math.max(3, (value / maxValue) * CHART_HEIGHT) : 0 }}
                  />
                );
              })}
            </View>
            <AppText variant="tiny" className="text-center text-ink-subtle">
              {month.monthLabel.slice(0, 1)}
            </AppText>
          </View>
        ))}
      </View>
      {showTopValue || series.length > 0 ? (
        <AppText variant="caption" className="mt-2 text-ink-muted">
          Highest: {peakMonth.monthLabel} · {formatValue(series[0].getValue(peakMonth))}
        </AppText>
      ) : null}
    </View>
  );
}
