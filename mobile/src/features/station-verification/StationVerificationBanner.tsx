import { useRouter } from 'expo-router';
import { Banner, Button } from '../../components/ui';
import { useAuthStore } from '../../store/auth-store';
import { verificationStatusDetails } from './kyb-labels';

/** Reminds the station owner to send the business documents; hidden for employees and for verified stations. */
export function StationVerificationBanner() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const verificationStatus = profile?.waterStation?.verificationStatus;

  if (profile?.role !== 'Admin' || !verificationStatus || verificationStatus === 'Verified') return null;

  const details = verificationStatusDetails[verificationStatus];
  return (
    <Banner
      tone={details.tone}
      icon={details.icon}
      title={verificationStatus === 'UnderReview' ? 'Your documents are being checked' : 'Send your business documents'}
      message={
        verificationStatus === 'UnderReview'
          ? details.message
          : 'Customers cannot see your station yet. Upload your BIR, permits and other papers.'
      }
      action={
        <Button
          label={verificationStatus === 'UnderReview' ? 'See status' : 'Upload documents'}
          variant="ghost"
          icon="arrow-forward"
          iconPosition="right"
          onPress={() => router.push('/station-verification')}
        />
      }
    />
  );
}
