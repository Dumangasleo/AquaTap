import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { employeesApi, expensesApi, reportsApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import {
  AppText,
  Badge,
  Button,
  Card,
  DateNavigator,
  Divider,
  EmptyState,
  ErrorView,
  Icon,
  IconButton,
  KeyValueRow,
  LoadingView,
  Screen,
  SectionHeader,
  StatCard,
  useToast,
  type IconName,
} from '../../components/ui';
import { ExpenseSheet } from '../../features/staff/ExpenseSheet';
import { FilterChips } from '../../features/staff/FilterChips';
import { ShiftCard } from '../../features/staff/ShiftCard';
import { formatDurationSince } from '../../features/staff/use-staff-queries';
import { queryKeys } from '../../hooks/query-keys';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';
import type { CustomerOrder, EmployeeShift, Expense } from '../../types/api.types';
import { confirmAction } from '../../utils/confirm';
import {
  expenseCategoryIcons,
  expenseCategoryLabels,
  formatCurrency,
  formatTime,
  todayDateOnly,
} from '../../utils/format';

const ALL_EMPLOYEES = 0;

/** Daily transactions: everything delivered, declined or failed on a day, with expenses and totals. */
export default function DailyTransactionsScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.role === 'Admin';
  const [selectedDate, setSelectedDate] = useState(todayDateOnly());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(ALL_EMPLOYEES);
  const [isExpenseSheetVisible, setIsExpenseSheetVisible] = useState(false);

  const employeeFilter = isAdmin && selectedEmployeeId !== ALL_EMPLOYEES ? selectedEmployeeId : undefined;

  const employeesQuery = useQuery({ queryKey: queryKeys.employees, queryFn: employeesApi.list, enabled: isAdmin });
  const dailyReportQuery = useQuery({
    queryKey: queryKeys.dailyReport(selectedDate, employeeFilter),
    queryFn: () => reportsApi.getDailyReport({ date: selectedDate, employeeId: employeeFilter }),
  });

  const report = dailyReportQuery.data;
  const summary = report?.summary;
  const isToday = selectedDate === todayDateOnly();

  return (
    <Screen isRefreshing={dailyReportQuery.isRefetching} onRefresh={() => void dailyReportQuery.refetch()}>
      <View className="gap-1">
        <AppText variant="title" accessibilityRole="header">
          Daily transactions
        </AppText>
        <AppText variant="caption" className="text-ink-muted">
          {isAdmin ? 'All deliveries, payments and expenses of the station' : 'Your deliveries, payments and expenses'}
        </AppText>
      </View>

      <DateNavigator date={selectedDate} onChange={setSelectedDate} />

      {isAdmin && employeesQuery.data ? (
        <FilterChips<number>
          accessibilityLabel="Filter by employee"
          value={selectedEmployeeId}
          onChange={setSelectedEmployeeId}
          options={[
            { value: ALL_EMPLOYEES, label: 'All employees' },
            ...employeesQuery.data.map((employee) => ({ value: employee.employeeId, label: employee.fullName })),
          ]}
        />
      ) : null}

      {isToday ? <ShiftCard /> : null}

      {dailyReportQuery.isLoading ? (
        <LoadingView message="Computing the day's totals…" />
      ) : dailyReportQuery.isError || !report || !summary ? (
        <ErrorView error={dailyReportQuery.error} onRetry={() => void dailyReportQuery.refetch()} />
      ) : (
        <>
          <SectionHeader title="Summary" />
          <View className="flex-row flex-wrap gap-3">
            <StatCard label="Delivered orders" value={String(summary.deliveredOrders)} icon="checkmark-done" tone="success" />
            <StatCard
              label="Gallons delivered / returned"
              value={`${summary.gallonsDelivered} / ${summary.gallonsReturned}`}
              icon="water"
              tone="primary"
            />
            <StatCard label="Cash sales" value={formatCurrency(summary.cashSales)} icon="cash-outline" tone="success" />
            <StatCard label="Utang sales" value={formatCurrency(summary.creditSales)} icon="time-outline" tone="warning" />
            <StatCard label="Utang paid" value={formatCurrency(summary.collections)} icon="wallet-outline" tone="accent" />
            <StatCard label="Expenses" value={formatCurrency(summary.totalExpenses)} icon="receipt-outline" tone="danger" />
          </View>

          <Card className="gap-1">
            <AppText variant="heading" className="pb-1">
              How the total is made
            </AppText>
            <KeyValueRow label="Cash sales" value={formatCurrency(summary.cashSales)} />
            <KeyValueRow label="+ Utang paid" value={formatCurrency(summary.collections)} />
            <KeyValueRow label="− Expenses" value={formatCurrency(summary.totalExpenses)} valueColor={colors.danger} />
            <Divider />
            <KeyValueRow
              label="Income for the day"
              value={formatCurrency(summary.netIncome)}
              isEmphasized
              valueColor={summary.netIncome >= 0 ? colors.success : colors.danger}
            />
            <KeyValueRow label="Cash in hand (cash received − expenses)" value={formatCurrency(summary.cashOnHand)} />
            <Divider />
            <AppText variant="overline" className="pt-1">
              Money received by payment type
            </AppText>
            <KeyValueRow label="Cash" value={formatCurrency(summary.receivedByMode.Cash)} />
            <KeyValueRow label="GCash" value={formatCurrency(summary.receivedByMode.GCash)} />
            <KeyValueRow label="Bank transfer" value={formatCurrency(summary.receivedByMode.BankTransfer)} />
            <Divider />
            <View className="flex-row justify-between pt-1">
              <CountPill label="Not delivered" count={summary.failedOrders} tone={colors.warning} />
              <CountPill label="Declined" count={summary.declinedOrders} tone={colors.textMuted} />
              <CountPill label="Cancelled" count={summary.cancelledOrders} tone={colors.textMuted} />
              <CountPill label="On the way" count={summary.inProgressOrders} tone={colors.primary} />
            </View>
          </Card>

          <SectionHeader
            title={`Expenses (${report.expenses.length})`}
            action={<Button label="Add expense" icon="add" variant="secondary" size="sm" onPress={() => setIsExpenseSheetVisible(true)} />}
          />
          {report.expenses.length === 0 ? (
            <AppText className="px-1 text-ink-muted">No expenses for this day.</AppText>
          ) : (
            <Card className="p-2">
              {report.expenses.map((expense, index) => (
                <View key={expense.expenseId}>
                  {index > 0 ? <Divider /> : null}
                  <ExpenseRow expense={expense} canDelete={isAdmin || (expense.employeeId === profile?.employeeId && isToday)} />
                </View>
              ))}
            </Card>
          )}

          <SectionHeader title={`Transactions (${report.transactions.length})`} />
          {report.transactions.length === 0 ? (
            <EmptyState icon="receipt-outline" title="No transactions" message="Orders handled on this day will be listed here." />
          ) : (
            <Card className="p-2">
              {report.transactions.map((order, index) => (
                <View key={order.customerOrderId}>
                  {index > 0 ? <Divider /> : null}
                  <TransactionRow order={order} onPress={() => router.push(`/orders/${order.customerOrderId}`)} />
                </View>
              ))}
            </Card>
          )}

          <SectionHeader title={`Shifts (${report.shifts.length})`} />
          {report.shifts.length === 0 ? (
            <AppText className="px-1 text-ink-muted">Nobody timed in on this day.</AppText>
          ) : (
            report.shifts.map((shift) => <ShiftSummaryCard key={shift.employeeShiftId} shift={shift} />)
          )}
        </>
      )}

      <ExpenseSheet isVisible={isExpenseSheetVisible} expenseDate={selectedDate} onClose={() => setIsExpenseSheetVisible(false)} />
    </Screen>
  );
}

