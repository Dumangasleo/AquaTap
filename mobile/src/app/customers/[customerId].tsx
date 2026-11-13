import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, View } from 'react-native';
import { customersApi } from '../../api/aquatap-api';
import { SignatureImage } from '../../components/signature/SignatureImage';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorView,
  KeyValueRow,
  LoadingView,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatCard,
} from '../../components/ui';
import { CellText, DataTable, type DataTableColumn } from '../../features/staff/DataTable';
import { queryKeys } from '../../hooks/query-keys';
import { colors } from '../../theme/tokens';
import type { GallonLedgerEntry } from '../../types/api.types';
import { formatCurrency, formatDate, formatDateTime, paymentModeLabels } from '../../utils/format';

const LEDGER_COLUMNS: DataTableColumn<GallonLedgerEntry>[] = [
  { key: 'date', title: 'Date', width: 120, render: (entry) => <CellText>{formatDate(entry.entryDate)}</CellText> },
  {
    key: 'type',
    title: 'Type',
    width: 120,
    render: (entry) =>
      entry.entryType === 'Contract' ? <Badge label="Borrowed" tone="accent" /> : <CellText>#{entry.orderNumber}</CellText>,
  },
  {
    key: 'ordered',
    title: 'Ordered',
    width: 90,
    align: 'center',
    render: (entry) => <CellText>{entry.entryType === 'Contract' ? `+${entry.borrowedGallons}` : entry.gallonsOrdered}</CellText>,
  },
  { key: 'returned', title: 'Returned', width: 90, align: 'center', render: (entry) => <CellText>{entry.returnedGallons}</CellText> },
  {
    key: 'remaining',
    title: 'Gallons left',
    width: 100,
    align: 'center',
    render: (entry) => (
      <CellText isStrong color={colors.primary}>
        {entry.remainingGallons}
      </CellText>
    ),
  },
  {
    key: 'payment',
    title: 'Payment',
    width: 150,
    render: (entry) =>
      entry.paymentType === null ? (
        <CellText color={colors.textSubtle}>—</CellText>
      ) : (
        <Badge
          label={`${entry.paymentType === 'Cash' ? 'Cash' : 'Utang'}${entry.paymentMode ? ` · ${paymentModeLabels[entry.paymentMode]}` : ''}`}
          tone={entry.paymentStatus === 'Paid' ? 'success' : 'warning'}
        />
      ),
  },
  {
    key: 'amount',
    title: 'Amount',
    width: 110,
    align: 'right',
    render: (entry) => <CellText>{entry.totalAmount ? formatCurrency(entry.totalAmount) : '—'}</CellText>,
  },
];

/** One customer: contract, remaining gallons, utang and the full gallon ledger. */
export default function CustomerDetailScreen() {
  const router = useRouter();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const id = Number(customerId);

  const accountQuery = useQuery({ queryKey: queryKeys.customer(id), queryFn: () => customersApi.getCustomer(id) });
  const ledgerQuery = useQuery({ queryKey: queryKeys.customerLedger(id), queryFn: () => customersApi.getCustomerLedger(id) });

  const account = accountQuery.data;
  const refreshAll = () => {
    void accountQuery.refetch();
    void ledgerQuery.refetch();
  };

  if (!account) {
    return (
      <Screen header={<ScreenHeader title="Customer" showBackButton />}>
        {accountQuery.isError ? <ErrorView error={accountQuery.error} onRetry={refreshAll} /> : <LoadingView message="Loading customer…" />}
      </Screen>
    );
  }

  const contract = account.contract;
  const ledgerEntries = [...(ledgerQuery.data ?? [])].reverse();

  return (
    <Screen
      header={<ScreenHeader title="Customer" showBackButton />}
      isRefreshing={accountQuery.isRefetching || ledgerQuery.isRefetching}
      onRefresh={refreshAll}
    >
      <Card className="gap-2">
        <View className="mb-1 flex-row items-center gap-3">
          <Avatar fullName={account.fullName} size={56} />
          <View className="flex-1">
            <AppText variant="heading">{account.fullName}</AppText>
            <AppText variant="caption" className="text-ink-muted">
              Customer since {formatDate(account.createdAt)}
            </AppText>
          </View>
        </View>
        <KeyValueRow label="Contact" value={account.contactNumber} />
        <KeyValueRow label="Work" value={account.occupation ?? '—'} />
        {account.email ? <KeyValueRow label="Email" value={account.email} /> : null}
        <AppText variant="caption" className="text-ink-muted">
          {account.address}
          {account.landmark ? ` · Landmark: ${account.landmark}` : ''}
        </AppText>
        <Button label="Call customer" icon="call" variant="secondary" fullWidth onPress={() => void Linking.openURL(`tel:${account.contactNumber}`)} />
      </Card>

      <View className="flex-row flex-wrap gap-3">
        <StatCard label="Gallons with customer" value={String(account.gallonBalance.remainingGallons)} icon="water" tone="primary" caption="Station containers with the customer" />
        <StatCard label="Gallons borrowed" value={String(account.gallonBalance.borrowedGallons)} icon="document-text-outline" tone="accent" />
        <StatCard
          label="Utang balance"
          value={formatCurrency(account.credit.unpaidBalance)}
          icon="time-outline"
          tone={account.credit.unpaidBalance > 0 ? 'warning' : 'success'}
          caption={`${account.credit.unpaidOrderCount} order(s) not yet paid`}
        />
        <StatCard label="Total orders" value={String(account.totalOrders)} icon="receipt-outline" tone="neutral" caption={`${account.activeOrders} active now`} />
      </View>

      {account.credit.unpaidBalance > 0 ? (
        <Button label="Collect utang" icon="wallet-outline" variant="outline" fullWidth onPress={() => router.push('/staff/credits')} />
      ) : null}

      <SectionHeader title="Borrowing agreement" />
      {contract ? (
        <Card className="gap-2">
          <KeyValueRow label="Borrowed gallons" value={`${contract.borrowedGallons} gal`} isEmphasized />
          <KeyValueRow label="Signed on" value={formatDateTime(contract.signedAt)} />
          {contract.contractBody ? (
            <>
              <Divider />
              <AppText variant="body" className="leading-6">
                {contract.contractBody}
              </AppText>
            </>
          ) : (
            <AppText variant="caption" className="text-ink-muted">
              Saved without the contract text (details and signature only).
            </AppText>
          )}
          <Divider />
          <AppText variant="overline">
            Signature of {contract.fullName}
          </AppText>
          <SignatureImage signatureSvg={contract.signatureSvg} />
        </Card>
      ) : (
        <EmptyState icon="document-outline" title="No contract on file" />
      )}

      <SectionHeader title="Gallon history" />
      <AppText variant="caption" className="text-ink-muted">
        Gallons left = borrowed + delivered − returned, counted from the first gallons borrowed. Newest first.
      </AppText>
      {ledgerQuery.isLoading ? (
        <LoadingView message="Loading gallon history…" />
      ) : ledgerEntries.length === 0 ? (
        <EmptyState icon="grid-outline" title="No entries yet" />
      ) : (
        <DataTable
          columns={LEDGER_COLUMNS}
          rows={ledgerEntries}
          getRowKey={(entry) => `${entry.entryType}-${entry.referenceId}`}
          onRowPress={(entry) => entry.entryType === 'Delivery' && router.push(`/orders/${entry.referenceId}`)}
        />
      )}
    </Screen>
  );
}

