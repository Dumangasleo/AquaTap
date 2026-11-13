import type { IconName } from '../../components/ui';
import type { Tone } from '../../theme/tokens';
import type { StationDocumentType, StationVerificationStatus } from '../../types/api.types';

interface DocumentRequirement {
  title: string;
  description: string;
  icon: IconName;
}

/** Papers needed for a legitimate water refilling station. */
export const documentRequirements: Record<StationDocumentType, DocumentRequirement> = {
  BirCertificateOfRegistration: {
    title: 'BIR Certificate of Registration',
    description: 'BIR Form 2303 with your TIN and business name.',
    icon: 'document-text-outline',
  },
  MayorsBusinessPermit: {
    title: "Mayor's / Business Permit",
    description: 'Current permit from your city or town hall.',
    icon: 'business-outline',
  },
  DtiOrSecRegistration: {
    title: 'DTI or SEC Registration',
    description: 'DTI certificate (sole proprietor) or SEC registration (corporation).',
    icon: 'ribbon-outline',
  },
  SanitaryPermit: {
    title: 'Sanitary Permit',
    description: 'From your city or town health office.',
    icon: 'medkit-outline',
  },
  WaterAnalysisCertificate: {
    title: 'Water Analysis Certificate',
    description: 'Water test result from a DOH-accredited laboratory.',
    icon: 'flask-outline',
  },
  OwnerValidId: {
    title: "Owner's Valid ID",
    description: 'Any government ID of the owner, like PhilSys, driver’s license or passport.',
    icon: 'id-card-outline',
  },
  Other: {
    title: 'Other supporting document',
    description: 'Optional, like an FDA license or fire safety certificate.',
    icon: 'attach-outline',
  },
};

export const verificationStatusDetails: Record<
  StationVerificationStatus,
  { label: string; tone: Tone; icon: IconName; message: string }
> = {
  NotSubmitted: {
    label: 'Not sent yet',
    tone: 'warning',
    icon: 'alert-circle-outline',
    message: 'Send your business documents so customers can find your station in AquaTap.',
  },
  UnderReview: {
    label: 'Being checked',
    tone: 'info',
    icon: 'hourglass-outline',
    message: 'AquaTap is checking your documents. This usually takes 1 to 2 working days.',
  },
  Verified: {
    label: 'Approved',
    tone: 'success',
    icon: 'shield-checkmark',
    message: 'Your business is approved and customers can see your station.',
  },
  Rejected: {
    label: 'Needs changes',
    tone: 'danger',
    icon: 'close-circle-outline',
    message: 'Please fix the items below and send them again.',
  },
};
