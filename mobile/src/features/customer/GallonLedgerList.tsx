import { View } from 'react-native';
import { AppText, Badge, Icon } from '../../components/ui';
import { colors } from '../../theme/tokens';
import type { GallonLedgerEntry } from '../../types/api.types';
import { cn } from '../../utils/cn';
import { formatCurrency, formatDate } from '../../utils/format';

/** Gallon history: agreement first, then each delivery with the gallons the customer still has. */
export function GallonLedgerList({ entries }: { entries: GallonLedgerEntry[] }) {
  if (entries.length === 0) {
    return <AppText className="text-center text-ink-muted">No gallon history yet.</AppText>;
  }

  return (
    <View className="gap-2">
      {[...entries].reverse().map((entry) => {
        const isContract = entry.entryType === 'Contract';
        return (
          <View
            key={`${entry.entryType}-${entry.referenceId}`}
            className="flex-row items-center gap-3 rounded-field border border-line bg-surface p-3.5"
          >
            <View className={cn('h-10 w-10 items-center justify-center rounded-xl', isContract ? 'bg-aqua-soft' : 'bg-brand-soft')}>
              <Icon name={isContract ? 'document-text-outline' : 'water-outline'} size={19} color={isContract ? colors.accent : colors.primary} />
            </View>
            <View className="flex-1 gap-1">
              <AppText variant="bodyStrong">{isContract ? `Borrowed ${entry.borrowedGallons} gallons` : `Delivered ${entry.gallonsOrdered}, returned ${entry.returnedGallons}`}</AppText>
              <AppText variant="caption" className="text-ink-muted">
                {formatDate(entry.entryDate)}
                {entry.orderNumber ? ` · #${entry.orderNumber}` : ' · Agreement signed'}
                {!isContract ? ` · ${formatCurrency(entry.totalAmount)}` : ''}
              </AppText>
              {!isContract && entry.paymentStatus ? (
                <Badge
                  label={entry.paymentStatus === 'Paid' ? 'Paid' : 'Not yet paid'}
                  tone={entry.paymentStatus === 'Paid' ? 'success' : 'warning'}
                />
              ) : null}
            </View>
            <View className="min-w-[64px] items-center">
              <AppText className="font-display text-[24px] leading-[30px] text-brand">{entry.remainingGallons}</AppText>
              <AppText variant="overline" className="text-[10px] leading-[14px]">
                left
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
