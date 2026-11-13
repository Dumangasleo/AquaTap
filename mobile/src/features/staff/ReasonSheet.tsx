import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppText, BottomSheet, Button, TextField } from '../../components/ui';
import { FilterChips } from './FilterChips';

interface ReasonSheetProps {
  isVisible: boolean;
  title: string;
  subtitle?: string;
  quickReasons: string[];
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary';
  /** When false, an empty reason is allowed (e.g. customer cancellation). */
  isReasonRequired?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const CUSTOM_REASON = '__custom__';

/** Bottom sheet that asks "why?" with one-tap common reasons plus a free-text option. */
export function ReasonSheet({
  isVisible,
  title,
  subtitle,
  quickReasons,
  confirmLabel,
  confirmVariant = 'danger',
  isReasonRequired = true,
  isSubmitting = false,
  onClose,
  onConfirm,
}: ReasonSheetProps) {
  const [selectedReason, setSelectedReason] = useState<string>(quickReasons[0] ?? CUSTOM_REASON);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (isVisible) {
      setSelectedReason(quickReasons[0] ?? CUSTOM_REASON);
      setCustomReason('');
    }
  }, [isVisible, quickReasons]);

  const finalReason = selectedReason === CUSTOM_REASON ? customReason.trim() : selectedReason;
  const isReasonTooShort = isReasonRequired && finalReason.length < 3;

  return (
    <BottomSheet
      isVisible={isVisible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <Button
          label={confirmLabel}
          variant={confirmVariant}
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          isDisabled={isReasonTooShort}
          onPress={() => onConfirm(finalReason)}
        />
      }
    >
      <View className="gap-2">
        <AppText variant="overline">Choose a reason</AppText>
        <FilterChips
          accessibilityLabel="Common reasons"
          options={[
            ...quickReasons.map((reason) => ({ value: reason, label: reason })),
            { value: CUSTOM_REASON, label: 'Other reason' },
          ]}
          value={selectedReason}
          onChange={setSelectedReason}
        />
      </View>
      {selectedReason === CUSTOM_REASON ? (
        <TextField
          label="Your reason"
          isRequired={isReasonRequired}
          placeholder="Type the reason here"
          value={customReason}
          onChangeText={setCustomReason}
          maxLength={255}
          multiline
        />
      ) : (
        <AppText variant="caption" className="text-ink-muted">
          The customer will see this reason in their order history.
        </AppText>
      )}
    </BottomSheet>
  );
}