function CountPill({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <View className="flex-1 items-center">
      <AppText variant="heading" color={tone}>
        {count}
      </AppText>
      <AppText variant="tiny" className="text-center text-ink-muted">
        {label}
      </AppText>
    </View>
  );
}

function ExpenseRow({ expense, canDelete }: { expense: Expense; canDelete: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.remove(expense.expenseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      showToast('Expense deleted.');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const handleDelete = async () => {
    const isConfirmed = await confirmAction({
      title: 'Delete this expense?',
      message: 'It will be removed from the totals of the day.',
      details: [
        { label: 'Category', value: expenseCategoryLabels[expense.expenseCategory] },
        { label: 'Amount', value: formatCurrency(expense.amount) },
        ...(expense.description ? [{ label: 'Note', value: expense.description }] : []),
      ],
      confirmLabel: 'Yes, delete expense',
      tone: 'danger',
      icon: 'trash',
    });
    if (isConfirmed) deleteMutation.mutate();
  };

  return (
    <View className="flex-row items-center gap-3 px-1 py-2">
      <View className="h-10 w-10 items-center justify-center rounded-field bg-danger-soft">
        <Icon name={expenseCategoryIcons[expense.expenseCategory] as IconName} size={20} color={colors.danger} />
      </View>
      <View className="flex-1">
        <AppText variant="bodyStrong">{expenseCategoryLabels[expense.expenseCategory]}</AppText>
        <AppText variant="caption" className="text-ink-muted" numberOfLines={2}>
          {[expense.description, expense.employeeName, formatTime(expense.createdAt)].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <AppText variant="bodyStrong" className="text-danger">
        {formatCurrency(expense.amount)}
      </AppText>
      {canDelete ? (
        <IconButton icon="trash-outline" accessibilityLabel="Delete expense" color={colors.danger} size={40} onPress={() => void handleDelete()} />
      ) : null}
    </View>
  );
}

function TransactionRow({ order, onPress }: { order: CustomerOrder; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${order.customer?.fullName ?? 'Customer'}, ${order.orderStatus}, ${formatCurrency(order.totalAmount)}`}
      onPress={onPress}
      className="gap-1 rounded-field px-1 py-3 active:bg-surface-muted"
    >
      <View className="flex-row items-center justify-between gap-2">
        <AppText variant="bodyStrong" numberOfLines={1} className="flex-1">
          {order.customer?.fullName ?? 'Customer'}
        </AppText>
        <AppText variant="bodyStrong" className="text-brand">
          {formatCurrency(order.totalAmount)}
        </AppText>
      </View>
      <View className="flex-row items-center justify-between gap-2">
        <OrderStatusBadge status={order.orderStatus} />
        <AppText variant="caption" className="text-ink-muted">
          {order.gallonsOrdered} gal · {order.paymentType === 'Credit' ? 'Utang' : 'Cash'} · {formatTime(order.closedAt ?? order.orderedAt)}
        </AppText>
      </View>
      {order.handledBy || order.statusReason ? (
        <AppText variant="caption" className="text-ink-subtle" numberOfLines={2}>
          {[order.handledBy ? `Handled by ${order.handledBy.fullName}` : null, order.statusReason ? `Reason: ${order.statusReason}` : null]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      ) : null}
    </Pressable>
  );
}

function ShiftSummaryCard({ shift }: { shift: EmployeeShift }) {
  return (
    <Card className="gap-1">
      <View className="flex-row items-center justify-between gap-2">
        <AppText variant="heading" className="flex-1" numberOfLines={1}>
          {shift.employeeName ?? 'Employee'}
        </AppText>
        <Badge label={shift.isOpen ? 'On duty' : 'Finished'} tone={shift.isOpen ? 'success' : 'neutral'} showDot={shift.isOpen} />
      </View>
      <AppText variant="caption" className="text-ink-muted">
        Time in {formatTime(shift.timeIn)} · Time out {shift.timeOut ? formatTime(shift.timeOut) : '—'} ·{' '}
        {formatDurationSince(shift.timeIn, shift.timeOut ? new Date(shift.timeOut) : new Date())}
      </AppText>
      {!shift.isOpen ? (
        <>
          <Divider />
          <KeyValueRow label="Delivered orders" value={String(shift.totalDeliveredOrders)} />
          <KeyValueRow label="Gallons delivered / returned" value={`${shift.totalGallonsDelivered} / ${shift.totalGallonsReturned}`} />
          <KeyValueRow label="Cash sales" value={formatCurrency(shift.totalCashSales)} />
          <KeyValueRow label="Utang sales" value={formatCurrency(shift.totalCreditSales)} />
          <KeyValueRow label="Utang paid" value={formatCurrency(shift.totalCollections)} />
          <KeyValueRow label="Expenses" value={formatCurrency(shift.totalExpenses)} />
          <KeyValueRow label="Cash to hand over" value={formatCurrency(shift.netCashOnHand)} isEmphasized />
        </>
      ) : null}
    </Card>
  );
}
