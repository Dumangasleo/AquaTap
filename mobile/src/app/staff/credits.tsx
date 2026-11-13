import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { creditsApi } from '../../api/aquatap-api';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorView,
  Icon,
  LoadingView,
  Screen,
  SegmentedControl,
  TextField,
} from '../../components/ui';
import { datePresetOptions, resolveDatePreset, type DatePreset } from '../../features/staff/date-presets';
import { FilterChips } from '../../features/staff/FilterChips';
import { SettleCreditSheet } from '../../features/staff/SettleCreditSheet';
import { queryKeys } from '../../hooks/query-keys';
import { colors } from '../../theme/tokens';
import type { CreditItem, PaymentStatus } from '../../types/api.types';
import { cn } from '../../utils/cn';
import { formatCurrency, formatDate, formatDateTime, paymentModeLabels } from '../../utils/format';

/** Utang: search by name and order date, then mark them as paid with the date of payment. */
export default function CreditsScreen() {
  const [searchText, setSearchText] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [isSettleSheetVisible, setIsSettleSheetVisible] = useState(false);

  const filter = useMemo(
    () => ({ search: searchText.trim() || undefined, paymentStatus, ...resolveDatePreset(datePreset) }),
    [searchText, paymentStatus, datePreset],
  );

  const creditsQuery = useQuery({
    queryKey: queryKeys.credits(JSON.stringify(filter)),
    queryFn: () => creditsApi.listCredits(filter),
  });

  const credits = creditsQuery.data?.items ?? [];
  const selectedCredits = credits.filter((credit) => selectedOrderIds.has(credit.customerOrderId));
  const selectedTotal = selectedCredits.reduce((sum, credit) => sum + credit.totalAmount, 0);
  const isUnpaidView = paymentStatus === 'Unpaid';

  const toggleSelection = (customerOrderId: number) => {
    setSelectedOrderIds((previous) => {
      const next = new Set(previous);
      if (next.has(customerOrderId)) next.delete(customerOrderId);
      else next.add(customerOrderId);
      return next;
    });
  };

  const changeStatus = (status: PaymentStatus) => {
    setPaymentStatus(status);
    setSelectedOrderIds(new Set());
  };

  const selectAllOfCustomer = (customerId: number) => {
    setSelectedOrderIds(new Set(credits.filter((credit) => credit.customerId === customerId).map((credit) => credit.customerOrderId)));
  };

  return (
    <Screen
      isRefreshing={creditsQuery.isRefetching}
      onRefresh={() => void creditsQuery.refetch()}
      footer={
        isUnpaidView && selectedCredits.length > 0 ? (
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <AppText variant="overline">{selectedCredits.length} selected</AppText>
              <AppText variant="title">{formatCurrency(selectedTotal)}</AppText>
            </View>
            <Button label="Mark as paid" icon="checkmark-circle" variant="success" size="lg" onPress={() => setIsSettleSheetVisible(true)} />
          </View>
        ) : undefined
      }
    >
      <View className="gap-1">
        <AppText variant="title" accessibilityRole="header">
          Utang
        </AppText>
        <AppText variant="caption" className="text-ink-muted">
          Search the customer, pick the orders, then mark them as paid.
        </AppText>
      </View>

      <TextField
        label="Search customer"
        leftIcon="search"
        placeholder="Name or order number"
        value={searchText}
        onChangeText={setSearchText}
        autoCapitalize="characters"
        returnKeyType="search"
      />

      <View className="gap-2">
        <AppText variant="overline">Date ordered</AppText>
        <FilterChips<DatePreset> accessibilityLabel="Date ordered" options={datePresetOptions} value={datePreset} onChange={setDatePreset} />
      </View>

      <SegmentedControl<PaymentStatus>
        value={paymentStatus}
        onChange={changeStatus}
        options={[
          { value: 'Unpaid', label: 'Not yet paid', count: isUnpaidView ? creditsQuery.data?.totalCount : undefined, countTone: 'danger' },
          { value: 'Paid', label: 'Paid' },
        ]}
      />

      {creditsQuery.data && credits.length > 0 ? (
        <Card className={cn('gap-1 border-0', isUnpaidView ? 'bg-warning-soft' : 'bg-success-soft')}>
          <AppText variant="overline">
            {isUnpaidView ? 'Total not yet paid' : 'Total paid'} ({creditsQuery.data.totalCount} orders)
          </AppText>
          <AppText variant="display" className={isUnpaidView ? 'text-warning' : 'text-success'}>
            {formatCurrency(creditsQuery.data.totalAmount)}
          </AppText>
        </Card>
      ) : null}

      {creditsQuery.isLoading ? (
        <LoadingView message="Loading utang…" />
      ) : creditsQuery.isError ? (
        <ErrorView error={creditsQuery.error} onRetry={() => void creditsQuery.refetch()} />
      ) : credits.length === 0 ? (
        <EmptyState
          icon={isUnpaidView ? 'happy-outline' : 'wallet-outline'}
          title={isUnpaidView ? 'No utang to collect' : 'No paid utang found'}
          message={isUnpaidView ? 'Everyone is paid up for this filter.' : 'Try another name or date.'}
        />
      ) : (
        <View className="gap-3">
          {credits.map((credit) => (
            <CreditRow
              key={credit.customerOrderId}
              credit={credit}
              isSelectable={isUnpaidView}
              isSelected={selectedOrderIds.has(credit.customerOrderId)}
              onToggle={() => toggleSelection(credit.customerOrderId)}
              onSelectAllOfCustomer={() => selectAllOfCustomer(credit.customerId)}
            />
          ))}
        </View>
      )}

      <SettleCreditSheet
        isVisible={isSettleSheetVisible}
        selectedCredits={selectedCredits}
        onClose={() => setIsSettleSheetVisible(false)}
        onSettled={() => {
          setIsSettleSheetVisible(false);
          setSelectedOrderIds(new Set());
        }}
      />
    </Screen>
  );
}

