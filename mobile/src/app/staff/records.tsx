import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ordersApi } from '../../api/aquatap-api';
import { AppText, Badge, EmptyState, ErrorView, LoadingView, Screen, StatCard, TextField } from '../../components/ui';
import { CellText, DataTable, type DataTableColumn } from '../../features/staff/DataTable';
import { datePresetOptions, resolveDatePreset, type DatePreset } from '../../features/staff/date-presets';
import { FilterChips } from '../../features/staff/FilterChips';
import { queryKeys } from '../../hooks/query-keys';
import { colors } from '../../theme/tokens';
import type { StationRecordRow } from '../../types/api.types';
import { formatCurrency, formatDate, formatTime, paymentModeLabels } from '../../utils/format';

const RECORD_COLUMNS: DataTableColumn<StationRecordRow>[] = [
  {
    key: 'date',
    title: 'Date',
    width: 120,
    render: (row) => (
      <View>
        <CellText>{formatDate(row.deliveredAt)}</CellText>
        <AppText variant="tiny" className="text-ink-subtle">
          {formatTime(row.deliveredAt)}
        </AppText>
      </View>
    ),
  },
  { key: 'name', title: 'Name', width: 190, render: (row) => <CellText isStrong>{row.customerName}</CellText> },
  { key: 'ordered', title: 'Gallons ordered', width: 100, align: 'center', render: (row) => <CellText>{row.gallonsOrdered}</CellText> },
  { key: 'returned', title: 'Returned', width: 90, align: 'center', render: (row) => <CellText>{row.returnedGallons}</CellText> },
  {
    key: 'remaining',
    title: 'Gallons left',
    width: 100,
    align: 'center',
    render: (row) => (
      <CellText isStrong color={colors.primary}>
        {row.remainingGallons}
      </CellText>
    ),
  },
  {
    key: 'type',
    title: 'Cash / Utang',
    width: 130,
    render: (row) =>
      row.paymentType === 'Cash' ? (
        <Badge label="Cash" tone="success" />
      ) : (
        <Badge label={row.paymentStatus === 'Paid' ? 'Utang · paid' : 'Utang · not yet paid'} tone={row.paymentStatus === 'Paid' ? 'info' : 'warning'} />
      ),
  },
  {
    key: 'mode',
    title: 'Paid with',
    width: 130,
    render: (row) => <CellText>{row.paymentMode ? paymentModeLabels[row.paymentMode] : '—'}</CellText>,
  },
  { key: 'amount', title: 'Amount', width: 110, align: 'right', render: (row) => <CellText isStrong>{formatCurrency(row.totalAmount)}</CellText> },
];

/** Automatic records grid — replaces the paper notebook of the station. */
export default function RecordsScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('last7Days');

  const filter = useMemo(() => ({ search: searchText.trim() || undefined, ...resolveDatePreset(datePreset) }), [searchText, datePreset]);
  const recordsQuery = useQuery({
    queryKey: queryKeys.records(JSON.stringify(filter)),
    queryFn: () => ordersApi.getRecords(filter),
  });

  const rows = recordsQuery.data ?? [];
  const totalGallons = rows.reduce((sum, row) => sum + row.gallonsOrdered, 0);
  const totalReturned = rows.reduce((sum, row) => sum + row.returnedGallons, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.totalAmount, 0);

  return (
    <Screen isRefreshing={recordsQuery.isRefetching} onRefresh={() => void recordsQuery.refetch()}>
      <View className="gap-1">
        <AppText variant="title" accessibilityRole="header">
          Delivery records
        </AppText>
        <AppText variant="caption" className="text-ink-muted">
          Saved automatically every time an order is delivered. Gallons left are counted from the first gallons borrowed.
        </AppText>
      </View>

      <TextField
        label="Search"
        leftIcon="search"
        placeholder="Customer name or order number"
        value={searchText}
        onChangeText={setSearchText}
        autoCapitalize="characters"
      />
      <FilterChips<DatePreset> accessibilityLabel="Date delivered" options={datePresetOptions} value={datePreset} onChange={setDatePreset} />

      {rows.length > 0 ? (
        <View className="flex-row flex-wrap gap-3">
          <StatCard label="Deliveries" value={String(rows.length)} icon="checkmark-done" tone="success" />
          <StatCard label="Gallons ordered / returned" value={`${totalGallons} / ${totalReturned}`} icon="water" tone="primary" />
          <StatCard label="Total amount" value={formatCurrency(totalAmount)} icon="cash-outline" tone="accent" />
        </View>
      ) : null}

      {recordsQuery.isLoading ? (
        <LoadingView message="Loading records…" />
      ) : recordsQuery.isError ? (
        <ErrorView error={recordsQuery.error} onRetry={() => void recordsQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="grid-outline" title="No records yet" message="Delivered orders for this filter will appear in this table." />
      ) : (
        <>
          <AppText variant="caption" className="text-ink-subtle">
            Swipe the table sideways to see all columns. Tap a row to open the order.
          </AppText>
          <DataTable
            columns={RECORD_COLUMNS}
            rows={rows}
            getRowKey={(row) => row.customerOrderId}
            onRowPress={(row) => router.push(`/orders/${row.customerOrderId}`)}
            rowAccessibilityLabel={(row) =>
              `${row.customerName}, ordered ${row.gallonsOrdered}, returned ${row.returnedGallons}, remaining ${row.remainingGallons}`
            }
          />
        </>
      )}
    </Screen>
  );
}
