import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { creditsApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import {
  AppText,
  BottomSheet,
  Button,
  DateNavigator,
  KeyValueRow,
  OptionCards,
  useConfirm,
  TextField,
  useToast,
} from '../../components/ui';
import type { CreditItem, PaymentMode } from '../../types/api.types';
import { colors } from '../../theme/tokens';
import { formatCurrency, formatDateOnlyLabel, paymentModeLabels, todayDateOnly } from '../../utils/format';

interface SettleCreditSheetProps {
  isVisible: boolean;
  selectedCredits: CreditItem[];
  onClose: () => void;
  onSettled: () => void;
}

/** Marks the selected unpaid credits (utang) as paid and records the date of payment. */
export function SettleCreditSheet({ isVisible, selectedCredits, onClose, onSettled }: SettleCreditSheetProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paidOn, setPaidOn] = useState(todayDateOnly());
  const [remarks, setRemarks] = useState('');

  const customerReference = selectedCredits.find((credit) => credit.paymentReference)?.paymentReference ?? '';
  const customerMode = selectedCredits.find((credit) => credit.paymentMode)?.paymentMode ?? null;

  useEffect(() => {
    if (!isVisible) return;
    setPaymentMode(customerMode ?? 'Cash');
    setReferenceNumber(customerReference);
    setPaidOn(todayDateOnly());
    setRemarks('');
  }, [isVisible, customerMode, customerReference]);

  const totalAmount = selectedCredits.reduce((sum, credit) => sum + credit.totalAmount, 0);
  const customerNames = [...new Set(selectedCredits.map((credit) => credit.customerName))];
  const needsReference = paymentMode !== 'Cash';
  const isReferenceMissing = needsReference && referenceNumber.trim().length < 4;

  const settleMutation = useMutation({
    mutationFn: () =>
      creditsApi.settle({
        customerOrderIds: selectedCredits.map((credit) => credit.customerOrderId),
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        paidOn,
        remarks: remarks.trim() || undefined,
      }),
    onSuccess: (result) => {
      for (const queryKey of [['credits'], ['reports'], ['customers'], ['orders']]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      showToast(`${result.settledCount} order(s) marked as paid · ${formatCurrency(result.totalAmountPaid)}`);
      onSettled();
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });
  const handleSettle = async () => {
    const isConfirmed = await confirm({
      title: 'Mark as paid?',
      message: 'These orders will be saved as paid.',
      details: [
        { label: 'Orders', value: String(selectedCredits.length) },
        { label: 'Total', value: formatCurrency(totalAmount) },
        { label: 'Paid with', value: paymentModeLabels[paymentMode] },
        { label: 'Date of payment', value: formatDateOnlyLabel(paidOn) },
      ],
      confirmLabel: 'Yes, mark as paid',
      tone: 'success',
    });
    if (isConfirmed) settleMutation.mutate();
  };


  return (
    <BottomSheet
      isVisible={isVisible}
      title="Mark as paid"
      subtitle={customerNames.join(', ')}
      onClose={onClose}
      footer={
        <Button
          label={`Mark as paid · ${formatCurrency(totalAmount)}`}
          icon="checkmark-circle"
          variant="success"
          size="lg"
          fullWidth
          isDisabled={isReferenceMissing || selectedCredits.length === 0}
          isLoading={settleMutation.isPending}
          onPress={() => void handleSettle()}
        />
      }
    >
      <View className="gap-1 rounded-field bg-success-soft p-4">
        <KeyValueRow label="Orders to mark as paid" value={String(selectedCredits.length)} />
        <KeyValueRow label="Amount paid" value={formatCurrency(totalAmount)} isEmphasized valueColor={colors.success} />
      </View>

      <OptionCards<PaymentMode>
        label="How did the customer pay?"
        columns={3}
        value={paymentMode}
        onChange={setPaymentMode}
        options={[
          { value: 'Cash', title: 'Cash', icon: 'cash-outline' },
          { value: 'GCash', title: 'GCash', icon: 'phone-portrait-outline' },
          { value: 'BankTransfer', title: 'Bank', icon: 'business-outline' },
        ]}
      />

      {needsReference ? (
        <TextField
          label="Reference no. (from the receipt)"
          isRequired
          placeholder="e.g. 1234 567 890"
          value={referenceNumber}
          onChangeText={setReferenceNumber}
          helperText={customerReference ? 'Pre-filled with the reference sent by the customer.' : undefined}
          errorText={isReferenceMissing && referenceNumber ? 'Enter the full reference no.' : null}
        />
      ) : null}

      <View className="gap-2">
        <AppText variant="overline">Date of payment</AppText>
        <DateNavigator date={paidOn} onChange={setPaidOn} />
        <AppText variant="caption" className="text-ink-subtle">
          Recorded as paid on {formatDateOnlyLabel(paidOn).toLowerCase() === 'today' ? 'today' : formatDateOnlyLabel(paidOn)}.
        </AppText>
      </View>

      <TextField label="Note (optional)" placeholder="e.g. Paid by daughter" value={remarks} onChangeText={setRemarks} maxLength={255} />
    </BottomSheet>
  );
}