interface CreditRowProps {
  credit: CreditItem;
  isSelectable: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelectAllOfCustomer: () => void;
}

function CreditRow({ credit, isSelectable, isSelected, onToggle, onSelectAllOfCustomer }: CreditRowProps) {
  const content = (
    <>
      {isSelectable ? (
        <View
          className={cn(
            'mt-0.5 h-[26px] w-[26px] items-center justify-center rounded-lg border-2',
            isSelected ? 'border-success bg-success' : 'border-line-strong',
          )}
        >
          {isSelected ? <Icon name="checkmark" size={18} color={colors.textOnPrimary} /> : null}
        </View>
      ) : null}
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <AppText variant="bodyStrong" numberOfLines={1} className="flex-1">
            {credit.customerName}
          </AppText>
          <AppText variant="heading" className={isSelectable ? 'text-warning' : 'text-success'}>
            {formatCurrency(credit.totalAmount)}
          </AppText>
        </View>
        <AppText variant="caption" className="text-ink-muted">
          #{credit.orderNumber} · Ordered {formatDate(credit.orderedAt)} · {credit.gallonsOrdered} gal
        </AppText>
        <View className="mt-1 flex-row flex-wrap gap-1">
          {credit.paidAt ? <Badge label={`Paid ${formatDateTime(credit.paidAt)}`} tone="success" icon="checkmark-circle" /> : null}
          {credit.paymentMode ? <Badge label={paymentModeLabels[credit.paymentMode]} tone="accent" /> : null}
          {credit.paymentReference ? <Badge label={`Ref ${credit.paymentReference}`} tone="info" icon="document-text-outline" /> : null}
        </View>
        {isSelectable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select all unpaid orders of ${credit.customerName}`}
            onPress={onSelectAllOfCustomer}
            hitSlop={8}
            className="min-h-[32px] justify-center"
          >
            <AppText variant="caption" className="text-brand">
              Select all of this customer
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </>
  );

  if (!isSelectable) return <Card className="flex-row items-start gap-3">{content}</Card>;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${credit.customerName}, ${formatCurrency(credit.totalAmount)}, ordered ${formatDate(credit.orderedAt)}`}
      onPress={onToggle}
      className={cn(
        'flex-row items-start gap-3 rounded-card border-[1.5px] bg-surface p-4',
        isSelected ? 'border-success bg-success-soft' : 'border-line',
      )}
    >
      {content}
    </Pressable>
  );
}
