import { View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { toneColors } from '../../theme/tokens';
import type { StationVerification } from '../../types/api.types';
import { formatDateTime } from '../../utils/format';
import { verificationStatusDetails } from './kyb-labels';

/** Big status box at the top of the business check screens. */
export function VerificationStatusCard({ verification }: { verification: StationVerification }) {
  const details = verificationStatusDetails[verification.verificationStatus];
  const palette = toneColors[details.tone];
  const timestamp =
    verification.verificationStatus === 'Verified'
      ? `Approved on ${formatDateTime(verification.verifiedAt)}`
      : verification.verificationSubmittedAt
        ? `Sent on ${formatDateTime(verification.verificationSubmittedAt)}`
        : null;

  return (
    <View className="gap-3 rounded-card p-5" style={{ backgroundColor: palette.background }} accessibilityRole="summary">
      <View className="flex-row items-center gap-3">
        <Icon name={details.icon} size={32} color={palette.foreground} />
        <View className="flex-1 gap-0.5">
          <AppText variant="overline" color={palette.foreground}>
            Business check
          </AppText>
          <AppText variant="title" color={palette.foreground}>
            {details.label}
          </AppText>
        </View>
      </View>
      <AppText>{details.message}</AppText>
      {verification.verificationRemarks ? (
        <View className="gap-1 rounded-field bg-surface/70 p-3">
          <AppText variant="overline">Note from AquaTap</AppText>
          <AppText>“{verification.verificationRemarks}”</AppText>
        </View>
      ) : null}
      {timestamp ? (
        <AppText variant="caption" color={palette.foreground}>
          {timestamp}
        </AppText>
      ) : null}
    </View>
  );
}
