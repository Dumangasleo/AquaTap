import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppText, Banner, BottomSheet, Button, KeyValueRow, NumberStepper, OptionCards, TextField, useConfirm } from '../../components/ui';
import { colors } from '../../theme/tokens';
import type { CustomerOrder, DeliverOrderRequest, PaymentMode } from '../../types/api.types';
import { formatCurrency, paymentModeLabels } from '../../utils/format';

interface DeliverOrderSheetProps {
  isVisible: boolean;
  order: CustomerOrder;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (request: DeliverOrderRequest) => void;
}

/** Rider confirms the delivery: empty gallons collected and (for cash orders) how the customer paid. */
export function DeliverOrderSheet({ isVisible, order, isSubmitting, onClose, onConfirm }: DeliverOrderSheetProps) {
  const confirm = useConfirm();
  const isCash = order.paymentType === 'Cash';
  const [returnedGallons, setReturnedGallons] = useState(order.returnedGallons);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(order.paymentMode ?? 'Cash');
  const [paymentReference, setPaymentReference] = useState(order.paymentReference ?? '');

  useEffect(() => {
    if (!isVisible) return;
    setReturnedGallons(order.returnedGallons);
    setPaymentMode(order.paymentMode ?? 'Cash');
    setPaymentReference(order.paymentReference ?? '');
  }, [isVisible, order.returnedGallons, order.paymentMode, order.paymentReference]);

  const needsReference = isCash && paymentMode !== 'Cash';
  const isReferenceMissing = needsReference && paymentReference.trim().length < 4;

  const handleConfirm = async () => {
    const isConfirmed = await confirm({
      title: 'Complete this delivery?',
      message: 'The order will be saved as delivered.',
      details: [
        { label: 'Customer', value: order.customer?.fullName ?? 'Customer' },
        { label: 'Gallons delivered', value: String(order.gallonsOrdered) },
        { label: 'Empty gallons returned', value: String(returnedGallons) },
        { label: 'Payment', value: isCash ? `${paymentModeLabels[paymentMode]} (paid now)` : 'Utang (pay later)' },
        { label: isCash ? 'Amount received' : 'Added to utang', value: formatCurrency(order.totalAmount) },
      ],
      confirmLabel: 'Yes, delivered',
      tone: 'success',
      icon: 'checkmark-done-circle',
    });
    if (!isConfirmed) return;
    onConfirm({
      returnedGallons,
      ...(isCash ? { paymentMode, paymentReference: needsReference ? paymentReference.trim() : undefined } : {}),
    });
  };

  return (
    <BottomSheet
      isVisible={isVisible}
      title="Complete delivery"
      subtitle={`${order.customer?.fullName ?? 'Customer'} · ${order.gallonsOrdered} gallon(s)`}
      onClose={onClose}
      footer={
        <Button
          label="Mark as delivered"
          icon="checkmark-done"
          variant="success"
          size="lg"
          fullWidth
          isDisabled={isReferenceMissing}
          isLoading={isSubmitting}
          onPress={() => void handleConfirm()}
        />
      }
    >
      <NumberStepper
        label="Empty gallons returned"
        value={returnedGallons}
        onChange={setReturnedGallons}
        min={0}
        max={100}
        helperText={`The customer said they will return ${order.returnedGallons}. Count the empty gallons you actually received.`}
      />

      {isCash ? (
        <>
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
              value={paymentReference}
              onChangeText={setPaymentReference}
              helperText={order.paymentReference ? 'Sent by the customer. Check it in the GCash or bank app.' : undefined}
            />
          ) : null}
          <View className="rounded-field bg-success-soft p-4">
            <KeyValueRow label="Amount to collect" value={formatCurrency(order.totalAmount)} isEmphasized valueColor={colors.success} />
          </View>
        </>
      ) : (
        <Banner
          tone="warning"
          icon="time-outline"
          title="Utang order"
          message={`${formatCurrency(order.totalAmount)} will be added to what the customer still has to pay. Collect it later in the Utang screen.`}
        />
      )}

      <AppText variant="caption" className="text-ink-subtle">
        The customer&apos;s gallons left are updated automatically after you confirm.
      </AppText>
    </BottomSheet>
  );
}
