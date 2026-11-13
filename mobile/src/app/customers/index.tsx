import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { customersApi } from '../../api/aquatap-api';
import {
  AppText,
  Avatar,
  Badge,
  EmptyState,
  ErrorView,
  Icon,
  LoadingView,
  Screen,
  ScreenHeader,
  TextField,
} from '../../components/ui';
import { queryKeys } from '../../hooks/query-keys';
import { colors } from '../../theme/tokens';
import type { CustomerListItem } from '../../types/api.types';
import { formatCurrency, formatRelativeTime } from '../../utils/format';

/** List of Customers with their remaining gallons and unpaid balance. */
export default function CustomerListScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const search = searchText.trim();

  const customersQuery = useQuery({
    queryKey: queryKeys.customers(search),
    queryFn: () => customersApi.listCustomers(search || undefined),
  });
  const customers = customersQuery.data ?? [];
  const totalUnpaid = customers.reduce((sum, customer) => sum + customer.unpaidBalance, 0);
  const totalGallonsOut = customers.reduce((sum, customer) => sum + customer.remainingGallons, 0);

  return (
    <Screen
      header={<ScreenHeader title="Customers" subtitle="Everyone who signed the borrowing contract" showBackButton />}
      isRefreshing={customersQuery.isRefetching}
      onRefresh={() => void customersQuery.refetch()}
    >
      <TextField
        label="Search customer"
        leftIcon="search"
        placeholder="Name, contact number or address"
        value={searchText}
        onChangeText={setSearchText}
        autoCapitalize="characters"
      />

      {customers.length > 0 ? (
        <AppText variant="caption" className="text-ink-muted">
          {customers.length} customer(s) · {totalGallonsOut} gallons out · {formatCurrency(totalUnpaid)} utang
        </AppText>
      ) : null}

      {customersQuery.isLoading ? (
        <LoadingView message="Loading customers…" />
      ) : customersQuery.isError ? (
        <ErrorView error={customersQuery.error} onRetry={() => void customersQuery.refetch()} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={search ? 'No customer found' : 'No customers yet'}
          message={search ? 'Try another name.' : 'Customers appear here after they sign up and sign the borrowing contract in the app.'}
        />
      ) : (
        <View className="gap-3">
          {customers.map((customer) => (
            <CustomerRow key={customer.customerId} customer={customer} onPress={() => router.push(`/customers/${customer.customerId}`)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function CustomerRow({ customer, onPress }: { customer: CustomerListItem; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${customer.fullName}, ${customer.remainingGallons} remaining gallons, ${formatCurrency(customer.unpaidBalance)} unpaid`}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-card border border-line bg-surface p-4 active:bg-surface-muted"
    >
      <Avatar fullName={customer.fullName} />
      <View className="flex-1 gap-0.5">
        <AppText variant="bodyStrong" numberOfLines={1}>
          {customer.fullName}
        </AppText>
        <AppText variant="caption" className="text-ink-muted" numberOfLines={1}>
          {customer.address}
        </AppText>
        <View className="mt-1 flex-row flex-wrap gap-1">
          <Badge label={`${customer.remainingGallons} gal with customer`} tone="primary" icon="water-outline" />
          {customer.unpaidBalance > 0 ? (
            <Badge label={`${formatCurrency(customer.unpaidBalance)} utang`} tone="warning" icon="time-outline" />
          ) : null}
        </View>
        {customer.lastOrderAt ? (
          <AppText variant="tiny" className="text-ink-subtle">
            Last order {formatRelativeTime(customer.lastOrderAt).toLowerCase()}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={20} color={colors.textSubtle} />
    </Pressable>
  );
}

